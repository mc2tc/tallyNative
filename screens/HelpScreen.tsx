// Help tab placeholder screen

import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'
import { ChatbotCard } from '../components/ChatbotCard'

export default function HelpScreen() {
  return (
    <AppBarLayout title="Assistant">
      <View style={styles.container}>
        <ChatbotCard />
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})


