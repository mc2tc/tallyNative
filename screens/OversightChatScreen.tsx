import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { OversightAlertsCard } from '../components/OversightAlertsCard'
import { ChatbotCard } from '../components/ChatbotCard'
import { useAuth } from '../lib/auth/AuthContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type OversightChatScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function OversightChatScreen() {
  const navigation = useNavigation<OversightChatScreenNavigationProp>()
  const { businessUser, memberships } = useAuth()
  const [assistantIntro, setAssistantIntro] = useState(
    "I'm here to help you understand and resolve any security oversight issues.",
  )

  const handleGoBack = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Help' })
  }, [navigation])

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
    <AppBarLayout title="Security" onBackPress={handleGoBack}>
      <View style={styles.container}>
        <View style={styles.alertsContainer}>
          {businessId && (
            <OversightAlertsCard
              businessId={businessId}
              onAlertsSummaryChange={({ hasAlerts }) => {
                if (hasAlerts) {
                  setAssistantIntro(
                    "I've detected some security issues in your Oversight Alerts that need your attention. I can help you review and resolve them.",
                  )
                } else {
                  setAssistantIntro(
                    'Your Oversight Alerts above show no current security issues. I can help you understand what is being monitored or review anything that looks unusual.',
                  )
                }
              }}
            />
          )}
        </View>
        <View style={styles.spacer} />
        <View style={styles.chatbotContainer}>
          <ChatbotCard 
            title="Security Assistant"
            initialMessages={[
              {
                id: '1',
                text: assistantIntro,
                isUser: false,
                showButtons: false,
                timestamp: new Date(),
              },
            ]}
          />
        </View>
      </View>
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
  },
  spacer: {
    height: 8,
  },
  chatbotContainer: {
    flex: 1,
    minHeight: 0, // Important for ScrollView to work properly
    overflow: 'hidden', // Ensure content doesn't overflow
    paddingBottom: 16, // Add vertical space at the bottom
  },
})
