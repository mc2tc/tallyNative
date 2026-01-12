// Talent screen (Tally Network)

import React from 'react'
import { View, StyleSheet, ScrollView, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { PeopleBottomNav } from '../components/PeopleBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'

type Props = NativeStackScreenProps<AppDrawerParamList, 'Talent'>

export default function TalentScreen({ navigation }: Props) {
  useModuleTracking('talent')
  useModuleGroupTracking('tally_network')

  return (
    <View style={styles.wrapper}>
      <AppBarLayout title="Talent">
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.wipText}>Work in progress</Text>
        </ScrollView>
        <PeopleBottomNav />
      </AppBarLayout>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  wipText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
})

