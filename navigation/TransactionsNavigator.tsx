import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import TransactionListScreen from '../screens/TransactionListScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import BankStatementRuleDetailScreen from '../screens/BankStatementRuleDetailScreen'
import BankStatementRuleCreateScreen from '../screens/BankStatementRuleCreateScreen'
import CreditCardRuleDetailScreen from '../screens/CreditCardRuleDetailScreen'
import CreditCardRuleCreateScreen from '../screens/CreditCardRuleCreateScreen'
import ManualPurchaseEntryScreen from '../screens/ManualPurchaseEntryScreen'
import type { Transaction } from '../lib/api/transactions2'
import type { BankStatementRule } from '../lib/api/bankStatementRules'
import type { CreditCardRule } from '../lib/api/creditCardRules'

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
  ManualPurchaseEntry: undefined
  TransactionList: undefined
  TransactionDetail: { transaction: Transaction }
  ScaffoldViewAll: {
    section: string
    title: string
    items: TransactionStub[]
    showReconcileButton?: boolean
  }
  BankStatementRuleDetail: { rule: BankStatementRule }
  BankStatementRuleCreate: undefined
  CreditCardRuleDetail: { rule: CreditCardRule }
  CreditCardRuleCreate: undefined
}

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsScaffoldScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="ManualPurchaseEntry" component={ManualPurchaseEntryScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="ScaffoldViewAll" component={ScaffoldViewAllScreen} />
      <Stack.Screen name="BankStatementRuleDetail" component={BankStatementRuleDetailScreen} />
      <Stack.Screen name="BankStatementRuleCreate" component={BankStatementRuleCreateScreen} />
      <Stack.Screen name="CreditCardRuleDetail" component={CreditCardRuleDetailScreen} />
      <Stack.Screen name="CreditCardRuleCreate" component={CreditCardRuleCreateScreen} />
    </Stack.Navigator>
  )
}


