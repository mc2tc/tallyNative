// Sign in screen

import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useAuth } from '../../lib/auth/AuthContext'
import { ApiError } from '../../lib/api/client'
import type { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>

export default function SignInScreen({}: Props) {
  const navigation = useNavigation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSignIn = async () => {
    console.log('Sign In button pressed')
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password')
      return
    }

    console.log('Starting sign in process...')
    setIsLoading(true)
    try {
      console.log('Calling signIn function...')
      await signIn(email.trim(), password)
      console.log('Sign in completed successfully')
      // Navigation will be handled by RootNavigator based on auth state
    } catch (error) {
      console.error('Sign in error:', error)
      let message = 'Failed to sign in. Please try again.'
      if (error instanceof ApiError) {
        message = error.message
      } else if (error instanceof Error) {
        // Firebase auth errors
        if (error.message.includes('user-not-found')) {
          message = 'No account found with this email'
        } else if (error.message.includes('wrong-password')) {
          message = 'Incorrect password'
        } else if (error.message.includes('invalid-email')) {
          message = 'Invalid email address'
        } else if (error.message.includes('auth/invalid-credential')) {
          message = 'Invalid email or password'
        } else if (error.message.includes('auth/network-request-failed')) {
          message = 'Network error. Please check your connection.'
        } else {
          message = error.message || 'An unexpected error occurred'
        }
      }
      console.error('Sign in failed with message:', message)
      Alert.alert('Sign In Failed', message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your credentials to continue</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={() => {
            console.log('Button pressed - calling handleSignIn')
            handleSignIn()
          }}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#333333" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('SignUp')}
          disabled={isLoading}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 6,
    fontWeight: '500',
  },
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
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#cccccc',
  },
  buttonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666666',
  },
  linkTextBold: {
    fontWeight: '600',
    color: '#333333',
  },
})

