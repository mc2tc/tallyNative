# Cashflow Report Endpoint Request

## Overview
We need a dedicated endpoint to generate cashflow statements for the mobile app. The current implementation uses the generic chart-accounts endpoint and attempts to classify accounts client-side, which is unreliable and doesn't properly distinguish between cash inflows and outflows.

## Current Situation
- **Current endpoint**: `/api/businesses/{businessId}/chart-accounts?withValues=true`
- **Problem**: The frontend is doing heuristic-based classification by searching for keywords ("operat", "invest", "financ") in various account fields (`cashflowCategory`, `activity`, `category`, `type`), which is unreliable
- **Missing data**: No proper distinction between cash inflows and outflows (currently inferring from positive/negative values)

## Required Endpoint

### Endpoint Specification
```
GET /api/businesses/{businessId}/cashflow-statement
```

### Query Parameters
- `startDate` (optional, ISO 8601): Start date for the period. If omitted, should default to "all time" (beginning of business)
- `endDate` (optional, ISO 8601): End date for the period. If omitted, should default to current date
- `period` (optional, string): Predefined period shortcuts like "all-time", "ytd", "last-month", "last-quarter", "last-year"

### Response Structure

```typescript
{
  businessId: string
  period: {
    startDate: string  // ISO 8601
    endDate: string    // ISO 8601
  }
  
  // Operating Activities
  operating: {
    inflows: number      // Total cash inflows from operating activities
    outflows: number     // Total cash outflows from operating activities
    net: number          // inflows - outflows
    accounts?: Array<{   // Optional: detailed breakdown by account
      accountId: string
      accountName: string
      amount: number     // Positive for inflows, negative for outflows
    }>
  }
  
  // Investing Activities
  investing: {
    inflows: number
    outflows: number
    net: number
    accounts?: Array<{
      accountId: string
      accountName: string
      amount: number
    }>
  }
  
  // Financing Activities
  financing: {
    inflows: number
    outflows: number
    net: number
    accounts?: Array<{
      accountId: string
      accountName: string
      amount: number
    }>
  }
  
  // Summary
  netCashFlow: number   // Sum of all three net values
  
  // Additional metrics for ratio calculation
  revenue: number        // Total revenue (income) for the period (for cash flow ratio)
  cashFlowRatio?: number // Optional: (Operating Cash Flow / Revenue) * 100
}
```

## Business Logic Requirements

### Cashflow Classification
Accounts should be properly classified into:
1. **Operating Activities**: Day-to-day business operations
   - Cash receipts from customers
   - Cash payments to suppliers/employees
   - Interest received/paid (operating)
   - Taxes paid
   - Other operating cash flows

2. **Investing Activities**: Purchase/sale of long-term assets
   - Purchase of property, plant, equipment
   - Sale of assets
   - Investments in securities
   - Loans made to others

3. **Financing Activities**: Changes in equity and debt
   - Proceeds from issuing shares
   - Payments to shareholders (dividends)
   - Proceeds from borrowing
   - Repayment of debt
   - Capital contributions

### Inflows vs Outflows
- **Inflows**: Money coming into the business (positive impact on cash)
- **Outflows**: Money leaving the business (negative impact on cash)
- This should be determined by the nature of the transaction, not just the sign of the account balance

### Revenue Calculation
- Revenue should be the sum of all income accounts for the period
- Used to calculate: `Cash Flow Ratio = (Operating Cash Flow / Revenue) * 100`

## Implementation Notes

1. **Account Classification**: Accounts should have a proper `cashflowCategory` field with values: `"operating"`, `"investing"`, `"financing"`, or be classified based on account type and transaction patterns

2. **Transaction Analysis**: The endpoint should analyze transactions (debits/credits) to determine:
   - Which accounts contribute to cashflow
   - Whether each transaction represents an inflow or outflow
   - Proper categorization based on transaction purpose

3. **Period Handling**: 
   - "All Time" should aggregate from business inception to current date
   - Date ranges should filter transactions appropriately
   - The `period` object in the response should reflect the actual period used

4. **Optional Detail Level**: Consider adding a `includeDetails=true` query parameter to include the `accounts` arrays in each activity section for debugging/detailed views

## Example Response

```json
{
  "businessId": "biz_123",
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  },
  "operating": {
    "inflows": 5567.00,
    "outflows": 5600.32,
    "net": -33.32
  },
  "investing": {
    "inflows": 0.00,
    "outflows": 0.00,
    "net": 0.00
  },
  "financing": {
    "inflows": 5000.00,
    "outflows": 0.00,
    "net": 5000.00
  },
  "netCashFlow": 4966.68,
  "revenue": 11969.00,
  "cashFlowRatio": -0.3
}
```

## Priority
**High** - This is needed to properly display cashflow statements in the mobile app. The current workaround is fragile and may produce incorrect results.

## Questions for Backend Team
1. Do we have proper cashflow categorization in the database/accounting system?
2. How should we handle accounts that might span multiple categories?
3. Should we include a breakdown by individual accounts, or is the summary sufficient?
4. Are there any specific accounting standards (GAAP, IFRS) we need to follow for cashflow classification?
