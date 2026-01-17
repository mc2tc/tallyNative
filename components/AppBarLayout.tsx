// Layout component that provides AppBar for authenticated screens

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useAuth } from '../lib/auth/AuthContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

interface AppBarLayoutProps {
  children: React.ReactNode
  title?: string
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
  const { user } = useAuth()
  const borderColor = debugBorders ? '#ff0000' : 'transparent'

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.appbar, { borderColor }]}>
        <View style={styles.leftSection}>
          {onBackPress ? (
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
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.circleButton, { borderColor }]}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <MaterialIcons
                name="more-vert"
                size={24}
                color="#000000"
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.titleContainer, { borderColor }]}>
          {title ? (
            <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
              {(title.length > 24 ? title.substring(0, 24) + '...' : title).toUpperCase()}
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
})

