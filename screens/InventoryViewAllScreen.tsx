// View all screen for inventory items
import React, { useCallback, useState, useMemo, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { Searchbar } from 'react-native-paper'
import { Octicons } from '@expo/vector-icons'
import { Draggable, Droppable, DraggableState } from 'react-native-reanimated-dnd'
import { AppBarLayout } from '../components/AppBarLayout'
import { formatAmount } from '../lib/utils/currency'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { Alert } from 'react-native'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'

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
    packaging?: {
      primaryPackaging?: {
        unit: string
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
  isGroupedItem?: boolean                 // true for grouped items (aggregated), false for regular items
  groupedItemIds?: string[]              // Array of inventory item IDs (only on grouped items)
}

type InventoryViewAllRouteParams = {
  title: string
  items: InventoryViewAllItem[]
  section: 'Receiving' | 'Raw Materials' | 'Finished Goods'
  businessId: string
}

type InventoryViewAllRouteProp = RouteProp<
  { InventoryViewAll: InventoryViewAllRouteParams } | { [key: string]: any },
  'InventoryViewAll'
>

export default function InventoryViewAllScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<InventoryViewAllRouteProp>()
  const { title, items: routeItems, section, businessId } = route.params || {
    title: 'View All',
    items: [],
    section: 'Receiving',
    businessId: '',
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryViewAllItem[]>(routeItems || [])
  const [loading, setLoading] = useState(section !== 'Receiving') // Only load for Raw Materials/Finished Goods
  const [hasFetched, setHasFetched] = useState(false)

  // Fetch items for Raw Materials and Finished Goods (View All shows both grouped and individual items)
  useEffect(() => {
    if (!businessId || section === 'Receiving') {
      // For Receiving, use items from route params (transaction items)
      setItems(routeItems || [])
      setLoading(false)
      return
    }

    // Only fetch once, unless businessId or section changes
    if (hasFetched && items.length > 0) {
      return
    }

    const fetchItems = async () => {
      try {
        setLoading(true)
        const debitAccount = section === 'Raw Materials' ? 'Raw Materials' : 'Finished Goods'
        
        // Use screen=viewAll to get both grouped items and individual items
        const response = await inventoryApi.getInventoryItems(businessId, {
          debitAccount,
          screen: 'viewAll',
          page: 1,
          limit: 100, // Get up to 100 items for View All
        })

        // Convert inventory items to InventoryViewAllItem format
        const viewAllItems: InventoryViewAllItem[] = response.items.map((item: InventoryItem) => {
          const currency = item.currency || 'GBP'
          return {
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
            currency,
          }
        })

        setItems(viewAllItems)
        setHasFetched(true)
      } catch (error) {
        console.error('Failed to fetch inventory items for View All:', error)
        Alert.alert('Error', 'Failed to load items. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [businessId, section]) // Removed 'loading' and 'items' from dependencies to prevent infinite loops

  const handleGoBack = () => {
    navigation.navigate('InventoryManagement' as never)
  }

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }
    const query = searchQuery.toLowerCase().trim()
    return items.filter((item: InventoryViewAllItem) => {
      const title = item.title.toLowerCase()
      const thirdPartyName = item.thirdPartyName?.toLowerCase() || ''
      const reference = item.reference?.toLowerCase() || ''
      return title.includes(query) || thirdPartyName.includes(query) || reference.includes(query)
    })
  }, [items, searchQuery])

  const handleItemPress = useCallback(
    (item: InventoryViewAllItem) => {
      if (!businessId) {
        return
      }

      // For "Receiving" items, navigate to ManageStock
      if (section === 'Receiving' && item.transactionItem) {
        const transactionItem = item.transactionItem

        // Construct itemText similar to TransactionDetailScreen: quantity unit name
        const parts: string[] = []
        if (transactionItem.quantity !== undefined) {
          parts.push(transactionItem.quantity.toString())
        }
        if (transactionItem.unit) {
          parts.push(transactionItem.unit)
        }
        parts.push(transactionItem.name)
        const itemText = parts.join(' ')

        navigation.navigate('ManageStock', {
          itemName: transactionItem.name,
          itemText,
          businessId,
          transactionId: transactionItem.transactionId,
          itemIndex: transactionItem.itemIndex,
          transactionItem: transactionItem,
        })
      } else {
        // For received items (Raw Materials or Finished Goods), navigate to detail screen
        ;(navigation as any).navigate('InventoryItemDetail', {
          item,
          section,
          businessId,
          viewAllTitle: title,
          viewAllItems: filteredItems,
        })
      }
    },
    [businessId, navigation, section, title, filteredItems],
  )

  // Handle drop event - check if items match
  // This function is called when an item is dropped on a droppable area
  // draggedItemData is the data from the Draggable that was dropped
  // targetItem is the item that this Droppable represents
  const createDropHandler = useCallback(
    (targetItem: InventoryViewAllItem) => (draggedItemData: InventoryViewAllItem) => {
      console.log(`[Drag Debug] Drop event triggered`)
      console.log(`[Drag Debug] Dragged item:`, draggedItemData.id, draggedItemData.title)
      console.log(`[Drag Debug] Target item:`, targetItem.id, targetItem.title)
      
      const draggedItem = draggedItemData
      const targetItemData = targetItem

      if (!draggedItem || !targetItemData) {
        console.log(`[Drag Debug] Missing item data, returning`)
        return
      }

      // Don't match if it's the same item
      if (draggedItem.id === targetItemData.id) {
        console.log(`[Drag Debug] Same item dropped on itself, returning`)
        return
      }

      // Check if items have the same name
      const sameName = draggedItem.title === targetItemData.title
      console.log(`[Drag Debug] Same name check:`, sameName, `"${draggedItem.title}" vs "${targetItemData.title}"`)

      // Check if items have the same primaryPackaging (description, quantity, unit)
      const draggedPackaging = {
        description: draggedItem.primaryPackagingDescription,
        quantity: draggedItem.primaryPackagingQuantity,
        unit: draggedItem.primaryPackagingUnit,
      }
      const targetPackaging = {
        description: targetItemData.primaryPackagingDescription,
        quantity: targetItemData.primaryPackagingQuantity,
        unit: targetItemData.primaryPackagingUnit,
      }
      console.log(`[Drag Debug] Dragged packaging:`, draggedPackaging)
      console.log(`[Drag Debug] Target packaging:`, targetPackaging)

      const samePackaging =
        draggedPackaging.description === targetPackaging.description &&
        draggedPackaging.quantity === targetPackaging.quantity &&
        draggedPackaging.unit === targetPackaging.unit
      console.log(`[Drag Debug] Same packaging check:`, samePackaging)

      if (sameName && samePackaging) {
        console.log('[Drag Debug] SUCCESS - Items match!')
        console.log('success')
        
        // Get the inventory item IDs (they might be in inventoryItem.id or the item.id itself)
        const draggedItemId = draggedItem.inventoryItem?.id || draggedItem.id
        const targetItemId = targetItemData.inventoryItem?.id || targetItemData.id
        
        if (!draggedItemId || !targetItemId) {
          console.log('[Drag Debug] Missing inventory item IDs, cannot group')
          Alert.alert('Error', 'Unable to group items: missing item IDs')
          return
        }
        
        if (!businessId) {
          console.log('[Drag Debug] Missing businessId, cannot group')
          Alert.alert('Error', 'Unable to group items: missing business ID')
          return
        }
        
        // Call the API to group the items
        console.log('[Drag Debug] Calling groupInventoryItems API', {
          businessId,
          inventoryItemIds: [draggedItemId, targetItemId],
        })
        
        inventoryApi
          .groupInventoryItems(businessId, [draggedItemId, targetItemId])
          .then((response) => {
            console.log('[Drag Debug] Group API success:', response)
            Alert.alert('Success', 'Items grouped successfully', [
              {
                text: 'OK',
                onPress: () => {
                  // TODO: Refresh the items list or navigate back
                  // For now, we'll just show the success message
                },
              },
            ])
          })
          .catch((error) => {
            console.error('[Drag Debug] Group API error:', error)
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'Failed to group items. Please try again.'
            Alert.alert('Error', errorMessage)
          })
      } else {
        console.log('[Drag Debug] Items do not match')
      }
    },
    [],
  )


  return (
    <AppBarLayout title={title} onBackPress={handleGoBack}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search items..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchInput}
          inputStyle={styles.searchInputText}
        />
      </View>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        nestedScrollEnabled={true}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.emptyText}>Loading items...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No items found' : 'No items to display'}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredItems.map((item: InventoryViewAllItem) => {
              // Check if this is a received item (Raw Materials or Finished Goods, not Receiving)
              const isReceivedItem = section !== 'Receiving' && (item.inventoryItem || item.costPerPrimaryPackage !== undefined)
              // Check if this is a grouped item (has groupedItemIds array)
              const isGroupedItem = item.groupedItemIds !== undefined && item.groupedItemIds.length > 0
              
              const cardContent = (
                <TouchableOpacity
                  style={styles.listItem}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextGroup}>
                    {/* Only show thirdPartyName and date/reference for non-grouped items */}
                    {isReceivedItem && !isGroupedItem && item.thirdPartyName && (
                      <Text style={styles.itemThirdPartyName}>{item.thirdPartyName}</Text>
                    )}
                    {isReceivedItem && !isGroupedItem && (item.transactionDate || item.reference) && (
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
                       <Text style={styles.itemTitle}>{item.title}</Text>
                       {isGroupedItem && (
                         <Octicons name="stack" size={16} color={GRAYSCALE_SECONDARY} style={styles.stackIcon} />
                       )}
                     </View>
                     {isReceivedItem && (item.totalPrimaryPackages !== undefined || (item.primaryPackagingDescription && item.primaryPackagingQuantity !== undefined && item.primaryPackagingUnit)) && (
                       <View style={[styles.labelValueRow, isGroupedItem && styles.labelValueRowGrouped]}>
                        <Text style={styles.itemSubtitleLabel}>
                          {item.totalPrimaryPackages !== undefined ? `Total primary packages` : ''}
                          {item.totalPrimaryPackages !== undefined && item.primaryPackagingDescription && item.primaryPackagingQuantity !== undefined && item.primaryPackagingUnit ? ': ' : ''}
                          {item.primaryPackagingDescription && item.primaryPackagingQuantity !== undefined && item.primaryPackagingUnit ? `${item.primaryPackagingDescription} ${item.primaryPackagingQuantity} ${item.primaryPackagingUnit}` : ''}
                        </Text>
                        {item.totalPrimaryPackages !== undefined && (
                          <Text style={styles.itemSubtitleValue}>
                            {item.totalPrimaryPackages.toLocaleString()} of {item.totalPrimaryPackages.toLocaleString()}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )

              const isDragging = draggingItemId === item.id
              if (isDragging) {
                console.log(`[Drag Debug] Rendering item ${item.id} with dragging styles (zIndex: 9999)`)
              }

              return (
                <View 
                  key={item.id} 
                  style={[
                    styles.droppableWrapper,
                    isDragging && styles.droppableWrapperDragging
                  ]}
                >
                  <Droppable
                    onDrop={createDropHandler(item)}
                  >
                    <Draggable 
                      data={item}
                      onStateChange={(state) => {
                        console.log(`[Drag Debug] Item ${item.id} (${item.title}) state changed:`, state, `current draggingItemId: ${draggingItemId}`)
                        if (state === DraggableState.DRAGGING) {
                          console.log(`[Drag Debug] Setting draggingItemId to: ${item.id}`)
                          setDraggingItemId(item.id)
                        } else if (state === DraggableState.IDLE || state === DraggableState.DROPPED) {
                          // Only clear if THIS item was the one being dragged
                          // Use functional update to get current state
                          setDraggingItemId((currentDraggingId) => {
                            if (currentDraggingId === item.id) {
                              console.log(`[Drag Debug] Clearing draggingItemId (was: ${currentDraggingId}) - this item was being dragged`)
                              return null
                            } else {
                              console.log(`[Drag Debug] Ignoring IDLE/DROPPED state for item ${item.id} - not the dragged item (current: ${currentDraggingId})`)
                              return currentDraggingId
                            }
                          })
                        }
                      }}
                      onDragStart={(data) => {
                        console.log(`[Drag Debug] Drag started for item:`, item.id, item.title, 'data:', data)
                      }}
                      onDragEnd={(data) => {
                        console.log(`[Drag Debug] Drag ended for item:`, item.id, item.title, 'data:', data)
                      }}
                    >
                      {cardContent}
                    </Draggable>
                  </Droppable>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
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
  },
  listContainer: {
    // Remove container styling to allow individual card spacing
  },
  droppableWrapper: {
    marginBottom: 12,
    zIndex: 1,
  },
  droppableWrapperDragging: {
    zIndex: 9999,
    elevation: 10,
  },
  listItem: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemTextGroup: {
    flex: 1,
  },
  itemThirdPartyName: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateReferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
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
  nameAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAYSCALE_SECONDARY,
    flex: 1,
  },
  stackIcon: {
    marginLeft: 8,
  },
  labelValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 3,
  },
  labelValueRowGrouped: {
    marginTop: 12, // Increased spacing for grouped items
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
  itemAmount: {
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
    fontSize: 13,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
  },
})

