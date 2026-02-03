// Control Room screen - shows Security content

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { OversightAlertsCard } from '../components/OversightAlertsCard'
import { ControlRoomBottomNav } from '../components/ControlRoomBottomNav'
import { useAuth } from '../lib/auth/AuthContext'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type HelpScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function HelpScreen() {
  const navigation = useNavigation<HelpScreenNavigationProp>()
  const { businessUser, memberships } = useAuth()
  const { setSecurityAlertsCount, securityAlertsCount } = useAssistant()

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
      <View style={styles.container}>
        <View style={styles.alertsContainer}>
          {businessId && (
            <OversightAlertsCard
              businessId={businessId}
              onAlertsSummaryChange={(info) => {
                setSecurityAlertsCount(info.alertsCount)
              }}
            />
          )}
        </View>
      </View>
      <ControlRoomBottomNav 
        activeTab="Security" 
        securityCount={securityAlertsCount}
      />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 8,
  },
  alertsContainer: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work properly
    overflow: 'hidden', // Ensure content doesn't overflow
    paddingBottom: 16, // Add vertical space at the bottom
  },
})


