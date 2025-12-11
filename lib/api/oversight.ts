import { api } from './client'
import type {
  OversightCheckRequest,
  OversightCheckResponse,
  OversightAlertsResponse,
  OversightAlertDetailsResponse,
  OversightAlertDismissResponse,
} from '../types/api'

export const oversightApi = {
  /**
   * Check for oversight issues
   */
  check: async (
    businessId: string,
    options?: {
      transactionId?: string
      forceRefresh?: boolean
    },
  ): Promise<OversightCheckResponse> => {
    const payload: OversightCheckRequest = {
      businessId,
      ...(options?.transactionId && { transactionId: options.transactionId }),
      ...(options?.forceRefresh !== undefined && { forceRefresh: options.forceRefresh }),
    }
    return api.post<OversightCheckResponse>('/api/oversight/check', payload)
  },

  /**
   * Query alerts with optional filters
   */
  getAlerts: async (
    businessId: string,
    options?: {
      unread?: boolean
      severity?: 'critical' | 'warning' | 'info'
      limit?: number
      page?: number
      includeDismissed?: boolean
      status?: 'active' | 'dismissed'
    },
  ): Promise<OversightAlertsResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    if (options?.unread !== undefined) {
      params.append('unread', String(options.unread))
    }
    if (options?.severity) {
      params.append('severity', options.severity)
    }
    if (options?.limit) {
      params.append('limit', String(options.limit))
    }
    if (options?.page) {
      params.append('page', String(options.page))
    }
    if (options?.includeDismissed !== undefined) {
      params.append('includeDismissed', String(options.includeDismissed))
    }
    if (options?.status) {
      params.append('status', options.status)
    }

    return api.get<OversightAlertsResponse>(`/api/oversight/alerts?${params.toString()}`)
  },

  /**
   * Get detailed information about a specific alert
   */
  getAlertDetails: async (
    alertId: string,
    businessId: string,
  ): Promise<OversightAlertDetailsResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.get<OversightAlertDetailsResponse>(
      `/api/oversight/alerts/${alertId}?${params.toString()}`,
    )
  },

  /**
   * Dismiss an alert
   */
  dismissAlert: async (
    alertId: string,
    businessId: string,
  ): Promise<OversightAlertDismissResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.post<OversightAlertDismissResponse>(
      `/api/oversight/alerts/${alertId}/dismiss?${params.toString()}`,
    )
  },
}
