// POS Edit Item screen - for editing a single item
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { inventoryApi } from '../lib/api/inventory'
import { updateOneOffItem, deleteOneOffItem } from '../lib/utils/posStorage'
import { useAuth } from '../lib/auth/AuthContext'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f0f0f0'

type POSEditItemScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList, 'POSEditItem'>
type POSEditItemScreenRouteProp = RouteProp<AppDrawerParamList, 'POSEditItem'>

export default function POSEditItemScreen() {
  const navigation = useNavigation<POSEditItemScreenNavigationProp>()
  const route = useRoute<POSEditItemScreenRouteProp>()
  const { product } = route.params
  const { businessUser, memberships } = useAuth()

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Initialize with POS product values if available, otherwise use default values
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState(product.price.toFixed(2))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const trimmedName = name.trim()
    const parsedPrice = parseFloat(price)

    if (!trimmedName) {
      Alert.alert('Error', 'Name cannot be empty')
      return
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Error', 'Please enter a valid price')
      return
    }

    if (!businessId) {
      Alert.alert('Error', 'Business ID not found')
      return
    }

    setSaving(true)
    try {
      if (product.isInventoryItem) {
        // Update inventory item POS product fields
        await inventoryApi.updatePOSProduct(product.id, {
          businessId,
          posProductName: trimmedName,
          posProductPrice: parsedPrice,
        })
      } else {
        // Update one-off item
        await updateOneOffItem(product.id, { name: trimmedName, price: parsedPrice })
      }
      
      Alert.alert('Success', 'Item updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error) {
      console.error('Failed to update item:', error)
      Alert.alert('Error', 'Failed to update item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (product.isInventoryItem) {
      Alert.alert('Info', 'Inventory items cannot be deleted from POS. They are managed through the Inventory system.')
      return
    }

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOneOffItem(product.id)
              Alert.alert('Success', 'Item deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ])
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
    <AppBarLayout title="Edit Item" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {product.packagingQuantity && product.packagingUnit && (
          <View style={styles.infoCard}>
            <Text style={styles.packagingInfo}>
              {product.packagingQuantity} {product.packagingUnit}
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            placeholderTextColor={GRAYSCALE_SECONDARY}
          />
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Price</Text>
          <TextInput
            style={styles.textInput}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={GRAYSCALE_SECONDARY}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color={CARD_BACKGROUND} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {!product.isInventoryItem && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
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
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  packagingInfo: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  inputRow: {
    marginBottom: 24,
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
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: CARD_BACKGROUND,
  },
  deleteButton: {
    backgroundColor: SURFACE_BACKGROUND,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#cc0000',
  },
})

