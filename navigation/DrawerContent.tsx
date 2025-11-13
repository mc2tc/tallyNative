// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useAuth } from '../lib/auth/AuthContext'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { signOut } = useAuth()

  const getActiveRouteIndex = () => {
    const state = props.state
    return state.index
  }

  const activeIndex = getActiveRouteIndex()

  const handleSignOut = async () => {
    try {
      await signOut()
      // Navigation will be handled by RootNavigator based on auth state
    } catch (error) {
      // Error is already logged in AuthContext
    }
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Drawer.Section title="Navigation">
          <Drawer.Item
            label="Home"
            icon="home"
            active={activeIndex === 0}
            onPress={() => props.navigation.navigate('Home')}
          />
          <Drawer.Item
            label="Test Sum API"
            icon="calculator-variant"
            active={activeIndex === 1}
            onPress={() => props.navigation.navigate('Test')}
          />
          <Drawer.Item
            label="Test Firestore"
            icon="database"
            active={activeIndex === 2}
            onPress={() => props.navigation.navigate('FirestoreTest')}
          />
        </Drawer.Section>
        <Drawer.Section title="Account">
          <Drawer.Item
            label="Sign Out"
            icon="logout"
            onPress={handleSignOut}
          />
        </Drawer.Section>
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
    paddingTop: 20,
  },
})

