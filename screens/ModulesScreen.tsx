// Modules screen - displays available operating modules

import React, { useState, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { useFocusEffect } from '@react-navigation/native'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList, 'Modules'>

// Module categories and their modules
const MODULE_CATEGORIES = [
  {
    name: 'Operations',
    modules: [
      { id: 'inventory', name: 'Inventory', route: 'InventoryManagement' },
      { id: 'production', name: 'Production', route: 'ProductionManagement' },
      { id: 'pos', name: 'Point of Sale', route: 'PointOfSale' },
    ],
  },
  {
    name: 'Sales & Marketing',
    modules: [
      { id: 'online-sales', name: 'Online Sales', route: 'OnlineSales' },
      { id: 'online-booking', name: 'Online Booking', route: 'OnlineBooking' },
    ],
  },
  {
    name: 'Procurement',
    modules: [
      { id: 'tally-network', name: 'Tally Network', route: 'TallyNetwork' },
    ],
  },
  {
    name: 'People',
    modules: [
      { id: 'employees', name: 'Employees', route: 'EmployeeManagement' },
    ],
  },
  {
    name: 'Finance & Compliance',
    modules: [
      { id: 'financial-services', name: 'Financial Services', route: 'FinancialServices' },
      { id: 'year-end-reporting', name: 'Year End Reporting', route: 'YearEndReporting' },
    ],
  },
]

export default function ModulesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { businessUser } = useAuth()
  const [loading, setLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      // Future: Fetch enabled modules for current plan
      setLoading(false)
    }, []),
  )

  const handleModulePress = (route: string) => {
    // Navigate to the module's screen
    navigation.navigate(route as any)
  }

  if (loading) {
    return (
      <AppBarLayout title="Operating Modules" onBackPress={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333333" />
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title="Operating Modules" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Manage and access your available operating modules. Modules are grouped by category.
        </Text>

        {MODULE_CATEGORIES.map((category) => (
          <View key={category.name} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            {category.modules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={styles.moduleCard}
                onPress={() => handleModulePress(module.route)}
                activeOpacity={0.7}
              >
                <Text style={styles.moduleName}>{module.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 24,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  moduleName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
})

