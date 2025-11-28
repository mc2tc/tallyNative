import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import ReportsScreen from '../screens/ReportsScreen'
import CashflowReportScreen from '../screens/CashflowReportScreen'
import ProfitLossReportScreen from '../screens/ProfitLossReportScreen'
import BalanceSheetReportScreen from '../screens/BalanceSheetReportScreen'
import AccountLedgerScreen from '../screens/AccountLedgerScreen'
import type { ChartAccount } from '../lib/api/chartAccounts'

export type ReportsStackParamList = {
  ReportsHome: undefined
  CashflowReport: undefined
  ProfitLossReport: undefined
  BalanceSheetReport: undefined
  AccountLedger: {
    accountName: string
    accountType: 'income' | 'expense' | 'asset' | 'liability' | 'equity'
    accountValue?: number
    period?: {
      startDate: string
      endDate: string
    }
  }
}

const Stack = createStackNavigator<ReportsStackParamList>()

export function ReportsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsHome" component={ReportsScreen} />
      <Stack.Screen name="CashflowReport" component={CashflowReportScreen} />
      <Stack.Screen name="ProfitLossReport" component={ProfitLossReportScreen} />
      <Stack.Screen name="BalanceSheetReport" component={BalanceSheetReportScreen} />
      <Stack.Screen name="AccountLedger" component={AccountLedgerScreen} />
    </Stack.Navigator>
  )
}


