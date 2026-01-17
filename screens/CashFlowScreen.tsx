import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import Svg, { Rect } from 'react-native-svg'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { healthScoreApi } from '../lib/api/transactions2'
import { getCurrencySymbol } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'

type PeriodData = {
  label: string
  value: number
  startDate: number
  endDate: number
}

export default function CashFlowScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'CashFlow'>>()
  const healthScore = route.params?.healthScore
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cashFlowData, setCashFlowData] = useState<PeriodData[]>([])
  const [currentCashFlow, setCurrentCashFlow] = useState(0)
  const [previousCashFlow, setPreviousCashFlow] = useState(0)
  const [currency, setCurrency] = useState<string>('GBP')

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const score = healthScore?.kpiScores.cashFlow ?? 0
  const rawValue = healthScore?.rawMetrics.cashCoverageRatio ?? 0
  const timeframe = healthScore?.timeframe ?? 'week'

  // Fetch period cash flow data from backend
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

        // Convert backend period data to frontend format
        // Use cashFlow values (actual cash movements, not profit)
        const periodCashFlows: PeriodData[] = periodData.periods.map((period) => ({
          label: period.label,
          value: period.cashFlow ?? period.profit, // Fallback to profit if cashFlow not available
          startDate: period.startDate,
          endDate: period.endDate,
        }))

        setCashFlowData(periodCashFlows)
        setCurrentCashFlow(periodData.currentPeriod.cashFlow ?? periodData.currentPeriod.profit)
        setPreviousCashFlow(periodData.previousPeriod.cashFlow ?? periodData.previousPeriod.profit)
      } catch (err) {
        console.error('[CashFlowScreen] Failed to fetch period data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch period data')
      } finally {
        setLoading(false)
      }
    }

    fetchPeriodData()
  }, [businessId, timeframe])

  const maxValue = cashFlowData.length > 0
    ? Math.max(...cashFlowData.map(d => Math.abs(d.value)), 1)
    : 1

  return (
    <AppBarLayout title="Cash Flow" onBackPress={handleGoBack}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Cash Flow</Text>
              
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {cashFlowData[0]?.label || (timeframe === 'week' 
                      ? (healthScore?.usesRollingAverage ? 'Last 28 days' : 'Last 7 days')
                      : (timeframe === 'month' ? 'Last 30 days' : 'Last 90 days'))}
                  </Text>
                  <Text style={styles.detailValue}>
                    {currentCashFlow >= 0 ? '+' : '-'}{getCurrencySymbol(currency)}{Math.abs(currentCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{cashFlowData[1]?.label || 'Previous Period'}</Text>
                  <Text style={styles.detailValue}>
                    {previousCashFlow >= 0 ? '+' : '-'}{getCurrencySymbol(currency)}{Math.abs(previousCashFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cash Coverage Ratio</Text>
                  <Text style={styles.detailValue}>{(rawValue * 100).toFixed(0)}%</Text>
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
              <Text style={styles.title}>Cash Flow Over Time</Text>
              {cashFlowData.length > 0 ? (
                <CashFlowBarChart data={cashFlowData} maxValue={maxValue} currency={currency} />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No cash flow data available</Text>
                </View>
              )}
            </View>
          </>
          )}
        </ScrollView>
      )}
    </AppBarLayout>
  )
}

// Simple bar chart component
function CashFlowBarChart({ data, maxValue, currency }: { data: PeriodData[]; maxValue: number; currency: string }) {
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
