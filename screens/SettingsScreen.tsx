// Settings screen (moved content from former Home screen)

import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type DrawerNav = DrawerNavigationProp<AppDrawerParamList>

export default function SettingsScreen() {
  const navigation = useNavigation<DrawerNav>()
  const { user, businessUser, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // Error already handled in context
    }
  }

  if (!user || !businessUser) {
    return (
      <AppBarLayout>
        <View style={[styles.content, styles.center]}>
          <ActivityIndicator size="large" color="#666666" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AppBarLayout>
    )
  }

  const roleLabel =
    businessUser.role === 'owner'
      ? '👑 Owner'
      : businessUser.role === 'super'
        ? '⭐ Super'
        : '👤 User'

  return (
    <AppBarLayout>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Account Overview</Text>
          <Text style={styles.greeting}>{roleLabel}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{businessUser.role}</Text>
        </View>

        {businessUser.businessId && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Business ID</Text>
            <Text style={styles.infoValue}>{businessUser.businessId}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Test')}
          >
            <Text style={styles.actionButtonText}>Test Sum API</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FirestoreTest')}
          >
            <Text style={styles.actionButtonText}>Test Firestore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <Text style={[styles.actionButtonText, styles.signOutButtonText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333333',
  },
  greeting: {
    fontSize: 18,
    color: '#666666',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#999999',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#666666',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
})


