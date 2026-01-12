// Reports tab with real-time summary values

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { ReportsStackParamList } from '../navigation/ReportsNavigator'
import {
  chartAccountsApi,
  type ChartAccount,
  type ChartAccountsResponse,
  type CashflowStatementResponse,
} from '../lib/api/chartAccounts'
import { transactions2Api } from '../lib/api/transactions2'
import { useAuth } from '../lib/auth/AuthContext'
import { formatAmount } from '../lib/utils/currency'
import { AppBarLayout } from '../components/AppBarLayout'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'

type SimpleReportRoute = Exclude<
  keyof ReportsStackParamList,
  'AccountLedger'
>

type ReportCardConfig = {
  key: string
  title: string
  subtitle: string
  route: SimpleReportRoute
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
  useModuleTracking('tax_compliance')
  const navigation = useNavigation<StackNavigationProp<ReportsStackParamList>>()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [data, setData] = useState<ChartAccountsResponse | null>(null)
  const [cashflowData, setCashflowData] = useState<CashflowStatementResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCashflowData = useCallback(async () => {
    if (!businessId) {
      setCashflowData(null)
      return
    }

    try {
      const cashflow = await chartAccountsApi.getCashflowStatement(businessId)
      setCashflowData(cashflow)
    } catch (err) {
      console.error('[ReportsScreen] Failed to load cashflow data:', err)
      setCashflowData(null)
    }
  }, [businessId])

  const fetchData = useCallback(async () => {
    if (!businessId) {
      console.log('[ReportsScreen] No businessId, skipping fetch')
      setData(null)
      return
    }

    try {
      console.log('[ReportsScreen] Fetching chart accounts data for businessId:', businessId)
      
      // Diagnostic: Check if transactions exist in transactions3
      try {
        const transactionsCheck = await transactions2Api.getTransactions3(businessId, 'source_of_truth', {
          page: 1,
          limit: 10,
          status: 'verification:verified',
        })
        console.log('[ReportsScreen] Diagnostic - transactions3 source_of_truth check:', {
          totalTransactions: transactionsCheck.transactions?.length || 0,
          sampleIds: transactionsCheck.transactions?.slice(0, 3).map((t) => t.id) || [],
          sampleWithAccounting: transactionsCheck.transactions?.slice(0, 3).map((t) => ({
            id: t.id,
            thirdPartyName: t.summary.thirdPartyName,
            transactionDate: t.summary.transactionDate,
            hasDebits: !!(t.accounting as any)?.debits?.length,
            hasCredits: !!(t.accounting as any)?.credits?.length,
            debits: (t.accounting as any)?.debits?.map((d: any) => ({ chartName: d.chartName, amount: d.amount })) || [],
            credits: (t.accounting as any)?.credits?.map((c: any) => ({ chartName: c.chartName, amount: c.amount })) || [],
            verificationStatus: (t.metadata as any)?.verification?.status,
            reconciliationStatus: (t.metadata as any)?.reconciliation?.status,
          })) || [],
        })
      } catch (diagErr) {
        console.log('[ReportsScreen] Diagnostic check failed:', diagErr)
      }
      
      setLoading(true)
      const response = await chartAccountsApi.getRawAccounts(businessId, {
        withValues: true,
      })
      console.log('[ReportsScreen] Chart accounts API response:', {
        totalAccounts: response.accounts?.length || 0,
        period: response.period,
        sampleAccounts: response.accounts?.slice(0, 5).map((acc) => {
          if (typeof acc === 'string') return { name: acc, type: 'string' }
          if (typeof acc === 'object' && acc !== null) {
            return {
              name: (acc as ChartAccount).name,
              type: (acc as ChartAccount).type,
              value: (acc as ChartAccount).value,
            }
          }
          return null
        }),
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

      console.log('[ReportsScreen] Normalized accounts:', {
        totalNormalized: normalized.length,
        byType: {
          income: normalized.filter((a) => a.type === 'income').length,
          expense: normalized.filter((a) => a.type === 'expense').length,
          asset: normalized.filter((a) => a.type === 'asset').length,
          liability: normalized.filter((a) => a.type === 'liability').length,
          equity: normalized.filter((a) => a.type === 'equity').length,
        },
      })

      setData({
        ...response,
        accounts: normalized,
      })
    } catch (err) {
      console.error('[ReportsScreen] Failed to load report data:', err)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (!businessId) {
      setData(null)
      setCashflowData(null)
      return
    }

    void fetchData()
    void fetchCashflowData()
  }, [businessId, fetchData, fetchCashflowData])

  const onRefresh = useCallback(async () => {
    if (!businessId) return
    
    setRefreshing(true)
    try {
      await Promise.all([fetchData(), fetchCashflowData()])
    } catch (error) {
      console.error('Failed to refresh report data:', error)
    } finally {
      setRefreshing(false)
    }
  }, [businessId, fetchData, fetchCashflowData])

  const {
    netProfit,
    netCashFlow,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
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

    console.log('[ReportsScreen] Calculating metrics from accounts:', {
      totalAccounts: accounts.length,
      accountsWithValues: accounts.filter((a) => a.value !== undefined && a.value !== null).length,
    })

    // Calculate net profit (income - expenses)
    const incomeAccounts = accounts.filter((acc) => acc.type === 'income')
    const expenseAccounts = accounts.filter((acc) => acc.type === 'expense')
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const netProfit = totalIncome - totalExpenses

    console.log('[ReportsScreen] Calculated metrics:', {
      totalIncome,
      totalExpenses,
      netProfit,
      incomeAccountCount: incomeAccounts.length,
      expenseAccountCount: expenseAccounts.length,
    })

    // Get cash flow from dedicated endpoint (if available)
    const operatingCashFlow = cashflowData?.operating.net ?? null
    const investingCashFlow = cashflowData?.investing.net ?? null
    const financingCashFlow = cashflowData?.financing.net ?? null
    const netCashFlow = cashflowData?.netCashFlow ?? null

    // Calculate total assets / liabilities / equity
    const assetAccounts = accounts.filter((acc) => acc.type === 'asset')
    const totalAssets = assetAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const liabilityAccounts = accounts.filter((acc) => acc.type === 'liability')
    const totalLiabilities = liabilityAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const equityAccounts = accounts.filter((acc) => acc.type === 'equity')
    // Include net profit in equity (retained earnings)
    const baseEquity = equityAccounts.reduce((sum, acc) => sum + (acc.value ?? 0), 0)
    const totalEquity = baseEquity + netProfit

    console.log('[ReportsScreen] Final calculated metrics:', {
      netProfit,
      netCashFlow,
      totalAssets,
      totalLiabilities,
      totalEquity,
      assetAccountCount: assetAccounts.length,
      liabilityAccountCount: liabilityAccounts.length,
      equityAccountCount: equityAccounts.length,
    })

    return {
      netProfit,
      netCashFlow,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      totalAssets,
      totalIncome,
      totalExpenses,
      totalLiabilities,
      totalEquity,
    }
  }, [data, cashflowData])

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
    (route: SimpleReportRoute) => {
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
    <AppBarLayout title="REPORTS">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
              {card.key === 'cashflow' && !loading && operatingCashFlow != null && investingCashFlow != null && financingCashFlow != null ? (
                <View style={styles.profitLines}>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Operating</Text>
                    <Text style={styles.profitValue}>{formatMetric(operatingCashFlow)}</Text>
                  </View>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Investing</Text>
                    <Text style={styles.profitValue}>{formatMetric(investingCashFlow)}</Text>
                  </View>
                  <View style={styles.profitLineRow}>
                    <Text style={styles.profitLabel}>Financing</Text>
                    <Text style={styles.profitValue}>{formatMetric(financingCashFlow)}</Text>
                  </View>
                  <View style={[styles.profitLineRow, styles.profitEmphasisRow]}>
                    <Text style={styles.profitLabel}>Net cash flow</Text>
                    <Text style={styles.profitValue}>{formatMetric(netCashFlow)}</Text>
                  </View>
                </View>
              ) : card.key === 'profitLoss' && !loading && totalIncome != null && totalExpenses != null ? (
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


