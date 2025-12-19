// Inventory Management screen

import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import { OrderCard } from '../components/OrderCard'
import { OrderDetailsCard } from '../components/OrderDetailsCard'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'InventoryManagement'>

export default function InventoryManagementScreen({}: Props) {
  useModuleGroupTracking('operations')
  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Inventory">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <OrderCard 
            supplierName="Trethewy's Baking Supplies" 
            isTallyNetwork={true}
          />
          <OrderDetailsCard
            items={[
              { name: 'Bread Flour', quantity: 50, unit: 'kg', pricePerUnit: 2.0 },
              { name: 'Suet', quantity: 10, unit: 'kg', pricePerUnit: 8.5 },
            ]}
            onOrderPress={() => {
              // Handle order action
            }}
          />
        </ScrollView>
      </AppBarLayout>
      <BottomNavBar />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
})

