// Purchases screen - shows purchases pipeline columns without horizontal nav
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
  parseTransaction3,
  hasAccountsPayablePayment,
  isCashOnlyTransaction,
  isAuditReady,
  isUnreconciled,
  type TransactionStub,
} from '../lib/utils/transactionHelpers'
import { semanticColors } from '../lib/utils/semanticColors'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type PipelineColumn = {
  title: string
  actions: string[]
  transactions?: Array<TransactionStub & { originalTransaction?: Transaction }>
}

export default function TransactionsPurchasesScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [transactions3Pending, setTransactions3Pending] = useState<Transaction[]>([])
  const [transactions3SourceOfTruth, setTransactions3SourceOfTruth] = useState<Transaction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [purchasesInfoCardDismissed, setPurchasesInfoCardDismissed] = useState(false)

  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const fetchPurchasesData = useCallback(async () => {
    if (!businessId) return

    try {
      const [pendingResponse, bankReconciliationResponse, allVerifiedResponse, reconciledResponse, notRequiredResponse] = await Promise.all([
        transactions2Api.getTransactions3(businessId, 'pending', {
          page: 1,
          limit: 200,
          kind: 'purchase',
          status: 'verification:unverified',
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'purchase',
          status: 'reconciliation:pending_bank_match',
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'purchase',
          status: 'verification:verified',
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'purchase',
          status: 'reconciliation:reconciled',
        }),
        transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 200,
          kind: 'purchase',
          status: 'reconciliation:not_required',
        }),
      ])

      setTransactions3Pending(pendingResponse.transactions || [])
      
      const allSourceOfTruth = [
        ...(bankReconciliationResponse.transactions || []),
        ...(allVerifiedResponse.transactions || []),
        ...(reconciledResponse.transactions || []),
        ...(notRequiredResponse.transactions || []),
      ]
      const uniqueTransactions = allSourceOfTruth.reduce((acc, tx) => {
        const id = tx.id || (tx.metadata as any)?.id
        if (id && !acc.find((existing) => (existing.id || (existing.metadata as any)?.id) === id)) {
          acc.push(tx)
        }
        return acc
      }, [] as Transaction[])
      
      setTransactions3SourceOfTruth(uniqueTransactions)
    } catch (error) {
      console.error('Failed to fetch purchases data:', error)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchPurchasesData()
    }, [fetchPurchasesData])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPurchasesData()
    setRefreshing(false)
  }, [fetchPurchasesData])

  // Categorize transactions3 data for Purchases cards
  const purchasesNeedsVerification: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3Pending
    .filter((tx) => {
      const metadata = tx.metadata as {
        classification?: { kind?: string }
        verification?: { status?: string }
      }
      const isPurchase = metadata.classification?.kind === 'purchase'
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

  const purchasesAccountsPayable: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
    .filter((tx) => {
      const metadata = tx.metadata as {
        verification?: { status?: string }
        reconciliation?: { status?: string }
        classification?: { kind?: string }
      }
      const isPurchase = metadata.classification?.kind === 'purchase'
      const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
      const hasAccountsPayable = hasAccountsPayablePayment(tx)
      const isReconciled =
        metadata.reconciliation?.status === 'matched' ||
        metadata.reconciliation?.status === 'reconciled' ||
        metadata.reconciliation?.status === 'exception'
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

  const purchasesReconcileToBank: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
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
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  const purchasesReconcileToCreditCard: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
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
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  const purchasesAuditReady: Array<TransactionStub & { originalTransaction: Transaction }> = transactions3SourceOfTruth
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
    .map((tx) => parseTransaction3(tx))
    .filter((stub): stub is TransactionStub & { originalTransaction: Transaction } => stub !== null)
    .sort((a, b) => {
      const aDate = a.originalTransaction.summary.transactionDate || 0
      const bDate = b.originalTransaction.summary.transactionDate || 0
      return bDate - aDate
    })
    .slice(0, 3)

  const purchasesColumns: PipelineColumn[] = [
    {
      title: 'Needs verification',
      actions: ['View all'],
      transactions: purchasesNeedsVerification,
    },
    {
      title: 'Unpaid purchases',
      actions: ['View all'],
      transactions: purchasesAccountsPayable,
    },
    {
      title: 'Awaiting bank match',
      actions: ['View all'],
      transactions: purchasesReconcileToBank,
    },
    {
      title: 'Awaiting card match',
      actions: ['View all'],
      transactions: purchasesReconcileToCreditCard,
    },
    {
      title: 'All done',
      actions: ['View all'],
      transactions: purchasesAuditReady,
    },
  ]

  const getFullTransactions = (columnTitle: string): Array<TransactionStub & { originalTransaction?: Transaction }> => {
    switch (columnTitle) {
      case 'Needs verification':
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
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'Unpaid purchases':
        return transactions3SourceOfTruth
          .filter((tx) => {
            const metadata = tx.metadata as {
              verification?: { status?: string }
              reconciliation?: { status?: string }
              classification?: { kind?: string }
            }
            const isPurchase = metadata.classification?.kind === 'purchase'
            const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
            const hasAccountsPayable = hasAccountsPayablePayment(tx)
            const isReconciled =
              metadata.reconciliation?.status === 'matched' ||
              metadata.reconciliation?.status === 'reconciled' ||
              metadata.reconciliation?.status === 'exception'
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
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'Awaiting bank match':
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
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'Awaiting card match':
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
            title: truncateTitle(tx.summary.thirdPartyName),
            amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
            originalTransaction: tx,
          }))
      case 'All done':
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
      pipelineSection: 'purchases3',
    })
  }

  const handleAddClick = () => {
    navigation.navigate('AddTransaction', { context: { pipelineSection: 'purchases3' } })
  }

  const handleCardPress = (item: TransactionStub & { originalTransaction?: Transaction }) => {
    if (item.originalTransaction) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }

  /**
   * Get subtle background color for pipeline card based on transaction state
   * - Needs verification → Subtle red tint
   * - Reporting Ready (Unpaid purchases, Awaiting matches) → Subtle yellow tint
   * - Audit Ready (All done) → Subtle green tint
   */
  const getCardBackgroundColor = (cardTitle: string): string => {
    // Needs verification state - subtle red tint
    if (cardTitle === 'Needs verification') {
      return '#fdf0f0' // Medium-light red/pink
    }
    // Reporting Ready state (verified but not yet audit ready) - subtle yellow tint
    if (cardTitle === 'Unpaid purchases' || 
        cardTitle === 'Awaiting bank match' || 
        cardTitle === 'Awaiting card match') {
      return '#fffbf0' // Medium-light yellow
    }
    // Audit Ready state - subtle green tint
    if (cardTitle === 'All done') {
      return '#f0f9f0' // Medium-light green
    }
    // Default background color
    return CARD_BACKGROUND
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
        {!purchasesInfoCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding your Purchases pipeline</Text>
                <Text style={styles.infoBody}>
                  Verify transactions by selecting and confirming payment method and item categorization. If an item is not a business expense-- swipe left to charge it to your personal account.
                  Transactions requiring reconcilation will be staged, but note that all verified transactions will appear in your financial reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setPurchasesInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.infoLearnMoreButton}
              onPress={() => {
                // TODO: Add learn more functionality
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.infoLearnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
        )}

        {purchasesColumns.map((column, index) => (
          <React.Fragment key={column.title}>
            {column.title === 'Needs verification' && (
              <View style={styles.reportingReadySeparator}>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.veryPoor }]} />
                <Text style={[styles.reportingReadyLabel, { color: semanticColors.veryPoor }]}>Verify</Text>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.veryPoor }]} />
              </View>
            )}
            {column.title === 'All done' && (
              <View style={styles.reportingReadySeparator}>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.veryGood }]} />
                <Text style={[styles.reportingReadyLabel, { color: semanticColors.veryGood }]}>Verified & Reconciled</Text>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.veryGood }]} />
              </View>
            )}
            <View style={styles.pipelineCard}>
              <View style={styles.pipelineTitleRow}>
                <Text style={styles.pipelineTitle}>
                  {column.title.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                </Text>
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
            {column.title === 'Needs verification' && (
              <View style={styles.reportingReadySeparator}>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.average }]} />
                <Text style={[styles.reportingReadyLabel, { color: semanticColors.average }]}>Reconcile</Text>
                <View style={[styles.reportingReadyLine, { borderColor: semanticColors.average }]} />
              </View>
            )}
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
    paddingBottom: 48, // Add extra padding at bottom for Learn more button
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    position: 'relative',
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
  infoLearnMoreButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  infoLearnMoreText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  reportingReadySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  reportingReadyLine: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderStyle: 'solid',
    borderColor: '#d0d0d0',
  },
  reportingReadyLabel: {
    marginHorizontal: 8,
    fontSize: 11,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
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
  cardList: {
    gap: 2,
  },
  cardListItem: {
    paddingVertical: 2,
    paddingLeft: 0,
    paddingRight: 12,
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: 'transparent',
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
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
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

