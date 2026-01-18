// Custom drawer content using React Native Paper

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { useDrawerCategory, type DrawerCategory } from '../lib/context/DrawerCategoryContext'
import { useAuth } from '../lib/auth/AuthContext'
import { getFirstTabForCategory } from '../lib/utils/navigation'

// Helper function to extract and format business name from business ID
function getBusinessNameFromId(businessId: string | undefined): string {
  if (!businessId) return 'Company'
  
  const lastUnderscoreIndex = businessId.lastIndexOf('_')
  if (lastUnderscoreIndex === -1) {
    return businessId.replace(/([A-Z])/g, ' $1').trim() || 'Company'
  }
  
  const businessNamePart = businessId.substring(0, lastUnderscoreIndex)
  const formatted = businessNamePart
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Company'
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { selectedCategory, setSelectedCategory } = useDrawerCategory()
  const { signOut, businessUser } = useAuth()
  const pendingNavigationRef = useRef<{ category: DrawerCategory; firstTab: string } | null>(null)

  const businessName = getBusinessNameFromId(businessUser?.businessId)

  const categories: Array<{ label: string; value: DrawerCategory }> = [
    { label: 'Finance', value: 'Finance' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'People', value: 'People' },
    { label: 'Tally Network', value: 'TallyNetwork' },
    { label: 'Settings', value: 'Settings' },
  ]


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
        <Text style={styles.drawerTitle}>{businessName}</Text>
        <View style={styles.divider} />
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          {categories.map((category) => {
            const showNotificationBadge = category.value === 'Operations'
            return (
              <View key={category.value} style={styles.drawerItemContainer}>
                <Drawer.Item
                  label={category.label.toUpperCase()}
                  icon={({ size, color }) => (
                    <MaterialIcons name="chevron-right" size={size} color={color} />
                  )}
                  active={selectedCategory === category.value}
                  rippleColor="#e0e0e0"
                  style={[
                    styles.drawerItem,
                    selectedCategory === category.value ? { backgroundColor: 'transparent' } : undefined,
                  ]}
                  onPress={() => handleCategoryPress(category.value)}
                />
                {showNotificationBadge && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>2</Text>
                  </View>
                )}
              </View>
            )
          })}
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
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  drawerSection: {
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  drawerItemContainer: {
    position: 'relative',
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
  notificationBadge: {
    position: 'absolute',
    right: 16,
    top: 12,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
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

