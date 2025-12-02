import { api } from './client'
import type {
  BusinessContextPayload,
  BusinessContextResponse,
  VatStatusResponse,
  VatStatus,
} from '../types/api'

export type VatStatusUpdatePayload = Partial<
  Omit<VatStatus, 'updatedAt' | 'isVatRegistered' | 'supplyTypes'>
> & {
  isVatRegistered?: boolean
  supplyTypes?: string[]
}

export const businessContextApi = {
  upsert: async (payload: BusinessContextPayload): Promise<BusinessContextResponse> => {
    return api.post<BusinessContextResponse>('/api/business-context', payload)
  },
  getContext: async (businessId: string): Promise<BusinessContextResponse> => {
    const query = encodeURIComponent(businessId)
    return api.get<BusinessContextResponse>(`/api/business-context?businessId=${query}`)
  },
  getVatStatus: async (businessId: string): Promise<VatStatusResponse> => {
    const query = encodeURIComponent(businessId)
    return api.get<VatStatusResponse>(`/api/business-context/vat-status?businessId=${query}`)
  },
  updateVatStatus: async (
    businessId: string,
    payload: VatStatusUpdatePayload,
  ): Promise<VatStatusResponse> => {
    const query = encodeURIComponent(businessId)
    return api.patch<VatStatusResponse>(`/api/business-context/vat-status?businessId=${query}`, payload)
  },
}


