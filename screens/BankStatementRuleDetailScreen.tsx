import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { BankStatementRule } from '../lib/api/bankStatementRules'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type BankStatementRuleDetailRouteProp = RouteProp<TransactionsStackParamList, 'BankStatementRuleDetail'>

export default function BankStatementRuleDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<BankStatementRuleDetailRouteProp>()
  const { rule } = route.params

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{rule.title}</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{rule.description}</Text>
          </View>

          {/* Keywords Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Triggers on</Text>
            <View style={styles.keywordsContainer}>
              {rule.keywords.map((keyword, index) => (
                <View key={index} style={styles.keywordTag}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Accounting Treatment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accounting Treatment</Text>
            <View style={styles.accountingTable}>
              <View style={styles.accountingRow}>
                <Text style={styles.accountingLabel}>Debits</Text>
                <Text style={styles.accountingValue}>{rule.debitAccount}</Text>
              </View>
              <View style={styles.accountingRow}>
                <Text style={styles.accountingLabel}>Credits</Text>
                <Text style={styles.accountingValue}>Bank</Text>
              </View>
              <View style={styles.accountingRow}>
                <Text style={styles.accountingLabel}>Category</Text>
                <Text style={styles.accountingValue}>{rule.category}</Text>
              </View>
              {rule.isBusinessExpense && (
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Business Expense</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE_BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 24,
  },
  section: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: GRAYSCALE_PRIMARY,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  keywordText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  accountingTable: {
    gap: 12,
  },
  accountingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountingLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  accountingValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  badgeContainer: {
    marginTop: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  badgeText: {
    fontSize: 12,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
})

