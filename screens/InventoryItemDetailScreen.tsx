// Inventory Item Detail screen
import React, { useState, useCallback, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { formatAmount } from '../lib/utils/currency'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { Alert } from 'react-native'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type InventoryViewAllItem = {
  id: string
  title: string
  amount: string
  currency?: string
  transactionItem?: {
    name: string
    amount: number
    currency: string
    transactionId: string
    itemIndex: number
    quantity?: number
    unit?: string
    debitAccount?: string
  }
  inventoryItem?: {
    id: string
    name: string
    amount: number
    debitAccount: 'Raw Materials' | 'Finished Goods'
    costPerPrimaryPackage?: number
    costPerPrimaryPackagingUnit?: number
    thirdPartyName?: string
    transactionDate?: number
    reference?: string
    packaging?: {
      primaryPackaging?: {
        unit: string
        description: string
        quantity: number
      }
      totalPrimaryPackages?: number
    }
  }
  costPerPrimaryPackage?: number
  costPerPrimaryPackagingUnit?: number
  totalPrimaryPackages?: number
  primaryPackagingUnit?: string
  primaryPackagingDescription?: string
  primaryPackagingQuantity?: number
  thirdPartyName?: string
  transactionDate?: number
  reference?: string
}

type InventoryItemDetailRouteParams = {
  item: InventoryViewAllItem
  section: 'Receiving' | 'Raw Materials' | 'Finished Goods'
  businessId: string
  viewAllTitle?: string
  viewAllItems?: InventoryViewAllItem[]
}

type InventoryItemDetailRouteProp = RouteProp<
  { InventoryItemDetail: InventoryItemDetailRouteParams } | { [key: string]: any },
  'InventoryItemDetail'
>

export default function InventoryItemDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<InventoryItemDetailRouteProp>()
  const params = route.params || {
    item: null,
    section: 'Receiving' as const,
    businessId: '',
    viewAllTitle: undefined,
    viewAllItems: [],
  }
  const { item, section, businessId, viewAllItems } = params
  const viewAllTitle = params.viewAllTitle || section
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [groupedItems, setGroupedItems] = useState<InventoryItem[]>([])
  const [loadingGroupedItems, setLoadingGroupedItems] = useState(false)

  // Fetch grouped items if this is a grouped item
  useEffect(() => {
    if (!item?.groupedItemIds || !businessId || item.groupedItemIds.length === 0) {
      return
    }

    const fetchGroupedItems = async () => {
      setLoadingGroupedItems(true)
      try {
        // Fetch all items and filter by groupedItemIds
        // We need to fetch with the same debitAccount as the current item
        const debitAccount = item.inventoryItem?.debitAccount || (section === 'Raw Materials' ? 'Raw Materials' : 'Finished Goods')
        
        // Fetch items with includeGrouped to get contributing items
        // We only need the specific items in groupedItemIds, so we can limit the response
        // However, we need to fetch enough to find them - limit to 500 for better performance
        const response = await inventoryApi.getInventoryItems(businessId, {
          debitAccount: debitAccount as 'Raw Materials' | 'Finished Goods',
          page: 1,
          limit: 500, // Reduced from 1000 for better performance
          includeGrouped: true, // Include items with isGrouped: true so we can fetch the contributing items
        })
        
        // Filter to only the items in groupedItemIds
        const validItems = response.items.filter((invItem) => 
          item.groupedItemIds?.includes(invItem.id)
        )
        
        setGroupedItems(validItems)
      } catch (error) {
        console.error('[Inventory Detail Debug] Failed to fetch grouped items:', error)
        Alert.alert('Error', 'Failed to load grouped items')
      } finally {
        setLoadingGroupedItems(false)
      }
    }

    fetchGroupedItems()
  }, [item?.groupedItemIds, businessId, item?.inventoryItem?.debitAccount, section])

  const handleGoBack = () => {
    // Navigate explicitly to InventoryViewAll screen
    ;(navigation as any).navigate('InventoryViewAll', {
      title: viewAllTitle || section,
      items: viewAllItems || [],
      section,
      businessId,
    })
  }

  const handleActionButtonPress = useCallback(
    (action: string) => {
      setSelectedAction(action)
      // TODO: Implement action handlers
      console.log('Action button pressed:', action, item)
      // Placeholder for future implementation
    },
    [item],
  )

  if (!item) {
    return (
      <AppBarLayout title="Item Details" onBackPress={handleGoBack}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Item not found</Text>
        </View>
      </AppBarLayout>
    )
  }

  const isReceivedItem = section !== 'Receiving' && (item.inventoryItem || item.costPerPrimaryPackage !== undefined)
  const isGroupedItem = item.groupedItemIds && item.groupedItemIds.length > 0

  // Render a card for a single inventory item
  const renderItemCard = (itemData: InventoryViewAllItem | InventoryItem, isGroupedItemCard: boolean = false) => {
    // Convert InventoryItem to InventoryViewAllItem format if needed
    let displayItem: InventoryViewAllItem
    if (isGroupedItemCard && 'name' in itemData && !('title' in itemData)) {
      // It's an InventoryItem, convert it
      const invItem = itemData as InventoryItem
      displayItem = {
        id: invItem.id,
        title: invItem.name,
        amount: formatAmount(invItem.amount, invItem.currency || 'GBP', true),
        inventoryItem: invItem,
        costPerPrimaryPackage: invItem.costPerPrimaryPackage,
        costPerPrimaryPackagingUnit: invItem.costPerPrimaryPackagingUnit,
        totalPrimaryPackages: invItem.packaging?.totalPrimaryPackages,
        primaryPackagingUnit: invItem.packaging?.primaryPackaging?.unit,
        primaryPackagingDescription: invItem.packaging?.primaryPackaging?.description,
        primaryPackagingQuantity: invItem.packaging?.primaryPackaging?.quantity,
        thirdPartyName: invItem.thirdPartyName,
        transactionDate: invItem.transactionDate,
        reference: invItem.reference,
        currency: invItem.currency || 'GBP',
      }
    } else {
      // It's already an InventoryViewAllItem
      displayItem = itemData as InventoryViewAllItem
    }

    return (
      <View key={displayItem.id} style={styles.detailCard}>
        {isReceivedItem && displayItem.thirdPartyName && (
          <Text style={styles.itemThirdPartyName}>{displayItem.thirdPartyName}</Text>
        )}
        {isReceivedItem && (displayItem.transactionDate || displayItem.reference) && (
          <View style={styles.dateReferenceRow}>
            {displayItem.transactionDate && (
              <Text style={styles.itemTransactionDate}>
                {new Date(displayItem.transactionDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}
            {displayItem.reference && (
              <Text style={styles.itemReference}>{displayItem.reference}</Text>
            )}
          </View>
        )}
        <View style={styles.nameAmountRow}>
          <Text style={styles.itemTitle}>{displayItem.title}</Text>
          <Text style={styles.itemAmount}>{displayItem.amount}</Text>
        </View>
        {isReceivedItem && (displayItem.totalPrimaryPackages !== undefined || (displayItem.primaryPackagingDescription && displayItem.primaryPackagingQuantity !== undefined && displayItem.primaryPackagingUnit)) && (
          <View style={styles.labelValueRow}>
            <Text style={styles.itemSubtitleLabel}>
              {displayItem.totalPrimaryPackages !== undefined ? `Total primary packages` : ''}
              {displayItem.totalPrimaryPackages !== undefined && displayItem.primaryPackagingDescription && displayItem.primaryPackagingQuantity !== undefined && displayItem.primaryPackagingUnit ? ' - ' : ''}
              {displayItem.primaryPackagingDescription && displayItem.primaryPackagingQuantity !== undefined && displayItem.primaryPackagingUnit ? `${displayItem.primaryPackagingDescription} ${displayItem.primaryPackagingQuantity} ${displayItem.primaryPackagingUnit}` : ''}
            </Text>
            {displayItem.totalPrimaryPackages !== undefined && (
              <Text style={styles.itemSubtitleValue}>
                {displayItem.totalPrimaryPackages.toLocaleString()}
              </Text>
            )}
          </View>
        )}
        {isReceivedItem && displayItem.costPerPrimaryPackage !== undefined && (
          <View style={styles.labelValueRow}>
            <Text style={styles.itemSubtitleLabel}>Cost per primary package</Text>
            <Text style={styles.itemSubtitleValue}>
              {formatAmount(displayItem.costPerPrimaryPackage, displayItem.currency || 'GBP', true)}
            </Text>
          </View>
        )}
        {isReceivedItem && displayItem.costPerPrimaryPackagingUnit !== undefined && displayItem.primaryPackagingUnit && (
          <View style={styles.labelValueRow}>
            <Text style={styles.itemSubtitleLabel}>Cost per {displayItem.primaryPackagingUnit}</Text>
            <Text style={styles.itemSubtitleValue}>
              {new Intl.NumberFormat('en-GB', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              }).format(displayItem.costPerPrimaryPackagingUnit)}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <AppBarLayout title={item.title || "Item Details"} onBackPress={handleGoBack}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {isGroupedItem ? (
          <>
            {loadingGroupedItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
                <Text style={styles.loadingText}>Loading grouped items...</Text>
              </View>
            ) : groupedItems.length > 0 ? (
              <>
                {groupedItems.map((groupedItem) => renderItemCard(groupedItem, true))}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No grouped items found</Text>
              </View>
            )}
          </>
        ) : (
          renderItemCard(item)
        )}

        {/* Current stock card - separate card */}
        {isReceivedItem && item.totalPrimaryPackages !== undefined && (
          <View style={styles.detailCard}>
            <View style={styles.labelValueRow}>
              <Text style={styles.itemSubtitleLabel}>Current stock</Text>
              <Text style={styles.itemSubtitleValue}>
                {item.totalPrimaryPackages.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {isReceivedItem && (
          <View style={styles.segmentedButtonsWrapper}>
            {section === 'Raw Materials' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Stock-take' && styles.segmentedButtonActive,
                    { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Stock-take')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Stock-take' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Stock-take
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Re-order' && styles.segmentedButtonActive,
                    { borderLeftWidth: 0.5, borderRightWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Re-order')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Re-order' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Re-order
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Create Product' && styles.segmentedButtonActive,
                    { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Create Product')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Create Product' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Create Product
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {section === 'Finished Goods' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Stock-take' && styles.segmentedButtonActive,
                    { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Stock-take')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Stock-take' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Stock-take
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Re-order' && styles.segmentedButtonActive,
                    { borderLeftWidth: 0.5, borderRightWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Re-order')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Re-order' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Re-order
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === 'Re-sell' && styles.segmentedButtonActive,
                    { borderLeftWidth: 0.5, borderRightWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('Re-sell')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === 'Re-sell' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    Re-sell
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    selectedAction === '+ SKU' && styles.segmentedButtonActive,
                    { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                  ]}
                  onPress={() => handleActionButtonPress('+ SKU')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      selectedAction === '+ SKU' && styles.segmentedButtonTextActive,
                    ]}
                  >
                    + SKU
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
  },
  detailCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
    marginBottom: 16,
  },
  itemThirdPartyName: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateReferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTransactionDate: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
  },
  itemReference: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    textAlign: 'right',
  },
  nameAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    flex: 1,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    textAlign: 'right',
  },
  labelValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
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
    marginTop: 12,
    overflow: 'hidden',
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#e0e0e0',
  },
  segmentedButtonActive: {
    backgroundColor: GRAYSCALE_PRIMARY,
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_PRIMARY,
    textAlign: 'center',
  },
  segmentedButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
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
})

