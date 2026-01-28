import React, { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Searchbar } from 'react-native-paper'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type TransactionStub = {
  id: string
  title: string
  amount: string
  isCredit?: boolean
  originalTransaction: Transaction
}

// Helper: audit-ready definition (kept in sync with TransactionsScaffoldScreen)
function isAuditReady(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined

  const reconciliationStatus = metadata?.reconciliation?.status

  return (
    reconciliationStatus === 'matched' ||
    reconciliationStatus === 'reconciled' ||
    reconciliationStatus === 'exception' ||
    reconciliationStatus === 'not_required'
  )
}

// Helper: unreconciled definition (kept in sync with TransactionsScaffoldScreen)
function isUnreconciled(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    reconciliation?: { status?: string }
  } | undefined

  return metadata?.reconciliation?.status === 'unreconciled'
}

// Helper: is bank transaction
function isBankTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return (
    metadata.capture?.source === 'bank_statement_upload' ||
    metadata.capture?.source === 'bank_statement_ocr'
  )
}

// Helper: is credit card transaction
function isCreditCardTransaction(tx: Transaction): boolean {
  const metadata = tx.metadata as {
    capture?: { source?: string }
  }
  return metadata.capture?.source === 'credit_card_statement_upload'
}

// Helper: is credit to account (kept in sync with TransactionsScaffoldScreen)
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

  // Bank statement credits
  if (isBankTransaction(tx)) {
    if (metadata.statementContext?.isCredit === true) return true
    if (
      accounting?.debits?.some(
        (debit) => debit.chartName === 'Bank' && debit.isAsset === true,
      )
    ) {
      return true
    }
  }

  // Credit card statement credits (payments)
  if (isCreditCardTransaction(tx)) {
    if (metadata.statementContext?.isCredit === true) return true
    if (
      accounting?.debits?.some(
        (debit) => debit.chartName === 'Card' && debit.isLiability === true,
      )
    ) {
      return true
    }
  }

  // Income transactions (sales invoices)
  if (metadata.classification?.kind === 'sale') return true
  if (accounting?.credits?.some((credit) => credit.isIncome === true)) return true

  return false
}

// Helper: truncate title for cards
function truncateTitle(title: string | undefined | null): string {
  if (!title) return ''
  return title.length > 24 ? `${title.substring(0, 24)}...` : title
}

// Group reporting transactions by date (kept in sync with TransactionsScaffoldScreen)
function groupReportingTransactionsByDate(
  items: TransactionStub[],
): Array<{
  date: string
  dateLabel: string
  items: TransactionStub[]
  totalAmount: number
  currency: string
}> {
  const dateMap = new Map<string, TransactionStub[]>()

  items.forEach((item) => {
    const tx = item.originalTransaction
    if (!tx) return

    const date = new Date(tx.summary.transactionDate)
    const dateKey = date.toDateString()

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, [])
    }
    dateMap.get(dateKey)!.push(item)
  })

  const groups: Array<{
    date: string
    dateLabel: string
    items: TransactionStub[]
    totalAmount: number
    currency: string
  }> = []

  dateMap.forEach((txs, dateKey) => {
    const date = new Date(dateKey)
    const dateLabel = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    const currencyTotals = new Map<string, number>()

    txs.forEach((item) => {
      const tx = item.originalTransaction
      if (tx) {
        const txCurrency = tx.summary.currency || 'GBP'
        const amount = Math.abs(tx.summary.totalAmount)
        const currentTotal = currencyTotals.get(txCurrency) || 0
        currencyTotals.set(txCurrency, currentTotal + amount)
      }
    })

    let currency = 'GBP'
    let maxTotal = 0
    currencyTotals.forEach((total, curr) => {
      if (total > maxTotal) {
        maxTotal = total
        currency = curr
      }
    })

    const totalAmount = currencyTotals.get(currency) || 0

    groups.push({
      date: dateKey,
      dateLabel,
      items: txs.sort((a, b) => {
        const aDate = a.originalTransaction?.summary.transactionDate || 0
        const bDate = b.originalTransaction?.summary.transactionDate || 0
        return bDate - aDate
      }),
      totalAmount,
      currency,
    })
  })

  return groups.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export default function ReportingReadyScreen() {
  const { businessUser, memberships } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TransactionStub[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId &&
    !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setTransactions([])
        setLoading(false)
        return
      }

      const fetchReportingReady = async () => {
        try {
          setLoading(true)
          const response = await transactions2Api.getTransactions3(
            businessId,
            'source_of_truth',
            {
              page: 1,
              limit: 200,
            },
          )

          const txs = (response.transactions || []).map((tx) => {
            const amount = formatAmount(
              tx.summary.totalAmount,
              tx.summary.currency,
              true,
            )
            return {
              id: tx.id,
              title: truncateTitle(tx.summary.thirdPartyName),
              amount,
              isCredit: isCreditToAccount(tx),
              originalTransaction: tx,
            }
          })

          setTransactions(txs)
        } catch (error) {
          console.error('Failed to fetch reporting-ready transactions:', error)
          setTransactions([])
        } finally {
          setLoading(false)
        }
      }

      fetchReportingReady()
    }, [businessId]),
  )

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions
    }

    const query = searchQuery.toLowerCase()
    return transactions.filter((item) => {
      const title = item.title?.toLowerCase() || ''
      const amount = item.amount?.toLowerCase() || ''
      const thirdPartyName =
        item.originalTransaction?.summary.thirdPartyName?.toLowerCase() || ''
      const description =
        item.originalTransaction?.summary.description?.toLowerCase() || ''

      return (
        title.includes(query) ||
        amount.includes(query) ||
        thirdPartyName.includes(query) ||
        description.includes(query)
      )
    })
  }, [transactions, searchQuery])

  const groupedTransactions = useMemo(
    () => groupReportingTransactionsByDate(filteredTransactions),
    [filteredTransactions],
  )

  return (
    <AppBarLayout>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>
                  Reporting Ready transactions
                </Text>
                <Text style={styles.infoBody}>
                  Verified transactions from all sources (purchases, sales, bank,
                  and credit cards) that appear in your financial reports.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchBarContainer}>
            <Searchbar
              placeholder="Search transactions..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={styles.searchBarInput}
              iconColor={GRAYSCALE_SECONDARY}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? 'No transactions found'
                  : 'No reporting ready transactions'}
              </Text>
            </View>
          ) : (
            <View style={styles.reportingListContainer}>
              {groupedTransactions.map((group) => (
                <View key={group.date} style={styles.dateGroupCard}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateLabel}>{group.dateLabel}</Text>
                    <Text style={styles.dateTotal}>
                      {formatAmount(
                        group.totalAmount,
                        group.currency,
                        group.currency === 'GBP',
                      )}
                    </Text>
                  </View>
                  {group.items.map((item) => (
                    <View key={item.id} style={styles.reportingListItem}>
                      <View style={styles.reportingItemTextGroup}>
                        <View style={styles.reportingItemTitleRow}>
                          {(isAuditReady(item.originalTransaction) ||
                            isUnreconciled(item.originalTransaction)) && (
                            <View style={styles.auditIconContainer}>
                              {isAuditReady(item.originalTransaction) && (
                                <Ionicons
                                  name="shield"
                                  size={16}
                                  color={GRAYSCALE_SECONDARY}
                                />
                              )}
                              {isUnreconciled(item.originalTransaction) && (
                                <MaterialCommunityIcons
                                  name="shield-off"
                                  size={16}
                                  color={GRAYSCALE_SECONDARY}
                                />
                              )}
                            </View>
                          )}
                          <Text style={styles.reportingItemTitle}>
                            {item.title}
                          </Text>
                        </View>
                        {item.originalTransaction.summary.currency !==
                          group.currency && (
                          <Text style={styles.foreignCurrency}>
                            {formatAmount(
                              Math.abs(
                                item.originalTransaction.summary.totalAmount,
                              ),
                              item.originalTransaction.summary.currency,
                              false,
                            )}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reportingItemAmountContainer}>
                        <Text
                          style={[
                            styles.reportingInputOutputIndicator,
                            item.isCredit
                              ? styles.inputIndicator
                              : styles.outputIndicator,
                          ]}
                        >
                          {item.isCredit ? '+' : '-'}
                        </Text>
                        <Text style={styles.reportingItemAmount}>
                          {item.amount}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
  },
  loadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  infoBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
  },
  searchBarContainer: {
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: CARD_BACKGROUND,
    elevation: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  searchBarInput: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
  },
  reportingListContainer: {
    gap: 16,
  },
  dateGroupCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9a9a9a',
  },
  dateTotal: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9a9a9a',
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
  auditIconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  foreignCurrency: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    marginTop: 2,
  },
  inputIndicator: {
    color: GRAYSCALE_PRIMARY,
  },
  outputIndicator: {
    color: GRAYSCALE_PRIMARY,
  },
})


