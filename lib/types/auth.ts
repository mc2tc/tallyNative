// Auth state types for React Native app

import type { User } from 'firebase/auth'
import type { BusinessMembership } from './api'

export type BusinessUser = {
  role: 'owner' | 'super' | 'other'
  businessId?: string
  permissions: string[] // Normalized - "all" converted to array
  email: string
}

export type AuthState = {
  user: User | null
  businessUser: BusinessUser | null
  memberships: Record<string, BusinessMembership> | null
  loading: boolean
  initialized: boolean
  businessContextComplete: boolean
}

export type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuthState: () => Promise<void>
  acceptInvite: (inviteId: string, firstName?: string, lastName?: string) => Promise<void>
  markBusinessContextComplete: () => void
}

