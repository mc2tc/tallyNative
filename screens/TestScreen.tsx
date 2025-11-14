// Test Sum API screen

import React, { useState } from 'react'
import Constants from 'expo-constants'
import {
  Alert,
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

type Props = NativeStackScreenProps<AppDrawerParamList, 'Test'>

type SumResult = {
  result: number
  inputs: { a: number; b: number }
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

export default function TestScreen({}: Props) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SumResult | null>(null)

  const handleSubmit = async () => {
    if (isSubmitting) return

    const parsedA = Number(a)
    const parsedB = Number(b)

    if (!Number.isFinite(parsedA) || !Number.isFinite(parsedB)) {
      Alert.alert('Invalid input', 'Please enter valid numbers.')
      return
    }

    setIsSubmitting(true)
    setResult(null)

    try {
      const response = await fetch(`${BASE_URL}/api/admin/sum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: parsedA, b: parsedB }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message =
          typeof data?.error === 'string' ? data.error : 'Request failed'
        throw new Error(message)
      }

      setResult(data as SumResult)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error'
      Alert.alert('Error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppBarLayout>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Server Sum Demo</Text>
          <Text style={styles.subtitle}>
            Enter two numbers and we'll calculate the sum on the server.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>First number</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={a}
              placeholder="e.g. 12"
              onChangeText={setA}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Second number</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={b}
              placeholder="e.g. 8"
              onChangeText={setB}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Calculating…' : 'Calculate Sum'}
            </Text>
          </TouchableOpacity>

          {result ? (
            <View style={styles.success}>
              <Text style={styles.successTitle}>Server result</Text>
              <Text style={styles.successText}>
                a = {result.inputs.a}, b = {result.inputs.b}
              </Text>
              <Text style={styles.successSum}>Sum: {result.result}</Text>
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
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  buttonDisabled: { backgroundColor: '#f5f5f5', borderColor: '#cccccc' },
  buttonText: { color: '#333333', fontSize: 16, fontWeight: '600' },
  success: {
    marginTop: 24,
    padding: 16,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  successTitle: { fontSize: 16, fontWeight: '600', color: '#333333' },
  successText: { fontSize: 14, color: '#666666', marginTop: 4 },
  successSum: { fontSize: 24, fontWeight: '700', color: '#333333', marginTop: 12 },
})

