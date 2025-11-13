// Additional auth hooks

import { useAuth } from './AuthContext'
import { hasPermission, getNormalizedPermissions } from '../utils/permissions'
import type { BusinessMembership } from '../types/api'

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const { businessUser } = useAuth()
  if (!businessUser) return false
  return businessUser.permissions.includes(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { businessUser } = useAuth()
  if (!businessUser) return false
  return permissions.some((perm) => businessUser.permissions.includes(perm))
}

/**
 * Hook to get all permissions for current business user
 */
export function usePermissions(): string[] {
  const { businessUser } = useAuth()
  if (!businessUser) return []
  return businessUser.permissions
}

/**
 * Hook to check if user is an owner
 */
export function useIsOwner(): boolean {
  const { businessUser } = useAuth()
  return businessUser?.role === 'owner'
}

/**
 * Hook to check if user is a super
 */
export function useIsSuper(): boolean {
  const { businessUser } = useAuth()
  return businessUser?.role === 'super'
}

/**
 * Hook to check permissions for a specific business membership
 */
export function useBusinessPermission(
  businessId: string,
  permission: string,
): boolean {
  const { memberships } = useAuth()
  const membership = memberships?.[businessId]
  return hasPermission(membership, permission)
}

/**
 * Hook to get normalized permissions for a specific business
 */
export function useBusinessPermissions(businessId: string): string[] {
  const { memberships } = useAuth()
  const membership = memberships?.[businessId]
  return getNormalizedPermissions(membership)
}

