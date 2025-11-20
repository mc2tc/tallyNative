// Bottom tab navigator with five placeholder screens

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import { TransactionsNavigator } from './TransactionsNavigator'
import { ReportsNavigator } from './ReportsNavigator'
import { ScaffoldNavigator } from './ScaffoldNavigator'
import SettingsScreen from '../screens/SettingsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import HelpScreen from '../screens/HelpScreen'

export type MainTabParamList = {
  Home: undefined
  Transactions: undefined
  TransactionsScaffold: undefined
  Reports: undefined
  Settings: undefined
  Profile: undefined
  Help: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const iconMap: Record<keyof MainTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'home',
  Transactions: 'receipt',
  TransactionsScaffold: 'dashboard',
  Reports: 'assessment',
  Settings: 'settings',
  Profile: 'account-circle',
  Help: 'help-outline',
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#333333',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopColor: '#e0e0e0',
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            iconMap[route.name as keyof MainTabParamList] ?? 'radio-button-unchecked'
          return <MaterialIcons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen
        name="Transactions"
        component={TransactionsNavigator}
        options={{ title: 'Transactions' }}
      />
      <Tab.Screen
        name="TransactionsScaffold"
        component={ScaffoldNavigator}
        options={{ title: 'Transactions v2' }}
      />
      <Tab.Screen name="Reports" component={ReportsNavigator} options={{ title: 'Reports' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen name="Help" component={HelpScreen} options={{ title: 'Help' }} />
    </Tab.Navigator>
  )
}


