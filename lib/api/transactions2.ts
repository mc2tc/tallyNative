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

export type SalesManualEntryRequest = {
	businessId: string
	customerName: string
	transactionDate: string // ISO date string
	totalAmount: number
	currency?: string
	description?: string
	reference?: string
	incomeAccount?: string
	vatAmount?: number // REQUIRED if invoice includes VAT - see TRANSACTIONS2_SALES_MANUAL_ENTRY_API.md
}

export type SalesManualEntryResponse = {
	success: boolean
	transactionId: string
	transaction: Transaction
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

	// Create manual sale transaction (invoice)
	createSaleTransaction: async (
		payload: SalesManualEntryRequest,
	): Promise<SalesManualEntryResponse> => {
		const params = new URLSearchParams({
			businessId: payload.businessId,
		})
		const requestBody: {
			customerName: string
			transactionDate: string
			totalAmount: number
			currency?: string
			description?: string
			reference?: string
			incomeAccount?: string
			vatAmount?: number
		} = {
			customerName: payload.customerName,
			transactionDate: payload.transactionDate,
			totalAmount: payload.totalAmount,
			currency: payload.currency,
			description: payload.description,
			reference: payload.reference,
			incomeAccount: payload.incomeAccount,
		}
		// Include vatAmount if provided (REQUIRED for invoices with VAT)
		if (payload.vatAmount !== undefined && payload.vatAmount > 0) {
			requestBody.vatAmount = payload.vatAmount
		}
		return api.post<SalesManualEntryResponse>(
			`/authenticated/transactions2/api/sales/manual?${params.toString()}`,
			requestBody,
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

	// Transactions3 purchase OCR endpoint - simplified endpoint for purchase receipts
	// This is the new single-source-of-truth architecture for transactions
	createPurchaseOcr: async (
		businessId: string,
		fileUrl: string,
	): Promise<UnifiedTransactionResponse> => {
		return api.post<UnifiedTransactionResponse>(
			'/authenticated/transactions3/api/purchases/ocr',
			{
				businessId,
				fileUrl,
			},
		)
	},

	// Transactions3 bank statement upload endpoint - automatically classifies and groups transactions
	uploadBankStatement: async (
		businessId: string,
		fileUrl: string,
		options?: {
			bankName?: string
			accountNumber?: string
			statementStartDate?: string
			statementEndDate?: string
		},
	): Promise<{
		success: boolean
		summary: {
			totalTransactions: number
			ruleMatched: number
			needsReconciliation: number
			skipped: number
		}
		transactions: {
			needsVerification: Transaction[]
			needsReconciliation: Transaction[]
		}
		skipped: unknown[]
	}> => {
		return api.post<{
			success: boolean
			summary: {
				totalTransactions: number
				ruleMatched: number
				needsReconciliation: number
				skipped: number
			}
			transactions: {
				needsVerification: Transaction[]
				needsReconciliation: Transaction[]
			}
			skipped: unknown[]
		}>(
			'/authenticated/transactions3/api/bank-statements/upload',
			{
				businessId,
				fileUrl,
				...(options?.bankName && { bankName: options.bankName }),
				...(options?.accountNumber && { accountNumber: options.accountNumber }),
				...(options?.statementStartDate && { statementStartDate: options.statementStartDate }),
				...(options?.statementEndDate && { statementEndDate: options.statementEndDate }),
			},
		)
	},

	// Transactions3 verify endpoint - verify a pending transaction
	verifyTransaction: async (
		transactionId: string,
		businessId: string,
		options?: {
			paymentBreakdown?: Array<{ type: string; amount: number }>
			itemList?: Array<{
				name: string
				amount: number
				amountExcluding?: number
				vatAmount?: number
				debitAccount?: string
				debitAccountConfirmed?: boolean
				isBusinessExpense?: boolean
				category?: string
				quantity?: number
				unitCost?: number
			}>
			markAsUnreconcilable?: boolean
			description?: string
			unreconcilableReason?: string
		},
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		const body: {
			paymentBreakdown?: Array<{ type: string; amount: number }>
			itemList?: Array<{
				name: string
				amount: number
				amountExcluding?: number
				vatAmount?: number
				debitAccount?: string
				debitAccountConfirmed?: boolean
				isBusinessExpense?: boolean
				category?: string
				quantity?: number
				unitCost?: number
			}>
			markAsUnreconcilable?: boolean
			description?: string
			unreconcilableReason?: string
		} = {}
		if (options?.paymentBreakdown) {
			body.paymentBreakdown = options.paymentBreakdown
		}
		if (options?.itemList) {
			body.itemList = options.itemList
		}
		if (options?.markAsUnreconcilable !== undefined) {
			body.markAsUnreconcilable = options.markAsUnreconcilable
		}
		if (options?.description) {
			body.description = options.description
		}
		if (options?.unreconcilableReason) {
			body.unreconcilableReason = options.unreconcilableReason
		}
		const response = await api.patch<UnifiedTransactionResponse>(
			`/authenticated/transactions3/api/transactions/${transactionId}/verify?${params.toString()}`,
			Object.keys(body).length > 0 ? body : undefined,
		)
		// Extract transaction from response (response.transaction is the Transaction object)
		return response.transaction as Transaction
	},

	// Transactions3 query endpoints - get transactions from transactions3 collections
	getTransactions3: async (
		businessId: string,
		collection: 'pending' | 'source_of_truth' | 'archived',
		options?: { page?: number; limit?: number; status?: string; kind?: string },
	): Promise<TransactionsListResponse> => {
		const params = new URLSearchParams({
			businessId,
			collection,
			...(options?.page && { page: options.page.toString() }),
			...(options?.limit && { limit: options.limit.toString() }),
			...(options?.status && { status: options.status }),
			...(options?.kind && { kind: options.kind }),
		})
		return api.get<TransactionsListResponse>(
			`/authenticated/transactions3/api/transactions?${params.toString()}`,
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
	// Reconcile bank transactions with purchase receipts (transactions3 endpoint)
	reconcileBank: async (businessId: string): Promise<ReconciliationResponse> => {
		return api.post<ReconciliationResponse>(
			'/authenticated/transactions3/api/reconcile/bank',
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

export type HealthScoreResponse = {
	success: boolean
	data: {
		healthScore: {
			overall: number
			kpiScores: {
				revenueGrowth: number
				netProfit: number
				cashFlow: number
				currentRatio: number
			}
			rawMetrics: {
				revenueGrowthPercentage: number
				netProfitMargin: number
				cashCoverageRatio: number
				currentRatio: number
			}
			timeframe: 'week' | 'month' | 'quarter'
			usesRollingAverage: boolean
		}
	}
}

export const healthScoreApi = {
	getHealthScore: async (
		businessId: string,
		timeframe: 'week' | 'month' | 'quarter' = 'week',
	): Promise<HealthScoreResponse> => {
		const params = new URLSearchParams({
			businessId,
			timeframe,
		})
		console.log(`[KPIs API] Request: businessId=${businessId}, timeframe=${timeframe}`)
		try {
			const response = await api.get<HealthScoreResponse>(
				`/authenticated/transactions2/api/kpis?${params.toString()}`,
			)
			if (response.success && response.data?.healthScore) {
				console.log(`[KPIs API] Success: overall=${response.data.healthScore.overall}, timeframe=${response.data.healthScore.timeframe}`)
			}
			return response
		} catch (error) {
			console.error(`[KPIs API] Error: businessId=${businessId}, timeframe=${timeframe}`, error)
			throw error
		}
	},
}


