// Auth Context for managing authentication state

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '../config/firebase'
import { authApi } from '../api/auth'
import { normalizePermissions } from '../utils/permissions'
import type { AuthContextValue, BusinessUser } from '../types/auth'
import type { BusinessMembership } from '../types/api'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null)
  const [memberships, setMemberships] = useState<Record<string, BusinessMembership> | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const refreshAuthState = useCallback(async () => {
    const auth = getFirebaseAuth()
    const currentUser = auth.currentUser

    if (!currentUser) {
      setUser(null)
      setBusinessUser(null)
      setMemberships(null)
      setLoading(false)
      return
    }

    try {
      const response = await authApi.refreshClaims()
      setMemberships(response.memberships)

      // Determine the primary business user context
      // Priority: owner > super > other
      const membershipEntries = Object.entries(response.memberships)
      if (membershipEntries.length === 0) {
        setBusinessUser(null)
        setLoading(false)
        return
      }

      // Find owner first, then super, then other
      let selectedMembership: [string, BusinessMembership] | null = null
      for (const [businessId, membership] of membershipEntries) {
        if (membership.role === 'owner') {
          selectedMembership = [businessId, membership]
          break
        }
        if (!selectedMembership && membership.role === 'super') {
          selectedMembership = [businessId, membership]
        }
        if (!selectedMembership) {
          selectedMembership = [businessId, membership]
        }
      }

      if (selectedMembership) {
        const [businessId, membership] = selectedMembership
        const normalizedPermissions = normalizePermissions(
          membership.permissions,
          membership.role,
        )

        setBusinessUser({
          role: membership.role,
          businessId,
          permissions: normalizedPermissions,
          email: currentUser.email || '',
        })
      } else {
        setBusinessUser(null)
      }
    } catch (error) {
      console.error('Failed to refresh auth state:', error)
      // If API is unavailable, we still have Firebase auth
      // Set businessUser to null but don't clear the user
      // This allows the app to function (user can see they're signed in)
      // but they'll see a message that API connectivity is needed
      setBusinessUser(null)
      setMemberships(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await refreshAuthState()
      } else {
        setBusinessUser(null)
        setMemberships(null)
        setLoading(false)
      }
      setInitialized(true)
    })

    return unsubscribe
  }, [refreshAuthState])

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Auth state will update via onAuthStateChanged
    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      businessName?: string,
    ) => {
      const auth = getFirebaseAuth()
      setLoading(true)
      try {
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)

        // Wait a moment for the token to be available, then force refresh
        // This ensures we have a valid token before making the API call
        await new Promise((resolve) => setTimeout(resolve, 100))
        const token = await userCredential.user.getIdToken(true)
        
        if (!token) {
          throw new Error('Failed to get authentication token after account creation')
        }

        // Bootstrap owner account via API
        await authApi.bootstrapOwner({
          owner: {
            firstName,
            lastName,
            email,
          },
          businesses: businessName
            ? [
                {
                  businessName,
                },
              ]
            : undefined,
          createPersonalBusiness: true,
        })
        // Auth state will refresh via onAuthStateChanged
      } catch (error) {
        setLoading(false)
        // If API call fails, we should clean up the Firebase account
        // But for now, just throw the error
        throw error
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth()
    setLoading(true)
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setBusinessUser(null)
      setMemberships(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const acceptInvite = useCallback(
    async (inviteId: string, firstName?: string, lastName?: string) => {
      setLoading(true)
      try {
        await authApi.acceptInvite(inviteId, { firstName, lastName })
        // Refresh auth state to get updated memberships
        await refreshAuthState()
      } catch (error) {
        setLoading(false)
        throw error
      }
    },
    [refreshAuthState],
  )

  const value: AuthContextValue = {
    user,
    businessUser,
    memberships,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    refreshAuthState,
    acceptInvite,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

