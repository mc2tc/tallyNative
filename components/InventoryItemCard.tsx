// Inventory item card component

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { AntDesign } from '@expo/vector-icons'
import type { InventoryItem } from '../lib/api/inventory'

interface InventoryItemCardProps {
  item: InventoryItem
  onButtonPress?: () => void
  onButtonBPress?: () => void
  onButtonCPress?: () => void
  onButtonDPress?: () => void
}

export function InventoryItemCard({ 
  item, 
  onButtonPress, 
  onButtonBPress, 
  onButtonCPress, 
  onButtonDPress 
}: InventoryItemCardProps) {
  // Determine if item is received (status is 'received' or undefined defaults to 'pending')
  // Explicitly check status - if undefined or 'pending', item is pending
  const isReceived = item.status === 'received'
  const isPending = !isReceived // status is 'pending' or undefined means pending

  return (
    <View style={styles.card}>
      <Text style={styles.itemName}>{item.name}</Text>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>
            {item.quantity} {item.unit}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unit Cost:</Text>
          <Text style={styles.detailValue}>
            £{item.unitCost?.toFixed(2) ?? '0.00'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.detailValue}>
            £{item.amount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Receiving Button - Standalone above segmented control */}
      <TouchableOpacity
        style={styles.receivingButton}
        onPress={onButtonPress}
        activeOpacity={0.8}
      >
        <Text style={styles.receivingButtonText}>Receiving</Text>
        {isReceived && (
          <AntDesign name="check-circle" size={18} color="#ffffff" style={styles.receivingButtonIcon} />
        )}
      </TouchableOpacity>

      {/* Segmented Control with 4 buttons */}
      <View style={styles.segmentedControlWrapper}>
        <TouchableOpacity
          style={[
            styles.segmentedButton, 
            { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
            isPending && styles.segmentedButtonDisabled
          ]}
          onPress={onButtonBPress}
          activeOpacity={isPending ? 1 : 0.7}
          disabled={isPending}
        >
          <Text style={[styles.segmentedButtonText, isPending && styles.segmentedButtonTextDisabled]} numberOfLines={1}>Stock-take</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentedButton, 
            { borderLeftWidth: 0.5, borderRightWidth: 0.5 },
            isPending && styles.segmentedButtonDisabled
          ]}
          onPress={onButtonCPress}
          activeOpacity={isPending ? 1 : 0.7}
          disabled={isPending}
        >
          <Text style={[styles.segmentedButtonText, isPending && styles.segmentedButtonTextDisabled]} numberOfLines={1}>Re-order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentedButton, 
            { borderLeftWidth: 0.5, borderRightWidth: 0.5 },
            isPending && styles.segmentedButtonDisabled
          ]}
          onPress={onButtonDPress}
          activeOpacity={isPending ? 1 : 0.7}
          disabled={isPending}
        >
          <Text style={[styles.segmentedButtonText, isPending && styles.segmentedButtonTextDisabled]} numberOfLines={1}>Re-sell</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentedButton, 
            { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
            isPending && styles.segmentedButtonDisabled
          ]}
          onPress={() => {}}
          activeOpacity={isPending ? 1 : 0.7}
          disabled={isPending}
        >
          <Text style={[styles.segmentedButtonText, isPending && styles.segmentedButtonTextDisabled]} numberOfLines={1}>Add SKU</Text>
        </TouchableOpacity>
      </View>
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
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  receivingButton: {
    backgroundColor: '#4a4a4a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    flexDirection: 'row',
  },
  receivingButtonIcon: {
    marginLeft: 8,
  },
  receivingButtonDisabled: {
    opacity: 0.5,
  },
  receivingButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  receivingButtonTextDisabled: {
    opacity: 0.7,
  },
  segmentedControlWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginTop: 12,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#e0e0e0',
  },
  segmentedButtonText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentedButtonDisabled: {
    opacity: 0.5,
  },
  segmentedButtonTextDisabled: {
    opacity: 0.6,
  },
})

