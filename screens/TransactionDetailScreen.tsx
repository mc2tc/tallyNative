// Transaction detail screen - displays full transaction summary information
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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

const GRAYSCALE_PRIMARY = '#4a4a4a'
const DEFAULT_CURRENCY = 'GBP'

type TransactionDetailRouteProp =
  | RouteProp<TransactionsStackParamList, 'TransactionDetail'>
  | RouteProp<ScaffoldStackParamList, 'TransactionDetail'>

type TransactionItem = {
  name: string
  quantity: number
  unitCost: number
  amount: number
  debitAccount?: string
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
  const paymentMethodSlideAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

  const businessId = transaction.metadata.businessId

  // Check if transaction needs verification
  const metadata = transaction.metadata as { verification?: { status?: string } }
  const isUnverified = metadata.verification?.status === 'unverified'

  const handleConfirmVerification = useCallback(async () => {
    setConfirmingVerification(true)
    try {
      const updatedTransaction = await transactions2Api.confirmVerification(
        transaction.id,
        businessId,
      )
      setTransaction(updatedTransaction)
      Alert.alert('Success', 'Transaction verified successfully')
    } catch (error) {
      console.error('Failed to confirm verification:', error)
      let errorMessage = 'Failed to confirm verification. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setConfirmingVerification(false)
    }
  }, [transaction.id, businessId])

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
      setAvailablePaymentMethods(methodsArray)
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
      if (error instanceof ApiError) {
        console.error('API Error status:', error.status, 'Message:', error.message, 'Data:', error.data)
      }
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Failed to load payment methods. Please try again.',
      )
      setAvailablePaymentMethods([]) // Ensure it's still an array on error
      setShowPaymentMethodPicker(false)
      return
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
    },
    [transaction.id, businessId, handleClosePaymentMethodPicker],
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

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY
  const isDefault = isDefaultCurrency(transaction.summary.currency)

  // Format transaction date and time (like Monzo: "Thursday 13 November, 21:17")
  const transactionDate = new Date(transaction.summary.transactionDate)
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
  const currencySymbol = getCurrencySymbol(transaction.summary.currency)
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(transaction.summary.totalAmount)
  const amountWithSymbol = `${currencySymbol}${formattedAmount}`

  // Format item amounts (without currency symbol, as it's shown in header)
  const formatItemAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Get item list from details
  const details = transaction.details as TransactionDetails | undefined
  const itemList = details?.itemList || []

  // Check if classification kind is "purchase" and get chart name
  const classification = transaction.metadata.classification as TransactionClassification | undefined
  const accounting = transaction.accounting as TransactionAccounting | undefined
  const isPurchase = classification?.kind === 'purchase'
  const chartName = isPurchase ? accounting?.credits?.[0]?.chartName : undefined

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={GRAYSCALE_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.dateTime}>{dateTimeString}</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="receipt-text" size={32} color={GRAYSCALE_PRIMARY} />
          </View>
          <Text style={styles.thirdPartyName}>{transaction.summary.thirdPartyName}</Text>
          <Text style={styles.amount}>{amountWithSymbol}</Text>
          {chartName && (
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
          {!isDefault && (
            <Text style={styles.foreignCurrency}>
              {formatAmount(transaction.summary.totalAmount, transaction.summary.currency, false)}
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
                      {item.quantity} × {formatItemAmount(item.unitCost)}
                      {item.debitAccount && ` • ${item.debitAccount}`}
                    </Text>
                    {item.debitAccount && (
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

        {isUnverified && (
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
                      const details = transaction.details as TransactionDetails | undefined
                      const itemList = details?.itemList || []
                      const currentItem = editingItemIndex !== null ? itemList[editingItemIndex] : null
                      const isSelected = currentItem?.debitAccount === account

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
                        // Get current payment method value from transaction
                        const currentPaymentMethodValue = accounting?.credits?.[0]?.paymentMethod
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
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
  dateTime: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
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

