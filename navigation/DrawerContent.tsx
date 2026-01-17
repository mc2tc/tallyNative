// Custom drawer content using React Native Paper

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useDrawerCategory, type DrawerCategory } from '../lib/context/DrawerCategoryContext'
import { useAuth } from '../lib/auth/AuthContext'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { selectedCategory, setSelectedCategory } = useDrawerCategory()
  const { signOut } = useAuth()
  const pendingNavigationRef = useRef<{ category: DrawerCategory; firstTab: string } | null>(null)

  const categories: Array<{ label: string; value: DrawerCategory }> = [
    { label: 'Finance', value: 'Finance' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'People', value: 'People' },
    { label: 'Tally Network', value: 'TallyNetwork' },
    { label: 'Settings', value: 'Settings' },
  ]

  const getFirstTabForCategory = (category: DrawerCategory): string => {
    switch (category) {
      case 'Finance':
        return 'Health'
      case 'Operations':
        return 'Inventory'
      case 'Marketing':
        return 'Web'
      case 'People':
        return 'Payroll'
      case 'TallyNetwork':
        return 'Suppliers'
      case 'Settings':
        return 'SettingsPlan'
      default:
        return 'Health'
    }
  }

  // Handle navigation after category change
  useEffect(() => {
    if (pendingNavigationRef.current) {
      const { firstTab } = pendingNavigationRef.current
      pendingNavigationRef.current = null
      
      // Small delay to ensure Tab.Navigator has remounted with new tabs
      const timer = setTimeout(() => {
        // Navigate to the first tab of the new category
        props.navigation.navigate('MainTabs', { screen: firstTab })
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [selectedCategory, props.navigation])

  const handleCategoryPress = (category: DrawerCategory) => {
    // Don't do anything if already on this category
    if (selectedCategory === category) {
      props.navigation.closeDrawer()
      return
    }
    
    // Close the drawer first
    props.navigation.closeDrawer()
    
    const firstTab = getFirstTabForCategory(category)
    
    // Store pending navigation info
    pendingNavigationRef.current = { category, firstTab }
    
    // Ensure we're on MainTabs before changing category
    const state = props.navigation.getState()
    const currentRoute = state?.routes[state?.index || 0]
    
    if (currentRoute?.name !== 'MainTabs') {
      // If not on MainTabs, navigate there first, then set category
      props.navigation.navigate('MainTabs')
      // Use a small delay to ensure navigation completes before category change
      setTimeout(() => {
        setSelectedCategory(category)
      }, 50)
    } else {
      // Already on MainTabs, change category
      // The useEffect will handle navigation after remount
      setSelectedCategory(category)
    }
  }

  const handleLogout = async () => {
    try {
      props.navigation.closeDrawer()
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.drawerTitle}>Modules</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          {categories.map((category) => (
            <Drawer.Item
              key={category.value}
              label={category.label}
              active={selectedCategory === category.value}
              rippleColor="#e0e0e0"
              style={[
                styles.drawerItem,
                selectedCategory === category.value ? { backgroundColor: 'transparent' } : undefined,
              ]}
              onPress={() => handleCategoryPress(category.value)}
            />
          ))}
        </Drawer.Section>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 12,
    flex: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  drawerSection: {
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  drawerItem: {
    paddingVertical: 0,
    minHeight: 48,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    height: 48,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
})

