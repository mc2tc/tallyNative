// Financial Services screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { TallyNetworkBottomNav } from '../components/TallyNetworkBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'FinancialServices'>

const financialServices = [
  { title: 'Borrowing from Friends & Family', subtitle: 'Flexible terms from personal connections' },
  { title: 'Business Credit Cards & Overdrafts', subtitle: 'Quick access to working capital' },
  { title: 'Invoice Financing', subtitle: 'Get paid immediately on outstanding invoices' },
  { title: 'Trade Credit', subtitle: 'Deferred payment terms with suppliers' },
  { title: 'Merchant Cash Advance', subtitle: 'Advance based on future card sales' },
  { title: 'Asset Finance', subtitle: 'Finance equipment and machinery purchases' },
  { title: 'Lease Financing', subtitle: 'Rent equipment with option to purchase' },
  { title: 'Hire Purchase', subtitle: 'Buy assets with regular payments' },
  { title: 'Medium Term Business Loans', subtitle: 'Fixed-term funding for growth' },
]

export default function FinancialServicesScreen({ navigation }: Props) {
  useModuleTracking('financialServices')
  useModuleGroupTracking('tally_network')
  const handleServicePress = (serviceTitle: string) => {
    if (serviceTitle === 'Invoice Financing') {
      navigation.navigate('InvoiceFinancing')
    }
  }

  return (
    <View style={styles.wrapper}>
      <AppBarLayout>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {financialServices.map((service, index) => (
            <TouchableOpacity
              key={index}
              style={styles.serviceCard}
              activeOpacity={0.7}
              onPress={() => handleServicePress(service.title)}
            >
              <Text style={styles.serviceText}>{service.title}</Text>
              <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TallyNetworkBottomNav />
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
    paddingBottom: 80, // Extra padding for bottom nav
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  serviceText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
  },
})

