import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Svg, { Rect } from 'react-native-svg'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { healthScoreApi } from '../lib/api/transactions2'
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

  // Fetch period revenue data from backend
  useEffect(() => {
    const fetchPeriodData = async () => {
      if (!businessId) {
        setError('Business ID not available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch health score with period data
        const response = await healthScoreApi.getHealthScore(businessId, timeframe, true)
        
        if (!response.success || !response.data?.healthScore?.periodData) {
          setError('Period data not available')
          setLoading(false)
          return
        }

        const periodData = response.data.healthScore.periodData

        // Set currency from backend response
        if (periodData.currency) {
          setCurrency(periodData.currency)
        }

        // Convert backend period data to frontend format (using revenue values)
        const periodRevenues: PeriodData[] = periodData.periods.map((period) => ({
          label: period.label,
          value: period.revenue,
          startDate: period.startDate,
          endDate: period.endDate,
        }))

        setRevenueData(periodRevenues)
        setCurrentRevenue(periodData.currentPeriod.revenue)
        setPreviousRevenue(periodData.previousPeriod.revenue)
      } catch (err) {
        console.error('[RevenueGrowthScreen] Failed to fetch period data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch period data')
      } finally {
        setLoading(false)
      }
    }

    fetchPeriodData()
  }, [businessId, timeframe])

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
                  <Text style={styles.detailLabel}>
                    {revenueData[0]?.label || (timeframe === 'week' 
                      ? (healthScore?.usesRollingAverage ? 'Last 28 days' : 'Last 7 days')
                      : (timeframe === 'month' ? 'Last 30 days' : 'Last 90 days'))}
                  </Text>
                  <Text style={styles.detailValue}>
                    {getCurrencySymbol(currency)}{currentRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{revenueData[1]?.label || 'Previous Period'}</Text>
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

