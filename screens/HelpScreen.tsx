// Control Room screen - shows Security content

import React, { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { OversightAlertsCard } from '../components/OversightAlertsCard'
import { ControlRoomBottomNav } from '../components/ControlRoomBottomNav'
import { useAuth } from '../lib/auth/AuthContext'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const SURFACE_BACKGROUND = '#f6f6f6'

type HelpScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function HelpScreen() {
  const navigation = useNavigation<HelpScreenNavigationProp>()
  const { businessUser, memberships } = useAuth()
  const { setSecurityAlertsCount, securityAlertsCount } = useAssistant()
  const [explainerCardDismissed, setExplainerCardDismissed] = useState(false)

  // Choose businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  return (
    <AppBarLayout title="Control Room">
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {!explainerCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Understanding the Oversight System</Text>
                <Text style={styles.infoBody}>
                  The Oversight System provides 24/7 automated monitoring of business transactions to detect problems early. It flags clear issues, unusual patterns and relationship breakdowns. The system learns your business patterns over time, improving its accuracy and saving manual review time.
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
          <OversightAlertsCard
            businessId={businessId}
            onAlertsSummaryChange={(info) => {
              setSecurityAlertsCount(info.alertsCount)
            }}
          />
        )}
      </ScrollView>
      <ControlRoomBottomNav 
        activeTab="Security" 
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


