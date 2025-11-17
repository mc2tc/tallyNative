// Transactions screen - upload receipt and process OCR
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
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
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!businessId) {
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const response = await transactions2Api.getTransactions(businessId, {
          page: 1,
          limit: 3,
        })
        // Sort by transactionDate descending (most recent first)
        const sorted = response.transactions.sort(
          (a, b) => b.summary.transactionDate - a.summary.transactionDate,
        )
        setTransactions(sorted)
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        // If endpoint doesn't exist yet (404), just show empty state
        // Don't set transactions, so the card won't render
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [businessId])

  const goToAddTransaction = useCallback(() => {
    navigation.navigate('AddTransaction')
  }, [navigation])

  const goToAllTransactions = useCallback(() => {
    navigation.navigate('TransactionList')
  }, [navigation])

  const isDefaultCurrency = (currency: string) => currency.toUpperCase() === DEFAULT_CURRENCY

  return (
    <AppBarLayout>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Button
          mode="outlined"
          onPress={goToAddTransaction}
          icon={({ color }) => (
            <MaterialCommunityIcons
              name="receipt-text-plus"
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
              {transactions.map((tx) => {
                const isDefault = isDefaultCurrency(tx.summary.currency)
                return (
                  <View key={tx.id} style={styles.transactionRow}>
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
                  </View>
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

