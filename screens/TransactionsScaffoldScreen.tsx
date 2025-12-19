import React, { useCallback, useEffect, useState, useRef } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native'
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
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
  salesLeads?: SalesLead[]
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

type SalesLead = {
  id: string
  title: string // Company name
  projectTitle?: string // Project name/title
  subtitle?: string
  amount?: string
  stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
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
  // Support both old (bank_statement_ocr) and new (bank_statement_upload) source values
  return metadata.capture?.source === 'bank_statement_upload' || 
         metadata.capture?.source === 'bank_statement_ocr'
}

// Helper function to check if transaction is a credit card transaction (statement entry)
function isCreditCardTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return metadata.capture?.source === 'credit_card_statement_upload'
}

// Helper function to check if transaction is a POS sale
function isPOSSaleTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
    classification?: { kind?: string }
  }
  // POS sales have source = 'pos_one_off_item' and kind = 'sale'
  return metadata.capture?.source === 'pos_one_off_item' && metadata.classification?.kind === 'sale'
}

// Helper function to check if transaction is a sale transaction (invoice)
function isSaleTransaction(tx: Transaction): boolean {
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

// Helper function to check if transaction is audit ready
// Audit ready = reconciliation.status is 'matched', 'reconciled', 'exception', or 'not_required'
function isAuditReady(tx: Transaction): boolean {
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
function isUnreconciled(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined
  
  return metadata?.reconciliation?.status === 'unreconciled'
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

// Helper function to check if transaction has Accounts Payable as a payment method
function hasAccountsPayablePayment(tx: Transaction): boolean {
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


type SectionKey = 'purchases3' | 'bank' | 'cards' | 'sales' | 'internal' | 'reporting' | 'payroll'

// Base section nav - will be filtered based on available accounts/cards
const baseSectionNav: Array<{ key: SectionKey; label: string }> = [
  { key: 'sales', label: 'Sales' },
  { key: 'purchases3', label: 'Purchases' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'internal', label: 'Internal' },
  { key: 'bank', label: 'Bank' },
  { key: 'cards', label: 'Credit Cards' },
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
  const [activeSection, setActiveSection] = useState<SectionKey>(
    (route.params?.activeSection && route.params.activeSection !== 'receipts' 
      ? route.params.activeSection 
      : 'purchases3') as SectionKey
  )
  const [navAtEnd, setNavAtEnd] = useState(false)
  const sectionNavScrollRef = useRef<ScrollView>(null)
  const buttonPositionsRef = useRef<Map<string, { x: number; width: number }>>(new Map())
  const containerWidthRef = useRef<number>(0)
  const [bankInfoCardDismissed, setBankInfoCardDismissed] = useState(false)
  const [cardsInfoCardDismissed, setCardsInfoCardDismissed] = useState(false)

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
      // Convert legacy 'receipts' to 'purchases3'
      const section = route.params.activeSection === 'receipts' ? 'purchases3' : route.params.activeSection
      console.log('TransactionsScaffoldScreen: Setting activeSection from route params:', section)
      setActiveSection(section as SectionKey)
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

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [transactions3Pending, setTransactions3Pending] = useState<Transaction[]>([])
  const [transactions3SourceOfTruth, setTransactions3SourceOfTruth] = useState<Transaction[]>([])
  const [transactions3BankPending, setTransactions3BankPending] = useState<Transaction[]>([])
  const [transactions3BankSourceOfTruth, setTransactions3BankSourceOfTruth] = useState<Transaction[]>([])
  const [transactions3CardPending, setTransactions3CardPending] = useState<Transaction[]>([])
  const [transactions3CardSourceOfTruth, setTransactions3CardSourceOfTruth] = useState<Transaction[]>([])
  const [reportingReadyTransactions3, setReportingReadyTransactions3] = useState<Transaction[]>([])
  const [transactions3POSSales, setTransactions3POSSales] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAccountsAndCards, setLoadingAccountsAndCards] = useState(true)
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

  // Refresh transactions when screen comes into focus (e.g., after upload)
  // Note: Route params are handled in a separate useEffect above
  useFocusEffect(
    useCallback(() => {
      // Refresh transactions when screen comes into focus (to show newly created transactions)
      // Use activeSection state to determine which section to refresh
      if (businessId) {
        const refreshTransactions = async () => {
          try {
            // If on Purchases3 section, refresh transactions3 data - only purchases
            if (activeSection === 'purchases3') {
              const [pendingResponse, sourceOfTruthResponse] = await Promise.all([
                transactions2Api.getTransactions3(businessId, 'pending', {
                  page: 1,
                  limit: 200,
                  kind: 'purchase', // Filter for purchase transactions only
                  status: 'verification:unverified',
                }),
                transactions2Api.getTransactions3(businessId, 'source_of_truth', {
                  page: 1,
                  limit: 200,
                  kind: 'purchase', // Filter for purchase transactions only
                }),
              ])
              setTransactions3Pending(pendingResponse.transactions || [])
              setTransactions3SourceOfTruth(sourceOfTruthResponse.transactions || [])
              console.log('TransactionsScaffoldScreen: Refreshed transactions3 on focus')
            } else if (activeSection === 'bank') {
              // For Bank section, refresh transactions3 data using kind=statement_entry filter
              const [pendingResponse, verifiedResponse] = await Promise.all([
                transactions2Api.getTransactions3(businessId, 'pending', {
                  page: 1,
                  limit: 200,
                  kind: 'statement_entry', // Filter for bank transactions on backend
                  status: 'verification:unverified',
                }),
                transactions2Api.getTransactions3(businessId, 'source_of_truth', {
                  page: 1,
                  limit: 200,
                  kind: 'statement_entry', // Filter for bank transactions on backend
                  status: 'verification:verified',
                }),
              ])
              
              console.log('TransactionsScaffoldScreen: Refreshed bank transactions on focus', {
                bankPending: (pendingResponse.transactions || []).length,
                bankVerified: (verifiedResponse.transactions || []).length,
              })
              setTransactions3BankPending(pendingResponse.transactions || [])
              setTransactions3BankSourceOfTruth(verifiedResponse.transactions || [])
            } else if (activeSection === 'cards') {
              // For Credit Cards section, refresh transactions3 data using kind=statement_entry filter
              const [pendingResponse, verifiedResponse] = await Promise.all([
                transactions2Api.getTransactions3(businessId, 'pending', {
                  page: 1,
                  limit: 200,
                  kind: 'statement_entry', // Filter for credit card transactions on backend
                  status: 'verification:unverified',
                }),
                transactions2Api.getTransactions3(businessId, 'source_of_truth', {
                  page: 1,
                  limit: 200,
                  kind: 'statement_entry', // Filter for credit card transactions on backend
                  status: 'verification:verified',
                }),
              ])
              
              console.log('TransactionsScaffoldScreen: Refreshed credit card transactions on focus', {
                cardPending: (pendingResponse.transactions || []).length,
                cardVerified: (verifiedResponse.transactions || []).length,
              })
              setTransactions3CardPending(pendingResponse.transactions || [])
              setTransactions3CardSourceOfTruth(verifiedResponse.transactions || [])
            } else if (activeSection === 'sales') {
              // For Sales section, refresh transactions2 data and POS sales from transactions3
              const [response, posSalesResponse] = await Promise.all([
                transactions2Api.getTransactions(businessId, {
                  page: 1,
                  limit: 200,
                }),
                // Fetch POS sales from transactions3 - use source parameter for backend filtering
                transactions2Api.getTransactions3(businessId, 'source_of_truth', {
                  page: 1,
                  limit: 200,
                  kind: 'sale',
                  source: 'pos_one_off_item', // Backend filters for POS sales
                }),
              ])
              setAllTransactions(response.transactions)
              setTransactions3POSSales(posSalesResponse.transactions || [])
              console.log('TransactionsScaffoldScreen: Refreshed sales transactions on focus', {
                transactions2: response.transactions.length,
                posSales: (posSalesResponse.transactions || []).length,
              })
            } else if (activeSection === 'reporting') {
              // For reporting section, refresh reporting-ready transactions from transactions3
              const reportingReadyRes = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
                page: 1,
                limit: 200,
                // No kind filter - get all reporting-ready transactions from all sources
              })
              setReportingReadyTransactions3(reportingReadyRes.transactions || [])
              console.log('TransactionsScaffoldScreen: Refreshed reporting-ready transactions on focus, count:', (reportingReadyRes.transactions || []).length)
            } else {
              // For other sections, refresh transactions2 data
              const response = await transactions2Api.getTransactions(businessId, {
                page: 1,
                limit: 200,
              })
              console.log('TransactionsScaffoldScreen: Refreshed transactions on focus, count:', response.transactions.length)
              setAllTransactions(response.transactions)
            }
          } catch (error) {
            console.error('TransactionsScaffoldScreen: Failed to refresh transactions on focus:', error)
          }
        }
        refreshTransactions()
      }
    }, [businessId, activeSection])
  )

  // Fetch bank accounts and credit cards
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setLoadingAccountsAndCards(false)
        return
      }

      const fetchAccountsAndCards = async () => {
        try {
          setLoadingAccountsAndCards(true)
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
        } finally {
          setLoadingAccountsAndCards(false)
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

  // Fetch transactions2 data for Sales and Reporting sections (not yet migrated to transactions3)
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setLoading(false)
        return
      }

      const fetchTransactions = async () => {
        try {
          setLoading(true)
          // Only fetch transactions2 for Sales and Reporting sections (not yet migrated to transactions3)
          // Bank, Cards, and Purchases3 sections use transactions3 exclusively
          const response = await transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 200,
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

  // Fetch reporting-ready transactions from transactions3 source_of_truth collection
  // Per TRANSACTIONS3_REPORTING_READY_RN_MIGRATION.md: No client-side filtering needed
  // source_of_truth collection only contains transactions that are already reporting ready
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        return
      }

      const fetchReportingReadyTransactions = async () => {
        try {
          // Fetch all reporting-ready transactions from source_of_truth (all sources, no kind filter)
          // Per docs: All transactions in source_of_truth are by definition reporting ready
          const response = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          })
          setReportingReadyTransactions3(response.transactions || [])
          console.log('TransactionsScaffoldScreen: Fetched reporting-ready transactions from transactions3:', (response.transactions || []).length)
        } catch (error) {
          console.error('Failed to fetch reporting-ready transactions:', error)
          setReportingReadyTransactions3([])
        }
      }

      fetchReportingReadyTransactions()
    }, [businessId]),
  )

  // Fetch transactions3 data for Purchases3 section
  useFocusEffect(
    useCallback(() => {
      if (!businessId || activeSection !== 'purchases3') {
        setTransactions3Pending([])
        setTransactions3SourceOfTruth([])
        return
      }

      const fetchTransactions3 = async () => {
        try {
          // Fetch pending transactions (unverified) - only purchases
          const pendingResponse = await transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'purchase', // Filter for purchase transactions only
            status: 'verification:unverified',
          })
          setTransactions3Pending(pendingResponse.transactions || [])

          // Fetch source of truth transactions that need bank reconciliation
          // According to docs: query with status=reconciliation:pending_bank_match
          // Only purchases need reconciliation to bank (bank transactions are in Bank section)
          const bankReconciliationResponse = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'purchase', // Filter for purchase transactions only
            status: 'reconciliation:pending_bank_match',
          })

          // Also fetch all verified transactions for audit ready filtering - only purchases
          const allVerifiedResponse = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'purchase', // Filter for purchase transactions only
            status: 'verification:verified',
          })

          // Fetch reconciled/not_required transactions (for audit ready card)
          const reconciledResponse = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'purchase',
            status: 'reconciliation:reconciled',
          })

          // Fetch not_required transactions (cash transactions)
          const notRequiredResponse = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'purchase',
            status: 'reconciliation:not_required',
          })

          // Combine and deduplicate transactions (some may appear in multiple queries)
          const allSourceOfTruth = [
            ...(bankReconciliationResponse.transactions || []),
            ...(allVerifiedResponse.transactions || []),
            ...(reconciledResponse.transactions || []),
            ...(notRequiredResponse.transactions || []),
          ]
          // Deduplicate by transaction ID
          const uniqueTransactions = allSourceOfTruth.reduce((acc, tx) => {
            const id = tx.id || (tx.metadata as any)?.id
            if (id && !acc.find((existing) => (existing.id || (existing.metadata as any)?.id) === id)) {
              acc.push(tx)
            }
            return acc
          }, [] as Transaction[])
          
          setTransactions3SourceOfTruth(uniqueTransactions)
          
          // Debug logging
          console.log('Transactions3 fetch results:', {
            pending: pendingResponse.transactions?.length || 0,
            bankReconciliation: bankReconciliationResponse.transactions?.length || 0,
            allVerified: allVerifiedResponse.transactions?.length || 0,
            reconciled: reconciledResponse.transactions?.length || 0,
            notRequired: notRequiredResponse.transactions?.length || 0,
            totalUnique: uniqueTransactions.length,
            bankReconciliationSample: bankReconciliationResponse.transactions?.[0] ? {
              id: bankReconciliationResponse.transactions[0].id || (bankReconciliationResponse.transactions[0].metadata as any)?.id,
              verificationStatus: (bankReconciliationResponse.transactions[0].metadata as any)?.verification?.status,
              reconciliationStatus: (bankReconciliationResponse.transactions[0].metadata as any)?.reconciliation?.status,
              paymentBreakdown: (bankReconciliationResponse.transactions[0].details as any)?.paymentBreakdown,
            } : null,
            // Check for cash transactions with not_required status
            cashTransactions: uniqueTransactions.filter((tx) => {
              const reconciliationStatus = (tx.metadata as any)?.reconciliation?.status
              return reconciliationStatus === 'not_required'
            }).map((tx) => ({
              id: tx.id || (tx.metadata as any)?.id,
              verificationStatus: (tx.metadata as any)?.verification?.status,
              reconciliationStatus: (tx.metadata as any)?.reconciliation?.status,
              classificationKind: (tx.metadata as any)?.classification?.kind,
            })),
            // Sample of all transactions to debug
            allTransactionsSample: uniqueTransactions.slice(0, 5).map((tx) => ({
              id: tx.id || (tx.metadata as any)?.id,
              verificationStatus: (tx.metadata as any)?.verification?.status,
              reconciliationStatus: (tx.metadata as any)?.reconciliation?.status,
              classificationKind: (tx.metadata as any)?.classification?.kind,
            })),
          })
        } catch (error) {
          console.error('Failed to fetch transactions3:', error)
          setTransactions3Pending([])
          setTransactions3SourceOfTruth([])
        }
      }

      fetchTransactions3()
    }, [businessId, activeSection]),
  )


  // Reporting ready transactions (all sources: receipts, bank, credit cards)
  // Migrated to transactions3: Using source_of_truth collection
  // Per TRANSACTIONS3_REPORTING_READY_RN_MIGRATION.md: No client-side filtering needed
  // All transactions in source_of_truth are by definition reporting ready
  // Sort by most recent first and separate into inputs (sales/income) and outputs (expenses/purchases)
  const reportingReadyTransactionsAll: Array<TransactionStub & { originalTransaction: Transaction }> =
    reportingReadyTransactions3
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
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

  // Separate into inputs (credits/income) and outputs (debits/expenses)
  const reportingReadyInputs = reportingReadyTransactionsAll.filter(tx => tx.isCredit === true)
  const reportingReadyOutputs = reportingReadyTransactionsAll.filter(tx => tx.isCredit !== true)
  
  // For the main card, show a mix: 2 inputs + 1 output (or vice versa if more outputs)
  const reportingReadyTransactions = reportingReadyTransactionsAll.slice(0, 3)



  // Bank transactions that need verification (no reconciliation required)
  // Condition: Has accounting entries (rule matched) but is not yet verified
  // Per docs: Query already filtered by backend for unverified bank transactions (kind=statement_entry)
  // Now filter client-side for those with accounting entries (rule-matched) and bank source
  const bankNeedsVerificationTransactionsRaw: Transaction[] = [
    // Include transactions3 bank transactions from pending collection
    // Backend already filtered for: pending, kind=statement_entry, verification:unverified
    // Frontend filters for: bank source AND has accounting entries (rule-matched)
    ...transactions3BankPending
      .filter((tx) => {
        // Must be a bank transaction
        if (!isBankTransaction(tx)) {
          return false
        }
        // Check if it has accounting entries (rule matched)
        // Transactions with accounting entries go to "Needs verification" card
        const hasEntries = hasAccountingEntries(tx)
        return hasEntries
      }),
  ]
  
  const bankNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    bankNeedsVerificationTransactionsRaw
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
    .sort((a, b) => {
      // Sort by transactionDate (most recent first)
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3) // Show only 3 most recent

  // Bank transactions that need reconciliation
  // Condition: Transaction has no accounting entries (no rule matched)
  // Per docs: Query already filtered by backend for unverified bank transactions (kind=statement_entry)
  // Now filter client-side for those WITHOUT accounting entries (no rule match) and bank source
  const bankNeedsReconciliationTransactionsRaw: Transaction[] = [
    // Include transactions3 bank transactions from pending collection
    // Backend already filtered for: pending, kind=statement_entry, verification:unverified
    // Frontend filters for: bank source AND NO accounting entries (no rule match)
    ...transactions3BankPending
      .filter((tx) => {
        // Must be a bank transaction
        if (!isBankTransaction(tx)) {
          return false
        }
        // Check if it has accounting entries
        const hasEntries = hasAccountingEntries(tx)
        
        // Transactions WITHOUT accounting entries (no rule matched) go to "Needs reconciliation"
        return !hasEntries
      }),
  ]
  
  const bankNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    bankNeedsReconciliationTransactionsRaw
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
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent

  // Bank transactions that are confirmed as unreconcilable
  // Condition: verified bank transactions with reconciliation.status = 'unreconciled'
  const confirmedUnreconcilableBankRaw: Transaction[] = [
    // Include transactions3 bank transactions from source_of_truth collection
    // Backend already filtered for: source_of_truth, kind=statement_entry, verification:verified
    // Frontend filters for: bank source AND unreconciled status
    ...transactions3BankSourceOfTruth
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

        // Must be verified
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        
        // Must have reconciliation status = 'unreconciled'
        const isUnreconciled = reconciliationStatus === 'unreconciled'

        return isVerified && isUnreconciled
      }),
  ]

  const confirmedUnreconcilableBank: Array<TransactionStub & { originalTransaction: Transaction }> =
    confirmedUnreconcilableBankRaw
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3) // Get last 3
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName || tx.summary.description || 'Unknown',
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Get last 3 bank transactions that are now Reporting Ready (to show pipeline progress)
  // Condition: Transaction is reconciled OR (verified with accounting entries) OR (verified with reconciliation not_required)
  // Reconciled transactions go directly to Reporting Ready
  // IMPORTANT: Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
  const recentReportingReadyBankRaw: Transaction[] = [
    // Include transactions3 bank transactions from source_of_truth collection
    // Backend already filtered for: source_of_truth, kind=statement_entry, verification:verified
    // Frontend filters for: bank source AND reporting ready status
    ...transactions3BankSourceOfTruth
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
        
        // Check if reconciled or not_required (both mean audit ready)
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception' ||
          reconciliationStatus === 'not_required' // not_required also means audit ready

        // Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
        const isUnreconciled = reconciliationStatus === 'unreconciled'

        // Check if has accounting entries
        const hasEntries = hasAccountingEntries(tx)

        // Reporting ready if: (reconciled/not_required OR (verified AND has accounting entries)) AND not unreconciled
        return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
      }),
  ]

  const recentReportingReadyBank: Array<TransactionStub & { originalTransaction: Transaction }> =
    recentReportingReadyBankRaw
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
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
  // Per docs: Query already filtered by backend for unverified credit card transactions (kind=statement_entry)
  // Now filter client-side for those with accounting entries (rule-matched) and credit card source
  const cardNeedsVerificationTransactionsRaw: Transaction[] = [
    // Include transactions3 credit card transactions from pending collection
    // Backend already filtered for: pending, kind=statement_entry, verification:unverified
    // Frontend filters for: credit card source AND has accounting entries (rule-matched)
    ...transactions3CardPending
      .filter((tx) => {
        // Must be a credit card transaction
        if (!isCreditCardTransaction(tx)) {
          return false
        }
        // Check if it has accounting entries (rule matched)
        // Transactions with accounting entries go to "Needs verification" card
        const hasEntries = hasAccountingEntries(tx)
        return hasEntries
      }),
  ]
  
  const cardNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    cardNeedsVerificationTransactionsRaw
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
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent

  // Card transactions that need reconciliation
  // Condition: Transaction has no accounting entries (no rule matched)
  // Per docs: Query already filtered by backend for unverified credit card transactions (kind=statement_entry)
  // Now filter client-side for those WITHOUT accounting entries (no rule match) and credit card source
  const cardNeedsReconciliationTransactionsRaw: Transaction[] = [
    // Include transactions3 credit card transactions from pending collection
    // Backend already filtered for: pending, kind=statement_entry, verification:unverified
    // Frontend filters for: credit card source AND NO accounting entries (no rule match)
    ...transactions3CardPending
      .filter((tx) => {
        // Must be a credit card transaction
        if (!isCreditCardTransaction(tx)) {
          return false
        }
        // Check if it has accounting entries
        const hasEntries = hasAccountingEntries(tx)
        
        // Transactions WITHOUT accounting entries (no rule matched) go to "Needs reconciliation"
        return !hasEntries
      }),
  ]
  
  const cardNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    cardNeedsReconciliationTransactionsRaw
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
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3) // Show only 3 most recent

  // Card transactions that are confirmed as unreconcilable
  // Condition: verified credit card transactions with reconciliation.status = 'unreconciled'
  const confirmedUnreconcilableCardRaw: Transaction[] = [
    // Include transactions3 credit card transactions from source_of_truth collection
    // Backend already filtered for: source_of_truth, kind=statement_entry, verification:verified
    // Frontend filters for: credit card source AND unreconciled status
    ...transactions3CardSourceOfTruth
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

        // Must be verified
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        
        // Must have reconciliation status = 'unreconciled'
        const isUnreconciled = reconciliationStatus === 'unreconciled'

        return isVerified && isUnreconciled
      }),
  ]

  const confirmedUnreconcilableCard: Array<TransactionStub & { originalTransaction: Transaction }> =
    confirmedUnreconcilableCardRaw
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3) // Get last 3
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName || tx.summary.description || 'Unknown',
          amount,
          isCredit: isCreditToAccount(tx),
          originalTransaction: tx,
        }
      })

  // Get last 3 card transactions that are now Reporting Ready (to show pipeline progress)
  // Condition: Transaction is reconciled OR (verified with accounting entries) OR (verified with reconciliation not_required)
  // Reconciled transactions go directly to Reporting Ready
  // IMPORTANT: Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
  const recentReportingReadyCardRaw: Transaction[] = [
    // Include transactions3 credit card transactions from source_of_truth collection
    // Backend already filtered for: source_of_truth, kind=statement_entry, verification:verified
    // Frontend filters for: credit card source AND reporting ready status
    ...transactions3CardSourceOfTruth
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
        
        // Check if reconciled or not_required (both mean audit ready)
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception' ||
          reconciliationStatus === 'not_required' // not_required also means audit ready

        // Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
        const isUnreconciled = reconciliationStatus === 'unreconciled'

        // Check if has accounting entries
        const hasEntries = hasAccountingEntries(tx)

        // Reporting ready if: (reconciled/not_required OR (verified AND has accounting entries)) AND not unreconciled
        return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
      }),
  ]

  const recentReportingReadyCards: Array<TransactionStub & { originalTransaction: Transaction }> =
    recentReportingReadyCardRaw
      .sort((a, b) => {
        // Sort by transactionDate (most recent first)
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
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
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for unverified purchase transactions
          return transactions3Pending
            .filter((tx) => {
              const metadata = tx.metadata as {
                classification?: { kind?: string }
                verification?: { status?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isUnverified = metadata.verification?.status === 'unverified'
              return isPurchase && isUnverified
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        } else if (activeSection === 'bank') {
          // Use transactions3 data - filter for bank transactions with accounting entries
          return transactions3BankPending
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const hasEntries = hasAccountingEntries(tx)
              return hasEntries
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else if (activeSection === 'cards') {
          // Use transactions3 data - filter for credit card transactions with accounting entries
          return transactions3CardPending
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const hasEntries = hasAccountingEntries(tx)
              return hasEntries
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
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
          return []
        }
      
      case 'Needs matching':
        if (activeSection === 'bank') {
          // Use transactions3 data - filter for bank transactions without accounting entries
          return transactions3BankPending
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const hasEntries = hasAccountingEntries(tx)
              return !hasEntries
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else if (activeSection === 'cards') {
          // Use transactions3 data - filter for credit card transactions without accounting entries
          return transactions3CardPending
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const hasEntries = hasAccountingEntries(tx)
              return !hasEntries
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
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
          return []
        }
      
      case 'Reporting ready':
        // This case is for legacy receipts section - now handled by Purchases3
        return []
      
      case 'Unpaid purchases':
        // Use transactions3 data - filter for verified purchase transactions with Accounts Payable payment method
        return transactions3SourceOfTruth
          .filter((tx) => {
            const metadata = tx.metadata as {
              verification?: { status?: string }
              reconciliation?: { status?: string }
              classification?: { kind?: string }
            }
            
            // Only purchase transactions belong in Purchases3 section
            const isPurchase = metadata.classification?.kind === 'purchase'
            // Must be verified
            const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
            // Must have Accounts Payable as payment method
            const hasAccountsPayable = hasAccountsPayablePayment(tx)
            // Must not be reconciled yet (not paid)
            const isReconciled =
              metadata.reconciliation?.status === 'matched' ||
              metadata.reconciliation?.status === 'reconciled' ||
              metadata.reconciliation?.status === 'exception'
            // Must not be cash-only (cash payments don't go through Accounts Payable)
            const isCashOnly = isCashOnlyTransaction(tx)
            
            return isPurchase && isVerified && hasAccountsPayable && !isReconciled && !isCashOnly
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      
      case "Couldn't be matched":
        if (activeSection === 'bank') {
          // Use transactions3 data - filter for verified bank transactions with unreconciled status
          return transactions3BankSourceOfTruth
            .filter((tx) => {
              if (!isBankTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const verificationStatus = metadata.verification?.status
              const reconciliationStatus = metadata.reconciliation?.status
              const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
              const isUnreconciled = reconciliationStatus === 'unreconciled'
              return isVerified && isUnreconciled
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName || tx.summary.description || 'Unknown',
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else if (activeSection === 'cards') {
          // Use transactions3 data - filter for verified credit card transactions with unreconciled status
          return transactions3CardSourceOfTruth
            .filter((tx) => {
              if (!isCreditCardTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const verificationStatus = metadata.verification?.status
              const reconciliationStatus = metadata.reconciliation?.status
              const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
              const isUnreconciled = reconciliationStatus === 'unreconciled'
              return isVerified && isUnreconciled
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName || tx.summary.description || 'Unknown',
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }))
        } else {
          return []
        }
      
      case 'All done':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for verified and reconciled purchase transactions
          return transactions3SourceOfTruth
            .filter((tx) => {
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
                classification?: { kind?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
              const isReconciled = metadata.reconciliation?.status === 'reconciled' ||
                metadata.reconciliation?.status === 'not_required'
              return isPurchase && isVerified && isReconciled
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
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
          // Use transactions3 data - filter for verified bank transactions that are reporting ready
          return transactions3BankSourceOfTruth
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
                reconciliationStatus === 'exception' ||
                reconciliationStatus === 'not_required'
              const isUnreconciled = reconciliationStatus === 'unreconciled'
              const hasEntries = hasAccountingEntries(tx)
              // Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
              return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              isReportingReady: true,
              originalTransaction: tx,
            }))
        } else if (activeSection === 'cards') {
          // Use transactions3 data - filter for verified credit card transactions that are reporting ready
          return transactions3CardSourceOfTruth
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
                reconciliationStatus === 'exception' ||
                reconciliationStatus === 'not_required' // not_required also means audit ready
              const isUnreconciled = reconciliationStatus === 'unreconciled'
              const hasEntries = hasAccountingEntries(tx)
              // Exclude unreconciled transactions (they go to "Confirmed unreconcilable" card)
              return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
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
          return []
        }
      
      case 'Unpaid invoices':
        return allTransactions
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            const metadata = tx.metadata as {
              verification?: { status?: string }
              reconciliation?: { status?: string }
              classification?: { kind?: string }
            }
            // Explicitly exclude purchase transactions
            if (metadata.classification?.kind === 'purchase') return false
            
            const verificationStatus = metadata.verification?.status
            const reconciliationStatus = metadata.reconciliation?.status
            const isUnverified = verificationStatus === 'unverified'
            const isReconciled =
              reconciliationStatus === 'matched' ||
              reconciliationStatus === 'reconciled' ||
              reconciliationStatus === 'exception'
            const isCashOnly = isCashOnlyTransaction(tx)
            return isUnverified || (verificationStatus !== 'unverified' && !isReconciled && !isCashOnly)
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      
      case 'Awaiting bank match':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for verified purchase transactions needing bank reconciliation
          return transactions3SourceOfTruth
            .filter((tx) => {
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string; type?: string }
                classification?: { kind?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
              const needsReconciliation = metadata.reconciliation?.status === 'pending_bank_match'
              const isBankTransferReconciliation = metadata.reconciliation?.type === 'bank_transfer'
              return isPurchase && isVerified && needsReconciliation && isBankTransferReconciliation
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        } else {
          return allTransactions
            .filter((tx) => {
              if (!isSaleTransaction(tx)) return false
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
              }
              const accounting = tx.accounting as
                | {
                    credits?: Array<{ chartName?: string }>
                  }
                | undefined
              const verificationStatus = metadata.verification?.status
              const reconciliationStatus = metadata.reconciliation?.status
              const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
              const isReconciled =
                reconciliationStatus === 'matched' ||
                reconciliationStatus === 'reconciled' ||
                reconciliationStatus === 'exception'
              const isCashOnly = isCashOnlyTransaction(tx)
              
              // Check if there's a credit to Accounts Receivable
              const hasAccountsReceivable = accounting?.credits?.some(
                (credit) => credit.chartName === 'Accounts Receivable'
              ) ?? false
              
              return isVerified && !isCashOnly && !isReconciled && hasAccountsReceivable
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        }
      
      case 'POS Sales':
        return transactions3POSSales
          .filter((tx) => {
            // POS sales are automatically verified and audit ready
            const metadata = tx.metadata as {
              verification?: { status?: string }
            }
            const verificationStatus = metadata.verification?.status
            const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
            return isVerified
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            isReportingReady: true,
            originalTransaction: tx,
          }))
      
      case 'Sales Invoices':
        return allTransactions
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            // Exclude POS sales
            if (isPOSSaleTransaction(tx)) return false
            const metadata = tx.metadata as {
              reconciliation?: { status?: string }
            }
            const reconciliationStatus = metadata.reconciliation?.status
            const isReconciled =
              reconciliationStatus === 'matched' ||
              reconciliationStatus === 'reconciled' ||
              reconciliationStatus === 'exception'
            return isReconciled
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            isReportingReady: true,
            originalTransaction: tx,
          }))
      
      case 'All done':
        // Legacy case for Sales section - now split into 'POS Sales' and 'Sales Invoices'
        // This case is still used by other sections (bank, cards, purchases3)
        if (activeSection === 'sales') {
          return []
        }
        return allTransactions
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            const metadata = tx.metadata as {
              reconciliation?: { status?: string }
            }
            const reconciliationStatus = metadata.reconciliation?.status
            const isReconciled =
              reconciliationStatus === 'matched' ||
              reconciliationStatus === 'reconciled' ||
              reconciliationStatus === 'exception'
            return isReconciled
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: tx.summary.thirdPartyName,
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            isReportingReady: true,
            originalTransaction: tx,
          }))
      
      case 'Needs verification':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for unverified purchase transactions
          return transactions3Pending
            .filter((tx) => {
              const metadata = tx.metadata as {
                classification?: { kind?: string }
                verification?: { status?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isUnverified = metadata.verification?.status === 'unverified'
              return isPurchase && isUnverified
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        } else {
          return []
        }
      
      case 'Awaiting bank match':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for verified purchase transactions needing bank reconciliation
          return transactions3SourceOfTruth
            .filter((tx) => {
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string; type?: string }
                classification?: { kind?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
              const needsReconciliation = metadata.reconciliation?.status === 'pending_bank_match'
              const isBankTransferReconciliation = metadata.reconciliation?.type === 'bank_transfer'
              return isPurchase && isVerified && needsReconciliation && isBankTransferReconciliation
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        } else {
          return []
        }
      
      case 'Awaiting card match':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for verified purchase transactions needing card reconciliation
          return transactions3SourceOfTruth
            .filter((tx) => {
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string; type?: string }
                classification?: { kind?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
              const needsReconciliation = metadata.reconciliation?.status === 'pending_bank_match'
              const isCardReconciliation = metadata.reconciliation?.type === 'card'
              return isPurchase && isVerified && needsReconciliation && isCardReconciliation
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
              return bDate - aDate
            })
            .map((tx) => ({
              id: tx.id,
              title: tx.summary.thirdPartyName,
              amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
              originalTransaction: tx,
            }))
        } else {
          return []
        }
      
      case 'All done':
        if (activeSection === 'purchases3') {
          // Use transactions3 data - filter for verified and reconciled purchase transactions
          return transactions3SourceOfTruth
            .filter((tx) => {
              const metadata = tx.metadata as {
                verification?: { status?: string }
                reconciliation?: { status?: string }
                classification?: { kind?: string }
              }
              const isPurchase = metadata.classification?.kind === 'purchase'
              const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
              const isReconciled = metadata.reconciliation?.status === 'reconciled' ||
                metadata.reconciliation?.status === 'not_required'
              return isPurchase && isVerified && isReconciled
            })
            .sort((a, b) => {
              const aDate = a.summary.transactionDate || 0
              const bDate = b.summary.transactionDate || 0
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
          return []
        }
      
      default:
        return []
    }
  }


  // Update bankColumns with real data
  const bankColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification',
      actions: ['View all', '+ Add rules'],
      transactions: bankNeedsVerificationTransactions,
    },
    {
      title: 'Needs matching',
      actions: ['View all'],
      transactions: bankNeedsReconciliationTransactions,
    },
    {
      title: "Couldn't be matched",
      actions: ['View all'],
      transactions: confirmedUnreconcilableBank,
    },
    {
      title: 'All done',
      actions: ['View all'],
      transactions: recentReportingReadyBank,
    },
  ]

  // Filter sale transactions (invoices) into 4 categories
  // 1. Invoices submitted pending payment (unverified or not paid)
  const invoicesPendingPayment: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
          classification?: { kind?: string }
        }
        // Explicitly exclude purchase transactions
        if (metadata.classification?.kind === 'purchase') return false
        
        const verificationStatus = metadata.verification?.status
        const reconciliationStatus = metadata.reconciliation?.status
        
        // Pending payment if: unverified OR (verified but not reconciled and not cash-only)
        const isUnverified = verificationStatus === 'unverified'
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'
        const isCashOnly = isCashOnlyTransaction(tx)
        
        // Pending if unverified, or verified but not paid (not reconciled and not cash)
        return isUnverified || (verificationStatus !== 'unverified' && !isReconciled && !isCashOnly)
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          originalTransaction: tx,
        }
      })

  // 2. Invoices paid in cash (cash-only, verified)
  const invoicesPaidCash: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
        }
        const verificationStatus = metadata.verification?.status
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        const isCashOnly = isCashOnlyTransaction(tx)
        
        return isVerified && isCashOnly
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          originalTransaction: tx,
        }
      })

  // 3. Invoices paid, needs match (paid but needs reconciliation)
  const invoicesPaidNeedsMatch: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const accounting = tx.accounting as
          | {
              credits?: Array<{ chartName?: string }>
            }
          | undefined
        const verificationStatus = metadata.verification?.status
        const reconciliationStatus = metadata.reconciliation?.status
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'
        const isCashOnly = isCashOnlyTransaction(tx)
        
        // Check if there's a credit to Accounts Receivable
        const hasAccountsReceivable = accounting?.credits?.some(
          (credit) => credit.chartName === 'Accounts Receivable'
        ) ?? false
        
        // Needs match if: verified, not cash-only, not reconciled, AND has Accounts Receivable credit
        return isVerified && !isCashOnly && !isReconciled && hasAccountsReceivable
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          originalTransaction: tx,
        }
      })

  // 4a. POS Sales - audit ready POS transactions
  const posSalesAuditReady: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3POSSales
      .filter((tx) => {
        // POS sales are automatically verified and audit ready
        // They have reconciliation.status = 'not_required' (cash) or 'pending_bank_match' (card)
        // But for audit ready, we show all POS sales that are verified
        const metadata = tx.metadata as {
          verification?: { status?: string }
        }
        const verificationStatus = metadata.verification?.status
        const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception'
        return isVerified
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isReportingReady: true,
          originalTransaction: tx,
        }
      })

  // 4b. Sales Invoices - reconciled invoices (excluding POS sales)
  const salesInvoicesAuditReady: Array<TransactionStub & { originalTransaction: Transaction }> =
    allTransactions
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        // Exclude POS sales
        if (isPOSSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const reconciliationStatus = metadata.reconciliation?.status
        const isReconciled =
          reconciliationStatus === 'matched' ||
          reconciliationStatus === 'reconciled' ||
          reconciliationStatus === 'exception'
        
        return isReconciled
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => {
        const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
        return {
          id: tx.id,
          title: tx.summary.thirdPartyName,
          amount,
          isReportingReady: true,
          originalTransaction: tx,
        }
      })

  // Update salesColumns with invoice cards
  const salesColumnsWithData: PipelineColumn[] = [
    {
      title: 'Unpaid invoices',
      actions: ['View all'],
      transactions: invoicesPendingPayment,
    },
    {
      title: 'Awaiting bank match',
      actions: ['View all'],
      transactions: invoicesPaidNeedsMatch,
    },
    {
      title: 'POS Sales',
      actions: ['View all'],
      transactions: posSalesAuditReady,
    },
    {
      title: 'Sales Invoices',
      actions: ['View all'],
      transactions: salesInvoicesAuditReady,
    },
  ]

  // Helper function to parse transactions3 into TransactionStub with originalTransaction
  const parseTransaction3 = (tx: Transaction): (TransactionStub & { originalTransaction: Transaction }) | null => {
    const amount = formatAmount(tx.summary.totalAmount, tx.summary.currency, true)
    return {
      id: tx.id,
      title: tx.summary.thirdPartyName,
      amount,
      originalTransaction: tx,
    }
  }

  // Categorize transactions3 data for Purchases3 cards
  // 1. Needs verification - pending transactions with unverified status
  const purchases3NeedsVerification: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3Pending
    .filter((tx) => {
      const metadata = tx.metadata as {
        classification?: { kind?: string }
        verification?: { status?: string }
      }
      // Only purchase transactions belong in Purchases3 section
      const isPurchase = metadata.classification?.kind === 'purchase'
      // Must be unverified (defensive check - backend should filter but we verify client-side too)
      const isUnverified = metadata.verification?.status === 'unverified'
      return isPurchase && isUnverified
    })
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  // 4. Reconcile to Credit Card - verified transactions with reconciliation.type === 'card'
  const purchases3ReconcileToCreditCard: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
    .filter((tx) => {
      const metadata = tx.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string; type?: string }
        classification?: { kind?: string }
      }
      
      // Only purchase transactions belong in Purchases3 section
      const isPurchase = metadata.classification?.kind === 'purchase'
      // Must be verified
      const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
      // Must need reconciliation
      const needsReconciliation = metadata.reconciliation?.status === 'pending_bank_match'
      // Must be card reconciliation type
      const isCardReconciliation = metadata.reconciliation?.type === 'card'
      
      return isPurchase && isVerified && needsReconciliation && isCardReconciliation
    })
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  // 2. Accounts Payable - verified purchase transactions with Accounts Payable payment method that are not yet paid
  const purchases3AccountsPayable: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
    .filter((tx) => {
      const metadata = tx.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string }
        classification?: { kind?: string }
      }
      
      // Only purchase transactions belong in Purchases3 section
      const isPurchase = metadata.classification?.kind === 'purchase'
      // Must be verified
      const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
      // Must have Accounts Payable as payment method
      const hasAccountsPayable = hasAccountsPayablePayment(tx)
      // Must not be reconciled yet (not paid)
      const isReconciled =
        metadata.reconciliation?.status === 'matched' ||
        metadata.reconciliation?.status === 'reconciled' ||
        metadata.reconciliation?.status === 'exception'
      // Must not be cash-only (cash payments don't go through Accounts Payable)
      const isCashOnly = isCashOnlyTransaction(tx)
      
      return isPurchase && isVerified && hasAccountsPayable && !isReconciled && !isCashOnly
    })
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  // 3. Reconcile to bank - verified transactions with reconciliation.type === 'bank_transfer'
  const purchases3ReconcileToBank: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
    .filter((tx) => {
      const metadata = tx.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string; type?: string }
        classification?: { kind?: string }
      }
      
      // Only purchase transactions belong in Purchases3 section
      const isPurchase = metadata.classification?.kind === 'purchase'
      // Must be verified
      const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
      // Must need bank reconciliation (not already reconciled)
      const needsReconciliation = metadata.reconciliation?.status === 'pending_bank_match'
      // Must be bank_transfer reconciliation type
      const isBankTransferReconciliation = metadata.reconciliation?.type === 'bank_transfer'
      
      return isPurchase && isVerified && needsReconciliation && isBankTransferReconciliation
    })
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)


  // 5. Verified, reconciled and audit ready - verified transactions that are fully reconciled
  const purchases3AuditReady: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
    .filter((tx) => {
      const metadata = tx.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string }
        classification?: { kind?: string }
      }
      
      // Only purchase transactions belong in Purchases3 section
      const isPurchase = metadata.classification?.kind === 'purchase'
      // Must be verified
      const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
      // Must be reconciled or not required (cash transactions don't need reconciliation)
      const isReconciled = metadata.reconciliation?.status === 'reconciled' ||
        metadata.reconciliation?.status === 'not_required'
      
      const shouldInclude = isPurchase && isVerified && isReconciled
      
      // Debug logging for cash transactions not appearing
      if (isPurchase && isVerified && metadata.reconciliation?.status === 'not_required' && !shouldInclude) {
        console.log('DEBUG: Cash transaction filtered out:', {
          id: tx.id,
          isPurchase,
          isVerified,
          reconciliationStatus: metadata.reconciliation?.status,
          isReconciled,
          shouldInclude,
          metadata: JSON.stringify(metadata, null, 2)
        })
      }
      
      return shouldInclude
    })
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  // Purchases3 columns - Transactions3 architecture
  const purchases3ColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification',
      actions: ['View all'],
      transactions: purchases3NeedsVerification,
    },
    {
      title: 'Unpaid purchases',
      actions: ['View all'],
      transactions: purchases3AccountsPayable,
    },
    {
      title: 'Awaiting bank match',
      actions: ['View all'],
      transactions: purchases3ReconcileToBank,
    },
    {
      title: 'Awaiting card match',
      actions: ['View all'],
      transactions: purchases3ReconcileToCreditCard,
    },
    {
      title: 'All done',
      actions: ['View all'],
      transactions: purchases3AuditReady,
    },
  ]

  // Update cardsColumns with real data
  const cardsColumnsWithData: PipelineColumn[] = [
    {
      title: 'Needs verification',
      actions: ['View all', '+ Add rules'],
      transactions: cardNeedsVerificationTransactions,
    },
    {
      title: 'Needs matching',
      actions: ['View all'],
      transactions: cardNeedsReconciliationTransactions,
    },
    {
      title: "Couldn't be matched",
      actions: ['View all'],
      transactions: confirmedUnreconcilableCard,
    },
    {
      title: 'All done',
      actions: ['View all'],
      transactions: recentReportingReadyCards,
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

      console.log(`Reconciliation completed: ${response.matched} transaction(s) matched`)
      
      // Refresh transactions to show updated reconciliation statuses
      if (response.matched > 0) {
        if (activeSection === 'bank') {
          // For Bank section, refresh transactions3 data
          // Matched bank transactions are archived (removed from "Needs reconciliation")
          // Matched purchase receipts are marked as reconciled (added to "Verified and audit ready")
          const [pendingResponse, verifiedResponse] = await Promise.all([
            transactions2Api.getTransactions3(businessId, 'pending', {
              page: 1,
              limit: 200,
              kind: 'statement_entry', // Filter for bank transactions on backend
              status: 'verification:unverified',
            }),
            transactions2Api.getTransactions3(businessId, 'source_of_truth', {
              page: 1,
              limit: 200,
              kind: 'statement_entry', // Filter for bank transactions on backend
              status: 'verification:verified',
            }),
          ])
          
          setTransactions3BankPending(pendingResponse.transactions || [])
          setTransactions3BankSourceOfTruth(verifiedResponse.transactions || [])
        } else {
          // For Credit Cards section, refresh transactions3 data
          // Matched credit card transactions are archived (removed from "Needs reconciliation")
          // Matched purchase receipts are marked as reconciled (added to "Verified and audit ready")
          const [pendingResponse, verifiedResponse] = await Promise.all([
            transactions2Api.getTransactions3(businessId, 'pending', {
              page: 1,
              limit: 200,
              kind: 'statement_entry', // Filter for credit card transactions on backend
              status: 'verification:unverified',
            }),
            transactions2Api.getTransactions3(businessId, 'source_of_truth', {
              page: 1,
              limit: 200,
              kind: 'statement_entry', // Filter for credit card transactions on backend
              status: 'verification:verified',
            }),
          ])
          
          setTransactions3CardPending(pendingResponse.transactions || [])
          setTransactions3CardSourceOfTruth(verifiedResponse.transactions || [])
        }
      }
    } catch (error) {
      console.error('Failed to reconcile transactions:', error)
      Alert.alert(
        'Reconciliation Failed',
        error instanceof Error ? error.message : 'An error occurred during reconciliation. Please try again.',
      )
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

  // If current section is bank/cards but no accounts/cards exist, switch to purchases3
  useEffect(() => {
    if (activeSection === 'bank' && bankAccounts.length === 0) {
      setActiveSection('purchases3')
    }
    if (activeSection === 'cards' && creditCards.length === 0) {
      setActiveSection('purchases3')
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
      // If on Purchases3 section, refresh transactions3 data
      if (activeSection === 'purchases3') {
        const [pendingResponse, sourceOfTruthResponse, reportingReadyRes] = await Promise.all([
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'purchase', // Filter for purchase transactions only
            status: 'verification:unverified',
          }),
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'purchase', // Filter for purchase transactions only
          }),
          // Always refresh reporting-ready transactions (used by reporting section)
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          }),
        ])
        setTransactions3Pending(pendingResponse.transactions || [])
        setTransactions3SourceOfTruth(sourceOfTruthResponse.transactions || [])
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      } else if (activeSection === 'bank') {
        // For Bank section, refresh transactions3 data using API-side filtering
        const [needsVerificationResponse, needsReconciliationResponse, verifiedResponse, reportingReadyRes] = await Promise.all([
          // Card 1: Needs verification (rule-matched, unverified)
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for bank transactions on backend
            status: 'verification:unverified',
          }),
          // Card 2: Needs reconciliation (no rule match)
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for bank transactions on backend
            status: 'reconciliation:pending_bank_match',
          }),
          // Card 4: Verified and audit ready
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for bank transactions on backend
            status: 'verification:verified',
          }),
          // Always refresh reporting-ready transactions (used by reporting section)
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          }),
        ])
        
        // Filter for bank transactions only (backend may not filter by capture.source)
        // Use helper function for backward compatibility with both old and new source values
        const bankNeedsVerification = (needsVerificationResponse.transactions || []).filter((tx) => {
          const metadata = tx.metadata as { 
            reconciliation?: { status?: string }
          }
          return isBankTransaction(tx) && metadata.reconciliation?.status === 'not_required'
        })
        
        const bankNeedsReconciliation = (needsReconciliationResponse.transactions || []).filter((tx) => {
          return isBankTransaction(tx)
        })
        
        const bankVerified = (verifiedResponse.transactions || []).filter((tx) => {
          return isBankTransaction(tx)
        })
        
        setTransactions3BankPending([...bankNeedsVerification, ...bankNeedsReconciliation])
        setTransactions3BankSourceOfTruth(bankVerified)
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      } else if (activeSection === 'cards') {
        // For Credit Cards section, refresh transactions3 data using API-side filtering
        const [needsVerificationResponse, needsReconciliationResponse, verifiedResponse, reportingReadyRes] = await Promise.all([
          // Card 1: Needs verification (rule-matched, unverified)
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for credit card transactions on backend
            status: 'verification:unverified',
          }),
          // Card 2: Needs reconciliation (no rule match)
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for credit card transactions on backend
            status: 'reconciliation:pending_bank_match',
          }),
          // Card 4: Verified and audit ready
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'statement_entry', // Filter for credit card transactions on backend
            status: 'verification:verified',
          }),
          // Always refresh reporting-ready transactions (used by reporting section)
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          }),
        ])
        
        // Filter for credit card transactions only (backend may not filter by capture.source)
        const cardNeedsVerification = (needsVerificationResponse.transactions || []).filter((tx) => {
          const metadata = tx.metadata as { 
            reconciliation?: { status?: string }
          }
          return isCreditCardTransaction(tx) && metadata.reconciliation?.status === 'not_required'
        })
        
        const cardNeedsReconciliation = (needsReconciliationResponse.transactions || []).filter((tx) => {
          return isCreditCardTransaction(tx)
        })
        
        const cardVerified = (verifiedResponse.transactions || []).filter((tx) => {
          return isCreditCardTransaction(tx)
        })
        
        setTransactions3CardPending([...cardNeedsVerification, ...cardNeedsReconciliation])
        setTransactions3CardSourceOfTruth(cardVerified)
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      } else if (activeSection === 'sales') {
        // For Sales section, refresh transactions2 data and POS sales from transactions3
        const [response, posSalesResponse, reportingReadyRes] = await Promise.all([
          transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 200,
          }),
          // Fetch POS sales from transactions3 - use source parameter for backend filtering
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'sale',
            source: 'pos_one_off_item', // Backend filters for POS sales
          }),
          // Always refresh reporting-ready transactions (used by reporting section)
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          }),
        ])
        setAllTransactions(response.transactions)
        setTransactions3POSSales(posSalesResponse.transactions || [])
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      } else if (activeSection === 'reporting') {
        // For reporting section, only refresh reporting-ready transactions
        const reportingReadyRes = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          // No kind filter - get all reporting-ready transactions from all sources
        })
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      } else {
        // For other sections, refresh transactions2 data
        const [response, reportingReadyRes] = await Promise.all([
          transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 200,
          }),
          // Always refresh reporting-ready transactions (used by reporting section)
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            // No kind filter - get all reporting-ready transactions from all sources
          }),
        ])
        setAllTransactions(response.transactions)
        setReportingReadyTransactions3(reportingReadyRes.transactions || [])
      }
    } catch (error) {
      console.error('Failed to refresh transactions:', error)
    } finally {
      setRefreshing(false)
    }
  }, [businessId, activeSection])

  return (
    <AppBarLayout
      title="Transactions"
      rightIconName={activeSection !== 'reporting' ? 'add-circle-sharp' : undefined}
      onRightIconPress={activeSection !== 'reporting' ? handleAddClick : undefined}
    >
      {loadingAccountsAndCards ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
        </View>
      ) : (
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

        {activeSection === 'bank' && !bankInfoCardDismissed && (
          <View style={styles.salesInfoCard}>
            <View style={styles.salesInfoContent}>
              <View style={styles.salesInfoTextContainer}>
                <Text style={styles.salesInfoTitle}>Understanding your Bank pipeline</Text>
                <Text style={styles.salesInfoBody}>
                  When bank transactions come in, Tally's rules automatically handle transactions that don't need matching—like bank fees and recurring payments. Check that these look right and confirm—they immediately show up in your financial reports. For other transactions, use the reconcile button to match them with your purchase receipts. If you click on a transaction and confirm it couldn't be matched (no receipt or evidence), it's marked as such and appears in your reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.salesInfoDismissButton}
                onPress={() => setBankInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.salesInfoDismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
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

        {activeSection === 'cards' && !cardsInfoCardDismissed && (
          <View style={styles.salesInfoCard}>
            <View style={styles.salesInfoContent}>
              <View style={styles.salesInfoTextContainer}>
                <Text style={styles.salesInfoTitle}>Understanding your Credit Cards pipeline</Text>
                <Text style={styles.salesInfoBody}>
                  When credit card transactions come in, Tally's rules automatically handle transactions that don't need matching—like fees and recurring payments. Check that these look right and confirm—they immediately show up in your financial reports. For other transactions, use the reconcile button to match them with your purchase receipts. If you click on a transaction and confirm it couldn't be matched (no receipt or evidence), it's marked as such and appears in your reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.salesInfoDismissButton}
                onPress={() => setCardsInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.salesInfoDismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {renderSection(
          activeSection,
          navigation,
          bankColumnsWithData,
          cardsColumnsWithData,
          salesColumnsWithData,
          purchases3ColumnsWithData,
          reportingReadyInputs,
          reportingReadyOutputs,
          reportingReadyTransactionsAll,
          handleReconcileClick,
          reconciling,
          getFullTransactions,
          businessId,
          onRefresh,
        )}
      </ScrollView>
      )}
    </AppBarLayout>
  )
}

function renderSection(
  section: SectionKey,
  navigation: StackNavigationProp<TransactionsStackParamList>,
  bankColumns: PipelineColumn[],
  cardsColumns: PipelineColumn[],
  salesColumns: PipelineColumn[],
  purchases3Columns: PipelineColumn[],
  reportingReadyInputs: Array<TransactionStub & { originalTransaction: Transaction }>,
  reportingReadyOutputs: Array<TransactionStub & { originalTransaction: Transaction }>,
  reportingReadyTransactionsAll: Array<TransactionStub & { originalTransaction: Transaction }>,
  handleReconcileClick?: () => void,
  reconciling?: boolean,
  getFullTransactions?: (columnTitle: string) => Array<TransactionStub & { originalTransaction?: Transaction }>,
  businessId?: string,
  onRefresh?: () => void,
) {
  switch (section) {
    case 'purchases3':
      return (
        <PipelineRow 
          columns={purchases3Columns} 
          navigation={navigation} 
          getFullTransactions={getFullTransactions} 
          pipelineSection={section} 
        />
      )
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
      return <PipelineRow columns={salesColumns} navigation={navigation} getFullTransactions={getFullTransactions} pipelineSection={section} />
    case 'internal':
      return null // TODO: Add Internal Transactions screen
    case 'payroll':
      return null // TODO: Add Payroll screen
    case 'reporting':
      return (
        <ReportingReadyList
          allTransactions={reportingReadyTransactionsAll}
          navigation={navigation}
        />
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
  const [salesInfoCardDismissed, setSalesInfoCardDismissed] = useState(false)
  const [purchasesInfoCardDismissed, setPurchasesInfoCardDismissed] = useState(false)

  const handleViewAll = (column: PipelineColumn) => {
    // For sales pipeline, use sales leads
    if (pipelineSection === 'sales' && column.salesLeads) {
      // Convert sales leads to transaction stub format for compatibility
      const items = column.salesLeads.map(lead => ({
        id: lead.id,
        title: lead.title,
        amount: lead.amount || '',
        subtitle: lead.subtitle,
      }))
      navigation.navigate('ScaffoldViewAll', {
        section: column.title,
        title: column.title,
        items,
        showReconcileButton: false,
      })
      return
    }
    
    // Use full transaction list if available, otherwise fall back to displayed items
    const items = getFullTransactions 
      ? getFullTransactions(column.title) 
      : (column.transactions || [])
    navigation.navigate('ScaffoldViewAll', {
      section: column.title,
      title: column.title,
      items,
      showReconcileButton: column.title === 'Needs matching',
    })
  }

  const isNeedsReconciliation = (columnTitle: string) => columnTitle === 'Needs matching'

  return (
    <View style={styles.pipelineColumnStack}>
      {columns.map((column, index) => (
        <React.Fragment key={column.title}>
          {pipelineSection === 'sales' && index === 0 && (
            <>
              {!salesInfoCardDismissed && (
                <View style={styles.salesInfoCard}>
                  <View style={styles.salesInfoContent}>
                    <View style={styles.salesInfoTextContainer}>
                      <Text style={styles.salesInfoTitle}>Understanding your Sales pipeline</Text>
                      <Text style={styles.salesInfoBody}>
                        When you create invoices, Tally organises them for you. Check that everything looks right, confirm and they will immediately show up in your financial reports. The other cards on this screen help you stay organised: track unpaid invoices, see payments waiting to be matched with your statements (you'll match them from your bank records), and view completed invoices.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.salesInfoDismissButton}
                      onPress={() => setSalesInfoCardDismissed(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.salesInfoDismissIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={styles.reportingReadySeparator}>
                <View style={styles.reportingReadyLine} />
                <Text style={styles.reportingReadyLabel}>Reporting Ready</Text>
                <View style={styles.reportingReadyLine} />
              </View>
            </>
          )}
          {pipelineSection === 'purchases3' && index === 0 && (
            <>
              {!purchasesInfoCardDismissed && (
                <View style={styles.salesInfoCard}>
                  <View style={styles.salesInfoContent}>
                    <View style={styles.salesInfoTextContainer}>
                      <Text style={styles.salesInfoTitle}>Understanding your Purchases pipeline</Text>
                      <Text style={styles.salesInfoBody}>
                      When you upload purchase receipts, Tally automatically reads the items and organises them. Check that everything looks right, confirm and they will immediately show up in your financial reports. The other cards on this screen help you stay organised: track and manage unpaid purchases, see payments waiting to be reconciled with bank and credit cards statements and view completed transactions.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.salesInfoDismissButton}
                      onPress={() => setPurchasesInfoCardDismissed(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.salesInfoDismissIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          {(pipelineSection === 'purchases3' && column.title === 'All done') || 
           (pipelineSection === 'sales' && column.title === 'POS Sales') || 
           (pipelineSection === 'bank' && column.title === 'All done') || 
           (pipelineSection === 'cards' && column.title === 'All done') ? (
            <View style={styles.reportingReadySeparator}>
              <View style={styles.reportingReadyLine} />
              <Text style={styles.reportingReadyLabel}>Audit Ready</Text>
              <View style={styles.reportingReadyLine} />
            </View>
          ) : null}
          <View style={styles.pipelineCard}>
            <View style={styles.pipelineTitleRow}>
              <Text style={styles.pipelineTitle}>{column.title}</Text>
              <TouchableOpacity activeOpacity={0.6} style={styles.learnMoreButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.learnMoreText}>Learn more</Text>
              </TouchableOpacity>
            </View>
            {column.rules ? (
              <RulesList 
                rules={column.rules} 
                navigation={navigation} 
                ruleType={pipelineSection === 'cards' ? 'creditCard' : 'bank'}
              />
            ) : pipelineSection === 'sales' && column.salesLeads ? (
              <SalesCardList items={column.salesLeads} navigation={navigation} />
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
                          // Navigate to Bank Statement Rules screen (lists existing rules)
                          // This screen should display the list of bankStatementRules
                          navigation.navigate('BankStatementRules')
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
          {pipelineSection === 'purchases3' && index === 0 && (
            <View style={styles.reportingReadySeparator}>
              <View style={styles.reportingReadyLine} />
              <Text style={styles.reportingReadyLabel}>Reporting ready</Text>
              <View style={styles.reportingReadyLine} />
            </View>
          )}
          {pipelineSection === 'bank' && index === 1 && (
            <View style={styles.reportingReadySeparator}>
              <View style={styles.reportingReadyLine} />
              <Text style={styles.reportingReadyLabel}>Reporting Ready</Text>
              <View style={styles.reportingReadyLine} />
            </View>
          )}
          {pipelineSection === 'cards' && index === 1 && (
            <View style={styles.reportingReadySeparator}>
              <View style={styles.reportingReadyLine} />
              <Text style={styles.reportingReadyLabel}>Reporting Ready</Text>
              <View style={styles.reportingReadyLine} />
            </View>
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

// Reporting Ready List Component - shows all transactions directly
function ReportingReadyList({
  allTransactions,
  navigation,
}: {
  allTransactions: Array<TransactionStub & { originalTransaction: Transaction }>
  navigation: StackNavigationProp<TransactionsStackParamList>
}) {
  const [showHelpModal, setShowHelpModal] = useState(false)

  const handleItemPress = useCallback((item: TransactionStub & { originalTransaction: Transaction }) => {
    if (item.originalTransaction) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }, [navigation])

  return (
    <>
      <View style={styles.reportingListContainer}>
        <View style={styles.cardTitleRowHeader}>
          <Text style={styles.sectionHeader}>Reporting ready (all sources)</Text>
          <TouchableOpacity 
            activeOpacity={0.6} 
            style={styles.learnMoreButton} 
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setShowHelpModal(true)}
          >
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        {allTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reporting ready transactions</Text>
          </View>
        ) : (
          <View style={styles.reportingList}>
            {allTransactions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.reportingListItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
                disabled={!item.originalTransaction}
              >
                <View style={styles.reportingItemTextGroup}>
                  <View style={styles.reportingItemTitleRow}>
                    <View style={styles.auditIconContainer}>
                      {item.originalTransaction && isAuditReady(item.originalTransaction) && (
                        <Ionicons name="shield" size={16} color={GRAYSCALE_SECONDARY} />
                      )}
                      {item.originalTransaction && isUnreconciled(item.originalTransaction) && (
                        <MaterialCommunityIcons name="shield-off" size={16} color={GRAYSCALE_SECONDARY} />
                      )}
                    </View>
                    <Text style={styles.reportingItemTitle}>{item.title}</Text>
                  </View>
                </View>
                <View style={styles.reportingItemAmountContainer}>
                  <Text style={[
                    styles.reportingInputOutputIndicator,
                    item.isCredit ? styles.inputIndicator : styles.outputIndicator
                  ]}>
                    {item.isCredit ? '+' : '-'}
                  </Text>
                  <Text style={styles.reportingItemAmount}>{item.amount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpModal}>
            <View style={styles.helpModalHeader}>
              <Text style={styles.helpModalTitle}>Understanding Reporting Ready Transactions</Text>
              <TouchableOpacity
                onPress={() => setShowHelpModal(false)}
                style={styles.helpModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.helpModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.helpModalSectionTitle}>Transaction Categories</Text>
              <Text style={styles.helpModalText}>
                Reporting ready transactions are categorized into two types based on their impact on your business:
              </Text>
              
              <View style={styles.helpCategoryCard}>
                <View style={styles.helpCategoryHeader}>
                  <View style={[styles.helpCategoryIndicator, styles.inputIndicatorDot]} />
                  <Text style={styles.helpCategoryTitle}>Inputs (Credits / Income)</Text>
                </View>
                <Text style={styles.helpCategoryDescription}>
                  These are transactions that bring money into your business:
                </Text>
                <View style={styles.helpCategoryList}>
                  <Text style={styles.helpCategoryItem}>• Sales invoices and revenue</Text>
                  <Text style={styles.helpCategoryItem}>• Bank deposits and credits</Text>
                  <Text style={styles.helpCategoryItem}>• Credit card payments received</Text>
                  <Text style={styles.helpCategoryItem}>• Other income transactions</Text>
                </View>
              </View>

              <View style={styles.helpCategoryCard}>
                <View style={styles.helpCategoryHeader}>
                  <View style={[styles.helpCategoryIndicator, styles.outputIndicatorDot]} />
                  <Text style={styles.helpCategoryTitle}>Outputs (Debits / Expenses)</Text>
                </View>
                <Text style={styles.helpCategoryDescription}>
                  These are transactions that take money out of your business:
                </Text>
                <View style={styles.helpCategoryList}>
                  <Text style={styles.helpCategoryItem}>• Purchase receipts and expenses</Text>
                  <Text style={styles.helpCategoryItem}>• Bank withdrawals and debits</Text>
                  <Text style={styles.helpCategoryItem}>• Credit card charges</Text>
                  <Text style={styles.helpCategoryItem}>• Other expense transactions</Text>
                </View>
              </View>

              <Text style={styles.helpModalSectionTitle}>How Transactions Are Categorized</Text>
              <Text style={styles.helpModalText}>
                The system automatically determines if a transaction is an input or output by analyzing:
              </Text>
              <View style={styles.helpCategoryList}>
                <Text style={styles.helpCategoryItem}>• Transaction type (sale, purchase, statement entry)</Text>
                <Text style={styles.helpCategoryItem}>• Accounting entries (debits and credits)</Text>
                <Text style={styles.helpCategoryItem}>• Bank statement context (credit vs debit)</Text>
                <Text style={styles.helpCategoryItem}>• Chart of accounts classification</Text>
              </View>

              <Text style={styles.helpModalSectionTitle}>Why This Matters</Text>
              <Text style={styles.helpModalText}>
                Understanding inputs vs outputs helps you:
              </Text>
              <View style={styles.helpCategoryList}>
                <Text style={styles.helpCategoryItem}>• Track revenue vs expenses accurately</Text>
                <Text style={styles.helpCategoryItem}>• Generate accurate financial reports</Text>
                <Text style={styles.helpCategoryItem}>• Understand cash flow patterns</Text>
                <Text style={styles.helpCategoryItem}>• Make informed business decisions</Text>
              </View>

              <Text style={styles.helpModalNote}>
                Note: Some transactions may be complex and require manual review. If you notice a transaction is incorrectly categorized, you can review and adjust it in the transaction detail view.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

function CardList({
  items,
  navigation,
  showInputOutputIndicator = false,
}: {
  items: Array<TransactionStub & { originalTransaction?: Transaction }>
  navigation?: StackNavigationProp<TransactionsStackParamList>
  showInputOutputIndicator?: boolean
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
            <View style={styles.cardTitleRow}>
              <View style={styles.auditIconContainer}>
                {item.originalTransaction && isAuditReady(item.originalTransaction) && (
                  <Ionicons name="shield" size={16} color={GRAYSCALE_SECONDARY} />
                )}
                {item.originalTransaction && isUnreconciled(item.originalTransaction) && (
                  <Ionicons name="shield-outline" size={16} color={GRAYSCALE_SECONDARY} style={{ opacity: 0.5 }} />
                )}
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            {item.isCredit && !showInputOutputIndicator && (
              <Text style={styles.creditLabel}>credit</Text>
            )}
          </View>
          <View style={styles.cardAmountContainer}>
            {showInputOutputIndicator && (
              <Text style={[
                styles.inputOutputIndicator,
                item.isCredit ? styles.inputIndicator : styles.outputIndicator
              ]}>
                {item.isCredit ? '+' : '-'}
              </Text>
            )}
            <Text style={styles.cardAmount}>{item.amount}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function SalesCardList({
  items,
  navigation,
}: {
  items: SalesLead[]
  navigation?: StackNavigationProp<TransactionsStackParamList>
}) {
  const getStageColor = (stage: SalesLead['stage']): string => {
    switch (stage) {
      case 'lead':
        return '#8d8d8d' // Dark gray
      case 'conversation':
        return '#a0a0a0' // Medium gray
      case 'proposal':
        return '#b3b3b3' // Light gray
      case 'won':
        return '#6d6d6d' // Darker gray
      case 'lost':
        return '#c0c0c0' // Lightest gray
      default:
        return GRAYSCALE_SECONDARY
    }
  }

  const handleCardPress = (item: SalesLead) => {
    if (navigation) {
      navigation.navigate('LeadDetail', { lead: item })
    }
  }

  return (
    <View style={styles.cardList}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.cardListItem, { borderLeftWidth: 4, borderLeftColor: getStageColor(item.stage) }]}
          onPress={() => handleCardPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTextGroup}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.projectTitle && (
              <Text style={styles.projectTitle} numberOfLines={1}>
                {item.projectTitle}
              </Text>
            )}
            {item.subtitle && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
          </View>
          {item.amount && (
            <Text style={styles.cardAmount}>{item.amount}</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardTitleRowHeader: {
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
  learnMoreButton: {
    padding: 4,
    marginLeft: 8,
  },
  learnMoreText: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '400',
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditIconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  creditLabel: {
    marginTop: 2,
    fontSize: 10,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  projectTitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: GRAYSCALE_SECONDARY,
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
  cardAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  inputOutputIndicator: {
    fontSize: 16,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  // Reporting Ready List Styles
  reportingListContainer: {
    marginBottom: 24,
  },
  reportingListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportingList: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    overflow: 'hidden',
  },
  reportingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reportingItemTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  reportingItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportingItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  reportingItemAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportingInputOutputIndicator: {
    fontSize: 16,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  reportingItemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
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
  testButtonContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  testButton: {
    backgroundColor: '#fff3cd',
    borderWidth: 2,
    borderColor: '#ffc107',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#856404',
    fontSize: 13,
    fontWeight: '600',
  },
  reportingReadySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  reportingReadyLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d0d0d0',
  },
  reportingReadyLabel: {
    marginHorizontal: 8,
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  salesInfoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  salesInfoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  salesInfoTextContainer: {
    flex: 1,
  },
  salesInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  salesInfoBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
  },
  salesInfoDismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  salesInfoDismissIcon: {
    fontSize: 22,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '300',
    lineHeight: 20,
  },
  blankSectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  blankSectionText: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  blankSectionSubtext: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  // Reporting Ready Card Styles
  inputIndicator: {
    color: GRAYSCALE_PRIMARY, // Grayscale for + indicator text
  },
  outputIndicator: {
    color: GRAYSCALE_PRIMARY, // Grayscale for - indicator text
  },
  inputIndicatorDot: {
    backgroundColor: '#4caf50', // Green for input indicator dots in help modal
  },
  outputIndicatorDot: {
    backgroundColor: '#ff9800', // Orange for output indicator dots in help modal
  },
  // Help Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModal: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  helpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  helpModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    flex: 1,
    marginRight: 12,
  },
  helpModalClose: {
    padding: 4,
  },
  helpModalContent: {
    padding: 20,
  },
  helpModalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginTop: 20,
    marginBottom: 12,
  },
  helpModalText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 20,
    marginBottom: 12,
  },
  helpCategoryCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  helpCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  helpCategoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  helpCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  helpCategoryDescription: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 8,
    lineHeight: 18,
  },
  helpCategoryList: {
    marginTop: 4,
  },
  helpCategoryItem: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 20,
    marginBottom: 4,
  },
  helpModalNote: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
    marginTop: 20,
    padding: 12,
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
})

