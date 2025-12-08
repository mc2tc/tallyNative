// Order details card component for Inventory screen

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

interface OrderItem {
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
}

interface OrderDetailsCardProps {
  items: OrderItem[]
  onOrderPress?: () => void
}

export function OrderDetailsCard({ items, onOrderPress }: OrderDetailsCardProps) {
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order Details</Text>
      
      <View style={styles.itemsContainer}>
        {items.map((item, index) => {
          const itemTotal = item.quantity * item.pricePerUnit
          return (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} × £{item.pricePerUnit.toFixed(2)}/{item.unit}
                </Text>
              </View>
              <Text style={styles.itemTotal}>£{itemTotal.toFixed(2)}</Text>
            </View>
          )
        })}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>£{calculateTotal().toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={styles.orderButton}
        onPress={onOrderPress}
        activeOpacity={0.7}
      >
        <Text style={styles.orderButtonText}>Order now via the Tally Network</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999999',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  orderButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})

