// Taxes & Compliance screen - consolidated screen for tax and compliance features

import React from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function TaxesComplianceScreen() {
  const navigation = useNavigation<NavigationProp>()

  const menuItems = [
    {
      id: 'vat',
      title: 'VAT',
      description: 'Manage VAT registration and returns',
      icon: 'receipt-text' as keyof typeof MaterialIcons.glyphMap,
      route: 'VAT' as keyof AppDrawerParamList,
    },
    {
      id: 'year-end',
      title: 'Year End Reporting',
      description: 'Annual reports and tax filings',
      icon: 'file-document-outline' as keyof typeof MaterialIcons.glyphMap,
      route: 'YearEndReporting' as keyof AppDrawerParamList,
    },
  ]

  return (
    <AppBarLayout title="Taxes & Compliance">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemIcon}>
              <MaterialIcons name={item.icon} size={24} color="#333333" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#999999" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666666',
  },
})

