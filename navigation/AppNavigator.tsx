// Main app navigator with drawer

import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { CustomDrawerContent } from './DrawerContent'
import HomeScreen from '../screens/HomeScreen'
import TestScreen from '../screens/TestScreen'
import FirestoreTestScreen from '../screens/FirestoreTestScreen'

export type AppDrawerParamList = {
  Home: undefined
  Test: undefined
  FirestoreTest: undefined
}

const Drawer = createDrawerNavigator<AppDrawerParamList>()

export function AppNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
        drawerHideStatusBarOnOpen: false,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerActiveTintColor: '#333333',
        drawerInactiveTintColor: '#666666',
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Test" component={TestScreen} />
      <Drawer.Screen name="FirestoreTest" component={FirestoreTestScreen} />
    </Drawer.Navigator>
  )
}

