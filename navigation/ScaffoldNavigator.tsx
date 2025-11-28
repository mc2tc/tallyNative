import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import ManualPurchaseEntryScreen from '../screens/ManualPurchaseEntryScreen'
import type { Transaction } from '../lib/api/transactions2'

export type ScaffoldStackParamList = {
  ScaffoldHome: undefined
  ScaffoldViewAll: {
    section: string
    title: string
    items: Array<{
      id: string
      title: string
      amount: string
      subtitle?: string
      verificationItems?: Array<{ label: string; confirmed?: boolean }>
    }>
  }
  TransactionDetail: { transaction: Transaction }
  AddTransaction: { context?: { pipelineSection?: string; bankAccountId?: string; cardId?: string } }
  ManualPurchaseEntry: undefined
}

const Stack = createStackNavigator<ScaffoldStackParamList>()

export function ScaffoldNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScaffoldHome" component={TransactionsScaffoldScreen} />
      <Stack.Screen name="ScaffoldViewAll" component={ScaffoldViewAllScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="ManualPurchaseEntry" component={ManualPurchaseEntryScreen} />
    </Stack.Navigator>
  )
}

