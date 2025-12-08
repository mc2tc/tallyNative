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

export default function RevenueGrowthScreen() {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'RevenueGrowth'>>()
  const healthScore = route.params?.healthScore
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revenueData, setRevenueData] = useState<PeriodData[]>([])
  const [currentRevenue, setCurrentRevenue] = useState(0)
  const [previousRevenue, setPreviousRevenue] = useState(0)
  const [currency, setCurrency] = useState<string>('GBP')

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const score = healthScore?.kpiScores.revenueGrowth ?? 0
  const growthPercentage = healthScore?.rawMetrics.revenueGrowthPercentage ?? 0
  const timeframe = healthScore?.timeframe ?? 'week'

  // Calculate date ranges for periods
  const getDateRanges = useCallback((timeframe: 'week' | 'month' | 'quarter', numPeriods: number = 4) => {
    const now = new Date()
    const ranges: Array<{ startDate: number; endDate: number; index: number }> = []

    for (let i = 0; i < numPeriods; i++) {
      let startDate: Date
      let endDate: Date

      if (timeframe === 'week') {
        // For week: get the start of the current week (Sunday) and go back
        const currentWeekStart = new Date(now)
        currentWeekStart.setDate(now.getDate() - now.getDay()) // Go to Sunday
        currentWeekStart.setHours(0, 0, 0, 0)

        startDate = new Date(currentWeekStart)
        startDate.setDate(currentWeekStart.getDate() - (i * 7))
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
      } else if (timeframe === 'month') {
        // For month: get the start of the current month and go back
        startDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        endDate.setHours(23, 59, 59, 999)
      } else {
        // For quarter: get the start of the current quarter and go back
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
        console.error('[RevenueGrowthScreen] Failed to fetch business currency:', error)
        // Default to GBP if fetch fails
      }
    }

    fetchCurrency()
  }, [businessId])

  // Fetch revenue data
  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!businessId) {
        setError('Business ID not available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Get date ranges for 4 periods
        const dateRanges = getDateRanges(timeframe, 4)

        // Fetch all sales transactions (we'll need to fetch all and filter by date client-side
        // since the API doesn't support date range filtering directly)
        let allTransactions: Transaction[] = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const response = await transactions2Api.getTransactions3(
            businessId,
            'source_of_truth',
            { page, limit: 100, kind: 'sale' }
          )

          allTransactions = [...allTransactions, ...response.transactions]
          hasMore = response.pagination.hasNextPage
          page++
        }

        // Calculate revenue for each period
        const periodRevenues: PeriodData[] = dateRanges.map((range, index) => {
          const periodTransactions = allTransactions.filter((tx) => {
            const txDate = tx.summary.transactionDate
            return txDate >= range.startDate && txDate <= range.endDate
          })

          const revenue = periodTransactions.reduce((sum, tx) => {
            // For sales, totalAmount is positive revenue
            return sum + (tx.summary.totalAmount || 0)
          }, 0)

          return {
            label: getPeriodLabel(index, timeframe),
            value: revenue,
            startDate: range.startDate,
            endDate: range.endDate,
          }
        })

        setRevenueData(periodRevenues)
        setCurrentRevenue(periodRevenues[0]?.value || 0)
        setPreviousRevenue(periodRevenues[1]?.value || 0)
      } catch (err) {
        console.error('[RevenueGrowthScreen] Failed to fetch revenue data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch revenue data')
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [businessId, timeframe, getDateRanges, getPeriodLabel])

  const maxValue = revenueData.length > 0
    ? Math.max(...revenueData.map(d => d.value), 1) // Ensure at least 1 to avoid division by zero
    : 1

  return (
    <AppBarLayout title="Revenue Growth" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading revenue data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Revenue Growth</Text>
              
              <View style={styles.detailsList}>
                {/* Top line: Revenue data for current and previous timeframe */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</Text>
                  <Text style={styles.detailValue}>
                    {getCurrencySymbol(currency)}{currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{getPreviousTimeframeLabel(timeframe)}</Text>
                  <Text style={styles.detailValue}>
                    {getCurrencySymbol(currency)}{previousRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                
                {/* Second line: Growth percentage */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Growth Percentage</Text>
                  <Text style={styles.detailValue}>
                    {growthPercentage > 0 ? '+' : ''}{growthPercentage.toFixed(1)}%
                  </Text>
                </View>
                
                {/* Third line: Score */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score</Text>
                  <Text style={styles.detailValue}>{Math.round(score)}/100</Text>
                </View>
                
                {/* Uses Rolling Average */}
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
              <Text style={styles.title}>Revenue Over Time</Text>
              {revenueData.length > 0 ? (
                <RevenueBarChart data={revenueData} maxValue={maxValue} currency={currency} />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No revenue data available</Text>
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
function RevenueBarChart({ data, maxValue, currency }: { data: PeriodData[]; maxValue: number; currency: string }) {
  const chartHeight = 150
  const maxBarHeight = chartHeight - 40
  const currencySymbol = getCurrencySymbol(currency)
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBarsContainer}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0
          
          // Format value for display with better precision
          const formatValue = (value: number) => {
            if (value >= 1000000) {
              return `${currencySymbol}${(value / 1000000).toFixed(1)}M`
            } else if (value >= 10000) {
              // For values >= 10k, show as whole thousands
              return `${currencySymbol}${(value / 1000).toFixed(0)}k`
            } else if (value >= 1000) {
              // For values between 1k and 10k, show 1 decimal place for precision
              return `${currencySymbol}${(value / 1000).toFixed(1)}k`
            } else {
              // For values < 1k, show full amount
              return `${currencySymbol}${value.toFixed(0)}`
            }
          }
          
          return (
            <View key={index} style={styles.barColumn}>
              {/* Value label above bar */}
              <Text style={styles.barValueLabel}>
                {formatValue(item.value)}
              </Text>
              {/* Bar container */}
              <View style={styles.barContainer}>
                <Svg width={40} height={chartHeight}>
                  <Rect
                    x={0}
                    y={chartHeight - 40 - barHeight}
                    width={40}
                    height={barHeight}
                    fill="#555555"
                    rx={4}
                  />
                </Svg>
              </View>
              {/* Period label below bar */}
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

