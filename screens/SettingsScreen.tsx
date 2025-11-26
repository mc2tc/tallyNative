// Settings screen

import React, { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { bankAccountsApi, type BankAccount } from '../lib/api/bankAccounts'
import { creditCardsApi, type CreditCard } from '../lib/api/creditCards'
import { MaterialIcons } from '@expo/vector-icons'

const GRAYSCALE_PRIMARY = '#333333'

export default function SettingsScreen() {
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [loadingCreditCards, setLoadingCreditCards] = useState(true)
  const [showAddCreditCardModal, setShowAddCreditCardModal] = useState(false)
  const [cardType, setCardType] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [isSubmittingCreditCard, setIsSubmittingCreditCard] = useState(false)

  const fetchBankAccounts = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const accounts = await bankAccountsApi.getBankAccounts(businessId)
      setBankAccounts(accounts)
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error)
      setBankAccounts([])
    } finally {
      setLoading(false)
    }
  }, [businessId])

  const fetchCreditCards = useCallback(async () => {
    if (!businessId) {
      setLoadingCreditCards(false)
      return
    }
    try {
      setLoadingCreditCards(true)
      const cards = await creditCardsApi.getCreditCards(businessId)
      setCreditCards(cards)
    } catch (error) {
      console.error('Failed to fetch credit cards:', error)
      setCreditCards([])
    } finally {
      setLoadingCreditCards(false)
    }
  }, [businessId])

  useFocusEffect(
    useCallback(() => {
      fetchBankAccounts()
      fetchCreditCards()
    }, [fetchBankAccounts, fetchCreditCards]),
  )

  const handleAddBankAccount = () => {
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setShowAddModal(false)
      setBankName('')
      setAccountNumber('')
    }
  }

  const handleSubmit = async () => {
    if (!businessId) {
      Alert.alert('Error', 'No business selected')
      return
    }
    if (!bankName.trim()) {
      Alert.alert('Validation Error', 'Please enter a bank name')
      return
    }
    if (!accountNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter an account number')
      return
    }

    try {
      setIsSubmitting(true)
      await bankAccountsApi.addBankAccount(businessId, bankName.trim(), accountNumber.trim())
      setShowAddModal(false)
      setBankName('')
      setAccountNumber('')
      await fetchBankAccounts()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add bank account'
      Alert.alert('Error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddCreditCard = () => {
    setShowAddCreditCardModal(true)
  }

  const handleCloseCreditCardModal = () => {
    if (!isSubmittingCreditCard) {
      setShowAddCreditCardModal(false)
      setCardType('')
      setCardNumber('')
    }
  }

  const handleSubmitCreditCard = async () => {
    if (!businessId) {
      Alert.alert('Error', 'No business selected')
      return
    }
    if (!cardType.trim()) {
      Alert.alert('Validation Error', 'Please enter a card type')
      return
    }
    if (!cardNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a card number')
      return
    }

    try {
      setIsSubmittingCreditCard(true)
      await creditCardsApi.addCreditCard(businessId, cardType.trim(), cardNumber.trim())
      setShowAddCreditCardModal(false)
      setCardType('')
      setCardNumber('')
      await fetchCreditCards()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add credit card'
      Alert.alert('Error', message)
    } finally {
      setIsSubmittingCreditCard(false)
    }
  }

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '')
    // Limit to 16 digits
    const limited = digits.slice(0, 16)
    // Add spaces every 4 digits
    return limited.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  return (
    <AppBarLayout title="Settings" showProfileIcon>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Bank Accounts</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddBankAccount}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : bankAccounts.length > 0 ? (
            <View style={styles.accountsList}>
              {bankAccounts.map((account, index) => (
                <View key={`${account.bankName}-${account.accountNumber}-${index}`} style={styles.accountItem}>
                  <View style={styles.accountIcon}>
                    <MaterialIcons name="account-balance" size={20} color={GRAYSCALE_PRIMARY} />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{account.bankName}</Text>
                    <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No bank accounts added yet</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Credit Cards</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCreditCard}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {loadingCreditCards ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : creditCards.length > 0 ? (
            <View style={styles.accountsList}>
              {creditCards.map((card, index) => (
                <View key={`${card.cardType}-${card.cardNumber}-${index}`} style={styles.accountItem}>
                  <View style={styles.accountIcon}>
                    <MaterialIcons name="credit-card" size={20} color={GRAYSCALE_PRIMARY} />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>{card.cardType}</Text>
                    <Text style={styles.accountNumber}>{card.cardNumber}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No credit cards added yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Bank Account</Text>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    style={styles.closeButton}
                    disabled={isSubmitting}
                  >
                    <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.form}>
                  <Text style={styles.label}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Chase Bank"
                    value={bankName}
                    onChangeText={setBankName}
                    editable={!isSubmitting}
                    autoCapitalize="words"
                  />

                  <Text style={styles.label}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    editable={!isSubmitting}
                    keyboardType="numeric"
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.cancelButton, isSubmitting && styles.buttonDisabled]}
                      onPress={handleCloseModal}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Add</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAddCreditCardModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseCreditCardModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseCreditCardModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Credit Card</Text>
                  <TouchableOpacity
                    onPress={handleCloseCreditCardModal}
                    style={styles.closeButton}
                    disabled={isSubmittingCreditCard}
                  >
                    <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.form}>
                  <Text style={styles.label}>Card Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Business Credit Card"
                    value={cardType}
                    onChangeText={setCardType}
                    editable={!isSubmittingCreditCard}
                    autoCapitalize="words"
                  />

                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    editable={!isSubmittingCreditCard}
                    keyboardType="numeric"
                    maxLength={19}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        isSubmittingCreditCard && styles.buttonDisabled,
                      ]}
                      onPress={handleCloseCreditCardModal}
                      disabled={isSubmittingCreditCard}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        isSubmittingCreditCard && styles.buttonDisabled,
                      ]}
                      onPress={handleSubmitCreditCard}
                      disabled={isSubmittingCreditCard}
                    >
                      {isSubmittingCreditCard ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Add</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  accountsList: {
    gap: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f6f6f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    marginBottom: 2,
  },
  accountNumber: {
    fontSize: 13,
    color: '#999999',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999999',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 4,
    backgroundColor: GRAYSCALE_PRIMARY,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
