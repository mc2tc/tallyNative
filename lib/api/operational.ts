import { api } from './client'
import type {
  OperationalCheckRequest,
  OperationalCheckResponse,
  OperationalAlertsResponse,
  OperationalAlertDetailsResponse,
  OperationalAlertDismissResponse,
} from '../types/api'

export const operationalApi = {
  /**
   * Check for operational issues
   */
  check: async (
    businessId: string,
    options?: {
      itemId?: string
      forceRefresh?: boolean
    },
  ): Promise<OperationalCheckResponse> => {
    const payload: OperationalCheckRequest = {
      businessId,
      ...(options?.itemId && { itemId: options.itemId }),
      ...(options?.forceRefresh !== undefined && { forceRefresh: options.forceRefresh }),
    }
    return api.post<OperationalCheckResponse>('/authenticated/transactions3/api/operational/check', payload)
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
  ): Promise<OperationalAlertsResponse> => {
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

    return api.get<OperationalAlertsResponse>(`/authenticated/transactions3/api/operational/alerts?${params.toString()}`)
  },

  /**
   * Get detailed information about a specific alert
   */
  getAlertDetails: async (
    alertId: string,
    businessId: string,
  ): Promise<OperationalAlertDetailsResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.get<OperationalAlertDetailsResponse>(
      `/authenticated/transactions3/api/operational/alerts/${alertId}?${params.toString()}`,
    )
  },

  /**
   * Dismiss an alert
   */
  dismissAlert: async (
    alertId: string,
    businessId: string,
  ): Promise<OperationalAlertDismissResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.post<OperationalAlertDismissResponse>(
      `/authenticated/transactions3/api/operational/alerts/${alertId}/dismiss?${params.toString()}`,
    )
  },
}

