import { api } from './client'

export type CreditCard = {
  cardType: string
  cardNumber: string
}

export type CreditCardsResponse = {
  creditCards: CreditCard[]
}

export const creditCardsApi = {
  getCreditCards: async (businessId: string): Promise<CreditCard[]> => {
    try {
      const response = await api.get<CreditCardsResponse>(
        `/api/businesses/${businessId}/credit-cards`,
      )
      return response.creditCards || []
    } catch (error) {
      // If endpoint doesn't exist yet (404), return empty array
      console.warn('Credit cards endpoint not available:', error)
      return []
    }
  },

  addCreditCard: async (
    businessId: string,
    cardType: string,
    cardNumber: string,
  ): Promise<CreditCard> => {
    const response = await api.post<CreditCard>(`/api/businesses/${businessId}/credit-cards`, {
      cardType,
      cardNumber,
    })
    return response
  },
}

