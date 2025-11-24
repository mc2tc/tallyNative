import { api } from './client'

export type BankStatementRule = {
  id: string
  title: string
  description: string
  keywords: string[]
  debitAccount: string
  category: string
  isBusinessExpense: boolean
}

export type BankStatementRulesResponse = {
  rules: BankStatementRule[]
  count: number
}

export const bankStatementRulesApi = {
  getRules: async (): Promise<BankStatementRulesResponse> => {
    return api.get<BankStatementRulesResponse>(
      '/authenticated/transactions2/api/bank-statements/rules',
    )
  },
}

