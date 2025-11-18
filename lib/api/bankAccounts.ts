import { api } from './client'

export type BankAccount = {
  bankName: string
  accountNumber: string
}

export type BankAccountsResponse = {
  bankAccounts: BankAccount[]
}

export const bankAccountsApi = {
  getBankAccounts: async (businessId: string): Promise<BankAccount[]> => {
    try {
      const response = await api.get<BankAccountsResponse>(
        `/api/businesses/${businessId}/bank-accounts`,
      )
      return response.bankAccounts || []
    } catch (error) {
      // If endpoint doesn't exist yet (404), return empty array
      console.warn('Bank accounts endpoint not available:', error)
      return []
    }
  },

  addBankAccount: async (
    businessId: string,
    bankName: string,
    accountNumber: string,
  ): Promise<BankAccount> => {
    const response = await api.post<BankAccount>(`/api/businesses/${businessId}/bank-accounts`, {
      bankName,
      accountNumber,
    })
    return response
  },
}

