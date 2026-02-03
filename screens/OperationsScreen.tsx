// Control Room Operations screen - shows Operations content

import React, { useEffect } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import { ControlRoomBottomNav } from '../components/ControlRoomBottomNav'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type OperationsScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList>

export default function OperationsScreen() {
  const navigation = useNavigation<OperationsScreenNavigationProp>()
  const { setOperationsAlertsCount } = useAssistant()

  // Set operations count to 0 (no API calls yet)
  useEffect(() => {
    setOperationsAlertsCount(0)
  }, [setOperationsAlertsCount])

  return (
    <AppBarLayout title="Control Room">
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Operations Alerts</Text>
          <Text style={styles.placeholder}>Content will be wired up later</Text>
        </View>
      </View>
      <ControlRoomBottomNav activeTab="Operations" />
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 8,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
    color: '#999999',
  },
})

