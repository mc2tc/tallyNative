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
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { NavigationProp } from '@react-navigation/native'
import { useAuth } from '../../lib/auth/AuthContext'
import { ApiError } from '../../lib/api/client'
import type { AuthStackParamList } from '../../navigation/AuthNavigator'

type Props = NativeStackScreenProps<AuthStackParamList, 'AcceptInvite'>

export default function AcceptInviteScreen({}: Props) {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>()
  const route = useRoute()
  const { inviteToken } = (route.params as { inviteToken?: string }) || {}
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { acceptInvite, user } = useAuth()

  useEffect(() => {
    if (!inviteToken) {
      Alert.alert('Error', 'Invalid invite link')
      navigation.navigate('SignIn')
    }
  }, [inviteToken, navigation])

  const handleAcceptInvite = async () => {
    if (!inviteToken) {
      Alert.alert('Error', 'Invalid invite link')
      return
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to accept an invite')
      navigation.navigate('SignIn')
      return
    }

    setIsLoading(true)
    try {
      await acceptInvite(
        inviteToken,
        firstName.trim() || undefined,
        lastName.trim() || undefined,
      )
      Alert.alert('Success', 'Invite accepted! Redirecting...', [
        {
          text: 'OK',
          onPress: () => {
            // Navigation will happen via auth state change
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

  if (!inviteToken) {
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
              onPress={() => navigation.navigate('SignIn')}
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
                <ActivityIndicator color="#333333" />
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
  warning: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  warningText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  signInButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333333',
  },
  signInButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
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
  hint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
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
})

