// Online Sales screen - Work In Progress

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'OnlineSales'>

export default function OnlineSalesScreen({}: Props) {
  useModuleTracking('commerce')
  useModuleGroupTracking('sales_marketing')
  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Online Sales">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.wipContainer}>
            <Text style={styles.wipTitle}>Work In Progress</Text>
            <Text style={styles.wipText}>
              Online Sales module is currently under development.
            </Text>
            <Text style={styles.wipSubtext}>
              This module will help you manage online sales channels, track e-commerce orders, and monitor online revenue streams.
            </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  wipContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#cccccc',
    maxWidth: 400,
    width: '100%',
  },
  wipTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  wipText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  wipSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
})

