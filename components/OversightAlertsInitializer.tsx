import React, { useEffect } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import { oversightApi } from '../lib/api/oversight'
import { ApiError } from '../lib/api/client'

/**
 * Component that initializes and keeps the oversight alerts unread count updated.
 * This ensures the badge shows up immediately when the app opens, not just when HelpScreen loads.
 */
export function OversightAlertsInitializer() {
  const { businessUser, memberships } = useAuth()
  const { setOversightUnreadCount } = useAssistant()

  // Get businessId (same logic as other screens)
  const membershipIds = Object.keys(memberships ?? {})
  const nonPersonalMembershipId = membershipIds.find(
    (id) => !id.toLowerCase().includes('personal'),
  )
  const businessId =
    (businessUser?.businessId && !businessUser.businessId.toLowerCase().includes('personal')
      ? businessUser.businessId
      : nonPersonalMembershipId) ?? membershipIds[0]

  useEffect(() => {
    if (!businessId) {
      setOversightUnreadCount(0)
      return
    }

    // Fetch unread count on mount and when businessId changes
    const fetchUnreadCount = async () => {
      try {
        const response = await oversightApi.getAlerts(businessId, {
          unread: true, // Only get unread alerts for the count
          limit: 1, // We only need the count, not the actual alerts
        })
        setOversightUnreadCount(response.unreadCount)
      } catch (err) {
        // Check if this is a permissions error
        const isPermissionError =
          err instanceof ApiError &&
          (err.status === 403 ||
            err.status === 401 ||
            (typeof err.message === 'string' &&
              (err.message.toLowerCase().includes('permission') ||
                err.message.toLowerCase().includes('insufficient'))))

        if (isPermissionError) {
          // User doesn't have access to oversight alerts - silently set count to 0
          setOversightUnreadCount(0)
          // Don't log permission errors as they're expected for users without access
        } else {
          // Log other errors (network, server errors, etc.)
          console.error('Failed to fetch unread alerts count:', err)
          // Don't update count on error, keep existing value
        }
      }
    }

    fetchUnreadCount()

    // Optionally: Set up polling to refresh count periodically (e.g., every 5 minutes)
    // const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000)
    // return () => clearInterval(interval)
  }, [businessId, setOversightUnreadCount])

  // This component doesn't render anything
  return null
}
