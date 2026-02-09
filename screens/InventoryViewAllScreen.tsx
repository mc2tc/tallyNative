// View all screen for inventory items
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native'
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
  currentStockOfPrimaryPackages?: number // Current stock count in primary packages
  currentStockInPrimaryUnits?: number    // Current stock count in primary packaging units
  currentStockInMetric?: {
    stock: number
    unit: string
  }
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
  const [hoveredDropTargetId, setHoveredDropTargetId] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryViewAllItem[]>(routeItems || [])
  const [loading, setLoading] = useState(true) // Always start with loading state
  const [infoCardDismissed, setInfoCardDismissed] = useState(false)
  const lastFetchedSectionRef = useRef<string | null>(null)

  // Fetch items function - extracted to be reusable
  const fetchItems = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }

    // For Receiving, fetch fresh transaction data and filter out confirmed items
    if (section === 'Receiving') {
      try {
        setLoading(true)
        // Fetch all transactions for "Receiving" items (Inventory)
        const response = await transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 500,
        })
        
        // Extract items from transactions for "Receiving" section (Inventory)
        const receiving: InventoryViewAllItem[] = []

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
            // Include all items with debitAccount === 'Inventory'
            if (item.debitAccount === 'Inventory') {
              const currency = tx.summary?.currency || 'GBP'
              const itemId = `${tx.id}-${index}`

              receiving.push({
                id: itemId,
                title: item.name,
                amount: formatAmount(item.amount, currency, true),
                currency,
                transactionDate, // Store transaction date for sorting
                transactionItem: {
                  name: item.name,
                  amount: item.amount,
                  currency,
                  transactionId: tx.id,
                  itemIndex: index,
                  quantity: item.quantity,
                  unit: item.unit,
                  debitAccount: item.debitAccount,
                },
              })
            }
          })
        })

        // Sort by transaction date (most recent first)
        receiving.sort((a, b) => (b.transactionDate || 0) - (a.transactionDate || 0))

        console.log(`[Receiving] Fetched ${receiving.length} items with debitAccount === 'Inventory'`)
        
        setItems(receiving)
        lastFetchedSectionRef.current = section
      } catch (error) {
        console.error('Failed to fetch receiving items:', error)
        // Fallback to route items if fetch fails, or if no items found
        const fallbackItems = routeItems && routeItems.length > 0 ? routeItems : []
        setItems(fallbackItems)
        if (fallbackItems.length === 0) {
          Alert.alert('Error', 'Failed to load items. Please try again.')
        }
      } finally {
        setLoading(false)
      }
      return
    }

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
      // Filter out Water items
      const viewAllItems: InventoryViewAllItem[] = response.items
        .filter((item: InventoryItem) => item.name?.toLowerCase() !== 'water')
        .map((item: InventoryItem) => {
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
            currentStockOfPrimaryPackages: item.currentStockOfPrimaryPackages,
            currentStockInPrimaryUnits: item.currentStockInPrimaryUnits,
            currentStockInMetric: item.currentStockInMetric,
            currency,
          }
        })

      setItems(viewAllItems)
      lastFetchedSectionRef.current = section
    } catch (error) {
      console.error('Failed to fetch inventory items for View All:', error)
      Alert.alert('Error', 'Failed to load items. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId, section, routeItems])

  // Fetch items for all sections (Receiving, Raw Materials, and Finished Goods)
  useEffect(() => {
    if (!businessId) {
      return
    }

    // Clear items when section changes (before fetching new ones)
    if (lastFetchedSectionRef.current !== null && lastFetchedSectionRef.current !== section) {
      setItems([])
    }

    // Force refresh on initial load by clearing the cache reference
    lastFetchedSectionRef.current = null
    fetchItems()
  }, [businessId, section, fetchItems]) // Refetch when businessId or section changes

  // Refetch when screen comes into focus (e.g., after returning from stock-take or detail screen)
  useFocusEffect(
    useCallback(() => {
      if (businessId) {
        // Force refetch to get latest data by resetting the cache check
        lastFetchedSectionRef.current = null
        fetchItems()
      }
    }, [fetchItems, section, businessId])
  )

  // Clear hover state when dragging stops
  useEffect(() => {
    if (!draggingItemId) {
      setHoveredDropTargetId(null)
    }
  }, [draggingItemId])

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

  // Helper function to format stock display for inventory items
  const formatStockDisplay = useCallback((item: InventoryViewAllItem): string => {
    // Only format stock for received items (Raw Materials or Finished Goods), not Receiving items
    if (section === 'Receiving' || !item.inventoryItem) {
      return ''
    }

    const formatStockValue = (value: number | undefined | null) => {
      if (value === undefined || value === null) return ''
      const numericValue = Number(value)
      if (Number.isNaN(numericValue)) return ''
      return numericValue.toFixed(2)
    }

    // Priority 1: Use currentStockInMetric if available
    if (item.currentStockInMetric) {
      const formattedStock = formatStockValue(item.currentStockInMetric.stock)
      if (!formattedStock) return ''
      return `${formattedStock} ${item.currentStockInMetric.unit}`
    }

    // Priority 2: Use currentStockInPrimaryUnits with primaryPackagingUnit
    if (item.currentStockInPrimaryUnits !== undefined && item.primaryPackagingUnit) {
      const formattedStock = formatStockValue(item.currentStockInPrimaryUnits)
      if (!formattedStock) return ''
      return `${formattedStock} ${item.primaryPackagingUnit}`
    }

    // No stock data available
    return ''
  }, [section])

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
          previousScreen: 'InventoryViewAll',
        })
      }
    },
    [businessId, navigation, section, title, filteredItems],
  )

  // Helper function to convert a word to singular form
  // Matches backend implementation in src/app/authenticated/transactions3/api/inventory-items/group/route.ts
  const toSingular = useCallback((word: string): string => {
    if (!word || word.length < 2) return word // Too short to be a plural

    const lowerWord = word.toLowerCase()

    // Common irregular plurals dictionary (checked first)
    const irregular: Record<string, string> = {
      potatoes: 'potato',
      tomatoes: 'tomato',
      heroes: 'hero',
      echoes: 'echo',
      vetoes: 'veto',
    }

    if (irregular[lowerWord]) {
      return irregular[lowerWord]
    }

    // Words ending in 'ies' (cities -> city, berries -> berry)
    if (word.length > 3 && word.endsWith('ies')) {
      return word.slice(0, -3) + 'y'
    }

    // Words ending in 'ves' (leaves -> leaf, knives -> knife, lives -> life)
    if (word.length > 3 && word.endsWith('ves')) {
      // Common irregular cases
      if (lowerWord === 'leaves') return word.slice(0, -5) + 'leaf'
      if (lowerWord === 'knives') return word.slice(0, -5) + 'knife'
      if (lowerWord === 'lives') return word.slice(0, -5) + 'life'
      // Default: remove 'ves' and add 'f' (shelves -> shelf)
      return word.slice(0, -3) + 'f'
    }

    // Words ending in 'es' after 's', 'x', 'z', 'ch', 'sh' (boxes -> box, dishes -> dish)
    if (word.length > 4 && word.endsWith('es')) {
      const beforeEs = word.slice(0, -2)
      if (
        beforeEs.endsWith('s') ||
        beforeEs.endsWith('x') ||
        beforeEs.endsWith('z') ||
        beforeEs.endsWith('ch') ||
        beforeEs.endsWith('sh')
      ) {
        return beforeEs
      }
      // FIX: For words ending in 'es' that don't match the pattern above,
      // remove just the 's' (e.g., swedes -> swede, apples -> apple)
      return word.slice(0, -1)
    }

    // Words ending in 's' but not 'ss', 'us', 'is', 'es', or already processed endings
    // This handles: onions -> onion, apples -> apple (potatoes handled above)
    // FIX: Use length > 3 to avoid breaking short words like "yes", "is", "us"
    if (
      word.length > 3 &&
      word.endsWith('s') &&
      !word.endsWith('ss') &&
      !word.endsWith('us') &&
      !word.endsWith('is') &&
      !word.endsWith('ies') &&
      !word.endsWith('ves')
    ) {
      return word.slice(0, -1)
    }

    return word
  }, [])

  // Helper function to normalize item names for fuzzy matching
  // Removes parenthetical content, quoted content, common descriptive words, normalizes whitespace, and handles plurals
  const normalizeNameForMatching = useCallback((name: string): string => {
    if (!name) return ''
    
    // Convert to lowercase and trim
    let normalized = name.toLowerCase().trim()
    
    // Remove parenthetical content (e.g., "(Large Sacks)", "(Top-up)", "(Washed)")
    normalized = normalized.replace(/\s*\([^)]*\)/g, '')
    
    // Remove quoted content (e.g., "Maris Piper", 'some text')
    normalized = normalized.replace(/\s*["'][^"']*["']/g, '')
    
    // Remove common descriptive words that don't affect product identity
    const descriptiveWords = [
      'bulk', 'large', 'small', 'medium', 'top-up', 'top up',
      'sack', 'sacks', 'bag', 'bags', 'box', 'boxes', 'pack', 'packs',
      'of', 'the', 'a', 'an'
    ]
    descriptiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      normalized = normalized.replace(regex, '')
    })
    
    // Normalize whitespace (multiple spaces to single space)
    normalized = normalized.replace(/\s+/g, ' ').trim()
    
    // Convert plurals to singular: split into words, convert each to singular, rejoin
    const words = normalized.split(/\s+/).filter(word => word.length > 0)
    const singularWords = words.map(word => toSingular(word))
    normalized = singularWords.join(' ').trim()
    
    return normalized
  }, [toSingular])

  // Check if two items can be grouped together (fuzzy name match and same packaging unit)
  const canGroupItems = useCallback((draggedItem: InventoryViewAllItem, targetItem: InventoryViewAllItem): boolean => {
    if (!draggedItem || !targetItem) {
      return false
    }

    // Don't match if it's the same item
    if (draggedItem.id === targetItem.id) {
      return false
    }

    // Check if items have a fuzzy name match
    const draggedNameNormalized = normalizeNameForMatching(draggedItem.title)
    const targetNameNormalized = normalizeNameForMatching(targetItem.title)
    const fuzzyNameMatch = draggedNameNormalized === targetNameNormalized && draggedNameNormalized.length > 0

    // Check if items have the same primaryPackaging unit
    const samePackagingUnit = Boolean(
      draggedItem.primaryPackagingUnit && 
      targetItem.primaryPackagingUnit &&
      draggedItem.primaryPackagingUnit === targetItem.primaryPackagingUnit
    )

    return fuzzyNameMatch && samePackagingUnit
  }, [normalizeNameForMatching])

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

      // Clear hover state
      setHoveredDropTargetId(null)

      if (!draggedItem || !targetItemData) {
        console.log(`[Drag Debug] Missing item data, returning`)
        return
      }

      // Use the extracted canGroupItems function
      if (canGroupItems(draggedItem, targetItemData)) {
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
          .then(async (response) => {
            console.log('[Drag Debug] Group API success:', response)
            // Clear dragging state
            setDraggingItemId(null)
            setHoveredDropTargetId(null)
            // Clear the cached section to force a refresh
            lastFetchedSectionRef.current = null
            // Refresh the items list
            try {
              await fetchItems()
              Alert.alert('Success', 'Items grouped successfully')
            } catch (error) {
              console.error('[Drag Debug] Error refreshing after group:', error)
              Alert.alert('Success', 'Items grouped successfully, but failed to refresh the list')
            }
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
    [canGroupItems, businessId, fetchItems],
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
        {/* Explainer Card - only show for Raw Materials (not Receiving or Finished Goods) */}
        {!infoCardDismissed && section === 'Raw Materials' && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoCardTextContainer}>
                <Text style={styles.infoCardTitle}>Group Similar Items</Text>
                <Text style={styles.infoCardBody}>
                  Drag and drop items with a similar name and primary packaging unit to group them together.
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
              
              // Check if this item is a valid drop target for the currently dragged item
              const draggedItem = draggingItemId ? filteredItems.find(i => i.id === draggingItemId) : null
              const isValidDropTarget = draggedItem && draggingItemId !== item.id && canGroupItems(draggedItem, item)
              const isHoveredDropTarget = hoveredDropTargetId === item.id && isValidDropTarget
              const isDragging = draggingItemId === item.id
              
              // Compute stock display for received items
              const stockDisplay = isReceivedItem ? formatStockDisplay(item) : ''
              
              const cardContent = (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    isValidDropTarget && styles.listItemValidDropTarget,
                    isHoveredDropTarget && styles.listItemHoveredDropTarget,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemTextGroup}>
                    {/* Third party name and date on one line */}
                    {isReceivedItem && !isGroupedItem && (item.thirdPartyName || item.transactionDate) && (
                      <View style={styles.thirdPartyDateRow}>
                        {item.thirdPartyName && (
                          <Text style={styles.itemThirdPartyName}>{item.thirdPartyName}</Text>
                        )}
                        {item.transactionDate && (
                          <Text style={styles.itemTransactionDate}>
                            {new Date(item.transactionDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Text>
                        )}
                      </View>
                    )}
                    {/* Item title (name) */}
                    <View style={styles.titleRow}>
                      <View style={styles.titleWithIcon}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {isGroupedItem && (
                          <Octicons name="stack" size={16} color={GRAYSCALE_SECONDARY} style={styles.stackIcon} />
                        )}
                      </View>
                    </View>
                    {/* Reference on separate line if exists */}
                    {isReceivedItem && !isGroupedItem && item.reference && (
                      <Text style={styles.itemReference}>{item.reference}</Text>
                    )}
                     {isReceivedItem && stockDisplay && (
                       <View style={[styles.labelValueRow, isGroupedItem && styles.labelValueRowGrouped]}>
                        <Text style={styles.itemSubtitleLabel}>Current stock</Text>
                        <Text style={styles.itemSubtitleValue}>{stockDisplay}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )

              // Only enable drag and drop for Raw Materials, not Receiving or Finished Goods
              const isDraggable = section === 'Raw Materials'
              
              if (isDraggable) {
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.droppableWrapper,
                      isDragging && styles.droppableWrapperDragging,
                      isValidDropTarget && styles.droppableWrapperValidTarget,
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
                          // Clear hover state when drag ends
                          setHoveredDropTargetId(null)
                        }}
                      >
                        {cardContent}
                      </Draggable>
                    </Droppable>
                  </View>
                )
              } else {
                // For Receiving items, render without drag/drop functionality
                return (
                  <View 
                    key={item.id} 
                    style={styles.droppableWrapper}
                  >
                    {cardContent}
                  </View>
                )
              }
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
  droppableWrapperValidTarget: {
    // Style for droppable wrappers that are valid drop targets
  },
  listItem: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listItemValidDropTarget: {
    // Style for items that are valid drop targets (when something is being dragged)
    borderWidth: 2,
    borderColor: '#b0b0b0',
    backgroundColor: '#f8f8f8',
    borderStyle: 'dashed',
  },
  listItemHoveredDropTarget: {
    // Style when hovering over a valid drop target
    borderWidth: 2,
    borderColor: GRAYSCALE_PRIMARY,
    backgroundColor: '#f0f0f0',
    borderStyle: 'solid',
  },
  itemTextGroup: {
    flex: 1,
  },
  thirdPartyDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemThirdPartyName: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
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
    flexShrink: 0,
    textAlign: 'right',
  },
  itemReference: {
    fontSize: 11,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
    marginTop: 2,
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
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GRAYSCALE_SECONDARY,
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

