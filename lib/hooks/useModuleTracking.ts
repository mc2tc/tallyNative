// Hook for tracking module access

import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'

export const useModuleTracking = (moduleId: string) => {
  const { user, businessUser } = useAuth()

  useEffect(() => {
    // Only track if we have all required data
    if (!user || !businessUser?.businessId || !moduleId) {
      return
    }

    const trackAccess = async () => {
      try {
        await api.post<{ success: boolean; message: string }>(
          `/api/businesses/${businessUser.businessId}/metadata/track-module-access`,
          { moduleId },
        )
      } catch (error) {
        // Silent fail - don't interrupt user experience
        console.warn(`[Module Tracking] Error tracking ${moduleId}:`, error)
      }
    }

    // Track when component mounts
    trackAccess()
  }, [user, businessUser?.businessId, moduleId])
}

