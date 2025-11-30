import React, { useCallback, useEffect, useState, useRef } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, reconciliationApi, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import { bankAccountsApi, type BankAccount } from '../lib/api/bankAccounts'
import { creditCardsApi, type CreditCard } from '../lib/api/creditCards'
import { bankStatementRulesApi, type BankStatementRule } from '../lib/api/bankStatementRules'
import { creditCardRulesApi, type CreditCardRule } from '../lib/api/creditCardRules'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PipelineColumn = {
  title: string
  actions: string[]
  transactions?: Array<TransactionStub & { originalTransaction?: Transaction }>
  rules?: BankStatementRule[] | CreditCardRule[]
}

type TransactionStub = {
  id: string
  title: string
  amount: string
  subtitle?: string
  verificationItems?: Array<{ label: string; confirmed?: boolean }>
  isReportingReady?: boolean
  isCredit?: boolean // True if this is a credit to the account (money coming in)
}

// Helper function to parse transaction into TransactionStub
function parseTransaction(tx: Transaction): TransactionStub | null {
  const metadata = tx.metadata as {
    capture?: { source?: string; mechanism?: string }
    verification?: { status?: string }
    reconciliation?: { status?: string }
  }
  const capture = metadata.capture
  const verification = metadata.verification
  const reconciliation = metadata.reconciliation
  const accounting = tx.accounting as
    | {
        paymentBreakdown?: Array<{ userConfirmed?: boolean; type?: string }>
      }
    | undefined
  const details = tx.details as
    | {
        itemList?: Array<{ debitAccountConfirmed?: boolean }>
      }
    | undefined

  // Check if this is a receipt (purchase_invoice_ocr, manual_entry, or similar)
  const isReceipt =
    capture?.source === 'purchase_invoice_ocr' ||
    capture?.source === 'manual_entry' ||
    capture?.mechanism === 'ocr' ||
    capture?.mechanism === 'manual' ||
    capture?.source?.includes('purchase')

  if (!isReceipt) {
    return null
  }

  const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)

  // Check verification status
  const isUnverified = verification?.status === 'unverified'

  if (isUnverified) {
    // Return simple transaction card - verification details will be shown on click
    return {
      id: tx.id,
      title: tx.summary.thirdPartyName,
      amount,
    }
  }

  // For verified transactions, check if it's reporting ready
  // A transaction is reporting ready if:
  // - verification status is verified/exception AND
  // - (reconciliation status is matched/reconciled/exception OR it's cash-only)
  // Note: Backend sets reconciliation.status = 'reconciled' for cash when verified via confirmVerification
  // But manual entry transactions may be created as verified, so we check cash-only as fallback
  const isCashOnly = isCashOnlyTransaction(tx)
  const isReportingReady =
    verification?.status !== 'unverified' &&
    (isCashOnly ||
      reconciliation?.status === 'matched' ||
      reconciliation?.status === 'reconciled' ||
      reconciliation?.status === 'exception')

  // For verified transactions, return without verification items
  return {
    id: tx.id,
    title: tx.summary.thirdPartyName,
    amount,
    isReportingReady,
  }
}


// Helper function to check if transaction is a receipt
function isReceiptTransaction(tx: Transaction): boolean {
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
function isBankTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return metadata.capture?.source === 'bank_statement_ocr'
}

// Helper function to check if transaction is a credit card transaction (statement entry)
function isCreditCardTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return metadata.capture?.source === 'credit_card_statement_ocr'
}

// Helper function to check if transaction has accounting entries
function hasAccountingEntries(tx: Transaction): boolean {
  const accounting = tx.accounting as {
    debits?: unknown[]
    credits?: unknown[]
  } | undefined
  return (
    (accounting?.debits?.length ?? 0) > 0 ||
    (accounting?.credits?.length ?? 0) > 0
  )
}

// Helper function to check if transaction is a credit to the account (money coming in)
// Based on TRANSACTIONS2_IDENTIFYING_POSITIVE_ACCOUNT_TRANSACTIONS.md
// This checks if the transaction has a positive impact on account balances
function isCreditToAccount(tx: Transaction): boolean {
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
function isCashOnlyTransaction(tx: Transaction): boolean {
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


type SectionKey = 'receipts' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' | 'payroll' | 'financialServices'

// Base section nav - will be filtered based on available accounts/cards
const baseSectionNav: Array<{ key: SectionKey; label: string }> = [
  { key: 'receipts', label: 'Purchases' },
  { key: 'bank', label: 'Bank Transactions' },
  { key: 'cards', label: 'Credit Card Transactions' },
  { key: 'sales', label: 'Sales Pipeline' },
  { key: 'internal', label: 'Internal Transactions' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'financialServices', label: 'Financial Services' },
  { key: 'reporting', label: 'Reporting Ready' },
]

// Helper function to extract last 4 digits from account/card number
function getLastFour(number: string): string {
  const digits = number.replace(/\D/g, '')
  return digits.slice(-4) || ''
}

export default function TransactionsScaffoldScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const route = useRoute<RouteProp<TransactionsStackParamList, 'TransactionsHome'>>()
  const { businessUser, memberships } = useAuth()
  const [activeSection, setActiveSection] = useState<SectionKey>(route.params?.activeSection || 'receipts')
  const [navAtEnd, setNavAtEnd] = useState(false)
  const sectionNavScrollRef = useRef<ScrollView>(null)
  const buttonPositionsRef = useRef<Map<string, { x: number; width: number }>>(new Map())
  const containerWidthRef = useRef<number>(0)

  // Function to center the selected navigation button
  const centerSelectedButton = (sectionKey: string) => {
    const buttonInfo = buttonPositionsRef.current.get(sectionKey)
    const containerWidth = containerWidthRef.current
    
    if (buttonInfo && containerWidth > 0 && sectionNavScrollRef.current) {
      const buttonCenterX = buttonInfo.x + buttonInfo.width / 2
      const scrollX = buttonCenterX - containerWidth / 2
      
      sectionNavScrollRef.current.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      })
    }
  }

  // Update active section when route params change (e.g., when navigating back from upload)
  useEffect(() => {
    if (route.params?.activeSection) {
      console.log('TransactionsScaffoldScreen: Setting activeSection from route params:', route.params.activeSection)
      setActiveSection(route.params.activeSection)
    }
  }, [route.params?.activeSection])

  // Center the button when activeSection changes
  useEffect(() => {
    // Small delay to ensure layout has completed
    const timer = setTimeout(() => {
      centerSelectedButton(activeSection)
    }, 100)
    return () => clearTimeout(timer)
  }, [activeSection])

  // Also update when screen comes into focus (in case params were set before screen mounted)
  // Also refresh transactions when screen comes into focus (e.g., after upload)
  useFocusEffect(
    useCallback(() => {
      if (route.params?.activeSection) {
        console.log('TransactionsScaffoldScreen: Setting activeSection from route params (focus):', route.params.activeSection)
        setActiveSection(route.params.activeSection)
      }
      
      // Refresh transactions when screen comes into focus (to show newly created transactions)
      if (businessId) {
        const refreshTransactions = async () => {
          try {
            const response = await transactions2Api.getTransactions(businessId, {
              page: 1,
              limit: 200,
            })
            console.log('TransactionsScaffoldScreen: Refreshed transactions on focus, count:', response.transactions.length)
            setAllTransactions(response.transactions)
          } catch (error) {
            console.error('TransactionsScaffoldScreen: Failed to refresh transactions on focus:', error)
          }
        }
        refreshTransactions()
      }
    }, [route.params?.activeSection, businessId])
  )
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [bankStatementRules, setBankStatementRules] = useState<BankStatementRule[]>([])
  const [creditCardRules, setCreditCardRules] = useState<CreditCardRule[]>([])
  const [reconciling, setReconciling] = useState(false)

  // Choose businessId (same logic as TransactionsScreen)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Fetch bank accounts and credit cards
  useFocusEffect(
    useCallback(() => {
      if (!businessId) return

      const fetchAccountsAndCards = async () => {
        try {
          const [accounts, cards] = await Promise.all([
            bankAccountsApi.getBankAccounts(businessId),
            creditCardsApi.getCreditCards(businessId),
          ])
          setBankAccounts(accounts)
          setCreditCards(cards)
          
          // Set selected account/card to first one if available and not already set
          if (accounts.length > 0 && !selectedBankAccount) {
            setSelectedBankAccount(accounts[0].accountNumber)
          }
          if (cards.length > 0 && !selectedCard) {
            setSelectedCard(cards[0].cardNumber)
          }
        } catch (error) {
          console.error('Failed to fetch accounts/cards:', error)
          setBankAccounts([])
          setCreditCards([])
        }
      }

      fetchAccountsAndCards()
    }, [businessId]),
  )

  // Fetch bank statement rules
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setBankStatementRules([])
        return
      }

      const fetchRules = async () => {
        try {
          const response = await bankStatementRulesApi.getRules(businessId)
          setBankStatementRules(response.rules)
        } catch (error) {
          console.error('Failed to fetch bank statement rules:', error)
          setBankStatementRules([])
        }
      }

      fetchRules()
    }, [businessId]),
  )

  // Fetch credit card rules
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setCreditCardRules([])
        return
      }

      const fetchRules = async () => {
        try {
          const response = await creditCardRulesApi.getRules(businessId)
          setCreditCardRules(response.rules)
        } catch (error) {
          console.error('Failed to fetch credit card rules:', error)
          setCreditCardRules([])
        }
      }

      fetchRules()
    }, [businessId]),
  )

  // Fetch transactions
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setLoading(false)
        return
      }

      const fetchTransactions = async () => {
        try {
          setLoading(true)
          // Fetch all transactions (no classificationKind filter) to include:
          // - Purchase receipts (classification.kind === 'purchase')
          // - Bank statements (classification.kind === 'statement_entry' with capture.source === 'bank_statement_ocr')
          // - Credit card statements (classification.kind === 'statement_entry' with capture.source === 'credit_card_statement_ocr')
          const response = await transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 200, // Fetch more to include all transaction types
          })
          setAllTransactions(response.transactions)
        } catch (error) {
          console.error('Failed to fetch transactions:', error)
          setAllTransactions([])
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }, [businessId]),
  )

  // Parse and categorize transactions
  const parsedTransactions = allTransactions
    .map((tx) => ({ original: tx, parsed: parseTransaction(tx) }))
    .filter((item): item is { original: Transaction; parsed: TransactionStub } => item.parsed !== null)

  const needsVerificationTransactions = parsedTransactions
    .filter((item) => {
      const metadata = item.original.metadata as {
        verification?: { status?: string }
      }
      return metadata.verification?.status === 'unverified'
    })
    .sort((a, b) => {
      // Sort by updatedAt (most recent first), fallback to createdAt
      const aDate = (a.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
        (a.original.metadata as { createdAt?: number }).createdAt ||
        0
      const bDate = (b.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
        (b.original.metadata as { createdAt?: number }).createdAt ||
        0
      return bDate - aDate
    })
    .slice(0, 3) // Show only 3 most recent
    .map((item) => ({ ...item.parsed, originalTransaction: item.original }))

  // Verified transactions that need matching (not reporting ready)
  const verifiedNeedsMatchTransactions = parsedTransactions
    .filter((item) => {
      const metadata = item.original.metadata as {
        verification?: { status?: string }
      }
      return (
        metadata.verification?.status !== 'unverified' && !item.parsed.isReportingReady
      )
    })
    .sort((a, b) => {
      // Sort by updatedAt (most recent first), fallback to createdAt
      const aDate = (a.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
        (a.original.metadata as { createdAt?: number }).createdAt ||
        0
      const bDate = (b.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
        (b.original.metadata as { createdAt?: number }).createdAt ||
        0
      return bDate - aDate
    })
    .slice(0, 3) // Show only 3 most recent
    .map((item) => ({ ...item.parsed, originalTransaction: item.original }))

  // Reporting ready transactions (all sources: receipts, bank, credit cards)
  // Condition: Transaction is reconciled OR (verified with accounting entries) OR (verified cash-only)
  // Reconciled transactions go directly to Reporting Ready
  // Cash-only transactions don't need reconciliation
  // This feeds the Reports screen and the "Reporting ready" section
  const reportingReadySourceTransactions = allTransactions.filter((tx) => {
    const metadata = tx.metadata as {
      verification?: { status?: string }
      reconciliation?: { status?: string }
      capture?: { source?: string }
    }
    const verificationStatus = metadata.verification?.status
    const reconciliationStatus = metadata.reconciliation?.status

    // Check if verified (including exception)
    const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
    
    // Check if reconciled
    const isReconciled =
      reconciliationStatus === 'matched' ||
      reconciliationStatus === 'reconciled' ||
      reconciliationStatus === 'exception'

    // Check if has accounting entries
    const hasEntries = hasAccountingEntries(tx)

    // Check if cash-only (fallback for manual entry transactions that may not have reconciliation.status set)
    const isCashOnly = isCashOnlyTransaction(tx)

    // Reporting ready if: reconciled OR (verified AND has accounting entries) OR (verified cash-only)
    // Reconciled transactions go directly to Reporting Ready
    // Note: Backend sets reconciliation.status = 'reconciled' for cash when verified via confirmVerification
    // But manual entry transactions may be created as verified, so we check cash-only as fallback
    // Includes all sources: purchase receipts, bank statements, and credit card statements
    return isReconciled || (isVerified && hasEntries) || (isVerified && isCashOnly)
  })

  // Sort reporting ready transactions by most recent first
  const sortedReportingReadySourceTransactions = reportingReadySourceTransactions.sort((a, b) => {
    const aMeta = a.metadata as { updatedAt?: number; createdAt?: number }
    const bMeta = b.metadata as { updatedAt?: number; createdAt?: number }
    const aDate = aMeta.updatedAt || aMeta.createdAt || 0
    const bDate = bMeta.updatedAt || bMeta.createdAt || 0
    return bDate - aDate
  })

  // Full list of reporting ready transactions (all sources)
  const reportingReadyTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    sortedReportingReadySourceTransactions.map((tx) => {
      const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
      return {
        id: tx.id,
        title: tx.summary.thirdPartyName,
        amount,
        isReportingReady: true,
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }
    })


  // Get last 3 receipts that are now Reporting Ready (to show pipeline progress)
  const recentReportingReadyReceipts: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        const metadata = tx.metadata as {
          capture?: { source?: string; mechanism?: string }
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const capture = metadata.capture
        const verification = metadata.verification
        const reconciliation = metadata.reconciliation

        // Check if this is a receipt
        const isReceipt =
          capture?.source === 'purchase_invoice_ocr' ||
          capture?.source === 'manual_entry' ||
          capture?.mechanism === 'ocr' ||
          capture?.mechanism === 'manual' ||
          capture?.source?.includes('purchase')

        if (!isReceipt) {
          return false
        }

        // Check if cash-only (fallback for manual entry)
        const isCashOnly = isCashOnlyTransaction(tx)

        // Check if it's reporting ready
        // Note: Backend sets reconciliation.status = 'reconciled' for cash when verified via confirmVerification
        const isReportingReady =
          verification?.status !== 'unverified' &&
          (isCashOnly ||
            reconciliation?.status === 'matched' ||
            reconciliation?.status === 'reconciled' ||
            reconciliation?.status === 'exception')

        return isReportingReady
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Get last 3
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isReportingReady: true,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Bank transactions that need verification (no reconciliation required)
  // Condition: Has accounting entries (rule matched) but is not yet verified
  // IMPORTANT: Exclude auto-reconciled transactions (they go to Reporting Ready)
  const bankNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a bank transaction
        if (!isBankTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        
        // Check if it has accounting entries (rule matched)
        const hasEntries = hasAccountingEntries(tx)
        
        // Check verification status
        const verificationStatus = metadata.verification?.status
        const isVerified = verificationStatus === 'verified'
        const isException = verificationStatus === 'exception'

        // Check if already reconciled (auto-reconciled transactions skip verification)
        const reconciliationStatus = metadata.reconciliation?.status
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Needs verification if: has accounting entries AND not verified/exception AND not reconciled
        return hasEntries && !isVerified && !isException && !isReconciled
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Bank transactions that need reconciliation
  // Condition: Transaction has no accounting entries (no rule matched) and is not yet reconciled
  // IMPORTANT: Transactions with accounting entries that are verified should NOT appear here
  // They should go to "Reporting Ready" instead
  const bankNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a bank transaction
        if (!isBankTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const reconciliationStatus = metadata.reconciliation?.status

        // Check if it has accounting entries
        const hasEntries = hasAccountingEntries(tx)
        
        // Check if reconciled
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Needs reconciliation if:
        // - No accounting entries (no rule matched) - skip verification, go straight to reconciliation
        // - AND not yet reconciled
        // IMPORTANT: Do NOT include verified transactions with accounting entries here
        return !hasEntries && !isReconciled
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Get last 3 bank transactions that are now Reporting Ready (to show pipeline progress)
  // Condition: Transaction is reconciled OR (verified with accounting entries)
  // Reconciled transactions go directly to Reporting Ready
  const recentReportingReadyBank: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a bank transaction
        if (!isBankTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const verificationStatus = metadata.verification?.status
        const reconciliationStatus = metadata.reconciliation?.status

        // Check if verified (including exception)
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        
        // Check if reconciled
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Check if has accounting entries
        const hasEntries = hasAccountingEntries(tx)

        // Reporting ready if: reconciled OR (verified AND has accounting entries)
        // Reconciled transactions go directly to Reporting Ready
        return isReconciled || (isVerified && hasEntries)
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Get last 3
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isReportingReady: true,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Card transactions that need verification (no reconciliation required)
  // Condition: Has accounting entries (rule matched) but is not yet verified
  // IMPORTANT: Exclude auto-reconciled transactions (they go to Reporting Ready)
  const cardNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a credit card transaction
        if (!isCreditCardTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        
        // Check if it has accounting entries (rule matched)
        const hasEntries = hasAccountingEntries(tx)
        
        // Check verification status
        const verificationStatus = metadata.verification?.status
        const isVerified = verificationStatus === 'verified'
        const isException = verificationStatus === 'exception'

        // Check if already reconciled (auto-reconciled transactions skip verification)
        const reconciliationStatus = metadata.reconciliation?.status
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Needs verification if: has accounting entries AND not verified/exception AND not reconciled
        return hasEntries && !isVerified && !isException && !isReconciled
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Card transactions that need reconciliation
  // Condition: Transaction has no accounting entries (no rule matched) and is not yet reconciled
  const cardNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a credit card transaction
        if (!isCreditCardTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const reconciliationStatus = metadata.reconciliation?.status

        // Check if it has accounting entries
        const hasEntries = hasAccountingEntries(tx)
        
        // Check if reconciled
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Needs reconciliation if:
        // - No accounting entries (no rule matched) - skip verification, go straight to reconciliation
        // - AND not yet reconciled
        return !hasEntries && !isReconciled
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Get last 3 card transactions that are now Reporting Ready (to show pipeline progress)
  // Condition: Transaction is reconciled OR (verified with accounting entries)
  // Reconciled transactions go directly to Reporting Ready
  const recentReportingReadyCards: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        // Must be a credit card transaction
        if (!isCreditCardTransaction(tx)) {
          return false
        }

        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const verificationStatus = metadata.verification?.status
        const reconciliationStatus = metadata.reconciliation?.status

        // Check if verified (including exception)
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        
        // Check if reconciled
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'

        // Check if has accounting entries
        const hasEntries = hasAccountingEntries(tx)

        // Reporting ready if: reconciled OR (verified AND has accounting entries)
        // Reconciled transactions go directly to Reporting Ready
        return isReconciled || (isVerified && hasEntries)
      })
      .sort((a, b) => {
        // Sort by updatedAt (most recent first), fallback to createdAt
        const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (a.metadata as { createdAt?: number }).createdAt ||
          0
        const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
          (b.metadata as { createdAt?: number }).createdAt ||
          0
        return bDate - aDate
      })
      .slice(0, 3) // Get last 3
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isReportingReady: true,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Create full transaction lists (before slicing) for "View all" functionality
  // These are the complete lists that will be shown when user clicks "View all"
  const getFullTransactions = (columnTitle: string): Array<TransactionStub & { originalTransaction?: Transaction }> => {
    switch (columnTitle) {
      case 'Needs verification':
        return parsedTransactions
          .filter((item) => {
            const metadata = item.original.metadata as {
              verification?: { status?: string }
            }
            return metadata.verification?.status === 'unverified'
          })
          .sort((a, b) => {
            const aDate = (a.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
              (a.original.metadata as { createdAt?: number }).createdAt ||
              0
            const bDate = (b.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
              (b.original.metadata as { createdAt?: number }).createdAt ||
              0
            return bDate - aDate
          })
          .map((item) => ({ ...item.parsed, originalTransaction: item.original }))
      
      case 'Verified, needs match':
        return parsedTransactions
          .filter((item) => {
            const metadata = item.original.metadata as {
              verification?: { status?: string }
            }
            return (
              metadata.verification?.status !== 'unverified' && !item.parsed.isReportingReady
            )
          })
          .sort((a, b) => {
            const aDate = (a.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
              (a.original.metadata as { createdAt?: number }).createdAt ||
              0
            const bDate = (b.original.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
              (b.original.metadata as { createdAt?: number }).createdAt ||
              0
            return bDate - aDate
          })
          .map((item) => ({ ...item.parsed, originalTransaction: item.original }))
      
      case 'Needs verification (no reconciliation required)':
        if (activeSection === 'bank') {
          return allTransactions
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const metadata = tx.metadata as { 
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const hasEntries = hasAccountingEntries(tx)
              const verificationStatus = metadata.verification?.status
              const isVerified = verificationStatus === 'verified'
              const isException = verificationStatus === 'exception'
              const reconciliationStatus = metadata.reconciliation?.status
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              // Exclude auto-reconciled transactions (they go to Reporting Ready)
              return hasEntries && !isVerified && !isException && !isReconciled
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else {
          return allTransactions
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const metadata = tx.metadata as { 
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const hasEntries = hasAccountingEntries(tx)
              const verificationStatus = metadata.verification?.status
              const isVerified = verificationStatus === 'verified'
              const isException = verificationStatus === 'exception'
              const reconciliationStatus = metadata.reconciliation?.status
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              // Exclude auto-reconciled transactions (they go to Reporting Ready)
              return hasEntries && !isVerified && !isException && !isReconciled
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        }
      
      case 'Needs reconciliation':
        if (activeSection === 'bank') {
          return allTransactions
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const reconciliationStatus = metadata.reconciliation?.status
              const hasEntries = hasAccountingEntries(tx)
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              return !hasEntries && !isReconciled
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else {
          return allTransactions
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const reconciliationStatus = metadata.reconciliation?.status
              const hasEntries = hasAccountingEntries(tx)
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              return !hasEntries && !isReconciled
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        }
      
      case 'Reporting ready':
        if (activeSection === 'receipts') {
          return allTransactions
            .filter((tx) => {
              const metadata = tx.metadata as {
                capture?: { source?: string; mechanism?: string }
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const capture = metadata.capture
              const verification = metadata.verification
              const reconciliation = metadata.reconciliation
              const isReceipt =
                capture?.source === 'purchase_invoice_ocr' ||
                capture?.source === 'manual_entry' ||
                capture?.mechanism === 'ocr' ||
                capture?.mechanism === 'manual' ||
                capture?.source?.includes('purchase')
              if (!isReceipt) return false
              
              // Check if cash-only (fallback for manual entry)
              const isCashOnly = isCashOnlyTransaction(tx)
              
              // Check if it's reporting ready
              // Note: Backend sets reconciliation.status = 'reconciled' for cash when verified via confirmVerification
              const isReportingReady =
                verification?.status !== 'unverified' &&
                (isCashOnly ||
                  reconciliation?.status === 'matched' ||
                  reconciliation?.status === 'reconciled' ||
                  reconciliation?.status === 'exception')
              return isReportingReady
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isReportingReady: true,
              originalTransaction: tx,
            }))
        } else if (activeSection === 'bank') {
          return allTransactions
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const verificationStatus = metadata.verification?.status
              const reconciliationStatus = metadata.reconciliation?.status
              const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              const hasEntries = hasAccountingEntries(tx)
              return isReconciled || (isVerified && hasEntries)
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isReportingReady: true,
              originalTransaction: tx,
            }))
        } else {
          return allTransactions
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const verificationStatus = metadata.verification?.status
              const reconciliationStatus = metadata.reconciliation?.status
              const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              const hasEntries = hasAccountingEntries(tx)
              return isReconciled || (isVerified && hasEntries)
            })
            .sort((a, b) => {
              const aDate = (a.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (a.metadata as { createdAt?: number }).createdAt || 0
              const bDate = (b.metadata as { updatedAt?: number; createdAt?: number }).updatedAt ||
                (b.metadata as { createdAt?: number }).createdAt || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isReportingReady: true,
              originalTransaction: tx,
            }))
        }
      
      default:
        return []
    }
  }

  // Update receiptColumns with real data
  const receiptColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification',
      actions: ['View all'],
      transactions: needsVerificationTransactions,
    },
    {
      title: 'Verified, needs match',
      actions: ['View all'],
      transactions: verifiedNeedsMatchTransactions,
    },
    {
      title: 'Reporting ready',
      actions: ['View all'],
      transactions: recentReportingReadyReceipts,
    },
  ]

  // Update bankColumns with real data
  const bankColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification (no reconciliation required)',
      actions: ['View all'],
      transactions: bankNeedsVerificationTransactions,
    },
    {
      title: 'Needs reconciliation',
      actions: ['View all'],
      transactions: bankNeedsReconciliationTransactions,
    },
    {
      title: 'Reporting ready',
      actions: ['View all'],
      transactions: recentReportingReadyBank,
    },
    {
      title: 'Auto bank rules',
      actions: ['View all', '+ Add rules'],
      rules: bankStatementRules,
    },
  ]

  // Update cardsColumns with real data
  const cardsColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification (no reconciliation required)',
      actions: ['View all'],
      transactions: cardNeedsVerificationTransactions,
    },
    {
      title: 'Needs reconciliation',
      actions: ['View all'],
      transactions: cardNeedsReconciliationTransactions,
    },
    {
      title: 'Reporting ready',
      actions: ['View all'],
      transactions: recentReportingReadyCards,
    },
    {
      title: 'Auto card rules',
      actions: ['View all', '+ Add rules'],
      rules: creditCardRules,
    },
  ]

  // Handler for Add button with context
  const handleAddClick = () => {
    const context = {
      pipelineSection: activeSection,
      ...(activeSection === 'bank' && selectedBankAccount && { bankAccountId: selectedBankAccount }),
      ...(activeSection === 'cards' && selectedCard && { cardId: selectedCard }),
    }
    
    // Navigate to AddTransaction screen with context
    navigation.navigate('AddTransaction', { context })
  }

  // Handler for Reconcile button - calls reconciliation API endpoint
  const handleReconcileClick = async () => {
    if (!businessId) {
      console.error('Cannot reconcile: businessId is missing')
      return
    }

    if (activeSection !== 'bank' && activeSection !== 'cards') {
      console.error('Reconcile button should only be shown for bank or cards sections')
      return
    }

    try {
      setReconciling(true)
      
      // Call the appropriate reconciliation endpoint based on active section
      const response =
        activeSection === 'bank'
          ? await reconciliationApi.reconcileBank(businessId)
          : await reconciliationApi.reconcileCreditCard(businessId)

      console.log(`Reconciliation completed: ${response.matched} transactions matched`)
      
      // Refresh transactions to show updated reconciliation statuses
      // Reconciled transactions will appear in "Reporting Ready"
      if (response.matched > 0) {
        const refreshResponse = await transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 200,
        })
        setAllTransactions(refreshResponse.transactions)
      }
    } catch (error) {
      console.error('Failed to reconcile transactions:', error)
      // TODO: Show user-friendly error message (Alert or toast notification)
    } finally {
      setReconciling(false)
    }
  }

  // Filter section nav to only show bank/cards if they exist
  const sectionNav = baseSectionNav.filter((section) => {
    if (section.key === 'bank') {
      return bankAccounts.length > 0
    }
    if (section.key === 'cards') {
      return creditCards.length > 0
    }
    return true
  })

  // If current section is bank/cards but no accounts/cards exist, switch to receipts
  useEffect(() => {
    if (activeSection === 'bank' && bankAccounts.length === 0) {
      setActiveSection('receipts')
    }
    if (activeSection === 'cards' && creditCards.length === 0) {
      setActiveSection('receipts')
    }
  }, [activeSection, bankAccounts.length, creditCards.length])

  // Update selected account/card if current selection no longer exists
  useEffect(() => {
    if (bankAccounts.length > 0 && selectedBankAccount) {
      const accountExists = bankAccounts.some((acc) => acc.accountNumber === selectedBankAccount)
      if (!accountExists) {
        setSelectedBankAccount(bankAccounts[0].accountNumber)
      }
    }
  }, [bankAccounts, selectedBankAccount])

  useEffect(() => {
    if (creditCards.length > 0 && selectedCard) {
      const cardExists = creditCards.some((card) => card.cardNumber === selectedCard)
      if (!cardExists) {
        setSelectedCard(creditCards[0].cardNumber)
      }
    }
  }, [creditCards, selectedCard])

  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    if (!businessId) return
    
    setRefreshing(true)
    try {
      // Refetch all transactions
      const response = await transactions2Api.getTransactions(businessId, {
        page: 1,
        limit: 200,
      })
      setAllTransactions(response.transactions)
    } catch (error) {
      console.error('Failed to refresh transactions:', error)
    } finally {
      setRefreshing(false)
    }
  }, [businessId])

  return (
    <AppBarLayout
      title="Transactions"
      rightIconName={activeSection !== 'reporting' ? 'add-circle-sharp' : undefined}
      onRightIconPress={activeSection !== 'reporting' ? handleAddClick : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.sectionNavWrapper}>
          <ScrollView
            ref={sectionNavScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNav}
            onLayout={(event) => {
              containerWidthRef.current = event.nativeEvent.layout.width
            }}
            onScroll={(event) => {
              const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent
              const reachedEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 4
              setNavAtEnd(reachedEnd)
            }}
            scrollEventThrottle={16}
          >
            {sectionNav.map((section) => {
              const isActive = section.key === activeSection
              return (
                <TouchableOpacity
                  key={section.key}
                  style={[styles.navButton, isActive && styles.navButtonActive]}
                  activeOpacity={0.8}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout
                    buttonPositionsRef.current.set(section.key, { x, width })
                  }}
                  onPress={() => setActiveSection(section.key)}
                >
                  <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                    {section.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          {!navAtEnd && <View pointerEvents="none" style={styles.navFadeRight} />}
        </View>

        {activeSection === 'bank' && bankAccounts.length > 0 && (
          <View style={styles.bankAccountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankAccountNav}
            >
              {bankAccounts.map((account) => {
                const isActive = selectedBankAccount === account.accountNumber
                const lastFour = getLastFour(account.accountNumber)
                return (
                  <TouchableOpacity
                    key={account.accountNumber}
                    style={[styles.bankAccountButton, isActive && styles.bankAccountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedBankAccount(account.accountNumber)}
                  >
                    <Text style={[styles.bankAccountText, isActive && styles.bankAccountTextActive]}>
                      ..{lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {activeSection === 'cards' && creditCards.length > 0 && (
          <View style={styles.bankAccountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bankAccountNav}
            >
              {creditCards.map((card) => {
                const isActive = selectedCard === card.cardNumber
                const lastFour = getLastFour(card.cardNumber)
                return (
                  <TouchableOpacity
                    key={card.cardNumber}
                    style={[styles.bankAccountButton, isActive && styles.bankAccountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCard(card.cardNumber)}
                  >
                    <Text style={[styles.bankAccountText, isActive && styles.bankAccountTextActive]}>
                      ..{lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {renderSection(
          activeSection,
          navigation,
          receiptColumnsWithData,
          bankColumnsWithData,
          cardsColumnsWithData,
          reportingReadyTransactions,
          handleReconcileClick,
          reconciling,
          getFullTransactions,
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

function renderSection(
  section: SectionKey,
  navigation: StackNavigationProp<TransactionsStackParamList>,
  receiptColumns: PipelineColumn[],
  bankColumns: PipelineColumn[],
  cardsColumns: PipelineColumn[],
  reportingReadyTransactions: Array<TransactionStub & { originalTransaction?: Transaction }>,
  handleReconcileClick?: () => void,
  reconciling?: boolean,
  getFullTransactions?: (columnTitle: string) => Array<TransactionStub & { originalTransaction?: Transaction }>,
) {
  switch (section) {
    case 'receipts':
      return <PipelineRow columns={receiptColumns} navigation={navigation} getFullTransactions={getFullTransactions} pipelineSection={section} />
    case 'bank':
      return <PipelineRow columns={bankColumns} navigation={navigation} handleReconcileClick={handleReconcileClick} reconciling={reconciling} getFullTransactions={getFullTransactions} pipelineSection={section} />
    case 'cards':
      return (
        <PipelineRow
          columns={cardsColumns}
          navigation={navigation}
          handleReconcileClick={handleReconcileClick}
          reconciling={reconciling}
          getFullTransactions={getFullTransactions}
          pipelineSection={section}
        />
      )
    case 'sales':
      return null // TODO: Add Sales Pipeline screen
    case 'internal':
      return null // TODO: Add Internal Transactions screen
    case 'payroll':
      return null // TODO: Add Payroll screen
    case 'financialServices':
      return null // TODO: Add Financial Services screen
    case 'reporting':
      return (
        <View style={styles.reportingCard}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionHeader}>Reporting ready (all sources)</Text>
            <TouchableOpacity activeOpacity={0.6} style={styles.infoButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="info-outline" size={16} color={GRAYSCALE_SECONDARY} />
            </TouchableOpacity>
          </View>
          <CardList items={reportingReadyTransactions.slice(0, 3)} navigation={navigation} />
          <View style={styles.pipelineActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.linkButton}
              onPress={() =>
                navigation.navigate('ScaffoldViewAll', {
                  section: 'reporting',
                  title: 'Reporting ready (all sources)',
                  items: reportingReadyTransactions,
                })
              }
            >
              <Text style={styles.linkButtonText}>View all</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Go to reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    default:
      return null
  }
}

function PipelineRow({
  columns,
  navigation,
  handleReconcileClick,
  reconciling,
  getFullTransactions,
  pipelineSection,
}: {
  columns: PipelineColumn[]
  navigation: StackNavigationProp<TransactionsStackParamList>
  handleReconcileClick?: () => void
  reconciling?: boolean
  getFullTransactions?: (columnTitle: string) => Array<TransactionStub & { originalTransaction?: Transaction }>
  pipelineSection: SectionKey
}) {
  const handleViewAll = (column: PipelineColumn) => {
    // Use full transaction list if available, otherwise fall back to displayed items
    const items = getFullTransactions 
      ? getFullTransactions(column.title) 
      : (column.transactions || [])
    const effectiveTitle =
      column.title === 'Needs verification (no reconciliation required)'
        ? 'Needs verification'
        : column.title
    navigation.navigate('ScaffoldViewAll', {
      section: column.title,
      title: effectiveTitle,
      items,
      showReconcileButton: column.title === 'Needs reconciliation',
      pipelineSection: pipelineSection, // Pass the parent section (bank/cards)
    })
  }

  const isNeedsReconciliation = (columnTitle: string) => columnTitle === 'Needs reconciliation'

  return (
    <View style={styles.pipelineColumnStack}>
      {columns.map((column) => (
        <View key={column.title} style={styles.pipelineCard}>
          <View style={styles.pipelineTitleRow}>
            <Text style={styles.pipelineTitle}>{column.title}</Text>
            <TouchableOpacity activeOpacity={0.6} style={styles.infoButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="info-outline" size={16} color={GRAYSCALE_SECONDARY} />
            </TouchableOpacity>
          </View>
          {column.rules ? (
            <RulesList 
              rules={column.rules} 
              navigation={navigation} 
              ruleType={pipelineSection === 'cards' ? 'creditCard' : 'bank'}
            />
          ) : (
            <CardList items={column.transactions || []} navigation={navigation} />
          )}
          {column.actions.length > 0 || (isNeedsReconciliation(column.title) && handleReconcileClick) ? (
            <View style={styles.pipelineActions}>
              {column.actions.map((action) => (
                <TouchableOpacity
                  key={action}
                  activeOpacity={0.7}
                  style={styles.linkButton}
                  onPress={() => {
                    if (action === 'View all') {
                      handleViewAll(column)
                    }
                    if (action === '+ Add rules') {
                      if (pipelineSection === 'bank') {
                        navigation.navigate('BankStatementRuleCreate')
                      } else if (pipelineSection === 'cards') {
                        navigation.navigate('CreditCardRuleCreate')
                      }
                    }
                  }}
                >
                  <Text style={styles.linkButtonText}>{action}</Text>
                </TouchableOpacity>
              ))}
              {isNeedsReconciliation(column.title) && handleReconcileClick && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.reconcileButton, reconciling && styles.reconcileButtonDisabled]}
                  onPress={handleReconcileClick}
                  disabled={reconciling}
                >
                  <View style={styles.reconcileButtonContent}>
                    <MaterialIcons 
                      name={reconciling ? "hourglass-empty" : "autorenew"} 
                      size={16} 
                      color={GRAYSCALE_PRIMARY} 
                    />
                    <Text style={styles.reconcileButtonText}>
                      {reconciling ? 'Reconciling...' : 'Reconcile'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function CardList({
  items,
  navigation,
}: {
  items: Array<TransactionStub & { originalTransaction?: Transaction }>
  navigation?: StackNavigationProp<TransactionsStackParamList>
}) {
  const handleCardPress = (item: TransactionStub & { originalTransaction?: Transaction }) => {
    if (item.originalTransaction && navigation) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }

  return (
    <View style={styles.cardList}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.cardListItem}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.7}
          disabled={!item.originalTransaction || !navigation}
        >
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.isCredit && (
              <Text style={styles.creditLabel}>credit</Text>
            )}
          </View>
          <Text style={styles.cardAmount}>{item.amount}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function RulesList({
  rules,
  navigation,
  ruleType,
}: {
  rules: BankStatementRule[] | CreditCardRule[]
  navigation: StackNavigationProp<TransactionsStackParamList>
  ruleType?: 'bank' | 'creditCard'
}) {
  const handleRulePress = (rule: BankStatementRule | CreditCardRule) => {
    if (ruleType === 'creditCard') {
      navigation.navigate('CreditCardRuleDetail', { rule: rule as CreditCardRule })
    } else {
      navigation.navigate('BankStatementRuleDetail', { rule: rule as BankStatementRule })
    }
  }

  return (
    <View style={styles.cardList}>
      {rules.map((rule) => (
        <TouchableOpacity
          key={rule.id}
          style={styles.cardListItem}
          onPress={() => handleRulePress(rule)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{rule.title}</Text>
            {rule.description && (
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {rule.description}
              </Text>
            )}
          </View>
          <MaterialIcons name="chevron-right" size={20} color={GRAYSCALE_SECONDARY} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionNavWrapper: {
    position: 'relative',
  },
  sectionNav: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 2,
    marginTop: 12,
    marginBottom: 16,
  },
  navFadeRight: {
    position: 'absolute',
    top: 12,
    bottom: 16,
    right: 0,
    width: 32,
    backgroundColor: 'rgba(246, 246, 246, 0.9)',
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: '#ffffff',
  },
  navButtonActive: {
    borderColor: '#4a4a4a',
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: GRAYSCALE_PRIMARY,
  },
  bankAccountNavWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  bankAccountNav: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
  },
  bankAccountButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  bankAccountButtonActive: {
    borderBottomWidth: 1,
    borderBottomColor: GRAYSCALE_PRIMARY,
  },
  bankAccountText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  bankAccountTextActive: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 10,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryCta: {
    backgroundColor: '#ffffff',
    borderColor: '#dcdcdc',
  },
  ctaText: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  secondaryCta: {
    backgroundColor: SURFACE_BACKGROUND,
    borderColor: '#dcdcdc',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pipelineColumnStack: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  pipelineCard: {
    flex: 1,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 16,
  },
  pipelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  infoButton: {
    padding: 4,
    marginLeft: 8,
  },
  pipelineActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  reconcileButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: CARD_BACKGROUND,
  },
  reconcileButtonDisabled: {
    opacity: 0.6,
  },
  reconcileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reconcileButtonText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  cardList: {
    gap: 8,
  },
  cardListItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    backgroundColor: '#fbfbfb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  creditLabel: {
    marginTop: 2,
    fontSize: 10,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
  verificationItems: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verificationBullet: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
  verificationLabel: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
  },
  verificationCheck: {
    marginLeft: 2,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  reportingCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginTop: 4,
  },
  metric: {
    fontSize: 18,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
    marginVertical: 16,
  },
  dualActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d3d3d3',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  integrationCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
})

