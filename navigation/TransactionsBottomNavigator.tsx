// Bottom tab navigator for Transactions section
// Tabs: Sales, Purchases, Other, Statements

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons, Feather } from '@expo/vector-icons'
import TransactionsSalesScreen from '../screens/TransactionsSalesScreen'
import TransactionsPurchasesScreen from '../screens/TransactionsPurchasesScreen'
import TransactionsOtherScreen from '../screens/TransactionsOtherScreen'
import TransactionsStatementsScreen from '../screens/TransactionsStatementsScreen'
import { semanticColors } from '../lib/utils/semanticColors'

export type TransactionsBottomTabParamList = {
  Sales: undefined
  Purchases: undefined
  Other: undefined
  Statements: undefined
}

const Tab = createBottomTabNavigator<TransactionsBottomTabParamList>()

// Subtle colors for tab icons
const SUBTLE_SALES_COLOR = '#81c784' // Light green
const SUBTLE_PURCHASES_COLOR = '#e57373' // Light red

const getTabIcon = (routeName: keyof TransactionsBottomTabParamList, color: string, size: number, focused: boolean) => {
  const iconSize = size
  
  switch (routeName) {
    case 'Sales':
      return <Feather name="arrow-up-circle" size={iconSize} color={focused ? SUBTLE_SALES_COLOR : color} />
    case 'Purchases':
      return <Feather name="arrow-down-circle" size={iconSize} color={focused ? SUBTLE_PURCHASES_COLOR : color} />
    case 'Other':
      return <Feather name="divide-circle" size={iconSize} color={focused ? semanticColors.average : color} />
    case 'Statements':
      return <Feather name="align-justify" size={iconSize} color={color} />
    default:
      return <MaterialIcons name="radio-button-unchecked" size={iconSize} color={color} />
  }
}

export function TransactionsBottomNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Purchases"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopColor: '#e0e0e0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        tabBarIcon: ({ color, size, focused }) => getTabIcon(route.name, color, size, focused),
      })}
    >
      <Tab.Screen name="Sales" component={TransactionsSalesScreen} options={{ title: 'Sales' }} />
      <Tab.Screen name="Purchases" component={TransactionsPurchasesScreen} options={{ title: 'Purchases' }} />
      <Tab.Screen name="Other" component={TransactionsOtherScreen} options={{ title: 'Other' }} />
      <Tab.Screen name="Statements" component={TransactionsStatementsScreen} options={{ title: 'Statements' }} />
    </Tab.Navigator>
  )
}

