// Help tab placeholder screen

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

export default function HelpScreen() {
  return (
    <AppBarLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Help</Text>
        <Text style={styles.subtitle}>Wireframe placeholder content.</Text>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
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


