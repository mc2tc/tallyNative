import React, { useCallback } from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp, RouteProp } from '@react-navigation/stack'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'

export default function CurrentRatioScreen() {
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'CurrentRatio'>>()
  const healthScore = route.params?.healthScore

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const score = healthScore?.kpiScores.currentRatio ?? 0
  const rawValue = healthScore?.rawMetrics.currentRatio ?? 0

  return (
    <AppBarLayout title="Current Ratio" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Current Ratio</Text>
          
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score</Text>
              <Text style={styles.detailValue}>{Math.round(score)}/100</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current Ratio</Text>
              <Text style={styles.detailValue}>{rawValue.toFixed(2)}</Text>
            </View>
            {healthScore?.timeframe && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timeframe</Text>
                <Text style={styles.detailValue}>{healthScore.timeframe}</Text>
              </View>
            )}
            {healthScore?.usesRollingAverage !== undefined && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Uses Rolling Average</Text>
                <Text style={styles.detailValue}>
                  {healthScore.usesRollingAverage ? 'Yes' : 'No'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 20,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  detailLabel: {
    fontSize: 15,
    color: '#666666',
  },
  detailValue: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
})

