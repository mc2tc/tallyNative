// Order card component for Inventory screen

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface OrderCardProps {
  supplierName: string
  isTallyNetwork: boolean
}

export function OrderCard({ supplierName, isTallyNetwork }: OrderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>{supplierName}</Text>
          <Text style={styles.address}>12 Harbour Road, Newlyn, Cornwall, UK</Text>
          <Text style={styles.telephone}>+44 1736 123456</Text>
          {isTallyNetwork && (
            <View style={styles.networkBadge}>
              <Text style={styles.networkText}>Tally Network</Text>
            </View>
          )}
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  address: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
    marginBottom: 2,
  },
  telephone: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
    marginBottom: 8,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 4,
  },
  networkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333333',
  },
})

