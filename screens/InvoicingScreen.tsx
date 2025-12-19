// Invoicing screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

type Props = NativeStackScreenProps<AppDrawerParamList, 'Invoicing'>

type NavigationProp = CompositeNavigationProp<
  DrawerNavigationProp<AppDrawerParamList, 'Invoicing'>,
  StackNavigationProp<TransactionsStackParamList>
>

export default function InvoicingScreen({ navigation }: Props) {
  useModuleTracking('invoicing')
  useModuleGroupTracking('sales_marketing')

  const handleCreateInvoice = () => {
    // Navigate through MainTabs to Transactions stack, then to CreateInvoice
    navigation.navigate('MainTabs', {
      screen: 'Transactions',
      params: {
        screen: 'CreateInvoice',
      },
    })
  }

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Invoicing">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Management</Text>
            <Text style={styles.sectionDescription}>
              Create, manage, and track invoices for your customers.
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleCreateInvoice}
            activeOpacity={0.7}
          >
            <Text style={styles.actionCardTitle}>Create New Invoice</Text>
            <Text style={styles.actionCardSubtitle}>Generate a new invoice for a customer</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Invoicing features include:
            </Text>
            <Text style={styles.infoBullet}>• Create and send invoices</Text>
            <Text style={styles.infoBullet}>• Track invoice status</Text>
            <Text style={styles.infoBullet}>• PDF generation</Text>
            <Text style={styles.infoBullet}>• Payment tracking</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  infoText: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 12,
    lineHeight: 22,
  },
  infoBullet: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    paddingLeft: 8,
    lineHeight: 20,
  },
})

