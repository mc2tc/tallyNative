// Shared types for scaffold-related navigation
// Extracted from ScaffoldNavigator for use across multiple screens

import type { Transaction } from '../../lib/api/transactions2'
import type { PrimaryPackaging, SecondaryPackaging } from '../../lib/api/packaging'

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

