import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import TransactionListScreen from '../screens/TransactionListScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import type { Transaction } from '../lib/api/transactions2'

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
}

export type TransactionsStackParamList = {
  TransactionsHome: undefined
  AddTransaction: { context?: { pipelineSection?: string; bankAccountId?: string; cardId?: string } }
  TransactionList: undefined
  TransactionDetail: { transaction: Transaction }
  ScaffoldViewAll: {
    section: string
    title: string
    items: TransactionStub[]
  }
}

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsScaffoldScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="ScaffoldViewAll" component={ScaffoldViewAllScreen} />
    </Stack.Navigator>
  )
}


