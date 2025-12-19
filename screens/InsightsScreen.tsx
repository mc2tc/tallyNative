import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import { insightsApi } from '../lib/api/transactions2'
import type { InsightsResponse } from '../lib/api/transactions2'
import { useAuth } from '../lib/auth/AuthContext'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'

export default function InsightsScreen() {
  useModuleTracking('performance')
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'Insights'>>()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const timeframe = route.params?.timeframe || 'week'
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  useEffect(() => {
    const fetchInsights = async () => {
      if (!businessId) {
        setError('Business ID not available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await insightsApi.getInsights(businessId, timeframe)
        
        // API returns data directly (not wrapped in success/data)
        if (response && response.strategy) {
          setInsights(response)
        } else {
          console.warn('[InsightsScreen] Could not extract insights data from response:', response)
          setError(`Failed to fetch insights: Unable to parse response structure`)
        }
      } catch (err) {
        console.error('[InsightsScreen] Failed to fetch insights:', err)
        if (err instanceof Error) {
          console.error('[InsightsScreen] Error message:', err.message)
          console.error('[InsightsScreen] Error stack:', err.stack)
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch insights')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [businessId, timeframe])

  return (
    <AppBarLayout title="Business Insights" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#333333" />
            <Text style={styles.loadingText}>Loading insights...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : insights ? (
          <>
            {/* Summary Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Summary</Text>
              <Text style={styles.summaryText}>{insights.summary}</Text>
            </View>

            {/* Strategy Card */}
            <View style={[styles.card, styles.secondCard]}>
              <Text style={styles.title}>Strategy</Text>
              <Text style={styles.strategyTitle}>{insights.strategy.title}</Text>
              {(insights.strategy.description || insights.strategy.guidance) && (
                <Text style={styles.strategyDescription}>
                  {insights.strategy.description || insights.strategy.guidance}
                </Text>
              )}
              {insights.strategy.focusAreas && insights.strategy.focusAreas.length > 0 && (
                <View style={styles.focusAreasContainer}>
                  <Text style={styles.focusAreasTitle}>Focus Areas:</Text>
                  {insights.strategy.focusAreas.map((area: string, index: number) => (
                    <View key={index} style={styles.focusAreaRow}>
                      <Text style={styles.bulletChar}>•</Text>
                      <Text style={styles.focusAreaText}>{area}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Explanation Card */}
            {insights.explanation && (
              <View style={[styles.card, styles.secondCard]}>
                <Text style={styles.title}>Explanation</Text>
                <Text style={styles.explanationText}>{insights.explanation}</Text>
              </View>
            )}

            {/* Risks Card */}
            {insights.risks && insights.risks.length > 0 && (
              <View style={[styles.card, styles.secondCard]}>
                <Text style={styles.title}>Risks</Text>
                {insights.risks.map((risk: string, index: number) => (
                  <View key={index} style={styles.riskCard}>
                    <View style={styles.riskRow}>
                      <Text style={styles.bulletChar}>•</Text>
                      <Text style={styles.riskText}>{risk}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Actions Card */}
            {insights.actions && insights.actions.length > 0 && (
              <View style={[styles.card, styles.secondCard]}>
                <Text style={styles.title}>Recommended Actions</Text>
                {insights.actions.map((action: string, index: number) => (
                  <View key={index} style={styles.actionCard}>
                    <View style={styles.actionRow}>
                      <Text style={styles.bulletChar}>•</Text>
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </AppBarLayout>
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
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  strategyDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  focusAreasContainer: {
    marginTop: 8,
  },
  focusAreasTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  focusAreaRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bulletChar: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
    marginTop: 2,
  },
  focusAreaText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    flex: 1,
  },
  explanationText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  riskCard: {
    marginBottom: 12,
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  riskText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    flex: 1,
  },
  actionCard: {
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    flex: 1,
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

