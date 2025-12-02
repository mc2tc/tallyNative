// Home screen

import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { MetricsCard } from '../components/MetricsCard'
import { ChatbotCard } from '../components/ChatbotCard'
import { useAuth } from '../lib/auth/AuthContext'
import { healthScoreApi } from '../lib/api/transactions2'
import type { HealthScoreResponse } from '../lib/api/transactions2'

export default function HomeScreen() {
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [healthScore, setHealthScore] = useState<HealthScoreResponse['data']['healthScore'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealthScore = async () => {
      if (!businessId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await healthScoreApi.getHealthScore(businessId, 'week')
        if (response.success && response.data?.healthScore) {
          setHealthScore(response.data.healthScore)
        } else {
          setError('Failed to fetch health score')
        }
      } catch (err) {
        console.error('Error fetching health score:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch health score')
      } finally {
        setLoading(false)
      }
    }

    fetchHealthScore()
  }, [businessId])

  // Log transaction data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (healthScore) {
        console.log('=== Home Screen Transaction Data ===')
        console.log('Health Score Data:', JSON.stringify(healthScore, null, 2))
        console.log('Overall Score:', healthScore.overall)
        console.log('KPI Scores:', healthScore.kpiScores)
        console.log('Raw Metrics:', healthScore.rawMetrics)
        console.log('Timeframe:', healthScore.timeframe)
        console.log('Uses Rolling Average:', healthScore.usesRollingAverage)
        console.log('=====================================')
      }
    }, [healthScore])
  )

  // Use real data if available, otherwise use defaults
  const overallScore = healthScore?.overall ?? 0
  const revenueGrowth = healthScore?.kpiScores.revenueGrowth ?? 0
  const cashFlow = healthScore?.kpiScores.cashFlow ?? 0
  const netProfit = healthScore?.kpiScores.netProfit ?? 0
  const currentRatio = healthScore?.kpiScores.currentRatio ?? 0

  return (
    <AppBarLayout title="Home">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
              label: 'Momentum',
              progress: Math.round(overallScore),
            }}
            smallMetrics={[
              {
                value: Math.round(revenueGrowth),
                label: 'Rev.\nGrowth',
                progress: Math.round(revenueGrowth),
              },
              {
                value: Math.round(cashFlow),
                label: 'Cash\nFlow',
                progress: Math.round(cashFlow),
              },
              {
                value: Math.round(netProfit),
                label: 'Net\nProfit',
                progress: Math.round(netProfit),
              },
            ]}
            currentRatio={Math.round(currentRatio)}
            healthScore={healthScore || undefined}
          />
        )}
        <ChatbotCard />
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

