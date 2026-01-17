// Online Booking screen - Work In Progress

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { MarketingBottomNav } from '../components/MarketingBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'OnlineBooking'>

export default function OnlineBookingScreen({}: Props) {
  useModuleGroupTracking('sales_marketing')
  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Social">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.wipText}>Work in progress</Text>
        </ScrollView>
        <MarketingBottomNav />
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
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  wipText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})

