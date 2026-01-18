// Payment screen

import React, { useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { plansApi } from '../lib/api/plans'
import { useAuth } from '../lib/auth/AuthContext'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList, 'Payment'>
type PaymentRouteProp = RouteProp<AppDrawerParamList, 'Payment'>

const GRAYSCALE_PRIMARY = '#333333'

const formatPrice = (pence: number): string => {
  if (pence === 0) return 'Free'
  const pounds = pence / 100
  return `£${pounds.toFixed(2)}/month`
}

const formatCardNumber = (text: string) => {
  // Remove all non-digits
  const digits = text.replace(/\D/g, '')
  // Limit to 16 digits
  const limited = digits.slice(0, 16)
  // Add spaces every 4 digits
  return limited.replace(/(\d{4})(?=\d)/g, '$1 ')
}

const formatExpiry = (text: string) => {
  // Remove all non-digits
  const digits = text.replace(/\D/g, '')
  // Limit to 4 digits (MMYY)
  const limited = digits.slice(0, 4)
  // Add slash after 2 digits
  if (limited.length >= 2) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`
  }
  return limited
}

const formatCVC = (text: string) => {
  // Remove all non-digits and limit to 4 digits
  return text.replace(/\D/g, '').slice(0, 4)
}

export default function PaymentScreen() {
  const route = useRoute<PaymentRouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const { planId, planName, price } = route.params
  const { businessUser } = useAuth()
  const businessId = businessUser?.businessId

  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCVC] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [email, setEmail] = useState('')
  const [billingAddressLine1, setBillingAddressLine1] = useState('')
  const [billingAddressLine2, setBillingAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('GB') // Default to GB
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!businessId) {
      Alert.alert('Error', 'No business selected')
      return
    }

    try {
      setIsSubmitting(true)

      // TODO: Process payment through Stripe first, then call confirm-payment endpoint
      // For now, calling confirm-payment endpoint directly (will use simulation mode)
      const result = await plansApi.confirmPayment(businessId, {
        planId,
        // paymentIntentId and stripeSessionId will be added when Stripe is integrated
      })

      if (result.success) {
        Alert.alert('Success', `Plan updated to ${result.planName}`, [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to Plans Selection screen
              navigation.navigate('PlansSelection')
            },
          },
        ])
      } else {
        Alert.alert('Error', result.message || 'Failed to process payment')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process payment'
      Alert.alert('Error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = () => {
    return (
      cardNumber.replace(/\s/g, '').length === 16 &&
      expiry.length === 5 &&
      cvc.length >= 3 &&
      cardholderName.trim().length > 0 &&
      email.trim().length > 0 &&
      email.includes('@') &&
      billingAddressLine1.trim().length > 0 &&
      city.trim().length > 0 &&
      postalCode.trim().length > 0 &&
      country.trim().length > 0
    )
  }

  return (
    <AppBarLayout title="Payment" onBackPress={() => navigation.goBack()}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* Plan Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Plan Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan:</Text>
              <Text style={styles.summaryValue}>{planName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price:</Text>
              <Text style={styles.summaryValue}>{formatPrice(price)}</Text>
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <Text style={styles.label}>Card Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
              editable={!isSubmitting}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Expiry (MM/YY) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={expiry}
                  onChangeText={(text) => setExpiry(formatExpiry(text))}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isSubmitting}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>CVC *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvc}
                  onChangeText={(text) => setCVC(formatCVC(text))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <Text style={styles.label}>Cardholder Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={cardholderName}
              onChangeText={setCardholderName}
              autoCapitalize="words"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            <Text style={styles.sectionTitle}>Billing Address</Text>

            <Text style={styles.label}>Address Line 1 *</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main Street"
              value={billingAddressLine1}
              onChangeText={setBillingAddressLine1}
              autoCapitalize="words"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              placeholder="Apartment, suite, etc. (optional)"
              value={billingAddressLine2}
              onChangeText={setBillingAddressLine2}
              autoCapitalize="words"
              editable={!isSubmitting}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="London"
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  editable={!isSubmitting}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="SW1A 1AA"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  autoCapitalize="characters"
                  editable={!isSubmitting}
                />
              </View>
            </View>

            <Text style={styles.label}>Country *</Text>
            <TextInput
              style={styles.input}
              placeholder="GB"
              value={country}
              onChangeText={setCountry}
              autoCapitalize="characters"
              maxLength={2}
              editable={!isSubmitting}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!isValid() || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid() || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Pay {formatPrice(price)} / month
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginTop: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
    marginTop: 12,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
})
