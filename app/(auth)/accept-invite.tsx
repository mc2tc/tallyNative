// Invite acceptance screen

import React, { useState, useEffect } from 'react'
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
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../lib/auth/AuthContext'
import { ApiError } from '../../lib/api/client'

export default function AcceptInviteScreen() {
  const { inviteId } = useLocalSearchParams<{ inviteId: string }>()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { acceptInvite, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!inviteId) {
      Alert.alert('Error', 'Invalid invite link')
      router.replace('/(auth)/sign-in')
    }
  }, [inviteId, router])

  const handleAcceptInvite = async () => {
    if (!inviteId) {
      Alert.alert('Error', 'Invalid invite link')
      return
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to accept an invite')
      router.replace('/(auth)/sign-in')
      return
    }

    setIsLoading(true)
    try {
      await acceptInvite(
        inviteId,
        firstName.trim() || undefined,
        lastName.trim() || undefined,
      )
      Alert.alert('Success', 'Invite accepted! Redirecting...', [
        {
          text: 'OK',
          onPress: () => {
            // Navigation will happen via auth state change
            router.replace('/')
          },
        },
      ])
    } catch (error) {
      let message = 'Failed to accept invite. Please try again.'
      if (error instanceof ApiError) {
        if (error.status === 403) {
          message = 'Email mismatch. The invite was sent to a different email address.'
        } else if (error.status === 404) {
          message = 'Invite not found'
        } else if (error.status === 409) {
          message = 'This invite has already been accepted'
        } else if (error.status === 410) {
          message = 'This invite has expired (invites expire after 7 days)'
        } else {
          message = error.message
        }
      } else if (error instanceof Error) {
        message = error.message
      }
      Alert.alert('Failed to Accept Invite', message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!inviteId) {
    return null
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Accept Invitation</Text>
        <Text style={styles.subtitle}>
          Complete your profile to accept this invitation
        </Text>

        {!user && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              You must be signed in to accept an invite
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>First Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!isLoading}
              />
              <Text style={styles.hint}>
                Leave blank to use name from invite
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                editable={!isLoading}
              />
              <Text style={styles.hint}>
                Leave blank to use name from invite
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleAcceptInvite}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Accept Invitation</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f8',
    padding: 24,
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
    marginBottom: 24,
  },
  warning: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
  },
  signInButton: {
    backgroundColor: '#4338ca',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4338ca',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

