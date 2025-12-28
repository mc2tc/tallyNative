// Manage Stock screen - displays packaging extraction results
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { packagingApi, type PackagingExtractionResponse, type PackagingExtractionSuccessResponse, isPackagingExtractionSuccess, type PrimaryPackaging, type SecondaryPackaging } from '../lib/api/packaging'
import { inventoryApi } from '../lib/api/inventory'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { ApiError } from '../lib/api/client'
import { AppBarLayout } from '../components/AppBarLayout'
import { formatAmount } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'

type ManageStockRouteProp =
  | RouteProp<AppDrawerParamList, 'ManageStock'>
  | RouteProp<TransactionsStackParamList, 'ManageStock'>
  | RouteProp<ScaffoldStackParamList, 'ManageStock'>

type DebitAccountType = 'Raw Materials' | 'Finished Goods'

export default function ManageStockScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<ManageStockRouteProp>()
  const { itemName, itemText, businessId, inventoryItemId, transactionId, itemIndex, transactionItem } = route.params || {}
  const insets = useSafeAreaInsets()
  const [selectedDebitAccount, setSelectedDebitAccount] = useState<DebitAccountType | null>(null)

  // Safety check: if params are missing, navigate back
  useEffect(() => {
    if (!route.params || !itemName || !itemText || !businessId) {
      Alert.alert('Error', 'Missing required information', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('InventoryManagement' as never)
          },
        },
      ])
    }
  }, [route.params, itemName, itemText, businessId, navigation])

  const [loading, setLoading] = useState(true)
  const [packagingData, setPackagingData] = useState<PackagingExtractionSuccessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [itemAmount, setItemAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('GBP')

  useEffect(() => {
    const extractPackaging = async () => {
      if (!businessId || !itemText) {
        setError('Missing required information')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Fetch transaction to get item amount and currency if we have transactionId
        if (transactionId && businessId) {
          try {
            const transaction = await transactions2Api.getTransaction(transactionId, businessId)
            const details = transaction.details as {
              itemList?: Array<{
                amount: number
              }>
            } | undefined
            const itemList = details?.itemList || []
            const item = itemList[itemIndex ?? -1]
            
            if (item) {
              setItemAmount(item.amount)
            }
            
            // Get currency from transaction summary
            if (transaction.summary?.currency) {
              setCurrency(transaction.summary.currency)
            }
          } catch (err) {
            console.error('Failed to fetch transaction for amount:', err)
            // Continue with packaging extraction even if transaction fetch fails
          }
        } else if (transactionItem?.amount) {
          // Use transactionItem from route params if available
          setItemAmount(transactionItem.amount)
          if (transactionItem.currency) {
            setCurrency(transactionItem.currency)
          }
        }

        const response = await packagingApi.extractPackaging(businessId, itemText)
        
        // Check if response is successful using type guard
        if (!isPackagingExtractionSuccess(response)) {
          const errorMsg = response.error || response.message || 'Failed to extract packaging information'
          console.error('Packaging extraction failed:', response)
          setError(errorMsg)
          Alert.alert('Error', errorMsg)
          return
        }
        
        setPackagingData(response)
      } catch (err) {
        console.error('Failed to extract packaging:', err)
        console.error('Error details:', {
          error: err,
          businessId,
          itemText,
          errorType: err instanceof ApiError ? 'ApiError' : err instanceof Error ? 'Error' : 'Unknown',
          status: err instanceof ApiError ? err.status : undefined,
          data: err instanceof ApiError ? err.data : undefined,
        })
        
        let errorMessage = 'Failed to extract packaging information. Please try again.'
        if (err instanceof ApiError) {
          errorMessage = err.message || errorMessage
          // Include status code in error message for debugging
          if (err.status) {
            errorMessage = `${errorMessage} (Status: ${err.status})`
          }
        } else if (err instanceof Error) {
          errorMessage = err.message
        }
        setError(errorMessage)
        Alert.alert('Error', errorMessage)
      } finally {
        setLoading(false)
      }
    }

    extractPackaging()
  }, [businessId, itemText, transactionId, itemIndex, transactionItem])

  const handleConfirmAndSave = async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing')
      return
    }

    // If we have transactionId and itemIndex, this is a new item from "Receiving" section
    // User must select Raw Materials or Finished Goods
    if (transactionId && itemIndex !== undefined) {
      if (!selectedDebitAccount) {
        Alert.alert('Error', 'Please select whether this is Raw Materials or Finished Goods')
        return
      }

      setUpdatingStatus(true)
      try {
        // 1. Get the current transaction to access the item data
        const currentTransaction = await transactions2Api.getTransaction(transactionId, businessId)
        
        const details = currentTransaction.details as {
          itemList?: Array<{
            name: string
            amount: number
            amountExcluding?: number
            vatAmount?: number
            debitAccount?: string
            debitAccountConfirmed?: boolean
            isBusinessExpense?: boolean
            category?: string
            quantity?: number
            unit?: string
            unitCost?: number
          }>
        } | undefined

        const currentItemList = details?.itemList || []
        const itemToUpdate = currentItemList[itemIndex]
        
        if (!itemToUpdate) {
          throw new Error('Item not found in transaction')
        }

        // 2. Check if transaction is verified
        const metadata = currentTransaction.metadata as {
          verification?: { status?: string }
        } | undefined
        const isUnverified = metadata?.verification?.status === 'unverified'

        // 3. Update the transaction item's debitAccount from "Inventory" to selected type
        // Build updated itemList with the changed debitAccount
        const updatedItemList = currentItemList.map((item, index) => {
          if (index === itemIndex) {
            return {
              name: item.name,
              amount: item.amount,
              amountExcluding: item.amountExcluding,
              vatAmount: item.vatAmount,
              debitAccount: selectedDebitAccount,
              debitAccountConfirmed: true,
              isBusinessExpense: item.isBusinessExpense,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              unitCost: item.unitCost,
            }
          }
          return {
            name: item.name,
            amount: item.amount,
            amountExcluding: item.amountExcluding,
            vatAmount: item.vatAmount,
            debitAccount: item.debitAccount,
            debitAccountConfirmed: item.debitAccountConfirmed,
            isBusinessExpense: item.isBusinessExpense,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
          }
        })

        // Update the transaction - use verify endpoint for unverified, updateVerifiedPurchase for verified
        let updatedTransaction: Transaction
        if (isUnverified) {
          // For unverified transactions, use verify endpoint
          updatedTransaction = await transactions2Api.verifyTransaction(
            transactionId,
            businessId,
            {
              itemList: updatedItemList,
            },
          )
        } else {
          // For verified transactions, use updateTransactions3VerifiedPurchase
          const updateResponse = await transactions2Api.updateTransactions3VerifiedPurchase(
            transactionId,
            businessId,
            {
              itemList: updatedItemList,
            },
          )
          updatedTransaction = updateResponse.transaction
        }

        // 4. Create inventoryItem record using the updated item and packaging data
        const updatedItem = updatedItemList[itemIndex]
        
        // Get transaction summary and metadata fields
        const thirdPartyName = updatedTransaction.summary?.thirdPartyName
        const transactionDate = updatedTransaction.summary?.transactionDate
        const reference = (updatedTransaction.metadata as { reference?: string } | undefined)?.reference
        
        // Calculate cost per primary package and cost per primary packaging unit
        let costPerPrimaryPackage: number | undefined
        let costPerPrimaryPackagingUnit: number | undefined
        
        if (packagingData && packagingData.packaging.totalPrimaryPackages > 0) {
          costPerPrimaryPackage = updatedItem.amount / packagingData.packaging.totalPrimaryPackages
          
          if (packagingData.packaging.primaryPackaging && packagingData.packaging.primaryPackaging.quantity > 0) {
            const totalPrimaryPackagingUnits = packagingData.packaging.totalPrimaryPackages * packagingData.packaging.primaryPackaging.quantity
            costPerPrimaryPackagingUnit = updatedItem.amount / totalPrimaryPackagingUnits
          }
        }
        
        const itemsToSave = [{
          name: updatedItem.name,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          unitCost: updatedItem.unitCost,
          amount: updatedItem.amount,
          amountExcluding: updatedItem.amountExcluding,
          vatAmount: updatedItem.vatAmount,
          debitAccount: selectedDebitAccount,
          debitAccountConfirmed: true,
          isBusinessExpense: updatedItem.isBusinessExpense,
          category: updatedItem.category,
          packaging: packagingData ? {
            primaryPackaging: packagingData.packaging.primaryPackaging,
            secondaryPackaging: packagingData.packaging.secondaryPackaging,
            totalPrimaryPackages: packagingData.packaging.totalPrimaryPackages,
            orderQuantity: packagingData.packaging.orderQuantity,
            orderPackagingLevel: packagingData.packaging.orderPackagingLevel,
            confidence: packagingData.packaging.confidence,
            notes: packagingData.packaging.notes,
          } : undefined,
          costPerPrimaryPackage,
          costPerPrimaryPackagingUnit,
          thirdPartyName,
          transactionDate,
          reference,
        }]

        await transactions2Api.saveInventoryItems(
          businessId,
          transactionId,
          itemsToSave,
        )

        setUpdatingStatus(false)
        Alert.alert('Success', 'Item saved successfully', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('InventoryManagement' as never)
            },
          },
        ])
      } catch (error) {
        console.error('Failed to save inventory item:', error)
        let errorMessage = 'Failed to save inventory item. Please try again.'
        if (error instanceof ApiError) {
          errorMessage = error.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        Alert.alert('Error', errorMessage)
        setUpdatingStatus(false)
      }
    } else if (inventoryItemId && businessId) {
      // Existing inventory item - just update status to "received"
      setUpdatingStatus(true)
      try {
        await inventoryApi.updateInventoryItemStatus(inventoryItemId, businessId, 'received')
        setUpdatingStatus(false)
        navigation.navigate('InventoryManagement' as never)
      } catch (error) {
        console.error('Failed to update inventory item status:', error)
        let errorMessage = 'Failed to update inventory status. Please try again.'
        if (error instanceof ApiError) {
          errorMessage = error.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        Alert.alert('Error', errorMessage)
        setUpdatingStatus(false)
      }
    } else {
      // No transactionId or inventoryItemId, just navigate back
      navigation.navigate('InventoryManagement' as never)
    }
  }

  const handleGoBack = () => {
    // Navigate explicitly back to InventoryManagement screen
    // Since ManageStock is only accessed from InventoryManagement, we navigate directly to it
    navigation.navigate('InventoryManagement' as never)
  }

  const handleEditPrimaryPackaging = () => {
    if (!packagingData?.packaging.primaryPackaging) return

    navigation.navigate('EditPackaging' as never, {
      packaging: packagingData.packaging.primaryPackaging,
      packagingType: 'primary',
      manageStockParams: { itemName, itemText, businessId, inventoryItemId },
      onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => {
        if (!packagingData) return

        const updatedPrimary = updatedPackaging as PrimaryPackaging
        const updatedPackagingData = {
          ...packagingData,
          packaging: {
            ...packagingData.packaging,
            primaryPackaging: updatedPrimary,
            // Recalculate totalPrimaryPackages based on order level
            totalPrimaryPackages:
              packagingData.packaging.orderPackagingLevel === 'primary'
                ? packagingData.packaging.orderQuantity
                : packagingData.packaging.secondaryPackaging
                  ? packagingData.packaging.secondaryPackaging.quantity *
                    packagingData.packaging.secondaryPackaging.primaryPackagesPerSecondary
                  : packagingData.packaging.totalPrimaryPackages,
          },
        }
        setPackagingData(updatedPackagingData)
      },
    } as any)
  }

  const handleEditSecondaryPackaging = () => {
    if (!packagingData?.packaging.secondaryPackaging) return

    navigation.navigate('EditPackaging' as never, {
      packaging: packagingData.packaging.secondaryPackaging,
      packagingType: 'secondary',
      manageStockParams: { itemName, itemText, businessId, inventoryItemId },
      onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => {
        if (!packagingData) return

        const updatedSecondary = updatedPackaging as SecondaryPackaging
        const updatedPackagingData = {
          ...packagingData,
          packaging: {
            ...packagingData.packaging,
            secondaryPackaging: updatedSecondary,
            // Recalculate totalPrimaryPackages for secondary level
            totalPrimaryPackages:
              packagingData.packaging.orderPackagingLevel === 'secondary'
                ? updatedSecondary.quantity * updatedSecondary.primaryPackagesPerSecondary
                : packagingData.packaging.totalPrimaryPackages,
          },
        }
        setPackagingData(updatedPackagingData)
      },
    } as any)
  }

  if (loading) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
          <Text style={styles.loadingText}>Extracting packaging information...</Text>
        </View>
      </AppBarLayout>
    )
  }

  if (error) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </AppBarLayout>
    )
  }

  if (!packagingData) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No packaging data available</Text>
        </View>
      </AppBarLayout>
    )
  }

  const { packaging } = packagingData

  return (
    <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.headerCard}>
          <Text style={styles.itemName}>{itemName}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Quantity:</Text>
            <Text style={styles.infoValue}>{packaging.orderQuantity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Packaging Level:</Text>
            <Text style={styles.infoValue}>
              {packaging.orderPackagingLevel.charAt(0).toUpperCase() +
                packaging.orderPackagingLevel.slice(1)}
            </Text>
          </View>
          {packaging.confidence !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Confidence:</Text>
              <Text style={styles.infoValue}>
                {(packaging.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Primary Packaging */}
        {packaging.primaryPackaging && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Primary Packaging</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPrimaryPackaging}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={GRAYSCALE_PRIMARY} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.packagingItem}>
              <Text style={styles.packagingDescription}>{packaging.primaryPackaging.description}</Text>
              {packaging.primaryPackaging.material && (
                <Text style={styles.packagingDetail}>Material: {packaging.primaryPackaging.material}</Text>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity:</Text>
                <Text style={styles.infoValue}>{packaging.primaryPackaging.quantity}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unit:</Text>
                <Text style={styles.infoValue}>{packaging.primaryPackaging.unit}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Secondary Packaging */}
        {packaging.secondaryPackaging && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Secondary Packaging</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditSecondaryPackaging}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={GRAYSCALE_PRIMARY} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.packagingItem}>
              <Text style={styles.packagingDescription}>{packaging.secondaryPackaging.description}</Text>
              {packaging.secondaryPackaging.material && (
                <Text style={styles.packagingDetail}>Material: {packaging.secondaryPackaging.material}</Text>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity:</Text>
                <Text style={styles.infoValue}>{packaging.secondaryPackaging.quantity}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Primary units per {packaging.secondaryPackaging.description}:</Text>
                <Text style={styles.infoValue}>{packaging.secondaryPackaging.primaryPackagesPerSecondary}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Total Primary Packages - Prominently Displayed */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Total Primary Packages: {packaging.totalPrimaryPackages.toLocaleString()}
          </Text>
          {packaging.primaryPackaging && (
            <>
            <Text style={styles.totalAmount}>
              {(packaging.totalPrimaryPackages * packaging.primaryPackaging.quantity).toLocaleString()}
              {packaging.primaryPackaging.unit && ` ${packaging.primaryPackaging.unit}`}
            </Text>
              {itemAmount !== null && packaging.totalPrimaryPackages > 0 && (
                <View style={styles.costPerUnitContainer}>
                  <Text style={styles.costPerUnitLabel}>Cost per primary package:</Text>
                  <Text style={styles.costPerUnitAmount}>
                    {formatAmount(itemAmount / packaging.totalPrimaryPackages, currency, true)}
                  </Text>
                </View>
              )}
              {itemAmount !== null && packaging.totalPrimaryPackages > 0 && packaging.primaryPackaging.quantity > 0 && (
                <View style={styles.costPerUnitContainer}>
                  <Text style={styles.costPerUnitLabel}>Cost per {packaging.primaryPackaging.unit || 'unit'}:</Text>
                  <Text style={styles.costPerUnitAmount}>
                    {new Intl.NumberFormat('en-GB', {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    }).format(itemAmount / (packaging.totalPrimaryPackages * packaging.primaryPackaging.quantity))}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Simple Grid */}
        {packaging.primaryPackaging && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Packaging Hierarchy</Text>
            <Text style={styles.primaryPackagingLabel}>
              {(() => {
                const primary = packaging.primaryPackaging!
                const description = primary.description || 'Primary Packaging'
                
                if (packaging.orderPackagingLevel === 'primary') {
                  // For primary level: show order quantity x primary quantity unit
                  const orderQuantity = packaging.orderQuantity || 0
                  const primaryQuantity = primary.quantity || 0
                  const unit = primary.unit || ''
                  return `${orderQuantity} x ${primaryQuantity}${unit ? ` ${unit}` : ''}`
                } else {
                  // For secondary level: show description x primaryPackagesPerSecondary x quantity unit
                  const primaryPackagesPerSecondary = packaging.secondaryPackaging?.primaryPackagesPerSecondary || 12
                  const quantity = primary.quantity || 0
                  const unit = primary.unit || ''
                  return `${description} x ${primaryPackagesPerSecondary} x ${quantity}${unit ? ` ${unit}` : ''}`
                }
              })()}
            </Text>
            <View style={styles.gridWithLabel}>
              <View style={styles.secondaryPackagingLabel}>
                <Text style={styles.secondaryPackagingLabelText}>
                  {(() => {
                    if (packaging.orderPackagingLevel === 'primary') {
                      // Show just the primary packaging type
                      const primary = packaging.primaryPackaging!
                      return primary.description || 'Primary Packaging'
                    } else {
                      // Show secondary packaging label
                      if (!packaging.secondaryPackaging) return ''
                      const secondary = packaging.secondaryPackaging
                      const quantity = secondary.quantity || 1
                      const description = secondary.description || 'case'
                      return `${quantity} ${description}`
                    }
                  })()}
                </Text>
              </View>
              <View style={styles.simpleGrid}>
                {(() => {
                  // Determine number of columns based on packaging level
                  const numCols = packaging.orderPackagingLevel === 'primary'
                    ? packaging.orderQuantity
                    : (packaging.secondaryPackaging?.primaryPackagesPerSecondary || 12)
                  
                  // Determine number of rows
                  if (packaging.orderPackagingLevel === 'primary') {
                    // If primary level, show just one row with orderQuantity columns
                    return (
                      <View style={styles.gridRow}>
                        {Array.from({ length: numCols }, (_, colIdx) => (
                          <View key={colIdx} style={styles.gridCell}>
                            <View style={styles.miniCard} />
                          </View>
                        ))}
                      </View>
                    )
                  } else {
                    // Otherwise, create rows based on secondary packaging quantity
                    if (!packaging.secondaryPackaging) return null
                    
                    const rows: React.ReactNode[] = []
                    const quantity = packaging.secondaryPackaging.quantity || 1
                    for (let i = 0; i < quantity; i++) {
                      rows.push(
                        <View key={`row-${i}`} style={styles.gridRow}>
                          {Array.from({ length: numCols }, (_, colIdx) => (
                            <View key={colIdx} style={styles.gridCell}>
                              <View style={styles.miniCard} />
                            </View>
                          ))}
                        </View>
                      )
                    }
                    
                    return rows
                  }
                })()}
              </View>
            </View>
            {/* Report missing or damaged button */}
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => {
                // No action for now
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={18} color="#4a4a4a" style={styles.reportButtonIcon} />
              <Text style={styles.reportButtonText}>Report missing or damaged</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        {packaging.notes && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{packaging.notes}</Text>
          </View>
        )}

        {/* Debit Account Selection - Only show for new items from "Receiving" section */}
        {transactionId && itemIndex !== undefined && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Item Type</Text>
            <Text style={styles.selectionSubtext}>Select whether this is Raw Materials or Finished Goods</Text>
            <View style={styles.segmentedButtonsWrapper}>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  selectedDebitAccount === 'Raw Materials' && styles.segmentedButtonActive,
                  { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                ]}
                onPress={() => setSelectedDebitAccount('Raw Materials')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    selectedDebitAccount === 'Raw Materials' && styles.segmentedButtonTextActive,
                  ]}
                >
                  Raw Materials
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  selectedDebitAccount === 'Finished Goods' && styles.segmentedButtonActive,
                  { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                ]}
                onPress={() => setSelectedDebitAccount('Finished Goods')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    selectedDebitAccount === 'Finished Goods' && styles.segmentedButtonTextActive,
                  ]}
                >
                  Finished Goods
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Confirm and Save Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (updatingStatus || (transactionId && itemIndex !== undefined && !selectedDebitAccount)) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmAndSave}
          activeOpacity={0.8}
          disabled={updatingStatus || !!(transactionId && itemIndex !== undefined && !selectedDebitAccount)}
        >
          {updatingStatus ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
          <Text style={styles.confirmButtonText}>Confirm and Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
  },
  costPerUnitContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  costPerUnitLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  costPerUnitAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888888',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  packagingItem: {
    marginBottom: 0,
  },
  packagingDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  packagingDetail: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryPackagingLabel: {
    fontSize: 14,
    color: '#4a4a4a',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '500',
  },
  gridWithLabel: {
    flexDirection: 'row',
    marginTop: 8,
  },
  secondaryPackagingLabel: {
    justifyContent: 'center',
    paddingRight: 12,
    minWidth: 60,
  },
  secondaryPackagingLabelText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '500',
    textAlign: 'right',
  },
  simpleGrid: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  gridCell: {
    flex: 1,
    height: 60,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  reportButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
  },
  reportButtonIcon: {
    marginRight: 8,
  },
  reportButtonText: {
    color: '#4a4a4a',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionSubtext: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 12,
    marginTop: 4,
  },
  segmentedButtonsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginTop: 8,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#e0e0e0',
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
})

