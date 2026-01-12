// Create Product screen - allows users to design a product by adding Raw Materials
import React, { useState, useEffect, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { AppBarLayout } from '../components/AppBarLayout'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { productsApi, type UnitConversion } from '../lib/api/products'
import { ApiError } from '../lib/api/client'
import {
  UNIT_DEFINITIONS,
  type UnitDefinition,
  getUnitsByCategory,
  determineCategoryFromUnit,
  findUnitByAbbreviation,
  formatUnitDisplay,
} from '../lib/constants/units'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'

type CreateProductRouteProp = RouteProp<AppDrawerParamList, 'CreateProduct'>

type RawMaterialItem = {
  inventoryItemId: string
  name: string
  quantity: number
  unit?: string
}

export default function CreateProductScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<CreateProductRouteProp>()
  const { businessId } = route.params || {}
  const insets = useSafeAreaInsets()

  const [productName, setProductName] = useState('')
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([])
  const [availableRawMaterials, setAvailableRawMaterials] = useState<InventoryItem[]>([])
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null)
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})

  // Fetch available Raw Materials
  const fetchRawMaterials = useCallback(async () => {
    if (!businessId) return

    setLoadingRawMaterials(true)
    try {
      const response = await inventoryApi.getInventoryItems(businessId, {
        debitAccount: 'Raw Materials',
        page: 1,
        limit: 500,
        screen: 'viewAll',
      })
      
      // Add hardcoded Water ingredient
      const waterIngredient: InventoryItem = {
        id: 'water-hardcoded',
        name: 'Water',
        amount: 0,
        debitAccount: 'Raw Materials',
        transactionId: 'water-hardcoded-transaction',
        businessId: businessId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        packaging: {
          primaryPackaging: {
            description: 'Litre',
            quantity: 1,
            unit: 'L',
          },
          totalPrimaryPackages: 1,
          orderQuantity: 1,
          orderPackagingLevel: 'primary',
        },
      }
      
      setAvailableRawMaterials([...response.items, waterIngredient])
    } catch (error) {
      console.error('Failed to fetch raw materials:', error)
      Alert.alert('Error', 'Failed to load raw materials. Please try again.')
    } finally {
      setLoadingRawMaterials(false)
    }
  }, [businessId])

  // Fetch on mount and when screen comes into focus
  useEffect(() => {
    fetchRawMaterials()
  }, [fetchRawMaterials])

  useFocusEffect(
    useCallback(() => {
      fetchRawMaterials()
    }, [fetchRawMaterials])
  )

  const handleGoBack = () => {
    navigation.goBack()
  }

  const handleSelectRawMaterial = (material: InventoryItem) => {
    // Check if already added
    if (rawMaterials.some((rm) => rm.inventoryItemId === material.id)) {
      Alert.alert('Already Added', 'This raw material is already in the product.')
      setShowDropdown(false)
      return
    }

    // Add with quantity 0 initially - user must enter a valid quantity
    const newMaterial: RawMaterialItem = {
      inventoryItemId: material.id,
      name: material.name,
      quantity: 0,
      unit: material.packaging?.primaryPackaging?.unit,
    }
    setRawMaterials([...rawMaterials, newMaterial])
    // Initialize with empty string to show placeholder
    setQuantityInputs(prev => ({ ...prev, [material.id]: '' }))
    setShowDropdown(false)
  }

  const handleRemoveRawMaterial = (inventoryItemId: string) => {
    setRawMaterials(rawMaterials.filter((rm) => rm.inventoryItemId !== inventoryItemId))
    setQuantityInputs(prev => {
      const updated = { ...prev }
      delete updated[inventoryItemId]
      return updated
    })
  }

  const handleUpdateQuantity = (inventoryItemId: string, quantity: string) => {
    // Validate input format - only allow numbers and one decimal point
    // Allow empty string, single decimal point, or valid decimal number
    if (quantity !== '' && quantity !== '.') {
      const decimalPattern = /^\d*\.?\d*$/
      if (!decimalPattern.test(quantity)) {
        // Invalid format - don't update
        return
      }
    }

    // Store the raw input string for display (allows intermediate states like "1.")
    setQuantityInputs(prev => ({ ...prev, [inventoryItemId]: quantity }))

    // Parse and update numeric value only if valid
    if (quantity === '' || quantity === '.') {
      // When input is cleared, set quantity to 0 to indicate invalid state
      setRawMaterials(
        rawMaterials.map((rm) =>
          rm.inventoryItemId === inventoryItemId ? { ...rm, quantity: 0 } : rm,
        ),
      )
      return
    }

    const numQuantity = parseFloat(quantity)
    if (!isNaN(numQuantity) && numQuantity > 0) {
      // Valid positive number - update the numeric quantity
      setRawMaterials(
        rawMaterials.map((rm) =>
          rm.inventoryItemId === inventoryItemId ? { ...rm, quantity: numQuantity } : rm,
        ),
      )
    } else if (quantity !== '.') {
      // Invalid number (not just intermediate typing state) - set to 0
      setRawMaterials(
        rawMaterials.map((rm) =>
          rm.inventoryItemId === inventoryItemId ? { ...rm, quantity: 0 } : rm,
        ),
      )
    }
  }

  const handleUpdateUnit = (inventoryItemId: string, unit: string) => {
    setRawMaterials(
      rawMaterials.map((rm) =>
        rm.inventoryItemId === inventoryItemId ? { ...rm, unit } : rm,
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
    const material = rawMaterials.find(rm => rm.inventoryItemId === inventoryItemId)
    if (!material) return []
    
    // Try to determine category from current unit
    let category: 'weight' | 'volume' | 'count' | 'kitchen' | null = null
    if (material.unit) {
      category = determineCategoryFromUnit(material.unit)
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

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter a product name')
      return
    }

    if (rawMaterials.length === 0) {
      Alert.alert('Error', 'Please add at least one raw material')
      return
    }

    // Validate that all quantities are valid
    const invalidQuantities = rawMaterials.filter(rm => !rm.quantity || rm.quantity <= 0)
    if (invalidQuantities.length > 0) {
      Alert.alert('Error', 'Please enter a valid quantity (greater than 0) for all raw materials')
      return
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing')
      return
    }

    setSaving(true)
    try {
      const response = await productsApi.createProduct({
        businessId,
        name: productName.trim(),
        ingredients: rawMaterials.map((rm) => ({
          inventoryItemId: rm.inventoryItemId,
          quantity: rm.quantity,
          ...(rm.unit && { unit: rm.unit }),
        })),
        stock: 0,
      })

      if (response.success) {
        // Check for unit conversions
        if (response.unitConversions && response.unitConversions.length > 0) {
          // Build conversion message
          const conversionMessages = response.unitConversions.map((conv) => {
            const material = rawMaterials.find(rm => rm.inventoryItemId === conv.inventoryItemId)
            const materialName = material?.name || 'Ingredient'
            return `${materialName}: ${conv.originalQuantity} ${conv.originalUnit} → ${conv.convertedQuantity.toFixed(4)} ${conv.convertedUnit}`
          })

          const message = `Product created successfully`

          Alert.alert('Success', message, [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('ProductionManagement')
              },
            },
          ])
        } else {
          Alert.alert('Success', 'Product created successfully', [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('ProductionManagement')
              },
            },
          ])
        }
      } else {
        Alert.alert('Error', 'Failed to create product. Please try again.')
      }
    } catch (error) {
      console.error('Failed to create product:', error)
      let errorMessage = 'Failed to create product. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        // Include status code in error message for debugging
        if (error.status) {
          if (error.status === 400) {
            errorMessage = error.data?.error || errorMessage
          } else if (error.status === 404) {
            errorMessage = 'One or more raw materials not found. Please try again.'
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // Filter out already added materials from dropdown
  const availableForSelection = availableRawMaterials.filter(
    (material) => !rawMaterials.some((rm) => rm.inventoryItemId === material.id),
  )

  return (
    <AppBarLayout title="Create Product" onBackPress={handleGoBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Product Name Input */}
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Product Name</Text>
          <TextInput
            style={styles.textInput}
            value={productName}
            onChangeText={setProductName}
            placeholder="Enter product name"
            placeholderTextColor="#888888"
          />
        </View>

        {/* Raw Materials Section */}
        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.formLabel}>Recipe</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowDropdown(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {rawMaterials.length === 0 ? (
            <Text style={styles.emptyText}>No raw materials added</Text>
          ) : (
            <View style={styles.materialsList}>
              {rawMaterials.map((material) => (
                <View key={material.inventoryItemId} style={styles.materialItem}>
                  <View style={styles.materialHeader}>
                    <Text style={styles.materialName}>{material.name}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleRemoveRawMaterial(material.inventoryItemId)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.materialDetails}>
                    <View style={styles.materialDetailRow}>
                      <Text style={styles.materialLabel}>Quantity:</Text>
                      <TextInput
                        style={styles.materialInput}
                        value={quantityInputs[material.inventoryItemId] ?? ''}
                        onChangeText={(text) => handleUpdateQuantity(material.inventoryItemId, text)}
                        placeholder="Qty"
                        placeholderTextColor="#888888"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.materialDetailRow}>
                      <Text style={styles.materialLabel}>Unit:</Text>
                      <TouchableOpacity
                        style={styles.unitSelector}
                        onPress={() => handleOpenUnitSelector(material.inventoryItemId)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.unitSelectorText}>
                          {getUnitDisplayText(material.unit)}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={20} color={GRAYSCALE_PRIMARY} />
                      </TouchableOpacity>
                    </View>
                  </View>
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
            <Text style={styles.saveButtonText}>Create Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Raw Materials Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Raw Material</Text>
              <TouchableOpacity
                onPress={() => setShowDropdown(false)}
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
                    onPress={() => handleSelectRawMaterial(item)}
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

      {/* Unit Selection Modal */}
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
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
  materialsList: {
    gap: 12,
  },
  materialItem: {
    padding: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  materialDetails: {
    gap: 6,
  },
  materialDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  materialInput: {
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
})

