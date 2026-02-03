import React, { useCallback } from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import type { HomeStackParamList } from '../navigation/HomeNavigator'

export default function ControlComplianceScreen() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>()
  const route = useRoute<RouteProp<HomeStackParamList, 'ControlCompliance'>>()
  const healthScore = route.params?.healthScore

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Calculate Control score
  // controlCompliance represents the percentage that overall is of preUnreconciled
  // This shows the impact of unreconciled transactions on the score
  const controlComplianceScore = healthScore?.preUnreconciled && healthScore?.overall
    ? Math.round((healthScore.overall / healthScore.preUnreconciled) * 100)
    : 100

  return (
    <AppBarLayout title="Control" onBackPress={handleGoBack}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Control</Text>
          
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Score</Text>
              <Text style={styles.detailValue}>{controlComplianceScore}%</Text>
            </View>
            {healthScore?.timeframe && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timeframe</Text>
                <Text style={styles.detailValue}>
                  {healthScore.timeframe.charAt(0).toUpperCase() + healthScore.timeframe.slice(1)}
                </Text>
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

        <View style={[styles.card, styles.secondCard]}>
          <Text style={styles.title}>What This Means</Text>
          <Text style={styles.explanationText}>
            The Control score measures how many of your transactions are validated and authentic. 
            As a business owner, you can add transactions quickly—sometimes without receipts or full documentation—which is 
            practical for speed and when records are lost. However, transactions that are properly verified and reconciled 
            provide stronger control and better financial standing.
          </Text>
          <Text style={styles.explanationText}>
            A higher score (closer to 100%) means most of your transactions are validated and authentic. This is important 
            for audits—whether required or not—and especially valuable when applying for loans. Banks want to see that your 
            financial records are trustworthy and complete.
          </Text>
          <Text style={styles.explanationText}>
            Adding complete transaction records also helps Tally provide better insights and support for your business. 
            The more validated records you have, the more accurate your business health picture becomes, and the more useful 
            Tally can be in helping you make informed decisions.
          </Text>
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
  secondCard: {
    marginTop: 24,
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
  explanationText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
})

