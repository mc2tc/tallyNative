// Permission normalization utilities

import type { BusinessMembership } from '../types/api'

/**
 * Normalizes permissions from API response
 * Converts "all" string to full permissions array for owners
 */
export function normalizePermissions(
  permissions: string[] | 'all',
  role: 'owner' | 'super' | 'other',
): string[] {
  if (permissions === 'all') {
    // Return all possible permissions for owners
    // This should match the OWNER_PERMISSIONS constant in Next.js
    return [
      'view_transactions',
      'view_financial_reports',
      'view_dashboard',
      'edit_transactions',
      'manage_users',
      'manage_business',
      'view_settings',
      'edit_settings',
    ]
  }
  return permissions
}

/**
 * Checks if user has a specific permission
 */
export function hasPermission(
  membership: BusinessMembership | null | undefined,
  permission: string,
): boolean {
  if (!membership) return false

  const normalized = normalizePermissions(membership.permissions, membership.role)
  return normalized.includes(permission)
}

/**
 * Gets normalized permissions for a membership
 */
export function getNormalizedPermissions(
  membership: BusinessMembership | null | undefined,
): string[] {
  if (!membership) return []
  return normalizePermissions(membership.permissions, membership.role)
}

