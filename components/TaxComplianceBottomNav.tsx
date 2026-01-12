// Bottom navigation bar for Tax & Compliance screens (VAT, Year End Reporting)

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#000000'
const GRAYSCALE_SECONDARY = '#999999'
const SURFACE_BACKGROUND = '#f5f5f5'

type TabItem = {
  name: string
  label: string
  icon: string
  route: 'VAT' | 'YearEndReporting'
}

const tabs: TabItem[] = [
  { 
    name: 'VAT', 
    label: 'VAT', 
    icon: 'receipt-text', 
    route: 'VAT' 
  },
  { 
    name: 'YearEndReporting', 
    label: 'Year End Reporting', 
    icon: 'file-document-outline', 
    route: 'YearEndReporting' 
  },
]

export function TaxComplianceBottomNav() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute()
  const currentRouteName = route.name

  const handleTabPress = (tab: TabItem) => {
    if (tab.route !== currentRouteName) {
      navigation.navigate(tab.route)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = currentRouteName === tab.route
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={tab.icon as any} 
                size={24} 
                color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: SURFACE_BACKGROUND,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: SURFACE_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    marginTop: 4,
  },
  tabLabelActive: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
})

