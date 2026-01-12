// Bottom navigation bar for Marketing screens (Web, Email, Social)

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons'
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
  iconType: 'material' | 'materialcommunity' | 'ionicons'
  route: 'OnlineSales' | 'OnlineBooking' | null // null for Email (not implemented)
}

const tabs: TabItem[] = [
  { 
    name: 'Web', 
    label: 'Web', 
    icon: 'web', 
    iconType: 'materialcommunity',
    route: 'OnlineSales' 
  },
  { 
    name: 'Email', 
    label: 'Email', 
    icon: 'alternate-email', 
    iconType: 'material',
    route: null // Not implemented yet
  },
  { 
    name: 'Social', 
    label: 'Social', 
    icon: 'share-social', 
    iconType: 'ionicons',
    route: 'OnlineBooking' 
  },
]

export function MarketingBottomNav() {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute()
  const currentRouteName = route.name

  const handleTabPress = (tab: TabItem) => {
    if (tab.route && tab.route !== currentRouteName) {
      navigation.navigate(tab.route)
    } else if (!tab.route) {
      // Email not implemented yet
      console.log('Email screen not implemented')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = tab.route ? currentRouteName === tab.route : false
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              {tab.iconType === 'material' ? (
                <MaterialIcons 
                  name={tab.icon as any} 
                  size={24} 
                  color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                />
              ) : tab.iconType === 'materialcommunity' ? (
                <MaterialCommunityIcons 
                  name={tab.icon as any} 
                  size={24} 
                  color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                />
              ) : (
                <Ionicons 
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

