import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScreen from '../screens/TransactionsScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import TransactionListScreen from '../screens/TransactionListScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import type { Transaction } from '../lib/api/transactions2'

export type TransactionsStackParamList = {
  TransactionsHome: undefined
  AddTransaction: undefined
  TransactionList: undefined
  TransactionDetail: { transaction: Transaction }
}

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
    </Stack.Navigator>
  )
}


