import { api } from './client'

export type CreditCardRule = {
  id: string
  title: string
  description: string
  keywords: string[]
  debitAccount: string
  category: string
  isBusinessExpense: boolean
}

export type CreditCardRulesResponse = {
  rules: CreditCardRule[]
  count: number
}

export type CreateCreditCardRulePayload = {
  businessId: string
  title: string
  description?: string
  keywords: string[]
  debitAccount: string
  isBusinessExpense?: boolean
}

export const creditCardRulesApi = {
  getRules: async (businessId: string): Promise<CreditCardRulesResponse> => {
    const params = new URLSearchParams({ businessId })
    return api.get<CreditCardRulesResponse>(
      `/authenticated/transactions2/api/credit-card-statements/rules?${params.toString()}`,
    )
  },

  updateRule: async (
    id: string,
    payload: { businessId: string; keywords: string[] },
  ): Promise<{ rule: CreditCardRule }> => {
    const params = new URLSearchParams({
      businessId: payload.businessId,
    })
    return api.patch<{ rule: CreditCardRule }>(
      `/authenticated/transactions2/api/credit-card-statements/rules/${id}?${params.toString()}`,
      { keywords: payload.keywords },
    )
  },

  createRule: async (
    payload: CreateCreditCardRulePayload,
  ): Promise<{ rule: CreditCardRule }> => {
    const params = new URLSearchParams({
      businessId: payload.businessId,
    })
    return api.post<{ rule: CreditCardRule }>(
      `/authenticated/transactions2/api/credit-card-statements/rules?${params.toString()}`,
      {
        title: payload.title,
        description: payload.description,
        keywords: payload.keywords,
        debitAccount: payload.debitAccount,
        category: 'credit_card_fee',
        isBusinessExpense: true,
      },
    )
  },
}

