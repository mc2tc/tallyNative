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

export type UnifiedTransactionRequest = {
	businessId: string
	transactionType: 'purchase' | 'sale' | 'bank_transaction' | 'credit_card_transaction' | 'internal'
	inputMethod: 'ocr_image' | 'ocr_pdf' | 'manual'
	fileUrl?: string
	transactionData?: any
	captureSource?: string
	captureMechanism?: string
}

export type UnifiedTransactionResponse = {
	success: boolean
	transactionId: string
	transaction: unknown
	message?: string
	transactionType?: string
	inputMethod?: string
	captureMetadata?: {
		source?: string
		mechanism?: string
	}
	transactionKind?: string
	logged?: boolean
	logId?: string
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
		options?: { page?: number; limit?: number; classificationKind?: string },
	): Promise<TransactionsListResponse> => {
		const params = new URLSearchParams({
			businessId,
			...(options?.page && { page: options.page.toString() }),
			...(options?.limit && { limit: options.limit.toString() }),
			...(options?.classificationKind && { classificationKind: options.classificationKind }),
		})
		return api.get<TransactionsListResponse>(
			`/authenticated/transactions2/api/transactions?${params.toString()}`,
		)
	},

	// Get a single transaction by ID
	// Note: This endpoint should be implemented on the backend
	getTransaction: async (transactionId: string, businessId: string): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.get<Transaction>(
			`/authenticated/transactions2/api/transactions/${transactionId}?${params.toString()}`,
		)
	},

	// Update a transaction item's debitAccount
	updateItemDebitAccount: async (
		transactionId: string,
		businessId: string,
		itemIndex: number,
		debitAccount: string,
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<Transaction>(
			`/authenticated/transactions2/api/transactions/${transactionId}?${params.toString()}`,
			{
				itemIndex,
				debitAccount,
			},
		)
	},

	// Update a transaction's payment method
	updatePaymentMethod: async (
		transactionId: string,
		businessId: string,
		paymentMethod: string,
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<Transaction>(
			`/authenticated/transactions2/api/transactions/${transactionId}?${params.toString()}`,
			{
				paymentMethod,
			},
		)
	},

	// Confirm verification - sets paymentBreakdown userConfirmed and verification status
	// If paymentBreakdown contains only entries of type "cash", also sets reconciliation.status to "reconciled"
	// (since cash transactions don't need to be reconciled against bank records)
	confirmVerification: async (
		transactionId: string,
		businessId: string,
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<Transaction>(
			`/authenticated/transactions2/api/transactions/${transactionId}/verify?${params.toString()}`,
			{},
		)
	},

	// Unified transaction endpoint - supports all transaction types and input methods
	createTransaction: async (
		payload: UnifiedTransactionRequest,
	): Promise<UnifiedTransactionResponse> => {
		return api.post<UnifiedTransactionResponse>(
			'/authenticated/transactions2/api/transactions',
			payload,
		)
	},
}

export type ReconciliationMatch = {
	bankTransactionId?: string
	creditCardTransactionId?: string
	purchaseReceiptId: string
	confidence: number
	matchReason: string
}

export type ReconciliationResponse = {
	success: boolean
	matched: number
	matches: ReconciliationMatch[]
}

export const reconciliationApi = {
	// Reconcile bank transactions with purchase receipts
	reconcileBank: async (businessId: string): Promise<ReconciliationResponse> => {
		return api.post<ReconciliationResponse>(
			'/authenticated/transactions2/api/reconcile/bank',
			{ businessId },
		)
	},

	// Reconcile credit card transactions with purchase receipts
	reconcileCreditCard: async (businessId: string): Promise<ReconciliationResponse> => {
		return api.post<ReconciliationResponse>(
			'/authenticated/transactions2/api/reconcile/credit-card',
			{ businessId },
		)
	},
}


