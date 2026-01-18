// Settings Plan screen - shows plan information

import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { plansApi, type Plan } from '../lib/api/plans'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#333333'

const formatPrice = (pence: number): string => {
  if (pence === 0) return 'Free'
  const pounds = pence / 100
  return `£${pounds.toFixed(2)}/month`
}

export default function SettingsPlanScreen() {
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>()

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)

  const fetchCurrentPlan = useCallback(async () => {
    if (!businessId) {
      setLoadingPlan(false)
      return
    }
    try {
      setLoadingPlan(true)
      const plan = await plansApi.getCurrentPlan(businessId)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Failed to fetch current plan:', error)
      setCurrentPlan(null)
    } finally {
      setLoadingPlan(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchCurrentPlan()
    }, [fetchCurrentPlan]),
  )

  const handleUpdatePlan = () => {
    // Navigate to PlansSelection via drawer navigator
    navigation.navigate('PlansSelection')
  }

  return (
    <AppBarLayout>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Plan</Text>
          </View>

          {loadingPlan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : currentPlan ? (
            <View style={styles.planContent}>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Plan:</Text>
                <Text style={styles.planValue}>{currentPlan.planName}</Text>
              </View>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Price:</Text>
                <Text style={styles.planValue}>{formatPrice(currentPlan.price)}</Text>
              </View>
              {currentPlan.inTrial && currentPlan.subscription?.trialEndsAt && (
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>Trial ends:</Text>
                  <Text style={styles.planValue}>
                    {new Date(currentPlan.subscription.trialEndsAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.updatePlanButton}
                onPress={handleUpdatePlan}
                activeOpacity={0.7}
              >
                <Text style={styles.updatePlanButtonText}>Update plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Plan information not available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  planContent: {
    gap: 12,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  planValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  updatePlanButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  updatePlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
  },
})
