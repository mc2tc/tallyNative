import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import type { ReportsStackParamList } from '../navigation/ReportsNavigator'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const DEFAULT_CURRENCY = 'GBP'

type TransactionAccounting = {
  debits?: Array<{
    chartName?: string
    amount?: number
  }>
  credits?: Array<{
    chartName?: string
    amount?: number
    paymentMethod?: string
  }>
}

type LedgerEntry = {
  transaction: Transaction
  amount: number
  date: Date
  description: string
}

type AccountLedgerRouteProp = RouteProp<ReportsStackParamList, 'AccountLedger'>

export default function AccountLedgerScreen() {
  const navigation = useNavigation<NavigationProp<ReportsStackParamList>>()
  const route = useRoute<AccountLedgerRouteProp>()
  const { accountName, accountType, accountValue, period } = route.params
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) {
      setError('No business context found')
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('[AccountLedger] Fetching transactions for account:', {
          accountName,
          accountType,
          businessId,
          period,
        })
        // Fetch reporting-ready transactions from source_of_truth collection
        // This is where verified transactions with accounting entries are stored
        const response = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 1000, // Large limit to get all transactions
          status: 'verification:verified',
        })
        console.log('[AccountLedger] API Response:', {
          totalTransactions: response.transactions?.length || 0,
          pagination: response.pagination,
          sampleTransaction: response.transactions?.[0] ? {
            id: response.transactions[0].id,
            thirdPartyName: response.transactions[0].summary.thirdPartyName,
            verificationStatus: (response.transactions[0].metadata as any)?.verification?.status,
            reconciliationStatus: (response.transactions[0].metadata as any)?.reconciliation?.status,
            hasAccounting: !!(response.transactions[0].accounting as any)?.debits?.length || !!(response.transactions[0].accounting as any)?.credits?.length,
            debits: (response.transactions[0].accounting as any)?.debits?.map((d: any) => ({ chartName: d.chartName, amount: d.amount })) || [],
            credits: (response.transactions[0].accounting as any)?.credits?.map((c: any) => ({ chartName: c.chartName, amount: c.amount })) || [],
          } : null,
        })
        setTransactions(response.transactions)
      } catch (err) {
        console.error('[AccountLedger] Failed to fetch transactions:', err)
        setError('Failed to load transactions')
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    void fetchTransactions()
  }, [businessId])

  // Filter and process transactions for this account
  const ledgerEntries = useMemo(() => {
    console.log('[AccountLedger] Filtering transactions:', {
      totalTransactions: transactions.length,
      accountName,
      accountType,
      period,
    })

    if (!transactions.length) {
      console.log('[AccountLedger] No transactions to filter')
      return []
    }

    const entries: LedgerEntry[] = []
    const startDate = period?.startDate ? new Date(period.startDate) : null
    const endDate = period?.endDate ? new Date(period.endDate) : null

    let dateFilteredCount = 0
    let reportingReadyFilteredCount = 0
    let accountMatchedCount = 0

    for (const transaction of transactions) {
      const txDate = new Date(transaction.summary.transactionDate)

      // Filter by date range if period is provided
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (txDate < start) continue
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (txDate > end) continue
      }
      dateFilteredCount++

      // Only include Reporting Ready transactions
      // Since we're fetching from source_of_truth collection with verification:verified,
      // all transactions are already verified. We just need to check reconciliation and accounting.
      const metadata = transaction.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string }
      }
      const accounting = transaction.accounting as TransactionAccounting | undefined

      // Check if transaction is Reporting Ready
      // Reporting Ready = verified AND (reconciled/not_required OR has accounting entries)
      // Note: We're already filtering for verified transactions from source_of_truth collection
      const isReconciled =
        metadata.reconciliation?.status === 'reconciled' ||
        metadata.reconciliation?.status === 'not_required' ||
        metadata.reconciliation?.status === 'matched' // Legacy status support
      const hasAccountingEntries =
        (accounting?.debits?.length ?? 0) > 0 || (accounting?.credits?.length ?? 0) > 0

      // Include if reconciled/not_required OR has accounting entries
      // All transactions from source_of_truth are verified, so we don't need to check verification status
      if (!isReconciled && !hasAccountingEntries) {
        continue
      }
      reportingReadyFilteredCount++

      // Check both debits and credits for all account types
      // For assets: debits increase (positive), credits decrease (negative)
      // For expenses: debits increase (positive)
      // For liabilities/equity/income: credits increase (positive)
      const debits = accounting?.debits || []
      const credits = accounting?.credits || []

      // Log account matching details for first few transactions
      if (reportingReadyFilteredCount <= 3) {
        console.log('[AccountLedger] Checking transaction for account match:', {
          transactionId: transaction.id,
          thirdPartyName: transaction.summary.thirdPartyName,
          accountName,
          accountType,
          debits: debits.map((d) => ({ chartName: d.chartName, amount: d.amount })),
          credits: credits.map((c) => ({ chartName: c.chartName, amount: c.amount })),
        })
      }

      if (accountType === 'expense' || accountType === 'asset') {
        // Check debits (these increase expense/asset)
        for (const debit of debits) {
          if (debit.chartName === accountName && debit.amount) {
            accountMatchedCount++
            entries.push({
              transaction,
              amount: debit.amount,
              date: txDate,
              description:
                transaction.summary.thirdPartyName ||
                transaction.summary.description ||
                (accountType === 'asset' ? 'Asset' : 'Expense'),
            })
          }
        }
        // For assets, also check credits (these decrease asset, so negative)
        if (accountType === 'asset') {
          for (const credit of credits) {
            if (credit.chartName === accountName && credit.amount) {
              accountMatchedCount++
              entries.push({
                transaction,
                amount: -credit.amount, // Negative because credits decrease assets
                date: txDate,
                description:
                  transaction.summary.thirdPartyName ||
                  transaction.summary.description ||
                  'Asset',
              })
            }
          }
        }
      } else if (accountType === 'income' || accountType === 'liability' || accountType === 'equity') {
        // Check credits (these increase income/liability/equity)
        for (const credit of credits) {
          if (credit.chartName === accountName && credit.amount) {
            accountMatchedCount++
            entries.push({
              transaction,
              amount: credit.amount,
              date: txDate,
              description:
                transaction.summary.thirdPartyName ||
                transaction.summary.description ||
                (accountType === 'liability'
                  ? 'Liability'
                  : accountType === 'equity'
                    ? 'Equity'
                    : 'Income'),
            })
          }
        }
      }
    }

    console.log('[AccountLedger] Filtering results:', {
      totalTransactions: transactions.length,
      dateFilteredCount,
      reportingReadyFilteredCount,
      accountMatchedCount,
      finalEntriesCount: entries.length,
    })

    // Sort by date ascending (oldest first)
    const sortedEntries = entries.sort((a, b) => a.date.getTime() - b.date.getTime())
    console.log('[AccountLedger] Final ledger entries:', sortedEntries.length)
    return sortedEntries
  }, [transactions, accountName, accountType, period])

  // Calculate running balance
  // Amounts are already signed correctly (positive for increases, negative for decreases)
  const entriesWithBalance = useMemo(() => {
    let runningBalance = 0
    return ledgerEntries.map((entry) => {
      runningBalance += entry.amount
      return {
        ...entry,
        runningBalance,
      }
    })
  }, [ledgerEntries])

  // Calculate total
  const totalAmount = useMemo(() => {
    return ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0)
  }, [ledgerEntries])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      // Navigate to transaction detail if that screen is available
      // For now, we'll just show the transaction
      console.log('Navigate to transaction:', transaction.id)
    },
    [],
  )

  const renderLedgerEntry = ({ item }: { item: typeof entriesWithBalance[0] }) => {
    const dateStr = item.date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    return (
      <TouchableOpacity
        style={styles.entryRow}
        onPress={() => handleTransactionPress(item.transaction)}
        activeOpacity={0.7}
      >
        <View style={styles.entryLeft}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <Text style={styles.entryDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={styles.entryAmount}>
            {formatAmount(item.amount, DEFAULT_CURRENCY, true)}
          </Text>
          <Text style={styles.entryBalance}>
            {formatAmount(item.runningBalance, DEFAULT_CURRENCY, true)}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{accountName}</Text>
        <Text style={styles.accountType}>
          {accountType === 'income'
            ? 'Income Account'
            : accountType === 'expense'
              ? 'Expense Account'
              : accountType === 'asset'
                ? 'Asset Account'
                : accountType === 'liability'
                  ? 'Liability Account'
                  : accountType === 'equity'
                    ? 'Equity Account'
                    : 'Account'}
        </Text>
        {period && (
          <Text style={styles.periodText}>
            {new Date(period.startDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            -{' '}
            {new Date(period.endDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Period Total</Text>
        <Text style={styles.summaryValue}>
          {formatAmount(accountValue ?? 0, DEFAULT_CURRENCY, true)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Calculated Total</Text>
        <Text style={styles.summaryValue}>
          {formatAmount(totalAmount, DEFAULT_CURRENCY, true)}
        </Text>
      </View>
    </View>
  )

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderLeft}>
        <Text style={styles.tableHeaderText}>Date & Description</Text>
      </View>
      <View style={styles.tableHeaderRight}>
        <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
        <Text style={[styles.tableHeaderText, styles.balanceHeader]}>Balance</Text>
      </View>
    </View>
  )

  if (loading) {
    return (
      <AppBarLayout title="Account Ledger" onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
          <Text style={styles.loadingText}>Loading ledger entries...</Text>
        </View>
      </AppBarLayout>
    )
  }

  if (error) {
    return (
      <AppBarLayout title="Account Ledger" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title="Account Ledger" onBackPress={handleGoBack}>
      <FlatList
        data={entriesWithBalance}
        renderItem={renderLedgerEntry}
        keyExtractor={(item, index) => `${item.transaction.id}-${index}`}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {entriesWithBalance.length > 0 && renderTableHeader()}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="receipt-text-outline" size={48} color="#888888" />
            <Text style={styles.emptyText}>No transactions found for this account</Text>
            <Text style={styles.emptySubtext}>
              Transactions will appear here once they are reporting ready
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#b00020',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    padding: 20,
    marginBottom: 16,
  },
  accountInfo: {
    marginBottom: 16,
  },
  accountName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  periodText: {
    fontSize: 13,
    color: '#666666',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  tableHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  tableHeaderRight: {
    flexDirection: 'row',
    gap: 40,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountHeader: {
    width: 85,
    textAlign: 'right',
  },
  balanceHeader: {
    width: 85,
    textAlign: 'right',
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  entryLeft: {
    flex: 1,
    marginRight: 16,
  },
  entryDate: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 15,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  entryRight: {
    flexDirection: 'row',
    gap: 40,
    alignItems: 'center',
  },
  entryAmount: {
    fontSize: 15,
    color: '#1f1f1f',
    fontWeight: '500',
    width: 85,
    textAlign: 'right',
  },
  entryBalance: {
    fontSize: 14,
    color: '#666666',
    width: 85,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#555555',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888888',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})

