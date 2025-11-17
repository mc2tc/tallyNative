import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScreen from '../screens/TransactionsScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'

export type TransactionsStackParamList = {
  TransactionsHome: undefined
  AddTransaction: undefined
}

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    </Stack.Navigator>
  )
}


