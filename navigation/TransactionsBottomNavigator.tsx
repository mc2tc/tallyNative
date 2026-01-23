// Bottom tab navigator for Transactions section
// Tabs: Sales, Purchases, Payroll, Other, Statements

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons'
import TransactionsSalesScreen from '../screens/TransactionsSalesScreen'
import TransactionsPurchasesScreen from '../screens/TransactionsPurchasesScreen'
import TransactionsPayrollScreen from '../screens/TransactionsPayrollScreen'
import TransactionsOtherScreen from '../screens/TransactionsOtherScreen'
import TransactionsStatementsScreen from '../screens/TransactionsStatementsScreen'

export type TransactionsBottomTabParamList = {
  Sales: undefined
  Purchases: undefined
  Payroll: undefined
  Other: undefined
  Statements: undefined
}

const Tab = createBottomTabNavigator<TransactionsBottomTabParamList>()

const getTabIcon = (routeName: keyof TransactionsBottomTabParamList, color: string, size: number) => {
  switch (routeName) {
    case 'Sales':
      return <MaterialCommunityIcons name="arrow-up-circle" size={size} color={color} />
    case 'Purchases':
      return <MaterialCommunityIcons name="arrow-down-circle" size={size} color={color} />
    case 'Payroll':
      return <Ionicons name="people-outline" size={size} color={color} />
    case 'Other':
      return <MaterialIcons name="more-horiz" size={size} color={color} />
    case 'Statements':
      return <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
    default:
      return <MaterialIcons name="radio-button-unchecked" size={size} color={color} />
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
        tabBarIcon: ({ color, size }) => getTabIcon(route.name, color, size),
      })}
    >
      <Tab.Screen name="Sales" component={TransactionsSalesScreen} options={{ title: 'Sales' }} />
      <Tab.Screen name="Purchases" component={TransactionsPurchasesScreen} options={{ title: 'Purchases' }} />
      <Tab.Screen name="Payroll" component={TransactionsPayrollScreen} options={{ title: 'Payroll' }} />
      <Tab.Screen name="Other" component={TransactionsOtherScreen} options={{ title: 'Other' }} />
      <Tab.Screen name="Statements" component={TransactionsStatementsScreen} options={{ title: 'Statements' }} />
    </Tab.Navigator>
  )
}

