import { api } from './client'

export type ChartAccount = {
  name: string
  type?: string
  id?: string
  number?: string
  value?: number
  [key: string]: unknown
}

type RawChartAccount = string | ChartAccount | undefined | null

export type ChartAccountsResponse = {
  accounts: RawChartAccount[]
  businessId: string
  count: number
  type?: string
  period?: {
    startDate: string
    endDate: string
  }
}

export type ChartAccountFilters = {
  type?: string
  withValues?: boolean
  startDate?: string
  endDate?: string
}

const buildChartAccountsUrl = (businessId: string, filters?: ChartAccountFilters) => {
  const params: string[] = []
  if (filters?.type) {
    params.push(`type=${encodeURIComponent(filters.type)}`)
  }
  if (filters?.withValues === true) {
    params.push('withValues=true')
  }
  if (filters?.startDate) {
    params.push(`startDate=${encodeURIComponent(filters.startDate)}`)
  }
  if (filters?.endDate) {
    params.push(`endDate=${encodeURIComponent(filters.endDate)}`)
  }
  const query = params.length > 0 ? `?${params.join('&')}` : ''
  return `/api/businesses/${businessId}/chart-accounts${query}`
}

const normalizeAccounts = (accounts: RawChartAccount[]): ChartAccount[] => {
  return (accounts ?? [])
    .map((account) => {
      if (!account) return null
      if (typeof account === 'string') {
        return { name: account }
      }
      if (typeof account === 'object' && typeof account.name === 'string') {
        return account
      }
      return null
    })
    .filter((account): account is ChartAccount => account !== null)
}

export type CashflowAccountDetail = {
  accountId: string
  accountName: string
  amount: number // Positive for inflows, negative for outflows
}

export type CashflowActivity = {
  inflows: number
  outflows: number
  net: number
  accounts?: CashflowAccountDetail[] // Only included if includeDetails=true
}

export type CashflowStatementResponse = {
  businessId: string
  period: {
    startDate: string // ISO 8601
    endDate: string // ISO 8601
  }
  operating: CashflowActivity
  investing: CashflowActivity
  financing: CashflowActivity
  netCashFlow: number
  revenue: number
  cashFlowRatio?: number // Only if revenue > 0
}

export type CashflowStatementFilters = {
  startDate?: string // ISO 8601
  endDate?: string // ISO 8601
  includeDetails?: boolean
}

const buildCashflowStatementUrl = (
  businessId: string,
  filters?: CashflowStatementFilters,
): string => {
  const params: string[] = []
  if (filters?.startDate) {
    params.push(`startDate=${encodeURIComponent(filters.startDate)}`)
  }
  if (filters?.endDate) {
    params.push(`endDate=${encodeURIComponent(filters.endDate)}`)
  }
  if (filters?.includeDetails === true) {
    params.push('includeDetails=true')
  }
  const query = params.length > 0 ? `?${params.join('&')}` : ''
  return `/api/businesses/${businessId}/cashflow-statement${query}`
}

export const chartAccountsApi = {
  getAccounts: async (businessId: string, filters?: ChartAccountFilters): Promise<ChartAccount[]> => {
    const response = await api.get<ChartAccountsResponse>(
      buildChartAccountsUrl(businessId, filters),
    )
    return normalizeAccounts(response.accounts)
  },
  getRawAccounts: async (
    businessId: string,
    filters?: ChartAccountFilters,
  ): Promise<ChartAccountsResponse> => {
    return api.get<ChartAccountsResponse>(buildChartAccountsUrl(businessId, filters))
  },
  getDebitAccounts: async (businessId: string): Promise<string[]> => {
    const accounts = await chartAccountsApi.getAccounts(businessId, { type: 'debit' })
    return accounts.map((account) => account.name)
  },
  getIncomeAccounts: async (businessId: string): Promise<string[]> => {
    // Fetch all accounts and filter for Sales Revenue accounts by name
    // The chart of accounts uses "Sales Revenue" instead of type "income"
    const allAccounts = await chartAccountsApi.getAccounts(businessId)
    const salesRevenueAccounts = allAccounts.filter((account) => {
      const name = account.name?.toLowerCase() || ''
      return name.includes('sales revenue') || name.includes('revenue') || account.type === 'income'
    })
    return salesRevenueAccounts.map((account) => account.name)
  },
  getCashflowStatement: async (
    businessId: string,
    filters?: CashflowStatementFilters,
  ): Promise<CashflowStatementResponse> => {
    return api.get<CashflowStatementResponse>(buildCashflowStatementUrl(businessId, filters))
  },
}

