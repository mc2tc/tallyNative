// Payroll screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'Payroll'>

export default function PayrollScreen({ navigation }: Props) {
  useModuleTracking('payroll')
  useModuleGroupTracking('people')

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Payroll">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payroll Management</Text>
            <Text style={styles.sectionDescription}>
              Process employee payroll, manage salaries, and handle payroll-related compliance.
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Payroll features will be available here, including:
            </Text>
            <Text style={styles.infoBullet}>• Employee salary processing</Text>
            <Text style={styles.infoBullet}>• Tax calculations and deductions</Text>
            <Text style={styles.infoBullet}>• Payslip generation</Text>
            <Text style={styles.infoBullet}>• Payroll reporting and compliance</Text>
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

