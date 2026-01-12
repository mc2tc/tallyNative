// Point of Sale screen

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Modal, Animated, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { getOneOffItems, type OneOffItem } from '../lib/utils/posStorage'
import { posSaleTransactionApi } from '../lib/api/transactions2'
import { useAuth } from '../lib/auth/AuthContext'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { productsApi, type SKU } from '../lib/api/products'

type PointOfSaleScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList, 'PointOfSale'>

const GRAYSCALE_PRIMARY = '#4a4a4a'

interface Product {
  id: string
  name: string
  price: number
  packSize?: string
  description?: string
  isInventoryItem?: boolean
  packagingQuantity?: number
  packagingUnit?: string
  productId?: string // Product ID for product SKU stock tracking
  skuId?: string // SKU ID for product SKU stock tracking (must be provided with productId)
  skuIndex?: number // SKU index as backup for identification
  currentStock?: number // Current stock level (for SKU products)
  /**
   * Optional VAT rate percentage for this product/SKU (e.g. 20 for 20%).
   * For SKUs this comes from SKU.vatRate; for other products this will typically be undefined.
   */
  vatRate?: number
}

interface CartItem {
  productId: string
  quantity: number
}

type PaymentType = 'cash' | 'card'

export default function PointOfSaleScreen() {
  useModuleGroupTracking('operations')
  const navigation = useNavigation<PointOfSaleScreenNavigationProp>()
  const insets = useSafeAreaInsets()
  const { businessUser, memberships } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const slideAnim = useRef(new Animated.Value(0)).current

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Load products (one-off items, Finished Goods inventory items, and product SKUs)
  const loadProducts = useCallback(async () => {
    console.log('[POS] loadProducts: Starting to load products')
    setLoading(true)
    try {
      // Load one-off items from local storage
      console.log('[POS] loadProducts: Loading one-off items')
      const oneOffItems = await getOneOffItems()
      console.log('[POS] loadProducts: Loaded one-off items:', oneOffItems.length)
      const convertedOneOffProducts: Product[] = oneOffItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        packSize: item.description ? undefined : undefined, // Optional packSize
        description: item.description,
        isInventoryItem: false,
      }))

      // Load Finished Goods inventory items
      let inventoryProducts: Product[] = []
      if (businessId) {
        try {
          console.log('[POS] loadProducts: Loading inventory items for businessId:', businessId)
          const inventoryResponse = await inventoryApi.getInventoryItems(businessId, {
            debitAccount: 'Finished Goods',
            page: 1,
            limit: 500,
            screen: 'inventory', // Only show non-grouped items
          })
          console.log('[POS] loadProducts: Loaded inventory items:', inventoryResponse.items.length)
          
          inventoryProducts = inventoryResponse.items
            .filter(item => item.packaging?.primaryPackaging?.quantity && item.packaging?.primaryPackaging?.unit)
            .map(item => ({
              id: item.id,
              name: item.posProductName || item.name, // Use POS product name if available, otherwise use inventory name
              price: item.posProductPrice || item.costPerPrimaryPackage || (item.packaging?.totalPrimaryPackages ? item.amount / item.packaging.totalPrimaryPackages : item.amount),
              isInventoryItem: true,
              packagingQuantity: item.packaging?.primaryPackaging?.quantity,
              packagingUnit: item.packaging?.primaryPackaging?.unit,
            }))
          console.log('[POS] loadProducts: Filtered inventory products:', inventoryProducts.length)
        } catch (error) {
          console.error('[POS] loadProducts: Failed to load inventory items:', error)
        }
      }

      // Load product SKUs
      let productSkuProducts: Product[] = []
      if (businessId) {
        try {
          console.log('[POS] loadProducts: Loading products with SKUs for businessId:', businessId)
          const productsResponse = await productsApi.getProducts(businessId, {
            page: 1,
            limit: 500,
          })
          console.log('[POS] loadProducts: Loaded products:', productsResponse.products.length)

          // For each product, get its SKUs
          for (const product of productsResponse.products) {
            try {
              console.log('[POS] loadProducts: Loading SKUs for product:', product.id, product.name)
              const skusResponse = await productsApi.getProductSkus(product.id, businessId)
              console.log('[POS] loadProducts: Loaded SKUs for product', product.id, ':', skusResponse.skus.length)

              // Convert each SKU to a Product item
              const skuProducts = skusResponse.skus.map((sku: SKU, index: number) => {
                // Backend accepts SKU id, name, or index as string (prefer id if available, then name, then index)
                const skuId = (sku as any).id || sku.name || index.toString()
                // Use currentStockOfPrimaryPackages for package-based stock, fallback to currentStock
                const stockCount = sku.currentStockOfPrimaryPackages !== undefined 
                  ? sku.currentStockOfPrimaryPackages 
                  : sku.currentStock
                console.log('[POS] loadProducts: Converting SKU to product:', {
                  productId: product.id,
                  productName: product.name,
                  skuId,
                  skuIdSource: (sku as any).id ? 'id' : (sku.name ? 'name' : 'index'),
                  skuName: sku.name,
                  skuIndex: index,
                  skuPrice: sku.price,
                  skuStock: stockCount,
                  currentStock: sku.currentStock,
                  currentStockOfPrimaryPackages: sku.currentStockOfPrimaryPackages,
                vatRate: (sku as any).vatRate,
                })

                return {
                  id: `${product.id}-${skuId}`, // Unique ID for this SKU
                  name: `${product.name} - ${sku.name}`, // Product name + SKU name
                  price: sku.price,
                  packSize: `${sku.size} ${sku.unit}`, // SKU size and unit
                  description: undefined,
                  isInventoryItem: false,
                  productId: product.id, // Include productId for backend
                  skuId: skuId, // Include skuId (id > name > index) for backend
                  skuIndex: index, // Store index as backup for SKU identification
                  currentStock: stockCount, // Use package count for out-of-stock indication
                  // Optional VAT rate percentage for this SKU (e.g. 20 for 20%).
                  // Kept optional for backward compatibility with existing SKUs.
                  vatRate: (sku as any).vatRate,
                } as Product & { skuIndex?: number }
              })

              productSkuProducts = [...productSkuProducts, ...skuProducts]
              console.log('[POS] loadProducts: Added', skuProducts.length, 'SKU products for product', product.id)
            } catch (error) {
              console.error('[POS] loadProducts: Failed to load SKUs for product', product.id, ':', error)
              // Continue with other products even if one fails
            }
          }

          console.log('[POS] loadProducts: Total product SKU products:', productSkuProducts.length)
        } catch (error) {
          console.error('[POS] loadProducts: Failed to load products with SKUs:', error)
        }
      }

      // Combine all types of products
      const allProducts = [...convertedOneOffProducts, ...inventoryProducts, ...productSkuProducts]
      console.log('[POS] loadProducts: Total products loaded:', {
        oneOff: convertedOneOffProducts.length,
        inventory: inventoryProducts.length,
        productSkus: productSkuProducts.length,
        total: allProducts.length,
      })
      setProducts(allProducts)
    } catch (error) {
      console.error('[POS] loadProducts: Failed to load products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [businessId])

  // Animate modal slide
  useEffect(() => {
    if (showPaymentModal) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [showPaymentModal, slideAnim])

  // Reload products when screen comes into focus (e.g., after adding a new item)
  useFocusEffect(
    useCallback(() => {
      loadProducts()
    }, [loadProducts])
  )

  const handleEditClick = () => {
    setIsEditMode(!isEditMode)
  }

  const handleProductPress = (product: Product) => {
    if (isEditMode) {
      // In edit mode, navigate to edit screen
      navigation.navigate('POSEditItem', { product })
      return
    }
    // In POS mode, add product to cart or increment quantity if already in cart
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id)
      if (existingItem) {
        // Increment quantity if already in cart
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // Add new item to cart
        return [...prevCart, { productId: product.id, quantity: 1 }]
      }
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prevCart => {
      const item = prevCart.find(i => i.productId === productId)
      if (item && item.quantity > 1) {
        // Decrement quantity
        return prevCart.map(i =>
          i.productId === productId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
      } else {
        // Remove item from cart
        return prevCart.filter(i => i.productId !== productId)
      }
    })
  }

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      return
    }
    setShowPaymentModal(true)
    setSelectedPaymentType(null)
  }

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false)
    setSelectedPaymentType(null)
  }

  const handleConfirmPayment = async () => {
    if (!selectedPaymentType || !businessId) {
      Alert.alert('Error', 'Please select a payment method.')
      return
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Cart is empty.')
      return
    }

    try {
      setIsProcessingPayment(true)

      console.log('[POS] handleConfirmPayment: Starting payment processing')
      console.log('[POS] handleConfirmPayment: Cart items:', cartItems.length)
      console.log('[POS] handleConfirmPayment: Business ID:', businessId)
      console.log('[POS] handleConfirmPayment: Payment type:', selectedPaymentType)

      // Prepare items for API
      const items = cartItems.map(item => {
        const product = products.find(p => p.id === item.productId)
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`)
        }

        console.log('[POS] handleConfirmPayment: Processing cart item:', {
          cartProductId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          isInventoryItem: product.isInventoryItem,
          productId: product.productId,
          skuId: product.skuId,
        })

        const itemPayload = {
          itemId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity, // Quantity is count of SKU packages being sold
          description: product.description,
          // Include inventoryItemId for inventory items so backend can track stock
          ...(product.isInventoryItem && { inventoryItemId: product.id }),
          // Include productId and skuId for product SKU stock tracking (both must be provided together)
          // Backend accepts skuId as id, name, or index (as string) - we use the best available identifier
          ...(product.productId && product.skuId && {
            productId: product.productId,
            skuId: product.skuId, // This is set as: id (if exists) > name > index (as string)
          }),
          // Optional VAT rate percentage for this line (e.g. 20 for 20%).
          // This is primarily for SKUs; left undefined for legacy/one-off items.
          ...(product.vatRate !== undefined && { vatRate: product.vatRate }),
        }

        console.log('[POS] handleConfirmPayment: Item payload:', JSON.stringify(itemPayload, null, 2))
        console.log('[POS] handleConfirmPayment: SKU identification:', {
          productId: product.productId,
          skuId: product.skuId,
          skuIndex: product.skuIndex,
          quantity: item.quantity,
          isInventoryItem: product.isInventoryItem,
        })
        return itemPayload
      })

      console.log('[POS] handleConfirmPayment: Prepared items for API:', items.length)
      console.log('[POS] handleConfirmPayment: All items payload:', JSON.stringify(items, null, 2))
      console.log('[POS] handleConfirmPayment: Payment totals:', { subtotal, vat, total })

      // Call POS sale transaction API
      const requestPayload = {
        businessId,
        items,
        payment: {
          type: selectedPaymentType,
          subtotal,
          vat,
          total,
        },
      }
      console.log('[POS] handleConfirmPayment: Full request payload:', JSON.stringify(requestPayload, null, 2))
      
      const response = await posSaleTransactionApi.createPOSSaleTransaction(requestPayload)
      console.log('[POS] handleConfirmPayment: API response:', JSON.stringify(response, null, 2))

      if (response.success) {
        // Reload products to reflect updated stock levels after sale
        await loadProducts()
        
        Alert.alert(
          'Success',
          `Payment processed successfully!\n\nTransaction ID: ${response.transactionId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                handleClosePaymentModal()
                setCartItems([])
              },
            },
          ]
        )
      } else {
        throw new Error(response.message || 'Failed to process payment')
      }
    } catch (error) {
      console.error('Failed to process payment:', error)
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to process payment. Please try again.'
      )
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const getCartTotal = () => {
    let subtotal = 0
    let vat = 0

    cartItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (product) {
        const lineSubtotal = product.price * item.quantity
        subtotal += lineSubtotal

        // If a VAT rate has been saved for this product/SKU, use it; otherwise treat as 0% VAT.
        const lineVatRate = product.vatRate !== undefined ? product.vatRate : 0
        if (lineVatRate > 0) {
          vat += lineSubtotal * (lineVatRate / 100)
        }
      }
    })

    const total = subtotal + vat
    return { subtotal, vat, total }
  }

  const { subtotal, vat, total } = getCartTotal()

  return (
    <View style={styles.wrapper}>
      <AppBarLayout 
        title={isEditMode ? "Edit Items" : "Point of Sale"}
        rightIconName={isEditMode ? "checkmark" : "create-outline"}
        onRightIconPress={handleEditClick}
      >
        <View style={styles.contentWrapper}>
          <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                <Text style={styles.emptyStateText}>Loading Skus...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No products available</Text>
                <Text style={styles.emptyStateSubtext}>
                  {isEditMode ? 'Tap on a product card to edit it' : 'Tap the + button to add items'}
                </Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productCard,
                      product.currentStock !== undefined && product.currentStock !== null && product.currentStock <= 0 && styles.productCardOutOfStock,
                    ]}
                    onPress={() => handleProductPress(product)}
                    activeOpacity={0.7}
                  >
                    {product.currentStock !== undefined && product.currentStock !== null && product.currentStock <= 0 && (
                      <View style={styles.outOfStockBadge}>
                        <Text style={styles.outOfStockText}>Out of Stock</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.productName,
                      product.currentStock !== undefined && product.currentStock !== null && product.currentStock <= 0 && styles.productNameOutOfStock,
                    ]} numberOfLines={2} ellipsizeMode="tail">
                      {product.name}
                    </Text>
                    {product.isInventoryItem && product.packagingQuantity && product.packagingUnit && (
                      <Text style={styles.productPackSize}>
                        {product.packagingQuantity} {product.packagingUnit}
                      </Text>
                    )}
                    {!product.isInventoryItem && product.packSize && (
                      <Text style={styles.productPackSize}>{product.packSize}</Text>
                    )}
                    {!product.isInventoryItem && product.description && !product.packSize && (
                      <Text style={styles.productPackSize} numberOfLines={2}>{product.description}</Text>
                    )}
                    {product.currentStock !== undefined && product.currentStock !== null && product.currentStock > 0 && (
                      <Text style={styles.stockInfo}>Stock: {product.currentStock}</Text>
                    )}
                    <Text style={[
                      styles.productPrice,
                      product.currentStock !== undefined && product.currentStock !== null && product.currentStock <= 0 && styles.productPriceOutOfStock,
                    ]}>£{product.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.checkoutCardContainer}>
            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutTitle}>Purchase</Text>
              <View style={styles.cartItems}>
                {cartItems.length === 0 ? (
                  <Text style={styles.emptyCartText}>Cart is empty</Text>
                ) : (
                  cartItems.map((item) => {
                    const product = products.find((p) => p.id === item.productId)
                    if (!product) return null
                    const itemTotal = product.price * item.quantity
                    return (
                      <View key={item.productId} style={styles.cartItemRow}>
                        <View style={styles.cartItemLeft}>
                          <TouchableOpacity
                            onPress={() => handleRemoveFromCart(item.productId)}
                            style={styles.removeButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons name="remove-circle-outline" size={18} color="#999999" />
                          </TouchableOpacity>
                          <Text style={styles.cartItemText}>
                            {item.quantity} {product.name}
                          </Text>
                        </View>
                        <Text style={styles.cartItemPrice}>£{itemTotal.toFixed(2)}</Text>
                      </View>
                    )
                  })
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelSmall}>Subtotal</Text>
                <Text style={styles.totalValue}>£{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelSmall}>VAT</Text>
                <Text style={styles.totalValue}>£{vat.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.finalTotalLabel}>Total</Text>
                <Text style={styles.finalTotalValue}>£{total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={handleCheckout}
                activeOpacity={0.7}
              >
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AppBarLayout>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="none"
        onRequestClose={handleClosePaymentModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClosePaymentModal}
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
                <Text style={styles.bottomSheetTitle}>Complete Payment</Text>
                <TouchableOpacity onPress={handleClosePaymentModal} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#333333" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.paymentContent}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Order Summary */}
                <View style={styles.orderSummary}>
                  <Text style={styles.sectionTitle}>Order Summary</Text>
                  {cartItems.map((item) => {
                    const product = products.find((p) => p.id === item.productId)
                    if (!product) return null
                    const itemTotal = product.price * item.quantity
                    return (
                      <View key={item.productId} style={styles.summaryRow}>
                        <Text style={styles.summaryText}>
                          {item.quantity}x {product.name}
                        </Text>
                        <Text style={styles.summaryPrice}>£{itemTotal.toFixed(2)}</Text>
                      </View>
                    )
                  })}
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>£{subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>VAT</Text>
                    <Text style={styles.summaryValue}>£{vat.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>£{total.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Payment Type Selection */}
                <View style={styles.paymentTypeSection}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentType === 'cash' && styles.paymentOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentType('cash')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="money"
                      size={24}
                      color={selectedPaymentType === 'cash' ? '#333333' : '#999999'}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        selectedPaymentType === 'cash' && styles.paymentOptionTextSelected,
                      ]}
                    >
                      Cash
                    </Text>
                    {selectedPaymentType === 'cash' && (
                      <MaterialIcons name="check" size={20} color="#333333" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      selectedPaymentType === 'card' && styles.paymentOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentType('card')}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="credit-card"
                      size={24}
                      color={selectedPaymentType === 'card' ? '#333333' : '#999999'}
                    />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        selectedPaymentType === 'card' && styles.paymentOptionTextSelected,
                      ]}
                    >
                      Card
                    </Text>
                    {selectedPaymentType === 'card' && (
                      <MaterialIcons name="check" size={20} color="#333333" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!selectedPaymentType || isProcessingPayment) && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirmPayment}
                  disabled={!selectedPaymentType || isProcessingPayment}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>
                    {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 200,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    position: 'relative',
  },
  productCardOutOfStock: {
    opacity: 0.6,
    borderColor: '#333333',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  productPackSize: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999999',
    marginBottom: 8,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
  },
  productPriceOutOfStock: {
    color: '#999999',
    textDecorationLine: 'line-through',
  },
  productNameOutOfStock: {
    opacity: 0.7,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4a4a4a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  outOfStockText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  stockInfo: {
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
    marginBottom: 4,
  },
  checkoutCardContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 280,
  },
  checkoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  cartItems: {
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  removeButton: {
    marginRight: 8,
  },
  cartItemText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#333333',
    flex: 1,
  },
  emptyCartText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabelSmall: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666666',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333333',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  checkoutButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
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
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  paymentContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  orderSummary: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  paymentTypeSection: {
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: '#333333',
    backgroundColor: '#f5f5f5',
  },
  paymentOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999999',
    marginLeft: 12,
    flex: 1,
  },
  paymentOptionTextSelected: {
    color: '#333333',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  confirmButton: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

