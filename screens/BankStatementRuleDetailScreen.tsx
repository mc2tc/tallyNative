import React, { useCallback, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { BankStatementRule } from '../lib/api/bankStatementRules'
import { bankStatementRulesApi } from '../lib/api/bankStatementRules'
import { useAuth } from '../lib/auth/AuthContext'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type BankStatementRuleDetailRouteProp = RouteProp<TransactionsStackParamList, 'BankStatementRuleDetail'>

export default function BankStatementRuleDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute<BankStatementRuleDetailRouteProp>()
  const { rule } = route.params
  const { businessUser, memberships } = useAuth()

  // Derive businessId using the same preference logic as other transaction screens
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const [keywords, setKeywords] = useState<string[]>(rule.keywords ?? [])
  const [newKeyword, setNewKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleRemoveKeyword = useCallback(
    (index: number) => {
      setKeywords((current) => current.filter((_, i) => i !== index))
    },
    [],
  )

  const handleAddKeyword = useCallback(() => {
    const trimmed = newKeyword.trim()
    if (!trimmed) return
    setKeywords((current) => {
      if (current.includes(trimmed)) return current
      return [...current, trimmed]
    })
    setNewKeyword('')
  }, [newKeyword])

  const handleSave = useCallback(async () => {
    if (!businessId) {
      Alert.alert(
        'No business selected',
        'Sign in or select a business to update bank rules.',
      )
      return
    }

    try {
      setSaving(true)
      await bankStatementRulesApi.updateRule(rule.id, { businessId, keywords })
      Alert.alert('Saved', 'Rule triggers have been updated.')
      navigation.goBack()
    } catch (error) {
      console.error('Failed to update bank statement rule:', error)
      Alert.alert(
        'Save failed',
        'We could not save your changes. Please try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }, [businessId, keywords, navigation, rule.id])

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
          <Text style={styles.headerTitle}>{(rule.title || '').toUpperCase()}</Text>
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
              {keywords.map((keyword, index) => (
                <View key={`${keyword}-${index}`} style={styles.keywordTag}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveKeyword(index)}
                    style={styles.keywordRemoveButton}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={14} color={GRAYSCALE_SECONDARY} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.keywordInputRow}>
              <TextInput
                style={styles.keywordInput}
                placeholder="Add trigger keyword"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                value={newKeyword}
                onChangeText={setNewKeyword}
                onSubmitEditing={handleAddKeyword}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleAddKeyword}
                style={styles.keywordAddButton}
                activeOpacity={0.7}
              >
                <Text style={styles.keywordAddButtonText}>Add</Text>
              </TouchableOpacity>
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
            </View>
          </View>
        </ScrollView>
        {/* Save button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || keywords.length === 0) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || keywords.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keywordText: {
    fontSize: 13,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
  },
  keywordRemoveButton: {
    padding: 2,
  },
  keywordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  keywordInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    paddingHorizontal: 10,
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    backgroundColor: CARD_BACKGROUND,
  },
  keywordAddButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: CARD_BACKGROUND,
  },
  keywordAddButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
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
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
    backgroundColor: SURFACE_BACKGROUND,
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#dcdcdc',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
})

