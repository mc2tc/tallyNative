import { api } from './client'

export type PaymentMethodOption = {
  label: string
  value: string
  chartName: string
}

export type PaymentMethodsResponse = {
  paymentMethods: PaymentMethodOption[]
}

export const paymentMethodsApi = {
  getPaymentMethods: async (businessId: string): Promise<PaymentMethodOption[]> => {
    const response = await api.get<PaymentMethodsResponse>(
      `/api/businesses/${businessId}/payment-methods`,
    )
    return response.paymentMethods || []
  },
}

