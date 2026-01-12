// Product Detail screen - displays all product information
import React, { useState, useEffect, useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, Modal, FlatList, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AntDesign } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { Product, ProductIngredient, UnitConversion } from '../lib/api/products'
import { productsApi } from '../lib/api/products'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { useAuth } from '../lib/auth/AuthContext'
import { ApiError } from '../lib/api/client'
import { UNIT_DEFINITIONS, getUnitsByCategory, formatUnitDisplay, determineCategoryFromUnit, findUnitByAbbreviation, type UnitDefinition } from '../lib/constants/units'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type ProductDetailRouteProp = RouteProp<AppDrawerParamList, 'ProductDetail'>

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
  onTabPress,
  product,
}: {
  activeTab: ProductDetailTab
  onTabPress: (tab: ProductDetailTab) => void
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
    } else {
      onTabPress(tab)
    }
  }

  return (
    <SafeAreaView style={styles.navSafeArea}>
      <View style={styles.navContainer}>
        {productDetailTabs.map((tab) => {
          const isActive = tab.name === activeTab
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navTab}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.7}
            >
              {tab.iconType === 'antdesign' ? (
                <AntDesign name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              ) : (
                <MaterialIcons name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              )}
              <Text style={[styles.navTabLabel, isActive && styles.navTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

export default function ProductDetailScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute<ProductDetailRouteProp>()
  const { product } = route.params || {}
  const { businessUser, memberships } = useAuth()
  const [ingredientNames, setIngredientNames] = useState<Record<string, string>>({})
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const [editableIngredients, setEditableIngredients] = useState<ProductIngredient[]>([])
  const [availableRawMaterials, setAvailableRawMaterials] = useState<InventoryItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<ProductDetailTab>('Design')
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchIngredientNames = useCallback(async () => {
    if (!product || !businessId || product.ingredients.length === 0) {
      return
    }

    setLoadingIngredients(true)
    try {
      // Fetch all inventory items to get names
      const response = await inventoryApi.getInventoryItems(businessId, {
        page: 1,
        limit: 500,
        screen: 'viewAll',
      })

      // Create a map of inventoryItemId to name
      const nameMap: Record<string, string> = {}
      product.ingredients.forEach((ingredient) => {
        const inventoryItem = response.items.find((item) => item.id === ingredient.inventoryItemId)
        if (inventoryItem) {
          nameMap[ingredient.inventoryItemId] = inventoryItem.name
        }
      })

      setIngredientNames(nameMap)
    } catch (error) {
      console.error('Failed to fetch ingredient names:', error)
    } finally {
      setLoadingIngredients(false)
    }
  }, [product, businessId])

  useEffect(() => {
    if (product) {
      setEditableIngredients([...product.ingredients])
    }
  }, [product])

  useEffect(() => {
    fetchIngredientNames()
  }, [fetchIngredientNames])

  const fetchAvailableRawMaterials = useCallback(async () => {
    if (!businessId) return

    setLoadingRawMaterials(true)
    try {
      const response = await inventoryApi.getInventoryItems(businessId, {
        debitAccount: 'Raw Materials',
        page: 1,
        limit: 500,
        screen: 'viewAll',
      })
      setAvailableRawMaterials(response.items)
    } catch (error) {
      console.error('Failed to fetch raw materials:', error)
      Alert.alert('Error', 'Failed to load raw materials. Please try again.')
    } finally {
      setLoadingRawMaterials(false)
    }
  }, [businessId])

  const handleAddIngredient = (material: InventoryItem) => {
    // Check if already added
    if (editableIngredients.some((ing) => ing.inventoryItemId === material.id)) {
      Alert.alert('Already Added', 'This raw material is already in the recipe.')
      setShowAddModal(false)
      return
    }

    // Add with default quantity of 1
    const newIngredient: ProductIngredient = {
      inventoryItemId: material.id,
      quantity: 1,
      unit: material.packaging?.primaryPackaging?.unit,
    }
    setEditableIngredients([...editableIngredients, newIngredient])
    setShowAddModal(false)
  }

  const handleRemoveIngredient = (inventoryItemId: string) => {
    setEditableIngredients(editableIngredients.filter((ing) => ing.inventoryItemId !== inventoryItemId))
  }

  const handleUpdateQuantity = (inventoryItemId: string, quantity: string) => {
    const numQuantity = parseFloat(quantity)
    if (isNaN(numQuantity) || numQuantity <= 0) {
      return
    }
    setEditableIngredients(
      editableIngredients.map((ing) =>
        ing.inventoryItemId === inventoryItemId ? { ...ing, quantity: numQuantity } : ing,
      ),
    )
  }

  const handleUpdateUnit = (inventoryItemId: string, unit: string) => {
    setEditableIngredients(
      editableIngredients.map((ing) =>
        ing.inventoryItemId === inventoryItemId ? { ...ing, unit } : ing,
      ),
    )
  }

  const handleOpenUnitSelector = (inventoryItemId: string) => {
    setSelectedIngredientId(inventoryItemId)
    setShowUnitModal(true)
  }

  const handleSelectUnit = (unit: UnitDefinition) => {
    if (!selectedIngredientId) return
    
    const primaryAbbrev = typeof unit.abbreviation === 'string' 
      ? unit.abbreviation 
      : unit.abbreviation[0]
    
    handleUpdateUnit(selectedIngredientId, primaryAbbrev)
    setShowUnitModal(false)
    setSelectedIngredientId(null)
  }

  const getAvailableUnits = (inventoryItemId: string): UnitDefinition[] => {
    const ingredient = editableIngredients.find(ing => ing.inventoryItemId === inventoryItemId)
    if (!ingredient) return []
    
    // Try to determine category from current unit
    let category: 'weight' | 'volume' | 'count' | 'kitchen' | null = null
    if (ingredient.unit) {
      category = determineCategoryFromUnit(ingredient.unit)
    }
    
    // If no category found, try to get from inventory item packaging
    if (!category) {
      const inventoryItem = availableRawMaterials.find(item => item.id === inventoryItemId)
      if (inventoryItem?.packaging?.primaryPackaging?.unit) {
        category = determineCategoryFromUnit(inventoryItem.packaging.primaryPackaging.unit)
      }
    }
    
    // Default to count if still no category
    if (!category) {
      category = 'count'
    }
    
    return getUnitsByCategory(category)
  }

  const getUnitDisplayText = (unitAbbreviation: string | undefined): string => {
    if (!unitAbbreviation) return 'Select unit'
    const unitDef = findUnitByAbbreviation(unitAbbreviation)
    if (unitDef) {
      return formatUnitDisplay(unitDef)
    }
    return unitAbbreviation
  }

  const availableForSelection = availableRawMaterials.filter(
    (material) => !editableIngredients.some((ing) => ing.inventoryItemId === material.id),
  )

  const handleSave = async () => {
    if (!product || !businessId) {
      Alert.alert('Error', 'Missing product or business ID')
      return
    }

    if (editableIngredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient')
      return
    }

    setSaving(true)
    try {
      const response = await productsApi.updateProduct(product.id, {
        businessId,
        ingredients: editableIngredients,
      })

      if (response.success) {
        // Check for unit conversions
        if (response.unitConversions && response.unitConversions.length > 0) {
          // Update editable ingredients with converted values
          const updatedIngredients = editableIngredients.map((ing) => {
            const conversion = response.unitConversions!.find(
              (conv) => conv.inventoryItemId === ing.inventoryItemId,
            )
            if (conversion) {
              return {
                ...ing,
                quantity: conversion.convertedQuantity,
                unit: conversion.convertedUnit,
              }
            }
            return ing
          })
          setEditableIngredients(updatedIngredients)

          // Build conversion message
          const conversionMessages = response.unitConversions.map((conv) => {
            const ingredientName =
              ingredientNames[conv.inventoryItemId] || 'Ingredient'
            return `${ingredientName}: ${conv.originalQuantity} ${conv.originalUnit} → ${conv.convertedQuantity.toFixed(4)} ${conv.convertedUnit}`
          })

          const message = `Product updated successfully.\n\nUnit conversions:\n${conversionMessages.join('\n')}\n\n${response.note || 'Units were converted to match inventory item packaging units.'}`

          Alert.alert('Success', message, [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('ProductionManagement')
              },
            },
          ])
        } else {
          Alert.alert('Success', 'Product updated successfully', [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('ProductionManagement')
              },
            },
          ])
        }
      } else {
        Alert.alert('Error', 'Failed to update product. Please try again.')
      }
    } catch (error) {
      console.error('Failed to update product:', error)
      let errorMessage = 'Failed to update product. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        if (error.status === 400) {
          errorMessage = error.data?.error || errorMessage
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
      <AppBarLayout title="Product Detail">
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title={product.name}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Ingredients */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Recipe</Text>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.countBadge}>{editableIngredients.length}</Text>
              <TouchableOpacity
                style={[styles.addButton, styles.addButtonDisabled]}
                disabled={true}
                activeOpacity={0.7}
              >
                <MaterialIcons name="add" size={20} color={GRAYSCALE_SECONDARY} />
                <Text style={[styles.addButtonText, styles.addButtonTextDisabled]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {editableIngredients.length === 0 ? (
            <Text style={styles.emptyText}>No ingredients added</Text>
          ) : (
            <View style={styles.ingredientsList}>
              {editableIngredients.map((ingredient, index) => {
                const ingredientName = ingredientNames[ingredient.inventoryItemId] || `Ingredient ${index + 1}`
                return (
                  <View key={ingredient.inventoryItemId} style={styles.ingredientItem}>
                    <View style={styles.ingredientHeader}>
                      <Text style={styles.ingredientName}>{ingredientName}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleRemoveIngredient(ingredient.inventoryItemId)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.ingredientDetails}>
                      <View style={styles.ingredientDetailRow}>
                        <Text style={styles.ingredientLabel}>ID:</Text>
                        <Text style={styles.ingredientValue}>{ingredient.inventoryItemId}</Text>
                      </View>
                      <View style={styles.ingredientDetailRow}>
                        <Text style={styles.ingredientLabel}>Quantity:</Text>
                        <TextInput
                          style={styles.ingredientInput}
                          value={ingredient.quantity.toString()}
                          onChangeText={(text) => handleUpdateQuantity(ingredient.inventoryItemId, text)}
                          placeholder="Qty"
                          placeholderTextColor="#888888"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.ingredientDetailRow}>
                        <Text style={styles.ingredientLabel}>Unit:</Text>
                        <TouchableOpacity
                          style={styles.unitSelector}
                          onPress={() => handleOpenUnitSelector(ingredient.inventoryItemId)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.unitSelectorText}>
                            {getUnitDisplayText(ingredient.unit)}
                          </Text>
                          <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_PRIMARY} />
                        </TouchableOpacity>
                      </View>
                    {ingredient.skus && Object.keys(ingredient.skus).length > 0 && (
                      <View style={styles.skusContainer}>
                        <Text style={styles.skusTitle}>SKUs:</Text>
                        {Object.entries(ingredient.skus).map(([skuId, sku]) => (
                          <View key={skuId} style={styles.skuItem}>
                            <Text style={styles.skuName}>{sku.name}</Text>
                            <View style={styles.skuDetails}>
                              <Text style={styles.skuDetail}>
                                Qty: {sku.quantity} {sku.unit}
                              </Text>
                              {sku.ancillaryItems && sku.ancillaryItems.length > 0 && (
                                <View style={styles.ancillaryContainer}>
                                  <Text style={styles.ancillaryTitle}>Ancillary Items:</Text>
                                  {sku.ancillaryItems.map((ancillary, ancIndex) => (
                                    <View key={ancIndex} style={styles.ancillaryItem}>
                                      <Text style={styles.ancillaryName}>{ancillary.name}</Text>
                                      <Text style={styles.ancillaryDetail}>
                                        {ancillary.quantity} {ancillary.unit}
                                        {ancillary.stock !== undefined && ` (Stock: ${ancillary.stock})`}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                )
              })}
            </View>
          )}
        </View>

        {/* Add Ingredient Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Raw Material</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingRawMaterials ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                  <Text style={styles.loadingText}>Loading raw materials...</Text>
                </View>
              ) : availableForSelection.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No raw materials available</Text>
                </View>
              ) : (
                <FlatList
                  data={availableForSelection}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleAddIngredient(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownItemText}>{item.name}</Text>
                      {item.packaging?.primaryPackaging?.unit && (
                        <Text style={styles.dropdownItemUnit}>
                          Unit: {item.packaging.primaryPackaging.unit}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.dropdownList}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
      <ProductDetailNavBar activeTab={activeTab} onTabPress={setActiveTab} product={product} />

      {/* Unit Selection Modal - Outside ScrollView for proper rendering */}
      <Modal
        visible={showUnitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUnitModal(false)
          setSelectedIngredientId(null)
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowUnitModal(false)
            setSelectedIngredientId(null)
          }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUnitModal(false)
                  setSelectedIngredientId(null)
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
              </TouchableOpacity>
            </View>
            {selectedIngredientId ? (
              <FlatList
                data={getAvailableUnits(selectedIngredientId)}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleSelectUnit(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{formatUnitDisplay(item)}</Text>
                  </TouchableOpacity>
                )}
                style={styles.dropdownList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No ingredient selected</Text>
              </View>
            )}
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  addButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  addButtonTextDisabled: {
    color: GRAYSCALE_SECONDARY,
  },
  countBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_SECONDARY,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    padding: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  ingredientDetails: {
    gap: 6,
  },
  ingredientDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  ingredientValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  ingredientInput: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
    textAlign: 'right',
  },
  skusContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  skusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  skuItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  skuName: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  skuDetails: {
    gap: 4,
  },
  skuDetail: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
  },
  ancillaryContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ancillaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAYSCALE_SECONDARY,
    marginBottom: 6,
  },
  ancillaryItem: {
    marginLeft: 8,
    marginBottom: 6,
  },
  ancillaryName: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  ancillaryDetail: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginTop: 2,
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
    marginBottom: 4,
  },
  dropdownItemUnit: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
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
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: 250,
    //flex: 1,
    //maxWidth: 400,
    justifyContent: 'space-between',
  },
  unitSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
})

