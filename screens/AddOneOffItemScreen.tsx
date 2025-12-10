// Add One-off Item screen for POS
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { saveOneOffItem } from '../lib/utils/posStorage'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type AddOneOffItemScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList, 'AddOneOffItem'>

export default function AddOneOffItemScreen() {
  const navigation = useNavigation<AddOneOffItemScreenNavigationProp>()
  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert('Required Field', 'Please enter an item name.')
      return
    }

    if (!price.trim()) {
      Alert.alert('Required Field', 'Please enter a price.')
      return
    }

    const priceValue = parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Save to local storage
      const savedItem = await saveOneOffItem({
        name: itemName.trim(),
        price: priceValue,
        description: description.trim() || undefined,
      })

      console.log('One-off item saved locally:', savedItem)

      Alert.alert(
        'Success',
        'One-off item created and saved locally!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error) {
      console.error('Failed to create one-off item:', error)
      Alert.alert('Error', 'Failed to save one-off item. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppBarLayout title="Add One-off Item" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Item Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={styles.input}
              value={itemName}
              onChangeText={setItemName}
              placeholder="Enter item name"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price *</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>£</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter item description"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Item'}
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#efefef',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
  },
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
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
})

