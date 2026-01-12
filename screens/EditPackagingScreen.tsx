// Edit Packaging screen - allows editing of packaging details
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { AppBarLayout } from '../components/AppBarLayout'
import type { PrimaryPackaging, SecondaryPackaging } from '../lib/api/packaging'

const GRAYSCALE_PRIMARY = '#4a4a4a'

type EditPackagingRouteProp =
  | RouteProp<AppDrawerParamList, 'EditPackaging'>
  | RouteProp<TransactionsStackParamList, 'EditPackaging'>
  | RouteProp<ScaffoldStackParamList, 'EditPackaging'>

export default function EditPackagingScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<EditPackagingRouteProp>()
  const { packaging, packagingType, onSave, onDelete, manageStockParams } = route.params
  const insets = useSafeAreaInsets()

  const [description, setDescription] = useState(packaging.description || '')
  const [quantity, setQuantity] = useState(packaging.quantity?.toString() || '')
  const [unit, setUnit] = useState((packaging as PrimaryPackaging).unit || '')
  const [primaryPackagesPerSecondary, setPrimaryPackagesPerSecondary] = useState(
    (packaging as SecondaryPackaging).primaryPackagesPerSecondary?.toString() || ''
  )
  const [saving, setSaving] = useState(false)

  const handleGoBack = () => {
    // Navigate back to ManageStock screen with params
    if (manageStockParams) {
      navigation.navigate('ManageStock' as never, manageStockParams as any)
    } else {
      navigation.goBack()
    }
  }

  const handleSave = () => {
    // Validate inputs
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a packaging type (e.g., bottle, can)')
      return
    }

    const quantityNum = parseFloat(quantity)
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity greater than 0')
      return
    }

    if (packagingType === 'primary' && !unit.trim()) {
      Alert.alert('Error', 'Please enter a unit (e.g., kg, L, pieces)')
      return
    }

    if (packagingType === 'secondary') {
      const primaryPackagesNum = parseFloat(primaryPackagesPerSecondary)
      if (isNaN(primaryPackagesNum) || primaryPackagesNum <= 0) {
        Alert.alert('Error', 'Please enter a valid number of primary packages per secondary')
        return
      }
    }

    setSaving(true)

    // Prepare updated packaging object
    let updatedPackaging: PrimaryPackaging | SecondaryPackaging
    if (packagingType === 'primary') {
      updatedPackaging = {
        description: description.trim(),
        quantity: quantityNum,
        unit: unit.trim(),
        material: (packaging as PrimaryPackaging).material,
      }
    } else {
      updatedPackaging = {
        description: description.trim(),
        quantity: quantityNum,
        primaryPackagesPerSecondary: parseFloat(primaryPackagesPerSecondary),
        material: (packaging as SecondaryPackaging).material,
      }
    }

    // Call the save callback
    onSave(updatedPackaging)
    setSaving(false)

    // Navigate back to ManageStock screen with params
    if (manageStockParams) {
      navigation.navigate('ManageStock' as never, manageStockParams as any)
    } else {
      navigation.goBack()
    }
  }

  const handleDelete = () => {
    if (!onDelete) return

    Alert.alert(
      'Delete Secondary Packaging',
      'Are you sure you want to delete the secondary packaging? This will remove it from the item.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete()
            // Navigate back to ManageStock screen with params
            if (manageStockParams) {
              navigation.navigate('ManageStock' as never, manageStockParams as any)
            } else {
              navigation.goBack()
            }
          },
        },
      ],
    )
  }

  const title = packagingType === 'primary' ? 'Edit Primary Packaging' : 'Edit Secondary Packaging'

  return (
    <AppBarLayout title={title} onBackPress={handleGoBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.formCard}>
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Type</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., bottle, can, box"
              placeholderTextColor="#888888"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Quantity</Text>
            <TextInput
              style={styles.textInput}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              placeholderTextColor="#888888"
              keyboardType="numeric"
            />
          </View>

          {packagingType === 'primary' && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Unit</Text>
              <TextInput
                style={styles.textInput}
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g., kg, L, pieces"
                placeholderTextColor="#888888"
              />
            </View>
          )}

          {packagingType === 'secondary' && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Primary Packages per Secondary</Text>
              <TextInput
                style={styles.textInput}
                value={primaryPackagesPerSecondary}
                onChangeText={setPrimaryPackagesPerSecondary}
                placeholder="e.g., 12"
                placeholderTextColor="#888888"
                keyboardType="numeric"
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Delete button for secondary packaging */}
        {packagingType === 'secondary' && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete-outline" size={20} color="#d32f2f" />
            <Text style={styles.deleteButtonText}>Delete Secondary Packaging</Text>
          </TouchableOpacity>
        )}
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
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d32f2f',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
})

