// Transaction detail screen - displays full transaction summary information
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
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
}


export default function TransactionDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<TransactionDetailRouteProp>()
  const { transaction: initialTransaction } = route.params

  const [transaction, setTransaction] = useState<Transaction>(initialTransaction)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [updatingAccount, setUpdatingAccount] = useState(false)
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethodOption[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false)
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false)
  const [confirmingVerification, setConfirmingVerification] = useState(false)
  // For transactions3: store selected payment method locally until verification (for purchase receipts only)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  // For bank transactions: store edited debit accounts locally until verification
  const [editedItemDebitAccounts, setEditedItemDebitAccounts] = useState<Map<number, string>>(new Map())
  // For "No matching record" workflow
  const [noMatchingRecord, setNoMatchingRecord] = useState(false)
  const [unreconcilableDescription, setUnreconcilableDescription] = useState<string>('')
  const [unreconcilableAccount, setUnreconcilableAccount] = useState<string>('')
  const [unreconcilableReason, setUnreconcilableReason] = useState<string>('')
  const [showUnreconcilableAccountPicker, setShowUnreconcilableAccountPicker] = useState(false)
  const paymentMethodSlideAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(0)).current
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
    classification?: TransactionClassification
    businessId?: string
    statementContext?: { isCredit?: boolean }
    capture?: { source?: string }
  } | undefined
  const isUnverified = transactionMetadata?.verification?.status === 'unverified'
  
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
  
  // Check if transaction has accounting entries (to determine if it needs reconciliation)
  const accounting = transaction?.accounting as {
    debits?: Array<unknown>
    credits?: Array<{ paymentMethod?: string; chartName?: string }>
  } | undefined
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
      
      if (isTransactions3) {
        // For transactions3: use verifyTransaction endpoint
        const verifyOptions: {
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
        } = {}
        
        if (isBankTransaction) {
          // For bank transactions: send itemList with confirmed debit accounts
          const currentItemList = details?.itemList || []
          if (currentItemList.length > 0) {
            verifyOptions.itemList = currentItemList.map((item, index) => {
              // Use edited debit account if available, otherwise use existing
              const debitAccount = editedItemDebitAccounts.has(index)
                ? editedItemDebitAccounts.get(index)!
                : item.debitAccount || ''
              
              return {
                name: item.name,
                amount: item.amount,
                amountExcluding: item.amountExcluding,
                vatAmount: item.vatAmount,
                debitAccount: debitAccount,
                debitAccountConfirmed: true, // User confirmed by clicking "Confirm and save"
                isBusinessExpense: item.isBusinessExpense,
                category: item.category,
              }
            })
          }
        } else {
          // For purchase receipts: include paymentBreakdown if payment method was edited
          if (selectedPaymentMethod) {
            verifyOptions.paymentBreakdown = [
              {
                type: selectedPaymentMethod,
                amount: transactionAmount,
              },
            ]
          }
        }
        
        if (!transaction?.id) {
          throw new Error('Transaction ID is missing')
        }
        
        const verifyResponse = await transactions2Api.verifyTransaction(
          transaction.id,
          businessId!,
          Object.keys(verifyOptions).length > 0 ? verifyOptions : undefined,
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
        // For transactions2: use confirmVerification endpoint
        if (!transaction?.id) {
          throw new Error('Transaction ID is missing')
        }
        
        updatedTransaction = await transactions2Api.confirmVerification(
          transaction.id,
          businessId!,
        )
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
  }, [transaction.id, transaction?.summary?.totalAmount, businessId, isTransactions3, isBankTransaction, selectedPaymentMethod, editedItemDebitAccounts, transaction?.details, navigation])

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
      if (isTransactions3) {
        if (isUnverified) {
          // For unverified transactions3: store locally (will be sent during verification)
          setSelectedPaymentMethod(method.value)
          handleClosePaymentMethodPicker()
        } else {
          // For verified transactions3: update immediately via transactions3 API
          setUpdatingPaymentMethod(true)
          try {
            const updatedTransaction = await transactions2Api.updateTransactions3PaymentMethod(
              transaction.id,
              businessId,
              method.value,
            )
            setTransaction(updatedTransaction)
            handleClosePaymentMethodPicker()
          } catch (error) {
            console.error('Failed to update payment method:', error)
            let errorMessage = 'Failed to update payment method. Please try again.'

            if (error instanceof ApiError) {
              errorMessage = error.message
            }

            Alert.alert('Error', errorMessage)
          } finally {
            setUpdatingPaymentMethod(false)
          }
        }
      } else {
        // For transactions2: update immediately via API
        setUpdatingPaymentMethod(true)
        try {
          const updatedTransaction = await transactions2Api.updatePaymentMethod(
            transaction.id,
            businessId,
            method.value,
          )
          setTransaction(updatedTransaction)
          handleClosePaymentMethodPicker()
        } catch (error) {
          console.error('Failed to update payment method:', error)
          let errorMessage = 'Failed to update payment method. Please try again.'

          if (error instanceof ApiError) {
            errorMessage = error.message
          }

          Alert.alert('Error', errorMessage)
        } finally {
          setUpdatingPaymentMethod(false)
        }
      }
    },
    [transaction.id, businessId, handleClosePaymentMethodPicker, isTransactions3, isUnverified],
  )

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
    async (account: string) => {
      if (editingItemIndex === null) return

      setUpdatingAccount(true)
      try {
        const updatedTransaction = await transactions2Api.updateItemDebitAccount(
          transaction.id,
          businessId,
          editingItemIndex,
          account,
        )
        setTransaction(updatedTransaction)
        handleClosePicker()
      } catch (error) {
        console.error('Failed to update debit account:', error)
        let errorMessage = 'Failed to update account. Please try again.'
        let validAccounts: string[] | undefined

        if (error instanceof ApiError) {
          errorMessage = error.message
          // Check if error data contains validAccounts (from 400 response)
          if (error.data && typeof error.data === 'object' && 'validAccounts' in error.data) {
            validAccounts = (error.data as { validAccounts?: string[] }).validAccounts
          }
        }

        Alert.alert('Error', errorMessage)
        // If we have valid accounts, we could update the list, but for now just show error
        if (validAccounts) {
          setAvailableAccounts(validAccounts)
        }
      } finally {
        setUpdatingAccount(false)
      }
    },
    [editingItemIndex, transaction.id, businessId, handleClosePicker],
  )

  // Additional transaction properties for display
  const transactionCurrency = transactionSummary?.currency || DEFAULT_CURRENCY
  const transactionDateValue = transactionSummary?.transactionDate || Date.now()
  const thirdPartyName = transactionSummary?.thirdPartyName || 'Unknown'

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY
  const isDefault = isDefaultCurrency(transactionCurrency)

  // Format transaction date and time (like Monzo: "Thursday 13 November, 21:17")
  const transactionDate = new Date(transactionDateValue)
  const formattedDate = transactionDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const formattedTime = transactionDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateTimeString = `${formattedDate}, ${formattedTime}`

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
  const isPurchase = classification?.kind === 'purchase'
  const chartName = isPurchase && !isTransactions3 ? transactionAccounting?.credits?.[0]?.chartName : undefined

  // For transactions3: get payment method from details.paymentBreakdown or use selected one
  const currentPaymentBreakdown = details?.paymentBreakdown || []
  const currentPaymentMethodType = currentPaymentBreakdown.length > 0 
    ? currentPaymentBreakdown[0].type 
    : undefined
  const displayPaymentMethod = selectedPaymentMethod || currentPaymentMethodType

  // Get payment method label for display
  const getPaymentMethodLabel = (methodType?: string | null): string | null => {
    if (!methodType) return null
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other',
    }
    return labels[methodType] || methodType.charAt(0).toUpperCase() + methodType.slice(1)
  }

  return (
    <AppBarLayout title={thirdPartyName} onBackPress={handleGoBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {isBankTransaction ? (
              <MaterialIcons name="account-balance" size={32} color={GRAYSCALE_PRIMARY} />
            ) : (
              <MaterialCommunityIcons name="receipt-text" size={32} color={GRAYSCALE_PRIMARY} />
            )}
          </View>
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
              <Text style={styles.chartName}>{chartName}</Text>
              <TouchableOpacity
                style={styles.chartNameEditButton}
                onPress={handleEditPaymentMethod}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="mode-edit-outline" size={14} color="#888888" />
              </TouchableOpacity>
            </View>
          )}
          {isTransactions3 && !isBankTransaction && (
            <View style={styles.chartNameRow}>
              <Text style={styles.chartName}>
                {displayPaymentMethod ? getPaymentMethodLabel(displayPaymentMethod) || 'Payment method' : 'Payment method'}
              </Text>
              <TouchableOpacity
                style={styles.chartNameEditButton}
                onPress={handleEditPaymentMethod}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="mode-edit-outline" size={14} color="#888888" />
              </TouchableOpacity>
            </View>
          )}
          {!isDefault && (
            <Text style={styles.foreignCurrency}>
              {formatAmount(transactionAmount, transactionCurrency, false)}
            </Text>
          )}
        </View>

        {itemList.length > 0 && (
          <View style={styles.itemsCard}>
            {itemList.map((item, index) => (
              <View
                key={index}
                style={[styles.itemRow, index < itemList.length - 1 && styles.itemRowBorder]}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.itemDetailsRow}>
                    <Text style={styles.itemDetails}>
                      {item.quantity !== undefined && item.unitCost !== undefined
                        ? `${item.quantity} × ${formatItemAmount(item.unitCost)}`
                        : formatItemAmount(item.amount)}
                      {(editedItemDebitAccounts.has(index) ? editedItemDebitAccounts.get(index) : item.debitAccount) && 
                        ` • ${editedItemDebitAccounts.has(index) ? editedItemDebitAccounts.get(index) : item.debitAccount}`}
                    </Text>
                    {(isUnverified || item.debitAccount) && (
                      <TouchableOpacity
                        style={styles.editIconButton}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleEditAccount(index)}
                      >
                        <MaterialIcons name="mode-edit-outline" size={14} color="#888888" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={styles.itemAmount}>{formatItemAmount(item.amount)}</Text>
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
        ) : isUnverified && !isNeedsReconciliation ? (
          <View style={styles.confirmButtonContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, confirmingVerification && styles.confirmButtonDisabled]}
              onPress={handleConfirmVerification}
              activeOpacity={0.8}
              disabled={confirmingVerification}
            >
              {confirmingVerification ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm and save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
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
                            updatingAccount && styles.accountOptionDisabled,
                          ]}
                          onPress={() => !updatingAccount && handleSelectAccount(account)}
                          activeOpacity={updatingAccount ? 1 : 0.7}
                          disabled={updatingAccount}
                        >
                          <Text style={[styles.accountOptionText, isSelected && styles.accountOptionTextSelected]}>
                            {account}
                          </Text>
                          {isSelected && !updatingAccount && (
                            <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} style={styles.checkIcon} />
                          )}
                          {updatingAccount && isSelected && (
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
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  thirdPartyName: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  chartNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  chartName: {
    fontSize: 14,
    color: '#888888',
  },
  chartNameEditButton: {
    marginLeft: 6,
    padding: 2,
  },
  foreignCurrency: {
    fontSize: 16,
    color: '#888888',
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  editIconButton: {
    marginLeft: 6,
    padding: 2,
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
})

