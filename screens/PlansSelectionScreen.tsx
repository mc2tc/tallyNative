// Plans Selection screen

import React, { useState, useCallback, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { plansApi, type Plan } from '../lib/api/plans'
import { useFocusEffect } from '@react-navigation/native'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList, 'PlansSelection'>

// Available plans (excluding trial which is auto-assigned)
const AVAILABLE_PLANS = [
  {
    planId: 'basic',
    planName: 'Basic',
    price: 500,
    description: 'Basic accounting only',
    limits: {
      transactions: 5,
      vertexAICalls: 3,
      storageBytes: 104857600, // 100 MB
      users: 1,
      moduleGroups: 0,
    },
  },
  {
    planId: 'starter',
    planName: 'Starter',
    price: 1500,
    description: 'Small businesses',
    limits: {
      transactions: 25,
      vertexAICalls: 10,
      storageBytes: 524288000, // 500 MB
      users: 3,
      moduleGroups: 1,
    },
  },
  {
    planId: 'growth',
    planName: 'Growth',
    price: 3500,
    description: 'Growing businesses',
    limits: {
      transactions: 100,
      vertexAICalls: 50,
      storageBytes: 2147483648, // 2 GB
      users: 10,
      moduleGroups: 3,
    },
  },
  {
    planId: 'business',
    planName: 'Business',
    price: 7500,
    description: 'Established businesses',
    limits: {
      transactions: 500,
      vertexAICalls: 200,
      storageBytes: 10737418240, // 10 GB
      users: 25,
      moduleGroups: 5,
    },
  },
]

const formatPrice = (pence: number): string => {
  if (pence === 0) return 'Free'
  const pounds = pence / 100
  return `£${pounds.toFixed(2)}/month`
}

const formatStorage = (bytes: number | null): string => {
  if (bytes === null) return 'Unlimited'
  const MB = 1024 * 1024
  const GB = MB * 1024
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`
  }
  return `${Math.round(bytes / MB)} MB`
}

const formatLimit = (value: number | null, unit: string = ''): string => {
  if (value === null) return 'Unlimited'
  return `${value}${unit ? ` ${unit}` : ''}`
}

export default function PlansSelectionScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCurrentPlan = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const plan = await plansApi.getCurrentPlan(businessId)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Failed to fetch current plan:', error)
      Alert.alert('Error', 'Failed to load current plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchCurrentPlan()
    }, [fetchCurrentPlan]),
  )

  const handleSelectPlan = (planId: string, planName: string, price: number) => {
    // Navigate to payment screen
    navigation.navigate('Payment', { planId, planName, price })
  }

  if (loading) {
    return (
      <AppBarLayout title="Select Plan" onBackPress={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#333333" />
        </View>
      </AppBarLayout>
    )
  }

  return (
    <AppBarLayout title="Select Plan" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>Choose the plan that best fits your business needs.</Text>

        {AVAILABLE_PLANS.map((plan) => {
          const isCurrentPlan = currentPlan?.planId === plan.planId
          return (
            <TouchableOpacity
              key={plan.planId}
              style={[styles.planCard, isCurrentPlan && styles.planCardCurrent]}
              onPress={() => handleSelectPlan(plan.planId, plan.planName, plan.price)}
              activeOpacity={0.7}
            >
              <View style={styles.planCardHeader}>
                <View style={styles.planCardTitleContainer}>
                  <Text style={styles.planCardTitle}>{plan.planName}</Text>
                  {isCurrentPlan && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planCardPrice}>{formatPrice(plan.price)}</Text>
              </View>
              <Text style={styles.planCardDescription}>{plan.description}</Text>
              
              <View style={styles.planLimits}>
                <View style={styles.planLimitRow}>
                  <Text style={styles.planLimitLabel}>Transactions:</Text>
                  <Text style={styles.planLimitValue}>{formatLimit(plan.limits.transactions, '/month')}</Text>
                </View>
                <View style={styles.planLimitRow}>
                  <Text style={styles.planLimitLabel}>AI Calls:</Text>
                  <Text style={styles.planLimitValue}>{formatLimit(plan.limits.vertexAICalls, '/month')}</Text>
                </View>
                <View style={styles.planLimitRow}>
                  <Text style={styles.planLimitLabel}>Storage:</Text>
                  <Text style={styles.planLimitValue}>{formatStorage(plan.limits.storageBytes)}</Text>
                </View>
                <View style={styles.planLimitRow}>
                  <Text style={styles.planLimitLabel}>Users:</Text>
                  <Text style={styles.planLimitValue}>{formatLimit(plan.limits.users)}</Text>
                </View>
                <View style={styles.planLimitRow}>
                  <Text style={styles.planLimitLabel}>Module Groups:</Text>
                  <Text style={styles.planLimitValue}>
                    {plan.limits.moduleGroups === 5 ? 'All 5' : formatLimit(plan.limits.moduleGroups)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 24,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  planCardCurrent: {
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  currentBadge: {
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  planCardDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  planLimits: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  planLimitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  planLimitLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  planLimitValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
})
