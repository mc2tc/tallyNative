// Currency formatting utilities

const DEFAULT_CURRENCY = 'GBP'

/**
 * Format amount with 2 decimal places and thousand separators
 * For default currency (GBP), returns number only (e.g., "1,234.56")
 * For foreign currency, returns with symbol (e.g., "BBD571.00")
 */
export function formatAmount(
	amount: number,
	currency: string = DEFAULT_CURRENCY,
	isDefaultCurrency: boolean = false,
): string {
	const formatted = new Intl.NumberFormat('en-GB', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount)

	if (isDefaultCurrency) {
		// Default currency: no symbol
		return formatted
	}

	// Foreign currency: add symbol
	const symbol = getCurrencySymbol(currency)
	return `${symbol}${formatted}`
}

/**
 * Get currency symbol for common currencies
 */
function getCurrencySymbol(currency: string): string {
	const symbols: Record<string, string> = {
		GBP: '£',
		USD: '$',
		EUR: '€',
		BBD: 'BBD',
		CAD: 'C$',
		AUD: 'A$',
		JPY: '¥',
		CHF: 'CHF',
		CNY: '¥',
		INR: '₹',
	}

	return symbols[currency.toUpperCase()] || currency.toUpperCase()
}

