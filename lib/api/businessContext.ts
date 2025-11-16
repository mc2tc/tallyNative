import { api } from './client'
import type { BusinessContextPayload, BusinessContextResponse } from '../types/api'

export const businessContextApi = {
  upsert: async (payload: BusinessContextPayload): Promise<BusinessContextResponse> => {
    return api.post<BusinessContextResponse>('/api/business-context', payload)
  },
  getContext: async (businessId: string): Promise<BusinessContextResponse> => {
    const query = encodeURIComponent(businessId)
    return api.get<BusinessContextResponse>(`/api/business-context?businessId=${query}`)
  },
}


