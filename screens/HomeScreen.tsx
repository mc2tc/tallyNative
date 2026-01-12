// Home screen

import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'
import { MetricsCard } from '../components/MetricsCard'
import { MotivationalCard } from '../components/MotivationalCard'
import { KPIDetailCard } from '../components/KPIDetailCard'
import { useAuth } from '../lib/auth/AuthContext'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { healthScoreApi } from '../lib/api/transactions2'
import type { HealthScoreResponse } from '../lib/api/transactions2'

// Helper function to extract and format business name from business ID
// Business ID format: {BusinessName}_{RandomSuffix}
function getBusinessNameFromId(businessId: string | undefined): string {
  if (!businessId) return 'Home'
  
  // Extract the part before the last underscore (business name part)
  const lastUnderscoreIndex = businessId.lastIndexOf('_')
  if (lastUnderscoreIndex === -1) {
    // No underscore found, return the ID as-is or formatted
    return businessId.replace(/([A-Z])/g, ' $1').trim() || 'Home'
  }
  
  const businessNamePart = businessId.substring(0, lastUnderscoreIndex)
  
  // Format: Add spaces before capital letters and handle camelCase
  // Also replace underscores with spaces
  const formatted = businessNamePart
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  
  // Capitalize first letter of each word
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Home'
}

export default function HomeScreen() {
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const [healthScore, setHealthScore] = useState<HealthScoreResponse['data']['healthScore'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter'>('week')

  const fetchHealthScore = useCallback(async (isRefresh = false) => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      const response = await healthScoreApi.getHealthScore(businessId, timeframe)
      if (response.success && response.data?.healthScore) {
        setHealthScore(response.data.healthScore)
      } else {
        setError('Failed to fetch health score')
      }
    } catch (err) {
      console.error(`[HomeScreen] Failed to fetch health score for businessId=${businessId}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to fetch health score')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [businessId, timeframe])

  useEffect(() => {
    fetchHealthScore()
  }, [fetchHealthScore])

  const onRefresh = useCallback(() => {
    fetchHealthScore(true)
  }, [fetchHealthScore])


  // Use real data if available, otherwise use defaults
  const overallScore = healthScore?.overall ?? 0
  const preUnreconciledScore = healthScore?.preUnreconciled ?? 0
  const revenueGrowth = healthScore?.kpiScores.revenueGrowth ?? 0
  const cashFlow = healthScore?.kpiScores.cashFlow ?? 0
  const netProfit = healthScore?.kpiScores.netProfit ?? 0
  const currentRatio = healthScore?.kpiScores.currentRatio ?? 0
  
  // Raw metrics for display
  const revenueGrowthPercentage = healthScore?.rawMetrics.revenueGrowthPercentage ?? 0
  const netProfitMargin = healthScore?.rawMetrics.netProfitMargin ?? 0
  const cashCoverageRatio = healthScore?.rawMetrics.cashCoverageRatio ?? 0
  const currentRatioValue = healthScore?.rawMetrics.currentRatio ?? 0

  // Calculate control/compliance score
  // controlCompliance represents the percentage that overall is of preUnreconciled
  // This shows the impact of unreconciled transactions on the score
  const controlComplianceScore = healthScore?.preUnreconciled && healthScore?.overall
    ? Math.round((healthScore.overall / healthScore.preUnreconciled) * 100)
    : 100

  const businessName = getBusinessNameFromId(businessId)

  return (
    <AppBarLayout title={businessName}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#333333"
            colors={['#333333']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading health scores...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <MetricsCard
            largeMetric={{
              value: Math.round(overallScore),
              label: 'Business Health',
              progress: Math.round(preUnreconciledScore), // Inner circle shows preUnreconciled (performance score)
            }}
            smallMetrics={[
              {
                value: Math.round(revenueGrowth),
                label: 'Rev. Growth',
                progress: Math.round(revenueGrowth),
              },
              {
                value: Math.round(cashFlow),
                label: 'Cash Flow',
                progress: Math.round(cashFlow),
              },
              {
                value: Math.round(netProfit),
                label: 'Net Profit',
                progress: Math.round(netProfit),
              },
            ]}
            currentRatio={Math.round(currentRatio)}
            healthScore={healthScore || undefined}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        )}
        {!loading && !error && (
          <>
            <MotivationalCard
              businessId={businessId}
              timeframe={timeframe}
              onPress={() => {
                navigation.navigate('Insights', { 
                  healthScore: healthScore || undefined, 
                  timeframe 
                })
              }}
            />
            
            {/* KPI Detail Cards */}
            <KPIDetailCard
              title="Control/Compliance"
              metricValue={`${controlComplianceScore}%`}
              score={controlComplianceScore}
              label="Control/Compliance"
              progress={controlComplianceScore}
              subtitle={timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              iconName="assured-workload"
              onPress={() => healthScore && navigation.navigate('ControlCompliance', { healthScore })}
            />
            <KPIDetailCard
              title="Revenue Growth"
              metricValue={`${revenueGrowthPercentage > 0 ? '+' : ''}${revenueGrowthPercentage.toFixed(1)}%`}
              score={revenueGrowth}
              label="Rev. Growth"
              progress={revenueGrowth}
              subtitle={timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              iconName="trending-up"
              onPress={() => healthScore && navigation.navigate('RevenueGrowth', { healthScore })}
            />
            <KPIDetailCard
              title="Cash Flow"
              metricValue={`${(cashCoverageRatio * 100).toFixed(0)}%`}
              score={cashFlow}
              label="Cash Flow"
              progress={cashFlow}
              subtitle={timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              iconName="account-balance-wallet"
              onPress={() => healthScore && navigation.navigate('CashFlow', { healthScore })}
            />
            <KPIDetailCard
              title="Net Profit"
              metricValue={`${netProfitMargin > 0 ? '+' : ''}${netProfitMargin.toFixed(1)}%`}
              score={netProfit}
              label="Net Profit"
              progress={netProfit}
              subtitle={timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              iconName="account-balance"
              onPress={() => healthScore && navigation.navigate('NetProfit', { healthScore })}
            />
            <KPIDetailCard
              title="Current Ratio"
              metricValue={currentRatioValue.toFixed(2)}
              score={currentRatio}
              label="Current Ratio"
              progress={currentRatio}
              subtitle={timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              iconName="compare-arrows"
              onPress={() => healthScore && navigation.navigate('CurrentRatio', { healthScore })}
            />
          </>
        )}
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    paddingVertical: 12,
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
})

