// Hook for tracking module group access

import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

export const useModuleGroupTracking = (groupId: string) => {
  const { user, businessUser } = useAuth()

  useEffect(() => {
    // Only track if we have all required data
    if (!user || !businessUser?.businessId || !groupId) {
      return
    }

    const trackAccess = async () => {
      try {
        await api.post<{ success: boolean; message: string }>(
          `/api/businesses/${businessUser.businessId}/metadata/track-module-access`,
          { groupId },
        )
      } catch (error) {
        // Silent fail - don't interrupt user experience
        console.warn(`[Module Group Tracking] Error tracking ${groupId}:`, error)
      }
    }

    // Track when component mounts
    trackAccess()
  }, [user, businessUser?.businessId, groupId])
}
