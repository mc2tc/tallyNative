// Upload processing screen - shows PDF preview and processing status
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { uploadReceiptAndGetUrl } from '../lib/utils/storage'
import { transactions2Api } from '../lib/api/transactions2'

type UploadProcessingNavigationProp =
  | StackNavigationProp<TransactionsStackParamList, 'UploadProcessing'>
  | StackNavigationProp<ScaffoldStackParamList, 'UploadProcessing'>

type UploadProcessingRouteProp =
  | RouteProp<TransactionsStackParamList, 'UploadProcessing'>
  | RouteProp<ScaffoldStackParamList, 'UploadProcessing'>

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const SURFACE_BACKGROUND = '#f6f6f6'

export default function UploadProcessingScreen() {
  const navigation = useNavigation<UploadProcessingNavigationProp>()
  const route = useRoute<UploadProcessingRouteProp>()
  const { 
    pdfFileName, 
    pdfUri, 
    isPdf, 
    success: initialSuccess, 
    pipelineSection,
    businessId,
    localUri,
    fileNameHint,
    contentType,
    transactionType,
    inputMethod,
  } = route.params || {}
  
  const [showSuccess, setShowSuccess] = useState(initialSuccess || false)
  const [processing, setProcessing] = useState(!initialSuccess)

  // Handle upload and API call on mount
  useEffect(() => {
    if (initialSuccess || !businessId || !localUri) {
      return
    }

    const processUpload = async () => {
      try {
        setProcessing(true)
        console.log('UploadProcessing: Starting upload process', {
          businessId,
          transactionType,
          inputMethod,
          fileNameHint,
        })
        
        // Upload file
        console.log('UploadProcessing: Uploading file to storage...')
        const downloadUrl = await uploadReceiptAndGetUrl({
          businessId,
          localUri,
          fileNameHint,
          contentType,
        })
        console.log('UploadProcessing: File uploaded, downloadUrl:', downloadUrl)
        
        // Create transaction
        console.log('UploadProcessing: Creating transaction...', {
          businessId,
          transactionType: transactionType || 'purchase',
          inputMethod: inputMethod || 'ocr_pdf',
          fileUrl: downloadUrl,
        })
        const response = await transactions2Api.createTransaction({
          businessId,
          transactionType: transactionType || 'purchase',
          inputMethod: inputMethod || 'ocr_pdf',
          fileUrl: downloadUrl,
        })
        
        console.log('UploadProcessing: Transaction creation response:', {
          success: response.success,
          logged: response.logged,
          transactionId: response.transactionId,
          message: response.message,
        })
        
        if (response.success) {
          console.log('UploadProcessing: Transaction created successfully, transactionId:', response.transactionId)
          // Wait a moment to ensure transaction is fully saved before showing success
          await new Promise(resolve => setTimeout(resolve, 500))
          setShowSuccess(true)
          setProcessing(false)
        } else if (response.logged) {
          // Transaction type/input method not yet implemented (501)
          console.log('UploadProcessing: Transaction type not yet implemented, logged for future implementation')
          Alert.alert(
            'Not Yet Available',
            response.message || `Transaction type '${transactionType}' with input method '${inputMethod}' is not yet implemented. This request has been logged for future implementation.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          )
          setProcessing(false)
        } else {
          console.error('UploadProcessing: Transaction creation failed:', response.message)
          throw new Error(response.message || 'Failed to create transaction')
        }
      } catch (error) {
        console.error('UploadProcessing: Error during upload/transaction creation:', error)
        const message = error instanceof Error ? error.message : 'Failed to create transaction'
        Alert.alert(
          'Error',
          message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
        setProcessing(false)
      }
    }

    processUpload()
  }, [businessId, localUri, fileNameHint, contentType, transactionType, inputMethod, initialSuccess, navigation])

  // Auto-navigate back after success
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        // Navigate back to transactions screen with the correct section active
        // Map pipelineSection to activeSection
        const activeSection: 'receipts' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' | undefined = 
          pipelineSection === 'bank' ? 'bank' : 
          pipelineSection === 'cards' ? 'cards' : 
          pipelineSection === 'receipts' ? 'receipts' :
          pipelineSection === 'sales' ? 'sales' :
          pipelineSection === 'internal' ? 'internal' :
          pipelineSection === 'reporting' ? 'reporting' : undefined
        
        console.log('UploadProcessing: Navigating back with activeSection:', activeSection, 'from pipelineSection:', pipelineSection)
        
        // Go back to home screen first, then navigate with params
        // This ensures we're on the home screen before setting the section
        if (navigation.canGoBack()) {
          // Go back from UploadProcessing -> AddTransaction
          navigation.goBack()
          setTimeout(() => {
            if (navigation.canGoBack()) {
              // Go back from AddTransaction -> TransactionsScaffoldScreen
              navigation.goBack()
              // After going back, navigate to the same screen with params to update activeSection
              setTimeout(() => {
                try {
                  // Try TransactionsHome first
                  console.log('UploadProcessing: Navigating to TransactionsHome with activeSection:', activeSection)
                  navigation.navigate('TransactionsHome' as never, { activeSection } as never)
                } catch (e1) {
                  try {
                    // Try ScaffoldHome
                    console.log('UploadProcessing: Navigating to ScaffoldHome with activeSection:', activeSection)
                    navigation.navigate('ScaffoldHome' as never, { activeSection } as never)
                  } catch (e2) {
                    console.error('UploadProcessing: Failed to navigate with activeSection:', e2)
                    // Last resort: try to set params on the current route
                    try {
                      const parent = navigation.getParent()
                      if (parent) {
                        parent.setParams({ activeSection } as never)
                      }
                    } catch (e3) {
                      console.error('UploadProcessing: Failed to set params:', e3)
                    }
                  }
                }
              }, 200)
            }
          }, 100)
        } else {
          // If we can't go back, try direct navigation
          try {
            navigation.navigate('TransactionsHome' as never, { activeSection } as never)
          } catch (e1) {
            try {
              navigation.navigate('ScaffoldHome' as never, { activeSection } as never)
            } catch (e2) {
              console.error('UploadProcessing: Failed to navigate:', e2)
            }
          }
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showSuccess, navigation, pipelineSection])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {isPdf && pdfFileName ? (
          <View style={styles.pdfPreview}>
            <MaterialIcons name="picture-as-pdf" size={80} color={GRAYSCALE_PRIMARY} />
            <Text style={styles.pdfFileName} numberOfLines={2}>
              {pdfFileName}
            </Text>
          </View>
        ) : pdfUri ? (
          <View style={styles.imagePreview}>
            {/* For images, we could show a thumbnail here if needed */}
            <MaterialIcons name="image" size={80} color={GRAYSCALE_PRIMARY} />
          </View>
        ) : null}

        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : showSuccess ? (
          <View style={styles.successContainer}>
            <MaterialIcons name="check-circle" size={48} color="#4a9eff" />
            <Text style={styles.successText}>Transaction created successfully</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pdfPreview: {
    width: 280,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 48,
  },
  imagePreview: {
    width: 280,
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  pdfFileName: {
    marginTop: 16,
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    marginTop: 16,
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },
})

