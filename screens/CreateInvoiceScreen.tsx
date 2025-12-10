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
  Linking,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as FileSystem from 'expo-file-system/legacy'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { businessContextApi } from '../lib/api/businessContext'
import { transactions2Api } from '../lib/api/transactions2'
import { chartAccountsApi } from '../lib/api/chartAccounts'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

// Get currency symbol helper
function getCurrencySymbol(currency: string): string {
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

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'


type InvoiceItem = {
  id: string
  description: string
  quantity: number
  unitCost: number
  total: number
  hasVat: boolean
}

type CreateInvoiceRouteProp = RouteProp<TransactionsStackParamList, 'CreateInvoice'>

export default function CreateInvoiceScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const route = useRoute<CreateInvoiceRouteProp>()
  const { businessUser, memberships } = useAuth()
  
  // Get customer name and project title from route params (if coming from lead)
  const routeCustomerName = route.params?.customerName
  const routeProjectTitle = route.params?.projectTitle

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
  const [customerName, setCustomerName] = useState(routeCustomerName || '')
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  })
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [currency, setCurrency] = useState('')
  const [businessCurrency, setBusinessCurrency] = useState<string>('GBP') // Default fallback
  const [reference, setReference] = useState(routeProjectTitle || '')
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitCost: 0,
      total: 0,
      hasVat: false,
    },
  ])

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [incomeAccounts, setIncomeAccounts] = useState<string[]>([])
  const [selectedIncomeAccount, setSelectedIncomeAccount] = useState<string>('')
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [showIncomeAccountPicker, setShowIncomeAccountPicker] = useState(false)

  // Check if customer name was passed from route (from lead detail)
  const isCustomerFromRoute = !!routeCustomerName

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

  // Fetch income accounts
  useEffect(() => {
    if (!businessId) return

    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true)
        const accounts = await chartAccountsApi.getIncomeAccounts(businessId)
        setIncomeAccounts(accounts)
        // Auto-select if there's only one income account
        if (accounts.length === 1) {
          setSelectedIncomeAccount(accounts[0])
        }
      } catch (error) {
        console.error('Failed to fetch income accounts:', error)
        Alert.alert('Error', 'Failed to load income accounts. Please try again.')
      } finally {
        setLoadingAccounts(false)
      }
    }

    fetchAccounts()
  }, [businessId])

  // Calculate item total when quantity, unitCost, or VAT changes
  const updateItemTotal = useCallback((itemId: string, field: 'quantity' | 'unitCost' | 'hasVat', value: number | boolean) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated = {
            ...item,
            [field]: value,
          }
          // Calculate total: quantity * unitCost, then add VAT if applicable
          const subtotal = updated.quantity * updated.unitCost
          updated.total = updated.hasVat ? subtotal * 1.2 : subtotal // Assuming 20% VAT
          return updated
        }
        return item
      }),
    )
  }, [])

  // Calculate grand total from all items
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0)
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  const vatTotal = items.reduce((sum, item) => sum + (item.hasVat ? item.quantity * item.unitCost * 0.2 : 0), 0)

  // Add new item
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitCost: 0,
        total: 0,
        hasVat: false,
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


  // Handle create invoice
  const handleCreateInvoice = useCallback(async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please select a customer.')
      return
    }

    if (items.some((item) => !item.description.trim())) {
      Alert.alert('Validation Error', 'Please fill in all item descriptions.')
      return
    }

    if (items.some((item) => item.quantity <= 0 || item.unitCost <= 0)) {
      Alert.alert('Validation Error', 'Please ensure all items have valid quantity and unit cost.')
      return
    }

    if (grandTotal <= 0) {
      Alert.alert('Validation Error', 'Invoice total must be greater than zero.')
      return
    }

    if (!selectedIncomeAccount) {
      Alert.alert('Validation Error', 'Please select a sales revenue account.')
      return
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing.')
      return
    }

    setSubmitting(true)

    try {
      // Step 1: Create transaction in backend
      const transactionCurrency = currency || businessCurrency
      const description = items.map(item => item.description).join(', ') || 'Invoice items'
      
      const transactionResponse = await transactions2Api.createSaleTransaction({
        businessId,
        customerName: customerName.trim(),
        transactionDate: invoiceDate,
        totalAmount: grandTotal, // Total amount including VAT
        currency: transactionCurrency,
        description,
        reference: invoiceNumber || reference || undefined,
        incomeAccount: selectedIncomeAccount,
        // ⚠️ CRITICAL: Include vatAmount if invoice includes VAT
        // Without this, the entire totalAmount will incorrectly go to Sales Revenue
        // With this, Sales Revenue gets net amount, VAT Output Tax gets VAT amount
        vatAmount: vatTotal > 0 ? vatTotal : undefined,
      })

      console.log('Transaction created:', transactionResponse.transactionId)
      console.log('Transaction response:', JSON.stringify(transactionResponse, null, 2))
      
      // For manual sale transactions, auto-verify them immediately since they're manually entered and trusted
      // This ensures they appear in reports
      try {
        // Fetch the full transaction to check its status
        const fullTransaction = await transactions2Api.getTransaction(
          transactionResponse.transactionId,
          businessId
        )
        console.log('Full transaction:', JSON.stringify(fullTransaction, null, 2))
        
        // Check if transaction needs verification
        const metadata = fullTransaction.metadata as { verification?: { status?: string } }
        const isUnverified = metadata.verification?.status === 'unverified'
        
        // Auto-verify manual sale transactions since they're manually entered and trusted
        if (isUnverified) {
          console.log('Auto-verifying manual sale transaction...')
          const verifiedTransaction = await transactions2Api.confirmVerification(
            transactionResponse.transactionId,
            businessId
          )
          console.log('Transaction verified successfully:', JSON.stringify(verifiedTransaction, null, 2))
        } else {
          console.log('Transaction already verified or doesn\'t need verification')
        }
      } catch (verifyError) {
        console.error('Error checking/verifying transaction:', verifyError)
        // Don't fail the whole operation if verification fails - the transaction was still created
      }

      // Generate PDF invoice
      let pdfUrl: string | null = null
      try {
        const pdfResponse = await transactions2Api.generateInvoicePDF(
          transactionResponse.transactionId,
          businessId
        )
        
        if (pdfResponse.success && pdfResponse.pdfUrl) {
          pdfUrl = pdfResponse.pdfUrl
          
          // Download and save PDF to device
          try {
            const fileName = pdfResponse.fileName || `Invoice_${transactionResponse.transactionId}.pdf`
            // Construct full file path using cacheDirectory
            const fileUri = `${FileSystem.cacheDirectory}${fileName}`
            // Download PDF to cache directory
            await FileSystem.downloadAsync(pdfResponse.pdfUrl, fileUri)
            
            // Show success message with option to view PDF
            // For viewing, use the backend URL directly (works on both platforms)
            Alert.alert(
              'Invoice Created',
              'Invoice PDF generated successfully!',
              [
                {
                  text: 'View PDF',
                  onPress: async () => {
                    const canOpen = await Linking.canOpenURL(pdfResponse.pdfUrl)
                    if (canOpen) {
                      await Linking.openURL(pdfResponse.pdfUrl)
                    } else {
                      Alert.alert('Info', 'Cannot open PDF. You can view it from the transaction detail screen.')
                    }
                  },
                },
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            )
          } catch (downloadError) {
            console.error('Failed to download PDF:', downloadError)
            // PDF was generated but download failed - still show success
            Alert.alert(
              'Invoice Created',
              'Invoice created successfully. PDF generation completed, but download failed. You can download it later from the transaction detail screen.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            )
          }
        } else {
          // PDF generation failed but transaction was created
          Alert.alert(
            'Invoice Created',
            'Transaction recorded successfully, but PDF generation failed. You can generate it later from the transaction detail screen.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          )
        }
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError)
        // Transaction was created successfully, but PDF generation failed
        Alert.alert(
          'Invoice Created',
          'Transaction recorded successfully, but PDF generation failed. You can generate it later from the transaction detail screen.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
      }
    } catch (error) {
      console.error('Failed to create invoice:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.'
      Alert.alert('Error', errorMessage)
    } finally {
      setSubmitting(false)
    }
  }, [
    customerName,
    invoiceDate,
    invoiceNumber,
    currency,
    businessCurrency,
    reference,
    items,
    grandTotal,
    subtotal,
    vatTotal,
    selectedIncomeAccount,
    businessId,
    navigation,
  ])

  return (
    <AppBarLayout title="Create Invoice" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Customer *</Text>
          {isCustomerFromRoute ? (
            <View style={styles.customerDisplayContainer}>
              <Text style={styles.customerDisplayText}>{customerName}</Text>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              value={customerName}
              onChangeText={setCustomerName}
            />
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Invoice Date</Text>
              <TextInput
                style={styles.input}
                value={invoiceDate}
                onChangeText={setInvoiceDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Invoice Number</Text>
              <TextInput
                style={styles.input}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="INV-001"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                value={currency || businessCurrency}
                onChangeText={setCurrency}
                placeholder={businessCurrency}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Reference</Text>
              <TextInput
                style={styles.input}
                value={reference}
                onChangeText={setReference}
                placeholder="Optional"
              />
            </View>
          </View>

          <View style={styles.fieldSpacing} />

          <Text style={styles.label}>Sales Revenue Account *</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowIncomeAccountPicker(!showIncomeAccountPicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !selectedIncomeAccount && styles.pickerButtonTextPlaceholder,
              ]}
            >
              {selectedIncomeAccount || 'Select sales revenue account'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
          </TouchableOpacity>
          {showIncomeAccountPicker && (
            <View style={styles.pickerDropdown}>
              {loadingAccounts ? (
                <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
              ) : (
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {incomeAccounts.map((account) => (
                    <TouchableOpacity
                      key={account}
                      style={styles.pickerOption}
                      onPress={() => {
                        setSelectedIncomeAccount(account)
                        setShowIncomeAccountPicker(false)
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{account}</Text>
                      {selectedIncomeAccount === account && (
                        <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <MaterialIcons name="add-circle" size={20} color={GRAYSCALE_PRIMARY} />
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
                    <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                value={item.description}
                onChangeText={(text) => {
                  setItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, description: text } : i))
                  )
                }}
                placeholder="Enter item description"
              />

              <View style={styles.row}>
                <View style={styles.thirdWidth}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.quantity.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemTotal(item.id, 'quantity', num)
                    }}
                    keyboardType="numeric"
                    placeholder="1"
                  />
                </View>
                <View style={styles.thirdWidth}>
                  <Text style={styles.label}>Unit Cost *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.unitCost > 0 ? item.unitCost.toString() : ''}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0
                      updateItemTotal(item.id, 'unitCost', num)
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                  />
                </View>
                <View style={styles.thirdWidth}>
                  <Text style={styles.label}>Total</Text>
                  <View style={styles.totalDisplay}>
                    <Text style={styles.totalText}>
                      {item.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.vatRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => updateItemTotal(item.id, 'hasVat', !item.hasVat)}
                >
                  <MaterialIcons
                    name={item.hasVat ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={item.hasVat ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY}
                  />
                  <Text style={styles.checkboxLabel}>Include VAT (20%)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {getCurrencySymbol(currency || businessCurrency)}{subtotal.toFixed(2)}
            </Text>
          </View>
          {vatTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT (20%):</Text>
              <Text style={styles.summaryValue}>
                {getCurrencySymbol(currency || businessCurrency)}{vatTotal.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>
              {getCurrencySymbol(currency || businessCurrency)}{grandTotal.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Create Invoice Button */}
        <TouchableOpacity
          style={[styles.createButton, submitting && styles.createButtonDisabled]}
          onPress={handleCreateInvoice}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="receipt" size={20} color="#ffffff" />
              <Text style={styles.createButtonText}>Create Invoice</Text>
            </>
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
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#efefef',
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
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  customerDisplayContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  customerDisplayText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  itemCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  removeButton: {
    padding: 4,
  },
  totalDisplay: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  vatRow: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  grandTotalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
  },
  createButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  pickerButtonText: {
    fontSize: 14,
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
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
  },
  fieldSpacing: {
    height: 12,
  },
})

