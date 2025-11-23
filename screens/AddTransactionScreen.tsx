// Add transaction screen - upload receipt and process OCR
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { launchCamera, launchImageLibrary, type Asset } from 'react-native-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
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

type AddTransactionRouteProp =
  | RouteProp<TransactionsStackParamList, 'AddTransaction'>
  | RouteProp<ScaffoldStackParamList, 'AddTransaction'>

// Helper function to extract last 4 digits from account/card number
function getLastFour(number: string): string {
  const digits = number.replace(/\D/g, '')
  return digits.slice(-4) || ''
}

export default function AddTransactionScreen() {
  const navigation = useNavigation<AddTransactionNavigationProp>()
  const route = useRoute<AddTransactionRouteProp>()
  const { businessUser, memberships } = useAuth()
  
  const context = route.params?.context

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

  // Determine transaction type from context
  const getTransactionType = useCallback((): 'purchase' | 'sale' | 'bank_transaction' | 'credit_card_transaction' | 'internal' => {
    if (!context?.pipelineSection) return 'purchase'
    
    switch (context.pipelineSection) {
      case 'receipts':
        return 'purchase'
      case 'sales':
        return 'sale'
      case 'bank':
        return 'bank_transaction'
      case 'cards':
        return 'credit_card_transaction'
      case 'internal':
        return 'internal'
      default:
        return 'purchase'
    }
  }, [context])

  const handleAsset = useCallback(
    async (asset: Asset, actionType: string, isPdf: boolean = false) => {
      if (!businessId) return
      if (!asset.uri) {
        throw new Error('No file URI returned from picker')
      }
      
      setLastImageUri(asset.uri)
      const downloadUrl = await uploadReceiptAndGetUrl({
        businessId,
        localUri: asset.uri,
        fileNameHint: asset.fileName ?? undefined,
        contentType: asset.type ?? undefined,
      })
      
      const transactionType = getTransactionType()
      const inputMethod = isPdf ? 'ocr_pdf' : 'ocr_image'
      
      try {
        const response = await transactions2Api.createTransaction({
          businessId,
          transactionType,
          inputMethod,
          fileUrl: downloadUrl,
        })
        
        if (response.success) {
          setResultSummary(`Created transaction ${response.transactionId}`)
        } else if (response.logged) {
          // Transaction type/input method not yet implemented (501)
          Alert.alert(
            'Not Yet Available',
            response.message || `Transaction type '${transactionType}' with input method '${inputMethod}' is not yet implemented. This request has been logged for future implementation.`
          )
        } else {
          throw new Error(response.message || 'Failed to create transaction')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create transaction'
        Alert.alert('Error', message)
        throw error
      }
    },
    [businessId, getTransactionType],
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
      await handleAsset(result.assets[0], 'choose-photo')
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
      await handleAsset(result.assets[0], 'take-photo')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error'
      Alert.alert('Capture failed', message)
    } finally {
      setBusy(false)
    }
  }, [businessId, handleAsset])

  const pickFromFiles = useCallback(async () => {
    try {
      if (!businessId) {
        Alert.alert('No business selected', 'Sign in or select a business to continue.')
        return
      }
      setBusy(true)
      setResultSummary(null)
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }
      const file = result.assets[0]
      if (!file.uri) {
        throw new Error('No file URI returned from picker')
      }
      // Validate that the selected file is an image or PDF
      const mimeType = file.mimeType?.toLowerCase() ?? ''
      const fileName = file.name?.toLowerCase() ?? ''
      const isImage =
        mimeType.startsWith('image/') ||
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.gif') ||
        fileName.endsWith('.webp') ||
        fileName.endsWith('.bmp')
      const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf')
      
      if (!isImage && !isPdf) {
        Alert.alert('Invalid file type', 'Please select an image or PDF file.')
        return
      }
      
      setLastImageUri(file.uri)
      const downloadUrl = await uploadReceiptAndGetUrl({
        businessId,
        localUri: file.uri,
        fileNameHint: file.name ?? undefined,
        contentType: file.mimeType ?? undefined,
      })
      
      const transactionType = getTransactionType()
      const inputMethod = isPdf ? 'ocr_pdf' : 'ocr_image'
      
      try {
        const response = await transactions2Api.createTransaction({
          businessId,
          transactionType,
          inputMethod,
          fileUrl: downloadUrl,
        })
        
        if (response.success) {
          setResultSummary(`Created transaction ${response.transactionId}`)
        } else if (response.logged) {
          // Transaction type/input method not yet implemented (501)
          Alert.alert(
            'Not Yet Available',
            response.message || `Transaction type '${transactionType}' with input method '${inputMethod}' is not yet implemented. This request has been logged for future implementation.`
          )
        } else {
          throw new Error(response.message || 'Failed to create transaction')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create transaction'
        Alert.alert('Error', message)
        throw error
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error'
      Alert.alert('File selection failed', message)
    } finally {
      setBusy(false)
    }
  }, [businessId, getTransactionType])

  const handleManualInput = useCallback(async () => {
    const transactionType = getTransactionType()
    
    // TODO: Navigate to manual input screen or show manual input form
    // When implemented, use:
    // await transactions2Api.createTransaction({
    //   businessId,
    //   transactionType,
    //   inputMethod: 'manual',
    //   transactionData: { ... }
    // })
    
    Alert.alert(
      'Manual Input',
      `Manual input for ${transactionType} transactions is coming soon.`
    )
  }, [getTransactionType, businessId])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#4a4a4a" />
          </TouchableOpacity>
          {context?.pipelineSection && (
            <Text style={styles.contextLabel}>
              {context.pipelineSection === 'receipts' ? 'Purchase Receipts' :
               context.pipelineSection === 'bank' ? (
                 context.bankAccountId 
                   ? `Bank Transactions •••• ${getLastFour(context.bankAccountId)}`
                   : 'Bank Transactions'
               ) :
               context.pipelineSection === 'cards' ? (
                 context.cardId
                   ? `Credit Card Transactions •••• ${getLastFour(context.cardId)}`
                   : 'Credit Card Transactions'
               ) :
               context.pipelineSection === 'sales' ? 'Sales Pipeline' :
               context.pipelineSection === 'internal' ? 'Internal Transactions' :
               context.pipelineSection === 'reporting' ? 'Reporting Ready' :
               context.pipelineSection}
            </Text>
          )}
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Add Transaction</Text>
          <Text style={styles.subtitle}>Choose how you'd like to add transactions.</Text>
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              onPress={pickFromLibrary}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                Choose photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                Take photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromFiles}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                Choose from Files
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleManualInput}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                Manual Input
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteTitle}>Email-Based Ingestion</Text>
            <Text style={styles.infoNoteText}>
              You can forward receipt emails, bank statements, and credit card statements to a
              dedicated Tally email address for automatic processing. This feature is coming soon.
            </Text>
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
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
  },
  contextLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4a4a4a',
    marginLeft: 12,
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
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
  },
  button: {
    backgroundColor: '#666666',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    color: '#999999',
  },
  infoNote: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    maxWidth: 400,
  },
  infoNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  infoNoteText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
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
    color: '#000000',
  },
  warning: {
    marginTop: 12,
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
  },
})


