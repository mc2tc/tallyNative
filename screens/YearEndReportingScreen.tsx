// Year End Reporting screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { TaxComplianceBottomNav } from '../components/TaxComplianceBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'YearEndReporting'>

export default function YearEndReportingScreen({ navigation }: Props) {
  useModuleTracking('yearEndReporting')
  useModuleGroupTracking('tax_compliance')

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Year End Reporting">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.wipText}>Work in progress</Text>
        </ScrollView>
        <TaxComplianceBottomNav />
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

