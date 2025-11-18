import { api } from './client'

export type ChartAccountsResponse = {
  accounts: string[]
  businessId: string
  count: number
  type: string
}

export const chartAccountsApi = {
  getDebitAccounts: async (businessId: string): Promise<string[]> => {
    const response = await api.get<ChartAccountsResponse>(
      `/api/businesses/${businessId}/chart-accounts?type=debit`,
    )
    return response.accounts || []
  },
}

