// Control Room Compliance screen - shows Compliance content

import React, { useState, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { ComplianceAlertsCard, type ComplianceAlertsCardRef } from '../components/ComplianceAlertsCard'
import { ControlRoomBottomNav } from '../components/ControlRoomBottomNav'
import { useAuth } from '../lib/auth/AuthContext'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const SURFACE_BACKGROUND = '#f6f6f6'

type ComplianceScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function ComplianceScreen() {
  const navigation = useNavigation<ComplianceScreenNavigationProp>()
  const { businessUser, memberships } = useAuth()
  const { setComplianceAlertsCount } = useAssistant()
  const [explainerCardDismissed, setExplainerCardDismissed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const complianceAlertsCardRef = useRef<ComplianceAlertsCardRef>(null)

  // Choose businessId (same logic as other screens)
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
      await complianceAlertsCardRef.current?.refresh()
    } catch (error) {
      console.error('Failed to refresh compliance alerts:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <AppBarLayout title="Control Room">
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!explainerCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding the Compliance System</Text>
                <Text style={styles.infoBody}>
                  The Compliance System monitors your business transactions to detect issues that government authorities like HMRC might flag during an audit. It identifies patterns and categorizations that could raise red flags, helping you address potential compliance concerns before they become problems. The system learns your business patterns over time, improving its accuracy and helping you maintain audit-ready records.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setExplainerCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {businessId && (
          <ComplianceAlertsCard
            ref={complianceAlertsCardRef}
            businessId={businessId}
            onAlertsSummaryChange={(info) => {
              setComplianceAlertsCount(info.alertsCount)
            }}
          />
        )}
      </ScrollView>
      <ControlRoomBottomNav 
        activeTab="Compliance" 
      />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  infoBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
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
    color: GRAYSCALE_SECONDARY,
    fontWeight: '300',
    lineHeight: 20,
  },
})

