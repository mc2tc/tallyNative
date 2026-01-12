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
  Switch,
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
import { businessContextApi } from '../lib/api/businessContext'
import { plansApi, type Plan } from '../lib/api/plans'
import type { VatStatus, BusinessContextPayload } from '../lib/types/api'
import type { StackScreenProps } from '@react-navigation/stack'
import type { SettingsStackParamList } from '../navigation/SettingsNavigator'
import {
  SUPPLY_TYPE_OPTIONS,
  VAT_SCHEME_OPTIONS,
  REGISTRATION_TIMELINE_OPTIONS,
} from '../lib/constants/businessContext'
import { MaterialIcons } from '@expo/vector-icons'

const GRAYSCALE_PRIMARY = '#333333'

type Props = StackScreenProps<SettingsStackParamList, 'SettingsMain'>

const formatPrice = (pence: number): string => {
  if (pence === 0) return 'Free'
  const pounds = pence / 100
  return `£${pounds.toFixed(2)}/month`
}

export default function SettingsScreen({ navigation }: Props) {
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

  const [vatStatus, setVatStatus] = useState<VatStatus | null>(null)
  const [loadingVatStatus, setLoadingVatStatus] = useState(true)
  const [showEditVatModal, setShowEditVatModal] = useState(false)
  const [isSubmittingVat, setIsSubmittingVat] = useState(false)

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)

  // Unit types state
  const [unitTypes, setUnitTypes] = useState<{ volume: 'metric' | 'imperial'; weight: 'metric' | 'imperial' }>({
    volume: 'metric',
    weight: 'metric',
  })
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true)

  // VAT form state
  const [isVatRegistered, setIsVatRegistered] = useState(false)
  const [vatRegistrationNumber, setVatRegistrationNumber] = useState('')
  const [vatRegistrationDate, setVatRegistrationDate] = useState('')
  const [vatScheme, setVatScheme] = useState<'standard' | 'flat_rate' | 'cash_accounting' | 'retail' | 'margin' | 'other'>('standard')
  const [vatFlatRateBusinessType, setVatFlatRateBusinessType] = useState('')
  const [vatFlatRateLimitedCostBusiness, setVatFlatRateLimitedCostBusiness] = useState(false)
  const [vatFlatRatePercentageOverride, setVatFlatRatePercentageOverride] = useState('')
  const [taxableTurnover, setTaxableTurnover] = useState('')
  const [expectedTurnover, setExpectedTurnover] = useState('')
  const [wantsThresholdMonitoring, setWantsThresholdMonitoring] = useState(true)
  const [supplyTypes, setSupplyTypes] = useState<string[]>(['standard_rated'])
  const [partiallyExempt, setPartiallyExempt] = useState(false)
  const [sellsToEU, setSellsToEU] = useState(false)
  const [sellsOutsideEU, setSellsOutsideEU] = useState(false)
  const [importsGoods, setImportsGoods] = useState(false)
  const [exportsGoods, setExportsGoods] = useState(false)
  const [keepReceiptsForVatReclaim, setKeepReceiptsForVatReclaim] = useState(true)
  const [plansToRegister, setPlansToRegister] = useState(false)
  const [registrationTimeline, setRegistrationTimeline] = useState<'next_3_months' | 'next_6_months' | 'next_12_months' | 'unknown'>('unknown')

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

  const fetchVatStatus = useCallback(async () => {
    if (!businessId) {
      setLoadingVatStatus(false)
      return
    }
    try {
      setLoadingVatStatus(true)
      const response = await businessContextApi.getVatStatus(businessId)
      setVatStatus(response.vatStatus)
    } catch (error) {
      console.error('Failed to fetch VAT status:', error)
      setVatStatus(null)
    } finally {
      setLoadingVatStatus(false)
    }
  }, [businessId])

  const fetchCurrentPlan = useCallback(async () => {
    if (!businessId) {
      setLoadingPlan(false)
      return
    }
    try {
      setLoadingPlan(true)
      const plan = await plansApi.getCurrentPlan(businessId)
      setCurrentPlan(plan)
    } catch (error) {
      console.error('Failed to fetch current plan:', error)
      setCurrentPlan(null)
    } finally {
      setLoadingPlan(false)
    }
  }, [businessId])

  const saveUnitTypes = useCallback(async (unitTypesToSave: { volume: 'metric' | 'imperial'; weight: 'metric' | 'imperial' }) => {
    if (!businessId) return

    try {
      // Fetch existing context to preserve other fields
      const existingContext = await businessContextApi.getContext(businessId)
      const { businessId: contextBusinessId, createdAt, updatedAt, createdBy, ...contextFields } = existingContext.context

      // Create payload with existing context plus unit types
      const payload: BusinessContextPayload = {
        businessId,
        createdBy: createdBy || businessUser?.email || 'mobile-user',
        context: {
          ...contextFields,
          unitTypes: unitTypesToSave,
        },
      }

      await businessContextApi.upsert(payload)
    } catch (error) {
      console.error('Failed to save unit types:', error)
      throw error
    }
  }, [businessId, businessUser])

  const fetchUnitTypes = useCallback(async () => {
    if (!businessId) {
      setLoadingUnitTypes(false)
      return
    }
    try {
      setLoadingUnitTypes(true)
      const response = await businessContextApi.getContext(businessId)
      const existingUnitTypes = response.context.unitTypes
      
      // Default to metric if not set
      const defaultUnitTypes = {
        volume: 'metric' as const,
        weight: 'metric' as const,
      }
      
      const currentUnitTypes = {
        volume: existingUnitTypes?.volume || defaultUnitTypes.volume,
        weight: existingUnitTypes?.weight || defaultUnitTypes.weight,
      }
      
      setUnitTypes(currentUnitTypes)
      
      // If unit types don't exist in context, initialize them with defaults
      if (!existingUnitTypes || !existingUnitTypes.volume || !existingUnitTypes.weight) {
        // Save the defaults
        await saveUnitTypes(currentUnitTypes)
      }
    } catch (error) {
      console.error('Failed to fetch unit types:', error)
      // Keep defaults on error
    } finally {
      setLoadingUnitTypes(false)
    }
  }, [businessId, saveUnitTypes])

  useFocusEffect(
    useCallback(() => {
      fetchBankAccounts()
      fetchCreditCards()
      fetchVatStatus()
      fetchCurrentPlan()
      fetchUnitTypes()
    }, [fetchBankAccounts, fetchCreditCards, fetchVatStatus, fetchCurrentPlan, fetchUnitTypes]),
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

  const handleEditVatStatus = () => {
    if (!vatStatus) {
      // Initialize with defaults if no VAT status exists
      setIsVatRegistered(false)
      setVatRegistrationNumber('')
      setVatRegistrationDate('')
      setVatScheme('standard')
      setVatFlatRateBusinessType('')
      setVatFlatRateLimitedCostBusiness(false)
      setVatFlatRatePercentageOverride('')
      setTaxableTurnover('')
      setExpectedTurnover('')
      setWantsThresholdMonitoring(true)
      setSupplyTypes(['standard_rated'])
      setPartiallyExempt(false)
      setSellsToEU(false)
      setSellsOutsideEU(false)
      setImportsGoods(false)
      setExportsGoods(false)
      setKeepReceiptsForVatReclaim(true)
      setPlansToRegister(false)
      setRegistrationTimeline('unknown')
    } else {
      // Populate form with existing VAT status
      setIsVatRegistered(vatStatus.isVatRegistered)
      setVatRegistrationNumber(vatStatus.vatRegistrationNumber || '')
      setVatRegistrationDate(vatStatus.vatRegistrationDate || '')
      setVatScheme(vatStatus.vatScheme || 'standard')
      setVatFlatRateBusinessType(vatStatus.vatFlatRateBusinessType || '')
      setVatFlatRateLimitedCostBusiness(vatStatus.vatFlatRateLimitedCostBusiness || false)
      setVatFlatRatePercentageOverride(
        vatStatus.vatFlatRatePercentageOverride?.toString() || '',
      )
      setTaxableTurnover(vatStatus.taxableTurnoverLast12Months?.toString() || '')
      setExpectedTurnover(vatStatus.expectedTurnoverNext12Months?.toString() || '')
      setWantsThresholdMonitoring(vatStatus.wantsThresholdMonitoring ?? true)
      setSupplyTypes(vatStatus.supplyTypes.length > 0 ? vatStatus.supplyTypes : ['standard_rated'])
      setPartiallyExempt(vatStatus.partiallyExempt || false)
      setSellsToEU(vatStatus.sellsToEU || false)
      setSellsOutsideEU(vatStatus.sellsOutsideEU || false)
      setImportsGoods(vatStatus.importsGoods || false)
      setExportsGoods(vatStatus.exportsGoods || false)
      setKeepReceiptsForVatReclaim(vatStatus.keepReceiptsForVatReclaim ?? true)
      setPlansToRegister(vatStatus.plansToRegister || false)
      setRegistrationTimeline(vatStatus.registrationTimeline || 'unknown')
    }
    setShowEditVatModal(true)
  }

  const handleCloseVatModal = () => {
    if (!isSubmittingVat) {
      setShowEditVatModal(false)
    }
  }

  const parseNumber = (value: string) => {
    if (!value.trim()) return undefined
    const numeric = Number(value.replace(/,/g, ''))
    return Number.isNaN(numeric) ? undefined : numeric
  }

  const toggleSupplyType = (id: string) => {
    setSupplyTypes((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const handleSubmitVatStatus = async () => {
    if (!businessId) {
      Alert.alert('Error', 'No business selected')
      return
    }

    if (isVatRegistered && !vatRegistrationNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a VAT registration number')
      return
    }

    if (supplyTypes.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one supply type')
      return
    }

    try {
      setIsSubmittingVat(true)
      await businessContextApi.updateVatStatus(businessId, {
        isVatRegistered,
        vatRegistrationNumber: isVatRegistered ? vatRegistrationNumber.trim() : null,
        vatRegistrationDate: vatRegistrationDate.trim() || null,
        vatScheme: vatScheme || null,
        vatFlatRateBusinessType: vatFlatRateBusinessType.trim() || null,
        vatFlatRateLimitedCostBusiness: vatFlatRateLimitedCostBusiness || null,
        vatFlatRatePercentageOverride: parseNumber(vatFlatRatePercentageOverride) || null,
        taxableTurnoverLast12Months: parseNumber(taxableTurnover) || null,
        expectedTurnoverNext12Months: parseNumber(expectedTurnover) || null,
        wantsThresholdMonitoring: wantsThresholdMonitoring,
        supplyTypes,
        partiallyExempt: partiallyExempt || null,
        sellsToEU: sellsToEU || null,
        sellsOutsideEU: sellsOutsideEU || null,
        importsGoods: importsGoods || null,
        exportsGoods: exportsGoods || null,
        keepReceiptsForVatReclaim: keepReceiptsForVatReclaim,
        plansToRegister: plansToRegister || null,
        registrationTimeline: registrationTimeline || null,
      })
      setShowEditVatModal(false)
      await fetchVatStatus()
      Alert.alert('Success', 'VAT status updated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update VAT status'
      Alert.alert('Error', message)
    } finally {
      setIsSubmittingVat(false)
    }
  }

  const handleUpdatePlan = () => {
    navigation.navigate('PlansSelection')
  }

  return (
    <AppBarLayout title="Settings" showProfileIcon>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Plan Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Current Plan</Text>
          </View>

          {loadingPlan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : currentPlan ? (
            <View style={styles.planContent}>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Plan:</Text>
                <Text style={styles.planValue}>{currentPlan.planName}</Text>
              </View>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Price:</Text>
                <Text style={styles.planValue}>{formatPrice(currentPlan.price)}</Text>
              </View>
              {currentPlan.inTrial && currentPlan.subscription?.trialEndsAt && (
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>Trial ends:</Text>
                  <Text style={styles.planValue}>
                    {new Date(currentPlan.subscription.trialEndsAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.updatePlanButton}
                onPress={handleUpdatePlan}
                activeOpacity={0.7}
              >
                <Text style={styles.updatePlanButtonText}>Update plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Plan information not available</Text>
            </View>
          )}
        </View>

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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>VAT Status</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleEditVatStatus}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={20} color={GRAYSCALE_PRIMARY} />
              <Text style={styles.addButtonText}>{vatStatus ? 'Edit' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          {loadingVatStatus ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : vatStatus ? (
            <View style={styles.vatStatusContent}>
              <View style={styles.vatStatusRow}>
                <Text style={styles.vatStatusLabel}>Registered:</Text>
                <Text style={styles.vatStatusValue}>
                  {vatStatus.isVatRegistered ? 'Yes' : 'No'}
                </Text>
              </View>

              {vatStatus.vatRegistrationNumber && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>VAT Number:</Text>
                  <Text style={styles.vatStatusValue}>{vatStatus.vatRegistrationNumber}</Text>
                </View>
              )}

              {vatStatus.vatRegistrationDate && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>Registration Date:</Text>
                  <Text style={styles.vatStatusValue}>
                    {new Date(vatStatus.vatRegistrationDate).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {vatStatus.vatScheme && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>Scheme:</Text>
                  <Text style={styles.vatStatusValue}>
                    {vatStatus.vatScheme
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </Text>
                </View>
              )}

              {vatStatus.vatFlatRateBusinessType && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>Flat Rate Type:</Text>
                  <Text style={styles.vatStatusValue}>{vatStatus.vatFlatRateBusinessType}</Text>
                </View>
              )}

              {vatStatus.supplyTypes.length > 0 && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>Supply Types:</Text>
                  <Text style={styles.vatStatusValue}>
                    {vatStatus.supplyTypes
                      .map((type) =>
                        type
                          .split('_')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' '),
                      )
                      .join(', ')}
                  </Text>
                </View>
              )}

              {vatStatus.plansToRegister && (
                <View style={styles.vatStatusRow}>
                  <Text style={styles.vatStatusLabel}>Plans to Register:</Text>
                  <Text style={styles.vatStatusValue}>Yes</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>VAT information not available</Text>
            </View>
          )}
        </View>

        {/* Unit Types Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Unit Types</Text>
          </View>

          {loadingUnitTypes ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666666" />
            </View>
          ) : (
            <View style={styles.unitTypesContent}>
              <View style={styles.unitTypesRow}>
                <Text style={styles.unitTypesLabel}>Volume:</Text>
                <Text style={styles.unitTypesValue}>
                  {unitTypes.volume === 'metric' ? 'Metric (L, mL)' : 'Imperial (gal, fl oz)'}
                </Text>
              </View>
              <View style={styles.unitTypesRow}>
                <Text style={styles.unitTypesLabel}>Weight:</Text>
                <Text style={styles.unitTypesValue}>
                  {unitTypes.weight === 'metric' ? 'Metric (kg, g)' : 'Imperial (lb, oz)'}
                </Text>
              </View>
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

      <Modal
        visible={showEditVatModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseVatModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseVatModal}
        >
            <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <ScrollView
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit VAT Status</Text>
                    <TouchableOpacity
                      onPress={handleCloseVatModal}
                      style={styles.closeButton}
                      disabled={isSubmittingVat}
                    >
                      <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.form}>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Currently VAT registered</Text>
                      <Switch
                        value={isVatRegistered}
                        onValueChange={setIsVatRegistered}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    {isVatRegistered && (
                      <>
                        <Text style={styles.label}>VAT Registration Number</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., GB123456789"
                          value={vatRegistrationNumber}
                          onChangeText={setVatRegistrationNumber}
                          editable={!isSubmittingVat}
                          autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Registration Date</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="YYYY-MM-DD"
                          value={vatRegistrationDate}
                          onChangeText={setVatRegistrationDate}
                          editable={!isSubmittingVat}
                        />
                      </>
                    )}

                    <Text style={styles.label}>VAT Scheme</Text>
                    <View style={styles.chipRow}>
                      {VAT_SCHEME_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.chip,
                            vatScheme === option.id && styles.chipSelected,
                            isSubmittingVat && styles.chipDisabled,
                          ]}
                          onPress={() => setVatScheme(option.id as typeof vatScheme)}
                          disabled={isSubmittingVat}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              vatScheme === option.id && styles.chipTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {vatScheme === 'flat_rate' && (
                      <>
                        <Text style={styles.label}>Flat Rate Business Type</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., IT consultant"
                          value={vatFlatRateBusinessType}
                          onChangeText={setVatFlatRateBusinessType}
                          editable={!isSubmittingVat}
                        />

                        <View style={styles.switchRow}>
                          <Text style={styles.switchLabel}>Limited cost business</Text>
                          <Switch
                            value={vatFlatRateLimitedCostBusiness}
                            onValueChange={setVatFlatRateLimitedCostBusiness}
                            disabled={isSubmittingVat}
                          />
                        </View>

                        <Text style={styles.label}>Flat Rate Percentage Override</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 14.5"
                          value={vatFlatRatePercentageOverride}
                          onChangeText={setVatFlatRatePercentageOverride}
                          editable={!isSubmittingVat}
                          keyboardType="numeric"
                        />
                      </>
                    )}

                    <Text style={styles.label}>Supply Types</Text>
                    <View style={styles.chipRow}>
                      {SUPPLY_TYPE_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.chip,
                            supplyTypes.includes(option.id) && styles.chipSelected,
                            isSubmittingVat && styles.chipDisabled,
                          ]}
                          onPress={() => toggleSupplyType(option.id)}
                          disabled={isSubmittingVat}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              supplyTypes.includes(option.id) && styles.chipTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Taxable Turnover Last 12 Months</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter amount"
                      value={taxableTurnover}
                      onChangeText={setTaxableTurnover}
                      editable={!isSubmittingVat}
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Expected Turnover Next 12 Months</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter amount"
                      value={expectedTurnover}
                      onChangeText={setExpectedTurnover}
                      editable={!isSubmittingVat}
                      keyboardType="numeric"
                    />

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Wants threshold monitoring</Text>
                      <Switch
                        value={wantsThresholdMonitoring}
                        onValueChange={setWantsThresholdMonitoring}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Partially exempt</Text>
                      <Switch
                        value={partiallyExempt}
                        onValueChange={setPartiallyExempt}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Sells to EU</Text>
                      <Switch
                        value={sellsToEU}
                        onValueChange={setSellsToEU}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Sells outside EU</Text>
                      <Switch
                        value={sellsOutsideEU}
                        onValueChange={setSellsOutsideEU}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Imports goods</Text>
                      <Switch
                        value={importsGoods}
                        onValueChange={setImportsGoods}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Exports goods</Text>
                      <Switch
                        value={exportsGoods}
                        onValueChange={setExportsGoods}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Keep receipts for VAT reclaim</Text>
                      <Switch
                        value={keepReceiptsForVatReclaim}
                        onValueChange={setKeepReceiptsForVatReclaim}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Plans to register</Text>
                      <Switch
                        value={plansToRegister}
                        onValueChange={setPlansToRegister}
                        disabled={isSubmittingVat}
                      />
                    </View>

                    {plansToRegister && (
                      <>
                        <Text style={styles.label}>Registration Timeline</Text>
                        <View style={styles.chipRow}>
                          {REGISTRATION_TIMELINE_OPTIONS.map((option) => (
                            <TouchableOpacity
                              key={option.id}
                              style={[
                                styles.chip,
                                registrationTimeline === option.id && styles.chipSelected,
                                isSubmittingVat && styles.chipDisabled,
                              ]}
                              onPress={() =>
                                setRegistrationTimeline(option.id as typeof registrationTimeline)
                              }
                              disabled={isSubmittingVat}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  registrationTimeline === option.id && styles.chipTextSelected,
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.cancelButton, isSubmittingVat && styles.buttonDisabled]}
                        onPress={handleCloseVatModal}
                        disabled={isSubmittingVat}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitButton, isSubmittingVat && styles.buttonDisabled]}
                        onPress={handleSubmitVatStatus}
                        disabled={isSubmittingVat}
                      >
                        {isSubmittingVat ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.submitButtonText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                </ScrollView>
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
  vatStatusContent: {
    gap: 12,
  },
  vatStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vatStatusLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  vatStatusValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
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
    maxHeight: '90%',
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
  modalScrollView: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderColor: GRAYSCALE_PRIMARY,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  planContent: {
    gap: 12,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  planValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  updatePlanButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },
  updatePlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  unitTypesContent: {
    gap: 12,
  },
  unitTypesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unitTypesLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  unitTypesValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
})
