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
import { AppBarLayout } from '../components/AppBarLayout'

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

  const handleEmailIngestion = useCallback(() => {
    Alert.alert(
      'Email ingestion',
      'Email-based ingestion is coming soon. You will be able to forward receipts and statements to a dedicated address.',
    )
  }, [])

  const showManualInput =
    context?.pipelineSection !== 'bank' && context?.pipelineSection !== 'cards'
  const isBankContext = context?.pipelineSection === 'bank'

  return (
    <AppBarLayout
      title="Add transaction"
      onBackPress={handleGoBack}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {context?.pipelineSection && (
            <Text style={styles.contextLabel}>
              {context.pipelineSection === 'receipts' ? 'Purchases' :
               context.pipelineSection === 'bank' ? (
                 context.bankAccountId 
                   ? `Bank transactions ..${getLastFour(context.bankAccountId)}`
                   : 'Bank transactions'
               ) :
               context.pipelineSection === 'cards' ? (
                 context.cardId
                   ? `Credit card transactions ..${getLastFour(context.cardId)}`
                   : 'Credit card transactions'
               ) :
               context.pipelineSection === 'sales' ? 'Sales pipeline' :
               context.pipelineSection === 'internal' ? 'Internal transactions' :
               context.pipelineSection === 'reporting' ? 'Reporting ready' :
               context.pipelineSection}
            </Text>
          )}
          <Text style={styles.subtitle}>Choose how you'd like to add transactions.</Text>

          <View style={styles.buttonGrid}>
            {isBankContext && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Connect to bank',
                      'Bank connections are coming soon. You will be able to link your bank to import statements automatically.',
                    )
                  }}
                  style={[styles.button, styles.bankConnectButton]}
                  activeOpacity={0.7}
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="account-balance" size={18} color="#4a4a4a" />
                    <Text style={styles.bankConnectText}>Connect to Bank</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.buttonSeparator} />
              </>
            )}
            <TouchableOpacity
              onPress={pickFromLibrary}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="photo-library" size={18} color="#ffffff" />
                <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                  Choose photo
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
                <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                  Take photo
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromFiles}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="folder-open" size={18} color="#ffffff" />
                <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                  Choose from files
                </Text>
              </View>
            </TouchableOpacity>
            {showManualInput && (
              <TouchableOpacity
                onPress={handleManualInput}
                disabled={!canCapture}
                style={[styles.button, !canCapture && styles.buttonDisabled]}
                activeOpacity={0.7}
              >
                <View style={styles.buttonContent}>
                  <MaterialIcons name="edit" size={18} color="#ffffff" />
                  <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                    Manual input
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleEmailIngestion}
              disabled={!canCapture}
              style={[styles.button, !canCapture && styles.buttonDisabled]}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="email" size={18} color="#ffffff" />
                <Text style={[styles.buttonText, !canCapture && styles.buttonTextDisabled]}>
                  Send via email
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {busy ? <ActivityIndicator style={styles.progress} /> : null}
          {lastImageUri ? <Image source={{ uri: lastImageUri }} style={styles.preview} /> : null}
          {resultSummary ? <Text style={styles.result}>{resultSummary}</Text> : null}
          {!businessId ? (
            <Text style={styles.warning}>Sign in and ensure a business context is available.</Text>
          ) : null}
        </View>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  contextLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a4a4a',
    textAlign: 'center',
    marginBottom: 12,
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
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  buttonGrid: {
    flexDirection: 'column',
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: '#666666',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 56,
  },
  bankConnectButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#dcdcdc',
    marginBottom: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'left',
    marginLeft: 8,
  },
  buttonTextDisabled: {
    color: '#999999',
  },
  bankConnectText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4a4a4a',
    marginLeft: 8,
  },
  buttonSeparator: {
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d0d0d0',
    marginTop: 14,
    marginBottom: 14,
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


