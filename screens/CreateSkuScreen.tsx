// Create SKU screen - allows users to create a new SKU for a product
import React, { useState, useCallback, useEffect } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { productsApi, type SKU, type SKUAncillaryItem, type AvailableInventoryItem } from '../lib/api/products'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { ApiError } from '../lib/api/client'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type CreateSkuRouteProp = RouteProp<AppDrawerParamList, 'CreateSku'>

type AncillaryItemWithName = {
  inventoryItemId: string
  name: string
  quantity: number
}

export default function CreateSkuScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute<CreateSkuRouteProp>()
  const { product } = route.params || {}
  const { businessUser, memberships } = useAuth()

  const [name, setName] = useState('')
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [chargeVat, setChargeVat] = useState(false)
  const [vatRate, setVatRate] = useState('20') // Percentage, default 20 for convenience
  const [ancillaryItems, setAncillaryItems] = useState<AncillaryItemWithName[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [showAncillaryModal, setShowAncillaryModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [availableInventoryItems, setAvailableInventoryItems] = useState<AvailableInventoryItem[]>([])
  const [loadingInventoryItems, setLoadingInventoryItems] = useState(false)
  const [saving, setSaving] = useState(false)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Get currentStockUnit from product - this would be the unit used for stock tracking
  const currentStockUnit = (product as any)?.currentStockUnit || 'unit'

  const handleGoBack = () => {
    navigation.goBack()
  }

  // Fetch available inventory items when modal opens
  const fetchAvailableInventoryItems = useCallback(async () => {
    if (!businessId) return

    setLoadingInventoryItems(true)
    try {
      // Fetch all inventory items that can be used as ancillary items
      const response = await inventoryApi.getInventoryItems(businessId, {
        page: 1,
        limit: 500,
        screen: 'viewAll',
      })
      
      // Convert to AvailableInventoryItem format
      const items: AvailableInventoryItem[] = response.items.map((item) => ({
        id: item.id,
        name: item.name,
      }))
      
      setAvailableInventoryItems(items)
    } catch (error) {
      console.error('Failed to fetch inventory items:', error)
      Alert.alert('Error', 'Failed to load inventory items. Please try again.')
    } finally {
      setLoadingInventoryItems(false)
    }
  }, [businessId])

  const handleAddAncillaryItem = () => {
    setShowAncillaryModal(true)
    fetchAvailableInventoryItems()
  }

  const handleSelectInventoryItem = (item: AvailableInventoryItem) => {
    // Check if already added
    if (ancillaryItems.some((ai) => ai.inventoryItemId === item.id)) {
      Alert.alert('Already Added', 'This item is already in the ancillary items list.')
      return
    }

    // Add with default quantity of 1
    setAncillaryItems([
      ...ancillaryItems,
      {
        inventoryItemId: item.id,
        name: item.name,
        quantity: 1,
      },
    ])
    setShowAncillaryModal(false)
  }

  const handleUpdateAncillaryQuantity = (inventoryItemId: string, quantity: string) => {
    const numQuantity = parseFloat(quantity)
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return
    }
    setAncillaryItems(
      ancillaryItems.map((item) =>
        item.inventoryItemId === inventoryItemId
          ? { ...item, quantity: numQuantity }
          : item,
      ),
    )
  }

  const handleRemoveAncillaryItem = (inventoryItemId: string) => {
    setAncillaryItems(ancillaryItems.filter((item) => item.inventoryItemId !== inventoryItemId))
  }

  const handleAddTag = () => {
    setShowTagModal(true)
  }

  const handleSaveTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
      setShowTagModal(false)
    } else if (tags.includes(trimmedTag)) {
      Alert.alert('Duplicate Tag', 'This tag already exists.')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!product || !businessId) {
      Alert.alert('Error', 'Missing product or business ID')
      return
    }

    // Validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a SKU name')
      return
    }

    const numSize = parseFloat(size)
    if (isNaN(numSize) || numSize <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid size greater than 0')
      return
    }

    const numPrice = parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price (must be >= 0)')
      return
    }

    let numVatRate: number | undefined
    if (chargeVat) {
      const parsedVat = parseFloat(vatRate)
      if (isNaN(parsedVat) || parsedVat < 0 || parsedVat > 100) {
        Alert.alert('Validation Error', 'Please enter a valid VAT percentage between 0 and 100')
        return
      }
      numVatRate = parsedVat
    }

    setSaving(true)
    try {
      // Fetch existing SKUs first to avoid overwriting them
      let existingSkus: SKU[] = []
      try {
        const existingSkusResponse = await productsApi.getProductSkus(product.id, businessId)
        existingSkus = existingSkusResponse.skus || []
      } catch (error) {
        // 404 means no SKUs exist yet, which is fine - we'll start with an empty array
        if (error instanceof ApiError && error.status !== 404) {
          throw error // Re-throw if it's not a 404
        }
        existingSkus = []
      }

      // Convert ancillary items to API format
      const ancillaryItemsApi: SKUAncillaryItem[] = ancillaryItems.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
      }))

      // For now, we'll set default values for cost and currentStock
      // These should ideally be calculated or provided by the user
      const newSku: SKU = {
        name: name.trim(),
        size: numSize,
        unit: currentStockUnit,
        price: numPrice,
        // Optional VAT rate percentage for this SKU (e.g. 20 for 20%).
        // Kept optional for backward compatibility with existing SKUs.
        ...(numVatRate !== undefined && { vatRate: numVatRate }),
        ancillaryItems: ancillaryItemsApi.length > 0 ? ancillaryItemsApi : undefined,
        tags: tags.length > 0 ? tags : undefined,
        currentStock: 0, // Default to 0, user can update later
        cost: {
          productCost: 0, // Default to 0, should be calculated
          ancillaryCost: 0, // Default to 0, should be calculated
          totalCost: 0, // Default to 0, should be calculated
        },
      }

      // Append the new SKU to existing SKUs (the API replaces all SKUs, so we need to include existing ones)
      const allSkus = [...existingSkus, newSku]

      const response = await productsApi.saveProductSkus(product.id, {
        businessId,
        skus: allSkus,
      })

      // Update available inventory items from response
      if (response.availableInventoryItems) {
        setAvailableInventoryItems(response.availableInventoryItems)
      }

      Alert.alert('Success', 'SKU saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Skus', { product })
          },
        },
      ])
    } catch (error) {
      console.error('Failed to save SKU:', error)
      let errorMessage = 'Failed to save SKU. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        if (error.status === 400) {
          const errorData = error.data as any
          if (errorData?.details && Array.isArray(errorData.details)) {
            const details = errorData.details.map((d: any) => d.error).join('\n')
            errorMessage = `Validation errors:\n${details}`
          } else {
            errorMessage = errorData?.error || errorMessage
          }
        } else if (error.status === 404) {
          errorMessage = 'Product not found. Please try again.'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  if (!product) {
    return (
      <AppBarLayout title="Create SKU" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title="Create SKU" onBackPress={handleGoBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Product Name Display */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Product</Text>
          <Text style={styles.productName}>{product.name}</Text>
        </View>

        {/* Name Input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter SKU name"
            placeholderTextColor={GRAYSCALE_SECONDARY}
          />
        </View>

        {/* Size Input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Size</Text>
          <View style={styles.sizeInputContainer}>
            <TextInput
              style={styles.sizeInput}
              value={size}
              onChangeText={setSize}
              placeholder="Enter size"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>{currentStockUnit}</Text>
          </View>
        </View>

        {/* Price Input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Price</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencyLabel}>£</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* VAT Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>VAT</Text>
            <TouchableOpacity
              style={styles.vatCheckboxContainer}
              onPress={() => setChargeVat(!chargeVat)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={chargeVat ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={chargeVat ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY}
              />
              <Text style={styles.vatCheckboxLabel}>Charge VAT on this SKU</Text>
            </TouchableOpacity>
          </View>
          {chargeVat && (
            <View style={styles.vatRateRow}>
              <Text style={styles.vatRateLabel}>VAT Rate (%)</Text>
              <View style={styles.vatRateInputContainer}>
                <TextInput
                  style={styles.vatRateInput}
                  value={vatRate}
                  onChangeText={setVatRate}
                  placeholder="20"
                  placeholderTextColor={GRAYSCALE_SECONDARY}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.vatRateSuffix}>%</Text>
              </View>
              <Text style={styles.vatHintText}>
                This percentage will be used for POS checkout and invoices where this SKU is used.
              </Text>
            </View>
          )}
        </View>

        {/* Ancillary Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Ancillary Items</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddAncillaryItem}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {ancillaryItems.length === 0 ? (
            <Text style={styles.emptyText}>No ancillary items added</Text>
          ) : (
            <View style={styles.itemsList}>
              {ancillaryItems.map((item) => (
                <View key={item.inventoryItemId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View style={styles.quantityInputContainer}>
                      <Text style={styles.quantityLabel}>Qty:</Text>
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => handleUpdateAncillaryQuantity(item.inventoryItemId, text)}
                        placeholder="1"
                        placeholderTextColor={GRAYSCALE_SECONDARY}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleRemoveAncillaryItem(item.inventoryItemId)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tags Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Tags</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddTag}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {tags.length === 0 ? (
            <Text style={styles.emptyText}>No tags added</Text>
          ) : (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveTag(tag)}
                    style={styles.tagRemoveButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={16} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save SKU</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Ancillary Items Selection Modal */}
      <Modal
        visible={showAncillaryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAncillaryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAncillaryModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Inventory Item</Text>
              <TouchableOpacity
                onPress={() => setShowAncillaryModal(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
              </TouchableOpacity>
            </View>
            {loadingInventoryItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                <Text style={styles.loadingText}>Loading inventory items...</Text>
              </View>
            ) : availableInventoryItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No inventory items available. Save a SKU first to see available items.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableInventoryItems.filter(
                  (item) => !ancillaryItems.some((ai) => ai.inventoryItemId === item.id),
                )}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleSelectInventoryItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={styles.dropdownList}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tag Input Modal */}
      <Modal
        visible={showTagModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowTagModal(false)
          setTagInput('')
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowTagModal(false)
            setTagInput('')
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Tag</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTagModal(false)
                  setTagInput('')
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Tag Name</Text>
              <TextInput
                style={styles.modalInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Enter tag name"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                autoFocus
              />
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveTag}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveButtonText}>Add Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 16,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  },
  input: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sizeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeInput: {
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
  unitLabel: {
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
    minWidth: 60,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyLabel: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  priceInput: {
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  vatCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vatCheckboxLabel: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
  },
  vatRateRow: {
    marginTop: 8,
  },
  vatRateLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  vatRateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vatRateInput: {
    flex: 0,
    width: 80,
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  vatRateSuffix: {
    fontSize: 16,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  vatHintText: {
    marginTop: 6,
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  quantityInput: {
    width: 60,
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'center',
  },
  deleteButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tagText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
  },
  tagRemoveButton: {
    padding: 2,
  },
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  dropdownList: {
    maxHeight: 400,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  modalInput: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  modalSaveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
