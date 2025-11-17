import { api } from './client'

export type ReceiptOcrRequest = {
	imageUrl: string
	businessId: string
	captureSource?: string
	captureMechanism?: string
	classification?: {
		kind?: 'purchase' | string
		confidence?: number
		needsReview?: boolean
	}
	notes?: string[]
}

export type ReceiptOcrResponse = {
	success: boolean
	transactionId: string
	transaction: unknown
}

export type TransactionSummary = {
	thirdPartyName: string
	totalAmount: number
	subTotalBeforeCharges?: number
	transactionDate: number
	currency: string
	description?: string
}

export type TransactionMetadata = {
	businessId: string
	businessLocation?: string
	imageUrl?: string
	reference?: string
	capture: unknown
	classification: unknown
	createdBy: string
	createdAt: number
	updatedAt: number
}

export type Transaction = {
	id: string
	metadata: TransactionMetadata
	summary: TransactionSummary
	accounting?: unknown
	details?: unknown
}

export type TransactionsListResponse = {
	transactions: Transaction[]
	total?: number
	page?: number
	limit?: number
}

export const transactions2Api = {
	processReceipt: async (
		payload: ReceiptOcrRequest,
	): Promise<ReceiptOcrResponse> => {
		return api.post<ReceiptOcrResponse>(
			'/authenticated/transactions2/api/receipts',
			payload,
		)
	},

	getTransactions: async (
		businessId: string,
		options?: { page?: number; limit?: number },
	): Promise<TransactionsListResponse> => {
		const params = new URLSearchParams({
			businessId,
			...(options?.page && { page: options.page.toString() }),
			...(options?.limit && { limit: options.limit.toString() }),
		})
		return api.get<TransactionsListResponse>(
			`/authenticated/transactions2/api/transactions?${params.toString()}`,
		)
	},
}


