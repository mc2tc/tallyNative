// Transaction detail screen - displays full transaction summary information
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Linking, Platform, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import type { Transaction } from '../lib/api/transactions2'
import { transactions2Api } from '../lib/api/transactions2'
import { chartAccountsApi } from '../lib/api/chartAccounts'
import { paymentMethodsApi, type PaymentMethodOption } from '../lib/api/paymentMethods'
import { formatAmount } from '../lib/utils/currency'
import { ApiError } from '../lib/api/client'
import { AppBarLayout } from '../components/AppBarLayout'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const DEFAULT_CURRENCY = 'GBP'

type TransactionDetailRouteProp =
  | RouteProp<TransactionsStackParamList, 'TransactionDetail'>
  | RouteProp<ScaffoldStackParamList, 'TransactionDetail'>

type TransactionItem = {
  name: string
  quantity?: number
  unit?: string
  unitCost?: number
  amount: number
  debitAccount?: string
  amountExcluding?: number
  vatAmount?: number
  debitAccountConfirmed?: boolean
  isBusinessExpense?: boolean
  category?: string
}

type TransactionDetails = {
  itemList?: TransactionItem[]
}

type TransactionClassification = {
  kind?: string
}

type TransactionAccounting = {
  credits?: Array<{
    chartName?: string
    paymentMethod?: string
  }>
  paymentBreakdown?: Array<{
    type?: string
    amount?: number
  }>
}


export default function TransactionDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList | ScaffoldStackParamList>>()
  const route = useRoute<TransactionDetailRouteProp>()
  const { transaction: initialTransaction } = route.params

  const [transaction, setTransaction] = useState<Transaction>(initialTransaction)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethodOption[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false)
  const [confirmingVerification, setConfirmingVerification] = useState(false)
  // For transactions3: store selected payment method locally until verification (for purchase receipts only)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  // Store all payment methods to get proper labels for display
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethodOption[]>([])
  // For bank transactions: store edited debit accounts locally until verification
  const [editedItemDebitAccounts, setEditedItemDebitAccounts] = useState<Map<number, string>>(new Map())
  // For item actions: track which action is selected (edit_account or add_to_inventory)
  const [itemActionSelection, setItemActionSelection] = useState<Map<number, string>>(new Map())
  // For "No matching record" workflow
  const [noMatchingRecord, setNoMatchingRecord] = useState(false)
  const [unreconcilableDescription, setUnreconcilableDescription] = useState<string>('')
  const [unreconcilableAccount, setUnreconcilableAccount] = useState<string>('')
  const [unreconcilableReason, setUnreconcilableReason] = useState<string>('')
  const [showUnreconcilableAccountPicker, setShowUnreconcilableAccountPicker] = useState(false)
  // For sales transactions: payment status and method
  const [showSalesPaymentPicker, setShowSalesPaymentPicker] = useState(false)
  const [selectedSalesPaymentMethod, setSelectedSalesPaymentMethod] = useState<string | null>(null)
  const [updatingSalesPayment, setUpdatingSalesPayment] = useState(false)
  // For invoice PDF: generation and download
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [invoicePdfUrl, setInvoicePdfUrl] = useState<string | null>(null)
  // For receipt image display
  const [showReceiptImage, setShowReceiptImage] = useState(false)
  const salesPaymentSlideAnim = React.useRef(new Animated.Value(0)).current
  const paymentMethodSlideAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(0)).current
  const headerWiggleAnim = React.useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

  // Safely extract businessId - use initial transaction's businessId as fallback
  // This prevents errors if the updated transaction structure changes after verification
  const initialBusinessId = initialTransaction?.metadata?.businessId
  const currentBusinessId = transaction?.metadata?.businessId
  const businessId = currentBusinessId || initialBusinessId
  
  if (!businessId) {
    console.error('TransactionDetailScreen: No businessId found in transaction', {
      initialTransaction: initialTransaction?.metadata,
      currentTransaction: transaction?.metadata,
    })
  }

  // Check if transaction needs verification (transactions3 pending transaction)
  const transactionMetadata = transaction?.metadata as { 
    verification?: { status?: string }
    reconciliation?: { status?: string }
    classification?: TransactionClassification
    businessId?: string
    statementContext?: { isCredit?: boolean }
    capture?: { source?: string }
  } | undefined
  const isUnverified = transactionMetadata?.verification?.status === 'unverified'
  const reconciliationStatus = transactionMetadata?.reconciliation?.status
  
  // Check if this is a transactions3 transaction
  // Transactions3 transactions have:
  // - classification.kind === 'purchase' (for purchases) or 'statement_entry' (for bank/card)
  // - OR are from transactions3 collections (pending/source_of_truth)
  // We can detect by checking classification kind or capture source
  const classification = transactionMetadata?.classification as TransactionClassification | undefined
  const captureSource = transactionMetadata?.capture?.source
  const isTransactions3Purchase = classification?.kind === 'purchase'
  const isTransactions3Statement = classification?.kind === 'statement_entry'
  const isTransactions3 = isUnverified || isTransactions3Purchase || isTransactions3Statement || 
    captureSource === 'bank_statement_upload' || 
    captureSource === 'credit_card_statement_upload' ||
    captureSource === 'purchase_invoice_ocr'
  
  // Check if this is a bank transaction (statement_entry) vs purchase receipt
  const isBankTransaction = classification?.kind === 'statement_entry'
  // Check if classification kind is "purchase"
  const isPurchase = classification?.kind === 'purchase'
  // Check if this is a sale transaction (invoice)
  const isSale = classification?.kind === 'sale'
  
  // Check if transaction has accounting entries (to determine if it needs reconciliation)
  const accounting = transaction?.accounting as {
    debits?: Array<unknown>
    credits?: Array<{ paymentMethod?: string; chartName?: string }>
    paymentBreakdown?: Array<{ type?: string; amount?: number }>
  } | undefined
  
  // For sales transactions: determine if invoice is paid
  // Paid if: reconciliation status is 'matched', 'reconciled', or 'exception'
  // Also check if it's cash-only (cash payments are considered paid immediately)
  const isCashOnlySale = isSale && accounting?.paymentBreakdown?.some(
    (pm) => pm.type === 'cash' || pm.type?.toLowerCase() === 'cash'
  )
  const isSalePaid = isSale && (
    reconciliationStatus === 'matched' ||
    reconciliationStatus === 'reconciled' ||
    reconciliationStatus === 'exception' ||
    isCashOnlySale
  )
  const hasAccountingEntries = (accounting?.debits?.length ?? 0) > 0 || (accounting?.credits?.length ?? 0) > 0
  // Bank transaction from "Needs reconciliation" card: unverified, no accounting entries
  const isNeedsReconciliation = isBankTransaction && isUnverified && !hasAccountingEntries
  
  // Get statement context for credit/debit display
  const statementContext = transactionMetadata?.statementContext as { isCredit?: boolean } | undefined
  const isCredit = statementContext?.isCredit
  
  // Initialize unreconcilable description with transaction description
  React.useEffect(() => {
    if (isNeedsReconciliation && !unreconcilableDescription) {
      setUnreconcilableDescription(transaction?.summary?.description || transaction?.summary?.thirdPartyName || '')
    }
  }, [isNeedsReconciliation, transaction?.summary?.description, transaction?.summary?.thirdPartyName])

  // Fetch payment methods on mount to get proper labels for display
  React.useEffect(() => {
    if (businessId && (isTransactions3 || isPurchase)) {
      paymentMethodsApi.getPaymentMethods(businessId)
        .then((methods) => {
          const methodsArray = Array.isArray(methods) ? methods : []
          // Ensure "Accounts Payable" is always available
          const hasAccountsPayable = methodsArray.some(
            (method) => method.value === 'accounts_payable' || method.value === 'accounts payable' || method.value === 'accountspayable'
          )
          if (!hasAccountsPayable) {
            methodsArray.push({
              label: 'Accounts Payable',
              value: 'accounts_payable',
              chartName: 'Accounts Payable',
            })
          }
          setAllPaymentMethods(methodsArray)
        })
        .catch((error) => {
          console.error('Failed to fetch payment methods for display:', error)
          // Set Accounts Payable as fallback
          setAllPaymentMethods([{
            label: 'Accounts Payable',
            value: 'accounts_payable',
            chartName: 'Accounts Payable',
          }])
        })
    }
  }, [businessId, isTransactions3, isPurchase])

  // Safely access transaction properties with fallbacks (moved before callbacks that use them)
  const transactionSummary = transaction?.summary
  const transactionAmount = transactionSummary?.totalAmount || 0
  
  // Get item list from details - safely access with optional chaining
  const details = transaction?.details as {
    itemList?: TransactionItem[]
    paymentBreakdown?: Array<{ type?: string; amount?: number }>
  } | undefined

  const handleConfirmVerification = useCallback(async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing. Cannot verify transaction.')
      return
    }
    
    setConfirmingVerification(true)
    try {
      let updatedTransaction: Transaction
      
      // Use transactions3 approach: stage changes locally, persist on Confirm and save
        const updateOptions: {
          paymentBreakdown?: Array<{ type: string; amount: number }>
          itemList?: Array<{
            name: string
            amount: number
            amountExcluding?: number
            vatAmount?: number
            debitAccount?: string
            debitAccountConfirmed?: boolean
            isBusinessExpense?: boolean
            category?: string
          }>
          paymentMethod?: string
        } = {}

      // Build updated itemList with staged debitAccount changes
        const currentItemList = details?.itemList || []
        if (currentItemList.length > 0) {
          updateOptions.itemList = currentItemList.map((item, index) => {
            const debitAccount = editedItemDebitAccounts.has(index)
              ? editedItemDebitAccounts.get(index)!
              : item.debitAccount || ''

            return {
              name: item.name,
              amount: item.amount,
              amountExcluding: item.amountExcluding,
              vatAmount: item.vatAmount,
              debitAccount,
              debitAccountConfirmed: true,
              isBusinessExpense: item.isBusinessExpense,
              category: item.category,
            }
          })
        }

        // Build paymentBreakdown / paymentMethod
        if (selectedPaymentMethod) {
          // Use new payment method as full-amount breakdown
          updateOptions.paymentBreakdown = [
            {
              type: selectedPaymentMethod,
              amount: transactionAmount,
            },
          ]
        } else if (currentPaymentBreakdown.length > 0) {
          // Reuse existing breakdown
          updateOptions.paymentBreakdown = currentPaymentBreakdown
            .filter((pb) => pb.type && typeof pb.amount === 'number')
            .map((pb) => ({
              type: pb.type as string,
              amount: pb.amount as number,
            }))
        }

        if (!transaction?.id) {
          throw new Error('Transaction ID is missing')
        }

        if (isUnverified) {
        // Pending transactions: use verify endpoint (moves to source_of_truth)
          const verifyResponse = await transactions2Api.verifyTransaction(
            transaction.id,
            businessId!,
            Object.keys(updateOptions).length > 0 ? updateOptions : undefined,
          )

          console.log('TransactionDetailScreen: verifyTransaction response', {
            hasResponse: !!verifyResponse,
            hasMetadata: !!verifyResponse?.metadata,
            hasBusinessId: !!verifyResponse?.metadata?.businessId,
            transactionId: verifyResponse?.id,
            metadataKeys: verifyResponse?.metadata ? Object.keys(verifyResponse.metadata) : [],
          })

          updatedTransaction = verifyResponse
        } else {
        // Verified transactions: use updateVerifiedPurchase endpoint (source_of_truth)
          if (!updateOptions.itemList && !updateOptions.paymentBreakdown && !updateOptions.paymentMethod) {
            Alert.alert('Nothing to save', 'No changes to accounts or payment method.')
            setConfirmingVerification(false)
            return
          }

          const updateResponse = await transactions2Api.updateTransactions3VerifiedPurchase(
            transaction.id,
            businessId!,
            updateOptions,
          )

          console.log('TransactionDetailScreen: updateTransactions3VerifiedPurchase response', {
            success: updateResponse.success,
            transactionId: updateResponse.transactionId,
          })

          updatedTransaction = updateResponse.transaction
      }
      
      // Verify the updated transaction has required fields
      console.log('TransactionDetailScreen: Verifying updated transaction', {
        hasTransaction: !!updatedTransaction,
        isObject: typeof updatedTransaction === 'object',
        hasSuccess: (updatedTransaction as any)?.success !== undefined,
        keys: updatedTransaction ? Object.keys(updatedTransaction) : [],
        hasMetadata: !!updatedTransaction?.metadata,
        metadataKeys: updatedTransaction?.metadata ? Object.keys(updatedTransaction.metadata) : [],
        hasBusinessId: !!updatedTransaction?.metadata?.businessId,
      })
      
      // Check if we got the full response object instead of just the transaction
      if (updatedTransaction && 'success' in updatedTransaction && 'transaction' in updatedTransaction) {
        console.log('TransactionDetailScreen: Response contains full response object, extracting transaction')
        updatedTransaction = (updatedTransaction as any).transaction as Transaction
      }
      
      if (!updatedTransaction) {
        console.error('TransactionDetailScreen: Updated transaction is null/undefined')
        Alert.alert('Error', 'Transaction verification succeeded but received invalid response')
        setConfirmingVerification(false)
        return
      }
      
      // Ensure metadata exists
      if (!updatedTransaction.metadata) {
        console.warn('TransactionDetailScreen: Updated transaction missing metadata, creating it', {
          hasBusinessId: !!businessId,
          transactionId: updatedTransaction.id,
        })
        if (businessId) {
          // Create metadata object with required fields
          // Use unknown cast to bypass type checking since we're creating a minimal metadata object
          updatedTransaction.metadata = {
            businessId,
            capture: {},
            classification: {},
            createdBy: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as unknown as Transaction['metadata']
        } else {
          console.error('TransactionDetailScreen: Cannot create metadata without businessId')
          Alert.alert('Error', 'Transaction verification succeeded but response is missing required fields')
          setConfirmingVerification(false)
          return
        }
      }
      
      // Ensure businessId exists in metadata - use original if missing
      if (!updatedTransaction.metadata.businessId) {
        if (businessId) {
          console.warn('TransactionDetailScreen: Updated transaction missing businessId in metadata, using original', businessId)
          updatedTransaction.metadata.businessId = businessId
        } else {
          console.error('TransactionDetailScreen: No businessId available for updated transaction')
          Alert.alert('Error', 'Transaction verification succeeded but business ID is missing')
          setConfirmingVerification(false)
          return
        }
      }
      
      // Save inventory items (Inventory) to Firestore
      // This is done after successful verification, but errors are non-blocking
      const updatedItemList = (updatedTransaction?.details as TransactionDetails | undefined)?.itemList || []
      const inventoryItems = updatedItemList.filter(
        (item) => item.debitAccount === 'Inventory'
      )
      
      if (inventoryItems.length > 0 && businessId && updatedTransaction?.id) {
        try {
          // Get reference from transaction metadata
          const reference = (updatedTransaction.metadata as { reference?: string } | undefined)?.reference
          
          // Use the final debitAccount values from the updated transaction
          const itemsToSave = inventoryItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
            amount: item.amount,
            amountExcluding: item.amountExcluding,
            vatAmount: item.vatAmount,
            debitAccount: item.debitAccount || '',
            debitAccountConfirmed: item.debitAccountConfirmed,
            isBusinessExpense: item.isBusinessExpense,
            category: item.category,
            reference,
          }))
          
          await transactions2Api.saveInventoryItems(
            businessId,
            updatedTransaction.id,
            itemsToSave,
          )
          console.log('TransactionDetailScreen: Successfully saved inventory items', {
            count: itemsToSave.length,
            transactionId: updatedTransaction.id,
          })
        } catch (error) {
          // Non-blocking: log error but don't fail the verification
          console.error('TransactionDetailScreen: Failed to save inventory items:', error)
          // Don't show alert to user - verification succeeded, inventory save is secondary
        }
      }
      
      // Transaction has been verified and moved to source_of_truth collection
      // It may have a new ID, so we should navigate back to let the parent screen refresh
      // The transaction will now appear in the appropriate card (e.g., "Reconcile to bank")
      Alert.alert('Success', 'Transaction verified successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Clear local state after successful verification
            setSelectedPaymentMethod(null)
            setEditedItemDebitAccounts(new Map())
            // Navigate back immediately - parent screen will refresh and show transaction in correct collection
            if (navigation.canGoBack()) {
              navigation.goBack()
            }
          },
        },
      ])
    } catch (error) {
      console.error('Failed to confirm verification:', error)
      let errorMessage = 'Failed to confirm verification. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
      }
      Alert.alert('Error', errorMessage)
      setConfirmingVerification(false)
    }
  }, [transaction.id, transaction?.summary?.totalAmount, businessId, isBankTransaction, selectedPaymentMethod, editedItemDebitAccounts, transaction?.details, navigation])

  // Handler for confirming unreconcilable transaction
  const handleConfirmUnreconcilable = useCallback(async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing. Cannot verify transaction.')
      return
    }

    if (!unreconcilableAccount) {
      Alert.alert('Error', 'Please select a Chart of Accounts')
      return
    }

    setConfirmingVerification(true)
    try {
      if (!transaction?.id) {
        throw new Error('Transaction ID is missing')
      }

      // Build itemList from form data
      const unreconcilableAmount = transaction?.summary?.totalAmount || 0
      const itemList = [
        {
          name: unreconcilableDescription || transaction.summary?.description || 'Transaction',
          debitAccount: unreconcilableAccount,
          amount: unreconcilableAmount,
          amountExcluding: unreconcilableAmount, // Adjust if VAT-registered
          isBusinessExpense: true,
          debitAccountConfirmed: true,
        },
      ]

      const verifyResponse = await transactions2Api.verifyTransaction(
        transaction.id,
        businessId,
        {
          markAsUnreconcilable: true,
          description: unreconcilableDescription || transaction.summary?.description,
          itemList: itemList,
          unreconcilableReason: unreconcilableReason || undefined,
        },
      )

      console.log('TransactionDetailScreen: verifyTransaction (unreconcilable) response', {
        hasResponse: !!verifyResponse,
        hasMetadata: !!verifyResponse?.metadata,
      })

      // Transaction has been verified and moved to source_of_truth collection
      Alert.alert('Success', 'Transaction confirmed successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Clear form state
            setNoMatchingRecord(false)
            setUnreconcilableDescription('')
            setUnreconcilableAccount('')
            setUnreconcilableReason('')
            // Navigate back - parent screen will refresh and show transaction in correct collection
            if (navigation.canGoBack()) {
              navigation.goBack()
            }
          },
        },
      ])
    } catch (error) {
      console.error('Failed to confirm unreconcilable transaction:', error)
      let errorMessage = 'Failed to confirm transaction. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setConfirmingVerification(false)
    }
  }, [transaction.id, transaction.summary?.description, transaction?.summary?.totalAmount, businessId, unreconcilableAccount, unreconcilableDescription, unreconcilableReason, navigation])

  // Reason options for unreconcilable transactions
  const unreconcilableReasons = [
    'Receipt lost',
    'Personal expense',
    'Cash transaction',
    'Receipt not available',
    'Other',
  ]

  // Handler for selecting unreconcilable account
  const handleSelectUnreconcilableAccount = useCallback((account: string) => {
    setUnreconcilableAccount(account)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUnreconcilableAccountPicker(false)
    })
  }, [slideAnim])

  // Handler for selecting unreconcilable reason
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const handleSelectReason = useCallback((reason: string) => {
    setUnreconcilableReason(reason)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowReasonPicker(false)
    })
  }, [slideAnim])

  // Trigger animations when modals open
  React.useEffect(() => {
    if (showUnreconcilableAccountPicker || showReasonPicker) {
      // Start animation immediately when modal opens
      slideAnim.setValue(0)
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [showUnreconcilableAccountPicker, showReasonPicker, slideAnim])

  // Handler for closing unreconcilable account picker
  const handleCloseUnreconcilableAccountPicker = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUnreconcilableAccountPicker(false)
    })
  }, [slideAnim])

  // Handler for closing reason picker
  const handleCloseReasonPicker = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowReasonPicker(false)
    })
  }, [slideAnim])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleClosePicker = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAccountPicker(false)
      setEditingItemIndex(null)
    })
  }, [slideAnim])

  const handleEditPaymentMethod = useCallback(async () => {
    setLoadingPaymentMethods(true)
    setShowPaymentMethodPicker(true)
    // Reset payment methods to empty array to ensure it's always defined
    setAvailablePaymentMethods([])

    try {
      const methods = await paymentMethodsApi.getPaymentMethods(businessId)
      // Ensure we always set an array, even if API returns something unexpected
      const methodsArray = Array.isArray(methods) ? methods : []
      
      // Ensure "Accounts Payable" is always available in the list
      const accountsPayableOption: PaymentMethodOption = {
        label: 'Accounts Payable',
        value: 'accounts_payable',
        chartName: 'Accounts Payable',
      }
      
      // Check if Accounts Payable already exists in the list
      const hasAccountsPayable = methodsArray.some(
        (method) => method.value === 'accounts_payable' || method.value === 'accounts payable' || method.value === 'accountspayable'
      )
      
      // Add Accounts Payable if it doesn't exist
      if (!hasAccountsPayable) {
        methodsArray.push(accountsPayableOption)
      }
      
      setAvailablePaymentMethods(methodsArray)
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
      if (error instanceof ApiError) {
        console.error('API Error status:', error.status, 'Message:', error.message, 'Data:', error.data)
      }
      // Even on error, provide Accounts Payable as a fallback option
      const accountsPayableOption: PaymentMethodOption = {
        label: 'Accounts Payable',
        value: 'accounts_payable',
        chartName: 'Accounts Payable',
      }
      setAvailablePaymentMethods([accountsPayableOption])
      // Show error but don't close the picker - allow user to select Accounts Payable
      Alert.alert(
        'Warning',
        'Some payment methods may not be available, but you can still select Accounts Payable.',
      )
    } finally {
      setLoadingPaymentMethods(false)
    }

    Animated.spring(paymentMethodSlideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start()
  }, [paymentMethodSlideAnim, businessId])

  const handleClosePaymentMethodPicker = useCallback(() => {
    Animated.timing(paymentMethodSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowPaymentMethodPicker(false)
    })
  }, [paymentMethodSlideAnim])

  const handleSelectPaymentMethod = useCallback(
    async (method: PaymentMethodOption) => {
      // For all transactions (transactions3 and transactions2): store locally, persist on Confirm and save
      setSelectedPaymentMethod(method.value)
      handleClosePaymentMethodPicker()
    },
    [handleClosePaymentMethodPicker],
  )

  // Detect unsaved changes (staged accounts, payment methods, or unreconcilable form edits)
  const hasUnsavedChanges =
    editedItemDebitAccounts.size > 0 ||
    !!selectedPaymentMethod ||
    !!selectedSalesPaymentMethod ||
    noMatchingRecord ||
    !!unreconcilableDescription ||
    !!unreconcilableAccount ||
    !!unreconcilableReason

  // Warn user when navigating away with unsaved changes
  React.useEffect(() => {
    const beforeRemove = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || confirmingVerification) {
        // No staged edits or we're already saving - allow navigation
        return
      }

      // Prevent the default behaviour of leaving the screen
      e.preventDefault()

      // Build warning message based on what's missing
      let warningMessage = 'You have unsaved changes on this transaction. If you leave now, they will be lost.'
      if (isPaymentMethodInvalid) {
        warningMessage = 'Please select a payment method (not "Unknown") before saving. If you leave now, your changes will be lost.'
      }

      Alert.alert(
        'Discard changes?',
        warningMessage,
        [
          { text: 'Stay', style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Clear staged state and proceed with the original navigation action
              setEditedItemDebitAccounts(new Map())
              setSelectedPaymentMethod(null)
              setSelectedSalesPaymentMethod(null)
              setItemActionSelection(new Map())
              setNoMatchingRecord(false)
              setUnreconcilableDescription('')
              setUnreconcilableAccount('')
              setUnreconcilableReason('')
              navigation.dispatch(e.data.action)
            },
          },
        ],
      )
    })

    return beforeRemove
  }, [
    navigation,
    hasUnsavedChanges,
    confirmingVerification,
    setEditedItemDebitAccounts,
    setSelectedPaymentMethod,
    setSelectedSalesPaymentMethod,
    setItemActionSelection,
    setNoMatchingRecord,
    setUnreconcilableDescription,
    setUnreconcilableAccount,
    setUnreconcilableReason,
  ])

  // Handler for sales payment method selection
  const handleSelectSalesPaymentMethod = useCallback((method: PaymentMethodOption) => {
    setSelectedSalesPaymentMethod(method.value)
    handleCloseSalesPaymentPicker()
  }, [])

  // Handler for closing sales payment picker
  const handleCloseSalesPaymentPicker = useCallback(() => {
    Animated.timing(salesPaymentSlideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSalesPaymentPicker(false)
    })
  }, [salesPaymentSlideAnim])

  // Handler for generating invoice PDF
  const handleGenerateInvoicePDF = useCallback(async () => {
    if (!businessId || !transaction?.id) {
      Alert.alert('Error', 'Cannot generate PDF: missing transaction information')
      return
    }

    setGeneratingPDF(true)
    try {
      const pdfResponse = await transactions2Api.generateInvoicePDF(transaction.id, businessId)
      
      if (pdfResponse.success && pdfResponse.pdfUrl) {
        setInvoicePdfUrl(pdfResponse.pdfUrl)
        Alert.alert('Success', 'Invoice PDF generated successfully!', [
          {
            text: 'View PDF',
            onPress: () => {
              Linking.openURL(pdfResponse.pdfUrl).catch((err) => {
                console.error('Failed to open PDF URL:', err)
                Alert.alert('Error', 'Failed to open PDF. Please try downloading it instead.')
              })
            },
          },
          { text: 'OK' },
        ])
      } else {
        throw new Error('PDF generation failed')
      }
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setGeneratingPDF(false)
    }
  }, [businessId, transaction?.id])

  // Handler for downloading invoice PDF
  const handleDownloadInvoicePDF = useCallback(async () => {
    if (!invoicePdfUrl) {
      // If PDF URL not available, generate it first
      await handleGenerateInvoicePDF()
      return
    }

    try {
      // Open PDF URL directly from backend - this allows user to view and save
      // Works on both iOS and Android (browser/PDF viewer will handle download)
      const canOpen = await Linking.canOpenURL(invoicePdfUrl)
      if (canOpen) {
        await Linking.openURL(invoicePdfUrl)
      } else {
        Alert.alert('Error', 'Cannot open PDF. Please try again.')
      }
    } catch (error) {
      console.error('Failed to open PDF:', error)
      Alert.alert('Error', 'Failed to open PDF. Please try again.')
    }
  }, [invoicePdfUrl, handleGenerateInvoicePDF])

  // Handler for viewing invoice PDF (opens in browser/app)
  const handleViewInvoicePDF = useCallback(async () => {
    if (!invoicePdfUrl) {
      // If PDF URL not available, generate it first
      await handleGenerateInvoicePDF()
      return
    }

    try {
      // Open PDF URL directly from backend (works on both iOS and Android)
      const canOpen = await Linking.canOpenURL(invoicePdfUrl)
      if (canOpen) {
        await Linking.openURL(invoicePdfUrl)
      } else {
        Alert.alert('Error', 'Cannot open PDF. Please try downloading it instead.')
      }
    } catch (error) {
      console.error('Failed to open PDF URL:', error)
      Alert.alert('Error', 'Failed to open PDF. Please try downloading it instead.')
    }
  }, [invoicePdfUrl, handleGenerateInvoicePDF])

  // Handler for viewing receipt image
  const handleViewReceipt = useCallback(() => {
    const receiptImageUrl = transaction?.metadata?.imageUrl
    if (!receiptImageUrl) {
      Alert.alert('No Receipt', 'Receipt image is not available for this transaction.')
      return
    }
    setShowReceiptImage(true)
  }, [transaction?.metadata?.imageUrl])

  // Handler for marking invoice as paid
  // Calls transactions3 mark-paid endpoint which handles both AP and AR invoices
  const handleMarkAsPaid = useCallback(async () => {
    if (!selectedSalesPaymentMethod || !businessId) {
      Alert.alert('Error', 'Please select a payment method.')
      return
    }

    setUpdatingSalesPayment(true)
    try {
      // Call transactions3 mark-paid endpoint
      // Endpoint automatically detects if it's AP (purchase) or AR (sales) invoice
      const response = await transactions2Api.markInvoiceAsPaid(
        transaction.id,
        businessId,
        selectedSalesPaymentMethod,
        // Optional: paymentDate - defaults to today for AR invoices
        // Can be added later if we want to allow users to set payment date
      )

      console.log('Invoice marked as paid successfully:', response.transactionId)
      
      // Update transaction state with the updated transaction from response
      setTransaction(response.transaction)
      setSelectedSalesPaymentMethod(null)
      
      // Show success message
      Alert.alert(
        'Success',
        'Invoice marked as paid successfully!',
        [{ text: 'OK' }]
      )
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error)
      let errorMessage = 'Failed to mark invoice as paid. Please try again.'
      
      if (error instanceof ApiError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setUpdatingSalesPayment(false)
    }
  }, [selectedSalesPaymentMethod, businessId, transaction.id])

  // Fetch chart accounts when opening the picker
  const handleEditAccount = useCallback(async (itemIndex: number) => {
    setEditingItemIndex(itemIndex)
    setLoadingAccounts(true)
    setShowAccountPicker(true)
    // Reset accounts to empty array to ensure it's always defined
    setAvailableAccounts([])

    try {
      const accounts = await chartAccountsApi.getDebitAccounts(businessId)
      // The API function already extracts accounts array from response
      const accountsArray = Array.isArray(accounts) ? accounts : []
      setAvailableAccounts(accountsArray)
    } catch (error) {
      console.error('Failed to fetch chart accounts:', error)
      if (error instanceof ApiError) {
        console.error('API Error status:', error.status, 'Message:', error.message, 'Data:', error.data)
      }
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Failed to load available accounts. Please try again.',
      )
      setAvailableAccounts([]) // Ensure it's still an array on error
      setShowAccountPicker(false)
      return
    } finally {
      setLoadingAccounts(false)
    }

    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start()
  }, [slideAnim, businessId])

  const handleSelectAccount = useCallback(
    (account: string, indexOverride?: number) => {
      const targetIndex = indexOverride ?? editingItemIndex
      if (targetIndex === null || targetIndex === undefined) return

      // Store locally, persist on Confirm and save
        const newEditedAccounts = new Map(editedItemDebitAccounts)
        newEditedAccounts.set(targetIndex, account)
        setEditedItemDebitAccounts(newEditedAccounts)
        handleClosePicker()
    },
    [
      editingItemIndex,
      handleClosePicker,
      editedItemDebitAccounts,
    ],
  )

  // Additional transaction properties for display
  const transactionCurrency = transactionSummary?.currency || DEFAULT_CURRENCY
  const transactionDateValue = transactionSummary?.transactionDate || Date.now()
  const thirdPartyName = transactionSummary?.thirdPartyName || 'Unknown'

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY
  const isDefault = isDefaultCurrency(transactionCurrency)

  // Format transaction date with year (e.g., "Thursday 13 November 2024")
  const transactionDate = new Date(transactionDateValue)
  const dateTimeString = transactionDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      GBP: '£',
      USD: '$',
      EUR: '€',
      BBD: 'BBD',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
    }
    return symbols[currency.toUpperCase()] || currency.toUpperCase()
  }
  const currencySymbol = getCurrencySymbol(transactionCurrency)
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(transactionAmount)
  const amountWithSymbol = `${currencySymbol}${formattedAmount}`

  // Format item amounts (without currency symbol, as it's shown in header)
  const formatItemAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const itemList = details?.itemList || []

  // Check if classification kind is "purchase" and get chart name (for transactions2)
  // Note: accounting is already extracted above for hasAccountingEntries check
  const transactionAccounting = transaction?.accounting as TransactionAccounting | undefined
  const chartName = isPurchase && !isTransactions3 ? transactionAccounting?.credits?.[0]?.chartName : undefined

  // For transactions3: get payment method from accounting.paymentBreakdown or use selected one
  const currentPaymentBreakdown = accounting?.paymentBreakdown || []
  const currentPaymentMethodType = currentPaymentBreakdown.length > 0 
    ? currentPaymentBreakdown[0].type 
    : undefined
  const displayPaymentMethod = selectedPaymentMethod || currentPaymentMethodType

  // Get payment method label for display
  const getPaymentMethodLabel = (methodType?: string | null): string | null => {
    if (!methodType) return null
    // First try to find in allPaymentMethods for proper label
    const paymentMethod = allPaymentMethods.find(
      (method) => method.value === methodType || method.value.toLowerCase() === methodType.toLowerCase()
    )
    if (paymentMethod) {
      return paymentMethod.label
    }
    // Fallback to hardcoded labels
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other',
    }
    return labels[methodType] || methodType.charAt(0).toUpperCase() + methodType.slice(1)
  }

  // Check if payment method needs attention (Unknown or not set)
  const paymentMethodLabel = displayPaymentMethod 
    ? (getPaymentMethodLabel(displayPaymentMethod) || displayPaymentMethod) 
    : null
  // Check if payment method is invalid (for validation)
  const isPaymentMethodInvalid = isTransactions3 && !isBankTransaction && (!displayPaymentMethod || paymentMethodLabel?.toLowerCase() === 'unknown')
  const paymentMethodNeedsAttention = 
    isPaymentMethodInvalid ||
    (chartName && !isTransactions3 && chartName.toLowerCase() === 'unknown')

  // Trigger wiggle animation when payment method needs attention
  React.useEffect(() => {
    if (paymentMethodNeedsAttention) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(headerWiggleAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: -8,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: 8,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(headerWiggleAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [paymentMethodNeedsAttention, headerWiggleAnim])

  return (
    <AppBarLayout title={thirdPartyName} onBackPress={handleGoBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.View 
          style={[
            styles.header,
            paymentMethodNeedsAttention && styles.headerNeedsAttention,
            {
              transform: [{ translateX: headerWiggleAnim }],
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.iconContainer}
            onPress={handleViewReceipt}
            activeOpacity={0.7}
            disabled={!transaction?.metadata?.imageUrl}
          >
            {isBankTransaction ? (
              <MaterialIcons name="account-balance" size={32} color={GRAYSCALE_PRIMARY} />
            ) : (
              <MaterialCommunityIcons name="receipt-text" size={32} color={GRAYSCALE_PRIMARY} />
            )}
          </TouchableOpacity>
          {/* For bank transactions from "Needs reconciliation", show description and credit/debit status */}
          {isNeedsReconciliation ? (
            <>
              <Text style={styles.thirdPartyName}>{transaction?.summary?.description || thirdPartyName}</Text>
              <Text style={styles.amount}>{amountWithSymbol}</Text>
              <Text style={styles.transactionType}>
                {isCredit === true ? 'Credit' : isCredit === false ? 'Debit' : 'Unknown'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.thirdPartyName}>{dateTimeString}</Text>
              <Text style={styles.amount}>{amountWithSymbol}</Text>
            </>
          )}
          {chartName && !isTransactions3 && (
            <View style={styles.chartNameRow}>
              <Text style={styles.paidByLabel}>Paid by:</Text>
              <Text style={styles.chartName}>{chartName}</Text>
              <TouchableOpacity
                style={styles.chartNameEditButton}
                onPress={handleEditPaymentMethod}
                activeOpacity={0.7}
              >
                <Text style={styles.chartNameEditButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
          {isTransactions3 && !isBankTransaction && (
            <View style={styles.chartNameRow}>
              <Text style={styles.paidByLabel}>Paid by:</Text>
              <Text style={styles.chartName}>
                {displayPaymentMethod ? (getPaymentMethodLabel(displayPaymentMethod) || displayPaymentMethod) : 'Select payment method'}
              </Text>
              <TouchableOpacity
                style={styles.chartNameEditButton}
                onPress={handleEditPaymentMethod}
                activeOpacity={0.7}
              >
                <Text style={styles.chartNameEditButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
          {!isDefault && (
            <Text style={styles.foreignCurrency}>
              {formatAmount(transactionAmount, transactionCurrency, false)}
            </Text>
          )}
        </Animated.View>

        {itemList.length > 0 && (
          <View style={styles.itemsContainer}>
            {itemList.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {(editedItemDebitAccounts.has(index) ? editedItemDebitAccounts.get(index) : item.debitAccount) && (
                      <>
                        <View style={styles.accountRow}>
                          <Text style={styles.accountLabel}>
                            {editedItemDebitAccounts.has(index) ? editedItemDebitAccounts.get(index) : item.debitAccount}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <Text style={styles.itemAmount}>{formatItemAmount(item.amount)}</Text>
                </View>

                {(isUnverified || item.debitAccount) && (
                  <View style={styles.segmentedButtonsContainer}>
                    <Text style={styles.segmentedButtonsLabel}>Update Account</Text>
                    <View style={styles.segmentedButtonsWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.segmentedButton,
                          itemActionSelection.get(index) === 'inventory' && styles.segmentedButtonActive,
                          { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                        ]}
                        onPress={async () => {
                          const newSelection = new Map(itemActionSelection)
                          newSelection.set(index, 'inventory')
                          setItemActionSelection(newSelection)

                          await handleSelectAccount('Inventory', index)

                          setTimeout(() => {
                            const resetSelection = new Map(itemActionSelection)
                            resetSelection.delete(index)
                            setItemActionSelection(resetSelection)
                          }, 100)
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.segmentedButtonText,
                            itemActionSelection.get(index) === 'inventory' && styles.segmentedButtonTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          Inventory
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.segmentedButton,
                          itemActionSelection.get(index) === 'other' && styles.segmentedButtonActive,
                          { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                        ]}
                        onPress={() => {
                          const newSelection = new Map(itemActionSelection)
                          newSelection.set(index, 'other')
                          setItemActionSelection(newSelection)
                          handleEditAccount(index)
                          setTimeout(() => {
                            const resetSelection = new Map(itemActionSelection)
                            resetSelection.delete(index)
                            setItemActionSelection(resetSelection)
                          }, 100)
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.segmentedButtonText,
                            itemActionSelection.get(index) === 'other' && styles.segmentedButtonTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          Other
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* For bank transactions from "Needs reconciliation", show checkbox and form */}
        {isNeedsReconciliation ? (
          <View style={styles.unreconcilableContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setNoMatchingRecord(!noMatchingRecord)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={noMatchingRecord ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={GRAYSCALE_PRIMARY}
              />
              <Text style={styles.checkboxLabel}>No matching record</Text>
            </TouchableOpacity>

            {noMatchingRecord && (
              <View style={styles.unreconcilableForm}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.textInput}
                    value={unreconcilableDescription}
                    onChangeText={setUnreconcilableDescription}
                    placeholder="Transaction description"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Chart of Accounts</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={async () => {
                      if (!businessId) {
                        Alert.alert('Error', 'Business ID is missing')
                        return
                      }
                      setLoadingAccounts(true)
                      try {
                        const accounts = await chartAccountsApi.getAccounts(businessId)
                        const accountNames = accounts.map((acc) => acc.name)
                        setAvailableAccounts(accountNames)
                        // Reset animation and open picker after accounts are loaded
                        slideAnim.setValue(0)
                        setShowUnreconcilableAccountPicker(true)
                      } catch (error) {
                        console.error('Failed to load accounts:', error)
                        Alert.alert('Error', 'Failed to load accounts')
                      } finally {
                        setLoadingAccounts(false)
                      }
                    }}
                  >
                    <Text style={[styles.pickerButtonText, !unreconcilableAccount && styles.pickerButtonPlaceholder]}>
                      {unreconcilableAccount || 'Select account'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={GRAYSCALE_PRIMARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Reason</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      // Reset animation and open picker
                      slideAnim.setValue(0)
                      setShowReasonPicker(true)
                    }}
                  >
                    <Text style={[styles.pickerButtonText, !unreconcilableReason && styles.pickerButtonPlaceholder]}>
                      {unreconcilableReason || 'Select reason'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={GRAYSCALE_PRIMARY} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!unreconcilableAccount || confirmingVerification) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirmUnreconcilable}
                  activeOpacity={0.8}
                  disabled={!unreconcilableAccount || confirmingVerification}
                >
                  {confirmingVerification ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirm transaction</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (isTransactions3 && !isBankTransaction && !isNeedsReconciliation) ? (
          <View style={styles.confirmButtonContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, (confirmingVerification || !!paymentMethodNeedsAttention) && styles.confirmButtonDisabled]}
              onPress={handleConfirmVerification}
              activeOpacity={0.8}
              disabled={confirmingVerification || !!paymentMethodNeedsAttention}
            >
              {confirmingVerification ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm and save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Sales Invoice Payment Status Section */}
        {isSale && (
          <View style={styles.paymentStatusCard}>
            <Text style={styles.paymentStatusTitle}>Payment Status</Text>
            
            <View style={styles.paymentStatusRow}>
              <View style={styles.paymentStatusInfo}>
                <Text style={styles.paymentStatusLabel}>Status:</Text>
                <View style={styles.paymentStatusBadge}>
                  <View style={[styles.paymentStatusIndicator, isSalePaid ? styles.paymentStatusPaid : styles.paymentStatusUnpaid]} />
                  <Text style={styles.paymentStatusText}>
                    {isSalePaid ? 'Paid' : 'Pending Payment'}
                  </Text>
                </View>
              </View>
              
              {isSalePaid && currentPaymentMethodType && (
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentStatusLabel}>Payment Method:</Text>
                  <Text style={styles.paymentMethodValue}>
                    {getPaymentMethodLabel(currentPaymentMethodType) || currentPaymentMethodType}
                  </Text>
                </View>
              )}
            </View>

            {/* Invoice PDF Actions */}
            <View style={styles.invoiceActionsSection}>
              <Text style={styles.invoiceActionsTitle}>Invoice PDF</Text>
              <View style={styles.invoiceActionsRow}>
                <TouchableOpacity
                  style={[styles.invoiceActionButton, generatingPDF && styles.invoiceActionButtonDisabled]}
                  onPress={handleViewInvoicePDF}
                  disabled={generatingPDF}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="visibility" size={18} color="#ffffff" />
                  <Text style={styles.invoiceActionButtonText}>View Invoice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.invoiceActionButton, styles.invoiceActionButtonSecondary, generatingPDF && styles.invoiceActionButtonDisabled]}
                  onPress={handleDownloadInvoicePDF}
                  disabled={generatingPDF}
                  activeOpacity={0.7}
                >
                  {generatingPDF ? (
                    <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
                  ) : (
                    <MaterialIcons name="download" size={18} color={GRAYSCALE_PRIMARY} />
                  )}
                  <Text style={[styles.invoiceActionButtonText, styles.invoiceActionButtonTextSecondary]}>
                    {generatingPDF ? 'Generating...' : 'Download'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isSalePaid && (
              <View style={styles.markAsPaidSection}>
                <Text style={styles.markAsPaidLabel}>Mark invoice as paid</Text>
                <Text style={styles.markAsPaidSubtext}>Select the payment method used to pay this invoice</Text>
                
                <TouchableOpacity
                  style={styles.paymentMethodSelectButton}
                  onPress={async () => {
                    salesPaymentSlideAnim.setValue(0)
                    setShowSalesPaymentPicker(true)
                    // Load payment methods if not already loaded
                    if (availablePaymentMethods.length === 0 && businessId) {
                      setLoadingPaymentMethods(true)
                      try {
                        const methods = await paymentMethodsApi.getPaymentMethods(businessId)
                        const methodsArray = Array.isArray(methods) ? methods : []
                        setAvailablePaymentMethods(methodsArray)
                      } catch (error) {
                        console.error('Failed to fetch payment methods:', error)
                        setAvailablePaymentMethods([])
                      } finally {
                        setLoadingPaymentMethods(false)
                      }
                    }
                    Animated.spring(salesPaymentSlideAnim, {
                      toValue: 1,
                      useNativeDriver: true,
                      tension: 50,
                      friction: 10,
                    }).start()
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.paymentMethodSelectText, !selectedSalesPaymentMethod && styles.paymentMethodSelectPlaceholder]}>
                    {selectedSalesPaymentMethod 
                      ? (getPaymentMethodLabel(selectedSalesPaymentMethod) || selectedSalesPaymentMethod)
                      : 'Select payment method'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>

                {selectedSalesPaymentMethod && (
                  <TouchableOpacity
                    style={[styles.markAsPaidButton, updatingSalesPayment && styles.markAsPaidButtonDisabled]}
                    onPress={handleMarkAsPaid}
                    activeOpacity={0.8}
                    disabled={updatingSalesPayment}
                  >
                    {updatingSalesPayment ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.markAsPaidButtonText}>Mark as Paid</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Account Picker Bottom Sheet */}
      <Modal
        visible={showAccountPicker}
        transparent
        animationType="none"
        onRequestClose={handleClosePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Account</Text>
                <TouchableOpacity onPress={handleClosePicker} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingAccounts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                  <Text style={styles.loadingText}>Loading accounts...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.accountList}
                  contentContainerStyle={{ paddingBottom: insets.bottom }}
                  showsVerticalScrollIndicator={false}
                >
                  {(() => {
                    const accounts = Array.isArray(availableAccounts) ? availableAccounts : []
                    return accounts.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No accounts available</Text>
                      </View>
                    ) : (
                      accounts.map((account, idx) => {
                        // Get current account from edited state or transaction
                        const currentAccount = editingItemIndex !== null && editedItemDebitAccounts.has(editingItemIndex)
                          ? editedItemDebitAccounts.get(editingItemIndex)
                          : (transaction?.details as TransactionDetails | undefined)?.itemList?.[editingItemIndex ?? -1]?.debitAccount
                        const isSelected = currentAccount === account

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.accountOption,
                            isSelected && styles.accountOptionSelected,
                          ]}
                          onPress={() => handleSelectAccount(account)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                            {account}
                          </Text>
                          {isSelected && (
                            <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                          )}
                        </TouchableOpacity>
                      )
                    })
                  )
                  })()}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Method Picker Bottom Sheet */}
      <Modal
        visible={showPaymentMethodPicker}
        transparent
        animationType="none"
        onRequestClose={handleClosePaymentMethodPicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePaymentMethodPicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: paymentMethodSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Payment Method</Text>
                <TouchableOpacity onPress={handleClosePaymentMethodPicker} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingPaymentMethods ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                  <Text style={styles.loadingText}>Loading payment methods...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.accountList}
                  contentContainerStyle={{ paddingBottom: insets.bottom }}
                  showsVerticalScrollIndicator={false}
                >
                  {(() => {
                    const methods = Array.isArray(availablePaymentMethods) ? availablePaymentMethods : []
                    return methods.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No payment methods available</Text>
                      </View>
                    ) : (
                      methods.map((method, idx) => {
                        // Get current payment method value from transaction or local state
                        let currentPaymentMethodValue: string | undefined
                        if (isTransactions3) {
                          // For transactions3: check local state first, then transaction
                          currentPaymentMethodValue = selectedPaymentMethod || currentPaymentMethodType
                        } else {
                          // For transactions2: check accounting credits
                          const credits = accounting?.credits
                          currentPaymentMethodValue = credits && credits.length > 0 ? credits[0]?.paymentMethod : undefined
                        }
                        const isSelected = currentPaymentMethodValue === method.value
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.accountOption,
                              isSelected && styles.accountOptionSelected,
                              updatingPaymentMethod && styles.accountOptionDisabled,
                            ]}
                            onPress={() => !updatingPaymentMethod && handleSelectPaymentMethod(method)}
                            activeOpacity={updatingPaymentMethod ? 1 : 0.7}
                            disabled={updatingPaymentMethod}
                          >
                            <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                              {method.label}
                            </Text>
                            {isSelected && !updatingPaymentMethod && (
                              <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                            )}
                            {updatingPaymentMethod && isSelected && (
                              <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} style={styles.optionLoader} />
                            )}
                          </TouchableOpacity>
                        )
                      })
                    )
                  })()}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Sales Payment Method Picker Bottom Sheet */}
      <Modal
        visible={showSalesPaymentPicker}
        transparent
        animationType="none"
        onRequestClose={handleCloseSalesPaymentPicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseSalesPaymentPicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: salesPaymentSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Payment Method</Text>
                <TouchableOpacity onPress={handleCloseSalesPaymentPicker} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingPaymentMethods ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                  <Text style={styles.loadingText}>Loading payment methods...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.accountList}
                  contentContainerStyle={{ paddingBottom: insets.bottom }}
                  showsVerticalScrollIndicator={false}
                >
                  {(() => {
                    const methods = Array.isArray(availablePaymentMethods) ? availablePaymentMethods : []
                    return methods.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No payment methods available</Text>
                      </View>
                    ) : (
                      methods.map((method, idx) => {
                        const isSelected = selectedSalesPaymentMethod === method.value
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.accountOption,
                              isSelected && styles.accountOptionSelected,
                            ]}
                            onPress={() => handleSelectSalesPaymentMethod(method)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                              {method.label}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                            )}
                          </TouchableOpacity>
                        )
                      })
                    )
                  })()}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Unreconcilable Account Picker Bottom Sheet */}
      <Modal
        visible={showUnreconcilableAccountPicker}
        transparent
        animationType="none"
        onRequestClose={handleCloseUnreconcilableAccountPicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseUnreconcilableAccountPicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Chart of Accounts</Text>
                <TouchableOpacity onPress={handleCloseUnreconcilableAccountPicker} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingAccounts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                  <Text style={styles.loadingText}>Loading accounts...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.accountList}
                  contentContainerStyle={{ paddingBottom: insets.bottom }}
                  showsVerticalScrollIndicator={false}
                >
                  {(() => {
                    const accounts = Array.isArray(availableAccounts) ? availableAccounts : []
                    return accounts.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No accounts available</Text>
                      </View>
                    ) : (
                      accounts.map((account, idx) => {
                        const isSelected = unreconcilableAccount === account
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.accountOption, isSelected && styles.accountOptionSelected]}
                            onPress={() => handleSelectUnreconcilableAccount(account)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                              {account}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                            )}
                          </TouchableOpacity>
                        )
                      })
                    )
                  })()}
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Reason Picker Bottom Sheet */}
      <Modal
        visible={showReasonPicker}
        transparent
        animationType="none"
        onRequestClose={handleCloseReasonPicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseReasonPicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Select Reason</Text>
                <TouchableOpacity onPress={handleCloseReasonPicker} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.accountList}
                contentContainerStyle={{ paddingBottom: insets.bottom }}
                showsVerticalScrollIndicator={false}
              >
                {unreconcilableReasons.map((reason, idx) => {
                  const isSelected = unreconcilableReason === reason
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.accountOption, isSelected && styles.accountOptionSelected]}
                      onPress={() => handleSelectReason(reason)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                        {reason}
                      </Text>
                      {isSelected && (
                        <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Receipt Image Modal */}
      <Modal
        visible={showReceiptImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceiptImage(false)}
      >
        <TouchableOpacity
          style={styles.receiptImageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowReceiptImage(false)}
        >
          <View style={styles.receiptImageContainer}>
            <TouchableOpacity
              style={[styles.receiptImageCloseButton, { top: insets.top + 16 }]}
              onPress={() => setShowReceiptImage(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            {transaction?.metadata?.imageUrl && (
              <Image
                source={{ uri: transaction.metadata.imageUrl }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
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
  dateTime: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerNeedsAttention: {
    borderColor: '#333333',
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  thirdPartyName: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
    textAlign: 'center',
  },
  amount: {
    fontSize: 22,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  chartNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  paidByLabel: {
    fontSize: 13,
    color: '#888888',
    marginRight: 4,
  },
  chartName: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    marginRight: 4,
  },
  chartNameEditButton: {
    backgroundColor: '#f6f6f6',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 4,
  },
  chartNameEditButtonText: {
    fontSize: 12,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  foreignCurrency: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemLeft: {
    flex: 1,
    marginRight: 16,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemDetails: {
    fontSize: 13,
    color: '#888888',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  accountLabel: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
  },
  segmentedButtonsContainer: {
    marginTop: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  segmentedButtonsLabel: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    marginBottom: 8,
  },
  segmentedButtonsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'stretch',
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#e0e0e0',
    minWidth: 0,
  },
  segmentedButtonActive: {
    backgroundColor: GRAYSCALE_PRIMARY,
  },
  segmentedButtonText: {
    fontSize: 12,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentedButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  itemActionsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  itemActionButton: {
    flex: 1,
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  itemActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  itemActionButtonTextSecondary: {
    color: GRAYSCALE_PRIMARY,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  accountList: {
    maxHeight: 400,
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountOptionSelected: {
    backgroundColor: '#f6f6f6',
  },
  accountOptionText: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  accountOptionTextSelected: {
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  accountOptionDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
  },
  optionLoader: {
    marginLeft: 8,
  },
  unreconcilableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    marginLeft: 12,
    fontWeight: '500',
  },
  unreconcilableForm: {
    marginTop: 8,
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerButtonText: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  pickerButtonPlaceholder: {
    color: '#888888',
  },
  reasonPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButtonContainer: {
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  confirmButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Sales Payment Status Styles
  paymentStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  paymentStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  paymentStatusRow: {
    marginTop: 12,
  },
  paymentStatusInfo: {
    marginBottom: 12,
  },
  paymentStatusLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f6f6f6',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  paymentStatusPaid: {
    backgroundColor: '#4caf50',
  },
  paymentStatusUnpaid: {
    backgroundColor: '#ff9800',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  paymentMethodInfo: {
    marginTop: 8,
  },
  paymentMethodValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginTop: 4,
  },
  markAsPaidSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  markAsPaidLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  markAsPaidSubtext: {
    fontSize: 13,
    color: '#6d6d6d',
    marginBottom: 12,
  },
  paymentMethodSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  paymentMethodSelectText: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  paymentMethodSelectPlaceholder: {
    color: '#6d6d6d',
  },
  markAsPaidButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAsPaidButtonDisabled: {
    opacity: 0.6,
  },
  markAsPaidButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Invoice PDF Actions Styles
  invoiceActionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  invoiceActionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  invoiceActionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  invoiceActionButtonDisabled: {
    opacity: 0.6,
  },
  invoiceActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  invoiceActionButtonTextSecondary: {
    color: GRAYSCALE_PRIMARY,
  },
  // Receipt Image Modal Styles
  receiptImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  receiptImageCloseButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
})

