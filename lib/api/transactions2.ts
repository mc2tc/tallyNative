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

export const transactions2Api = {
	processReceipt: async (
		payload: ReceiptOcrRequest,
	): Promise<ReceiptOcrResponse> => {
		return api.post<ReceiptOcrResponse>(
			'/authenticated/transactions2/api/receipts',
			payload,
		)
	},
}


