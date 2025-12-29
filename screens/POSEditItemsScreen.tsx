// POS Edit Items screen
import React, { useState, useCallback, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { getOneOffItems, updateOneOffItem, deleteOneOffItem, type OneOffItem } from '../lib/utils/posStorage'
import { inventoryApi, type InventoryItem } from '../lib/api/inventory'
import { useAuth } from '../lib/auth/AuthContext'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type POSEditItemsScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList, 'POSEditItems'>

interface EditableItem {
  id: string
  name: string
  price: number
  isInventoryItem: boolean
  packagingQuantity?: number
  packagingUnit?: string
}

export default function POSEditItemsScreen() {
  const navigation = useNavigation<POSEditItemsScreenNavigationProp>()
  const { businessUser, memberships } = useAuth()
  const [items, setItems] = useState<EditableItem[]>([])
  const [loading, setLoading] = useState(true)
  // Store edited values for each item by ID
  const [editedValues, setEditedValues] = useState<Record<string, { name: string; price: string }>>({})

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      // Load one-off items
      const oneOffItems = await getOneOffItems()
      const oneOffEditableItems: EditableItem[] = oneOffItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        isInventoryItem: false,
      }))

      // Load Finished Goods inventory items
      let inventoryEditableItems: EditableItem[] = []
      if (businessId) {
        try {
          const inventoryResponse = await inventoryApi.getInventoryItems(businessId, {
            debitAccount: 'Finished Goods',
            page: 1,
            limit: 500,
            screen: 'inventory',
          })
          
          inventoryEditableItems = inventoryResponse.items
            .filter(item => item.packaging?.primaryPackaging?.quantity && item.packaging?.primaryPackaging?.unit)
            .map(item => ({
              id: item.id,
              name: item.name,
              price: item.costPerPrimaryPackage || (item.packaging?.totalPrimaryPackages ? item.amount / item.packaging.totalPrimaryPackages : item.amount),
              isInventoryItem: true,
              packagingQuantity: item.packaging?.primaryPackaging?.quantity,
              packagingUnit: item.packaging?.primaryPackaging?.unit,
            }))
        } catch (error) {
          console.error('Failed to load inventory items:', error)
        }
      }

      const allItems = [...oneOffEditableItems, ...inventoryEditableItems]
      setItems(allItems)
      
      // Initialize edited values with current item values
      const initialValues: Record<string, { name: string; price: string }> = {}
      allItems.forEach(item => {
        initialValues[item.id] = {
          name: item.name,
          price: item.price.toFixed(2),
        }
      })
      setEditedValues(initialValues)
    } catch (error) {
      console.error('Failed to load items:', error)
      Alert.alert('Error', 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      loadItems()
    }, [loadItems])
  )

  const handleNameChange = (itemId: string, value: string) => {
    setEditedValues(prev => {
      const current = prev[itemId] || { name: '', price: '0.00' }
      return {
        ...prev,
        [itemId]: {
          ...current,
          name: value,
        },
      }
    })
  }

  const handlePriceChange = (itemId: string, value: string) => {
    setEditedValues(prev => {
      const current = prev[itemId] || { name: '', price: '0.00' }
      return {
        ...prev,
        [itemId]: {
          ...current,
          price: value,
        },
      }
    })
  }

  const handleDelete = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || item.isInventoryItem) return

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOneOffItem(itemId)
              await loadItems()
            } catch (error) {
              console.error('Failed to delete item:', error)
              Alert.alert('Error', 'Failed to delete item')
            }
          },
        },
      ]
    )
  }

  return (
    <AppBarLayout title="Edit Items" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items available</Text>
          </View>
        ) : (
          items.map((item) => {
            const editedValue = editedValues[item.id] || { name: item.name, price: item.price.toFixed(2) }
            const isReadOnly = item.isInventoryItem
            
            return (
              <View key={item.id} style={styles.itemCard}>
                {item.packagingQuantity && item.packagingUnit && (
                  <Text style={styles.itemPackaging}>
                    {item.packagingQuantity} {item.packagingUnit}
                  </Text>
                )}
                {item.isInventoryItem && (
                  <Text style={styles.inventoryLabel}>Inventory Item</Text>
                )}
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Name</Text>
                  {isReadOnly ? (
                    <Text style={[styles.textInput, styles.textInputReadOnly, { paddingVertical: 10 }]}>
                      {editedValue.name}
                    </Text>
                  ) : (
                    <TextInput
                      style={styles.textInput}
                      value={editedValue.name}
                      onChangeText={(value) => handleNameChange(item.id, value)}
                      placeholder="Item name"
                      placeholderTextColor={GRAYSCALE_SECONDARY}
                    />
                  )}
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Price</Text>
                  {isReadOnly ? (
                    <Text style={[styles.textInput, styles.textInputReadOnly, { paddingVertical: 10 }]}>
                      {editedValue.price}
                    </Text>
                  ) : (
                    <TextInput
                      style={styles.textInput}
                      value={editedValue.price}
                      onChangeText={(value) => handlePriceChange(item.id, value)}
                      placeholder="0.00"
                      placeholderTextColor={GRAYSCALE_SECONDARY}
                      keyboardType="decimal-pad"
                    />
                  )}
                </View>
                
                {!item.isInventoryItem && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  itemCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  itemPackaging: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 8,
  },
  inventoryLabel: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: SURFACE_BACKGROUND,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cc0000',
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  textInputReadOnly: {
    backgroundColor: SURFACE_BACKGROUND,
    color: GRAYSCALE_SECONDARY,
  },
})

