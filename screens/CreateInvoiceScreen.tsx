import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import * as FileSystem from 'expo-file-system/legacy'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { businessContextApi } from '../lib/api/businessContext'
import { transactions2Api } from '../lib/api/transactions2'
import { chartAccountsApi } from '../lib/api/chartAccounts'
import { productsApi, type Product, type SKU } from '../lib/api/products'
import { ApiError } from '../lib/api/client'
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
  quantityText?: string // Raw text input for quantity
  unitCostText?: string // Raw text input for unit cost
  selectedProductId?: string // Selected product ID
  selectedSkuId?: string // Selected SKU name (using name as ID like POS screen)
  /**
   * Optional VAT rate percentage for this line (e.g. 20 for 20%).
   * When a SKU is selected, this is populated from SKU.vatRate; otherwise we fall back to 20%.
   */
  vatRate?: number
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
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Product and SKU state
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [itemSkus, setItemSkus] = useState<Record<string, SKU[]>>({}) // Map of itemId -> SKUs
  const [loadingSkus, setLoadingSkus] = useState<Record<string, boolean>>({}) // Map of itemId -> loading state
  const [showProductPicker, setShowProductPicker] = useState<Record<string, boolean>>({}) // Map of itemId -> show picker
  const [showSkuPicker, setShowSkuPicker] = useState<Record<string, boolean>>({}) // Map of itemId -> show SKU picker

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

  // Fetch products
  useEffect(() => {
    if (!businessId) return

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true)
        const response = await productsApi.getProducts(businessId, {
          page: 1,
          limit: 500,
        })
        setProducts(response.products)
      } catch (error) {
        console.error('Failed to fetch products:', error)
        // Don't show alert - products are optional for invoices
      } finally {
        setLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [businessId])

  // Calculate item total when quantity, unitCost, or VAT flag changes
  const updateItemTotal = useCallback(
    (itemId: string, field: 'quantity' | 'unitCost' | 'hasVat', value: number | boolean) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updated = {
              ...item,
              [field]: value,
            }
            // Calculate total: quantity * unitCost, then add VAT if applicable
            const lineSubtotal = updated.quantity * updated.unitCost
            const vatRate = updated.vatRate ?? 20 // Default to 20% for backwards compatibility
            updated.total = updated.hasVat ? lineSubtotal * (1 + vatRate / 100) : lineSubtotal
            return updated
          }
          return item
        }),
      )
    },
    [],
  )

  // Update numeric field with raw text input (preserves decimal points)
  const updateNumericField = useCallback((itemId: string, field: 'quantity' | 'unitCost', text: string) => {
    // Allow empty string, numbers, and decimal points
    // Remove any non-numeric characters except decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '')
    
    // Prevent multiple decimal points
    const parts = cleanedText.split('.')
    const sanitizedText = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : cleanedText

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          // Store raw text for display
          const textField = field === 'quantity' ? 'quantityText' : 'unitCostText'
          const updated = {
            ...item,
            [textField]: sanitizedText,
          }

          // Parse numeric value for calculations (use 0 if empty or just a decimal point)
          const numValue =
            sanitizedText === '' || sanitizedText === '.'
              ? 0
              : parseFloat(sanitizedText) || 0
          updated[field] = numValue

          // Calculate total: quantity * unitCost, then add VAT if applicable
          const lineSubtotal = updated.quantity * updated.unitCost
          const vatRate = updated.vatRate ?? 20 // Default to 20% for backwards compatibility
          updated.total = updated.hasVat ? lineSubtotal * (1 + vatRate / 100) : lineSubtotal
          return updated
        }
        return item
      }),
    )
  }, [])

  // Calculate grand total from all items
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0)
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const vatTotal = items.reduce((sum, item) => {
    if (!item.hasVat) return sum
    const vatRate = item.vatRate ?? 20 // Default to 20% for backwards compatibility
    return sum + item.quantity * item.unitCost * (vatRate / 100)
  }, 0)

  // Fetch SKUs for a product and item
  const fetchSkusForItem = useCallback(async (itemId: string, productId: string) => {
    if (!businessId) return

    try {
      setLoadingSkus((prev) => ({ ...prev, [itemId]: true }))
      const response = await productsApi.getProductSkus(productId, businessId)
      setItemSkus((prev) => ({ ...prev, [itemId]: response.skus }))
    } catch (error) {
      console.error('Failed to fetch SKUs for product:', error)
      Alert.alert('Error', 'Failed to load SKUs. Please try again.')
    } finally {
      setLoadingSkus((prev) => ({ ...prev, [itemId]: false }))
    }
  }, [businessId])

  // Handle product selection for an item
  const handleProductSelect = useCallback((itemId: string, productId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            selectedProductId: productId,
            selectedSkuId: undefined, // Clear SKU selection when product changes
            description: '', // Clear description until SKU is selected
            unitCost: 0,
            unitCostText: '',
          }
        }
        return item
      })
    )
    setShowProductPicker((prev) => ({ ...prev, [itemId]: false }))
    // Fetch SKUs for the selected product
    fetchSkusForItem(itemId, productId)
    // Show SKU picker
    setShowSkuPicker((prev) => ({ ...prev, [itemId]: true }))
  }, [fetchSkusForItem])

  // Handle SKU selection for an item
  const handleSkuSelect = useCallback((itemId: string, productId: string, sku: SKU) => {
    if (!productId) {
      console.error('Product ID is missing when selecting SKU')
      return
    }

    const product = products.find((p) => p.id === productId)
    const productName = product?.name || ''
    const skuName = sku.name
    const description = `${productName} - ${skuName}`

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updated: InvoiceItem = {
            ...item,
            selectedSkuId: sku.name, // Use SKU name as ID (like POS screen)
            description,
            unitCost: sku.price,
            unitCostText: sku.price.toString(),
            // Optional VAT rate percentage from the selected SKU (e.g. 20 for 20%).
            // Kept optional for backward compatibility with existing SKUs.
            vatRate: (sku as any).vatRate,
          }
          // Recalculate total
          const lineSubtotal = updated.quantity * updated.unitCost
          const vatRate = updated.vatRate ?? 20
          updated.total = updated.hasVat ? lineSubtotal * (1 + vatRate / 100) : lineSubtotal
          return updated
        }
        return item
      }),
    )
    setShowSkuPicker((prev) => ({ ...prev, [itemId]: false }))
  }, [products])

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
    // Clean up item-specific state
    setItemSkus((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setLoadingSkus((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setShowProductPicker((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setShowSkuPicker((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }, [items.length])

  // Format date for display (DD/MM/YYYY)
  const formatDateForDisplay = useCallback((dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }, [])

  // Handle date picker change
  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
      if (event.type === 'set' && selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0] // YYYY-MM-DD format
        setInvoiceDate(dateString)
      }
    } else {
      // iOS
      if (selectedDate) {
        const dateString = selectedDate.toISOString().split('T')[0] // YYYY-MM-DD format
        setInvoiceDate(dateString)
      }
      if (event.type === 'dismissed') {
        setShowDatePicker(false)
      }
    }
  }, [])

  // Validate stock availability for items with SKUs
  const validateStockAvailability = useCallback((items: InvoiceItem[], itemSkus: Record<string, SKU[]>): { isValid: boolean; errorMessage?: string } => {
    for (const item of items) {
      // Only validate items with selectedProductId and selectedSkuId
      if (!item.selectedProductId || !item.selectedSkuId) {
        continue
      }

      const skus = itemSkus[item.id]
      if (!skus || skus.length === 0) {
        // Skip validation if SKUs not loaded (shouldn't happen, but be defensive)
        continue
      }

      const selectedSku = skus.find((sku) => sku.name === item.selectedSkuId)
      if (!selectedSku) {
        continue
      }

      // Use currentStockOfPrimaryPackages if available, otherwise fallback to currentStock
      const availableStock = selectedSku.currentStockOfPrimaryPackages ?? selectedSku.currentStock ?? 0

      if (item.quantity > availableStock) {
        return {
          isValid: false,
          errorMessage: `Insufficient stock for ${item.description}. Available: ${availableStock}, Requested: ${item.quantity}`,
        }
      }
    }

    return { isValid: true }
  }, [])

  // Transform InvoiceItem[] to API items format
  const transformItemsToApiFormat = useCallback(
    (items: InvoiceItem[]): Array<{
      name: string
      price: number
      quantity: number
      description?: string
      productId?: string
      skuId?: string
      vatRate?: number
    }> => {
      return items.map((item) => {
        const apiItem: {
          name: string
          price: number
          quantity: number
          description?: string
          productId?: string
          skuId?: string
          vatRate?: number
        } = {
          name: item.description,
          price: item.unitCost,
          quantity: item.quantity,
          description: item.description,
        }

        // Always include productId and skuId for COGS calculation (REQUIRED by backend)
        // These fields must be included for each item when creating manual invoices
        // Similar to POS sales - both productId and skuId must be provided together
        if (item.selectedProductId && item.selectedSkuId) {
          apiItem.productId = item.selectedProductId
          apiItem.skuId = item.selectedSkuId // Using SKU name (same as POS screen)
        }
        // Note: If productId/skuId are not selected, they are omitted from the request
        // (JSON serialization omits undefined properties)
        // Backend requires these fields for COGS tracking when available

        // Include VAT rate when present so backend can apply correct tax logic per line.
        if (item.vatRate !== undefined) {
          apiItem.vatRate = item.vatRate
        }

        return apiItem
      })
    },
    [],
  )

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
      // Validate stock availability for items with SKUs (optional but recommended)
      const stockValidation = validateStockAvailability(items, itemSkus)
      if (!stockValidation.isValid) {
        Alert.alert('Insufficient Stock', stockValidation.errorMessage || 'One or more items have insufficient stock.')
        setSubmitting(false)
        return
      }

      // Step 1: Create transaction in backend
      const transactionCurrency = currency || businessCurrency
      const description = items.map(item => item.description).join(', ') || 'Invoice items'
      
      // Transform items to API format (includes productId and skuId for SKU stock deduction)
      const apiItems = transformItemsToApiFormat(items)
      
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
        // Include items array for SKU stock deduction (backend will validate and deduct stock)
        items: apiItems.length > 0 ? apiItems : undefined,
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
      // Handle insufficient stock errors from backend
      if (error instanceof ApiError) {
        if (error.status === 400 && error.message.toLowerCase().includes('insufficient stock')) {
          Alert.alert('Insufficient Stock', error.message || 'One or more items have insufficient stock.')
        } else {
          Alert.alert('Error', error.message || 'Failed to create invoice. Please try again.')
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.'
        Alert.alert('Error', errorMessage)
      }
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
    itemSkus,
    grandTotal,
    subtotal,
    vatTotal,
    selectedIncomeAccount,
    businessId,
    navigation,
    validateStockAvailability,
    transformItemsToApiFormat,
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
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.datePickerButtonText,
                    !invoiceDate && styles.datePickerButtonTextPlaceholder,
                  ]}
                >
                  {invoiceDate ? formatDateForDisplay(invoiceDate) : 'Select date'}
                </Text>
                <MaterialIcons name="calendar-today" size={20} color={GRAYSCALE_SECONDARY} />
              </TouchableOpacity>
              {showDatePicker && (
                <>
                  {Platform.OS === 'ios' ? (
                    <Modal
                      transparent
                      animationType="slide"
                      visible={showDatePicker}
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View style={styles.datePickerModalContainer}>
                        <View style={styles.datePickerModalContent}>
                          <View style={styles.datePickerModalHeader}>
                            <TouchableOpacity
                              onPress={() => setShowDatePicker(false)}
                              style={styles.datePickerModalButton}
                            >
                              <Text style={styles.datePickerModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.datePickerModalTitle}>Select Date</Text>
                            <TouchableOpacity
                              onPress={() => setShowDatePicker(false)}
                              style={styles.datePickerModalButton}
                            >
                              <Text style={[styles.datePickerModalButtonText, styles.datePickerModalButtonTextDone]}>
                                Done
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={new Date(invoiceDate)}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            style={styles.datePickerIOS}
                          />
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={new Date(invoiceDate)}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
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

              {/* Product Selection */}
              <Text style={styles.label}>Product (Optional)</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowProductPicker((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !item.selectedProductId && styles.pickerButtonTextPlaceholder,
                  ]}
                >
                  {item.selectedProductId
                    ? products.find((p) => p.id === item.selectedProductId)?.name || 'Select product'
                    : 'Select product'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
              </TouchableOpacity>
              {showProductPicker[item.id] && (
                <View style={styles.pickerDropdown}>
                  {loadingProducts ? (
                    <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
                  ) : (
                    <ScrollView style={styles.pickerList} nestedScrollEnabled>
                      <TouchableOpacity
                        style={styles.pickerOption}
                        onPress={() => {
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    selectedProductId: undefined,
                                    selectedSkuId: undefined,
                                    description: '',
                                    unitCost: 0,
                                    unitCostText: '',
                                  }
                                : i
                            )
                          )
                          setShowProductPicker((prev) => ({ ...prev, [item.id]: false }))
                          setShowSkuPicker((prev) => ({ ...prev, [item.id]: false }))
                        }}
                      >
                        <Text style={styles.pickerOptionText}>None (Manual Entry)</Text>
                        {!item.selectedProductId && (
                          <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                        )}
                      </TouchableOpacity>
                      {products.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.pickerOption}
                          onPress={() => handleProductSelect(item.id, product.id)}
                        >
                          <Text style={styles.pickerOptionText}>{product.name}</Text>
                          {item.selectedProductId === product.id && (
                            <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* SKU Selection (only shown if product is selected) */}
              {item.selectedProductId && (
                <>
                  <Text style={styles.label}>SKU *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowSkuPicker((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !item.selectedSkuId && styles.pickerButtonTextPlaceholder,
                      ]}
                    >
                      {item.selectedSkuId
                        ? item.selectedSkuId
                        : 'Select SKU'}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                  {showSkuPicker[item.id] && (
                    <View style={styles.pickerDropdown}>
                      {loadingSkus[item.id] ? (
                        <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
                      ) : (
                        <ScrollView style={styles.pickerList} nestedScrollEnabled>
                          {itemSkus[item.id] && itemSkus[item.id].length > 0 ? (
                            itemSkus[item.id].map((sku) => (
                              <TouchableOpacity
                                key={sku.name}
                                style={styles.pickerOption}
                                onPress={() => handleSkuSelect(item.id, item.selectedProductId!, sku)}
                              >
                                <View style={styles.skuOptionContent}>
                                  <Text style={styles.pickerOptionText}>{sku.name}</Text>
                                  <Text style={styles.skuOptionDetails}>
                                    {sku.size} {sku.unit} - {getCurrencySymbol(currency || businessCurrency)}{sku.price.toFixed(2)}
                                  </Text>
                                </View>
                                {item.selectedSkuId === sku.name && (
                                  <MaterialIcons name="check" size={18} color={GRAYSCALE_PRIMARY} />
                                )}
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={styles.pickerOption}>
                              <Text style={styles.pickerOptionText}>No SKUs available</Text>
                            </View>
                          )}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* Only show Description field if no SKU is selected */}
              {!item.selectedSkuId && (
                <>
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
                </>
              )}

              <View style={styles.row}>
                <View style={styles.thirdWidth}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={item.quantityText !== undefined ? item.quantityText : (item.quantity > 0 ? item.quantity.toString() : '')}
                    onChangeText={(text) => updateNumericField(item.id, 'quantity', text)}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                </View>
                <View style={styles.thirdWidth}>
                  <Text style={styles.label}>Unit Cost *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      item.selectedSkuId && styles.inputDisabled,
                    ]}
                    value={item.unitCostText !== undefined ? item.unitCostText : (item.unitCost > 0 ? item.unitCost.toString() : '')}
                    onChangeText={(text) => updateNumericField(item.id, 'unitCost', text)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    editable={!item.selectedSkuId}
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
              <Text style={styles.summaryLabel}>
                VAT{' '}
                {items.some((i) => i.hasVat && i.vatRate !== undefined)
                  ? `(${Array.from(
                      new Set(
                        items
                          .filter((i) => i.hasVat && i.vatRate !== undefined)
                          .map((i) => i.vatRate),
                      ),
                    ).join(', ')}%)`
                  : '(20%)'}
                :
              </Text>
              <Text style={styles.summaryValue}>
                {getCurrencySymbol(currency || businessCurrency)}
                {vatTotal.toFixed(2)}
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
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: GRAYSCALE_SECONDARY,
    borderColor: '#e8e8e8',
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
  datePickerButton: {
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
  datePickerButtonText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
  },
  datePickerButtonTextPlaceholder: {
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
  skuOptionContent: {
    flex: 1,
  },
  skuOptionDetails: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginTop: 2,
  },
  fieldSpacing: {
    height: 12,
  },
  datePickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerModalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  datePickerModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  datePickerModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  datePickerModalButtonText: {
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
  },
  datePickerModalButtonTextDone: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  datePickerIOS: {
    width: '100%',
    height: 200,
  },
})

