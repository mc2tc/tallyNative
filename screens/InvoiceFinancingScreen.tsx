// Invoice Financing screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<AppDrawerParamList, 'InvoiceFinancing'>

export default function InvoiceFinancingScreen({}: Props) {
  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Invoice Financing">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.offerCard}>
            <Text style={styles.cardTitle}>Invoice Financing Offer</Text>
            <Text style={styles.supplierName}>CapitalFlow Solutions</Text>
            <View style={styles.offerRow}>
              <Text style={styles.offerLabel}>Advance Rate:</Text>
              <Text style={styles.offerValue}>Up to 90%</Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.offerLabel}>Fee:</Text>
              <Text style={styles.offerValue}>2.5% per invoice</Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.offerLabel}>Payment Terms:</Text>
              <Text style={styles.offerValue}>Immediate</Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.offerLabel}>Minimum Invoice:</Text>
              <Text style={styles.offerValue}>£1,000</Text>
            </View>
            <View style={styles.offerRow}>
              <Text style={styles.offerLabel}>Credit Check:</Text>
              <Text style={styles.offerValue}>Customer-based</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.description}>
              Get immediate payment on your outstanding invoices. Tally can organise invoice financing on your behalf, allowing you to access funds immediately rather than waiting for customer payment terms.
            </Text>
            <TouchableOpacity
              style={styles.learnMoreButton}
              activeOpacity={0.7}
            >
              <Text style={styles.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <BottomNavBar />
      </AppBarLayout>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  offerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#cccccc',
    position: 'relative',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
  },
  offerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  offerLabel: {
    fontSize: 15,
    color: '#666666',
    flex: 1,
  },
  offerValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 40,
  },
  learnMoreButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  learnMoreText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
})

