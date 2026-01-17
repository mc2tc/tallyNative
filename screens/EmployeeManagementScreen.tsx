// Employee Management screen - Work In Progress

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'EmployeeManagement'>

export default function EmployeeManagementScreen({}: Props) {
  useModuleTracking('employees')
  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Employees">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.wipText}>Work in progress</Text>
        </ScrollView>
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
  wipText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})

