import { api } from './client'

export type Customer = {
  id: string
  businessId: string
  name: string
  stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

export type CreateCustomerPayload = {
  name: string
  stage?: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
  projectName?: string
  estimatedProjectValue?: string
  source?: string
}

export type CustomersListResponse = {
  customers: Customer[]
  count: number
}

export type GetCustomersParams = {
  search?: string
  limit?: number
}

export const customersApi = {
  getCustomers: async (
    businessId: string,
    params?: GetCustomersParams,
  ): Promise<CustomersListResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.search) {
      queryParams.append('search', params.search)
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString())
    }
    const queryString = queryParams.toString()
    const url = `/api/businesses/${businessId}/customers${queryString ? `?${queryString}` : ''}`
    return api.get<CustomersListResponse>(url)
  },

  createCustomer: async (
    businessId: string,
    payload: CreateCustomerPayload,
  ): Promise<Customer> => {
    return api.post<Customer>(`/api/businesses/${businessId}/customers`, {
      name: payload.name,
      ...(payload.stage && { stage: payload.stage }),
      ...(payload.projectName && { projectName: payload.projectName }),
      ...(payload.estimatedProjectValue && { estimatedProjectValue: payload.estimatedProjectValue }),
      ...(payload.source && { source: payload.source }),
    })
  },
}

