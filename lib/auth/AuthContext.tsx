// Auth Context for managing authentication state

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '../config/firebase'
import { authApi } from '../api/auth'
import { businessContextApi } from '../api/businessContext'
import { normalizePermissions } from '../utils/permissions'
import type { AuthContextValue, BusinessUser } from '../types/auth'
import type { BusinessMembership } from '../types/api'
import { ApiError } from '../api/client'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businessUser, setBusinessUser] = useState<BusinessUser | null>(null)
  const [memberships, setMemberships] = useState<Record<string, BusinessMembership> | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [businessContextComplete, setBusinessContextComplete] = useState(true)

  const evaluateBusinessContext = useCallback(async (businessId?: string) => {
    if (!businessId) {
      setBusinessContextComplete(false)
      return
    }
    try {
      await businessContextApi.getContext(businessId)
      setBusinessContextComplete(true)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          setBusinessContextComplete(false)
          return
        }
      }
      console.warn('Unable to verify business context status', error)
      setBusinessContextComplete(true)
    }
  }, [])

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

        const nextBusinessUser: BusinessUser = {
          role: membership.role,
          businessId,
          permissions: normalizedPermissions,
          email: currentUser.email || '',
        }
        setBusinessUser(nextBusinessUser)
        void evaluateBusinessContext(businessId)
      } else {
        setBusinessUser(null)
        setBusinessContextComplete(true)
      }
    } catch (error) {
      console.error('Failed to refresh auth state:', error)
      // If API is unavailable, we still have Firebase auth
      // Set businessUser to null but don't clear the user
      // This allows the app to function (user can see they're signed in)
      // but they'll see a message that API connectivity is needed
      setBusinessUser(null)
      setMemberships(null)
      setBusinessContextComplete(true)
    } finally {
      setLoading(false)
    }
  }, [evaluateBusinessContext])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser)
        if (firebaseUser) {
          await refreshAuthState()
        } else {
          setBusinessUser(null)
          setMemberships(null)
          setBusinessContextComplete(true)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error)
        // Ensure app can still initialize even if there's an error
        setBusinessUser(null)
        setMemberships(null)
        setBusinessContextComplete(true)
        setLoading(false)
      } finally {
        setInitialized(true)
      }
    })

    return unsubscribe
  }, [refreshAuthState])

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    await signInWithEmailAndPassword(auth, email, password)
    // Auth state will update via onAuthStateChanged
  }, [])

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth()
    setLoading(true)
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setBusinessUser(null)
      setMemberships(null)
      setBusinessContextComplete(true)
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

  const markBusinessContextComplete = useCallback(() => {
    setBusinessContextComplete(true)
  }, [])

  const value: AuthContextValue = {
    user,
    businessUser,
    memberships,
    loading,
    initialized,
    businessContextComplete,
    signIn,
    signOut,
    refreshAuthState,
    acceptInvite,
    markBusinessContextComplete,
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

