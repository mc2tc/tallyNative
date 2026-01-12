import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import ManualPurchaseEntryScreen from '../screens/ManualPurchaseEntryScreen'
import UploadProcessingScreen from '../screens/UploadProcessingScreen'
import ManageStockScreen from '../screens/ManageStockScreen'
import EditPackagingScreen from '../screens/EditPackagingScreen'
import type { Transaction } from '../lib/api/transactions2'
import type { PrimaryPackaging, SecondaryPackaging } from '../lib/api/packaging'

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
    imageUri?: string
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
  ManageStock: { 
    itemName: string
    itemText: string
    businessId: string
    inventoryItemId?: string
    transactionId?: string
    itemIndex?: number
    transactionItem?: any
  }
  EditPackaging: {
    packaging: PrimaryPackaging | SecondaryPackaging
    packagingType: 'primary' | 'secondary'
    onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => void
    onDelete?: () => void
    manageStockParams?: { itemName: string; itemText: string; businessId: string; inventoryItemId?: string }
  }
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
      <Stack.Screen name="ManageStock" component={ManageStockScreen} />
      <Stack.Screen name="EditPackaging" component={EditPackagingScreen} />
    </Stack.Navigator>
  )
}

