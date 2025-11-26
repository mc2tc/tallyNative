// Home screen

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

export default function HomeScreen() {
  return (
    <AppBarLayout title="Home">
      <View style={styles.container}>
        <Text style={styles.subtitle}>Primary dashboard content coming soon.</Text>
        <View style={styles.placeholderBlock}>
          <Text style={styles.placeholderText}>Wireframe placeholder</Text>
        </View>
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
    marginBottom: 32,
  },
  placeholderBlock: {
    width: '100%',
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  placeholderText: {
    color: '#666666',
    fontSize: 16,
  },
})

