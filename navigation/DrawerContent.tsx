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

const getCategoryIconName = (
  category: DrawerCategory,
): React.ComponentProps<typeof MaterialIcons>['name'] => {
  switch (category) {
    case 'Finance':
      return 'account-balance-wallet'
    case 'Operations':
      return 'build'
    case 'Marketing':
      return 'campaign'
    case 'People':
      return 'group'
    case 'TallyNetwork':
      return 'hub'
    case 'Settings':
      return 'settings'
    default:
      return 'radio-button-unchecked'
  }
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { selectedCategory, setSelectedCategory } = useDrawerCategory()
  const { signOut, businessUser } = useAuth()
  const pendingNavigationRef = useRef<{ category: DrawerCategory; firstTab: string } | null>(null)

  const businessName = getBusinessNameFromId(businessUser?.businessId)

  // Check if we're currently on the Transactions drawer route
  const state = props.navigation.getState()
  const currentRoute = state?.routes[state?.index || 0]
  const isOnTransactionsRoute = currentRoute?.name === 'Transactions'

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
    // Get current route state
    const state = props.navigation.getState()
    const currentRoute = state?.routes[state?.index || 0]
    const isOnTransactionsRoute = currentRoute?.name === 'Transactions'
    
    // Don't do anything if already on this category and not on Transactions route
    if (selectedCategory === category && !isOnTransactionsRoute) {
      props.navigation.closeDrawer()
      return
    }
    
    // Close the drawer first
    props.navigation.closeDrawer()
    
    const firstTab = getFirstTabForCategory(category)
    
    // Store pending navigation info
    pendingNavigationRef.current = { category, firstTab }
    
    // Always navigate to MainTabs first if not already there, then set category
    if (currentRoute?.name !== 'MainTabs') {
      // If not on MainTabs (e.g., on Transactions drawer route), navigate there first with the correct tab
      props.navigation.navigate('MainTabs', { screen: firstTab })
      // Use a delay to ensure navigation completes before category change
      setTimeout(() => {
        setSelectedCategory(category)
      }, 150)
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
        {/* Primary Transactions entry */}
        <TouchableOpacity
          style={styles.primaryItem}
          onPress={() => {
            props.navigation.closeDrawer()
            props.navigation.navigate('Transactions')
          }}
          activeOpacity={0.7}
        >
          <View style={styles.drawerItemRow}>
            <MaterialIcons
              name="receipt-long"
              size={24}
              color="#333333"
              style={styles.drawerItemIcon}
            />
            <Text style={styles.drawerItemLabel}>TRANSACTIONS</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          {categories.map((category, index) => {
            // Don't show category as active if we're on Transactions route
            const isActive = !isOnTransactionsRoute && selectedCategory === category.value
            const showNotificationBadge = category.value === 'Operations'
            const isPeople = category.value === 'People'
            const isTallyNetwork = category.value === 'TallyNetwork'
            const isOperations = category.value === 'Operations'
            const isMarketing = category.value === 'Marketing'
            
            return (
              <React.Fragment key={category.value}>
                <TouchableOpacity
                  style={[styles.drawerItem, isActive ? styles.drawerItemActive : undefined]}
                  onPress={() => handleCategoryPress(category.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.drawerItemRow}>
                    <MaterialIcons
                      name={getCategoryIconName(category.value)}
                      size={24}
                      color={isActive ? '#000000' : '#666666'}
                      style={styles.drawerItemIcon}
                    />
                    <Text
                      style={[
                        styles.drawerItemLabel,
                        isActive ? styles.drawerItemLabelActive : undefined,
                      ]}
                    >
                      {category.label.toUpperCase()}
                    </Text>
                    {showNotificationBadge && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>2</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {/* Insert Sales item between Operations and Marketing */}
                {isOperations && (
                  <TouchableOpacity
                    style={styles.drawerItem}
                    onPress={() => {
                      props.navigation.closeDrawer()
                      props.navigation.navigate('Transactions', { screen: 'SalesPipeline' })
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.drawerItemRow}>
                      <MaterialIcons
                        name="trending-up"
                        size={24}
                        color="#666666"
                        style={styles.drawerItemIcon}
                      />
                      <Text style={styles.drawerItemLabel}>SALES</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {(isPeople || isTallyNetwork) && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
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
    marginTop: 8,
    marginBottom: 24,
  },
  drawerSection: {
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  drawerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  drawerItemActive: {
    backgroundColor: '#f0f0f0',
  },
  drawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemIcon: {
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  drawerItemLabelActive: {
    color: '#000000',
  },
  notificationBadge: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 'auto',
    marginTop: 1,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
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

