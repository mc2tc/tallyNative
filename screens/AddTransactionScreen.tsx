// Add transaction screen - upload receipt and process OCR
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth/AuthContext'
import { uploadReceiptAndGetUrl } from '../lib/utils/storage'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { transactions2Api } from '../lib/api/transactions2'

type AddTransactionNavigationProp =
  | StackNavigationProp<TransactionsStackParamList, 'AddTransaction'>
  | StackNavigationProp<ScaffoldStackParamList, 'AddTransaction'>

export default function AddTransactionScreen() {
  const navigation = useNavigation<AddTransactionNavigationProp>()
  const { businessUser, memberships } = useAuth()

  // Choose a businessId that prefers a non-personal business:
  // 1) If businessUser.businessId exists and is not "personal", use that
  // 2) Else, from all memberships pick the first whose id does NOT look like a personal business
  // 3) Fallback: first membership id (if nothing else)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find((id) => !id.toLowerCase().includes('personal'))

  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const [busy, setBusy] = useState(false)
  const [lastImageUri, setLastImageUri] = useState<string | null>(null)
  const [resultSummary, setResultSummary] = useState<string | null>(null)

  const canCapture = useMemo(() => Boolean(businessId) && !busy, [businessId, busy])

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  const handleAsset = useCallback(
    async (asset: Asset) => {
      if (!businessId) return
      if (!asset.uri) {
        throw new Error('No image URI returned from picker')
      }
      setLastImageUri(asset.uri)
      const downloadUrl = await uploadReceiptAndGetUrl({
        businessId,
        localUri: asset.uri,
        fileNameHint: asset.fileName ?? undefined,
        contentType: asset.type ?? undefined,
      })
      const response = await transactions2Api.processReceipt({
        imageUrl: downloadUrl,
        businessId,
        classification: { kind: 'purchase' },
      })
      setResultSummary(`Created transaction ${response.transactionId}`)
    },
    [businessId],
  )

  const pickFromLibrary = useCallback(async () => {
    try {
      if (!businessId) {
        Alert.alert('No business selected', 'Sign in or select a business to continue.')
        return
      }
      setBusy(true)
      setResultSummary(null)
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
      })
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return
      }
      await handleAsset(result.assets[0])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error'
      Alert.alert('Upload failed', message)
    } finally {
      setBusy(false)
    }
  }, [businessId, handleAsset])

  const takePhoto = useCallback(async () => {
    try {
      if (!businessId) {
        Alert.alert('No business selected', 'Sign in or select a business to continue.')
        return
      }
      setBusy(true)
      setResultSummary(null)
      const result = await launchCamera({
        mediaType: 'photo',
        saveToPhotos: true,
        includeBase64: false,
      })
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return
      }
      await handleAsset(result.assets[0])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error'
      Alert.alert('Capture failed', message)
    } finally {
      setBusy(false)
    }
  }, [businessId, handleAsset])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#4a4a4a" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Add Transaction</Text>
          <Text style={styles.subtitle}>Capture a receipt to create a transaction.</Text>
          <View style={styles.actions}>
            <Button title="Choose photo" onPress={pickFromLibrary} disabled={!canCapture} />
            <View style={styles.spacer} />
            <Button title="Take photo" onPress={takePhoto} disabled={!canCapture} />
          </View>
          {busy ? <ActivityIndicator style={styles.progress} /> : null}
          {lastImageUri ? <Image source={{ uri: lastImageUri }} style={styles.preview} /> : null}
          {resultSummary ? <Text style={styles.result}>{resultSummary}</Text> : null}
          {!businessId ? (
            <Text style={styles.warning}>Sign in and ensure a business context is available.</Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginRight: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  spacer: {
    width: 12,
  },
  progress: {
    marginTop: 16,
  },
  preview: {
    width: 220,
    height: 220,
    marginTop: 16,
    borderRadius: 8,
  },
  result: {
    marginTop: 12,
    fontSize: 14,
    color: '#2e7d32',
  },
  warning: {
    marginTop: 12,
    fontSize: 13,
    color: '#b26a00',
    textAlign: 'center',
  },
})


