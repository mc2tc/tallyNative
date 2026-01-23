// Statements screen - has horizontal nav with Bank, Credit Cards
// Extracted from TransactionsScaffoldScreen

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, reconciliationApi, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import { bankAccountsApi, type BankAccount } from '../lib/api/bankAccounts'
import { creditCardsApi, type CreditCard } from '../lib/api/creditCards'
import {
  truncateTitle,
  isBankTransaction,
  isCreditCardTransaction,
  hasAccountingEntries,
  isCreditToAccount,
  isAuditReady,
  isUnreconciled,
  type TransactionStub,
} from '../lib/utils/transactionHelpers'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type StatementsTab = 'bank' | 'cards'

type PipelineColumn = {
  title: string
  actions: string[]
  transactions?: Array<TransactionStub & { originalTransaction?: Transaction }>
}

// Helper function to extract last 4 digits from account/card number
function getLastFour(number: string): string {
  const digits = number.replace(/\D/g, '')
  return digits.slice(-4) || ''
}

export default function TransactionsStatementsScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [activeTab, setActiveTab] = useState<StatementsTab>('bank')
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [transactions3BankPending, setTransactions3BankPending] = useState<Transaction[]>([])
  const [transactions3BankSourceOfTruth, setTransactions3BankSourceOfTruth] = useState<Transaction[]>([])
  const [transactions3CardPending, setTransactions3CardPending] = useState<Transaction[]>([])
  const [transactions3CardSourceOfTruth, setTransactions3CardSourceOfTruth] = useState<Transaction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [bankInfoCardDismissed, setBankInfoCardDismissed] = useState(false)
  const [cardsInfoCardDismissed, setCardsInfoCardDismissed] = useState(false)

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
          
          if (accounts.length > 0 && !selectedBankAccount) {
            setSelectedBankAccount(accounts[0].accountNumber)
          }
          if (cards.length > 0 && !selectedCard) {
            setSelectedCard(cards[0].cardNumber)
          }
        } catch (error) {
          console.error('Failed to fetch accounts/cards:', error)
        }
      }

      fetchAccountsAndCards()
    }, [businessId, selectedBankAccount, selectedCard])
  )

  const fetchStatementsData = useCallback(async () => {
    if (!businessId) return

    try {
      if (activeTab === 'bank') {
        const [pendingResponse, verifiedResponse] = await Promise.all([
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry',
            status: 'verification:unverified',
          }),
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'statement_entry',
            status: 'verification:verified',
          }),
        ])
        setTransactions3BankPending(pendingResponse.transactions || [])
        setTransactions3BankSourceOfTruth(verifiedResponse.transactions || [])
      } else {
        const [pendingResponse, verifiedResponse] = await Promise.all([
          transactions2Api.getTransactions3(businessId, 'pending', {
            page: 1,
            limit: 200,
            kind: 'statement_entry',
            status: 'verification:unverified',
          }),
          transactions2Api.getTransactions3(businessId, 'source_of_truth', {
            page: 1,
            limit: 200,
            kind: 'statement_entry',
            status: 'verification:verified',
          }),
        ])
        setTransactions3CardPending(pendingResponse.transactions || [])
        setTransactions3CardSourceOfTruth(verifiedResponse.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch statements data:', error)
    }
  }, [businessId, activeTab])

  useFocusEffect(
    useCallback(() => {
      fetchStatementsData()
    }, [fetchStatementsData])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStatementsData()
    setRefreshing(false)
  }, [fetchStatementsData])

  const handleReconcileClick = async () => {
    if (!businessId) return

    try {
      setReconciling(true)
      const response =
        activeTab === 'bank'
          ? await reconciliationApi.reconcileBank(businessId)
          : await reconciliationApi.reconcileCreditCard(businessId)

      if (response.matched > 0) {
        const sectionName = activeTab === 'bank' ? 'bank' : 'credit card'
        Alert.alert(
          'Reconciliation Complete',
          `${response.matched} ${response.matched === 1 ? 'transaction has' : 'transactions have'} been successfully matched.`,
          [{ text: 'OK' }]
        )
        await fetchStatementsData()
      } else {
        Alert.alert('No Matches Found', 'No transactions were matched during reconciliation.', [{ text: 'OK' }])
      }
    } catch (error) {
      console.error('Failed to reconcile transactions:', error)
      Alert.alert('Reconciliation Failed', error instanceof Error ? error.message : 'An error occurred during reconciliation.')
    } finally {
      setReconciling(false)
    }
  }

  // Bank transactions
  const bankNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3BankPending
      .filter((tx) => {
        if (!isBankTransaction(tx)) return false
        return hasAccountingEntries(tx)
      })
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))
      .sort((a, b) => {
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)

  const bankNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3BankPending
      .filter((tx) => {
        if (!isBankTransaction(tx)) return false
        return !hasAccountingEntries(tx)
      })
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))
      .sort((a, b) => {
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)

  const confirmedUnreconcilableBank: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3BankSourceOfTruth
      .filter((tx) => {
        if (!isBankTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        const isUnreconciled = metadata.reconciliation?.status === 'unreconciled'
        return isVerified && isUnreconciled
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName || tx.summary.description || 'Unknown'),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))

  const recentReportingReadyBank: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3BankSourceOfTruth
      .filter((tx) => {
        if (!isBankTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        const isReconciled =
          metadata.reconciliation?.status === 'matched' ||
          metadata.reconciliation?.status === 'reconciled' ||
          metadata.reconciliation?.status === 'exception' ||
          metadata.reconciliation?.status === 'not_required'
        const isUnreconciled = metadata.reconciliation?.status === 'unreconciled'
        const hasEntries = hasAccountingEntries(tx)
        return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
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
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))

  // Card transactions
  const cardNeedsVerificationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3CardPending
      .filter((tx) => {
        if (!isCreditCardTransaction(tx)) return false
        return hasAccountingEntries(tx)
      })
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))
      .sort((a, b) => {
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)

  const cardNeedsReconciliationTransactions: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3CardPending
      .filter((tx) => {
        if (!isCreditCardTransaction(tx)) return false
        return !hasAccountingEntries(tx)
      })
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))
      .sort((a, b) => {
        const aDate = a.originalTransaction.summary.transactionDate || 0
        const bDate = b.originalTransaction.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)

  const confirmedUnreconcilableCard: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3CardSourceOfTruth
      .filter((tx) => {
        if (!isCreditCardTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        const isUnreconciled = metadata.reconciliation?.status === 'unreconciled'
        return isVerified && isUnreconciled
      })
      .sort((a, b) => {
        const aDate = a.summary.transactionDate || 0
        const bDate = b.summary.transactionDate || 0
        return bDate - aDate
      })
      .slice(0, 3)
      .map((tx) => ({
        id: tx.id,
        title: truncateTitle(tx.summary.thirdPartyName || tx.summary.description || 'Unknown'),
        amount: formatAmount(tx.summary.totalAmount, tx.summary.currency, true),
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))

  const recentReportingReadyCards: Array<TransactionStub & { originalTransaction: Transaction }> =
    transactions3CardSourceOfTruth
      .filter((tx) => {
        if (!isCreditCardTransaction(tx)) return false
        const metadata = tx.metadata as {
          verification?: { status?: string }
          reconciliation?: { status?: string }
        }
        const isVerified = metadata.verification?.status === 'verified' || metadata.verification?.status === 'exception'
        const isReconciled =
          metadata.reconciliation?.status === 'matched' ||
          metadata.reconciliation?.status === 'reconciled' ||
          metadata.reconciliation?.status === 'exception' ||
          metadata.reconciliation?.status === 'not_required'
        const isUnreconciled = metadata.reconciliation?.status === 'unreconciled'
        const hasEntries = hasAccountingEntries(tx)
        return !isUnreconciled && (isReconciled || (isVerified && hasEntries))
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
        isCredit: isCreditToAccount(tx),
        originalTransaction: tx,
      }))

  const bankColumns: PipelineColumn[] = [
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

  const cardsColumns: PipelineColumn[] = [
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

  const handleAddClick = () => {
    const context = {
      pipelineSection: activeTab,
      ...(activeTab === 'bank' && selectedBankAccount && { bankAccountId: selectedBankAccount }),
      ...(activeTab === 'cards' && selectedCard && { cardId: selectedCard }),
    }
    navigation.navigate('AddTransaction', { context })
  }

  const handleCardPress = (item: TransactionStub & { originalTransaction?: Transaction }) => {
    if (item.originalTransaction) {
      navigation.navigate('TransactionDetail', { transaction: item.originalTransaction })
    }
  }

  const columns = activeTab === 'bank' ? bankColumns : cardsColumns

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
        <View style={styles.sectionNavWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNav}
          >
            {(['bank', 'cards'] as StatementsTab[]).map((tab) => {
              const isActive = tab === activeTab
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.navButton, isActive && styles.navButtonActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                    {tab === 'bank' ? 'Bank' : 'Credit Cards'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {activeTab === 'bank' && bankAccounts.length > 0 && (
          <View style={styles.accountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountNav}
            >
              {bankAccounts.map((account) => {
                const isActive = selectedBankAccount === account.accountNumber
                const lastFour = getLastFour(account.accountNumber)
                return (
                  <TouchableOpacity
                    key={account.accountNumber}
                    style={[styles.accountButton, isActive && styles.accountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedBankAccount(account.accountNumber)}
                  >
                    <Text style={[styles.accountText, isActive && styles.accountTextActive]}>
                      ..{lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {activeTab === 'bank' && !bankInfoCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding your Bank pipeline</Text>
                <Text style={styles.infoBody}>
                  When bank transactions come in, Tally's rules automatically handle transactions that don't need matching—like bank fees and recurring payments. Check that these look right and confirm—they immediately show up in your financial reports. For other transactions, use the reconcile button to match them with your purchase receipts. If you click on a transaction and confirm it couldn't be matched (no receipt or evidence), it's marked as such and appears in your reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setBankInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'cards' && creditCards.length > 0 && (
          <View style={styles.accountNavWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountNav}
            >
              {creditCards.map((card) => {
                const isActive = selectedCard === card.cardNumber
                const lastFour = getLastFour(card.cardNumber)
                return (
                  <TouchableOpacity
                    key={card.cardNumber}
                    style={[styles.accountButton, isActive && styles.accountButtonActive]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCard(card.cardNumber)}
                  >
                    <Text style={[styles.accountText, isActive && styles.accountTextActive]}>
                      ..{lastFour}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {activeTab === 'cards' && !cardsInfoCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding your Credit Cards pipeline</Text>
                <Text style={styles.infoBody}>
                  When credit card transactions come in, Tally's rules automatically handle transactions that don't need matching—like fees and recurring payments. Check that these look right and confirm—they immediately show up in your financial reports. For other transactions, use the reconcile button to match them with your purchase receipts. If you click on a transaction and confirm it couldn't be matched (no receipt or evidence), it's marked as such and appears in your reports.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setCardsInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {columns.map((column, index) => (
          <React.Fragment key={column.title}>
            {index === 1 && (
              <View style={styles.reportingReadySeparator}>
                <View style={styles.reportingReadyLine} />
                <Text style={styles.reportingReadyLabel}>Reporting Ready</Text>
                <View style={styles.reportingReadyLine} />
              </View>
            )}
            {column.title === 'All done' && (
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
                      {item.isCredit && (
                        <Text style={styles.creditLabel}>credit</Text>
                      )}
                    </View>
                    <Text style={styles.cardAmount}>{item.amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {column.actions.length > 0 || column.title === 'Needs matching' ? (
                <View style={styles.pipelineActions}>
                  {column.actions.map((action) => (
                    <TouchableOpacity
                      key={action}
                      activeOpacity={0.7}
                      style={styles.linkButton}
                      onPress={() => {
                        if (action === 'View all') {
                          // TODO: Implement view all
                        }
                        if (action === '+ Add rules') {
                          if (activeTab === 'bank') {
                            navigation.navigate('BankStatementRules')
                          } else {
                            navigation.navigate('CreditCardRuleCreate')
                          }
                        }
                      }}
                    >
                      <Text style={styles.linkButtonText}>{action}</Text>
                    </TouchableOpacity>
                  ))}
                  {column.title === 'Needs matching' && (
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
  sectionNavWrapper: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  sectionNav: {
    flexDirection: 'row',
    gap: 8,
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
    borderColor: GRAYSCALE_PRIMARY,
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
  accountNavWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  accountNav: {
    flexDirection: 'row',
    gap: 8,
  },
  accountButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  accountButtonActive: {
    borderBottomWidth: 1,
    borderBottomColor: GRAYSCALE_PRIMARY,
  },
  accountText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  accountTextActive: {
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
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
  creditLabel: {
    marginTop: 2,
    fontSize: 10,
    color: GRAYSCALE_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '500',
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
})

