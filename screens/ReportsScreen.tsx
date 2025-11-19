// Reports tab with real-time summary values

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ReportsStackParamList } from '../navigation/ReportsNavigator'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
} from '../lib/api/chartAccounts'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'

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

  const { netProfit, netCashFlow, totalAssets } = useMemo(() => {
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

    // Calculate total assets
    const assetAccounts = accounts.filter((acc) => acc.type === 'asset')
    const totalAssets = assetAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)

    return { netProfit, netCashFlow, totalAssets }
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
                <Text style={styles.cardMetric}>{getCardMetric(card.key)}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  contentContainer: {
    padding: 24,
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
    fontSize: 18,
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


