// Bottom navigation bar for Control Room screens (Security, Compliance, Operations)

import React from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#000000'
const GRAYSCALE_SECONDARY = '#999999'
const SURFACE_BACKGROUND = '#f5f5f5'

type TabItem = {
  name: string
  label: string
  icon: string
  iconType: 'material' | 'materialcommunity'
}

const tabs: TabItem[] = [
  { 
    name: 'Security', 
    label: 'Security', 
    icon: 'shield', 
    iconType: 'material'
  },
  { 
    name: 'Compliance', 
    label: 'Compliance', 
    icon: 'gavel', 
    iconType: 'material'
  },
  { 
    name: 'Operations', 
    label: 'Operations', 
    icon: 'trending-up', 
    iconType: 'material'
  },
]

type ControlRoomBottomNavProps = {
  activeTab?: 'Security' | 'Compliance' | 'Operations'
}

export function ControlRoomBottomNav({ 
  activeTab = 'Security',
}: ControlRoomBottomNavProps) {
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const { securityAlertsCount, complianceAlertsCount, operationsAlertsCount } = useAssistant()

  const handleTabPress = (tabName: string) => {
    if (tabName === 'Security') {
      navigation.navigate('MainTabs', { screen: 'OpsCentre' })
    } else if (tabName === 'Compliance') {
      navigation.navigate('Compliance')
    } else if (tabName === 'Operations') {
      navigation.navigate('Operations')
    }
  }

  const getBadgeCount = (tabName: string): number => {
    switch (tabName) {
      case 'Security':
        return securityAlertsCount
      case 'Compliance':
        return complianceAlertsCount
      case 'Operations':
        return operationsAlertsCount
      default:
        return 0
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = tab.name === activeTab
          const badgeCount = getBadgeCount(tab.name)
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {tab.iconType === 'material' ? (
                  <MaterialIcons 
                    name={tab.icon as any} 
                    size={24} 
                    color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name={tab.icon as any} 
                    size={24} 
                    color={isActive ? GRAYSCALE_PRIMARY : GRAYSCALE_SECONDARY} 
                  />
                )}
                {badgeCount >= 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeCount}</Text>
                  </View>
                )}
              </View>
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
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
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

