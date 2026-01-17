// Transaction list screen - full list with date grouping
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { formatAmount } from '../lib/utils/currency'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const DEFAULT_CURRENCY = 'GBP'

type TransactionGroup = {
  date: string
  dateLabel: string
  transactions: Transaction[]
}

export default function TransactionListScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const { businessUser, memberships } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Choose businessId (same logic as TransactionsScreen)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId &&
      !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        // Fetch all transactions (no limit for now, can add pagination later)
        const response = await transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 100, // Reasonable limit for now
        })
        // Sort by transactionDate descending (most recent first)
        const sorted = response.transactions.sort(
          (a, b) => b.summary.transactionDate - a.summary.transactionDate,
        )
        setTransactions(sorted)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        // If endpoint doesn't exist yet (404), show empty state
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [businessId])

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: TransactionGroup[] = []
    const dateMap = new Map<string, Transaction[]>()

    transactions.forEach((tx) => {
      const date = new Date(tx.summary.transactionDate)
      const dateKey = date.toDateString()
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, [])
      }
      dateMap.get(dateKey)!.push(tx)
    })

    // Convert to array and format date labels
    dateMap.forEach((txs, dateKey) => {
      const date = new Date(dateKey)
      const dateLabel = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      groups.push({
        date: dateKey,
        dateLabel,
        transactions: txs,
      })
    })

    // Sort groups by date (most recent first)
    return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions])

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY

  const goToTransactionDetail = useCallback(
    (transaction: Transaction) => {
      navigation.navigate('TransactionDetail', { transaction })
    },
    [navigation],
  )

  const renderTransaction = ({ item: tx }: { item: Transaction }) => {
    const isDefault = isDefaultCurrency(tx.summary.currency)
    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => goToTransactionDetail(tx)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionIcon}>
          <MaterialCommunityIcons name="receipt-text" size={20} color={GRAYSCALE_PRIMARY} />
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
  }

  const renderSection = ({ item: group }: { item: TransactionGroup }) => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{group.dateLabel}</Text>
      {group.transactions.map((tx) => (
        <View key={tx.id}>{renderTransaction({ item: tx })}</View>
      ))}
    </View>
  )

  if (loading) {
    return (
      <AppBarLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
        </View>
      </AppBarLayout>
    )
  }

  if (transactions.length === 0) {
    return (
      <AppBarLayout>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout>
      <FlatList
        data={groupedTransactions}
        renderItem={renderSection}
        keyExtractor={(item) => item.date}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
    marginTop: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f6f6',
  },
  emptyText: {
    fontSize: 16,
    color: GRAYSCALE_PRIMARY,
  },
})

