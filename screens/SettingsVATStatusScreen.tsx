// Settings VAT Status screen - shows VAT status information

import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

export default function SettingsVATStatusScreen() {
  return (
    <AppBarLayout title="VAT Status">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.text}>VAT status information is available in Settings</Text>
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

