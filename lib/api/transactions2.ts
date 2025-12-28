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
	pagination: {
		page: number
		limit: number
		totalCount: number
		totalPages: number
		hasNextPage: boolean
		hasPreviousPage: boolean
	}
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
	vatAmount?: number // REQUIRED if invoice includes VAT - see TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md (migrated to transactions3)
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
	// Migrated to transactions3 endpoint - see TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md
	createSaleTransaction: async (
		payload: SalesManualEntryRequest,
	): Promise<SalesManualEntryResponse> => {
		// Build transactionData object (same structure as before)
		const transactionData: {
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
			transactionData.vatAmount = payload.vatAmount
		}
		
		// New transactions3 format: businessId at top level, transactionData nested
		const requestBody = {
			businessId: payload.businessId,
			transactionData,
		}
		
		return api.post<SalesManualEntryResponse>(
			`/authenticated/transactions3/api/sales/manual`,
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
			`/authenticated/transactions3/api/transactions?${params.toString()}`,
		)
	},

	// Get a single transaction by ID
	// Migrated to transactions3 endpoint - searches source_of_truth, pending, and archived collections
	getTransaction: async (transactionId: string, businessId: string): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.get<Transaction>(
			`/authenticated/transactions3/api/transactions/${transactionId}?${params.toString()}`,
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

	// Update a transactions3 transaction item's debitAccount (verified transactions3 only)
	updateTransactions3ItemDebitAccount: async (
		transactionId: string,
		businessId: string,
		itemIndex: number,
		debitAccount: string,
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<Transaction>(
			`/authenticated/transactions3/api/transactions/${transactionId}?${params.toString()}`,
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
		fileSize?: number,
	): Promise<UnifiedTransactionResponse> => {
		return api.post<UnifiedTransactionResponse>(
			'/authenticated/transactions3/api/purchases/ocr',
			{
				businessId,
				fileUrl,
				...(fileSize !== undefined && { fileSize }),
			},
		)
	},

	// Transactions3 sales invoice OCR endpoint - processes invoices from images or PDFs
	// Automatically verified and saved to source_of_truth collection
	// See TRANSACTIONS3_SALES_OCR_RN_INTEGRATION.md for details
	createSalesInvoiceOcr: async (
		businessId: string,
		fileUrl?: string,
		pdfUrl?: string,
		fileSize?: number,
	): Promise<UnifiedTransactionResponse> => {
		return api.post<UnifiedTransactionResponse>(
			'/authenticated/transactions3/api/sales/ocr',
			{
				businessId,
				...(fileUrl && { fileUrl }),
				...(pdfUrl && { pdfUrl }),
				...(fileSize !== undefined && { fileSize }),
			},
		)
	},

	// Transactions3 invoice PDF generation endpoint - generates PDF and uploads to cloud storage
	// Returns PDF URL for download
	// See INVOICE_PDF_GENERATION_BACKEND_REQUIREMENTS.md for backend implementation details
	generateInvoicePDF: async (
		transactionId: string,
		businessId: string,
	): Promise<{ success: boolean; pdfUrl: string; fileName: string }> => {
		return api.post<{ success: boolean; pdfUrl: string; fileName: string }>(
			`/authenticated/transactions3/api/sales/${transactionId}/generate-pdf`,
			{ businessId },
		)
	},

	// Transactions3 manual purchase entry endpoint - verified by default, saves to source of truth
	createPurchaseManual: async (
		businessId: string,
		transactionData: any,
	): Promise<UnifiedTransactionResponse> => {
		return api.post<UnifiedTransactionResponse>(
			'/authenticated/transactions3/api/purchases/manual',
			{
				businessId,
				transactionData,
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
			fileSize?: number
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
				...(options?.fileSize !== undefined && { fileSize: options.fileSize }),
			},
		)
	},

	// Transactions3 credit card statement upload endpoint - automatically classifies and groups transactions
	uploadCreditCardStatement: async (
		businessId: string,
		fileUrl: string,
		options?: {
			cardName?: string
			cardNumber?: string
			statementStartDate?: string
			statementEndDate?: string
			fileSize?: number
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
			'/authenticated/transactions3/api/credit-card-statements/upload',
			{
				businessId,
				fileUrl,
				...(options?.cardName && { cardName: options.cardName }),
				...(options?.cardNumber && { cardNumber: options.cardNumber }),
				...(options?.statementStartDate && { statementStartDate: options.statementStartDate }),
				...(options?.statementEndDate && { statementEndDate: options.statementEndDate }),
				...(options?.fileSize !== undefined && { fileSize: options.fileSize }),
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

	// Transactions3 update verified purchase endpoint - post-verification edit in source_of_truth
	updateTransactions3VerifiedPurchase: async (
		transactionId: string,
		businessId: string,
		options: {
			itemList?: {
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
			}[]
			paymentBreakdown?: { type: string; amount: number }[]
			paymentMethod?: string
		},
	): Promise<{
		success: boolean
		transactionId: string
		transaction: Transaction
	}> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<{
			success: boolean
			transactionId: string
			transaction: Transaction
		}>(
			`/authenticated/transactions3/api/transactions/${transactionId}?${params.toString()}`,
			options,
		)
	},

	// Transactions3 query endpoints - get transactions from transactions3 collections
	getTransactions3: async (
		businessId: string,
		collection: 'pending' | 'source_of_truth' | 'archived',
		options?: { page?: number; limit?: number; status?: string; kind?: string; source?: string },
	): Promise<TransactionsListResponse> => {
		const params = new URLSearchParams({
			businessId,
			collection,
			...(options?.page && { page: options.page.toString() }),
			...(options?.limit && { limit: options.limit.toString() }),
			...(options?.status && { status: options.status }),
			...(options?.source && { source: options.source }),
			...(options?.kind && { kind: options.kind }),
		})
		return api.get<TransactionsListResponse>(
			`/authenticated/transactions3/api/transactions?${params.toString()}`,
		)
	},

	// Transactions3 update payment method endpoint - for verified transactions3 transactions
	updateTransactions3PaymentMethod: async (
		transactionId: string,
		businessId: string,
		paymentMethod: string,
	): Promise<Transaction> => {
		const params = new URLSearchParams({
			businessId,
		})
		return api.patch<Transaction>(
			`/authenticated/transactions3/api/transactions/${transactionId}?${params.toString()}`,
			{
				paymentMethod,
			},
		)
	},

	// Mark invoice as paid (supports both AP and AR invoices)
	// See TRANSACTIONS3_MARK_INVOICE_PAID.md for details
	markInvoiceAsPaid: async (
		transactionId: string,
		businessId: string,
		paymentMethod: string,
		paymentDate?: string,
	): Promise<{ success: boolean; transactionId: string; transaction: Transaction }> => {
		const params = new URLSearchParams({
			businessId,
			paymentMethod,
		})
		if (paymentDate) {
			params.append('paymentDate', paymentDate)
		}
		return api.patch<{ success: boolean; transactionId: string; transaction: Transaction }>(
			`/authenticated/transactions3/api/transactions/${transactionId}/mark-paid?${params.toString()}`,
		)
	},

	// Save inventory items to Firestore (Raw Materials and Finished Goods only)
	// See INVENTORY_ITEMS_SAVE_ENDPOINT.md for details
	saveInventoryItems: async (
		businessId: string,
		transactionId: string,
		items: Array<{
			name: string
			quantity?: number
			unit?: string
			unitCost?: number
			amount: number
			amountExcluding?: number
			vatAmount?: number
			debitAccount?: string
			debitAccountConfirmed?: boolean
			isBusinessExpense?: boolean
			category?: string
			packaging?: {
				primaryPackaging?: {
					description: string
					quantity: number
					unit: string
					material?: string
				}
				secondaryPackaging?: {
					description: string
					quantity: number
					primaryPackagesPerSecondary: number
					material?: string
				}
				totalPrimaryPackages: number
				orderQuantity: number
				orderPackagingLevel: 'primary' | 'secondary'
				confidence?: number
				notes?: string
			}
			costPerPrimaryPackage?: number
			costPerPrimaryPackagingUnit?: number
			thirdPartyName?: string
			transactionDate?: number
			reference?: string
		}>,
	): Promise<{ success: boolean; savedCount: number; itemIds: string[]; message?: string }> => {
		return api.post<{ success: boolean; savedCount: number; itemIds: string[]; message?: string }>(
			'/authenticated/transactions3/api/inventory-items',
			{
				businessId,
				transactionId,
				items,
			},
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

	// Reconcile credit card transactions with purchase receipts (transactions3 endpoint)
	// Note: Uses the same endpoint as bank reconciliation - it handles both bank and credit card
	reconcileCreditCard: async (businessId: string): Promise<ReconciliationResponse> => {
		return api.post<ReconciliationResponse>(
			'/authenticated/transactions3/api/reconcile/bank',
			{ businessId },
		)
	},
}

export type HealthScoreResponse = {
	success: boolean
	data: {
		healthScore: {
			overall: number
			preUnreconciled: number
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
	return api.get<HealthScoreResponse>(
		`/authenticated/transactions3/api/kpis?${params.toString()}`,
	)
	},
}

export type InsightsResponse = {
	summary: string
	explanation: string
	confidence?: number
	risks: string[]
	actions: string[]
	strategy: {
		key: string
		title: string
		guidance?: string
		description?: string
		focusAreas?: string[]
		leadGenHints?: string[]
		ctas?: Array<{
			id: string
			label: string
		}>
	}
}

export const insightsApi = {
	getInsights: async (
		businessId: string,
		timeframe: 'week' | 'month' | 'quarter' = 'week',
		model: 'flash' | 'pro' = 'flash',
	): Promise<InsightsResponse> => {
		return api.post<InsightsResponse>(
			'/authenticated/transactions3/api/kpis/insights',
			{
				businessId,
				timeframe,
				model,
			},
		)
	},
}

export type POSSaleTransactionRequest = {
	businessId: string
	items: Array<{
		itemId: string
		name: string
		price: number
		quantity: number
		description?: string
	}>
	payment: {
		type: 'cash' | 'card'
		subtotal: number
		vat: number
		total: number
	}
	metadata?: {
		source?: string
		createdAt?: number
	}
}

export type POSSaleTransactionResponse = {
	success: boolean
	transactionId: string
	message?: string
}

export const posSaleTransactionApi = {
	createPOSSaleTransaction: async (
		request: POSSaleTransactionRequest,
	): Promise<POSSaleTransactionResponse> => {
		return api.post<POSSaleTransactionResponse>(
			'/authenticated/transactions3/api/sales/pos',
			{
				...request,
				metadata: {
					source: 'pos_one_off_item',
					...request.metadata,
				},
			},
		)
	},
}


