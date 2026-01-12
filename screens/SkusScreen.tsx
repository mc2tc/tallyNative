// Skus screen - displays all SKUs for a product
import React, { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AntDesign } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { productsApi, type SKU, type Product } from '../lib/api/products'
import { ApiError } from '../lib/api/client'
import { formatAmount } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type SkusRouteProp = RouteProp<AppDrawerParamList, 'Skus'>

type ProductDetailTab = 'Production' | 'Design' | 'Skus' | 'Manufacture'

type TabItem = {
  name: ProductDetailTab
  label: string
  icon: string
  iconType: 'material' | 'antdesign'
}

const productDetailTabs: TabItem[] = [
  { name: 'Production', label: 'Production', icon: 'product', iconType: 'antdesign' },
  { name: 'Design', label: 'Design', icon: 'design-services', iconType: 'material' },
  { name: 'Manufacture', label: 'Manufacture', icon: 'build', iconType: 'material' },
  { name: 'Skus', label: 'Skus', icon: 'category', iconType: 'material' },
]

function ProductDetailNavBar({
  activeTab,
  product,
}: {
  activeTab: ProductDetailTab
  product: Product
}) {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()

  const handleTabPress = (tab: ProductDetailTab) => {
    if (tab === 'Production') {
      navigation.navigate('ProductionManagement')
    } else if (tab === 'Manufacture') {
      navigation.navigate('Manufacture', { product })
    } else if (tab === 'Skus') {
      navigation.navigate('Skus', { product })
    } else if (tab === 'Design') {
      navigation.navigate('ProductDetail', { product })
    }
  }

  return (
    <SafeAreaView style={skusStyles.navSafeArea}>
      <View style={skusStyles.navContainer}>
        {productDetailTabs.map((tab) => {
          const isActive = tab.name === activeTab
          return (
            <TouchableOpacity
              key={tab.name}
              style={skusStyles.navTab}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.7}
            >
              {tab.iconType === 'antdesign' ? (
                <AntDesign name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              ) : (
                <MaterialIcons name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              )}
              <Text style={[skusStyles.navTabLabel, isActive && skusStyles.navTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

export default function SkusScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute<SkusRouteProp>()
  const { product } = route.params || {}
  const { businessUser, memberships } = useAuth()

  const [skus, setSkus] = useState<SKU[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddStockModal, setShowAddStockModal] = useState(false)
  const [selectedSku, setSelectedSku] = useState<{ sku: SKU; index: number } | null>(null)
  const [stockCount, setStockCount] = useState('') // Count of SKU packages
  const [addingStock, setAddingStock] = useState(false)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchSkus = useCallback(async () => {
    if (!product || !businessId) {
      setLoading(false)
      return
    }

    try {
      const response = await productsApi.getProductSkus(product.id, businessId)
      setSkus(response.skus || [])
    } catch (error) {
      console.error('Failed to fetch SKUs:', error)
      if (error instanceof ApiError && error.status !== 404) {
        // 404 means no SKUs exist, which is fine
        setSkus([])
      } else {
        setSkus([])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [product, businessId])

  // Fetch SKUs when screen comes into focus (e.g., after creating a new SKU)
  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchSkus()
    }, [fetchSkus])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchSkus()
  }, [fetchSkus])

  const handleAddClick = () => {
    if (product) {
      navigation.navigate('CreateSku', { product })
    }
  }

  const handleAddStockClick = (sku: SKU, index: number) => {
    setSelectedSku({ sku, index })
    setStockCount('')
    setShowAddStockModal(true)
  }

  const handleCloseAddStockModal = () => {
    setShowAddStockModal(false)
    setSelectedSku(null)
    setStockCount('')
  }

  const handleAddStock = async () => {
    if (!selectedSku || !product || !businessId) {
      return
    }

    const count = parseFloat(stockCount)
    if (isNaN(count) || count <= 0 || !Number.isInteger(count)) {
      Alert.alert('Validation Error', 'Please enter a valid whole number (count) greater than 0')
      return
    }

    // Calculate quantity: count × SKU size
    const skuSize = selectedSku.sku.size
    const skuUnit = selectedSku.sku.unit
    const quantity = count * skuSize

    if (!skuSize || !skuUnit) {
      Alert.alert('Error', 'SKU size or unit is not set')
      return
    }

    setAddingStock(true)
    try {
      // Backend will try to find SKU by id, then name, then index
      // Use SKU name first (more reliable), fallback to index
      const skuId = (selectedSku.sku as any).id || selectedSku.sku.name || selectedSku.index.toString()
      
      const response = await productsApi.addStockToSku(product.id, skuId, {
        businessId,
        quantity,
        unit: skuUnit,
      })

      Alert.alert(
        'Success',
        `Stock added successfully. ${response.packagesAdded} package(s) added.`,
        [
          {
            text: 'OK',
            onPress: () => {
              handleCloseAddStockModal()
              fetchSkus()
            },
          },
        ]
      )
    } catch (error) {
      console.error('Failed to add stock:', error)
      let errorMessage = 'Failed to add stock. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        if (error.status === 400) {
          const errorData = error.data as any
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } else if (error.status === 404) {
          errorMessage = 'Product or SKU not found. Please try again.'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setAddingStock(false)
    }
  }

  if (!product) {
    return (
      <AppBarLayout title="Skus">
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout 
      title={product.name} 
      rightIconName="add-circle-sharp"
      onRightIconPress={handleAddClick}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
        </View>
      ) : (
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* SKUs List */}
          {skus.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="category" size={48} color="#cccccc" />
              <Text style={styles.emptyTitle}>No SKUs</Text>
              <Text style={styles.emptyText}>
                Get started by creating your first SKU for this product.
              </Text>
            </View>
          ) : (
            <View style={styles.skusList}>
              {skus.map((sku, index) => (
                <View key={index} style={styles.skuCard}>
                  <View style={styles.skuHeader}>
                    <View style={styles.skuHeaderLeft}>
                      <Text style={styles.skuName}>{sku.name}</Text>
                      <Text style={styles.skuSize}>
                        {sku.size} {sku.unit}
                      </Text>
                    </View>
                    <Text style={styles.skuPrice}>
                      {formatAmount(sku.price, 'GBP', true)}
                    </Text>
                  </View>

                  {/* Stock Information */}
                  <View style={styles.skuDetailRow}>
                    <Text style={styles.skuDetailLabel}>Stock:</Text>
                    <Text style={styles.skuDetailValue}>
                      {sku.currentStockOfPrimaryPackages !== undefined
                        ? `${sku.currentStockOfPrimaryPackages}`
                        : `${sku.currentStock} ${sku.unit}`}
                    </Text>
                  </View>

                  {/* Cost Information */}
                  {sku.cost && (
                    <View style={styles.skuDetailRow}>
                      <Text style={styles.skuDetailLabel}>Cost/Unit:</Text>
                      <Text style={styles.skuDetailValue}>
                        {formatAmount(sku.cost.totalCost, 'GBP', true)}
                      </Text>
                    </View>
                  )}

                  {/* Ancillary Items */}
                  {sku.ancillaryItems && sku.ancillaryItems.length > 0 && (
                    <View style={styles.ancillaryContainer}>
                      <Text style={styles.ancillaryTitle}>Ancillary Items:</Text>
                      {sku.ancillaryItems.map((item, itemIndex) => (
                        <Text key={itemIndex} style={styles.ancillaryItem}>
                          • {item.quantity}x (ID: {item.inventoryItemId})
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Tags */}
                  {sku.tags && sku.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {sku.tags.map((tag, tagIndex) => (
                        <View key={tagIndex} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Stock Button */}
                  <TouchableOpacity
                    style={styles.addStockButton}
                    onPress={() => handleAddStockClick(sku, index)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="add" size={18} color={GRAYSCALE_PRIMARY} />
                    <Text style={styles.addStockButtonText}>Add Stock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Stock Modal */}
      <Modal
        visible={showAddStockModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAddStockModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseAddStockModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Stock</Text>
              <TouchableOpacity
                onPress={handleCloseAddStockModal}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
              </TouchableOpacity>
            </View>

            {selectedSku && (
              <>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>SKU</Text>
                  <Text style={styles.modalSkuName}>{selectedSku.sku.name}</Text>
                  <Text style={styles.modalSkuSize}>
                    Size: {selectedSku.sku.size} {selectedSku.sku.unit}
                  </Text>

                  <Text style={styles.modalLabel}>Count</Text>
                  <View style={styles.quantityInputContainer}>
                    <TextInput
                      style={styles.quantityInput}
                      value={stockCount}
                      onChangeText={setStockCount}
                      placeholder="Enter count of SKU packages"
                      placeholderTextColor={GRAYSCALE_SECONDARY}
                      keyboardType="number-pad"
                      autoFocus
                    />
                    <Text style={styles.quantityUnitLabel}>packages</Text>
                  </View>

                  {stockCount && (() => {
                    const count = parseFloat(stockCount)
                    if (!isNaN(count) && (count <= 0 || !Number.isInteger(count))) {
                      return (
                        <Text style={styles.validationError}>
                          Please enter a valid whole number greater than 0
                        </Text>
                      )
                    }
                    if (!isNaN(count) && count > 0) {
                      const totalQuantity = count * selectedSku.sku.size
                      return (
                        <View style={styles.calculationInfo}>
                          <Text style={styles.calculationLabel}>Total quantity:</Text>
                          <Text style={styles.calculationValue}>
                            {totalQuantity.toFixed(2)} {selectedSku.sku.unit}
                          </Text>
                        </View>
                      )
                    }
                    return null
                  })()}
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={handleCloseAddStockModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton,
                      (addingStock || !stockCount || parseFloat(stockCount) <= 0 || !Number.isInteger(parseFloat(stockCount))) && styles.modalSaveButtonDisabled,
                    ]}
                    onPress={handleAddStock}
                    activeOpacity={0.8}
                    disabled={addingStock || !stockCount || parseFloat(stockCount) <= 0 || !Number.isInteger(parseFloat(stockCount))}
                  >
                    {addingStock ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalSaveButtonText}>Add Stock</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          </View>
        </Modal>
      <ProductDetailNavBar activeTab="Skus" product={product} />
    </AppBarLayout>
  )
}

const skusStyles = StyleSheet.create({
  navSafeArea: {
    backgroundColor: '#f5f5f5',
  },
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navTabLabel: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
  },
  navTabLabelActive: {
    color: '#333333',
    fontWeight: '600',
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stockLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  skusList: {
    gap: 12,
  },
  skuCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  skuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  skuHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  skuName: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  skuSize: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  skuPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  skuDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skuDetailLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  skuDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  ancillaryContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ancillaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  ancillaryItem: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginLeft: 8,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f6f6f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagText: {
    fontSize: 12,
    color: GRAYSCALE_PRIMARY,
  },
  addStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addStockButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
    marginTop: 16,
  },
  modalSkuName: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  modalSkuSize: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 16,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityUnitLabel: {
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
    minWidth: 60,
  },
  validationError: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginTop: 8,
  },
  calculationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calculationLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: GRAYSCALE_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
