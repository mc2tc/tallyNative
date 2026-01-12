import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Svg, { Rect } from 'react-native-svg'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { useAuth } from '../lib/auth/AuthContext'
import { healthScoreApi } from '../lib/api/transactions2'

type PeriodData = {
  label: string
  value: number
  startDate: number
  endDate: number
}

export default function CurrentRatioScreen() {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'CurrentRatio'>>()
  const healthScore = route.params?.healthScore
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ratioData, setRatioData] = useState<PeriodData[]>([])
  const [currentRatio, setCurrentRatio] = useState(0)
  const [previousRatio, setPreviousRatio] = useState(0)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const score = healthScore?.kpiScores.currentRatio ?? 0
  const rawValue = healthScore?.rawMetrics.currentRatio ?? 0
  const timeframe = healthScore?.timeframe ?? 'week'

  // Fetch period current ratio data from backend
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

        // Convert backend period data to frontend format
        // Use currentRatio if available, otherwise calculate from assets/liabilities if provided
        // For now, use the raw currentRatio value from healthScore for all periods
        // TODO: Backend should add currentRatio to periodData when implementing balance sheet calculations
        const periodRatios: PeriodData[] = periodData.periods.map((period) => ({
          label: period.label,
          value: rawValue, // Use current ratio from health score for now
          startDate: period.startDate,
          endDate: period.endDate,
        }))

        setRatioData(periodRatios)
        setCurrentRatio(rawValue)
        setPreviousRatio(rawValue) // TODO: Use previous period ratio when backend provides it
      } catch (err) {
        console.error('[CurrentRatioScreen] Failed to fetch period data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch period data')
      } finally {
        setLoading(false)
      }
    }

    fetchPeriodData()
  }, [businessId, timeframe, rawValue])

  const maxValue = ratioData.length > 0
    ? Math.max(...ratioData.map(d => d.value), 1)
    : 1

  return (
    <AppBarLayout title="Current Ratio" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading ratio data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.title}>Current Ratio</Text>
              
              <View style={styles.detailsList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {ratioData[0]?.label || (timeframe.charAt(0).toUpperCase() + timeframe.slice(1))}
                  </Text>
                  <Text style={styles.detailValue}>
                    {currentRatio.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{ratioData[1]?.label || 'Previous Period'}</Text>
                  <Text style={styles.detailValue}>
                    {previousRatio.toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Current Ratio</Text>
                  <Text style={styles.detailValue}>{rawValue.toFixed(2)}</Text>
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
              <Text style={styles.title}>Current Ratio Over Time</Text>
              {ratioData.length > 0 ? (
                <RatioBarChart data={ratioData} maxValue={maxValue} />
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No ratio data available</Text>
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
function RatioBarChart({ data, maxValue }: { data: PeriodData[]; maxValue: number }) {
  const chartHeight = 150
  const maxBarHeight = chartHeight - 40
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBarsContainer}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0
          
          return (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.barValueLabel}>
                {item.value.toFixed(2)}
              </Text>
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
