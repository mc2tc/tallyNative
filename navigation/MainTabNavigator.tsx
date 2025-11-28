// Bottom tab navigator with five placeholder screens

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons } from '@expo/vector-icons'
import { CommonActions } from '@react-navigation/native'
import HomeScreen from '../screens/HomeScreen'
import { TransactionsNavigator } from './TransactionsNavigator'
import { ReportsNavigator } from './ReportsNavigator'
import SettingsScreen from '../screens/SettingsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import HelpScreen from '../screens/HelpScreen'

export type MainTabParamList = {
  Home: undefined
  Transactions: undefined
  Reports: undefined
  Settings: undefined
  Profile: undefined
  Help: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const iconMap: Record<keyof MainTabParamList, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'home',
  Transactions: 'view-list',
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
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState()
            const routeName = route.name
            const tabRoute = state.routes.find((r) => r.name === routeName)
            
            if (tabRoute?.state) {
              // Tab is already focused - reset the nested stack to initial route
              const nestedState = tabRoute.state
              const currentRoute = nestedState.routes[nestedState.index || 0]
              
              if (currentRoute?.name !== 'TransactionsHome') {
                // Prevent default tab navigation and reset nested stack
                e.preventDefault()
                // Preserve all tabs but reset the nested stack of the Transactions tab
                const tabIndex = state.routes.findIndex((r) => r.name === routeName)
                const newRoutes = state.routes.map((r) => {
                  if (r.name === 'Transactions') {
                    return {
                      ...r,
                      state: {
                        routes: [{ name: 'TransactionsHome' }],
                        index: 0,
                      },
                    }
                  }
                  return r
                })
                navigation.dispatch(
                  CommonActions.reset({
                    index: tabIndex >= 0 ? tabIndex : state.index,
                    routes: newRoutes,
                  })
                )
              }
            }
          },
        })}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsNavigator}
        options={{ title: 'Reports' }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const state = navigation.getState()
            const routeName = route.name
            const tabRoute = state.routes.find((r) => r.name === routeName)
            
            if (tabRoute?.state) {
              // Tab is already focused - reset the nested stack to initial route
              const nestedState = tabRoute.state
              const currentRoute = nestedState.routes[nestedState.index || 0]
              
              if (currentRoute?.name !== 'ReportsHome') {
                // Prevent default tab navigation and reset nested stack
                e.preventDefault()
                // Preserve all tabs but reset the nested stack of the Reports tab
                const tabIndex = state.routes.findIndex((r) => r.name === routeName)
                const newRoutes = state.routes.map((r) => {
                  if (r.name === 'Reports') {
                    return {
                      ...r,
                      state: {
                        routes: [{ name: 'ReportsHome' }],
                        index: 0,
                      },
                    }
                  }
                  return r
                })
                navigation.dispatch(
                  CommonActions.reset({
                    index: tabIndex >= 0 ? tabIndex : state.index,
                    routes: newRoutes,
                  })
                )
              }
            }
          },
        })}
      />
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


