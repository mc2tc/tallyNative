// Transactions screen - upload receipt and process OCR
import React, { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { Button, Card } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'

const ADD_BUTTON_ICON_SIZE = 28
const GRAYSCALE_PRIMARY = '#4a4a4a'
const DEFAULT_CURRENCY = 'GBP'

export default function TransactionsScreen() {
  const navigation = useNavigation<StackNavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [bankRecords, setBankRecords] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [bankLoading, setBankLoading] = useState(true)
  const hasLoadedRef = useRef(false)
  const bankHasLoadedRef = useRef(false)

  // Choose businessId (same logic as AddTransactionScreen)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId &&
      !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  // Fetch transactions only on first load or if we don't have cached data
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setLoading(false)
        return
      }

      // If we already have transactions cached, don't refetch - just show cached data
      if (hasLoadedRef.current && transactions.length > 0) {
        return
      }

      const fetchTransactions = async () => {
        try {
          setLoading(true)
          const response = await transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 20, // Fetch more to account for filtering
            classificationKind: 'purchase',
          })
          // Filter by classification.kind === "purchase" (client-side fallback)
          const purchaseTransactions = response.transactions.filter((tx) => {
            const classification = tx.metadata.classification as { kind?: string } | undefined
            return classification?.kind === 'purchase'
          })
          // Sort by transactionDate descending (most recent first)
          const sorted = purchaseTransactions.sort(
            (a, b) => b.summary.transactionDate - a.summary.transactionDate,
          )
          // Take the first 3
          setTransactions(sorted.slice(0, 3))
          hasLoadedRef.current = true
        } catch (error) {
          console.error('Failed to fetch transactions:', error)
          // If endpoint doesn't exist yet (404), just show empty state
          // Don't set transactions, so the card won't render
          setTransactions([])
          hasLoadedRef.current = true
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }, [businessId, transactions.length]),
  )

  // Fetch bank records
  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setBankLoading(false)
        return
      }

      // If we already have bank records cached, don't refetch - just show cached data
      if (bankHasLoadedRef.current && bankRecords.length > 0) {
        return
      }

      const fetchBankRecords = async () => {
        try {
          setBankLoading(true)
          const response = await transactions2Api.getTransactions(businessId, {
            page: 1,
            limit: 20, // Fetch more to account for filtering
            classificationKind: 'bank-record',
          })
          // Filter by classification.kind === "bank-record" (client-side fallback)
          const bankRecordTransactions = response.transactions.filter((tx) => {
            const classification = tx.metadata.classification as { kind?: string } | undefined
            return classification?.kind === 'bank-record'
          })
          // Sort by transactionDate descending (most recent first)
          const sorted = bankRecordTransactions.sort(
            (a, b) => b.summary.transactionDate - a.summary.transactionDate,
          )
          // Take the first 3
          setBankRecords(sorted.slice(0, 3))
          bankHasLoadedRef.current = true
        } catch (error) {
          console.error('Failed to fetch bank records:', error)
          // If endpoint doesn't exist yet (404), just show empty state
          setBankRecords([])
          bankHasLoadedRef.current = true
        } finally {
          setBankLoading(false)
        }
      }

      fetchBankRecords()
    }, [businessId, bankRecords.length]),
  )

  const goToAddTransaction = useCallback(() => {
    navigation.navigate('AddTransaction')
  }, [navigation])

  const goToAllTransactions = useCallback(() => {
    navigation.navigate('TransactionList')
  }, [navigation])

  const goToTransactionDetail = useCallback(
    (transaction: Transaction) => {
      navigation.navigate('TransactionDetail', { transaction })
    },
    [navigation],
  )

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY

  return (
    <AppBarLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Button
          mode="outlined"
          onPress={goToAddTransaction}
          icon={({ color }) => (
            <MaterialCommunityIcons
              name="plus"
              size={ADD_BUTTON_ICON_SIZE}
              color={GRAYSCALE_PRIMARY}
            />
          )}
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
          labelStyle={styles.addButtonLabel}
          theme={{
            colors: {
              primary: GRAYSCALE_PRIMARY,
            },
          }}
        >
          Add Transactions
        </Button>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
          </View>
        ) : transactions.length > 0 ? (
          <Card style={styles.transactionsCard}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.cardTitle}>Purchase Receipts</Text>
              {transactions.map((tx) => {
                const isDefault = isDefaultCurrency(tx.summary.currency)
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.transactionRow}
                    onPress={() => goToTransactionDetail(tx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionIcon}>
                      <MaterialCommunityIcons
                        name="receipt-text"
                        size={20}
                        color={GRAYSCALE_PRIMARY}
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.thirdPartyName} numberOfLines={1}>
                        {tx.summary.thirdPartyName}
                      </Text>
                      {!isDefault && (
                        <Text style={styles.foreignCurrency}>
                          {formatAmount(tx.summary.totalAmount, tx.summary.currency, false)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.amount}>
                      {formatAmount(tx.summary.totalAmount, tx.summary.currency, isDefault)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity onPress={goToAllTransactions} style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        ) : null}

        {bankLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
          </View>
        ) : bankRecords.length > 0 ? (
          <Card style={styles.transactionsCard}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.cardTitle}>Bank Records</Text>
              {bankRecords.map((tx) => {
                const isDefault = isDefaultCurrency(tx.summary.currency)
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={styles.transactionRow}
                    onPress={() => goToTransactionDetail(tx)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.transactionIcon}>
                      <MaterialCommunityIcons
                        name="bank"
                        size={20}
                        color={GRAYSCALE_PRIMARY}
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.thirdPartyName} numberOfLines={1}>
                        {tx.summary.thirdPartyName}
                      </Text>
                      {!isDefault && (
                        <Text style={styles.foreignCurrency}>
                          {formatAmount(tx.summary.totalAmount, tx.summary.currency, false)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.amount}>
                      {formatAmount(tx.summary.totalAmount, tx.summary.currency, isDefault)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity onPress={goToAllTransactions} style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  addButton: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  addButtonContent: {
    height: 48,
    justifyContent: 'flex-start',
  },
  addButtonLabel: {
    fontSize: 16,
    marginLeft: 24,
    color: GRAYSCALE_PRIMARY,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  transactionsCard: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 12,
  },
  thirdPartyName: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  foreignCurrency: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  seeAllButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
})

