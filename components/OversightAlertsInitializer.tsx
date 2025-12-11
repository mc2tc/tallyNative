import React, { useEffect } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import { oversightApi } from '../lib/api/oversight'

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
        console.error('Failed to fetch unread alerts count:', err)
        // Don't update count on error, keep existing value
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
