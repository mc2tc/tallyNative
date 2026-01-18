// Bottom navigation bar for Operations screens (Inventory, Production, Point of Sale)

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AntDesign } from '@expo/vector-icons'
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { MainTabParamList } from '../navigation/MainTabNavigator'

const GRAYSCALE_PRIMARY = '#000000'
const GRAYSCALE_SECONDARY = '#999999'
const SURFACE_BACKGROUND = '#f5f5f5'

type TabItem = {
  name: string
  label: string
  icon: string
  iconType: 'material' | 'antdesign'
  drawerRoute: 'InventoryManagement' | 'ProductionManagement' | 'PointOfSale'
  tabRoute: 'Inventory' | 'Production' | 'PointOfSale'
}

const tabs: TabItem[] = [
  { 
    name: 'Inventory', 
    label: 'Inventory', 
    icon: 'package-variant', 
    iconType: 'material',
    drawerRoute: 'InventoryManagement',
    tabRoute: 'Inventory'
  },
  { 
    name: 'Production', 
    label: 'Production', 
    icon: 'product', 
    iconType: 'antdesign',
    drawerRoute: 'ProductionManagement',
    tabRoute: 'Production'
  },
  { 
    name: 'PointOfSale', 
    label: 'Point of Sale', 
    icon: 'cash-register', 
    iconType: 'material',
    drawerRoute: 'PointOfSale',
    tabRoute: 'PointOfSale'
  },
]

export function OperationsBottomNav() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList> | BottomTabNavigationProp<MainTabParamList>>()
  const route = useRoute()
  const navigationState = useNavigationState((state) => state)
  const currentRouteName = route.name

  // Check if we're in a tab navigator context by checking if current route name matches tab route names
  // Tab routes: 'Inventory', 'Production', 'PointOfSale'
  // Drawer routes: 'InventoryManagement', 'ProductionManagement', 'PointOfSale'
  const tabRouteNames = ['Inventory', 'Production', 'PointOfSale']
  const isInTabNavigator = tabRouteNames.includes(currentRouteName)
  
  // If we're in tab navigator, don't render this component as tabs handle navigation
  if (isInTabNavigator) {
    return null
  }

  const handleTabPress = (tab: TabItem) => {
    const targetRoute = tab.drawerRoute
    if (targetRoute !== currentRouteName) {
      // Since we've already checked we're not in tab navigator, we can safely cast to drawer navigator
      (navigation as DrawerNavigationProp<AppDrawerParamList>).navigate(targetRoute)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = currentRouteName === tab.drawerRoute
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              {tab.iconType === 'material' ? (
                <MaterialCommunityIcons 
                  name={tab.icon as any} 
                  size={24} 
                  color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                />
              ) : (
                <AntDesign 
                  name={tab.icon as any} 
                  size={24} 
                  color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                />
              )}
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

