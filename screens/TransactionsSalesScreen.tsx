// Sales screen - shows sales pipeline columns without horizontal nav
// Extracted from TransactionsScaffoldScreen

import React, { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import {
  truncateTitle,
  deduplicateTransactions,
  isSaleTransaction,
  isPOSSaleTransaction,
  hasAccountsReceivablePayment,
  isCashOnlyTransaction,
  isAuditReady,
  isUnreconciled,
  type TransactionStub,
} from '../lib/utils/transactionHelpers'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PipelineColumn = {
  title: string
  actions: string[]
  transactions?: Array<TransactionStub & { originalTransaction?: Transaction }>
}

export default function TransactionsSalesScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [transactions3POSSales, setTransactions3POSSales] = useState<Transaction[]>([])
  const [transactions3SalesInvoices, setTransactions3SalesInvoices] = useState<Transaction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [salesInfoCardDismissed, setSalesInfoCardDismissed] = useState(false)

  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchSalesData = useCallback(async () => {
    if (!businessId) return

    try {
      const [response, posSalesResponse, salesInvoicesResponse] = await Promise.all([
        transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 200,
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'sale',
          source: 'pos_one_off_item',
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'sale',
        }),
      ])
      setAllTransactions(response.transactions)
      setTransactions3POSSales(posSalesResponse.transactions || [])
      const nonPOSSales = (salesInvoicesResponse.transactions || []).filter((tx) => {
        const metadata = tx.metadata as { capture?: { source?: string } }
        return metadata.capture?.source !== 'pos_one_off_item'
      })
      setTransactions3SalesInvoices(nonPOSSales)
    } catch (error) {
      console.error('Failed to fetch sales data:', error)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchSalesData()
    }, [fetchSalesData])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSalesData()
    setRefreshing(false)
  }, [fetchSalesData])

  // Filter sale transactions into categories
  const allSalesInvoices = deduplicateTransactions([...allTransactions, ...transactions3SalesInvoices])
  
  const invoicesPendingPayment: Array<TransactionStub & { originalTransaction: Transaction }> =
    allSalesInvoices
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        if (isPOSSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          classification?: { kind?: string }
        }
        if (metadata.classification?.kind === 'purchase') return false
        return hasAccountsReceivablePayment(tx)
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        originalTransaction: tx,
      }))

  const invoicesPaidNeedsMatch: Array<TransactionStub & { originalTransaction: Transaction }> =
    allSalesInvoices
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        if (isPOSSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
          classification?: { kind?: string }
        }
        if (metadata.classification?.kind === 'purchase') return false
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        const isPendingBankMatch = metadata.reconciliation?.status === 'pending_bank_match'
        const isCashOnly = isCashOnlyTransaction(tx)
        return isVerified && !isCashOnly && isPendingBankMatch
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        originalTransaction: tx,
      }))

  const posSalesAuditReady: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3POSSales
      .filter((tx) => {
        const metadata = tx.metadata as { verification?: { status?: string } }
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        return isVerified
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isReportingReady: true,
        originalTransaction: tx,
      }))

  const salesInvoicesAuditReady: Array<TransactionStub & { originalTransaction: Transaction }> =
    allSalesInvoices
      .filter((tx) => {
        if (!isSaleTransaction(tx)) return false
        const metadata = tx.metadata as {
          reconciliation?: { status?: string }
          classification?: { kind?: string }
        }
        if (metadata.classification?.kind === 'purchase') return false
        if (isPOSSaleTransaction(tx)) return false
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
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isReportingReady: true,
        originalTransaction: tx,
      }))

  const salesColumns: PipelineColumn[] = [
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

  const getFullTransactions = (columnTitle: string): Array<TransactionStub & { originalTransaction?: Transaction }> => {
    switch (columnTitle) {
      case 'Unpaid invoices':
        return allSalesInvoices
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            if (isPOSSaleTransaction(tx)) return false
            const metadata = tx.metadata as { classification?: { kind?: string } }
            if (metadata.classification?.kind === 'purchase') return false
            return hasAccountsReceivablePayment(tx)
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'Awaiting bank match':
        return allSalesInvoices
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            if (isPOSSaleTransaction(tx)) return false
            const metadata = tx.metadata as {
              verification?: { status?: string }
              reconciliation?: { status?: string }
              classification?: { kind?: string }
            }
            if (metadata.classification?.kind === 'purchase') return false
            const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
            const isPendingBankMatch = metadata.reconciliation?.status === 'pending_bank_match'
            const isCashOnly = isCashOnlyTransaction(tx)
            return isVerified && !isCashOnly && isPendingBankMatch
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'POS Sales':
        return transactions3POSSales
          .filter((tx) => {
            const metadata = tx.metadata as { verification?: { status?: string } }
            const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
            return isVerified
          })
          .sort((a, b) => {
            const aDate = a.summary.transactionDate || 0
            const bDate = b.summary.transactionDate || 0
            return bDate - aDate
          })
          .map((tx) => ({
            id: tx.id,
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            isReportingReady: true,
            originalTransaction: tx,
          }))
      case 'Sales Invoices':
        return allSalesInvoices
          .filter((tx) => {
            if (!isSaleTransaction(tx)) return false
            const metadata = tx.metadata as {
              reconciliation?: { status?: string }
              classification?: { kind?: string }
            }
            if (metadata.classification?.kind === 'purchase') return false
            if (isPOSSaleTransaction(tx)) return false
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
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            isReportingReady: true,
            originalTransaction: tx,
          }))
      default:
        return []
    }
  }

  const handleViewAll = (column: PipelineColumn) => {
    const items = getFullTransactions(column.title)
    navigation.navigate('ScaffoldViewAll', {
      section: column.title,
      title: column.title,
      items,
      showReconcileButton: false,
      pipelineSection: 'sales',
    })
  }

  const handleAddClick = () => {
    navigation.navigate('AddTransaction', { context: { pipelineSection: 'sales' } })
  }

  const handleCardPress = (item: TransactionStub & { originalTransaction?: Transaction }) => {
    if (item.originalTransaction) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }

  return (
    <AppBarLayout
      title="Transactions"
      rightIconName="add-circle-sharp"
      onRightIconPress={handleAddClick}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!salesInfoCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding your Sales pipeline</Text>
                <Text style={styles.infoBody}>
                  Create or upload an invoice using the '+' button. Once added the invoice will be staged pending confirmation of payment and reconciliation with your bank account. Invoices are immediately added to your financial reports and audit ready once paid and reconciled.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setSalesInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.reportingReadySeparator}>
          <View style={styles.reportingReadyLine} />
          <Text style={styles.reportingReadyLabel}>Reporting Ready</Text>
          <View style={styles.reportingReadyLine} />
        </View>

        {salesColumns.map((column, index) => (
          <React.Fragment key={column.title}>
            {(column.title === 'POS Sales' || column.title === 'Sales Invoices') && (
              <View style={styles.reportingReadySeparator}>
                <View style={styles.reportingReadyLine} />
                <Text style={styles.reportingReadyLabel}>Audit Ready</Text>
                <View style={styles.reportingReadyLine} />
              </View>
            )}
            <View style={styles.pipelineCard}>
              <View style={styles.pipelineTitleRow}>
                <Text style={styles.pipelineTitle}>{column.title}</Text>
                <TouchableOpacity activeOpacity={0.6} style={styles.learnMoreButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.learnMoreText}>Learn more</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardList}>
                {(column.transactions || []).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.cardListItem}
                    onPress={() => handleCardPress(item)}
                    activeOpacity={0.7}
                    disabled={!item.originalTransaction}
                  >
                    <View style={styles.cardTextGroup}>
                      <View style={styles.cardTitleRow}>
                        {(item.originalTransaction && (isAuditReady(item.originalTransaction) || isUnreconciled(item.originalTransaction))) && (
                          <View style={styles.auditIconContainer}>
                            {item.originalTransaction && isAuditReady(item.originalTransaction) && (
                              <Ionicons name="shield" size={16} color={GRAYSCALE_SECONDARY} />
                            )}
                            {item.originalTransaction && isUnreconciled(item.originalTransaction) && (
                              <Ionicons name="shield-outline" size={16} color={GRAYSCALE_SECONDARY} style={{ opacity: 0.5 }} />
                            )}
                          </View>
                        )}
                        <Text style={styles.cardTitle}>{item.title}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardAmount}>{item.amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {column.actions.length > 0 && (
                <View style={styles.pipelineActions}>
                  {column.actions.map((action) => {
                    let displayText = action
                    if (action === 'View all') {
                      const fullTransactions = getFullTransactions(column.title)
                      const fullCount = fullTransactions.length
                      if (fullCount > 3) {
                        displayText = `View all (${fullCount})`
                      }
                    }
                    return (
                      <TouchableOpacity
                        key={action}
                        activeOpacity={0.7}
                        style={styles.linkButton}
                        onPress={() => {
                          if (action === 'View all') {
                            handleViewAll(column)
                          }
                        }}
                      >
                        <Text style={styles.linkButtonText}>{displayText}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          </React.Fragment>
        ))}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
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
  dismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dismissIcon: {
    fontSize: 22,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '300',
    lineHeight: 20,
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
    marginBottom: 16,
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
  learnMoreButton: {
    padding: 4,
    marginLeft: 8,
  },
  learnMoreText: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '400',
  },
  cardList: {
    gap: 8,
  },
  cardListItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    color: '#000000',
    flex: 1,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
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
})

