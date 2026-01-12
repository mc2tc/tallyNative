// Manufacture screen - displays ingredient stock levels for product manufacturing
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ScrollView, StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, Modal, Animated, PanResponder, Dimensions, TextInput, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { Product } from '../lib/api/products'
import { MaterialIcons } from '@expo/vector-icons'
import { AntDesign } from '@expo/vector-icons'
import { productsApi } from '../lib/api/products'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { useAuth } from '../lib/auth/AuthContext'
import { findUnitByAbbreviation, type UnitDefinition } from '../lib/constants/units'
import { ApiError } from '../lib/api/client'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type ManufactureRouteProp = RouteProp<AppDrawerParamList, 'Manufacture'>

type IngredientStockInfo = {
  inventoryItemId: string
  name: string
  currentStock: number | undefined
  unit?: string
  quantity: number
  productionCapacity: number | undefined // currentStock / quantity
  ingredientUnit?: string // unit from product.ingredient
}

type CalculationStep = {
  ingredientName: string
  stock: number
  stockUnit: string
  quantity: number
  quantityUnit: string
  capacity: number
  isLimiting: boolean
}

type CalculationDetails = {
  steps: CalculationStep[]
  limitingCapacity: number | undefined
  totalIngredientQuantities: number
  maxProductionCapacity: number | undefined
  commonUnit?: string
  ingredientQuantities: Array<{ quantity: number; unit: string; convertedQuantity: number }>
}

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
    <SafeAreaView style={manufactureStyles.navSafeArea}>
      <View style={manufactureStyles.navContainer}>
        {productDetailTabs.map((tab) => {
          const isActive = tab.name === activeTab
          return (
            <TouchableOpacity
              key={tab.name}
              style={manufactureStyles.navTab}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.7}
            >
              {tab.iconType === 'antdesign' ? (
                <AntDesign name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              ) : (
                <MaterialIcons name={tab.icon as any} size={24} color={isActive ? '#333333' : '#999999'} />
              )}
              <Text style={[manufactureStyles.navTabLabel, isActive && manufactureStyles.navTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

export default function ManufactureScreen() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute<ManufactureRouteProp>()
  const { product } = route.params || {}
  const { businessUser, memberships } = useAuth()
  const [ingredientStockInfo, setIngredientStockInfo] = useState<IngredientStockInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product || null)
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false)
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetails | null>(null)
  const [productionQuantity, setProductionQuantity] = useState<string>('')
  const [wastePercentage, setWastePercentage] = useState<string>('5')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const screenHeight = Dimensions.get('window').height
  const DISMISS_OFFSET = screenHeight // pushed completely off-screen
  const HALF_SHEET_OFFSET = screenHeight * 0.5 // visible half-screen position
  const FULL_SHEET_OFFSET = 40 // almost full-screen, avoids OS edge gestures at the very top
  const slideAnim = useRef(new Animated.Value(DISMISS_OFFSET)).current // Start off-screen below
  const panY = useRef(0)
  const dragStartValue = useRef(HALF_SHEET_OFFSET)

  // Helper function to convert value from one unit to another
  const convertUnit = (value: number, fromUnit: string, toUnit: string): number | null => {
    const fromUnitDef = findUnitByAbbreviation(fromUnit)
    const toUnitDef = findUnitByAbbreviation(toUnit)
    
    if (!fromUnitDef || !toUnitDef) {
      return null
    }
    
    // Units must be in the same category to convert
    if (fromUnitDef.category !== toUnitDef.category) {
      return null
    }
    
    // Convert to base unit, then to target unit
    const valueInBaseUnits = value * fromUnitDef.baseValue
    const valueInTargetUnit = valueInBaseUnits / toUnitDef.baseValue
    
    return valueInTargetUnit
  }

  // Helper function to convert water volume to weight
  // 1 L water = 1 kg = 1000 g
  const convertWaterVolumeToWeight = (value: number, fromVolumeUnit: string, toWeightUnit: string): number | null => {
    const fromUnitDef = findUnitByAbbreviation(fromVolumeUnit)
    const toUnitDef = findUnitByAbbreviation(toWeightUnit)
    
    if (!fromUnitDef || !toUnitDef) {
      return null
    }
    
    // Must be volume to weight conversion
    if (fromUnitDef.category !== 'volume' || toUnitDef.category !== 'weight') {
      return null
    }
    
    // Convert volume to ml (base volume unit)
    const valueInMl = value * fromUnitDef.baseValue
    
    // Convert ml to grams (1 ml water = 1 g water)
    const valueInGrams = valueInMl
    
    // Convert grams to target weight unit
    const valueInTargetUnit = valueInGrams / toUnitDef.baseValue
    
    return valueInTargetUnit
  }

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Use a ref to store the latest product to avoid dependency issues
  const productRef = useRef<Product | null>(null)
  useEffect(() => {
    productRef.current = currentProduct || product
  }, [currentProduct, product])

  const fetchIngredientStock = useCallback(async () => {
    // Use ref to get latest product without causing dependency issues
    const productToUse = productRef.current
    if (!productToUse || !businessId || !productToUse.ingredients || productToUse.ingredients.length === 0) {
      return
    }

    setLoading(true)
    try {
      // Fetch all Raw Materials inventory items
      const response = await inventoryApi.getInventoryItems(businessId, {
        debitAccount: 'Raw Materials',
        page: 1,
        limit: 500,
        screen: 'viewAll',
      })

      // Map ingredients to stock info and calculate production capacity
      const stockInfo: IngredientStockInfo[] = []
      const calculationSteps: CalculationStep[] = []
      
      productToUse.ingredients.forEach((ingredient) => {
        const inventoryItem = response.items.find((item) => item.id === ingredient.inventoryItemId)
        
        // Use metric stock if available, otherwise fall back to primary units
        const currentStock = inventoryItem?.currentStockInMetric?.stock ?? inventoryItem?.currentStockInPrimaryUnits
        const stockUnit = inventoryItem?.currentStockInMetric?.unit ?? inventoryItem?.packaging?.primaryPackaging?.unit
        const ingredientUnit = ingredient.unit
        const quantity = ingredient.quantity || 0
        
        let productionCapacity: number | undefined = undefined
        let convertedStock: number | undefined = currentStock
        let convertedQuantity = quantity
        
        // Calculate production capacity: currentStock / quantity
        // Ensure units match - convert if necessary
        if (currentStock !== undefined && quantity > 0 && stockUnit && ingredientUnit) {
          if (stockUnit === ingredientUnit) {
            // Units already match
            productionCapacity = currentStock / quantity
            convertedStock = currentStock
            convertedQuantity = quantity
          } else {
            // Try to convert units
            const converted = convertUnit(quantity, ingredientUnit, stockUnit)
            if (converted !== null) {
              convertedQuantity = converted
              productionCapacity = currentStock / convertedQuantity
              convertedStock = currentStock
            } else {
              // Units can't be converted (different categories)
              productionCapacity = undefined
              convertedStock = undefined
            }
          }
        }
        
        const name = inventoryItem?.name || `Ingredient ${ingredient.inventoryItemId}`
        
        stockInfo.push({
          inventoryItemId: ingredient.inventoryItemId,
          name,
          currentStock,
          unit: stockUnit,
          quantity,
          productionCapacity,
          ingredientUnit,
        })
        
        if (currentStock !== undefined && productionCapacity !== undefined && convertedStock !== undefined) {
          calculationSteps.push({
            ingredientName: name,
            stock: convertedStock,
            stockUnit: stockUnit || '',
            quantity: convertedQuantity,
            quantityUnit: stockUnit || ingredientUnit || '',
            capacity: productionCapacity,
            isLimiting: false, // Will be set after finding the minimum
          })
        }
      })
      
      // Find the limiting ingredient (lowest capacity)
      const validCapacities = calculationSteps
        .map((step) => step.capacity)
        .filter((cap) => cap !== undefined)
      
      const minCapacity = validCapacities.length > 0 
        ? Math.min(...validCapacities)
        : undefined
      
      // Mark limiting ingredient
      calculationSteps.forEach((step) => {
        step.isLimiting = step.capacity === minCapacity
      })
      
      // Calculate total of all ingredient quantities (for step ii)
      // Convert all quantities to a common unit before summing
      let totalIngredientQuantities = 0
      let commonUnit: string | undefined = undefined
      const ingredientQuantities: Array<{ quantity: number; unit: string; convertedQuantity: number }> = []
      
      if (productToUse.ingredients.length > 0) {
        // First, determine what categories we have
        const categories = new Set<string>()
        productToUse.ingredients.forEach((ing) => {
          if (ing.unit) {
            const unitDef = findUnitByAbbreviation(ing.unit)
            if (unitDef) {
              categories.add(unitDef.category)
            }
          }
        })
        
        const hasWeight = categories.has('weight')
        const hasVolume = categories.has('volume')
        const hasMixedWeightVolume = hasWeight && hasVolume
        
        // Determine common unit
        if (hasMixedWeightVolume) {
          // When mixing weight and volume, use weight as common unit (g)
          // Convert volume to weight using water conversion (1 L = 1 kg = 1000 g)
          commonUnit = 'g'
        } else if (hasWeight) {
          commonUnit = 'g' // grams as base
        } else if (hasVolume) {
          commonUnit = 'ml' // milliliters as base
        } else {
          // Use first ingredient's unit or category base
          const firstIngredient = productToUse.ingredients[0]
          const firstUnit = firstIngredient.unit
          if (firstUnit) {
            const firstUnitDef = findUnitByAbbreviation(firstUnit)
            if (firstUnitDef) {
              if (firstUnitDef.category === 'weight') {
                commonUnit = 'g'
              } else if (firstUnitDef.category === 'volume') {
                commonUnit = 'ml'
              } else {
                commonUnit = firstUnit // use as-is for count/kitchen
              }
            } else {
              commonUnit = firstUnit
            }
          }
        }
        
        // Convert all ingredient quantities to common unit and sum
        productToUse.ingredients.forEach((ing) => {
          const quantity = ing.quantity || 0
          const unit = ing.unit || ''
          
          let convertedQuantity = quantity
          
          if (unit && commonUnit && unit !== commonUnit) {
            const unitDef = findUnitByAbbreviation(unit)
            const commonUnitDef = findUnitByAbbreviation(commonUnit)
            
            if (unitDef && commonUnitDef) {
              // Check if we need water volume-to-weight conversion
              if (hasMixedWeightVolume && unitDef.category === 'volume' && commonUnitDef.category === 'weight') {
                // Convert volume to weight for water (1 L = 1 kg = 1000 g)
                const converted = convertWaterVolumeToWeight(quantity, unit, commonUnit)
                if (converted !== null) {
                  convertedQuantity = converted
                }
              } else if (hasMixedWeightVolume && unitDef.category === 'weight' && commonUnitDef.category === 'weight') {
                // Convert weight to weight (normal conversion)
                const converted = convertUnit(quantity, unit, commonUnit)
                if (converted !== null) {
                  convertedQuantity = converted
                }
              } else if (unitDef.category === commonUnitDef.category) {
                // Same category, normal conversion
                const converted = convertUnit(quantity, unit, commonUnit)
                if (converted !== null) {
                  convertedQuantity = converted
                }
              }
              // If categories don't match and it's not the water case, keep original quantity
            }
          }
          
          ingredientQuantities.push({
            quantity,
            unit,
            convertedQuantity,
          })
          
          totalIngredientQuantities += convertedQuantity
        })
      }
      
      // Max production capacity = minCapacity × totalIngredientQuantities (in common unit)
      const maxProductionCapacity = minCapacity !== undefined && totalIngredientQuantities > 0
        ? minCapacity * totalIngredientQuantities
        : undefined
      
      setIngredientStockInfo(stockInfo)
      setCalculationDetails({
        steps: calculationSteps,
        limitingCapacity: minCapacity,
        totalIngredientQuantities,
        maxProductionCapacity,
        commonUnit,
        ingredientQuantities,
      })
    } catch (error) {
      console.error('Failed to fetch ingredient stock:', error)
      Alert.alert('Error', 'Failed to load ingredient stock information. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  // Fetch latest product data to ensure we have currentStock and currentStockUnit
  const fetchProduct = useCallback(async () => {
    if (!product?.id || !businessId) {
      return
    }

    try {
      const response = await productsApi.getProducts(businessId, {
        page: 1,
        limit: 1000, // Get all products to find the one we need
      })
      const updatedProduct = response.products.find((p) => p.id === product.id)
      if (updatedProduct) {
        setCurrentProduct(updatedProduct)
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      // Don't show error - just use the product from route params
    }
  }, [product?.id, businessId])

  // Fetch product data on mount
  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  // Fetch ingredient stock when product data is available
  // Only depend on product ID and businessId to avoid infinite loops
  useEffect(() => {
    const productToUse = currentProduct || product
    if (productToUse?.id && businessId && productToUse.ingredients?.length > 0) {
      // Call fetchIngredientStock directly without including it in dependencies
      // to avoid infinite loops when the callback is recreated
      fetchIngredientStock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProduct?.id, product?.id, businessId])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([fetchProduct(), fetchIngredientStock()]).finally(() => {
      setRefreshing(false)
    })
  }, [fetchProduct, fetchIngredientStock])

  useEffect(() => {
    if (showLearnMoreModal) {
      // Animate from off-screen to half-screen position
      slideAnim.setValue(DISMISS_OFFSET)
      Animated.spring(slideAnim, {
        toValue: HALF_SHEET_OFFSET,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      // Reset to off-screen when hidden
      slideAnim.setValue(DISMISS_OFFSET)
    }
  }, [showLearnMoreModal, slideAnim, DISMISS_OFFSET, HALF_SHEET_OFFSET])

  const handleOpenLearnMore = () => {
    setShowLearnMoreModal(true)
  }

  const handleCloseLearnMore = () => {
    Animated.timing(slideAnim, {
      toValue: DISMISS_OFFSET,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLearnMoreModal(false)
      slideAnim.setValue(DISMISS_OFFSET)
    })
  }

  const handleSave = async () => {
    const productToUse = currentProduct || product
    if (!productToUse || !businessId) {
      Alert.alert('Error', 'Missing product or business ID')
      return
    }

    // Validate production quantity
    const quantity = parseFloat(productionQuantity)
    if (!productionQuantity || isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid production quantity greater than 0')
      return
    }

    // Validate waste percentage
    const waste = parseFloat(wastePercentage)
    if (isNaN(waste) || waste < 0 || waste > 100) {
      Alert.alert('Error', 'Please enter a valid waste percentage between 0 and 100')
      return
    }

    // Validate unit
    const unit = calculationDetails?.commonUnit
    if (!unit) {
      Alert.alert('Error', 'Unable to determine unit. Please ensure all ingredients have units.')
      return
    }

    // Validate quantity is less than effective max
    const maxCapacity = calculationDetails?.maxProductionCapacity
    if (maxCapacity !== undefined) {
      const effectiveMax = maxCapacity * (1 - waste / 100)
      if (quantity >= effectiveMax) {
        Alert.alert('Error', `Production quantity must be less than ${effectiveMax.toFixed(2)} ${unit} (accounting for ${waste.toFixed(1)}% waste)`)
        return
      }
    }

    // DEBUG LOGS - Before manufacturing
    console.log('=== MANUFACTURE DEBUG LOGS ===')
    console.log('Product:', {
      id: productToUse.id,
      name: productToUse.name,
      ingredients: productToUse.ingredients.map(ing => ({
        inventoryItemId: ing.inventoryItemId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    })
    console.log('Production Request:', {
      quantity,
      unit,
      waste: waste > 0 ? waste : undefined,
      businessId,
    })
    console.log('Calculation Details:', {
      maxProductionCapacity: calculationDetails?.maxProductionCapacity,
      commonUnit: calculationDetails?.commonUnit,
      limitingCapacity: calculationDetails?.limitingCapacity,
      totalIngredientQuantities: calculationDetails?.totalIngredientQuantities,
      effectiveMax: maxCapacity !== undefined ? maxCapacity * (1 - waste / 100) : undefined,
      note: 'Volume ingredients (like water) are converted to weight using 1 L = 1 kg = 1000 g',
    })
    console.log('Current Ingredient Stock Info:')
    ingredientStockInfo.forEach((ing, index) => {
      const productIngredient = productToUse.ingredients.find(pi => pi.inventoryItemId === ing.inventoryItemId)
      console.log(`  [${index + 1}] ${ing.name}:`, {
        inventoryItemId: ing.inventoryItemId,
        currentStock: ing.currentStock,
        stockUnit: ing.unit,
        ingredientQuantity: ing.quantity,
        ingredientUnit: ing.ingredientUnit,
        productionCapacity: ing.productionCapacity,
        isLimiting: ing.productionCapacity === calculationDetails?.limitingCapacity,
      })
      
      // Calculate expected consumption
      if (productIngredient && ing.currentStock !== undefined && ing.quantity > 0) {
        // Convert production quantity to ingredient unit if needed
        let productionQtyInIngredientUnit = quantity
        if (calculationDetails?.commonUnit && ing.ingredientUnit && calculationDetails.commonUnit !== ing.ingredientUnit) {
          const converted = convertUnit(quantity, calculationDetails.commonUnit, ing.ingredientUnit)
          if (converted !== null) {
            productionQtyInIngredientUnit = converted
          }
        }
        
        // Calculate how much of this ingredient will be consumed
        // If ingredient quantity is per unit of product, then: consumption = productionQuantity * ingredientQuantity
        // But we need to account for unit conversions
        let expectedConsumption = productionQtyInIngredientUnit * ing.quantity
        
        // If units don't match, try to convert
        if (ing.ingredientUnit && ing.unit && ing.ingredientUnit !== ing.unit) {
          const convertedConsumption = convertUnit(expectedConsumption, ing.ingredientUnit, ing.unit)
          if (convertedConsumption !== null) {
            expectedConsumption = convertedConsumption
          }
        }
        
        const remainingStock = ing.currentStock - expectedConsumption
        
        console.log(`    Expected Consumption: ${expectedConsumption.toFixed(2)} ${ing.unit || ing.ingredientUnit || ''}`)
        console.log(`    Remaining Stock: ${remainingStock.toFixed(2)} ${ing.unit || ''}`)
        console.log(`    Production Qty in Ingredient Unit: ${productionQtyInIngredientUnit.toFixed(2)} ${ing.ingredientUnit || ''}`)
      }
    })
    console.log('Calculation Steps:')
    calculationDetails?.steps.forEach((step, index) => {
      console.log(`  [${index + 1}] ${step.ingredientName}:`, {
        stock: step.stock,
        stockUnit: step.stockUnit,
        quantity: step.quantity,
        quantityUnit: step.quantityUnit,
        capacity: step.capacity,
        isLimiting: step.isLimiting,
      })
    })
    console.log('Ingredient Quantities (for step ii):')
    calculationDetails?.ingredientQuantities.forEach((ingQty, index) => {
      const productIngredient = productToUse.ingredients[index]
      const ingredientName = ingredientStockInfo.find(ing => ing.inventoryItemId === productIngredient?.inventoryItemId)?.name || `Ingredient ${index + 1}`
      console.log(`  [${index + 1}] ${ingredientName}:`, {
        originalQuantity: ingQty.quantity,
        originalUnit: ingQty.unit,
        convertedQuantity: ingQty.convertedQuantity,
        commonUnit: calculationDetails?.commonUnit,
      })
    })
    console.log('=== END MANUFACTURE DEBUG LOGS ===')

    setSaving(true)
    try {
      const response = await productsApi.manufactureProduct(productToUse.id, {
        businessId,
        quantity,
        unit,
        waste: waste > 0 ? waste : undefined,
      })

      if (response.success) {
        Alert.alert(
          'Success',
          `Manufacturing completed successfully.\n\nTransaction ID: ${response.transactionId}\nTotal Cost: ${response.totalCost.toFixed(2)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh ingredient stock info
                fetchIngredientStock()
                // Clear production quantity
                setProductionQuantity('')
              },
            },
          ]
        )
      } else {
        Alert.alert('Error', response.message || 'Failed to manufacture product. Please try again.')
      }
    } catch (error) {
      console.error('Failed to manufacture product:', error)
      let errorMessage = 'Failed to manufacture product. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        if (error.status === 400) {
          errorMessage = error.data?.error || errorMessage
        } else if (error.status === 404) {
          errorMessage = 'Product not found. Please try again.'
        } else if (error.status === 403) {
          errorMessage = 'Insufficient stock or access denied. Please check your inventory levels.'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to vertical drags (up or down)
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        panY.current = 0
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = typeof value === 'number' ? value : HALF_SHEET_OFFSET
        })
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow dragging up (expand) and down (collapse/dismiss)
        const newValue = Math.min(
          DISMISS_OFFSET,
          Math.max(FULL_SHEET_OFFSET, dragStartValue.current + gestureState.dy)
        )
        slideAnim.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80

        slideAnim.stopAnimation((value) => {
          const currentValue = typeof value === 'number' ? value : HALF_SHEET_OFFSET

          // Decide final position: full, half, or dismiss
          const isSwipingDownFast = gestureState.vy > 0.8
          const isSwipingUpFast = gestureState.vy < -0.8

          if (currentValue > HALF_SHEET_OFFSET + threshold || isSwipingDownFast) {
            // Dismiss modal - animate down and then hide
            Animated.timing(slideAnim, {
              toValue: DISMISS_OFFSET,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setShowLearnMoreModal(false)
              slideAnim.setValue(DISMISS_OFFSET)
            })
          } else if (currentValue < HALF_SHEET_OFFSET - threshold || isSwipingUpFast) {
            // Expand to full screen
            Animated.spring(slideAnim, {
              toValue: FULL_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start()
          } else {
            // Snap back to half-screen position
            Animated.spring(slideAnim, {
              toValue: HALF_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start()
          }
        })
      },
    })
  ).current

  const productToDisplay: Product | null = currentProduct || product

  if (!productToDisplay) {
    return (
      <AppBarLayout title="Manufacture">
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title={productToDisplay.name}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Stock */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Stock</Text>
          <Text style={styles.cardValue}>
            {productToDisplay.currentStock !== undefined
              ? `${productToDisplay.currentStock.toFixed(2)} ${productToDisplay.currentStockUnit || ''}`
              : productToDisplay.stock !== undefined
              ? `${productToDisplay.stock.toFixed(2)}`
              : 'Not set'}
          </Text>
        </View>

        {/* Ingredient Stock Levels */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingredient Stock Levels</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            </View>
          ) : (() => {
                const filteredIngredients = ingredientStockInfo.filter((ing) => ing.name !== 'Water')
                if (filteredIngredients.length === 0) {
                  return <Text style={styles.emptyText}>No ingredients found</Text>
                }
                
                // Find the limiting ingredient (minimum production capacity)
                const validCapacities = ingredientStockInfo
                  .map((ing) => ing.productionCapacity)
                  .filter((cap): cap is number => cap !== undefined)
                
                const minCapacity = validCapacities.length > 0 
                  ? Math.min(...validCapacities)
                  : undefined
                
                const limitingIngredientId = minCapacity !== undefined
                  ? ingredientStockInfo.find(
                      (ing) => ing.productionCapacity === minCapacity
                    )?.inventoryItemId
                  : undefined

                return (
                  <View style={styles.stockList}>
                    {filteredIngredients.map((ingredient) => {
                      const isLimiting = ingredient.inventoryItemId === limitingIngredientId
                      
                      return (
                        <View
                          key={ingredient.inventoryItemId}
                          style={[
                            styles.stockItem,
                            isLimiting && styles.stockItemLimiting,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stockItemName,
                              isLimiting && styles.stockItemNameLimiting,
                            ]}
                          >
                            {ingredient.name}
                            {isLimiting && ' (Limiting)'}
                          </Text>
                          <Text
                            style={[
                              styles.stockItemValue,
                              isLimiting && styles.stockItemValueLimiting,
                            ]}
                          >
                            {ingredient.currentStock !== undefined
                              ? `${ingredient.currentStock.toFixed(2)} ${ingredient.unit || ''}`
                              : 'N/A'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                )
              })()}
        </View>

        {/* Max Production Capacity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Max Production Capacity</Text>
          <Text style={styles.cardValue}>
            {calculationDetails?.maxProductionCapacity !== undefined
              ? `${calculationDetails.maxProductionCapacity.toFixed(2)} ${calculationDetails.commonUnit || ''}`
              : 'Unable to calculate'}
          </Text>
          <View style={styles.learnMoreContainer}>
            <TouchableOpacity onPress={handleOpenLearnMore} activeOpacity={0.7}>
              <Text style={styles.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Production Quantity and Waste */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Production Quantity</Text>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityInputRow}>
              <TextInput
                style={[
                  styles.quantityInput,
                  (() => {
                    const quantity = parseFloat(productionQuantity)
                    const maxCapacity = calculationDetails?.maxProductionCapacity
                    const waste = parseFloat(wastePercentage)
                    if (productionQuantity && !isNaN(quantity) && maxCapacity !== undefined && !isNaN(waste)) {
                      const effectiveMax = maxCapacity * (1 - waste / 100)
                      if (quantity >= effectiveMax) {
                        return styles.quantityInputError
                      }
                    }
                    return null
                  })(),
                ]}
                value={productionQuantity}
                onChangeText={setProductionQuantity}
                placeholder="Quantity"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>
                {calculationDetails?.commonUnit || ''}
              </Text>
            </View>
          </View>
          {(() => {
            const quantity = parseFloat(productionQuantity)
            const maxCapacity = calculationDetails?.maxProductionCapacity
            const waste = parseFloat(wastePercentage)
            if (productionQuantity && !isNaN(quantity) && maxCapacity !== undefined && !isNaN(waste)) {
              const effectiveMax = maxCapacity * (1 - waste / 100)
              if (quantity >= effectiveMax) {
                return (
                  <Text style={styles.validationErrorText}>
                    Production quantity must be less than {(effectiveMax.toFixed(2))} {calculationDetails?.commonUnit || ''} (accounting for {waste.toFixed(1)}% waste)
                  </Text>
                )
              }
            }
            return null
          })()}
          
          <View style={styles.wasteContainer}>
            <Text style={styles.wasteLabel}>Estimated Waste:</Text>
            <View style={styles.wasteInputRow}>
              <TextInput
                style={styles.wasteInput}
                value={wastePercentage}
                onChangeText={setWastePercentage}
                placeholder="5"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                keyboardType="numeric"
              />
              <Text style={styles.percentLabel}>%</Text>
            </View>
          </View>
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

      {/* Learn More Modal */}
      <Modal
        visible={showLearnMoreModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLearnMore}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseLearnMore}
          />
          <Animated.View
            style={[
              styles.modalContentContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalContent}>
              {/* Pan Handle */}
              <View style={styles.panHandleContainer} {...panResponder.panHandlers}>
                <View style={styles.panHandle} />
              </View>
              
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Max Production Capacity</Text>
              </View>
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {calculationDetails ? (
                <>
                  <Text style={styles.modalSectionTitle}>Step (i): Determine Limiting Raw Material</Text>
                  <Text style={styles.modalText}>
                    For each ingredient, we divide the current stock by the quantity needed per unit:
                  </Text>
                  
                  {calculationDetails.steps.map((step, index) => (
                    <View
                      key={index}
                      style={[
                        styles.calculationStep,
                        step.isLimiting && styles.calculationStepLimiting,
                      ]}
                    >
                      <Text style={styles.calculationStepTitle}>
                        {step.ingredientName}
                        {step.isLimiting && ' (Limiting)'}
                      </Text>
                      <Text style={styles.calculationFormula}>
                        {step.stock.toFixed(2)} {step.stockUnit} ÷ {step.quantity.toFixed(2)} {step.quantityUnit} = {step.capacity.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  
                  {calculationDetails.limitingCapacity !== undefined && (
                    <>
                      <View style={styles.calculationDivider} />
                      <Text style={styles.modalSectionTitle}>Step (ii): Calculate Max Production</Text>
                      <Text style={styles.modalText}>
                        Convert all ingredient quantities to a common unit and sum them, then multiply by the limiting capacity:
                      </Text>
                      
                      {calculationDetails.ingredientQuantities.map((ingQty, index) => {
                        const ingredient = productToDisplay.ingredients[index]
                        const ingredientName = ingredientStockInfo.find(ing => ing.inventoryItemId === ingredient?.inventoryItemId)?.name || `Ingredient ${index + 1}`
                        const showConversion = ingQty.unit && calculationDetails.commonUnit && ingQty.unit !== calculationDetails.commonUnit && ingQty.quantity !== ingQty.convertedQuantity
                        
                        return (
                          <View key={index} style={styles.calculationStep}>
                            <Text style={styles.calculationStepTitle}>{ingredientName}</Text>
                            <Text style={styles.calculationFormula}>
                              {showConversion ? (
                                <>
                                  {ingQty.quantity.toFixed(2)} {ingQty.unit} = {ingQty.convertedQuantity.toFixed(2)} {calculationDetails.commonUnit}
                                </>
                              ) : (
                                <>
                                  {ingQty.convertedQuantity.toFixed(2)} {calculationDetails.commonUnit || ingQty.unit}
                                </>
                              )}
                            </Text>
                          </View>
                        )
                      })}
                      
                      <View style={styles.calculationStep}>
                        <Text style={styles.calculationStepTitle}>Total</Text>
                        <Text style={styles.calculationFormula}>
                          {calculationDetails.ingredientQuantities.map((qty, idx) => qty.convertedQuantity.toFixed(2)).join(' + ')} = {calculationDetails.totalIngredientQuantities.toFixed(2)} {calculationDetails.commonUnit || ''}
                        </Text>
                      </View>
                      
                      <View style={styles.calculationStep}>
                        <Text style={styles.calculationStepTitle}>Max Production</Text>
                        <Text style={styles.calculationFormula}>
                          {calculationDetails.limitingCapacity.toFixed(2)} × {calculationDetails.totalIngredientQuantities.toFixed(2)} {calculationDetails.commonUnit || ''} = {calculationDetails.maxProductionCapacity?.toFixed(2) || 'N/A'} {calculationDetails.commonUnit || ''}
                        </Text>
                      </View>
                    </>
                  )}
                  
                  {calculationDetails.maxProductionCapacity !== undefined && (
                    <>
                      <View style={styles.calculationDivider} />
                      <View style={styles.resultBox}>
                        <Text style={styles.resultLabel}>Max Production Capacity:</Text>
                        <Text style={styles.resultValue}>
                          {calculationDetails.maxProductionCapacity.toFixed(2)} {calculationDetails.commonUnit || ''}
                        </Text>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.modalSectionTitle}>Calculation Details</Text>
                  <Text style={styles.modalText}>
                    Unable to calculate production capacity. Please ensure all ingredients have stock levels and quantities set.
                  </Text>
                </>
              )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <ProductDetailNavBar activeTab="Manufacture" product={product} />
    </AppBarLayout>
  )
}

const manufactureStyles = StyleSheet.create({
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
  learnMoreContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  learnMoreText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    //textDecorationLine: 'underline',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
  stockList: {
    gap: 12,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stockItemLimiting: {
    backgroundColor: '#fff4e6',
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  stockItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  stockItemNameLimiting: {
    fontWeight: '700',
    color: '#ff9800',
  },
  stockItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginLeft: 12,
  },
  stockItemValueLimiting: {
    fontWeight: '700',
    color: '#ff9800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flex: 1,
  },
  panHandleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  panHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#c0c0c0',
    borderRadius: 2,
  },
  modalHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 20,
    marginBottom: 16,
  },
  calculationStep: {
    padding: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calculationStepLimiting: {
    backgroundColor: '#fff4e6',
    borderColor: '#ff9800',
    borderWidth: 2,
  },
  calculationStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  calculationFormula: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  calculationDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  resultBox: {
    padding: 16,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  quantityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    width: 120,
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'right',
  },
  quantityInputError: {
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  validationErrorText: {
    fontSize: 13,
    color: '#d32f2f',
    marginTop: 8,
    fontStyle: 'italic',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_SECONDARY,
    minWidth: 40,
  },
  wasteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  wasteLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  wasteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wasteInput: {
    width: 60,
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    textAlign: 'right',
  },
  percentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_SECONDARY,
  },
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

