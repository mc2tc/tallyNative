// Reports tab with real-time summary values

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { ReportsStackParamList } from '../navigation/ReportsNavigator'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'
import { AppBarLayout } from '../components/AppBarLayout'

type ReportCardConfig = {
  key: string
  title: string
  subtitle: string
  route: keyof ReportsStackParamList
}

const reportCards: ReportCardConfig[] = [
  {
    key: 'cashflow',
    title: 'Cashflow',
    subtitle: 'Net cash flow',
    route: 'CashflowReport',
  },
  {
    key: 'profitLoss',
    title: 'Profit & Loss',
    subtitle: 'Net profit',
    route: 'ProfitLossReport',
  },
  {
    key: 'balanceSheet',
    title: 'Balance Sheet',
    subtitle: 'Total assets',
    route: 'BalanceSheetReport',
  },
]

export default function ReportsScreen() {
  const navigation = useNavigation<StackNavigationProp<ReportsStackParamList>>()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<ChartAccountsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isActive = true

    if (!businessId) {
      setData(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await chartAccountsApi.getRawAccounts(businessId, {
          withValues: true,
        })
        const normalized =
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

        if (!isActive) return
        setData({
          ...response,
          accounts: normalized,
        })
      } catch (err) {
        if (!isActive) return
        console.error('Failed to load report data:', err)
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      isActive = false
    }
  }, [businessId])

  const {
    netProfit,
    netCashFlow,
    totalAssets,
    totalIncome,
    totalExpenses,
    totalLiabilities,
    totalEquity,
  } = useMemo(() => {
    const rawAccounts = data?.accounts ?? []
    // Filter to only ChartAccount objects (exclude strings and null/undefined)
    const accounts = rawAccounts.filter(
      (acc): acc is ChartAccount => acc !== null && typeof acc === 'object' && 'name' in acc,
    )

    // Calculate net profit (income - expenses)
    const incomeAccounts = accounts.filter((acc) => acc.type === 'income')
    const expenseAccounts = accounts.filter((acc) => acc.type === 'expense')
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const netProfit = totalIncome - totalExpenses

    // Calculate net cash flow (sum of all cashflow activities)
    const classifyCashflow = (account: ChartAccount) => {
      const candidateRaw =
        (typeof account.cashflowCategory === 'string' && account.cashflowCategory) ||
        (typeof account.activity === 'string' && account.activity) ||
        (typeof account.category === 'string' && account.category) ||
        account.type ||
        ''
      return candidateRaw.toLowerCase()
    }
    const allCashflowAccounts = accounts.filter((acc) => {
      const candidate = classifyCashflow(acc)
      return candidate.includes('operat') || candidate.includes('invest') || candidate.includes('financ')
    })
    const netCashFlow = allCashflowAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)

    // Calculate total assets / liabilities / equity
    const assetAccounts = accounts.filter((acc) => acc.type === 'asset')
    const totalAssets = assetAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const liabilityAccounts = accounts.filter((acc) => acc.type === 'liability')
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const equityAccounts = accounts.filter((acc) => acc.type === 'equity')
    // Include net profit in equity (retained earnings)
    const baseEquity = equityAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalEquity = baseEquity + netProfit

    return {
      netProfit,
      netCashFlow,
      totalAssets,
      totalIncome,
      totalExpenses,
      totalLiabilities,
      totalEquity,
    }
  }, [data])

  const formatMetric = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    const formatted = formatAmount(Math.abs(value), 'GBP', true)
    const sign = value >= 0 ? '+' : '−'
    return `${sign}£${formatted}`
  }

  const formatSimpleMetric = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    return `£${formatAmount(value, 'GBP', true)}`
  }

  const handleNavigate = useCallback(
    (route: keyof ReportsStackParamList) => {
      navigation.navigate(route)
    },
    [navigation],
  )

  const getCardMetric = (key: string): string => {
    if (loading) return '...'
    switch (key) {
      case 'cashflow':
        return formatMetric(netCashFlow)
      case 'profitLoss':
        return formatMetric(netProfit)
      case 'balanceSheet':
        return formatSimpleMetric(totalAssets)
      default:
        return '—'
    }
  }

  const getCardHeadline = (key: string): string => {
    if (loading) return ''
    switch (key) {
      case 'cashflow': {
        if (netCashFlow === null || netCashFlow === undefined) return ''
        const direction = netCashFlow >= 0 ? 'inflow' : 'outflow'
        return `Net cash ${direction} across all activities.`
      }
      default:
        return ''
    }
  }

  return (
    <AppBarLayout title="Reports">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator color="#444" size="small" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        )}
        <View style={styles.cardsGrid}>
          {reportCards.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={styles.card}
              onPress={() => handleNavigate(card.route)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </View>
              {card.key === 'profitLoss' && !loading && totalIncome != null && totalExpenses != null ? (
                <View style={styles.profitLines}>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Income</Text>
                    <Text style={styles.profitValue}>{formatSimpleMetric(totalIncome)}</Text>
                  </View>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Expenses</Text>
                    <Text style={styles.profitValue}>
                      {formatSimpleMetric(Math.abs(totalExpenses))}
                    </Text>
                  </View>
                  <View style={[styles.profitLineRow, styles.profitEmphasisRow]}>
                    <Text style={styles.profitLabel}>Net profit</Text>
                    <Text style={styles.profitValue}>{formatMetric(netProfit)}</Text>
                  </View>
                </View>
              ) : card.key === 'balanceSheet' && !loading && totalAssets != null ? (
                <View style={styles.profitLines}>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Assets</Text>
                    <Text style={styles.profitValue}>{formatSimpleMetric(totalAssets)}</Text>
                  </View>
                  {totalLiabilities != null && (
                    <View style={styles.profitLineRow}>
                      <Text style={styles.profitLabel}>Liabilities</Text>
                      <Text style={styles.profitValue}>
                        {formatSimpleMetric(Math.abs(totalLiabilities))}
                      </Text>
                    </View>
                  )}
                  {totalEquity != null && (
                    <View style={styles.profitLineRow}>
                      <Text style={styles.profitLabel}>Equity</Text>
                      <Text style={styles.profitValue}>
                        {formatSimpleMetric(totalEquity)}
                      </Text>
                    </View>
                  )}
                  {totalLiabilities != null && totalEquity != null && (
                    <View style={[styles.profitLineRow, styles.profitEmphasisRow]}>
                      <Text style={styles.profitLabel}>Liabilities + equity</Text>
                      <Text style={styles.profitValue}>
                        {formatSimpleMetric(totalLiabilities + totalEquity)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : getCardHeadline(card.key) ? (
                <Text style={styles.cardHeadline}>{getCardHeadline(card.key)}</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardsGrid: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  cardMetric: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 6,
  },
  cardHeadline: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  profitLines: {
    marginTop: 8,
  },
  profitLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  profitEmphasisRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  profitLabel: {
    fontSize: 14,
    color: '#666666',
  },
  profitValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
})


