// Stock Take screen
import React, { useState, useEffect } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { ApiError } from '../lib/api/client'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type InventoryViewAllItem = {
  id: string
  title: string
  amount: string
  currency?: string
  inventoryItem?: InventoryItem
  totalPrimaryPackages?: number
  primaryPackagingUnit?: string
  primaryPackagingDescription?: string
  primaryPackagingQuantity?: number
}

type StockTakeRouteParams = {
  inventoryItemId: string
  item: InventoryViewAllItem
  businessId: string
  section: 'Raw Materials' | 'Finished Goods'
  viewAllTitle?: string
  viewAllItems?: InventoryViewAllItem[]
}

type StockTakeRouteProp = RouteProp<
  { StockTake: StockTakeRouteParams } | { [key: string]: any },
  'StockTake'
>

export default function StockTakeScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<StockTakeRouteProp>()
  const params = route.params || {
    inventoryItemId: '',
    item: null,
    businessId: '',
    section: 'Raw Materials' as const,
  }
  const { inventoryItemId, item, businessId, section, viewAllTitle, viewAllItems } = params

  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inputMode, setInputMode] = useState<'packages' | 'units'>('packages')
  const [stockInput, setStockInput] = useState('')
  const [currentStockPackages, setCurrentStockPackages] = useState<number | null>(null)
  const [currentStockUnits, setCurrentStockUnits] = useState<number | null>(null)

  // Fetch full inventory item details
  useEffect(() => {
    const fetchInventoryItem = async () => {
      if (!inventoryItemId || !businessId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const debitAccount = item?.inventoryItem?.debitAccount || (section === 'Raw Materials' ? 'Raw Materials' : 'Finished Goods')
        const response = await inventoryApi.getInventoryItems(businessId, {
          debitAccount: debitAccount as 'Raw Materials' | 'Finished Goods',
          page: 1,
          limit: 500,
          includeGrouped: true,
        })

        const foundItem = response.items.find((invItem) => invItem.id === inventoryItemId)
        if (foundItem) {
          setInventoryItem(foundItem)
          // Try to get current stock from the item
          // The API may return currentStockOfPrimaryPackages and currentStockInPrimaryUnits
          // For now, use packaging.totalPrimaryPackages as fallback
          const stockPackages = (foundItem as any).currentStockOfPrimaryPackages ?? foundItem.packaging?.totalPrimaryPackages ?? null
          const stockUnits = (foundItem as any).currentStockInPrimaryUnits ?? null
          setCurrentStockPackages(stockPackages)
          setCurrentStockUnits(stockUnits)
          
          // Initialize input with current stock
          if (stockPackages !== null) {
            setStockInput(stockPackages.toString())
          }
        }
      } catch (error) {
        console.error('Failed to fetch inventory item:', error)
        Alert.alert('Error', 'Failed to load inventory item details')
      } finally {
        setLoading(false)
      }
    }

    fetchInventoryItem()
  }, [inventoryItemId, businessId, item, section])

  const handleGoBack = () => {
    navigation.navigate('InventoryItemDetail', {
      item,
      section,
      businessId,
      viewAllTitle,
      viewAllItems,
    })
  }

  const primaryPackagingQuantity = inventoryItem?.packaging?.primaryPackaging?.quantity ?? item?.primaryPackagingQuantity ?? 1
  const primaryPackagingUnit = inventoryItem?.packaging?.primaryPackaging?.unit ?? item?.primaryPackagingUnit ?? ''
  const primaryPackagingDescription = inventoryItem?.packaging?.primaryPackaging?.description ?? item?.primaryPackagingDescription ?? ''

  // Calculate derived value based on input
  const calculateDerivedValue = (value: number, mode: 'packages' | 'units'): number | null => {
    if (mode === 'packages') {
      return value * primaryPackagingQuantity
    } else {
      if (primaryPackagingQuantity === 0) return null
      return value / primaryPackagingQuantity
    }
  }

  const stockInputValue = parseFloat(stockInput) || 0
  const derivedValue = calculateDerivedValue(stockInputValue, inputMode)

  const handleSubmit = async () => {
    if (!stockInput || isNaN(stockInputValue) || stockInputValue < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid non-negative number')
      return
    }

    if (!inventoryItem?.packaging?.primaryPackaging) {
      Alert.alert('Error', 'This item does not have packaging information required for stock-take')
      return
    }

    setSubmitting(true)
    try {
      const isInPrimaryUnits = inputMode === 'units'
      const response = await inventoryApi.performStockTake(
        businessId,
        inventoryItemId,
        stockInputValue,
        isInPrimaryUnits,
      )

      // Build success message with updated stock values
      let successMessage = response.message || 'Stock-take completed successfully'
      successMessage += `\n\nUpdated stock:`
      successMessage += `\n${response.updatedStock.packages.toLocaleString()} primary packages`
      if (primaryPackagingQuantity > 0) {
        successMessage += `\n${response.updatedStock.units.toLocaleString()} ${primaryPackagingUnit}`
      }
      
      // Optionally show transaction ID if accounting entries were created
      if (response.transactionId) {
        successMessage += `\n\nAccounting entry created: ${response.transactionId}`
      }

      Alert.alert('Success', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back with updated stock values
            navigation.navigate('InventoryItemDetail', {
              item: {
                ...item,
                totalPrimaryPackages: response.updatedStock.packages,
              },
              section,
              businessId,
              viewAllTitle,
              viewAllItems,
            })
          },
        },
      ])
    } catch (error) {
      console.error('Stock-take error:', error)
      let errorMessage = 'Failed to complete stock-take. Please try again.'
      let errorTitle = 'Error'
      
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
        // Handle specific error codes
        if (error.status === 400) {
          errorTitle = 'Validation Error'
        } else if (error.status === 401) {
          errorTitle = 'Unauthorized'
        } else if (error.status === 403) {
          errorTitle = 'Access Denied'
        } else if (error.status === 404) {
          errorTitle = 'Item Not Found'
        } else if (error.status === 500) {
          errorTitle = 'Server Error'
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert(errorTitle, errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppBarLayout title="Stock-take" onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
          <Text style={styles.loadingText}>Loading item details...</Text>
        </View>
      </AppBarLayout>
    )
  }

  if (!inventoryItem) {
    return (
      <AppBarLayout title="Stock-take" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Item not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  if (!inventoryItem.packaging?.primaryPackaging) {
    return (
      <AppBarLayout title="Stock-take" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            This item does not have packaging information required for stock-take
          </Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title="Stock-take" onBackPress={handleGoBack}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Item Info Card */}
          <View style={styles.detailCard}>
            <Text style={styles.itemTitle}>{item?.title || inventoryItem.name}</Text>
            {primaryPackagingDescription && (
              <Text style={styles.itemSubtitle}>
                {primaryPackagingDescription} {primaryPackagingQuantity}{primaryPackagingUnit}
              </Text>
            )}
          </View>

          {/* Current Stock Card */}
          {(currentStockPackages !== null || currentStockUnits !== null) && (
            <View style={styles.detailCard}>
              <Text style={styles.cardLabel}>Current Stock</Text>
              {currentStockPackages !== null && (
                <View style={styles.labelValueRow}>
                  <Text style={styles.itemSubtitleLabel}>Primary packages</Text>
                  <Text style={styles.itemSubtitleValue}>
                    {currentStockPackages.toLocaleString()}
                  </Text>
                </View>
              )}
              {currentStockUnits !== null && (
                <View style={styles.labelValueRow}>
                  <Text style={styles.itemSubtitleLabel}>Total {primaryPackagingUnit}</Text>
                  <Text style={styles.itemSubtitleValue}>
                    {currentStockUnits.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Input Mode Toggle */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>Enter stock count as</Text>
            <View style={styles.segmentedButtonsWrapper}>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  inputMode === 'packages' && styles.segmentedButtonActive,
                  { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                ]}
                onPress={() => {
                  setInputMode('packages')
                  if (currentStockPackages !== null) {
                    setStockInput(currentStockPackages.toString())
                  } else {
                    setStockInput('')
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    inputMode === 'packages' && styles.segmentedButtonTextActive,
                  ]}
                >
                  Packages
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  inputMode === 'units' && styles.segmentedButtonActive,
                  { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                ]}
                onPress={() => {
                  setInputMode('units')
                  if (currentStockUnits !== null) {
                    setStockInput(currentStockUnits.toString())
                  } else if (currentStockPackages !== null && primaryPackagingQuantity > 0) {
                    setStockInput((currentStockPackages * primaryPackagingQuantity).toString())
                  } else {
                    setStockInput('')
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    inputMode === 'units' && styles.segmentedButtonTextActive,
                  ]}
                >
                  {primaryPackagingUnit || 'Units'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock Input Card */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>
              {inputMode === 'packages' ? 'Number of packages' : `Total ${primaryPackagingUnit}`}
            </Text>
            <TextInput
              style={styles.textInput}
              value={stockInput}
              onChangeText={(text) => {
                // Allow only numbers and decimal point
                const numericValue = text.replace(/[^0-9.]/g, '')
                setStockInput(numericValue)
              }}
              placeholder="Enter stock count"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              keyboardType="numeric"
              autoFocus={true}
            />
            {derivedValue !== null && (
              <View style={styles.derivedValueContainer}>
                <Text style={styles.derivedValueLabel}>
                  {inputMode === 'packages'
                    ? `Total ${primaryPackagingUnit}:`
                    : 'Number of packages:'}
                </Text>
                <Text style={styles.derivedValueText}>
                  {derivedValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={submitting || !stockInput || isNaN(stockInputValue) || stockInputValue < 0}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Complete Stock-take</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE_BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE_BACKGROUND,
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  labelValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemSubtitleLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    flex: 1,
  },
  itemSubtitleValue: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    textAlign: 'right',
  },
  segmentedButtonsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  segmentedButtonActive: {
    backgroundColor: GRAYSCALE_PRIMARY,
  },
  segmentedButtonText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentedButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
    marginTop: 8,
  },
  derivedValueContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  derivedValueLabel: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
  },
  derivedValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  submitButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
})

