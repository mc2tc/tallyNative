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
import type { StackScreenProps } from '@react-navigation/stack'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from '../../lib/auth/AuthContext'
import { ApiError } from '../../lib/api/client'
import type { AuthStackParamList } from '../../navigation/AuthNavigator'
import { getFirebaseAuth } from '../../lib/config/firebase'
import { authApi } from '../../lib/api/auth'
import { businessContextApi } from '../../lib/api/businessContext'
import {
  MAIN_CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
  SUPPLY_TYPE_OPTIONS,
  VAT_SCHEME_OPTIONS,
  REGISTRATION_TIMELINE_OPTIONS,
  getDefaultSubcategory,
} from '../../lib/constants/businessContext'
import type { BusinessContextPayload } from '../../lib/types/api'

type Props = StackScreenProps<AuthStackParamList, 'SignUp'>

type SupplyTypeId = (typeof SUPPLY_TYPE_OPTIONS)[number]['id']
type VatSchemeId = NonNullable<BusinessContextPayload['context']['vatScheme']>
type TimelineId = NonNullable<BusinessContextPayload['context']['registrationTimeline']>
type SubcategoryMap = typeof SUBCATEGORY_OPTIONS
type MainCategoryId = keyof SubcategoryMap
type SubcategoryOption = SubcategoryMap[MainCategoryId][number]

const BUSINESS_TYPE_OPTIONS = [
  { id: 'sole_trader', label: 'Sole trader' },
  { id: 'partnership', label: 'Partnership' },
  { id: 'limited_company', label: 'Limited company' },
  { id: 'llp', label: 'Limited liability partnership (LLP)' },
  { id: 'not_registered', label: 'Not registered yet' },
] as const

type BusinessTypeId = (typeof BUSINESS_TYPE_OPTIONS)[number]['id']

export default function SignUpScreen({ navigation }: Props) {
  const { refreshAuthState, markBusinessContextComplete } = useAuth()

  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const maxStepIndex = 7

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(null)
  const [mainCategory, setMainCategory] = useState<MainCategoryId>('Services')
  const [subCategory, setSubCategory] = useState('Professional Services')

  const [vatStatusSelected, setVatStatusSelected] = useState<'registered' | 'plans' | null>(null)
  const [isVatRegistered, setIsVatRegistered] = useState(false)
  const [vatRegistrationNumber, setVatRegistrationNumber] = useState('')
  const [vatRegistrationDate, setVatRegistrationDate] = useState('')
  const [vatScheme, setVatScheme] = useState<VatSchemeId>('standard')
  const [plansToRegister, setPlansToRegister] = useState(false)
  const [registrationTimeline, setRegistrationTimeline] = useState<TimelineId>('unknown')

  const [supplyTypes, setSupplyTypes] = useState<SupplyTypeId[]>(['standard_rated'])
  const [taxableTurnover, setTaxableTurnover] = useState('')
  const [expectedTurnover, setExpectedTurnover] = useState('')

  const [wantsThresholdMonitoring, setWantsThresholdMonitoring] = useState(true)
  const [keepReceiptsForVatReclaim, setKeepReceiptsForVatReclaim] = useState(true)
  const [partiallyExempt, setPartiallyExempt] = useState(false)
  const [sellsToEU, setSellsToEU] = useState(false)
  const [sellsOutsideEU, setSellsOutsideEU] = useState(false)
  const [importsGoods, setImportsGoods] = useState(false)
  const [exportsGoods, setExportsGoods] = useState(false)
  const [overOrExpectedThreshold, setOverOrExpectedThreshold] = useState(false)
  const [onlyExemptSupplies, setOnlyExemptSupplies] = useState(false)

  const mainCategoryOptions = useMemo(
    () => MAIN_CATEGORY_OPTIONS.filter((option) => option.id !== 'Personal'),
    [],
  )

  const fallbackSubcategory: SubcategoryOption = {
    id: 'Professional Services',
    label: 'Professional Services',
  }

  const availableSubcategories = useMemo<SubcategoryOption[]>(() => {
    const list = SUBCATEGORY_OPTIONS[mainCategory] as readonly SubcategoryOption[] | undefined
    if (list && list.length > 0) {
      return Array.from(list)
    }
    return [fallbackSubcategory]
  }, [mainCategory])

  const toggleSupplyType = (id: SupplyTypeId) => {
    setSupplyTypes((prev) => {
      if (prev.includes(id)) {
        return prev.filter((value) => value !== id)
      }
      return [...prev, id]
    })
  }

  const handleMainCategoryChange = (categoryId: MainCategoryId) => {
    setMainCategory(categoryId)
    setSubCategory(getDefaultSubcategory(categoryId))
  }

  const parseNumber = (value: string) => {
    if (!value.trim()) return undefined
    const numeric = Number(value.replace(/,/g, ''))
    return Number.isNaN(numeric) ? undefined : numeric
  }

  const validateStep = () => {
    switch (step) {
      case 0:
        if (!firstName.trim() || !lastName.trim()) {
          Alert.alert('Missing info', 'Please enter your first and last name.')
          return false
        }
        if (!email.trim()) {
          Alert.alert('Missing email', 'Please enter your email.')
          return false
        }
        if (password.length < 6) {
          Alert.alert('Password', 'Password must be at least 6 characters.')
          return false
        }
        return true
      case 1:
        if (!businessName.trim()) {
          Alert.alert('Missing business name', 'Please enter the business name.')
          return false
        }
        if (!businessType) {
          Alert.alert('Missing business type', 'Please select a business type.')
          return false
        }
        return true
      case 2:
        // Main category selection - validation handled by default selection
        return true
      case 3:
        if (!subCategory.trim()) {
          Alert.alert('Missing subcategory', 'Please select a subcategory.')
          return false
        }
        return true
      case 4:
        // VAT status is optional - user can skip
        return true
      case 5:
        if (vatStatusSelected === 'registered') {
          if (!vatRegistrationNumber.trim()) {
            Alert.alert('VAT number', 'Enter a VAT registration number.')
            return false
          }
          if (supplyTypes.length === 0) {
            Alert.alert('Supply types', 'Select at least one supply type.')
            return false
          }
        } else if (vatStatusSelected === 'plans') {
          // Timeline is optional, no validation needed
        }
        // If vatStatusSelected is null, user skipped - no validation needed
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step === maxStepIndex) {
      void handleSubmit()
      return
    }
    setStep((prev) => Math.min(prev + 1, maxStepIndex))
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      Alert.alert('Missing email', 'Please enter your email address.')
      return
    }

    const auth = getFirebaseAuth()
    setIsSubmitting(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      await new Promise((resolve) => setTimeout(resolve, 100))
      await userCredential.user.getIdToken(true)

      const bootstrapResponse = await authApi.bootstrapOwner({
        owner: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: trimmedEmail,
        },
        businesses: businessName.trim()
          ? [
              {
                businessName: businessName.trim(),
              },
            ]
          : undefined,
        createPersonalBusiness: true,
      })

      const trimmedBusinessName = businessName.trim()
      const createdBusiness =
        (trimmedBusinessName
          ? bootstrapResponse.businesses.find((b) => b.name === trimmedBusinessName)
          : undefined) ||
        bootstrapResponse.businesses.find((b) => !/personal/i.test(b.name)) ||
        bootstrapResponse.businesses[0]

      const createdBusinessId = createdBusiness?.id
      if (!createdBusinessId) {
        throw new Error('Could not determine business ID from bootstrap response.')
      }

      const isRegistered = vatStatusSelected === 'registered'
      const isPlanning = vatStatusSelected === 'plans'

      const trimmedVrn = vatRegistrationNumber.trim()
      const trimmedDate = vatRegistrationDate.trim()

      const context: BusinessContextPayload['context'] = {
        primaryCurrency: 'GBP',
        supplyTypes,
        mainCategory,
        subCategory,
        businessType: businessType || 'not_registered',
        // VAT status expressed with explicit booleans/nulls
        isVatRegistered: !onlyExemptSupplies && isRegistered,
        plansToRegister: !onlyExemptSupplies && isPlanning,
        registrationTimeline: !onlyExemptSupplies && isPlanning ? registrationTimeline : 'unknown',
        vatRegistrationNumber: !onlyExemptSupplies && isRegistered && trimmedVrn ? trimmedVrn : null,
        vatRegistrationDate: !onlyExemptSupplies && isRegistered && trimmedDate ? trimmedDate : null,
        vatScheme: !onlyExemptSupplies && isRegistered ? vatScheme : null,
        // numeric fields: null when not provided
        taxableTurnoverLast12Months: parseNumber(taxableTurnover) ?? null,
        expectedTurnoverNext12Months: parseNumber(expectedTurnover) ?? null,
        // operations: explicit booleans; disable when only-exempt or no VAT path
        wantsThresholdMonitoring: !onlyExemptSupplies && (isRegistered || isPlanning)
          ? wantsThresholdMonitoring
          : false,
        keepReceiptsForVatReclaim: !onlyExemptSupplies && (isRegistered || isPlanning)
          ? keepReceiptsForVatReclaim
          : false,
        partiallyExempt: !onlyExemptSupplies && (isRegistered || isPlanning) ? partiallyExempt : false,
        sellsToEU: !onlyExemptSupplies && (isRegistered || isPlanning) ? sellsToEU : false,
        sellsOutsideEU: !onlyExemptSupplies && (isRegistered || isPlanning) ? sellsOutsideEU : false,
        importsGoods: !onlyExemptSupplies && (isRegistered || isPlanning) ? importsGoods : false,
        exportsGoods: !onlyExemptSupplies && (isRegistered || isPlanning) ? exportsGoods : false,
      }

      const payload: BusinessContextPayload = {
        businessId: createdBusinessId,
        createdBy: trimmedEmail,
        context,
      }

      // Remove only truly undefined (shouldn't exist) but keep nulls/booleans
      if (payload.context.taxableTurnoverLast12Months === undefined) {
        delete payload.context.taxableTurnoverLast12Months
      }
      if (payload.context.expectedTurnoverNext12Months === undefined) {
        delete payload.context.expectedTurnoverNext12Months
      }

      // Final normalization: JSON round-trip drops any stray undefineds (keeps nulls)
      payload.context = JSON.parse(JSON.stringify(payload.context)) as typeof payload.context

      await businessContextApi.upsert(payload)
      markBusinessContextComplete()
      await refreshAuthState()
    } catch (error) {
      let message = 'Failed to create account. Please try again.'
      if (error instanceof ApiError) {
        message = error.message
        if (error.status === 0) {
          message = `${error.message}\n\nPlease check:\n• Next.js server is running\n• Network connection is active\n• API base URL is correct`
        }
      } else if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          message = 'An account with this email already exists'
        } else if (error.message.includes('invalid-email')) {
          message = 'Invalid email address'
        } else if (error.message.includes('weak-password')) {
          message = 'Password is too weak'
        } else {
          message = error.message
        }
      }
      Alert.alert('Sign Up Failed', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Section title="Account details">
            <TextInput
              style={styles.input}
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              editable={!isSubmitting}
            />
          </Section>
        )
      case 1:
        return (
          <Section title="Business basics">
            <TextInput
              style={styles.input}
              placeholder="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              editable={!isSubmitting}
            />
            <Text style={styles.label}>Business type</Text>
            <View style={styles.chipRow}>
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={businessType === option.id}
                  onPress={() => setBusinessType(option.id)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
            <SwitchRow
              label="Turnover over or expected to exceed £90,000"
              value={overOrExpectedThreshold}
              onValueChange={(next) => {
                setOverOrExpectedThreshold(next)
                if (next && vatStatusSelected !== 'registered') {
                  setVatStatusSelected('plans')
                  setIsVatRegistered(false)
                  setPlansToRegister(true)
                }
              }}
              disabled={isSubmitting}
            />
          </Section>
        )
      case 2:
        return (
          <Section title="Category">
            <Text style={styles.instructions}>
              Select the main category that best describes your business.
            </Text>
            <View style={styles.chipRow}>
              {mainCategoryOptions.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={mainCategory === option.id}
                  onPress={() => handleMainCategoryChange(option.id as MainCategoryId)}
                  disabled={isSubmitting}
                />
              ))}
            </View>
          </Section>
        )
      case 3:
        return (
          <Section title={mainCategory}>
            <Text style={styles.instructions}>
              Select the subcategory that best describes the business.
            </Text>
            <View style={styles.chipRow}>
              {availableSubcategories.map((option) => (
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
      case 4:
        // Skip VAT status if business is not registered
        if (businessType === 'not_registered') {
          return null
        }
        return (
          <Section title="VAT status">
            <Text style={styles.instructions}>
              Select an option below, or click Next to skip if VAT registration doesn't apply to your business.
            </Text>
            {!onlyExemptSupplies && (
              <TouchableOpacity
                style={[
                  styles.vatButton,
                  vatStatusSelected === 'registered' && styles.vatButtonSelected,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={() => {
                  setVatStatusSelected('registered')
                  setIsVatRegistered(true)
                  setPlansToRegister(false)
                  setOnlyExemptSupplies(false)
                  setStep((prev) => Math.min(prev + 1, maxStepIndex))
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.vatButtonText,
                    vatStatusSelected === 'registered' && styles.vatButtonTextSelected,
                  ]}
                >
                  Currently VAT registered
                </Text>
              </TouchableOpacity>
            )}
            {!onlyExemptSupplies && (
              <TouchableOpacity
                style={[
                  styles.vatButton,
                  vatStatusSelected === 'plans' && styles.vatButtonSelected,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={() => {
                  setVatStatusSelected('plans')
                  setIsVatRegistered(false)
                  setPlansToRegister(true)
                  setOnlyExemptSupplies(false)
                  setStep((prev) => Math.min(prev + 1, maxStepIndex))
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.vatButtonText,
                    vatStatusSelected === 'plans' && styles.vatButtonTextSelected,
                  ]}
                >
                  Plans to register soon
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.vatButton,
                onlyExemptSupplies && styles.vatButtonSelected,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={() => {
                setOnlyExemptSupplies(true)
                setVatStatusSelected(null)
                setIsVatRegistered(false)
                setPlansToRegister(false)
                setStep((prev) => Math.min(prev + 1, maxStepIndex))
              }}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.vatButtonText,
                  onlyExemptSupplies && styles.vatButtonTextSelected,
                ]}
              >
                Makes only VAT-exempt supplies
              </Text>
            </TouchableOpacity>
          </Section>
        )
      case 5:
        // Skip VAT details if business is not registered or only exempt supplies
        if (businessType === 'not_registered' || onlyExemptSupplies) {
          return null
        }
        if (vatStatusSelected === 'registered') {
          return (
            <>
              <Section title="VAT registration details">
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
              </Section>
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
            </>
          )
        } else if (vatStatusSelected === 'plans') {
          return (
            <Section title="Registration timeline">
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
        }
        return null
      case 6:
      default:
        // Skip Operations if business is not registered, only exempt, or VAT status was not selected
        if (businessType === 'not_registered' || onlyExemptSupplies || !vatStatusSelected) {
          return null
        }
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
      case 7:
        return (
          <Section title="Review & confirm">
            <Text style={styles.label}>Account</Text>
            <Text style={styles.instructions}>
              {firstName} {lastName} · {email}
            </Text>

            <Text style={styles.label}>Business</Text>
            <Text style={styles.instructions}>
              {businessName || '—'} · {businessType || '—'}
            </Text>

            <Text style={styles.label}>Category</Text>
            <Text style={styles.instructions}>
              {mainCategory} · {subCategory}
            </Text>

            {businessType !== 'not_registered' && (
              <>
                <Text style={styles.label}>VAT</Text>
                <Text style={styles.instructions}>
                  {onlyExemptSupplies
                    ? 'Makes only VAT-exempt supplies'
                    : vatStatusSelected === 'registered'
                    ? `Registered · VRN: ${vatRegistrationNumber || '—'} · Date: ${
                        vatRegistrationDate || '—'
                      } · Scheme: ${vatScheme}`
                    : vatStatusSelected === 'plans'
                    ? `Plans to register soon · Timeline: ${registrationTimeline}`
                    : 'Not registered'}
                </Text>
                {vatStatusSelected === 'registered' && (
                  <Text style={styles.instructions}>
                    Supply types: {supplyTypes.length ? supplyTypes.join(', ') : '—'}
                  </Text>
                )}
              </>
            )}

            {businessType !== 'not_registered' && !onlyExemptSupplies && vatStatusSelected && (
              <>
                <Text style={styles.label}>Operations</Text>
                <Text style={styles.instructions}>
                  Partially exempt: {partiallyExempt ? 'Yes' : 'No'} · Sells to EU: {sellsToEU ? 'Yes' : 'No'} ·
                  Outside EU: {sellsOutsideEU ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.instructions}>
                  Imports: {importsGoods ? 'Yes' : 'No'} · Exports: {exportsGoods ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.instructions}>
                  Threshold monitoring: {wantsThresholdMonitoring ? 'Yes' : 'No'} · Keep receipts: {keepReceiptsForVatReclaim ? 'Yes' : 'No'}
                </Text>
              </>
            )}
          </Section>
        )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
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
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryText}>
                  {step === maxStepIndex ? 'Create account' : 'Next'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('SignIn')}
            disabled={isSubmitting}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.buttonDisabled]}
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
    minHeight: '100%',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
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
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
    color: '#6b7280',
    fontWeight: '600',
  },
  progressCircleTextActive: {
    color: '#ffffff',
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
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
  instructions: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0d0d5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
  },
  chipText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  vatButton: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  vatButtonSelected: {
    backgroundColor: '#4338ca',
    borderColor: '#4338ca',
  },
  vatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vatButtonTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    marginRight: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
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
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  placeholderButton: {
    width: 120,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#555',
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#4338ca',
  },
})
