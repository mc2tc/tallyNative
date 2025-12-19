import { api } from './client'

export type PlanLimits = {
  transactions: number | null
  vertexAICalls: number | null
  storageBytes: number | null
  users: number | null
  moduleGroups: number | null
}

export type PlanFeatures = {
  includesModuleGroups: string[]
  allowAddOns: boolean
}

export type Subscription = {
  planId: string
  planName: string
  status: 'trial' | 'active' | 'cancelled' | 'expired'
  subscribedAt: string
  trialEndsAt: string | null
}

export type Plan = {
  planId: string
  planName: string
  description: string
  price: number // Price in pence
  limits: PlanLimits
  features: PlanFeatures
  inTrial: boolean
  subscription: Subscription | null
}

export type UpdatePlanRequest = {
  planId: string
}

export type UpdatePlanResponse = Plan & {
  success: boolean
}

export type ConfirmPaymentRequest = {
  planId: string
  paymentIntentId?: string
  stripeSessionId?: string
}

export type ConfirmPaymentResponse = {
  success: boolean
  message: string
  planId: string
  planName: string
}

export const plansApi = {
  getCurrentPlan: async (businessId: string): Promise<Plan> => {
    return api.get<Plan>(`/api/businesses/${businessId}/metadata/plan`)
  },

  updatePlan: async (businessId: string, planId: string): Promise<UpdatePlanResponse> => {
    return api.post<UpdatePlanResponse>(`/api/businesses/${businessId}/metadata/plan`, { planId })
  },

  confirmPayment: async (
    businessId: string,
    request: ConfirmPaymentRequest,
  ): Promise<ConfirmPaymentResponse> => {
    return api.post<ConfirmPaymentResponse>(
      `/api/businesses/${businessId}/subscription/confirm-payment`,
      request,
    )
  },
}
