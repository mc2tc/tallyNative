import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api } from '../lib/api/transactions2'
import { chartAccountsApi } from '../lib/api/chartAccounts'
import { businessContextApi } from '../lib/api/businessContext'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PurchaseItem = {
  id: string
  name: string
  debitAccount: string
  quantity: number
  unitCost: number
  amount: number
  amountExcluding?: number
  vatRate?: number
  vatAmount?: number
  category?: string
  unit?: string
}

type Charge = {
  id: string
  name: string
  rate?: string
  amount: number
}

type PaymentMethod = {
  id: string
  type: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'accounts_payable' | 'employee_expense' | 'unknown'
  amount: number
  chequeNumber?: string
  cardLastFour?: string
}

export default function ManualPurchaseEntryScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()

  // Choose businessId
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Form state
  const [vendorName, setVendorName] = useState('')
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  })
  const [totalAmount, setTotalAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [businessCurrency, setBusinessCurrency] = useState<string>('GBP') // Default fallback
  const [reference, setReference] = useState('')
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: '1',
      name: '',
      debitAccount: '',
      quantity: 1,
      unitCost: 0,
      amount: 0,
    },
  ])
  const [charges, setCharges] = useState<Charge[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: '1', type: 'unknown', amount: 0 },
  ])

  // UI state
  const [debitAccounts, setDebitAccounts] = useState<string[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAccountPicker, setShowAccountPicker] = useState<string | null>(null) // item id
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState<string | null>(null) // payment method id
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  // Fetch business context to get default currency
  useEffect(() => {
    if (!businessId) return

    const fetchBusinessContext = async () => {
      try {
        const context = await businessContextApi.getContext(businessId)
        if (context.context?.primaryCurrency) {
          const primaryCurrency = context.context.primaryCurrency
          setBusinessCurrency(primaryCurrency)
          setCurrency(primaryCurrency) // Set as default
        }
      } catch (error) {
        console.error('Failed to fetch business context:', error)
        // Continue with default GBP if fetch fails
      }
    }

    fetchBusinessContext()
  }, [businessId])

  // Fetch debit accounts
  useEffect(() => {
    if (!businessId) return

    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true)
        const accounts = await chartAccountsApi.getDebitAccounts(businessId)
        setDebitAccounts(accounts)
      } catch (error) {
        console.error('Failed to fetch debit accounts:', error)
        Alert.alert('Error', 'Failed to load expense accounts. Please try again.')
      } finally {
        setLoadingAccounts(false)
      }
    }

    fetchAccounts()
  }, [businessId])

  // Calculate item amount when quantity, unitCost, or VAT changes
  const updateItemAmount = useCallback((itemId: string, field: 'quantity' | 'unitCost' | 'vatRate' | 'vatAmount', value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            [field]: value,
          }
          
          // Calculate base amount (quantity * unitCost)
          const baseAmount = updated.quantity * updated.unitCost
          
          // Calculate VAT
          if (field === 'vatRate' && value > 0) {
            // If VAT rate is set, calculate VAT amount
            updated.vatAmount = baseAmount * (value / 100)
            updated.amountExcluding = baseAmount
            updated.amount = baseAmount + (updated.vatAmount || 0)
          } else if (field === 'vatAmount') {
            // If VAT amount is set directly
            updated.amount = baseAmount + value
            updated.amountExcluding = baseAmount
            if (baseAmount > 0) {
              updated.vatRate = (value / baseAmount) * 100
            }
          } else {
            // Recalculate VAT if base amount changes
            if (updated.vatRate && updated.vatRate > 0) {
              updated.vatAmount = baseAmount * (updated.vatRate / 100)
              updated.amountExcluding = baseAmount
              updated.amount = baseAmount + (updated.vatAmount || 0)
            } else if (updated.vatAmount && updated.vatAmount > 0) {
              updated.amount = baseAmount + updated.vatAmount
              updated.amountExcluding = baseAmount
              if (baseAmount > 0) {
                updated.vatRate = (updated.vatAmount / baseAmount) * 100
              }
            } else {
              // No VAT
              updated.amount = baseAmount
              updated.amountExcluding = undefined
            }
          }
          
          return updated
        }
        return item
      }),
    )
  }, [])

  // Calculate total amount from items (including VAT) and charges
  useEffect(() => {
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0)
    const chargesTotal = charges.reduce((sum, charge) => sum + charge.amount, 0)
    const calculatedTotal = itemsTotal + chargesTotal
    setTotalAmount(calculatedTotal > 0 ? calculatedTotal.toFixed(2) : '')
    
    // Update payment method amounts if there's only one and it's the default
    // Otherwise, let user manage amounts manually
    if (calculatedTotal > 0 && paymentMethods.length === 1 && paymentMethods[0].type === 'unknown') {
      setPaymentMethods([{ ...paymentMethods[0], amount: calculatedTotal }])
    }
  }, [items, charges, paymentMethods.length])

  // Add new item
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        debitAccount: '',
        quantity: 1,
        unitCost: 0,
        amount: 0,
      },
    ])
  }, [])

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    if (items.length <= 1) {
      Alert.alert('Error', 'At least one item is required.')
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }, [items.length])

  // Add charge
  const addCharge = useCallback(() => {
    setCharges((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        amount: 0,
      },
    ])
  }, [])

  // Remove charge
  const removeCharge = useCallback((chargeId: string) => {
    setCharges((prev) => prev.filter((charge) => charge.id !== chargeId))
  }, [])

  // Add payment method
  const addPaymentMethod = useCallback(() => {
    setPaymentMethods((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'unknown',
        amount: 0,
      },
    ])
  }, [])

  // Remove payment method
  const removePaymentMethod = useCallback((paymentMethodId: string) => {
    if (paymentMethods.length <= 1) {
      Alert.alert('Error', 'At least one payment method is required.')
      return
    }
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== paymentMethodId))
  }, [paymentMethods.length])

  // Validate form
  const validateForm = useCallback((): boolean => {
    if (!vendorName.trim()) {
      Alert.alert('Validation Error', 'Vendor name is required.')
      return false
    }

    if (!transactionDate) {
      Alert.alert('Validation Error', 'Transaction date is required.')
      return false
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(transactionDate)) {
      Alert.alert('Validation Error', 'Please enter a valid date in YYYY-MM-DD format.')
      return false
    }

    if (items.length === 0) {
      Alert.alert('Validation Error', 'At least one item is required.')
      return false
    }

    for (const item of items) {
      if (!item.name.trim()) {
        Alert.alert('Validation Error', 'All items must have a name.')
        return false
      }
      if (!item.debitAccount) {
        Alert.alert('Validation Error', 'All items must have an expense account selected.')
        return false
      }
      if (item.quantity <= 0) {
        Alert.alert('Validation Error', 'All items must have a quantity greater than 0.')
        return false
      }
      if (item.unitCost <= 0) {
        Alert.alert('Validation Error', 'All items must have a unit cost greater than 0.')
        return false
      }
    }

    const total = parseFloat(totalAmount)
    if (isNaN(total) || total <= 0) {
      Alert.alert('Validation Error', 'Total amount must be greater than 0.')
      return false
    }

    // Validate payment methods
    if (paymentMethods.length === 0) {
      Alert.alert('Validation Error', 'At least one payment method is required.')
      return false
    }

    for (const pm of paymentMethods) {
      if (pm.type === 'unknown') {
        Alert.alert('Validation Error', 'All payment methods must have a type selected.')
        return false
      }
      if (pm.amount <= 0) {
        Alert.alert('Validation Error', 'All payment methods must have an amount greater than 0.')
        return false
      }
      if (pm.type === 'cheque' && !pm.chequeNumber?.trim()) {
        Alert.alert('Validation Error', 'Cheque payment method requires a cheque number.')
        return false
      }
    }

    // Validate payment method amounts sum to total
    const paymentTotal = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0)
    if (Math.abs(paymentTotal - total) > 0.01) {
      Alert.alert(
        'Validation Error',
        `Payment method amounts (${paymentTotal.toFixed(2)}) must equal total amount (${total.toFixed(2)}).`,
      )
      return false
    }

    return true
  }, [vendorName, transactionDate, items, totalAmount, paymentMethods])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!businessId) {
      Alert.alert('Error', 'No business selected.')
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      const transactionData = {
        vendorName: vendorName.trim(),
        transactionDate,
        totalAmount: parseFloat(totalAmount),
        // Include currency if set and different from business default
        // Backend will default to business currency if not provided
        ...(currency && currency !== businessCurrency && { currency }),
        ...(reference.trim() && { reference: reference.trim() }),
        items: items.map((item) => ({
          name: item.name.trim(),
          debitAccount: item.debitAccount,
          quantity: item.quantity,
          unitCost: item.unitCost,
          amount: item.amount,
          ...(item.amountExcluding && { amountExcluding: item.amountExcluding }),
          ...(item.vatRate && item.vatRate > 0 && { vatRate: item.vatRate }),
          ...(item.vatAmount && item.vatAmount > 0 && { vatAmount: item.vatAmount }),
          ...(item.category && { category: item.category }),
          ...(item.unit && { unit: item.unit }),
        })),
        ...(charges.length > 0 && {
          charges: charges.map((charge) => ({
            name: charge.name.trim(),
            ...(charge.rate && { rate: charge.rate }),
            amount: charge.amount,
          })),
        }),
        paymentType: paymentMethods.map((pm) => ({
          type: pm.type,
          amount: pm.amount,
          ...(pm.chequeNumber && { chequeNumber: pm.chequeNumber }),
          ...(pm.cardLastFour && { cardLastFour: pm.cardLastFour }),
        })),
      }

      const response = await transactions2Api.createPurchaseManual(businessId, transactionData)

      if (response.success) {
        Alert.alert('Success', 'Purchase transaction created successfully.', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack()
            },
          },
        ])
      } else {
        throw new Error(response.message || 'Failed to create transaction')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transaction'
      Alert.alert('Error', message)
    } finally {
      setSubmitting(false)
    }
  }, [
    businessId,
    vendorName,
    transactionDate,
    totalAmount,
    currency,
    reference,
    items,
    charges,
    paymentMethods,
    validateForm,
    navigation,
  ])

  return (
    <AppBarLayout title="Manual Purchase Entry" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Vendor Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Vendor Name *</Text>
          <TextInput
            style={styles.input}
            value={vendorName}
            onChangeText={setVendorName}
            placeholder="Enter vendor/supplier name"
            placeholderTextColor={GRAYSCALE_SECONDARY}
          />
        </View>

        {/* Transaction Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Transaction Date *</Text>
          <TextInput
            style={styles.input}
            value={transactionDate}
            onChangeText={setTransactionDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={GRAYSCALE_SECONDARY}
          />
        </View>

        {/* Reference */}
        <View style={styles.section}>
          <Text style={styles.label}>Reference (Optional)</Text>
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Invoice/receipt number"
            placeholderTextColor={GRAYSCALE_SECONDARY}
          />
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.label}>Currency</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !currency && styles.pickerButtonTextPlaceholder,
              ]}
            >
              {currency || businessCurrency || 'Select currency'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
          </TouchableOpacity>
          {showCurrencyPicker && (
            <View style={styles.pickerDropdown}>
              <ScrollView style={styles.pickerList} nestedScrollEnabled>
                {[
                  'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BBD',
                  'NZD', 'SGD', 'HKD', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN',
                ].map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={styles.pickerOption}
                    onPress={() => {
                      setCurrency(curr)
                      setShowCurrencyPicker(false)
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{curr}</Text>
                    {(currency || businessCurrency || 'GBP') === curr && (
                      <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {currency && currency !== businessCurrency && (
            <Text style={styles.hint}>
              Foreign currency: Backend will automatically convert to {businessCurrency} using exchange rate for {transactionDate}
            </Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items *</Text>
            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.removeButton}
                  >
                    <MaterialIcons name="close" size={18} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                value={item.name}
                onChangeText={(text) =>
                  setItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, name: text } : i)),
                  )
                }
                placeholder="Item name *"
                placeholderTextColor={GRAYSCALE_SECONDARY}
              />

              <View style={styles.fieldSpacing} />

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowAccountPicker(showAccountPicker === item.id ? null : item.id)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !item.debitAccount && styles.pickerButtonTextPlaceholder,
                  ]}
                >
                  {item.debitAccount || 'Expense account *'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
              </TouchableOpacity>

              {showAccountPicker === item.id && (
                <View style={styles.pickerDropdown}>
                  {loadingAccounts ? (
                    <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
                  ) : (
                    <ScrollView style={styles.pickerList} nestedScrollEnabled>
                      {debitAccounts.map((account) => (
                        <TouchableOpacity
                          key={account}
                          style={styles.pickerOption}
                          onPress={() => {
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id ? { ...i, debitAccount: account } : i,
                              ),
                            )
                            setShowAccountPicker(null)
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{account}</Text>
                          {item.debitAccount === account && (
                            <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              <View style={styles.fieldSpacing} />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.quantity.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemAmount(item.id, 'quantity', num)
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Unit Cost *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.unitCost > 0 ? item.unitCost.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemAmount(item.id, 'unitCost', num)
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
              </View>

              <View style={styles.fieldSpacing} />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>VAT Rate (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={item.vatRate && item.vatRate > 0 ? item.vatRate.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemAmount(item.id, 'vatRate', num)
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>VAT Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={item.vatAmount && item.vatAmount > 0 ? item.vatAmount.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemAmount(item.id, 'vatAmount', num)
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount (incl. VAT):</Text>
                <Text style={styles.amountValue}>
                  {item.amount.toFixed(2)}
                </Text>
              </View>
              {item.amountExcluding && item.amountExcluding > 0 && (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Amount (excl. VAT):</Text>
                  <Text style={styles.amountValue}>
                    {item.amountExcluding.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Charges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Other Charges (Optional)</Text>
            <TouchableOpacity onPress={addCharge} style={styles.addButton}>
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add Charge</Text>
            </TouchableOpacity>
          </View>

          {charges.map((charge) => (
            <View key={charge.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{charge.name || 'New Charge'}</Text>
                <TouchableOpacity
                  onPress={() => removeCharge(charge.id)}
                  style={styles.removeButton}
                >
                  <MaterialIcons name="close" size={18} color={GRAYSCALE_SECONDARY} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Charge Name</Text>
              <TextInput
                style={styles.input}
                value={charge.name}
                onChangeText={(text) =>
                  setCharges((prev) =>
                    prev.map((c) => (c.id === charge.id ? { ...c, name: text } : c)),
                  )
                }
                placeholder="e.g., Service Charge, Delivery Fee"
                placeholderTextColor={GRAYSCALE_SECONDARY}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Rate (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={charge.rate || ''}
                    onChangeText={(text) =>
                      setCharges((prev) =>
                        prev.map((c) => (c.id === charge.id ? { ...c, rate: text } : c)),
                      )
                    }
                    placeholder="e.g., 20%"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={charge.amount !== 0 ? charge.amount.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      setCharges((prev) =>
                        prev.map((c) => (c.id === charge.id ? { ...c, amount: num } : c)),
                      )
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods *</Text>
            <TouchableOpacity onPress={addPaymentMethod} style={styles.addButton}>
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add Payment</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.map((pm, index) => (
            <View key={pm.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Payment {index + 1}</Text>
                {paymentMethods.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removePaymentMethod(pm.id)}
                    style={styles.removeButton}
                  >
                    <MaterialIcons name="close" size={18} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPaymentMethodPicker(showPaymentMethodPicker === pm.id ? null : pm.id)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    pm.type === 'unknown' && styles.pickerButtonTextPlaceholder,
                  ]}
                >
                  {pm.type === 'unknown'
                    ? 'Payment method *'
                    : pm.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
              </TouchableOpacity>

              {showPaymentMethodPicker === pm.id && (
                <View style={styles.pickerDropdown}>
                  <ScrollView style={styles.pickerList} nestedScrollEnabled>
                    {(
                      [
                        'cash',
                        'card',
                        'bank_transfer',
                        'cheque',
                        'accounts_payable',
                        'employee_expense',
                      ] as const
                    ).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={styles.pickerOption}
                        onPress={() => {
                          setPaymentMethods((prev) =>
                            prev.map((p) =>
                              p.id === pm.id
                                ? {
                                    ...p,
                                    type,
                                    // If this is the first payment method and amount is 0, set to total
                                    amount:
                                      p.amount === 0 && index === 0
                                        ? parseFloat(totalAmount) || 0
                                        : p.amount,
                                  }
                                : p,
                            ),
                          )
                          setShowPaymentMethodPicker(null)
                        }}
                      >
                        <Text style={styles.pickerOptionText}>
                          {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Text>
                        {pm.type === type && (
                          <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.fieldSpacing} />

              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={pm.amount > 0 ? pm.amount.toString() : ''}
                onChangeText={(text) => {
                  const num = parseFloat(text) || 0
                  setPaymentMethods((prev) =>
                    prev.map((p) => (p.id === pm.id ? { ...p, amount: num } : p)),
                  )
                }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={GRAYSCALE_SECONDARY}
              />

              {pm.type === 'cheque' && (
                <>
                  <View style={styles.fieldSpacing} />
                  <TextInput
                    style={styles.input}
                    value={pm.chequeNumber || ''}
                    onChangeText={(text) =>
                      setPaymentMethods((prev) =>
                        prev.map((p) => (p.id === pm.id ? { ...p, chequeNumber: text } : p)),
                      )
                    }
                    placeholder="Cheque number *"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </>
              )}

              {pm.type === 'card' && (
                <>
                  <View style={styles.fieldSpacing} />
                  <TextInput
                    style={styles.input}
                    value={pm.cardLastFour || ''}
                    onChangeText={(text) =>
                      setPaymentMethods((prev) =>
                        prev.map((p) => ({
                          ...p,
                          cardLastFour: text.replace(/\D/g, '').slice(0, 4),
                        })),
                      )
                    }
                    placeholder="Card last 4 digits (optional)"
                    keyboardType="numeric"
                    maxLength={4}
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                </>
              )}
            </View>
          ))}

          {paymentMethods.length > 0 && (
            <View style={styles.paymentTotalRow}>
              <Text style={styles.paymentTotalLabel}>Payment Total:</Text>
              <Text style={styles.paymentTotalValue}>
                {paymentMethods.reduce((sum, pm) => sum + pm.amount, 0).toFixed(2)}
              </Text>
            </View>
          )}
          {paymentMethods.length > 0 && (
            <Text style={styles.hint}>
              Total Amount: {parseFloat(totalAmount) > 0 ? totalAmount : '0.00'}
            </Text>
          )}
        </View>

        {/* Total Amount */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>{totalAmount || '0.00'}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Transaction</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  input: {
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  removeButton: {
    padding: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_SECONDARY,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  pickerButton: {
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  pickerButtonTextPlaceholder: {
    color: GRAYSCALE_SECONDARY,
  },
  pickerDropdown: {
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  pickerList: {
    maxHeight: 200,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
  },
  submitButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginTop: 4,
  },
  paymentMethodExtra: {
    marginTop: 12,
  },
  fieldSpacing: {
    height: 12,
  },
  paymentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  paymentTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  paymentTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
})

