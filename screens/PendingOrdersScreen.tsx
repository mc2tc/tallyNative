// Pending Orders screen - dedicated screen for viewing all pending re-orders
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native'
import { Searchbar } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import { formatAmount } from '../lib/utils/currency'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { Alert } from 'react-native'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type PendingOrdersRouteParams = {
  businessId: string
}

type PendingOrdersRouteProp = RouteProp<
  { PendingOrders: PendingOrdersRouteParams } | { [key: string]: any },
  'PendingOrders'
>

export default function PendingOrdersScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<PendingOrdersRouteProp>()
  const { businessId } = route.params || { businessId: '' }
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const lastFetchedRef = useRef<boolean>(false)

  // Fetch items with pending re-orders
  const fetchItems = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch both Raw Materials and Finished Goods to find items with pending re-orders
      // Use includeGrouped: true to get contributing items that are part of groups
      const [rawMaterialsResponse, finishedGoodsResponse] = await Promise.all([
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Raw Materials',
          screen: 'viewAll',
          includeGrouped: true, // Include contributing items that are part of groups
          page: 1,
          limit: 500, // Fetch more items to find all with pending re-orders
        }),
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Finished Goods',
          screen: 'viewAll',
          includeGrouped: true, // Include contributing items that are part of groups
          page: 1,
          limit: 500, // Fetch more items to find all with pending re-orders
        }),
      ])

      // Filter items with pending re-orders
      const allItems = [...rawMaterialsResponse.items, ...finishedGoodsResponse.items]
      const pendingOrdersItems = allItems.filter(
        (item: InventoryItem) => item.reOrdered && item.reOrdered.some((reOrder) => reOrder.status === 'pending')
      )

      // Sort by most recent re-order date
      const sortPendingOrdersByReOrderDate = (a: InventoryItem, b: InventoryItem) => {
        const aReOrders = a.reOrdered?.filter((r) => r.status === 'pending') || []
        const bReOrders = b.reOrdered?.filter((r) => r.status === 'pending') || []
        const aLatestReOrder = aReOrders.length > 0 ? Math.max(...aReOrders.map((r) => r.dateCreated)) : 0
        const bLatestReOrder = bReOrders.length > 0 ? Math.max(...bReOrders.map((r) => r.dateCreated)) : 0
        return bLatestReOrder - aLatestReOrder
      }

      setItems(pendingOrdersItems.sort(sortPendingOrdersByReOrderDate))
      lastFetchedRef.current = true
    } catch (error) {
      console.error('Failed to fetch pending orders:', error)
      Alert.alert('Error', 'Failed to load pending orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  // Fetch items on mount
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (businessId) {
        lastFetchedRef.current = false
        fetchItems()
      }
    }, [fetchItems, businessId])
  )

  const handleGoBack = () => {
    navigation.navigate('InventoryManagement' as never)
  }

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }
    const query = searchQuery.toLowerCase().trim()
    return items.filter((item: InventoryItem) => {
      const name = item.name.toLowerCase()
      const thirdPartyName = item.thirdPartyName?.toLowerCase() || ''
      const reference = item.reference?.toLowerCase() || ''
      return name.includes(query) || thirdPartyName.includes(query) || reference.includes(query)
    })
  }, [items, searchQuery])

  const handleItemPress = useCallback(
    (item: InventoryItem) => {
      if (!businessId) {
        return
      }

      // Convert to InventoryViewAllItem format for detail screen
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
        groupedItemIds: item.groupedItemIds,
        currentStockOfPrimaryPackages: item.currentStockOfPrimaryPackages,
        currentStockInPrimaryUnits: item.currentStockInPrimaryUnits,
        currency,
      }

      // Determine section based on debitAccount
      const section = item.debitAccount === 'Raw Materials' ? 'Raw Materials' : 'Finished Goods'

      // Navigate to detail screen
      ;(navigation as any).navigate('InventoryItemDetail', {
        item: viewAllItem,
        section,
        businessId,
        viewAllTitle: 'Pending Orders',
        viewAllItems: filteredItems.map((invItem) => {
          const invCurrency = invItem.currency || 'GBP'
          return {
            id: invItem.id,
            title: invItem.name,
            amount: formatAmount(invItem.amount, invCurrency, true),
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
            groupedItemIds: invItem.groupedItemIds,
            currentStockOfPrimaryPackages: invItem.currentStockOfPrimaryPackages,
            currentStockInPrimaryUnits: invItem.currentStockInPrimaryUnits,
            currency: invCurrency,
          }
        }),
      })
    },
    [businessId, navigation, filteredItems],
  )

  const handleOrderItem = useCallback((item: InventoryItem) => {
    console.log('Order item:', item.id, item.name)
    // TODO: Implement order item functionality
  }, [])

  const handleOrderAll = useCallback((item: InventoryItem) => {
    console.log('Order all:', item.id, item.name)
    // TODO: Implement order all functionality
  }, [])

  const handlePrepareOrders = useCallback(() => {
    if (!businessId) return
    ;(navigation as any).navigate('PrepareOrders', {
      businessId,
    })
  }, [businessId, navigation])

  const handleRemoveAll = useCallback(() => {
    console.log('Remove All')
    // TODO: Implement remove all functionality
  }, [])

  return (
    <AppBarLayout title="Pending Orders" onBackPress={handleGoBack}>
      <View style={styles.wrapper}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search pending orders..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchInput}
            inputStyle={styles.searchInputText}
          />
        </View>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer}
        >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.emptyText}>Loading pending orders...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No pending orders found' : 'No pending orders'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredItems.map((item: InventoryItem) => {
              const currency = item.currency || 'GBP'
              const pendingReOrders = item.reOrdered?.filter((r) => r.status === 'pending') || []

              return (
                <View key={item.id} style={styles.cardWrapper}>
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemContent}>
                      {item.thirdPartyName && (
                        <Text style={styles.itemThirdPartyName}>{item.thirdPartyName}</Text>
                      )}
                      {(item.transactionDate || item.reference) && (
                        <View style={styles.dateReferenceRow}>
                          {item.transactionDate && (
                            <Text style={styles.itemTransactionDate}>
                              {new Date(item.transactionDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </Text>
                          )}
                          {item.reference && (
                            <Text style={styles.itemReference}>{item.reference}</Text>
                          )}
                        </View>
                      )}
                      <View style={styles.titleRow}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemAmount}>{formatAmount(item.amount, currency, true)}</Text>
                      </View>
                      {item.packaging?.primaryPackaging && (
                        <View style={styles.packagingRow}>
                          <Text style={styles.packagingText}>
                            {item.packaging.primaryPackaging.description}
                            {item.packaging.primaryPackaging.quantity && item.packaging.primaryPackaging.unit && (
                              ` ${item.packaging.primaryPackaging.quantity} ${item.packaging.primaryPackaging.unit}`
                            )}
                            {item.packaging.totalPrimaryPackages !== undefined && (
                              ` • ${item.packaging.totalPrimaryPackages.toLocaleString()} packages`
                            )}
                          </Text>
                        </View>
                      )}
                      {pendingReOrders.length > 1 && (
                        <Text style={styles.multipleReOrdersText}>
                          {pendingReOrders.length} pending re-orders
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  {/* Action Buttons */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOrderItem(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonText}>Order item</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOrderAll(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonText}>Remove item</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
        </ScrollView>
        
        {/* Fixed Bottom Buttons */}
        <SafeAreaView style={styles.bottomButtonContainer}>
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity
              style={styles.bottomNavTab}
              onPress={handlePrepareOrders}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="list"
                size={24}
                color={GRAYSCALE_PRIMARY}
              />
              <Text style={styles.bottomNavTabLabel}>Prepare Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomNavTab}
              onPress={handleRemoveAll}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="delete"
                size={24}
                color={GRAYSCALE_PRIMARY}
              />
              <Text style={styles.bottomNavTabLabel}>Remove all</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: SURFACE_BACKGROUND,
  },
  searchInput: {
    backgroundColor: CARD_BACKGROUND,
    elevation: 0,
    shadowOpacity: 0,
  },
  searchInputText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 100, // Extra padding to account for bottom button
  },
  listContainer: {
    gap: 12,
  },
  cardWrapper: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    overflow: 'hidden',
  },
  listItem: {
    padding: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemThirdPartyName: {
    fontSize: 11,
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
    marginBottom: 8,
  },
  itemTransactionDate: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
  },
  itemReference: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    textAlign: 'right',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
    marginRight: 12,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  packagingRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  packagingText: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    lineHeight: 16,
  },
  multipleReOrdersText: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    backgroundColor: CARD_BACKGROUND,
  },
  actionButton: {
    flex: 1,
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: CARD_BACKGROUND,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
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
    color: GRAYSCALE_PRIMARY,
    marginTop: 4,
  },
})

