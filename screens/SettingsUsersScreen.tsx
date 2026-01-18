// Settings Users screen - placeholder

import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

export default function SettingsUsersScreen() {
  return (
    <AppBarLayout>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Users</Text>
          </View>
          <View style={styles.usersList}>
            <View style={styles.userItem}>
              <Text style={styles.userName}>Martin Clifford</Text>
              <Text style={styles.userRole}>Owner</Text>
            </View>
            <View style={styles.userItem}>
              <Text style={styles.userName}>Aaron Clifford</Text>
              <Text style={styles.userRole}>Manager</Text>
            </View>
            <View style={styles.userItem}>
              <Text style={styles.userName}>Beth Clifford</Text>
              <Text style={styles.userRole}>Transactional Input and POS</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  usersList: {
    gap: 12,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  userRole: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },
})

