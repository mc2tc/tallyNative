// Reusable bottom navigation bar component

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
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
  { name: 'Help', label: 'Assistant', icon: 'help-outline', route: 'MainTabs' },
]

export function BottomNavBar() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()

  const handleTabPress = (tab: TabItem) => {
    if (tab.route === 'MainTabs') {
      navigation.navigate('MainTabs', { screen: tab.name })
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <MaterialIcons name={tab.icon} size={24} color="#999999" />
            <Text style={styles.tabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
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
})

