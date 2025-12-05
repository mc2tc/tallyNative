import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import ManualPurchaseEntryScreen from '../screens/ManualPurchaseEntryScreen'
import UploadProcessingScreen from '../screens/UploadProcessingScreen'
import type { Transaction } from '../lib/api/transactions2'

export type ScaffoldStackParamList = {
  ScaffoldHome: { activeSection?: 'receipts' | 'purchases3' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' }
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
    showReconcileButton?: boolean
    pipelineSection?: string
  }
  TransactionDetail: { transaction: Transaction }
  AddTransaction: { context?: { pipelineSection?: string; bankAccountId?: string; cardId?: string } }
  UploadProcessing: { 
    pdfFileName?: string
    pdfUri?: string
    isPdf: boolean
    success: boolean
    pipelineSection?: string
    businessId?: string
    localUri: string
    fileNameHint?: string
    contentType?: string
    transactionType: 'purchase' | 'sale' | 'bank_transaction' | 'credit_card_transaction' | 'internal'
    inputMethod: 'ocr_pdf' | 'ocr_image'
  }
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
      <Stack.Screen name="UploadProcessing" component={UploadProcessingScreen} />
      <Stack.Screen name="ManualPurchaseEntry" component={ManualPurchaseEntryScreen} />
    </Stack.Navigator>
  )
}

