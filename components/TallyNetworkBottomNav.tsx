// Bottom navigation bar for Tally Network screens (Suppliers, Financial Services)

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
  route: 'Suppliers' | 'FinancialServices' | 'CommerceGraph'
}

const tabs: TabItem[] = [
  { 
    name: 'Suppliers', 
    label: 'Suppliers', 
    icon: 'truck-delivery', 
    route: 'Suppliers' 
  },
  { 
    name: 'FinancialServices', 
    label: 'Financial Services', 
    icon: 'bank', 
    route: 'FinancialServices' 
  },
  { 
    name: 'CommerceGraph', 
    label: 'Commerce Graph', 
    icon: 'map-marker', 
    route: 'CommerceGraph' 
  },
]

export function TallyNetworkBottomNav() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute()
  const currentRouteName = route.name

  // Check if we're in a tab navigator context by checking if current route name matches tab route names
  // Tab routes: 'Suppliers', 'FinancialServices', 'CommerceGraph' (from MainTabNavigator)
  // Drawer routes: 'Suppliers', 'FinancialServices', 'CommerceGraph', 'TallyNetwork'
  const tabRouteNames = ['Suppliers', 'FinancialServices', 'CommerceGraph']
  const isInTabNavigator = tabRouteNames.includes(currentRouteName)
  
  // If we're in tab navigator, don't render this component as tabs handle navigation
  if (isInTabNavigator) {
    return null
  }

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
              <Text 
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={2}
                adjustsFontSizeToFit
              >
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

