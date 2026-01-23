import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { TransactionsBottomNavigator } from './TransactionsBottomNavigator'
import AddTransactionScreen from '../screens/AddTransactionScreen'
import TransactionListScreen from '../screens/TransactionListScreen'
import TransactionDetailScreen from '../screens/TransactionDetailScreen'
import ScaffoldViewAllScreen from '../screens/ScaffoldViewAllScreen'
import BankStatementRuleDetailScreen from '../screens/BankStatementRuleDetailScreen'
import BankStatementRuleCreateScreen from '../screens/BankStatementRuleCreateScreen'
import BankStatementRulesListScreen from '../screens/BankStatementRulesListScreen'
import CreditCardRuleDetailScreen from '../screens/CreditCardRuleDetailScreen'
import CreditCardRuleCreateScreen from '../screens/CreditCardRuleCreateScreen'
import ManualPurchaseEntryScreen from '../screens/ManualPurchaseEntryScreen'
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen'
import LeadDetailScreen from '../screens/LeadDetailScreen'
import SalesPipelineScreen from '../screens/SalesPipelineScreen'
import AddCustomerScreen from '../screens/AddCustomerScreen'
import UploadProcessingScreen from '../screens/UploadProcessingScreen'
import ManageStockScreen from '../screens/ManageStockScreen'
import EditPackagingScreen from '../screens/EditPackagingScreen'
import type { Transaction } from '../lib/api/transactions2'
import type { BankStatementRule } from '../lib/api/bankStatementRules'
import type { CreditCardRule } from '../lib/api/creditCardRules'
import type { PrimaryPackaging, SecondaryPackaging } from '../lib/api/packaging'

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
}

export type TransactionsStackParamList = {
  TransactionsHome: { activeSection?: 'receipts' | 'purchases3' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' }
  AddTransaction: { context?: { pipelineSection?: string; bankAccountId?: string; cardId?: string } }
  UploadProcessing: { 
    pdfFileName?: string
    pdfUri?: string
    imageUri?: string
    isPdf: boolean
    success: boolean
    pipelineSection?: string
    bankAccountId?: string
    cardId?: string
    businessId?: string
    localUri: string
    fileNameHint?: string
    contentType?: string
    transactionType: 'purchase' | 'sale' | 'bank_transaction' | 'credit_card_transaction' | 'internal'
    inputMethod: 'ocr_pdf' | 'ocr_image'
  }
  ManualPurchaseEntry: undefined
  CreateInvoice: { customerName?: string; projectTitle?: string }
  LeadDetail: { lead: { id: string; title: string; projectTitle?: string; subtitle?: string; amount?: string; stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost' } }
  SalesPipeline: undefined
  AddCustomer: undefined
  TransactionList: undefined
  TransactionDetail: { transaction: Transaction }
  ScaffoldViewAll: {
    section: string
    title: string
    items: TransactionStub[]
    showReconcileButton?: boolean
    pipelineSection?: string
  }
  BankStatementRuleDetail: { rule: BankStatementRule }
  BankStatementRuleCreate: undefined
  BankStatementRules: undefined
  CreditCardRuleDetail: { rule: CreditCardRule }
  CreditCardRuleCreate: undefined
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

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsBottomNavigator} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="ManualPurchaseEntry" component={ManualPurchaseEntryScreen} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
      <Stack.Screen name="SalesPipeline" component={SalesPipelineScreen} />
      <Stack.Screen name="AddCustomer" component={AddCustomerScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="ScaffoldViewAll" component={ScaffoldViewAllScreen} />
      <Stack.Screen name="BankStatementRuleDetail" component={BankStatementRuleDetailScreen} />
      <Stack.Screen name="BankStatementRuleCreate" component={BankStatementRuleCreateScreen} />
      <Stack.Screen name="BankStatementRules" component={BankStatementRulesListScreen} />
      <Stack.Screen name="CreditCardRuleDetail" component={CreditCardRuleDetailScreen} />
      <Stack.Screen name="CreditCardRuleCreate" component={CreditCardRuleCreateScreen} />
      <Stack.Screen name="UploadProcessing" component={UploadProcessingScreen} />
      <Stack.Screen name="ManageStock" component={ManageStockScreen} />
      <Stack.Screen name="EditPackaging" component={EditPackagingScreen} />
    </Stack.Navigator>
  )
}


