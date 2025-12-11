import React, { useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { ChatbotCard } from '../components/ChatbotCard'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type InsightChatScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function InsightChatScreen() {
  const navigation = useNavigation<InsightChatScreenNavigationProp>()

  const handleGoBack = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Help' })
  }, [navigation])

  return (
    <AppBarLayout title="Operations & Performance" onBackPress={handleGoBack}>
      <View style={styles.container}>
        <ChatbotCard title="Operations & Performance Assistant" />
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 16, // Add vertical space at the bottom
  },
})
