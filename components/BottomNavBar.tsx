// Reusable bottom navigation bar component

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, useNavigationState } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type TabItem = {
  name: string
  label: string
  icon: keyof typeof MaterialIcons.glyphMap
  route: string
}

const tabs: TabItem[] = [
  { name: 'Home', label: 'Home', icon: 'home', route: 'MainTabs' },
  { name: 'Transactions', label: 'Transactions', icon: 'view-list', route: 'MainTabs' },
  { name: 'Reports', label: 'Reports', icon: 'assessment', route: 'MainTabs' },
  { name: 'Settings', label: 'Settings', icon: 'settings', route: 'MainTabs' },
  { name: 'Help', label: 'Ops. Centre', icon: 'monitor-heart', route: 'MainTabs' },
]

export function BottomNavBar() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute()
  const navigationState = useNavigationState((state) => state)

  // Find the active MainTab by traversing the navigation state
  const getActiveTab = (): string | null => {
    if (!navigationState) return null
    
    // Find MainTabs in the navigation state
    const mainTabsRoute = navigationState.routes.find((r) => r.name === 'MainTabs')
    if (mainTabsRoute?.state) {
      const activeTabIndex = mainTabsRoute.state.index ?? 0
      const activeTab = mainTabsRoute.state.routes[activeTabIndex]
      return activeTab?.name ?? null
    }
    
    return null
  }

  const activeTab = getActiveTab()

  const handleTabPress = (tab: TabItem) => {
    if (tab.route === 'MainTabs') {
      navigation.navigate('MainTabs', { screen: tab.name })
    }
  }

  const ACTIVE_COLOR = '#000000'
  const INACTIVE_COLOR = '#999999'

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={tab.icon} 
                size={24} 
                color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR} 
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
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
    color: '#999999',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#000000',
    fontWeight: '500',
  },
})

