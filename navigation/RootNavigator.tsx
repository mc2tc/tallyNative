// Root navigator that switches between auth and app based on auth state

import React, { useEffect, useRef } from 'react'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '../lib/auth/AuthContext'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { OversightAlertsInitializer } from '../components/OversightAlertsInitializer'
import LandingScreen from '../screens/LandingScreen'

export type RootStackParamList = {
  Landing: undefined
  Auth: undefined
  App: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { user, businessUser, loading, initialized, businessContextComplete } = useAuth()
  const navigationRef = useNavigationContainerRef<RootStackParamList>()
  const previousAuthState = useRef<{ user: boolean; businessUser: boolean } | null>(null)

  // Track auth state changes and navigate accordingly
  useEffect(() => {
    if (!initialized || loading) return

    const currentAuthState = {
      user: !!user,
      businessUser: !!businessUser,
    }

    // Skip navigation on initial mount
    if (previousAuthState.current === null) {
      previousAuthState.current = currentAuthState
      return
    }

    // Only navigate if auth state actually changed
    if (
      previousAuthState.current.user !== currentAuthState.user ||
      previousAuthState.current.businessUser !== currentAuthState.businessUser
    ) {
      if (navigationRef.isReady()) {
        if (currentAuthState.user && currentAuthState.businessUser) {
          // User just authenticated, navigate to App
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'App' }],
          })
        } else if (!currentAuthState.user) {
          // User just signed out, navigate to Landing
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          })
        }
      }
      previousAuthState.current = currentAuthState
    }
  }, [user, businessUser, initialized, loading, navigationRef])

  if (!initialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666666" />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Initialize oversight alerts count when user is authenticated */}
      {user && businessUser && <OversightAlertsInitializer />}
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName="Landing"
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="App" component={AppNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
})

