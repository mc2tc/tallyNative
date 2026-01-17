import React, { useCallback, useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../lib/auth/AuthContext'
import { bankStatementRulesApi } from '../lib/api/bankStatementRules'
import { chartAccountsApi } from '../lib/api/chartAccounts'
import type { NavigationProp } from '@react-navigation/native'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type BankStatementRuleCreateNavigationProp = NavigationProp<TransactionsStackParamList, 'BankStatementRuleCreate'>

export default function BankStatementRuleCreateScreen() {
  const navigation = useNavigation<BankStatementRuleCreateNavigationProp>()
  const { businessUser, memberships } = useAuth()

  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [debitAccount, setDebitAccount] = useState('')
  const [showAccountPicker, setShowAccountPicker] = useState(false)
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave =
    !!businessId &&
    title.trim().length > 0 &&
    debitAccount.trim().length > 0 &&
    keywords.length > 0 &&
    !saving

  const handleAddKeyword = useCallback(() => {
    const trimmed = newKeyword.trim()
    if (!trimmed) return
    setKeywords((current) => {
      if (current.includes(trimmed)) return current
      return [...current, trimmed]
    })
    setNewKeyword('')
  }, [newKeyword])

  const handleRemoveKeyword = useCallback((index: number) => {
    setKeywords((current) => current.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback(async () => {
    if (!businessId) {
      Alert.alert(
        'No business selected',
        'Sign in or select a business to create bank rules.',
      )
      return
    }

    if (!canSave) {
      return
    }

    try {
      setSaving(true)
      await bankStatementRulesApi.createRule({
        businessId,
        title: title.trim(),
        description: description.trim() || undefined,
        keywords,
        debitAccount: debitAccount.trim(),
      })
      Alert.alert('Rule created', 'Your bank rule has been created.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error) {
      console.error('Failed to create bank statement rule:', error)
      Alert.alert(
        'Create failed',
        'We could not create this rule. Please try again in a moment.',
      )
    } finally {
      setSaving(false)
    }
  }, [
    businessId,
    canSave,
    debitAccount,
    description,
    keywords,
    navigation,
    title,
  ])

  const handleClose = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleOpenAccountPicker = useCallback(async () => {
    if (!businessId) {
      Alert.alert(
        'No business selected',
        'Sign in or select a business to choose debit accounts.',
      )
      return
    }

    try {
      setLoadingAccounts(true)
      setShowAccountPicker(true)
      setAvailableAccounts([])
      const accounts = await chartAccountsApi.getDebitAccounts(businessId)
      const accountsArray = Array.isArray(accounts) ? accounts : []
      setAvailableAccounts(accountsArray)
    } catch (error) {
      console.error('Failed to fetch chart accounts for rule create:', error)
      Alert.alert(
        'Error',
        'Failed to load available debit accounts. Please try again in a moment.',
      )
      setShowAccountPicker(false)
    } finally {
      setLoadingAccounts(false)
    }
  }, [businessId])

  const handleSelectAccount = useCallback((account: string) => {
    setDebitAccount(account)
    setShowAccountPicker(false)
  }, [])

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
            <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NEW BANK RULE</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Basic info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Software subscriptions"
                placeholderTextColor={GRAYSCALE_SECONDARY}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description of when this rule applies"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                multiline
              />
            </View>
          </View>

          {/* Triggers */}
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

          {/* Accounting treatment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accounting treatment</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Debits</Text>
              <TouchableOpacity
                style={styles.selectorInput}
                activeOpacity={0.7}
                onPress={handleOpenAccountPicker}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !debitAccount && styles.selectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {debitAccount || 'Select account'}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={18} color={GRAYSCALE_SECONDARY} />
              </TouchableOpacity>
            </View>
            <View style={styles.readonlyRow}>
              <Text style={styles.readonlyLabel}>Credits</Text>
              <Text style={styles.readonlyValue}>Bank</Text>
            </View>
          </View>
        </ScrollView>

        {/* Save */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Creating…' : 'Create rule'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountPicker(false)}
        >
          <View style={styles.modalCard}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select debit account</Text>
                <TouchableOpacity
                  onPress={() => setShowAccountPicker(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={22} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>
              {loadingAccounts ? (
                <View style={styles.modalBody}>
                  <Text style={styles.loadingText}>Loading accounts…</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalBody}>
                  {availableAccounts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No debit accounts available</Text>
                    </View>
                  ) : (
                    availableAccounts.map((account) => {
                      const isSelected = debitAccount === account
                      return (
                        <TouchableOpacity
                          key={account}
                          style={[
                            styles.accountOption,
                            isSelected && styles.accountOptionSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleSelectAccount(account)}
                        >
                          <Text
                            style={[
                              styles.accountOptionText,
                              isSelected && styles.accountOptionTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {account}
                          </Text>
                          {isSelected && (
                            <MaterialIcons
                              name="check"
                              size={18}
                              color={GRAYSCALE_PRIMARY}
                              style={styles.checkIcon}
                            />
                          )}
                        </TouchableOpacity>
                      )
                    })
                  )}
                </ScrollView>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    backgroundColor: CARD_BACKGROUND,
  },
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
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
  readonlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  readonlyLabel: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  readonlyValue: {
    fontSize: 14,
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
  selectorInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  selectorPlaceholder: {
    color: GRAYSCALE_SECONDARY,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 320,
  },
  loadingText: {
    padding: 16,
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
  accountOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountOptionSelected: {
    backgroundColor: SURFACE_BACKGROUND,
  },
  accountOptionText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  accountOptionTextSelected: {
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
})


