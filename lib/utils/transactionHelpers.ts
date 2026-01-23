// Shared helper functions for transaction screens

import type { Transaction } from '../api/transactions2'
import { formatAmount } from './currency'

export type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
  isReportingReady?: boolean
  isCredit?: boolean // True if this is a credit to the account (money coming in)
  originalTransaction?: Transaction
}

// Helper function to truncate title to 24 characters
export function truncateTitle(title: string | undefined | null): string {
  if (!title) return ''
  return title.length > 24 ? title.substring(0, 24) + '...' : title
}

// Helper function to deduplicate transactions by ID
export function deduplicateTransactions(transactions: Transaction[]): Transaction[] {
  const seen = new Set<string>()
  return transactions.filter((tx) => {
    const id = tx.id || (tx.metadata as any)?.id
    if (!id) return false
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

// Helper function to check if transaction is a receipt
export function isReceiptTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string; mechanism?: string }
  }
  const capture = metadata.capture
  return (
    capture?.source === 'purchase_invoice_ocr' ||
    capture?.source === 'manual_entry' ||
    capture?.mechanism === 'ocr' ||
    capture?.mechanism === 'manual' ||
    capture?.source?.includes('purchase') ||
    false
  )
}

// Helper function to check if transaction is a bank transaction (statement entry)
export function isBankTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  // Support both old (bank_statement_ocr) and new (bank_statement_upload) source values
  return metadata.capture?.source === 'bank_statement_upload' || 
         metadata.capture?.source === 'bank_statement_ocr'
}

// Helper function to check if transaction is a credit card transaction (statement entry)
export function isCreditCardTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return metadata.capture?.source === 'credit_card_statement_upload'
}

// Helper function to check if transaction is a POS sale
export function isPOSSaleTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
    classification?: { kind?: string }
  }
  // POS sales have source = 'pos_one_off_item' and kind = 'sale'
  return metadata.capture?.source === 'pos_one_off_item' && metadata.classification?.kind === 'sale'
}

// Helper function to check if transaction has Accounts Receivable as a payment method
export function hasAccountsReceivablePayment(tx: Transaction): boolean {
  try {
    const accounting = tx.accounting as
      | {
          paymentBreakdown?: Array<{ type?: string; paymentType?: string }>
        }
      | undefined
    const details = tx.details as
      | {
          paymentType?: Array<{ type?: string }>
          paymentBreakdown?: Array<{ type?: string }>
        }
      | undefined
    
    // Check accounting.paymentBreakdown first (most common location)
    const paymentBreakdown = accounting?.paymentBreakdown
    // Check details.paymentType (for manual entry)
    const detailsPaymentType = details?.paymentType
    // Check details.paymentBreakdown (alternative location)
    const detailsPaymentBreakdown = details?.paymentBreakdown
    
    const allPaymentMethods =
      paymentBreakdown || detailsPaymentType || detailsPaymentBreakdown || []
    
    if (allPaymentMethods.length === 0) {
      return false
    }
    
    // Check if any payment method is accounts_receivable
    // Handle both { type: 'accounts_receivable' } and { paymentType: 'accounts_receivable' } formats
    return allPaymentMethods.some((pm) => {
      const paymentType = (pm.type || (pm as { paymentType?: string }).paymentType || '').toLowerCase()
      return paymentType === 'accounts_receivable' || paymentType === 'accountsreceivable'
    })
  } catch (error) {
    console.error('Error checking if transaction has Accounts Receivable:', error)
    return false
  }
}

// Helper function to check if transaction is a sale transaction (invoice)
export function isSaleTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    classification?: { kind?: string }
    capture?: { source?: string; mechanism?: string }
  }
  const accounting = tx.accounting as
    | {
        credits?: Array<{ isIncome?: boolean }>
      }
    | undefined

  // Check classification kind
  if (metadata.classification?.kind === 'sale') {
    return true
  }

  // Check for income credits in accounting entries
  if (accounting?.credits?.some(credit => credit.isIncome === true)) {
    return true
  }

  // Check capture source for sale-related sources
  const captureSource = metadata.capture?.source?.toLowerCase() || ''
  if (captureSource.includes('sale') || captureSource.includes('invoice') || captureSource === 'manual') {
    // For manual entries, also check if it's a sale by looking at the transaction type
    // This is a fallback - the backend should set classification.kind = 'sale'
    return true
  }

  return false
}

// Helper function to check if transaction has accounting entries
export function hasAccountingEntries(tx: Transaction): boolean {
  const accounting = tx.accounting as {
    debits?: unknown[]
    credits?: unknown[]
  } | undefined
  return (
    (accounting?.debits?.length ?? 0) > 0 ||
    (accounting?.credits?.length ?? 0) > 0
  )
}

// Helper function to check if transaction is audit ready
// Audit ready = reconciliation.status is 'matched', 'reconciled', 'exception', or 'not_required'
export function isAuditReady(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined
  
  const reconciliationStatus = metadata?.reconciliation?.status
  
  // Audit ready if reconciliation status indicates completion
  return (
    reconciliationStatus === 'matched' ||
    reconciliationStatus === 'reconciled' ||
    reconciliationStatus === 'exception' ||
    reconciliationStatus === 'not_required'
  )
}

// Helper function to check if transaction is unreconciled
export function isUnreconciled(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined
  
  return metadata?.reconciliation?.status === 'unreconciled'
}

// Helper function to check if transaction is a credit to the account (money coming in)
// Based on TRANSACTIONS2_IDENTIFYING_POSITIVE_ACCOUNT_TRANSACTIONS.md
// This checks if the transaction has a positive impact on account balances
export function isCreditToAccount(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    statementContext?: { isCredit?: boolean }
    capture?: { source?: string }
    classification?: { kind?: string }
  }
  const accounting = tx.accounting as {
    debits?: Array<{ chartName?: string; isAsset?: boolean; isLiability?: boolean }>
    credits?: Array<{ isIncome?: boolean }>
  } | undefined

  // 1. Check for bank statement credits (money coming in)
  if (isBankTransaction(tx)) {
    // Check statement context first (most reliable)
    if (metadata.statementContext?.isCredit === true) {
      return true
    }
    // Check accounting entries - Bank account is debited (asset increases)
    if (accounting?.debits?.some(debit => 
      debit.chartName === 'Bank' && debit.isAsset === true
    )) {
      return true
    }
  }

  // 2. Check for credit card statement credits (payments - reduces liability)
  if (isCreditCardTransaction(tx)) {
    // Check statement context first (most reliable)
    if (metadata.statementContext?.isCredit === true) {
      return true
    }
    // Check accounting entries - Card account is debited (liability decreases)
    if (accounting?.debits?.some(debit => 
      debit.chartName === 'Card' && debit.isLiability === true
    )) {
      return true
    }
  }

  // 3. Check for income transactions (sales invoices)
  if (metadata.classification?.kind === 'sale') {
    return true
  }

  // 4. Check for income credits in accounting entries
  if (accounting?.credits?.some(credit => credit.isIncome === true)) {
    return true
  }

  return false
}

// Helper function to check if transaction is cash-only (doesn't need reconciliation)
export function isCashOnlyTransaction(tx: Transaction): boolean {
  try {
    const accounting = tx.accounting as
      | {
          paymentBreakdown?: Array<{ type?: string; paymentType?: string }>
        }
      | undefined
    const details = tx.details as
      | {
          paymentType?: Array<{ type?: string }>
          paymentBreakdown?: Array<{ type?: string }>
        }
      | undefined
    
    // Check accounting.paymentBreakdown first (most common location)
    const paymentBreakdown = accounting?.paymentBreakdown
    // Check details.paymentType (for manual entry)
    const detailsPaymentType = details?.paymentType
    // Check details.paymentBreakdown (alternative location)
    const detailsPaymentBreakdown = details?.paymentBreakdown
    
    const allPaymentMethods =
      paymentBreakdown || detailsPaymentType || detailsPaymentBreakdown || []
    
    if (allPaymentMethods.length === 0) {
      return false
    }
    
    // Check if all payment methods are cash
    // Handle both { type: 'cash' } and { paymentType: 'cash' } formats
    return allPaymentMethods.every((pm) => {
      const paymentType = pm.type || (pm as { paymentType?: string }).paymentType
      return paymentType === 'cash'
    })
  } catch (error) {
    console.error('Error checking if transaction is cash-only:', error)
    return false
  }
}

// Helper function to check if transaction has Accounts Payable as a payment method
export function hasAccountsPayablePayment(tx: Transaction): boolean {
  try {
    const accounting = tx.accounting as
      | {
          paymentBreakdown?: Array<{ type?: string; paymentType?: string }>
        }
      | undefined
    const details = tx.details as
      | {
          paymentType?: Array<{ type?: string }>
          paymentBreakdown?: Array<{ type?: string }>
        }
      | undefined
    
    // Check accounting.paymentBreakdown first (most common location)
    const paymentBreakdown = accounting?.paymentBreakdown
    // Check details.paymentType (for manual entry)
    const detailsPaymentType = details?.paymentType
    // Check details.paymentBreakdown (alternative location)
    const detailsPaymentBreakdown = details?.paymentBreakdown
    
    const allPaymentMethods =
      paymentBreakdown || detailsPaymentType || detailsPaymentBreakdown || []
    
    if (allPaymentMethods.length === 0) {
      return false
    }
    
    // Check if any payment method is Accounts Payable
    // Handle both { type: 'accounts_payable' } and { paymentType: 'accounts_payable' } formats
    // Also check for variations like 'Accounts Payable', 'accounts_payable', etc.
    return allPaymentMethods.some((pm) => {
      const paymentType = (pm.type || (pm as { paymentType?: string }).paymentType || '').toLowerCase()
      return paymentType === 'accounts_payable' || 
             paymentType === 'accounts payable' ||
             paymentType === 'accountspayable'
    })
  } catch (error) {
    console.error('Error checking if transaction has Accounts Payable payment:', error)
    return false
  }
}

// Helper function to parse transaction into TransactionStub
export function parseTransaction3(tx: Transaction): TransactionStub & { originalTransaction: Transaction } {
  const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
  return {
    id: tx.id,
    title: truncateTitle(tx.summary.thirdPartyName),
    amount,
    originalTransaction: tx,
  }
}

