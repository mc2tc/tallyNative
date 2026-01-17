// Settings Plan screen - shows plan information

import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { SettingsStackParamList } from '../navigation/SettingsNavigator'

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList>

export default function SettingsPlanScreen() {
  const navigation = useNavigation<NavigationProp>()

  React.useEffect(() => {
    // Navigate to SettingsMain when this screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      // This screen acts as a tab that shows the Plan section of Settings
      // In a full implementation, we could pass params to SettingsScreen to auto-scroll to Plan section
    })

    return unsubscribe
  }, [navigation])

  // For now, just redirect to SettingsMain which shows all settings including Plan
  // In a full implementation, SettingsScreen could accept params to focus on specific sections
  return (
    <AppBarLayout title="Plan">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.text}>Plan information is available in Settings</Text>
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
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})

