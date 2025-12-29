// Prepare Orders screen - shows pending orders grouped by supplier
import React, { useCallback, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { Alert } from 'react-native'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type PrepareOrdersRouteParams = {
  businessId: string
}

type PrepareOrdersRouteProp = RouteProp<
  { PrepareOrders: PrepareOrdersRouteParams } | { [key: string]: any },
  'PrepareOrders'
>

type SupplierGroup = {
  thirdPartyName: string
  items: InventoryItem[]
}

export default function PrepareOrdersScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<PrepareOrdersRouteProp>()
  const { businessId } = route.params || { businessId: '' }
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch items with pending re-orders and group by supplier
  const fetchAndGroupItems = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch both Raw Materials and Finished Goods to find items with pending re-orders
      const [rawMaterialsResponse, finishedGoodsResponse] = await Promise.all([
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Raw Materials',
          screen: 'viewAll',
          includeGrouped: true,
          page: 1,
          limit: 500,
        }),
        inventoryApi.getInventoryItems(businessId, {
          debitAccount: 'Finished Goods',
          screen: 'viewAll',
          includeGrouped: true,
          page: 1,
          limit: 500,
        }),
      ])

      // Filter items with pending re-orders
      const allItems = [...rawMaterialsResponse.items, ...finishedGoodsResponse.items]
      const pendingOrdersItems = allItems.filter(
        (item: InventoryItem) => item.reOrdered && item.reOrdered.some((reOrder) => reOrder.status === 'pending')
      )

      // Group by thirdPartyName
      const groupedBySupplier = new Map<string, InventoryItem[]>()
      
      pendingOrdersItems.forEach((item: InventoryItem) => {
        const supplierName = item.thirdPartyName || 'Unknown Supplier'
        if (!groupedBySupplier.has(supplierName)) {
          groupedBySupplier.set(supplierName, [])
        }
        groupedBySupplier.get(supplierName)!.push(item)
      })

      // Convert to array and sort by supplier name
      const groups: SupplierGroup[] = Array.from(groupedBySupplier.entries())
        .map(([thirdPartyName, items]) => ({
          thirdPartyName,
          items,
        }))
        .sort((a, b) => a.thirdPartyName.localeCompare(b.thirdPartyName))

      setSupplierGroups(groups)
    } catch (error) {
      console.error('Failed to fetch prepare orders:', error)
      Alert.alert('Error', 'Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  // Fetch on mount
  useEffect(() => {
    fetchAndGroupItems()
  }, [fetchAndGroupItems])

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (businessId) {
        fetchAndGroupItems()
      }
    }, [fetchAndGroupItems, businessId])
  )

  const handleGoBack = () => {
    navigation.navigate('PendingOrders' as never, { businessId })
  }

  const handleOrderNow = useCallback((supplierName: string, items: InventoryItem[]) => {
    console.log('Order now for supplier:', supplierName, items.length, 'items')
    // TODO: Implement order now functionality
  }, [])

  const handleDeleteOrder = useCallback((supplierName: string, items: InventoryItem[]) => {
    console.log('Delete order for supplier:', supplierName, items.length, 'items')
    // TODO: Implement delete order functionality
  }, [])

  return (
    <AppBarLayout title="Prepare Orders" onBackPress={handleGoBack}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.emptyText}>Loading orders...</Text>
          </View>
        ) : supplierGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending orders to prepare</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {supplierGroups.map((group) => (
              <View key={group.thirdPartyName} style={styles.supplierCard}>
                <Text style={styles.supplierName}>{group.thirdPartyName}</Text>
                
                <View style={styles.itemsList}>
                  {group.items.map((item, index) => (
                    <View 
                      key={item.id} 
                      style={[
                        styles.itemRow,
                        index === group.items.length - 1 && styles.itemRowLast
                      ]}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.packaging?.primaryPackaging && (
                          <Text style={styles.itemPackaging}>
                            {item.packaging.primaryPackaging.description}
                            {item.packaging.primaryPackaging.quantity && item.packaging.primaryPackaging.unit && (
                              ` ${item.packaging.primaryPackaging.quantity} ${item.packaging.primaryPackaging.unit}`
                            )}
                            {item.packaging.totalPrimaryPackages !== undefined && (
                              ` • ${item.packaging.totalPrimaryPackages.toLocaleString()} packages`
                            )}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.cardButtonContainer}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleOrderNow(group.thirdPartyName, group.items)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardActionButtonText}>Order now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleDeleteOrder(group.thirdPartyName, group.items)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardActionButtonText}>Delete Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
    paddingTop: 24,
  },
  listContainer: {
    gap: 16,
  },
  supplierCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsList: {
    gap: 12,
    marginBottom: 16,
  },
  itemRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  itemPackaging: {
    fontSize: 12,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    lineHeight: 16,
  },
  cardButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cardActionButton: {
    flex: 1,
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionButtonText: {
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
})

