import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth/AuthContext'
import { bankStatementRulesApi, type BankStatementRule } from '../lib/api/bankStatementRules'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type NavigationProp = StackNavigationProp<TransactionsStackParamList, 'BankStatementRules'>

export default function BankStatementRulesListScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { businessUser, memberships } = useAuth()
  const [rules, setRules] = useState<BankStatementRule[]>([])
  const [loading, setLoading] = useState(true)

  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  useFocusEffect(
    useCallback(() => {
      if (!businessId) {
        setRules([])
        setLoading(false)
        return
      }

      const fetchRules = async () => {
        try {
          setLoading(true)
          const response = await bankStatementRulesApi.getRules(businessId)
          setRules(response.rules || [])
        } catch (error) {
          console.error('Failed to fetch bank statement rules:', error)
          setRules([])
        } finally {
          setLoading(false)
        }
      }

      fetchRules()
    }, [businessId]),
  )

  const handleRulePress = useCallback(
    (rule: BankStatementRule) => {
      navigation.navigate('BankStatementRuleDetail', { rule })
    },
    [navigation],
  )

  const handleCreateRule = useCallback(() => {
    navigation.navigate('BankStatementRuleCreate')
  }, [navigation])

  const handleClose = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Auto bank rules</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateRule}
            activeOpacity={0.7}
          >
            <MaterialIcons name="add" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
            {rules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No bank rules</Text>
                <Text style={styles.emptyText}>
                  Create your first bank rule to automatically categorize transactions
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateRule}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createButtonText}>Create rule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.rulesList}>
                {rules.map((rule) => (
                  <TouchableOpacity
                    key={rule.id}
                    style={styles.ruleCard}
                    onPress={() => handleRulePress(rule)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ruleContent}>
                      <Text style={styles.ruleTitle}>{rule.title}</Text>
                      {rule.description && (
                        <Text style={styles.ruleDescription} numberOfLines={2}>
                          {rule.description}
                        </Text>
                      )}
                      {rule.keywords && rule.keywords.length > 0 && (
                        <View style={styles.keywordsContainer}>
                          {rule.keywords.slice(0, 3).map((keyword, index) => (
                            <View key={index} style={styles.keywordTag}>
                              <Text style={styles.keywordText}>{keyword}</Text>
                            </View>
                          ))}
                          {rule.keywords.length > 3 && (
                            <Text style={styles.moreKeywords}>
                              +{rule.keywords.length - 3} more
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
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
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  rulesList: {
    gap: 12,
  },
  ruleCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ruleContent: {
    flex: 1,
    marginRight: 12,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 8,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  keywordTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  keywordText: {
    fontSize: 12,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  moreKeywords: {
    fontSize: 12,
    color: GRAYSCALE_SECONDARY,
    fontStyle: 'italic',
  },
})

