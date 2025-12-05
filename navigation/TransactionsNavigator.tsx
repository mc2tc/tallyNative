import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TransactionsScaffoldScreen from '../screens/TransactionsScaffoldScreen'
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
import UploadProcessingScreen from '../screens/UploadProcessingScreen'
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
  TransactionsHome: { activeSection?: 'receipts' | 'purchases3' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' }
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
  CreateInvoice: { customerName?: string; projectTitle?: string }
  LeadDetail: { lead: { id: string; title: string; projectTitle?: string; subtitle?: string; amount?: string; stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost' } }
  SalesPipeline: undefined
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
}

const Stack = createStackNavigator<TransactionsStackParamList>()

export function TransactionsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TransactionsHome" component={TransactionsScaffoldScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="ManualPurchaseEntry" component={ManualPurchaseEntryScreen} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
      <Stack.Screen name="LeadDetail" component={LeadDetailScreen} />
      <Stack.Screen name="SalesPipeline" component={SalesPipelineScreen} />
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="ScaffoldViewAll" component={ScaffoldViewAllScreen} />
      <Stack.Screen name="BankStatementRuleDetail" component={BankStatementRuleDetailScreen} />
      <Stack.Screen name="BankStatementRuleCreate" component={BankStatementRuleCreateScreen} />
      <Stack.Screen name="BankStatementRules" component={BankStatementRulesListScreen} />
      <Stack.Screen name="CreditCardRuleDetail" component={CreditCardRuleDetailScreen} />
      <Stack.Screen name="CreditCardRuleCreate" component={CreditCardRuleCreateScreen} />
      <Stack.Screen name="UploadProcessing" component={UploadProcessingScreen} />
    </Stack.Navigator>
  )
}


