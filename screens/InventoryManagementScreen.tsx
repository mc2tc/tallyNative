// Inventory Management screen

import React, { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Alert, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { OperationsBottomNav } from '../components/OperationsBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { ApiError } from '../lib/api/client'
import { formatAmount } from '../lib/utils/currency'

type Props = NativeStackScreenProps<AppDrawerParamList, 'InventoryManagement'>

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type TransactionItem = {
  name: string
  amount: number
  debitAccount?: string
  transactionId: string
  transactionDate: number
  currency: string
  quantity?: number
  unit?: string
  itemIndex: number
  amountExcluding?: number
  vatAmount?: number
  debitAccountConfirmed?: boolean
  isBusinessExpense?: boolean
  category?: string
}

export default function InventoryManagementScreen({}: Props) {
  useModuleGroupTracking('operations')
  const { businessUser, memberships } = useAuth()
  const navigation = useNavigation()
  
  const [allReceivingItems, setAllReceivingItems] = useState<TransactionItem[]>([])
  const [allRawMaterialsItems, setAllRawMaterialsItems] = useState<Array<TransactionItem | InventoryItem>>([])
  const [allFinishedGoodsItems, setAllFinishedGoodsItems] = useState<Array<TransactionItem | InventoryItem>>([])
  const [allPendingOrdersItems, setAllPendingOrdersItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [infoCardDismissed, setInfoCardDismissed] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  // Display only first 3 items per card (sorted by transactionDate desc)
  const receivingItems = allReceivingItems.slice(0, 3)
  const rawMaterialsItems = allRawMaterialsItems.slice(0, 3)
  const finishedGoodsItems = allFinishedGoodsItems.slice(0, 3)
  const pendingOrdersItems = allPendingOrdersItems.slice(0, 3)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchTransactionItems = useCallback(async (forceRefresh: boolean = false) => {
    if (!businessId) {
      setLoading(false)
      return
    }

    // Cache for 30 seconds to avoid excessive refetching
    const CACHE_DURATION = 30000 // 30 seconds
    const now = Date.now()
    const currentLastFetchTime = lastFetchTime
    if (!forceRefresh && currentLastFetchTime > 0 && (now - currentLastFetchTime) < CACHE_DURATION) {
      // Use cached data, don't refetch
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch all transactions for "Receiving" items (Inventory)
      const response = await transactions2Api.getTransactions(businessId, {
        page: 1,
        limit: 500,
      })
      
      // Extract items from transactions for "Receiving" section (Inventory)
      const receiving: TransactionItem[] = []

      response.transactions.forEach((tx: Transaction) => {
        const details = tx.details as {
          itemList?: Array<{
            name: string
            amount: number
            debitAccount?: string
            quantity?: number
            unit?: string
          }>
        } | undefined

        const itemList = details?.itemList || []
        const transactionDate = tx.summary?.transactionDate || Date.now()

        itemList.forEach((item, index) => {
          if (item.debitAccount === 'Inventory') {
            const transactionItem: TransactionItem = {
              name: item.name,
              amount: item.amount,
              debitAccount: item.debitAccount,
              transactionId: tx.id,
              transactionDate,
              currency: tx.summary?.currency || 'GBP',
              quantity: item.quantity,
              unit: item.unit,
              itemIndex: index,
              amountExcluding: (item as any).amountExcluding,
              vatAmount: (item as any).vatAmount,
              debitAccountConfirmed: (item as any).debitAccountConfirmed,
              isBusinessExpense: (item as any).isBusinessExpense,
              category: (item as any).category,
            }
            receiving.push(transactionItem)
          }
        })
      })

      // Fetch inventory items from Firestore for Raw Materials and Finished Goods
      // Use screen=inventory to show only individual (non-grouped) items
      // Backend will exclude grouped items and contributing items, return only individual items
      // Limit to 100 items since we only display the last 3 by date
      const [rawMaterialsResponse, finishedGoodsResponse] = await Promise.all([
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Raw Materials',
          screen: 'inventory',
          page: 1,
          limit: 100, // Only need last 3, but fetch 100 for better sorting
        }),
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Finished Goods',
          screen: 'inventory',
          page: 1,
          limit: 100, // Only need last 3, but fetch 100 for better sorting
        }),
      ])

      // Filter out grouped items (items with groupedItemIds field)
      // isGrouped: true is irrelevant for display - we only care about excluding groupedItemIds
      const filterOutGroupedItems = (item: InventoryItem) => {
        // Exclude items that have groupedItemIds (these are grouped items)
        return !(item.groupedItemIds && item.groupedItemIds.length > 0)
      }

      // Filter out Water items
      const filterOutWater = (item: InventoryItem) => {
        return item.name?.toLowerCase() !== 'water'
      }

      // Filter items with pending re-orders
      const filterPendingOrders = (item: InventoryItem) => {
        return item.reOrdered && item.reOrdered.some((reOrder) => reOrder.status === 'pending')
      }

      // Sort by creation date (most recent first)
      const sortByDate = (a: TransactionItem | InventoryItem, b: TransactionItem | InventoryItem) => {
        const aDate = 'transactionDate' in a ? a.transactionDate : a.createdAt
        const bDate = 'transactionDate' in b ? b.transactionDate : b.createdAt
        return (bDate || 0) - (aDate || 0)
      }

      // Sort pending orders by most recent re-order date
      const sortPendingOrdersByReOrderDate = (a: InventoryItem, b: InventoryItem) => {
        const aReOrders = a.reOrdered?.filter((r) => r.status === 'pending') || []
        const bReOrders = b.reOrdered?.filter((r) => r.status === 'pending') || []
        const aLatestReOrder = aReOrders.length > 0 ? Math.max(...aReOrders.map((r) => r.dateCreated)) : 0
        const bLatestReOrder = bReOrders.length > 0 ? Math.max(...bReOrders.map((r) => r.dateCreated)) : 0
        return bLatestReOrder - aLatestReOrder
      }
      
      // Filter and sort items - exclude grouped items (with groupedItemIds) and Water
      const filteredRawMaterials = rawMaterialsResponse.items.filter(filterOutGroupedItems).filter(filterOutWater)
      const filteredFinishedGoods = finishedGoodsResponse.items.filter(filterOutGroupedItems)
      
      // Get all items with pending re-orders (from both Raw Materials and Finished Goods)
      const allItems = [...filteredRawMaterials, ...filteredFinishedGoods]
      const pendingOrders = allItems.filter(filterPendingOrders)
      
      setAllReceivingItems(receiving.sort((a, b) => b.transactionDate - a.transactionDate))
      setAllRawMaterialsItems(filteredRawMaterials.sort(sortByDate))
      setAllFinishedGoodsItems(filteredFinishedGoods.sort(sortByDate))
      setAllPendingOrdersItems(pendingOrders.sort(sortPendingOrdersByReOrderDate))
      setLastFetchTime(Date.now())
    } catch (err) {
      console.error('Failed to fetch transaction items:', err)
      
      let errorMessage = 'Failed to load inventory items. Please try again.'
      if (err instanceof ApiError) {
        errorMessage = err.message || errorMessage
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
  }, [businessId]) // Removed lastFetchTime from deps to avoid recreating callback

  useEffect(() => {
    fetchTransactionItems()
  }, [fetchTransactionItems])

  // Refresh when screen comes into focus, but respect cache
  useFocusEffect(
    useCallback(() => {
      fetchTransactionItems(false) // Don't force refresh on focus, use cache if available
    }, [fetchTransactionItems])
  )

  const handleItemPress = useCallback((item: TransactionItem) => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing')
      return
    }

    // Construct itemText similar to TransactionDetailScreen: quantity unit name
    const parts: string[] = []
    if (item.quantity !== undefined) {
      parts.push(item.quantity.toString())
    }
    if (item.unit) {
      parts.push(item.unit)
    }
    parts.push(item.name)
    const itemText = parts.join(' ')

    // Navigate to ManageStock with transaction info
    ;(navigation as any).navigate('ManageStock', {
      itemName: item.name,
      itemText,
      businessId,
      transactionId: item.transactionId,
      itemIndex: item.itemIndex,
      transactionItem: item, // Pass full item for inventory creation
    })
  }, [businessId, navigation])

  // Helper function to format stock display for inventory items
  const formatStockDisplay = useCallback((item: TransactionItem | InventoryItem): string => {
    // Only format stock for InventoryItem types (not TransactionItem)
    if (!('id' in item) || ('transactionId' in item && 'itemIndex' in item)) {
      return '' // TransactionItem doesn't have stock info
    }

    const inventoryItem = item as InventoryItem

    // Priority 1: Use currentStockInMetric if available
    if (inventoryItem.currentStockInMetric) {
      return `${inventoryItem.currentStockInMetric.stock} ${inventoryItem.currentStockInMetric.unit}`
    }

    // Priority 2: Use currentStockInPrimaryUnits with primaryPackaging.unit
    if (inventoryItem.currentStockInPrimaryUnits !== undefined && inventoryItem.packaging?.primaryPackaging?.unit) {
      return `${inventoryItem.currentStockInPrimaryUnits} ${inventoryItem.packaging.primaryPackaging.unit}`
    }

    // No stock data available
    return ''
  }, [])

  const handleInventoryItemPress = useCallback((item: InventoryItem, section: 'Raw Materials' | 'Finished Goods') => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing')
      return
    }

    // Convert InventoryItem to InventoryViewAllItem format
    const currency = item.currency || 'GBP'
    const viewAllItem = {
      id: item.id,
      title: item.name,
      amount: formatAmount(item.amount, currency, true),
      inventoryItem: item,
      costPerPrimaryPackage: item.costPerPrimaryPackage,
      costPerPrimaryPackagingUnit: item.costPerPrimaryPackagingUnit,
      totalPrimaryPackages: item.packaging?.totalPrimaryPackages,
      primaryPackagingUnit: item.packaging?.primaryPackaging?.unit,
      primaryPackagingDescription: item.packaging?.primaryPackaging?.description,
      primaryPackagingQuantity: item.packaging?.primaryPackaging?.quantity,
      thirdPartyName: item.thirdPartyName,
      transactionDate: item.transactionDate,
      reference: item.reference,
      isGroupedItem: item.isGroupedItem,
      groupedItemIds: item.groupedItemIds,
      currentStockOfPrimaryPackages: item.currentStockOfPrimaryPackages,
      currentStockInPrimaryUnits: item.currentStockInPrimaryUnits,
      currentStockInMetric: item.currentStockInMetric,
      currency,
    }

    // Navigate to InventoryItemDetail
    ;(navigation as any).navigate('InventoryItemDetail', {
      item: viewAllItem,
      section,
      businessId,
      viewAllTitle: section,
      viewAllItems: [],
      previousScreen: 'InventoryManagement',
    })
  }, [businessId, navigation])

  const handleViewAll = useCallback((section: 'Receiving' | 'Raw Materials' | 'Finished Goods' | 'Pending Orders') => {
    let items: Array<TransactionItem | InventoryItem> = []
    let title = section

    if (section === 'Receiving') {
      items = allReceivingItems
    } else if (section === 'Pending Orders') {
      // Navigate to dedicated Pending Orders screen
      ;(navigation as any).navigate('PendingOrders', {
        businessId,
      })
      return
    } else if (section === 'Raw Materials') {
      // For Raw Materials and Finished Goods, View All screen will fetch its own data
      // with screen=viewAll to show both grouped and individual items
      ;(navigation as any).navigate('InventoryViewAll', {
        title,
        items: [], // Empty array - View All will fetch its own data
        section,
        businessId,
      })
      return
    } else if (section === 'Finished Goods') {
      // For Raw Materials and Finished Goods, View All screen will fetch its own data
      // with screen=viewAll to show both grouped and individual items
      ;(navigation as any).navigate('InventoryViewAll', {
        title,
        items: [], // Empty array - View All will fetch its own data
        section,
        businessId,
      })
      return
    }

    // For Receiving, convert items to format expected by view all screen
    const viewAllItems = items.map((item) => {
      // Check if it's an InventoryItem (has id) or TransactionItem
      const isInventoryItem = 'id' in item && !('transactionId' in item && 'itemIndex' in item)
      const currency = 'currency' in item ? item.currency : (isInventoryItem ? (item as InventoryItem).currency || 'GBP' : 'GBP')
      
      return {
        id: isInventoryItem ? (item as InventoryItem).id : `${(item as TransactionItem).transactionId}-${(item as TransactionItem).itemIndex}`,
        title: item.name,
        amount: formatAmount(item.amount, currency, true),
        transactionItem: 'transactionId' in item && 'itemIndex' in item ? item as TransactionItem : undefined,
        inventoryItem: isInventoryItem ? item as InventoryItem : undefined,
        costPerPrimaryPackage: isInventoryItem ? (item as InventoryItem).costPerPrimaryPackage : undefined,
        costPerPrimaryPackagingUnit: isInventoryItem ? (item as InventoryItem).costPerPrimaryPackagingUnit : undefined,
        totalPrimaryPackages: isInventoryItem ? (item as InventoryItem).packaging?.totalPrimaryPackages : undefined,
        primaryPackagingUnit: isInventoryItem ? (item as InventoryItem).packaging?.primaryPackaging?.unit : undefined,
        primaryPackagingDescription: isInventoryItem ? (item as InventoryItem).packaging?.primaryPackaging?.description : undefined,
        primaryPackagingQuantity: isInventoryItem ? (item as InventoryItem).packaging?.primaryPackaging?.quantity : undefined,
        thirdPartyName: isInventoryItem ? (item as InventoryItem).thirdPartyName : undefined,
        transactionDate: isInventoryItem ? (item as InventoryItem).transactionDate : undefined,
        reference: isInventoryItem ? (item as InventoryItem).reference : undefined,
        isGroupedItem: isInventoryItem ? (item as InventoryItem).isGroupedItem : undefined,
        groupedItemIds: isInventoryItem ? (item as InventoryItem).groupedItemIds : undefined,
        currency,
      }
    })

    ;(navigation as any).navigate('InventoryViewAll', {
      title,
      items: viewAllItems,
      section,
      businessId,
    })
    }, [allReceivingItems, allRawMaterialsItems, allFinishedGoodsItems, allPendingOrdersItems, businessId, navigation])

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <AppBarLayout title="Inventory">
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.loadingText}>Loading inventory items...</Text>
          </View>
        </AppBarLayout>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.wrapper}>
        <AppBarLayout title="Inventory">
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </AppBarLayout>
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Inventory">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Explainer Card */}
          {!infoCardDismissed && (
            <View style={styles.infoCard}>
              <View style={styles.infoCardContent}>
                <View style={styles.infoCardTextContainer}>
                  <Text style={styles.infoCardTitle}>Understanding your Inventory</Text>
                  <Text style={styles.infoCardBody}>
                    Track items as they come in. First 'Receive items' by confirming details and categorizing as Raw Materials or Finished Goods for stock management.
                  </Text>
                </View>
            <TouchableOpacity
                  style={styles.infoCardDismissButton}
                  onPress={() => setInfoCardDismissed(true)}
              activeOpacity={0.7}
            >
                  <Text style={styles.infoCardDismissIcon}>×</Text>
            </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Pending Orders Card */}
          <View style={styles.pipelineCard}>
            <Text style={styles.pipelineTitle}>Pending Orders</Text>
            {pendingOrdersItems.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <Text style={styles.emptyCardText}>No pending orders</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {pendingOrdersItems.map((item, index) => {
                  const currency = item.currency || 'GBP'
                  return (
                    <View key={item.id} style={styles.cardListItem}>
                      <View style={styles.cardTextGroup}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                      </View>
                      <Text style={styles.cardAmount}>{formatAmount(item.amount, currency, true)}</Text>
                    </View>
                  )
                })}
              </View>
            )}
            {allPendingOrdersItems.length > 0 && (
              <View style={styles.pipelineActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => handleViewAll('Pending Orders')}
                >
                  <Text style={styles.linkButtonText}>
                    {allPendingOrdersItems.length > 3 ? `View all (${allPendingOrdersItems.length})` : 'View all'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Receiving Card */}
          <View style={styles.pipelineCard}>
            <Text style={styles.pipelineTitle}>Receiving...</Text>
            {receivingItems.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <Text style={styles.emptyCardText}>No items pending receipt</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {receivingItems.map((item, index) => (
            <TouchableOpacity
                    key={`${item.transactionId}-${index}`}
                    style={styles.cardListItem}
                    onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
            >
                    <View style={styles.cardTextGroup}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                    </View>
                    <Text style={styles.cardAmount}>{formatAmount(item.amount, item.currency, true)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {allReceivingItems.length > 0 && (
              <View style={styles.pipelineActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => handleViewAll('Receiving')}
              >
                  <Text style={styles.linkButtonText}>
                    {allReceivingItems.length > 3 ? `View all (${allReceivingItems.length})` : 'View all'}
                  </Text>
            </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Separator */}
          <View style={styles.reportingReadySeparator}>
            <View style={styles.reportingReadyLine} />
            <Text style={styles.reportingReadyLabel}>In Stock</Text>
            <View style={styles.reportingReadyLine} />
          </View>

          {/* Raw Materials Card */}
          <View style={styles.pipelineCard}>
            <Text style={styles.pipelineTitle}>Raw Materials</Text>
            {rawMaterialsItems.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <Text style={styles.emptyCardText}>No raw materials items</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {rawMaterialsItems.map((item, index) => {
                  const itemId = 'id' in item ? item.id : `${(item as TransactionItem).transactionId}-${index}`
                  const stockDisplay = formatStockDisplay(item)
                  // Only make clickable if it's an InventoryItem (has id and is not a TransactionItem)
                  const isInventoryItem = 'id' in item && !('transactionId' in item && 'itemIndex' in item)
                  return (
                    <TouchableOpacity
                      key={itemId}
                      style={styles.cardListItem}
                      onPress={() => isInventoryItem && handleInventoryItemPress(item as InventoryItem, 'Raw Materials')}
                      activeOpacity={isInventoryItem ? 0.7 : 1}
                      disabled={!isInventoryItem}
                    >
                      <View style={styles.cardTextGroup}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                      </View>
                      {stockDisplay ? (
                        <Text style={styles.cardAmount}>{stockDisplay}</Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
            {allRawMaterialsItems.length > 0 && (
              <View style={styles.pipelineActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => handleViewAll('Raw Materials')}
                >
                  <Text style={styles.linkButtonText}>
                    {allRawMaterialsItems.length > 3 ? `View all (${allRawMaterialsItems.length})` : 'View all'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </View>

          {/* Finished Goods Card */}
          <View style={styles.pipelineCard}>
            <Text style={styles.pipelineTitle}>Finished Goods</Text>
            {finishedGoodsItems.length === 0 ? (
              <View style={styles.emptyCardContainer}>
                <Text style={styles.emptyCardText}>No finished goods items</Text>
            </View>
          ) : (
              <View style={styles.cardList}>
                {finishedGoodsItems.map((item, index) => {
                  const itemId = 'id' in item ? item.id : `${(item as TransactionItem).transactionId}-${index}`
                  const stockDisplay = formatStockDisplay(item)
                  // Only make clickable if it's an InventoryItem (has id and is not a TransactionItem)
                  const isInventoryItem = 'id' in item && !('transactionId' in item && 'itemIndex' in item)
                  return (
                    <TouchableOpacity
                      key={itemId}
                      style={styles.cardListItem}
                      onPress={() => isInventoryItem && handleInventoryItemPress(item as InventoryItem, 'Finished Goods')}
                      activeOpacity={isInventoryItem ? 0.7 : 1}
                      disabled={!isInventoryItem}
                    >
                      <View style={styles.cardTextGroup}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                      </View>
                      {stockDisplay ? (
                        <Text style={styles.cardAmount}>{stockDisplay}</Text>
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
            {allFinishedGoodsItems.length > 0 && (
              <View style={styles.pipelineActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => handleViewAll('Finished Goods')}
                >
                  <Text style={styles.linkButtonText}>
                    {allFinishedGoodsItems.length > 3 ? `View all (${allFinishedGoodsItems.length})` : 'View all'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
        <OperationsBottomNav />
      </AppBarLayout>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80, // Extra padding for bottom nav
    paddingTop: 24,
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
  pipelineCard: {
    flex: 1,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
    marginBottom: 16,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  cardList: {
    gap: 8,
  },
  cardListItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fbfbfb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  emptyCardContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    textAlign: 'center',
  },
  reportingReadySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  reportingReadyLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d0d0d0',
  },
  reportingReadyLabel: {
    marginHorizontal: 8,
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  pipelineActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
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
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
})

