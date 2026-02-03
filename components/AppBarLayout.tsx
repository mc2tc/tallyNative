// Layout component that provides AppBar for authenticated screens

import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView, Animated, PanResponder, Dimensions, TextInput } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons, Ionicons, Octicons } from '@expo/vector-icons'
import { useAuth } from '../lib/auth/AuthContext'
import { useDrawerCategory } from '../lib/context/DrawerCategoryContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { getLogoPrimaryColor } from '../lib/utils/logoColors'
import { GradientSparkleIcon } from './GradientSparkleIcon'

interface AppBarLayoutProps {
  children: React.ReactNode
  title?: string // Optional override - if not provided, uses category name
  debugBorders?: boolean
  showProfileIcon?: boolean
  rightIconName?: keyof typeof Ionicons.glyphMap
  onRightIconPress?: () => void
  onBackPress?: () => void
}

export function AppBarLayout({
  children,
  title,
  debugBorders = false,
  showProfileIcon = false,
  rightIconName,
  onRightIconPress,
  onBackPress,
}: AppBarLayoutProps) {
  const navigation = useNavigation<NavigationProp<any>>()
  const drawerNavigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()
  const route = useRoute()
  const { user } = useAuth()
  const { selectedCategory } = useDrawerCategory()
  const borderColor = debugBorders ? '#ff0000' : 'transparent'
  const insets = useSafeAreaInsets()
  
  // Bottom module state and animation
  const SCREEN_HEIGHT = Dimensions.get('window').height
  const FULL_SHEET_OFFSET = 40
  const HALF_SHEET_OFFSET = SCREEN_HEIGHT * 0.5
  const DISMISS_OFFSET = SCREEN_HEIGHT
  
  const [modalVisible, setModalVisible] = useState(false)
  const [isFullSheet, setIsFullSheet] = useState(false)
  const [inputText, setInputText] = useState('')
  const slideAnim = useRef(new Animated.Value(DISMISS_OFFSET)).current
  const panY = useRef(0)
  const dragStartValue = useRef(HALF_SHEET_OFFSET)
  const scrollViewRef = useRef<ScrollView>(null)
  
  // Get user's first name
  const getUserFirstName = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ')
      return names[0] || 'John'
    }
    if (user?.email) {
      return user.email.split('@')[0].split('.')[0] || 'John'
    }
    return 'John'
  }
  
  const userName = getUserFirstName()

  // Get display name for category
  const getCategoryDisplayName = (category: string): string => {
    switch (category) {
      case 'Finance':
        return 'Finance'
      case 'Operations':
        return 'Operations'
      case 'Marketing':
        return 'Marketing'
      case 'People':
        return 'People'
      case 'TallyNetwork':
        return 'Tally Network'
      case 'Settings':
        return 'Settings'
      default:
        return 'Finance'
    }
  }

  // Use provided title or fall back to category name
  const displayTitle = title || getCategoryDisplayName(selectedCategory)

  // Get current bottom tab title from route
  const getCurrentTabTitle = (): string => {
    try {
      const routeName = route.name
      // Map route names to their display titles
      // MainTabNavigator routes
      const routeTitleMap: Record<string, string> = {
        'Health': 'Health',
        'Transactions': 'Journal',
        'Reports': 'Reports',
        'ReportsHome': 'Reports', // ReportsNavigator home route
        'TaxesCompliance': 'MTD',
        'OpsCentre': 'Control Room',
        'Inventory': 'Inventory',
        'Production': 'Production',
        'PointOfSale': 'Point of Sale',
        'Web': 'Web',
        'Email': 'Email',
        'Social': 'Social',
        'Payroll': 'Payroll', // MainTabNavigator Payroll (People category)
        'Team': 'Team',
        'Talent': 'Talent',
        'Suppliers': 'Suppliers',
        'FinancialServices': 'Financial Services',
        'CommerceGraph': 'Commerce Graph',
        'SettingsPlan': 'Plan',
        'SettingsAccounts': 'Accounts',
        'SettingsVATStatus': 'VAT Status',
        'SettingsUnits': 'Units',
        'SettingsUsers': 'Users',
        // TransactionsBottomNavigator routes
        'Sales': 'Sales',
        'Purchases': 'Purchases',
        'Other': 'Other',
        'Statements': 'Statements',
      }
      // For Transactions tabs, return the mapped value or the route name itself if not found
      // (Transactions tabs like Sales, Purchases, etc. use their route name as display name)
      return routeTitleMap[routeName] || (['Sales', 'Purchases', 'Payroll', 'Other', 'Statements'].includes(routeName) ? routeName : '')
    } catch (error) {
      // If route is not available, return empty string
      return ''
    }
  }

  const currentTabTitle = getCurrentTabTitle()

  // Get user initials from email or displayName
  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return user.displayName.substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const handleAvatarPress = () => {
    drawerNavigation.navigate('MainTabs', { screen: 'Profile' })
  }

  const handleSparklePress = () => {
    setModalVisible(true)
  }

  const handleSend = () => {
    if (inputText.trim() === '') return
    // Placeholder for send functionality - will be implemented later
    setInputText('')
  }

  useEffect(() => {
    if (modalVisible) {
      slideAnim.setValue(DISMISS_OFFSET)
      Animated.spring(slideAnim, {
        toValue: HALF_SHEET_OFFSET,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => {
        setIsFullSheet(false)
      })
    } else {
      slideAnim.setValue(DISMISS_OFFSET)
      setIsFullSheet(false)
    }
  }, [modalVisible, slideAnim, DISMISS_OFFSET, HALF_SHEET_OFFSET])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        panY.current = 0
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = typeof value === 'number' ? value : HALF_SHEET_OFFSET
        })
      },
      onPanResponderMove: (_, gestureState) => {
        // Limit to half-screen height - can't drag above HALF_SHEET_OFFSET
        const newValue = Math.min(
          DISMISS_OFFSET,
          Math.max(HALF_SHEET_OFFSET, dragStartValue.current + gestureState.dy)
        )
        slideAnim.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80

        slideAnim.stopAnimation((value) => {
          const currentValue = typeof value === 'number' ? value : HALF_SHEET_OFFSET

          const isSwipingDownFast = gestureState.vy > 0.8
          const isSwipingUpFast = gestureState.vy < -0.8

          if (currentValue > HALF_SHEET_OFFSET + threshold || isSwipingDownFast) {
            // Dismiss modal - animate down and then hide
            Animated.timing(slideAnim, {
              toValue: DISMISS_OFFSET,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setModalVisible(false)
              slideAnim.setValue(DISMISS_OFFSET)
              setIsFullSheet(false)
            })
          } else {
            // Snap back to half-screen position (can't expand further)
            Animated.spring(slideAnim, {
              toValue: HALF_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start(() => {
              setIsFullSheet(false)
            })
          }
        })
      },
    })
  ).current

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.appbar, { borderColor }]}>
        <View style={styles.leftSection}>
          {onBackPress ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.circleButton, { borderColor }]}
                onPress={onBackPress}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color="#000000"
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.circleButton, { borderColor, marginLeft: 0 }]}
                onPress={handleSparklePress}
              >
                {/* <GradientSparkleIcon size={30} /> */}
                <Ionicons name="sparkles-sharp" size={24} color="#df41baff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.circleButton, { borderColor }]}
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
              >
                <MaterialIcons
                  name="apps"
                  size={28}
                  color="#000000"
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.circleButton, { borderColor, marginLeft: 0 }]}
                onPress={handleSparklePress}
              >
                {/* <GradientSparkleIcon size={30} /> */}
                <Ionicons name="sparkles-sharp" size={24} color="#df41baff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[styles.titleContainer, { borderColor }]}>
          {displayTitle ? (
            <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
              {(displayTitle.length > 19 ? displayTitle.substring(0, 19) + '...' : displayTitle).toUpperCase()}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSection}>
          {showProfileIcon ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.avatarContainer, { borderColor }]}
              onPress={handleAvatarPress}
            >
              <View style={styles.avatar}>
                <MaterialIcons name="account-circle" size={32} color="#000000" />
              </View>
            </TouchableOpacity>
          ) : rightIconName && onRightIconPress ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.rightIconContainer, { borderColor }]}
              onPress={onRightIconPress}
            >
              <View style={styles.avatar}>
                <Ionicons name={rightIconName} size={28} color="#000000" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarSpacer} />
          )}
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      
      {/* Work in Progress Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <Animated.View
            style={[
              styles.modalContentContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalContent}>
              {/* Drag handle */}
              <View style={styles.modalHandleContainer} {...panResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>
              
              {/* Chat container */}
              <View style={[styles.chatContainerWrapper, { height: SCREEN_HEIGHT * 0.4 }]}>
                <View style={styles.chatContainer}>
                  <Text style={styles.chatTitle}>Assistant</Text>
                  
                  <ScrollView 
                    ref={scrollViewRef}
                    style={styles.chatScrollView} 
                    contentContainerStyle={styles.chatScrollContent}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={isFullSheet}
                  >
                    <View style={styles.messageWrapper}>
                      <View style={styles.messageRow}>
                        <Ionicons 
                          name="sparkles-sharp" 
                          size={16} 
                          color="#666666" 
                          style={styles.assistantIcon}
                        />
                        <View style={styles.aiMessageBubble}>
                          <Text style={styles.messageText}>
                            {(() => {
                              // Special case for HomeScreen (Health tab or HomeMain route)
                              if ((route.name === 'Health' || route.name === 'HomeMain') && !currentTabTitle) {
                                return `Hi ${userName}, how can I help with business health?`
                              }
                              // Show both titles if available
                              if (currentTabTitle) {
                                return `Hi ${userName}, how can I help with ${displayTitle} and ${currentTabTitle}?`
                              }
                              // Show only appbar title
                              return `Hi ${userName}, how can I help with ${displayTitle}?`
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                  
                  <View style={[styles.chatInputContainer, { paddingBottom: 16 + insets.bottom }]}>
                    <TextInput
                      style={styles.chatInput}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Type your message..."
                      placeholderTextColor="#999999"
                      multiline
                      onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity 
                      onPress={handleSend} 
                      style={styles.chatSendButton} 
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="send" size={24} color="#333333" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  appbar: {
    backgroundColor: '#fafafa',
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
    marginLeft: 'auto',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePlaceholder: {
    flex: 1,
    marginLeft: 12,
    height: 24,
    borderWidth: 1,
    borderRadius: 12,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  avatarContainer: {
    marginLeft: 12,
  },
  rightIconContainer: {
    // No left margin for right-aligned icons
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  avatarSpacer: {
    marginLeft: 12,
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    flex: 1,
  },
  modalHandleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
  },
  modalScrollView: {
    flexGrow: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  chatContainerWrapper: {
    paddingHorizontal: 16,
  },
  chatContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    position: 'relative',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  chatScrollView: {
    flex: 1,
    marginBottom: 80, // Space for the absolutely positioned input container
  },
  chatScrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistantIcon: {
    marginRight: 8,
  },
  aiMessageBubble: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  chatInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333333',
    maxHeight: 100,
    marginRight: 8,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
})

