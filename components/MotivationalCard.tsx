import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { insightsApi } from '../lib/api/transactions2'
import type { InsightsResponse } from '../lib/api/transactions2'
import { getLogoGradient } from '../lib/utils/semanticColors'

interface MotivationalCardProps {
  businessId?: string
  timeframe?: 'week' | 'month' | 'quarter'
  onPress?: () => void
}

export function MotivationalCard({ businessId, timeframe = 'week', onPress }: MotivationalCardProps) {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [strategySummary, setStrategySummary] = useState<string | null>(null)
  const [insights, setInsights] = useState<InsightsResponse | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!businessId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await insightsApi.getInsights(businessId, timeframe)
        
        // API returns data directly (not wrapped in success/data)
        if (response && response.strategy && response.strategy.title) {
          setInsights(response)
          setStrategySummary(response.strategy.title)
        } else {
          console.warn('[MotivationalCard] Could not extract insights data from response:', response)
          setStrategySummary(null)
        }
      } catch (error) {
        console.error('[MotivationalCard] Failed to fetch insights:', error)
        if (error instanceof Error) {
          console.error('[MotivationalCard] Error message:', error.message)
          console.error('[MotivationalCard] Error stack:', error.stack)
        }
        // Fallback to default message if API fails
        setStrategySummary(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [businessId, timeframe])

  if (dismissed) {
    return null
  }

  const handleLearnMore = () => {
    if (onPress && !loading) {
      onPress()
    }
  }

  const displayText = loading
    ? 'Loading insights...'
    : strategySummary || 'Focus on improving your cash flow and maintaining strong revenue growth to boost your overall health score.'

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={getLogoGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.card}>
          <View style={styles.content}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Strategic insights for your business</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#6d6d6d" />
                  <Text style={styles.body}>Loading insights...</Text>
                </View>
              ) : (
                <Text style={styles.body}>{displayText}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setDismissed(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissIcon}>×</Text>
            </TouchableOpacity>
          </View>
          {/* Learn more button */}
          {!loading && onPress && (
            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={handleLearnMore}
              activeOpacity={0.7}
            >
              <Text style={styles.learnMoreText}>View details</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  gradientBorder: {
    borderRadius: 12,
    padding: 2, // This creates the border width
  },
  card: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10, // Slightly smaller to account for border
    padding: 16,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 24, // Add padding to prevent clash with Learn more button
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a4a',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: '#6d6d6d',
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dismissIcon: {
    fontSize: 22,
    color: '#6d6d6d',
    fontWeight: '300',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  learnMoreButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  learnMoreText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
})

