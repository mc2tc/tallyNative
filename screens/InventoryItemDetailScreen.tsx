// Inventory Item Detail screen
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, SafeAreaView, PanResponder, Animated, Modal } from 'react-native'
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
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
  isGroupedItem?: boolean
  groupedItemIds?: string[]
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
  const [currentItemData, setCurrentItemData] = useState<InventoryItem | null>(null)
  const [loadingCurrentItem, setLoadingCurrentItem] = useState(false)
  const [showReOrderModal, setShowReOrderModal] = useState(false)
  const [pendingReOrderItemId, setPendingReOrderItemId] = useState<string | null>(null)
  const [addingReOrder, setAddingReOrder] = useState(false)
  const [reOrderInfoCardDismissed, setReOrderInfoCardDismissed] = useState(false)

  // Cache pan responders and animated values per item ID
  const swipeHandlersRef = useRef<Map<string, { panResponder: any; translateX: Animated.Value }>>(new Map())

  // Get or create pan responder and animated value for a specific card
  const getSwipeHandler = useCallback((itemId: string) => {
    if (!swipeHandlersRef.current.has(itemId)) {
      const translateX = new Animated.Value(0)
      
      const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow right swipes (positive dx)
          if (gestureState.dx > 0) {
            translateX.setValue(gestureState.dx)
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const SWIPE_THRESHOLD = 50
          if (gestureState.dx > SWIPE_THRESHOLD) {
            // Swipe right detected - show confirmation modal
            setPendingReOrderItemId(itemId)
            setShowReOrderModal(true)
          }
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
        },
      })

      swipeHandlersRef.current.set(itemId, { panResponder, translateX })
    }
    return swipeHandlersRef.current.get(itemId)!
  }, [])

  // Fetch current item data to get current stock values
  const fetchCurrentItem = useCallback(async () => {
    if (!item?.id || !businessId || section === 'Receiving') {
      return
    }

    setLoadingCurrentItem(true)
    try {
      const debitAccount = item.inventoryItem?.debitAccount || (section === 'Raw Materials' ? 'Raw Materials' : 'Finished Goods')
      const response = await inventoryApi.getInventoryItems(businessId, {
        debitAccount: debitAccount as 'Raw Materials' | 'Finished Goods',
        page: 1,
        limit: 500,
        includeGrouped: true,
      })
      
      const foundItem = response.items.find((invItem) => invItem.id === item.id)
      if (foundItem) {
        setCurrentItemData(foundItem)
      }
    } catch (error) {
      console.error('[Inventory Detail] Failed to fetch current item data:', error)
    } finally {
      setLoadingCurrentItem(false)
    }
  }, [item?.id, businessId, item?.inventoryItem?.debitAccount, section])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchCurrentItem()
  }, [fetchCurrentItem])

  // Refetch when screen comes into focus (e.g., after returning from stock-take)
  useFocusEffect(
    useCallback(() => {
      if (section !== 'Receiving') {
        fetchCurrentItem()
      }
    }, [fetchCurrentItem, section])
  )

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
      if (action === 'Stock-take') {
        // Get inventory item ID - for both regular and grouped items, item.id is the correct ID
        const inventoryItemId = item?.id
        if (!inventoryItemId) {
          Alert.alert('Error', 'Inventory item ID not found')
          return
        }
        if (!businessId) {
          Alert.alert('Error', 'Business ID not found')
          return
        }
        // Navigate to StockTakeScreen
        ;(navigation as any).navigate('StockTake', {
          inventoryItemId,
          item,
          businessId,
          section,
          viewAllTitle,
          viewAllItems,
        })
      } else {
        // TODO: Implement other action handlers
        console.log('Action button pressed:', action, item)
      }
    },
    [item, businessId, section, viewAllTitle, viewAllItems, navigation],
  )

  const handleConfirmReOrder = useCallback(async () => {
    if (!pendingReOrderItemId || !businessId) {
      Alert.alert('Error', 'Missing required information')
      return
    }

    setAddingReOrder(true)
    try {
      await inventoryApi.addReOrder(businessId, pendingReOrderItemId)
      // Refresh the current item data to show the new re-order
      await fetchCurrentItem()
      setShowReOrderModal(false)
      setPendingReOrderItemId(null)
      Alert.alert('Success', 'Re-order has been added')
    } catch (error) {
      console.error('[Inventory Detail] Failed to add re-order:', error)
      Alert.alert('Error', 'Failed to add re-order. Please try again.')
    } finally {
      setAddingReOrder(false)
    }
  }, [pendingReOrderItemId, businessId, fetchCurrentItem])

  const handleCancelReOrder = useCallback(() => {
    setShowReOrderModal(false)
    setPendingReOrderItemId(null)
  }, [])

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

  // Compute current stock values
  // For grouped items: use grouped item's currentStock if available, otherwise compute from contributing items
  // For regular items: use currentStock fields from currentItemData
  const getCurrentStockValues = () => {
    if (isGroupedItem) {
      // First check if the grouped item itself has currentStock values
      if (currentItemData?.currentStockOfPrimaryPackages !== undefined || 
          currentItemData?.currentStockInPrimaryUnits !== undefined) {
        return {
          packages: currentItemData.currentStockOfPrimaryPackages ?? null,
          units: currentItemData.currentStockInPrimaryUnits ?? null,
        }
      }
      // Otherwise compute totals from contributing items
      if (groupedItems.length > 0) {
        let totalPackages = 0
        let totalUnits = 0
        groupedItems.forEach((groupedItem) => {
          const packages = groupedItem.currentStockOfPrimaryPackages ?? 0
          const units = groupedItem.currentStockInPrimaryUnits ?? 0
          totalPackages += packages
          totalUnits += units
        })
        return { packages: totalPackages > 0 ? totalPackages : null, units: totalUnits > 0 ? totalUnits : null }
      }
      return { packages: null, units: null }
    } else if (currentItemData) {
      // Use current stock from the fetched item data
      return {
        packages: currentItemData.currentStockOfPrimaryPackages ?? null,
        units: currentItemData.currentStockInPrimaryUnits ?? null,
      }
    }
    return { packages: null, units: null }
  }

  const currentStock = getCurrentStockValues()

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

    // Get or create unique swipe handler for this card
    const { panResponder, translateX } = getSwipeHandler(displayItem.id)
    const animatedStyle = {
      transform: [{ translateX: translateX }],
    }

    return (
      <Animated.View
        key={displayItem.id}
        style={[styles.detailCard, isReceivedItem && animatedStyle]}
        {...(isReceivedItem ? panResponder.panHandlers : {})}
      >
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
        {isReceivedItem && displayItem.totalPrimaryPackages !== undefined && (
          <View style={styles.labelValueRow}>
            <Text style={styles.itemSubtitleLabel}>
              Total primary packages
              {displayItem.primaryPackagingDescription && displayItem.primaryPackagingQuantity !== undefined && displayItem.primaryPackagingUnit ? ` - ${displayItem.primaryPackagingDescription} ${displayItem.primaryPackagingQuantity} ${displayItem.primaryPackagingUnit}` : ''}
            </Text>
            <Text style={styles.itemSubtitleValue}>
              {displayItem.totalPrimaryPackages.toLocaleString()}
            </Text>
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
      </Animated.View>
    )
  }

  const renderSegmentedButtons = () => {
    if (!isReceivedItem) return null

    const getActionItems = () => {
      if (section === 'Raw Materials') {
        return [
          { action: 'Stock-take', label: 'Stock-take', icon: 'assignment' as const },
          { action: 'Create Product', label: 'Create Product', icon: 'add-circle' as const },
        ]
      } else if (section === 'Finished Goods') {
        return [
          { action: 'Stock-take', label: 'Stock-take', icon: 'assignment' as const },
          { action: '+ SKU', label: 'Add SKU', icon: 'add' as const },
        ]
      }
      return []
    }

    const actionItems = getActionItems()

    return (
      <SafeAreaView style={styles.bottomBarSafeArea}>
        <View style={styles.bottomBarContainer}>
          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.action}
              style={styles.bottomNavTab}
              onPress={() => handleActionButtonPress(item.action)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={selectedAction === item.action ? GRAYSCALE_PRIMARY : '#999999'}
              />
              <Text
                style={[
                  styles.bottomNavTabLabel,
                  selectedAction === item.action && styles.bottomNavTabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <AppBarLayout title={item.title || "Item Details"} onBackPress={handleGoBack}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.contentContainer,
            isReceivedItem && styles.contentContainerWithBottomBar
          ]}
        >
          {/* Explainer Card - only show for received items (Raw Materials and Finished Goods) */}
          {!reOrderInfoCardDismissed && isReceivedItem && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardContent}>
                <View style={styles.infoCardTextContainer}>
                  <Text style={styles.infoCardTitle}>Re-order Items</Text>
                  <Text style={styles.infoCardBody}>
                    Drag right on any item card to quickly add a re-order.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.infoCardDismissButton}
                  onPress={() => setReOrderInfoCardDismissed(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.infoCardDismissIcon}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
          {isReceivedItem && (currentStock.packages !== null || currentStock.units !== null) && (
            <View style={styles.detailCard}>
              <Text style={styles.cardSectionTitle}>Current stock</Text>
              {currentStock.packages !== null && (
                <View style={styles.labelValueRow}>
                  <Text style={styles.itemSubtitleLabel}>Primary packages</Text>
                  <Text style={styles.itemSubtitleValue}>
                    {currentStock.packages.toLocaleString()}
                  </Text>
                </View>
              )}
              {currentStock.units !== null && item.primaryPackagingUnit && (
                <View style={styles.labelValueRow}>
                  <Text style={styles.itemSubtitleLabel}>Total {item.primaryPackagingUnit}</Text>
                  <Text style={styles.itemSubtitleValue}>
                    {currentStock.units.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Re-orders card */}
          {isReceivedItem && currentItemData?.reOrdered && currentItemData.reOrdered.length > 0 && (
            <View style={styles.detailCard}>
              <Text style={styles.cardSectionTitle}>Re-orders</Text>
              {currentItemData.reOrdered.map((reOrder, index) => (
                <View key={index} style={styles.reOrderRow}>
                  <View style={styles.reOrderInfo}>
                    <Text style={styles.reOrderDate}>
                      {new Date(reOrder.dateCreated).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.reOrderStatus}>{reOrder.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        {renderSegmentedButtons()}
      </View>

      {/* Re-order Confirmation Modal */}
      <Modal
        visible={showReOrderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelReOrder}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Re-order</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to add a re-order for this item?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelReOrder}
                disabled={addingReOrder}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmReOrder}
                disabled={addingReOrder}
              >
                {addingReOrder ? (
                  <ActivityIndicator size="small" color={CARD_BACKGROUND} />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  contentContainerWithBottomBar: {
    paddingBottom: 100, // Extra padding to account for bottom bar
  },
  bottomBarSafeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f5f5f5',
  },
  bottomBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  bottomNavTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomNavTabLabel: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
  },
  bottomNavTabLabelActive: {
    color: GRAYSCALE_PRIMARY,
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
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  reOrderRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  reOrderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reOrderDate: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
  },
  reOrderStatus: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: SURFACE_BACKGROUND,
  },
  modalButtonConfirm: {
    backgroundColor: GRAYSCALE_PRIMARY,
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: CARD_BACKGROUND,
  },
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCardTextContainer: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  infoCardBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
  },
  infoCardDismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  infoCardDismissIcon: {
    fontSize: 22,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '300',
    lineHeight: 20,
  },
})

