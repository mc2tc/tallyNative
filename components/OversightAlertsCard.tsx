import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { OversightAlert } from '../lib/types/api'
import { oversightApi } from '../lib/api/oversight'
import { useAssistant } from '../lib/context/OversightAlertsContext'

interface OversightAlertsCardProps {
  businessId: string
}

export interface OversightAlertsCardRef {
  refresh: () => Promise<void>
}

export const OversightAlertsCard = forwardRef<OversightAlertsCardRef, OversightAlertsCardProps>(
  ({ businessId }, ref) => {
  const insets = useSafeAreaInsets()
  // Tab bar height - set to 0 since this component may be used outside tab navigator
  // When used in HelpScreen (tab navigator), the spacing is handled by the ScrollView
  // When used in drawer screens, no tab bar spacing is needed
  const tabBarHeight = 0
  const { setOversightUnreadCount } = useAssistant()
  const [alerts, setAlerts] = useState<OversightAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null) // Message from alerts response
  const [checkMessage, setCheckMessage] = useState<string | null>(null) // Message from check response
  const isLoadingRef = useRef(false) // Prevent multiple simultaneous calls

  const loadAlerts = async (shouldCheck = false) => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) {
      return
    }
    
    try {
      isLoadingRef.current = true
      if (shouldCheck) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      let checkResponse = null
      // Only trigger a check when explicitly requested (pull-to-refresh)
      // This prevents creating duplicate alerts on every screen load
      if (shouldCheck) {
        checkResponse = await oversightApi.check(businessId, { forceRefresh: false })
        setCheckMessage(checkResponse.message)
      }

      // Fetch alerts
      const response = await oversightApi.getAlerts(businessId, {
        unread: undefined, // Get all alerts
        limit: 50,
      })

      // Log the actual alert data to debug date format (can remove after confirming it works)
      if (response.alerts.length > 0 && __DEV__) {
        console.log('OversightAlertsCard: Alert date fields - detectedAt:', response.alerts[0].detectedAt, 'createdAt:', response.alerts[0].createdAt)
      }
      
      setAlerts(response.alerts)
      setUnreadCount(response.unreadCount)
      // Update global unread count for tab badge
      setOversightUnreadCount(response.unreadCount)
      // Use the message from alerts response if available, otherwise use check message
      setStatusMessage(response.message || checkResponse?.message || null)
    } catch (err) {
      console.error('Failed to load oversight alerts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
      setStatusMessage(null)
      setCheckMessage(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
      isLoadingRef.current = false
    }
  }

  useEffect(() => {
    if (businessId) {
      // On initial load, just fetch existing alerts without triggering a new check
      // This prevents duplicate alerts from being created
      loadAlerts(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId])

  const handleRefresh = () => {
    // On manual refresh, trigger a new check to look for new issues
    loadAlerts(true)
  }

  const handleDismiss = async (alertId: string) => {
    try {
      await oversightApi.dismissAlert(alertId, businessId)
      // Remove dismissed alert from the list immediately
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId))
      // Update unread count
      const newCount = Math.max(0, unreadCount - 1)
      setUnreadCount(newCount)
      // Update global unread count for tab badge
      setOversightUnreadCount(newCount)
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
      // Optionally show an error message to the user
    }
  }

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await loadAlerts(true)
    },
  }))

  const getSeverityColor = (severity: OversightAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return '#d32f2f' // Red
      case 'warning':
        return '#f57c00' // Orange
      case 'info':
        return '#1976d2' // Blue
      default:
        return '#666666'
    }
  }

  const getSeverityIcon = (severity: OversightAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'notifications'
    }
  }

  const formatDate = (dateValue: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date } | undefined) => {
    if (!dateValue) {
      console.warn('OversightAlertsCard: formatDate received undefined/null value')
      return 'Recently'
    }
    
    let date: Date
    
    // Handle different date formats
    if (typeof dateValue === 'number') {
      // Timestamp number (milliseconds)
      date = new Date(dateValue)
    } else if (typeof dateValue === 'string') {
      // String format - could be ISO or timestamp string
      if (dateValue.includes('T') || dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        // ISO 8601 format: "2024-01-15T10:30:00Z" or "2024-01-15"
        date = new Date(dateValue)
      } else if (/^\d+$/.test(dateValue)) {
        // Timestamp string: "1704067200000"
        date = new Date(parseInt(dateValue, 10))
      } else {
        // Try parsing as-is
        date = new Date(dateValue)
      }
    } else if (typeof dateValue === 'object') {
      // Firestore Timestamp object or similar
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firestore Timestamp with toDate() method
        date = dateValue.toDate()
      } else if (dateValue.seconds !== undefined) {
        // Firestore Timestamp object: { seconds: 1704067200, nanoseconds: 0 }
        // Convert seconds to milliseconds
        date = new Date(dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000)
      } else {
        console.warn('OversightAlertsCard: Unknown date object format:', dateValue)
        return 'Recently'
      }
    } else {
      console.warn('OversightAlertsCard: Unknown date type:', typeof dateValue, dateValue)
      return 'Recently'
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('OversightAlertsCard: Invalid date parsed. Value:', dateValue, 'Type:', typeof dateValue)
      return 'Recently'
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    
    // Handle future dates (shouldn't happen, but just in case)
    if (diffMs < 0) {
      return 'Just now'
    }
    
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // Format older dates
    try {
      return date.toLocaleDateString()
    } catch (error) {
      console.error('OversightAlertsCard: Error formatting date:', error)
      return 'Recently'
    }
  }

  const PADDING = 12
  const cardStyle = [
    styles.card,
    {
      marginTop: PADDING,
      marginBottom: PADDING,
      paddingBottom: PADDING + insets.bottom,
      flex: 1, // Take available space in container
      minHeight: 0, // Important for ScrollView to work properly
    },
  ]

  if (loading && !refreshing) {
    return (
      <View style={cardStyle}>
        <Text style={styles.title}>Oversight Alerts</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666666" />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={cardStyle}>
      <View style={styles.header}>
        <Text style={styles.title}>Oversight Alerts</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="check-circle" size={48} color="#4caf50" />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptyText}>
            {statusMessage || 'No oversight issues detected. Your business transactions look healthy.'}
          </Text>
        </View>
      ) : (
        <>
          {checkMessage && (
            <View style={styles.statusMessageContainer}>
              <MaterialIcons name="info-outline" size={16} color="#666666" />
              <Text style={styles.statusMessage}>{checkMessage}</Text>
            </View>
          )}
          <ScrollView
            style={styles.alertsContainer}
            contentContainerStyle={styles.alertsContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                !alert.read && styles.alertCardUnread,
                { borderLeftColor: getSeverityColor(alert.severity) },
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertIconContainer}>
                  <MaterialIcons
                    name={getSeverityIcon(alert.severity)}
                    size={20}
                    color={getSeverityColor(alert.severity)}
                  />
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertRuleName}>{alert.ruleName}</Text>
                  <Text style={styles.alertTime}>{formatDate(alert.detectedAt || alert.createdAt)}</Text>
                </View>
                {!alert.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <View style={styles.alertActions}>
                {alert.requiresReview && (
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>Requires Review</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handleDismiss(alert.id)}
                  style={styles.dismissButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dismissButtonText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          </ScrollView>
        </>
      )}
    </View>
  )
  },
)

OversightAlertsCard.displayName = 'OversightAlertsCard'

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  badge: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  alertsContainer: {
    flex: 1,
  },
  alertsContent: {
    paddingBottom: 8,
  },
  alertCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#666666',
  },
  alertCardUnread: {
    backgroundColor: '#fff9e6',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertRuleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#999999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d32f2f',
    marginTop: 6,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  reviewBadge: {
    backgroundColor: '#fff3cd',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  reviewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#333333',
    borderRadius: 6,
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
})
