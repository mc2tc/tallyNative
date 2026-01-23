// Payroll screen - placeholder for now

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'

export default function TransactionsPayrollScreen() {
  return (
    <AppBarLayout title="Transactions">
      <View style={styles.container}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>Payroll transactions coming soon</Text>
        </View>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  placeholderCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
})

