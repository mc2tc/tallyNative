import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'

export default function ProfitLossReportScreen() {
  const navigation = useNavigation()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<ChartAccountsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    let isActive = true

    if (!businessId) {
      setData(null)
      setError('Select a business to view chart accounts.')
      return
    }

    const fetchChartAccounts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await chartAccountsApi.getRawAccounts(businessId, {
          withValues: true,
        })
        const normalizedAccounts =
          (response.accounts ?? [])
            .map((account) => {
              if (!account) return null
              if (typeof account === 'string') {
                return { name: account }
              }
              if (typeof account === 'object' && typeof account.name === 'string') {
                return account as ChartAccount
              }
              return null
            })
            .filter((account): account is ChartAccount => account !== null) ?? []
        const filteredAccounts = normalizedAccounts.filter(
          (account) => account.type === 'expense' || account.type === 'income',
        )

        const filteredResponse: ChartAccountsResponse = {
          ...response,
          accounts: filteredAccounts,
        }

        if (!isActive) return
        setData(filteredResponse)
      } catch (err) {
        if (!isActive) return
        const message = err instanceof Error ? err.message : 'Failed to load chart accounts.'
        setError(message)
        setData(null)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchChartAccounts()

    return () => {
      isActive = false
    }
  }, [businessId])

  const { incomeAccounts, expenseAccounts, totalIncome, totalExpenses, netProfit } =
    useMemo(() => {
      const income: ChartAccount[] = []
      const expense: ChartAccount[] = []

      for (const account of data?.accounts ?? []) {
        if (!account || typeof account !== 'object') continue
        if (account.type === 'income') {
          income.push(account)
        } else if (account.type === 'expense') {
          expense.push(account)
        }
      }

      const totalIncome = income.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
      const totalExpenses = expense.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
      const netProfit = totalIncome - totalExpenses

      return {
        incomeAccounts: income,
        expenseAccounts: expense,
        totalIncome,
        totalExpenses,
        netProfit,
      }
    }, [data])

  const hasAccounts = incomeAccounts.length > 0 || expenseAccounts.length > 0
  const hasValues = data?.period !== undefined

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#4a4a4a" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!businessId && (
          <Text style={styles.statusText}>No business context found for this account.</Text>
        )}
        {businessId && loading && (
          <View style={styles.loader}>
            <ActivityIndicator color="#444" />
            <Text style={styles.statusText}>Loading chart accounts…</Text>
          </View>
        )}
        {businessId && !loading && error && <Text style={styles.errorText}>{error}</Text>}
        {businessId && !loading && !error && (
          <>
            {!hasAccounts && (
              <Text style={styles.statusText}>No income or expense accounts available yet.</Text>
            )}

            {hasAccounts && (
              <View style={styles.statementCard}>
                <Text style={styles.cardTitle}>Profit & Loss</Text>
                {hasValues && data.period && (
                  <Text style={styles.periodText}>
                    {new Date(data.period.startDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    -{' '}
                    {new Date(data.period.endDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Income</Text>
                  {incomeAccounts.map((account) => (
                    <View key={`${account.id ?? account.name}-income`} style={styles.accountRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </View>
                  ))}
                  {incomeAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No income accounts yet</Text>
                  )}
                  {hasValues && incomeAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Income</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalIncome, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.sectionDivider} />

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Expenses</Text>
                  {expenseAccounts.map((account) => (
                    <View key={`${account.id ?? account.name}-expense`} style={styles.accountRow}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountValue}>
                        {hasValues && account.value !== undefined
                          ? formatAmount(account.value, 'GBP', true)
                          : '—'}
                      </Text>
                    </View>
                  ))}
                  {expenseAccounts.length === 0 && (
                    <Text style={styles.emptyHint}>No expense accounts yet</Text>
                  )}
                  {hasValues && expenseAccounts.length > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Expenses</Text>
                      <Text style={styles.totalValue}>
                        £{formatAmount(totalExpenses, 'GBP', true)}
                      </Text>
                    </View>
                  )}
                </View>

                {hasValues && (
                  <>
                    <View style={styles.sectionDivider} />
                    <View style={styles.netProfitRow}>
                      <Text style={styles.netProfitLabel}>Net Profit</Text>
                      <Text
                        style={[
                          styles.netProfitValue,
                          netProfit < 0 && styles.netProfitValueNegative,
                        ]}
                      >
                        £{formatAmount(Math.abs(netProfit), 'GBP', true)}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  statusText: {
    fontSize: 15,
    color: '#555555',
    marginTop: 12,
  },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  errorText: {
    color: '#b00020',
    fontSize: 14,
    marginTop: 12,
  },
  statementCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    padding: 20,
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  accountName: {
    fontSize: 15,
    color: '#1f1f1f',
  },
  accountValue: {
    fontSize: 15,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#efefef',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  netProfitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#333333',
  },
  netProfitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  netProfitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  netProfitValueNegative: {
    color: '#b00020',
  },
})


