import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '../lib/auth/AuthContext'
import { Appbar, List, Surface, Divider } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

const Home = () => {
  const router = useRouter()
  const { user, businessUser, loading, initialized, signOut, refreshAuthState } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-280)).current

  useEffect(() => {
    if (drawerOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start()
    }
  }, [drawerOpen, slideAnim])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/(auth)/sign-in')
    } catch (error) {
      // Error is already logged in AuthContext
    }
  }

  useEffect(() => {
    if (!initialized) return

    if (!user) {
      // Not signed in - redirect to sign in
      router.replace('/(auth)/sign-in')
      return
    }

    if (user && !businessUser) {
      // Signed in but no business membership yet
      // Could be waiting for invite acceptance or bootstrap
      // For now, show a loading state
      return
    }

    // User is signed in and has business membership
    // Navigation logic based on role (can be enhanced later)
    if (businessUser?.role === 'owner') {
      // Owners see business list (for now, just show home)
      // TODO: Navigate to business list screen when created
    } else if (businessUser?.role === 'super') {
      // Supers see dashboard
      // TODO: Navigate to dashboard when created
    } else {
      // Others see first available module
      // TODO: Navigate based on permissions
    }
  }, [user, businessUser, initialized, router])

  if (!initialized || loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4338ca" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  if (!user) {
    // Will redirect via useEffect, but show loading in meantime
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4338ca" />
      </View>
    )
  }

  if (!businessUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.greeting}>Signed in as {user.email}</Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ API Connection Unavailable</Text>
          <Text style={styles.warningText}>
            Unable to connect to the server. Please check:
          </Text>
          <Text style={styles.warningBullet}>• Next.js server is running</Text>
          <Text style={styles.warningBullet}>• Network connection is active</Text>
          <Text style={styles.warningBullet}>• API base URL is correct</Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={async () => {
            await refreshAuthState()
          }}
        >
          <Text style={styles.actionButtonText}>Retry Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Text style={[styles.actionButtonText, styles.signOutButtonText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const navigationItems = [
    { title: 'Home', route: '/', icon: 'home' },
    { title: 'Test Sum API', route: '/test', icon: 'calculate' },
    { title: 'Test Firestore', route: '/firestoreTest', icon: 'storage' },
  ]

  const handleNavigation = (route: string) => {
    setDrawerOpen(false)
    if (route === '/') {
      // Already on home, just close drawer
      return
    }
    router.push(route as any)
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.Action
          icon={() => <MaterialIcons name="more-vert" size={24} color="#fff" />}
          onPress={() => setDrawerOpen(true)}
        />
        <Appbar.Content title="Tally Native" />
      </Appbar.Header>

      <Modal
        visible={drawerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.drawerOverlay}
            activeOpacity={1}
            onPress={() => setDrawerOpen(false)}
          />
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <Surface style={styles.drawerSurface}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Navigation</Text>
            </View>
            <Divider />
            <List.Section>
              <List.Subheader>Navigation</List.Subheader>
              {navigationItems.map((item) => (
                <List.Item
                  key={item.route}
                  title={item.title}
                  left={(props) => <List.Icon {...props} icon={item.icon} />}
                  onPress={() => handleNavigation(item.route)}
                />
              ))}
            </List.Section>
            <Divider />
            <List.Section>
              <List.Subheader>Account</List.Subheader>
              <List.Item
                title="Sign Out"
                left={(props) => <List.Icon {...props} icon="logout" />}
                onPress={() => {
                  setDrawerOpen(false)
                  handleSignOut()
                }}
              />
            </List.Section>
            </Surface>
          </Animated.View>
        </View>
      </Modal>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.greeting}>
            {businessUser.role === 'owner' ? '👑 Owner' : businessUser.role === 'super' ? '⭐ Super' : '👤 User'}
          </Text>
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
            onPress={() => router.push('/test')}
          >
            <Text style={styles.actionButtonText}>Test Sum API</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/firestoreTest')}
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
    </View>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8',
  },
  appbar: {
    backgroundColor: '#6200ee',
    elevation: 4,
    zIndex: 1000,
  },
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  greeting: {
    fontSize: 18,
    color: '#4338ca',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#4338ca',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d0d0d5',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#b42318',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
  },
  drawerSurface: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    elevation: 16,
  },
  drawerHeader: {
    padding: 16,
    paddingTop: 60,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
})