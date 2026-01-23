// Help tab - shows overview cards for Oversight and Insight

import React, { useState } from 'react'
import { StyleSheet, ScrollView, RefreshControl, View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { AssistantInfoCard } from '../components/AssistantInfoCard'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import { useAuth } from '../lib/auth/AuthContext'
import { oversightApi } from '../lib/api/oversight'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type HelpScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

// Match the style from "Understanding your Purchases pipeline" info card
const SURFACE_BACKGROUND = '#f6f6f6'
const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'

export default function HelpScreen() {
  const navigation = useNavigation<HelpScreenNavigationProp>()
  const { oversightUnreadCount, insightUnreadCount, setOversightUnreadCount } = useAssistant()
  const { businessUser, memberships } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  // Get businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (businessId) {
        // Trigger a new oversight check to look for new issues
        await oversightApi.check(businessId, { forceRefresh: false })
        
        // Then fetch the updated alerts count
        const response = await oversightApi.getAlerts(businessId, {
          unread: true,
          limit: 1,
        })
        setOversightUnreadCount(response.unreadCount)
        
        // TODO: Add insight API call when available
        // For now, insight count remains unchanged
      }
    } catch (err) {
      console.error('Failed to refresh alerts:', err)
      // Don't update count on error, keep existing value
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <AppBarLayout>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#333333"
            colors={['#333333']}
          />
        }
      >
        <View style={styles.introCard}>
          <View style={styles.introContent}>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Operations Centre</Text>
              <Text style={styles.introBody}>
               Tally monitors your business finances, operations and security, and provides real-time alerts and actionable insights to help you run your business with confidence.
              </Text>
            </View>
          </View>
        </View>
        <AssistantInfoCard
          title="Security"
          description="Monitors your business data to detect fraud, theft, and security risks. Alerts you to suspicious activity and potential threats."
          icon="shield"
          unreadCount={oversightUnreadCount}
          actionText="Control Room"
          onPress={() => navigation.navigate('OversightChat')}
          progressBarColor="#ff4444"
          animationDelay={0}
        />
        <AssistantInfoCard
          title="Finance"
          description="To help you stay compliant and avoid an unexpected review from HMRC, Tally uses smart screening technology to check your data for common errors."
          icon="account-balance"
          unreadCount={0}
          actionText="Control Room"
          onPress={() => navigation.navigate('TaxesCompliance')}
          progressBarColor="#ffaa00"
          animationDelay={2000}
        />
        <AssistantInfoCard
          title="Operations & Performance"
          description="Analyzes your operations to provide actionable recommendations that help optimize your business performance."
          icon="trending-up"
          unreadCount={2}
          actionText="Control Room"
          onPress={() => navigation.navigate('InsightChat')}
          progressBarColor="#44ff44"
          animationDelay={4000}
        />
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16, // Default spacing from title above
  },
  introCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  introContent: {
    alignItems: 'flex-start',
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  introBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
    marginBottom: 8,
  },
  introBold: {
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
})


