// Root navigator that switches between auth and app based on auth state

import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuth } from '../lib/auth/AuthContext'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { OversightAlertsInitializer } from '../components/OversightAlertsInitializer'

const Stack = createStackNavigator()

export function RootNavigator() {
  const { user, businessUser, loading, initialized, businessContextComplete } = useAuth()

  if (!initialized || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666666" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {/* Initialize oversight alerts count when user is authenticated */}
      {user && businessUser && <OversightAlertsInitializer />}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || !businessUser ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
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

