import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../../lib/auth/AuthContext'
import { businessContextApi } from '../../lib/api/businessContext'
import {
  MAIN_CATEGORY_OPTIONS,
  REGISTRATION_TIMELINE_OPTIONS,
  SUBCATEGORY_OPTIONS,
  SUPPLY_TYPE_OPTIONS,
  VAT_SCHEME_OPTIONS,
  getDefaultSubcategory,
} from '../../lib/constants/businessContext'
import type { BusinessContextPayload } from '../../lib/types/api'
import { ApiError } from '../../lib/api/client'

type SupplyTypeId = (typeof SUPPLY_TYPE_OPTIONS)[number]['id']
type VatSchemeId = (typeof VAT_SCHEME_OPTIONS)[number]['id']
type TimelineId = (typeof REGISTRATION_TIMELINE_OPTIONS)[number]['id']

export default function BusinessContextScreen() {
  const {
    user,
    businessUser,
    memberships,
    refreshAuthState,
    markBusinessContextComplete,
  } = useAuth()
  const [primaryCurrency, setPrimaryCurrency] = useState('GBP')
  const [secondaryCurrenciesInput, setSecondaryCurrenciesInput] = useState('')
  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeId[]>(['standard_rated'])
  const [mainCategory, setMainCategory] = useState('Services')
  const [subCategory, setSubCategory] = useState('Professional Services')
  const [isVatRegistered, setIsVatRegistered] = useState(false)
  const [vatRegistrationNumber, setVatRegistrationNumber] = useState('')
  const [vatRegistrationDate, setVatRegistrationDate] = useState('')
  const [vatScheme, setVatScheme] = useState<VatSchemeId>('standard')
  const [taxableTurnover, setTaxableTurnover] = useState('')
  const [expectedTurnover, setExpectedTurnover] = useState('')
  const [wantsThresholdMonitoring, setWantsThresholdMonitoring] = useState(true)
  const [keepReceiptsForVatReclaim, setKeepReceiptsForVatReclaim] = useState(true)
  const [partiallyExempt, setPartiallyExempt] = useState(false)
  const [sellsToEU, setSellsToEU] = useState(false)
  const [sellsOutsideEU, setSellsOutsideEU] = useState(false)
  const [importsGoods, setImportsGoods] = useState(false)
  const [exportsGoods, setExportsGoods] = useState(false)
  const [plansToRegister, setPlansToRegister] = useState(false)
  const [registrationTimeline, setRegistrationTimeline] = useState<TimelineId>('unknown')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(0)

  const STEPS = [
    { title: 'Business basics', description: 'Currencies and industry' },
    { title: 'VAT status', description: 'Registration details and scheme' },
    { title: 'Supply & turnover', description: 'Supply types and revenue' },
    { title: 'Operations', description: 'Trading profile & monitoring' },
  ]

  const membershipBusinessId = businessUser?.businessId || Object.keys(memberships ?? {})[0]
  const createdBy = user?.email || user?.uid || ''

  const availableSubcategories = useMemo(() => {
    return SUBCATEGORY_OPTIONS[mainCategory as keyof typeof SUBCATEGORY_OPTIONS] ?? [{ id: 'Professional Services', label: 'Professional Services' }]
  }, [mainCategory])

  const toggleSupplyType = (id: SupplyTypeId) => {
    setSupplyTypes((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const handleMainCategoryChange = (categoryId: string) => {
    setMainCategory(categoryId)
    setSubCategory(getDefaultSubcategory(categoryId))
  }

  const parseCurrencyList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length === 3)

  const parseNumber = (value: string) => {
    if (!value.trim()) return undefined
    const numeric = Number(value.replace(/,/g, ''))
    return Number.isNaN(numeric) ? undefined : numeric
  }

  const validateStep = () => {
    if (step === 0) {
      if (!primaryCurrency.trim()) {
        Alert.alert('Missing currency', 'Primary currency is required.')
        return false
      }
      return true
    }
    if (step === 1) {
      if (isVatRegistered && !vatRegistrationNumber.trim()) {
        Alert.alert('VAT details', 'Enter a VAT registration number.')
        return false
      }
      return true
    }
    if (step === 2) {
      if (supplyTypes.length === 0) {
        Alert.alert('Supply types', 'Select at least one supply type.')
        return false
      }
      return true
    }
    return true
  }

  const handleSubmit = async () => {
    if (!membershipBusinessId) {
      Alert.alert('Missing business', 'We could not determine the business to update.')
      return
    }

    const payload: BusinessContextPayload = {
      businessId: membershipBusinessId,
      createdBy: createdBy || 'mobile-user',
      context: {
        primaryCurrency: primaryCurrency.trim().toUpperCase(),
        secondaryCurrencies: parseCurrencyList(secondaryCurrenciesInput),
        supplyTypes,
        mainCategory,
        subCategory,
        isVatRegistered,
        vatScheme,
        vatRegistrationNumber: isVatRegistered ? vatRegistrationNumber.trim() : undefined,
        vatRegistrationDate: vatRegistrationDate.trim() || undefined,
        taxableTurnoverLast12Months: parseNumber(taxableTurnover),
        expectedTurnoverNext12Months: parseNumber(expectedTurnover),
        wantsThresholdMonitoring,
        keepReceiptsForVatReclaim,
        partiallyExempt,
        sellsToEU,
        sellsOutsideEU,
        importsGoods,
        exportsGoods,
        plansToRegister,
        registrationTimeline,
      },
    }

    if (!payload.context.secondaryCurrencies || payload.context.secondaryCurrencies.length === 0) {
      delete payload.context.secondaryCurrencies
    }

    if (!payload.context.vatRegistrationNumber) {
      delete payload.context.vatRegistrationNumber
    }

    if (!payload.context.vatRegistrationDate) {
      delete payload.context.vatRegistrationDate
    }

    if (payload.context.taxableTurnoverLast12Months === undefined) {
      delete payload.context.taxableTurnoverLast12Months
    }

    if (payload.context.expectedTurnoverNext12Months === undefined) {
      delete payload.context.expectedTurnoverNext12Months
    }

    setIsSubmitting(true)
    try {
      await businessContextApi.upsert(payload)
      markBusinessContextComplete()
      await refreshAuthState()
      Alert.alert('Success', 'Your VAT profile has been saved.')
    } catch (error) {
      let message = 'Failed to save business context.'
      if (error instanceof ApiError) {
        message = error.message
      } else if (error instanceof Error) {
        message = error.message
      }
      Alert.alert('Save failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (!validateStep()) {
      return
    }
    if (step === STEPS.length - 1) {
      void handleSubmit()
      return
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Section title="Business details">
            <TextInput
              style={styles.input}
              placeholder="Primary currency (e.g. GBP)"
              autoCapitalize="characters"
              value={primaryCurrency}
              onChangeText={setPrimaryCurrency}
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Secondary currencies (comma separated)"
              autoCapitalize="characters"
              value={secondaryCurrenciesInput}
              onChangeText={setSecondaryCurrenciesInput}
              editable={!isSubmitting}
            />
            <Text style={styles.label}>Main category</Text>
            <View style={styles.chipRow}>
              {MAIN_CATEGORY_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={mainCategory === option.id}
                  onPress={() => handleMainCategoryChange(option.id)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
            <Text style={styles.label}>Subcategory</Text>
            <View style={styles.chipRow}>
              {availableSubcategories.map((option: { id: string; label: string }) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={subCategory === option.id}
                  onPress={() => setSubCategory(option.id)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
          </Section>
        )
      case 1:
        return (
          <Section title="VAT status">
            <SwitchRow
              label="Currently VAT registered"
              value={isVatRegistered}
              onValueChange={setIsVatRegistered}
              disabled={isSubmitting}
            />
            {isVatRegistered ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="VAT registration number"
                  value={vatRegistrationNumber}
                  onChangeText={setVatRegistrationNumber}
                  editable={!isSubmitting}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Registration date (YYYY-MM-DD)"
                  value={vatRegistrationDate}
                  onChangeText={setVatRegistrationDate}
                  editable={!isSubmitting}
                />
              </>
            ) : null}
            <Text style={styles.label}>VAT scheme</Text>
            <View style={styles.chipRow}>
              {VAT_SCHEME_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={vatScheme === option.id}
                  onPress={() => setVatScheme(option.id as VatSchemeId)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
            <SwitchRow
              label="Plans to register soon"
              value={plansToRegister}
              onValueChange={setPlansToRegister}
              disabled={isSubmitting}
            />
            <Text style={styles.label}>Registration timeline</Text>
            <View style={styles.chipRow}>
              {REGISTRATION_TIMELINE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={registrationTimeline === option.id}
                  onPress={() => setRegistrationTimeline(option.id as TimelineId)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
          </Section>
        )
      case 2:
        return (
          <>
            <Section title="Supply types">
              <View style={styles.chipRow}>
                {SUPPLY_TYPE_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    selected={supplyTypes.includes(option.id as SupplyTypeId)}
                    onPress={() => toggleSupplyType(option.id as SupplyTypeId)}
                    disabled={isSubmitting}
                  />
                ))}
              </View>
            </Section>
            <Section title="Turnover">
              <TextInput
                style={styles.input}
                placeholder="Taxable turnover last 12 months"
                keyboardType="numeric"
                value={taxableTurnover}
                onChangeText={setTaxableTurnover}
                editable={!isSubmitting}
              />
              <TextInput
                style={styles.input}
                placeholder="Expected turnover next 12 months"
                keyboardType="numeric"
                value={expectedTurnover}
                onChangeText={setExpectedTurnover}
                editable={!isSubmitting}
              />
            </Section>
          </>
        )
      case 3:
      default:
        return (
          <Section title="Operations">
            <SwitchRow
              label="Partially exempt"
              value={partiallyExempt}
              onValueChange={setPartiallyExempt}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Sells to EU"
              value={sellsToEU}
              onValueChange={setSellsToEU}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Sells outside EU"
              value={sellsOutsideEU}
              onValueChange={setSellsOutsideEU}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Imports goods"
              value={importsGoods}
              onValueChange={setImportsGoods}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Exports goods"
              value={exportsGoods}
              onValueChange={setExportsGoods}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Wants VAT threshold monitoring"
              value={wantsThresholdMonitoring}
              onValueChange={setWantsThresholdMonitoring}
              disabled={isSubmitting}
            />
            <SwitchRow
              label="Keep receipts for VAT reclaim"
              value={keepReceiptsForVatReclaim}
              onValueChange={setKeepReceiptsForVatReclaim}
              disabled={isSubmitting}
            />
          </Section>
        )
    }
  }

  const renderProgress = () => {
    return (
      <View style={styles.progressContainer}>
        {STEPS.map((item, index) => {
          const completed = index < step
          const current = index === step
          return (
            <View key={item.title} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  completed && styles.progressCircleCompleted,
                  current && styles.progressCircleCurrent,
                ]}
              >
                <Text style={styles.progressCircleText}>{index + 1}</Text>
              </View>
              <Text style={styles.progressTitle}>{item.title}</Text>
              <Text style={styles.progressDescription}>{item.description}</Text>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>VAT profile</Text>
        <Text style={styles.subtitle}>
          Tell us about the business so we can configure VAT rules and the chart of accounts.
        </Text>
        {renderProgress()}

        {renderStepContent()}

        <View style={styles.footerButtons}>
          {step > 0 ? (
            <TouchableOpacity
              style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleBack}
              disabled={isSubmitting}
            >
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>
                {step === STEPS.length - 1 ? 'Save & finish' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressStep: {
    marginBottom: 10,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginBottom: 6,
  },
  progressCircleCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  progressCircleCurrent: {
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
  },
  progressCircleText: {
    color: '#111827',
    fontWeight: '600',
  },
  progressTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  progressDescription: {
    color: '#6b7280',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
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
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 160,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#fff',
  },
  secondaryText: {
    fontWeight: '600',
    color: '#111827',
  },
  placeholderButton: {
    width: 120,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})


