// Upload processing screen - shows PDF/image preview and processing status
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { uploadReceiptAndGetUrl } from '../lib/utils/storage'
import { transactions2Api } from '../lib/api/transactions2'

type UploadProcessingNavigationProp =
  | NavigationProp<TransactionsStackParamList, 'UploadProcessing'>
  | NavigationProp<ScaffoldStackParamList, 'UploadProcessing'>

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
    imageUri,
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
  const [successMessage, setSuccessMessage] = useState<string>('')

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
        const { downloadUrl, fileSize } = await uploadReceiptAndGetUrl({
          businessId,
          localUri,
          fileNameHint,
          contentType,
        })
        console.log('UploadProcessing: File uploaded, downloadUrl:', downloadUrl, 'fileSize:', fileSize)
        
        // Create transaction
        const finalTransactionType = transactionType || 'purchase'
        const finalInputMethod = inputMethod || 'ocr_pdf'
        console.log('UploadProcessing: Creating transaction...', {
          businessId,
          transactionType: finalTransactionType,
          inputMethod: finalInputMethod,
          fileUrl: downloadUrl,
        })
        
        // Sales section ALWAYS uses transactions3 sales invoice OCR endpoint
        // Bank section ALWAYS uses transactions3 bank statement upload endpoint (PDF only)
        // Credit Cards section ALWAYS uses transactions3 credit card statement upload endpoint (PDF only)
        // Purchases3 section ALWAYS uses transactions3 endpoint (new single-source-of-truth architecture)
        // For other transaction types, use the unified transactions2 endpoint
        const useSalesInvoiceOcr = pipelineSection === 'sales'
        const useBankStatementUpload = pipelineSection === 'bank' && isPdf
        const useCreditCardStatementUpload = pipelineSection === 'cards' && isPdf
        const useTransactions3 = pipelineSection === 'purchases3' || 
          (finalTransactionType === 'purchase' && (finalInputMethod === 'ocr_image' || finalInputMethod === 'ocr_pdf'))
        
        let response
        if (useSalesInvoiceOcr) {
          // Use transactions3 sales invoice OCR endpoint
          // For images: use fileUrl, for PDFs: use pdfUrl
          console.log('UploadProcessing: Using transactions3 sales invoice OCR endpoint')
          response = await transactions2Api.createSalesInvoiceOcr(
            businessId,
            isPdf ? undefined : downloadUrl,
            isPdf ? downloadUrl : undefined,
            fileSize
          )
          
          console.log('UploadProcessing: Sales invoice OCR response:', {
            success: response.success,
            logged: response.logged,
            transactionId: response.transactionId,
            message: response.message,
          })
          
          if (response.success) {
            console.log('UploadProcessing: Invoice processed successfully, transactionId:', response.transactionId)
            setSuccessMessage('Invoice processed successfully')
            // Wait a moment to ensure transaction is fully saved before showing success
            await new Promise(resolve => setTimeout(resolve, 500))
            setShowSuccess(true)
            setProcessing(false)
          } else if (response.logged) {
            // Transaction type/input method not yet implemented (501)
            console.log('UploadProcessing: Sales invoice OCR not yet implemented, logged for future implementation')
            Alert.alert(
              'Not Yet Available',
              response.message || `Sales invoice OCR is not yet implemented. This request has been logged for future implementation.`,
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            )
            setProcessing(false)
          } else {
            console.error('UploadProcessing: Sales invoice OCR failed:', response.message)
            throw new Error(response.message || 'Failed to process invoice')
          }
        } else if (useBankStatementUpload) {
          // Use transactions3 bank statement upload endpoint
          console.log('UploadProcessing: Using transactions3 bank statement upload endpoint')
          response = await transactions2Api.uploadBankStatement(businessId, downloadUrl, {
            // TODO: Get bankName and accountNumber if available from context
            fileSize,
          })
          
          console.log('UploadProcessing: Bank statement upload response:', {
            success: response.success,
            summary: response.summary,
          })
          
          if (response.success) {
            const summary = response.summary
            console.log('UploadProcessing: Bank statement processed successfully', {
              totalTransactions: summary.totalTransactions,
              ruleMatched: summary.ruleMatched,
              needsReconciliation: summary.needsReconciliation,
            })
            const message = `Bank statement processed: ${summary.totalTransactions} transactions. ${summary.ruleMatched} rule-matched, ${summary.needsReconciliation} need reconciliation.`
            setSuccessMessage(message)
            // Wait a moment to ensure transactions are fully saved before showing success
            await new Promise(resolve => setTimeout(resolve, 500))
            setShowSuccess(true)
            setProcessing(false)
          } else {
            console.error('UploadProcessing: Bank statement upload failed')
            throw new Error('Failed to process bank statement')
          }
        } else if (useCreditCardStatementUpload) {
          // Use transactions3 credit card statement upload endpoint
          console.log('UploadProcessing: Using transactions3 credit card statement upload endpoint')
          response = await transactions2Api.uploadCreditCardStatement(businessId, downloadUrl, {
            // TODO: Get cardName and cardNumber if available from context
            fileSize,
          })
          
          console.log('UploadProcessing: Credit card statement upload response:', {
            success: response.success,
            summary: response.summary,
          })
          
          if (response.success) {
            const summary = response.summary
            console.log('UploadProcessing: Credit card statement processed successfully', {
              totalTransactions: summary.totalTransactions,
              ruleMatched: summary.ruleMatched,
              needsReconciliation: summary.needsReconciliation,
            })
            const message = `Credit card statement processed: ${summary.totalTransactions} transactions. ${summary.ruleMatched} rule-matched, ${summary.needsReconciliation} need reconciliation.`
            setSuccessMessage(message)
            // Wait a moment to ensure transactions are fully saved before showing success
            await new Promise(resolve => setTimeout(resolve, 500))
            setShowSuccess(true)
            setProcessing(false)
          } else {
            console.error('UploadProcessing: Credit card statement upload failed')
            throw new Error('Failed to process credit card statement')
          }
        } else if (useTransactions3) {
          response = await transactions2Api.createPurchaseOcr(businessId, downloadUrl, fileSize)
          
          console.log('UploadProcessing: Transaction creation response:', {
            success: response.success,
            logged: response.logged,
            transactionId: response.transactionId,
            message: response.message,
          })
          
          if (response.success) {
            console.log('UploadProcessing: Transaction created successfully, transactionId:', response.transactionId)
            setSuccessMessage('Transaction created successfully')
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
        } else {
          response = await transactions2Api.createTransaction({
            businessId,
            transactionType: finalTransactionType,
            inputMethod: finalInputMethod,
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
        // Note: 'receipts' pipelineSection maps to 'purchases3' activeSection (legacy support)
        const activeSection: 'purchases3' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' | undefined = 
          pipelineSection === 'bank' ? 'bank' : 
          pipelineSection === 'cards' ? 'cards' : 
          pipelineSection === 'receipts' || pipelineSection === 'purchases3' ? 'purchases3' :
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
                if (!activeSection) return
                
                try {
                  // Try TransactionsHome first
                  console.log('UploadProcessing: Navigating to TransactionsHome with activeSection:', activeSection)
                  ;(navigation as NavigationProp<TransactionsStackParamList>).navigate('TransactionsHome', { activeSection })
                } catch (e1) {
                  try {
                    // Try ScaffoldHome
                    console.log('UploadProcessing: Navigating to ScaffoldHome with activeSection:', activeSection)
                    ;(navigation as NavigationProp<ScaffoldStackParamList>).navigate('ScaffoldHome', { activeSection })
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
          if (!activeSection) return
          
          try {
            ;(navigation as NavigationProp<TransactionsStackParamList>).navigate('TransactionsHome', { activeSection })
          } catch (e1) {
            try {
              ;(navigation as NavigationProp<ScaffoldStackParamList>).navigate('ScaffoldHome', { activeSection })
            } catch (e2) {
              console.error('UploadProcessing: Failed to navigate:', e2)
            }
          }
        }
      }, 3000)

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
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
        ) : null}

        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : showSuccess ? (
          <View style={styles.successContainer}>
            <MaterialIcons name="check-circle" size={36} />
            <Text style={styles.successText}>{successMessage || 'Transaction created successfully'}</Text>
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

