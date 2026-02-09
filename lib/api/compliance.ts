import { api } from './client'
import type {
  ComplianceCheckRequest,
  ComplianceCheckResponse,
  ComplianceAlertsResponse,
  ComplianceAlertDetailsResponse,
  ComplianceAlertDismissResponse,
} from '../types/api'

export const complianceApi = {
  /**
   * Check for compliance issues
   */
  check: async (
    businessId: string,
    options?: {
      transactionId?: string
      forceRefresh?: boolean
    },
  ): Promise<ComplianceCheckResponse> => {
    const payload: ComplianceCheckRequest = {
      businessId,
      ...(options?.transactionId && { transactionId: options.transactionId }),
      ...(options?.forceRefresh !== undefined && { forceRefresh: options.forceRefresh }),
    }
    return api.post<ComplianceCheckResponse>('/authenticated/transactions3/api/compliance/check', payload)
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
  ): Promise<ComplianceAlertsResponse> => {
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

    return api.get<ComplianceAlertsResponse>(`/authenticated/transactions3/api/compliance/alerts?${params.toString()}`)
  },

  /**
   * Get detailed information about a specific alert
   */
  getAlertDetails: async (
    alertId: string,
    businessId: string,
  ): Promise<ComplianceAlertDetailsResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.get<ComplianceAlertDetailsResponse>(
      `/authenticated/transactions3/api/compliance/alerts/${alertId}?${params.toString()}`,
    )
  },

  /**
   * Dismiss an alert
   */
  dismissAlert: async (
    alertId: string,
    businessId: string,
  ): Promise<ComplianceAlertDismissResponse> => {
    const params = new URLSearchParams()
    params.append('businessId', businessId)
    return api.post<ComplianceAlertDismissResponse>(
      `/authenticated/transactions3/api/compliance/alerts/${alertId}/dismiss?${params.toString()}`,
    )
  },
}

