// Firestore Test screen

import React, { useState } from 'react'
import Constants from 'expo-constants'
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<AppDrawerParamList, 'FirestoreTest'>

type RandomTransaction = {
  id: string
  businessId: string
  data: Record<string, unknown>
}

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl
const BASE_URL =
  typeof configuredBaseUrl === 'string' && configuredBaseUrl.length > 0
    ? configuredBaseUrl
    : Platform.select({
        ios: 'http://localhost:3000',
        android: 'http://10.0.2.2:3000',
        default: 'http://localhost:3000',
      })

export default function FirestoreTestScreen({}: Props) {
  const [businessId, setBusinessId] = useState('')
  const [transaction, setTransaction] = useState<RandomTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRandomTransaction = async () => {
    const trimmedId = businessId.trim()
    if (!trimmedId || isLoading) return

    setIsLoading(true)
    setError(null)
    setTransaction(null)

    try {
      const url = `${BASE_URL}/api/admin/random-transaction/${encodeURIComponent(
        trimmedId,
      )}`

      const response = await fetch(url)
      let data: unknown = null

      try {
        data = await response.json()
      } catch (parseError) {
        if (response.ok) {
          throw new Error('Invalid JSON response from server')
        }
        throw new Error(
          `Request failed (${response.status}). Unable to parse error details.`,
        )
      }

      if (!response.ok) {
        const message =
          typeof (data as { error?: unknown })?.error === 'string'
            ? (data as { error: string }).error
            : `Request failed (${response.status})`
        throw new Error(message)
      }

      setTransaction(data as RandomTransaction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AppBarLayout title="Test Firestore">
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Random Transaction Fetcher</Text>
          <Text style={styles.subtitle}>
            Enter a business ID to pull a random transaction from the server.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Business ID"
            value={businessId}
            onChangeText={setBusinessId}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.button,
              (!businessId.trim() || isLoading) && styles.buttonDisabled,
            ]}
            onPress={fetchRandomTransaction}
            disabled={!businessId.trim() || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Fetching…' : 'Fetch Random Transaction'}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {transaction ? (
            <View style={styles.result}>
              <Text style={styles.resultTitle}>
                Transaction ID: {transaction.id}
              </Text>
              <Text style={styles.resultSubtitle}>
                Business: {transaction.businessId}
              </Text>
              <Text style={styles.resultBody}>
                {JSON.stringify(transaction.data, null, 2)}
              </Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#333333' },
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  buttonDisabled: { backgroundColor: '#f5f5f5', borderColor: '#cccccc' },
  buttonText: { color: '#333333', fontSize: 16, fontWeight: '600' },
  error: {
    marginTop: 16,
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  result: {
    marginTop: 24,
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#333333' },
  resultSubtitle: { fontSize: 14, color: '#666666', marginTop: 4 },
  resultBody: {
    marginTop: 12,
    color: '#333333',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    fontSize: 12,
  },
})

