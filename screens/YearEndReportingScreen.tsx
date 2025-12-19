// Year End Reporting screen

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { BottomNavBar } from '../components/BottomNavBar'
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Year End Reports</Text>
            <Text style={styles.sectionDescription}>
              Generate comprehensive year-end financial reports and statements for your business.
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Year-end reporting features will be available here, including:
            </Text>
            <Text style={styles.infoBullet}>• Annual financial statements</Text>
            <Text style={styles.infoBullet}>• Tax preparation documents</Text>
            <Text style={styles.infoBullet}>• Compliance reports</Text>
            <Text style={styles.infoBullet}>• Year-over-year comparisons</Text>
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

