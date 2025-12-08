import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Svg, { Rect } from 'react-native-svg'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { transactions2Api } from '../lib/api/transactions2'
import type { Transaction } from '../lib/api/transactions2'
import { businessContextApi } from '../lib/api/businessContext'
import { getCurrencySymbol } from '../lib/utils/currency'

type PeriodData = {
  label: string
  value: number
  startDate: number
  endDate: number
}

export default function NetProfitScreen() {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'NetProfit'>>()
  const healthScore = route.params?.healthScore
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profitData, setProfitData] = useState<PeriodData[]>([])
  const [currentProfit, setCurrentProfit] = useState(0)
  const [previousProfit, setPreviousProfit] = useState(0)
  const [currency, setCurrency] = useState<string>('GBP')

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const score = healthScore?.kpiScores.netProfit ?? 0
  const rawValue = healthScore?.rawMetrics.netProfitMargin ?? 0
  const timeframe = healthScore?.timeframe ?? 'week'

  // Calculate date ranges for periods
  const getDateRanges = useCallback((timeframe: 'week' | 'month' | 'quarter', numPeriods: number = 4) => {
    const now = new Date()
    const ranges: Array<{ startDate: number; endDate: number; index: number }> = []

    for (let i = 0; i < numPeriods; i++) {
      let startDate: Date
      let endDate: Date

      if (timeframe === 'week') {
        const currentWeekStart = new Date(now)
        currentWeekStart.setDate(now.getDate() - now.getDay())
        currentWeekStart.setHours(0, 0, 0, 0)

        startDate = new Date(currentWeekStart)
        startDate.setDate(currentWeekStart.getDate() - (i * 7))
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
      } else if (timeframe === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        endDate.setHours(23, 59, 59, 999)
      } else {
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const currentYear = now.getFullYear()
        const quarterMonth = currentQuarter * 3

        startDate = new Date(currentYear, quarterMonth - (i * 3), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(currentYear, quarterMonth - (i * 3) + 3, 0)
        endDate.setHours(23, 59, 59, 999)
      }

      ranges.push({
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        index: i,
      })
    }

    return ranges
  }, [])

  // Get period label
  const getPeriodLabel = useCallback((index: number, currentTimeframe: string) => {
    if (index === 0) return currentTimeframe.charAt(0).toUpperCase() + currentTimeframe.slice(1)
    const labels = {
      week: ['Week', 'Week', 'Week'],
      month: ['Month', 'Month', 'Month'],
      quarter: ['Quarter', 'Quarter', 'Quarter'],
    }
    return `${labels[currentTimeframe as keyof typeof labels]?.[index - 1] || 'Period'} -${index}`
  }, [])

  // Calculate previous timeframe label
  const getPreviousTimeframeLabel = (current: string) => {
    if (current === 'week') return 'Previous Week'
    if (current === 'month') return 'Previous Month'
    if (current === 'quarter') return 'Previous Quarter'
    return 'Previous Period'
  }

  // Fetch business currency
  useEffect(() => {
    const fetchCurrency = async () => {
      if (!businessId) return
      
      try {
        const context = await businessContextApi.getContext(businessId)
        if (context.context?.primaryCurrency) {
          setCurrency(context.context.primaryCurrency)
        }
      } catch (error) {
        console.error('[NetProfitScreen] Failed to fetch business currency:', error)
      }
    }

    fetchCurrency()
  }, [businessId])

  // Fetch profit data
  useEffect(() => {
    const fetchProfitData = async () => {
      if (!businessId) {
        setError('Business ID not available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const dateRanges = getDateRanges(timeframe, 4)

        // Fetch all transactions
        let allTransactions: Transaction[] = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const response = await transactions2Api.getTransactions3(
            businessId,
            'source_of_truth',
            { page, limit: 100 }
          )

          allTransactions = [...allTransactions, ...response.transactions]
          hasMore = response.pagination.hasNextPage
          page++
        }

        // Calculate profit for each period
        // Profit = Revenue (sales) - Expenses (purchases)
        const periodProfits: PeriodData[] = dateRanges.map((range, index) => {
          const periodTransactions = allTransactions.filter((tx) => {
            const txDate = tx.summary.transactionDate
            return txDate >= range.startDate && txDate <= range.endDate
          })

          const revenue = periodTransactions
            .filter(tx => (tx.metadata as any)?.classification?.kind === 'sale')
            .reduce((sum, tx) => sum + (tx.summary.totalAmount || 0), 0)

          const expenses = periodTransactions
            .filter(tx => (tx.metadata as any)?.classification?.kind === 'purchase')
            .reduce((sum, tx) => sum + Math.abs(tx.summary.totalAmount || 0), 0)

          const profit = revenue - expenses

          return {
            label: getPeriodLabel(index, timeframe),
            value: profit,
            startDate: range.startDate,
            endDate: range.endDate,
          }
        })

        setProfitData(periodProfits)
        setCurrentProfit(periodProfits[0]?.value || 0)
        setPreviousProfit(periodProfits[1]?.value || 0)
      } catch (err) {
        console.error('[NetProfitScreen] Failed to fetch profit data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profit data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfitData()
  }, [businessId, timeframe, getDateRanges, getPeriodLabel])

  const maxValue = profitData.length > 0
    ? Math.max(...profitData.map(d => Math.abs(d.value)), 1)
    : 1

  return (
    <AppBarLayout title="Net Profit" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading profit data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Net Profit</Text>
              
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</Text>
                  <Text style={styles.detailValue}>
                    {getCurrencySymbol(currency)}{currentProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{getPreviousTimeframeLabel(timeframe)}</Text>
                  <Text style={styles.detailValue}>
                    {getCurrencySymbol(currency)}{previousProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Net Profit Margin</Text>
                  <Text style={styles.detailValue}>
                    {rawValue > 0 ? '+' : ''}{rawValue.toFixed(1)}%
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score</Text>
                  <Text style={styles.detailValue}>{Math.round(score)}/100</Text>
                </View>
                
                {healthScore?.usesRollingAverage !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Uses Rolling Average</Text>
                    <Text style={styles.detailValue}>
                      {healthScore.usesRollingAverage ? 'Yes' : 'No'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Bar Chart Card */}
            <View style={[styles.card, styles.secondCard]}>
              <Text style={styles.title}>Net Profit Over Time</Text>
              {profitData.length > 0 ? (
                <ProfitBarChart data={profitData} maxValue={maxValue} currency={currency} />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No profit data available</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

// Simple bar chart component
function ProfitBarChart({ data, maxValue, currency }: { data: PeriodData[]; maxValue: number; currency: string }) {
  const chartHeight = 150
  const maxBarHeight = chartHeight - 40
  const currencySymbol = getCurrencySymbol(currency)
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBarsContainer}>
        {data.map((item, index) => {
          const absValue = Math.abs(item.value)
          const barHeight = maxValue > 0 ? (absValue / maxValue) * maxBarHeight : 0
          const isPositive = item.value >= 0
          
          const formatValue = (value: number) => {
            const absVal = Math.abs(value)
            if (absVal >= 1000000) {
              return `${isPositive ? '+' : '-'}${currencySymbol}${(absVal / 1000000).toFixed(1)}M`
            } else if (absVal >= 10000) {
              return `${isPositive ? '+' : '-'}${currencySymbol}${(absVal / 1000).toFixed(0)}k`
            } else if (absVal >= 1000) {
              return `${isPositive ? '+' : '-'}${currencySymbol}${(absVal / 1000).toFixed(1)}k`
            } else {
              return `${isPositive ? '+' : '-'}${currencySymbol}${absVal.toFixed(0)}`
            }
          }
          
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.barValueLabel}>
                {formatValue(item.value)}
              </Text>
              <View style={styles.barContainer}>
                <Svg width={40} height={chartHeight}>
                  <Rect
                    x={0}
                    y={chartHeight - 40 - barHeight}
                    width={40}
                    height={barHeight}
                    fill={isPositive ? '#4caf50' : '#f44336'}
                    rx={4}
                  />
                </Svg>
              </View>
              <Text style={styles.barPeriodLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    padding: 20,
  },
  secondCard: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 20,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666666',
  },
  detailValue: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 0,
    minHeight: 180,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    maxWidth: 65,
    paddingHorizontal: 2,
  },
  barValueLabel: {
    fontSize: 10,
    color: '#333333',
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  barContainer: {
    width: 40,
    height: 150,
  },
  barPeriodLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    width: 50,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#cc0000',
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
})
