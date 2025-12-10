// Local storage utilities for POS items
import AsyncStorage from '@react-native-async-storage/async-storage'

export type OneOffItem = {
  id: string
  name: string
  price: number
  description?: string
  createdAt: number
}

const ONE_OFF_ITEMS_KEY = '@tally_pos_one_off_items'

/**
 * Get all one-off items from local storage
 */
export async function getOneOffItems(): Promise<OneOffItem[]> {
  try {
    const data = await AsyncStorage.getItem(ONE_OFF_ITEMS_KEY)
    if (!data) {
      return []
    }
    return JSON.parse(data) as OneOffItem[]
  } catch (error) {
    console.error('Failed to get one-off items from storage:', error)
    return []
  }
}

/**
 * Save a one-off item to local storage
 */
export async function saveOneOffItem(item: Omit<OneOffItem, 'id' | 'createdAt'>): Promise<OneOffItem> {
  try {
    const existingItems = await getOneOffItems()
    const newItem: OneOffItem = {
      ...item,
      id: `oneoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    }
    const updatedItems = [...existingItems, newItem]
    await AsyncStorage.setItem(ONE_OFF_ITEMS_KEY, JSON.stringify(updatedItems))
    return newItem
  } catch (error) {
    console.error('Failed to save one-off item to storage:', error)
    throw error
  }
}

/**
 * Delete a one-off item from local storage
 */
export async function deleteOneOffItem(itemId: string): Promise<void> {
  try {
    const existingItems = await getOneOffItems()
    const updatedItems = existingItems.filter(item => item.id !== itemId)
    await AsyncStorage.setItem(ONE_OFF_ITEMS_KEY, JSON.stringify(updatedItems))
  } catch (error) {
    console.error('Failed to delete one-off item from storage:', error)
    throw error
  }
}

/**
 * Update a one-off item in local storage
 */
export async function updateOneOffItem(itemId: string, updates: Partial<Omit<OneOffItem, 'id' | 'createdAt'>>): Promise<OneOffItem | null> {
  try {
    const existingItems = await getOneOffItems()
    const itemIndex = existingItems.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return null
    }
    const updatedItem = { ...existingItems[itemIndex], ...updates }
    const updatedItems = [...existingItems]
    updatedItems[itemIndex] = updatedItem
    await AsyncStorage.setItem(ONE_OFF_ITEMS_KEY, JSON.stringify(updatedItems))
    return updatedItem
  } catch (error) {
    console.error('Failed to update one-off item in storage:', error)
    throw error
  }
}

/**
 * Clear all one-off items from local storage
 */
export async function clearOneOffItems(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONE_OFF_ITEMS_KEY)
  } catch (error) {
    console.error('Failed to clear one-off items from storage:', error)
    throw error
  }
}

