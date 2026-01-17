// Email marketing screen - placeholder

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

export default function EmailScreen() {
  return (
    <AppBarLayout title="Email">
      <View style={styles.container}>
        <Text style={styles.text}>Email marketing features coming soon</Text>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})

