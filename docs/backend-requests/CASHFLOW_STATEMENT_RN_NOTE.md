# Transactions3 Cashflow Statement - RN Team Note

## Overview

This note explains how to call the new cashflow statement endpoint to replace the current client-side classification approach. The endpoint properly categorizes cash flows into operating, investing, and financing activities with accurate inflow/outflow distinction.

---

## Endpoint

**GET** `/api/businesses/{businessId}/cashflow-statement`

### Query Parameters

- `startDate` (optional, ISO 8601): Start date for the period. If omitted, defaults to start of current UK tax year
- `endDate` (optional, ISO 8601): End date for the period. If omitted, defaults to end of current UK tax year
- `includeDetails` (optional, boolean): Include detailed account breakdown (default: false)

### Response Structure

```typescript
{
  businessId: string;
  period: {
    startDate: string;  // ISO 8601
    endDate: string;   // ISO 8601
  };
  operating: {
    inflows: number;      // Total cash inflows from operating activities
    outflows: number;     // Total cash outflows from operating activities
    net: number;          // inflows - outflows
    accounts?: Array<{    // Only included if includeDetails=true
      accountId: string;
      accountName: string;
      amount: number;     // Positive for inflows, negative for outflows
    }>;
  };
  investing: {
    inflows: number;
    outflows: number;
    net: number;
    accounts?: Array<{
      accountId: string;
      accountName: string;
      amount: number;
    }>;
  };
  financing: {
    inflows: number;
    outflows: number;
    net: number;
    accounts?: Array<{
      accountId: string;
      accountName: string;
      amount: number;
    }>;
  };
  netCashFlow: number;   // Sum of all three net values
  revenue: number;       // Total revenue (income) for the period
  cashFlowRatio?: number; // (Operating Cash Flow / Revenue) * 100, only if revenue > 0
}
```

---

## Implementation

### Basic Request (UK Tax Year)

```typescript
async function fetchCashflowStatement(
  businessId: string,
  token: string
): Promise<CashflowStatementResponse> {
  const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}/cashflow-statement`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch cashflow statement');
  }

  return await response.json();
}
```

### Request with Custom Date Range

```typescript
async function fetchCashflowStatementForPeriod(
  businessId: string,
  startDate: Date,
  endDate: Date,
  token: string,
  includeDetails: boolean = false
): Promise<CashflowStatementResponse> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    ...(includeDetails && { includeDetails: 'true' }),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/cashflow-statement?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch cashflow statement');
  }

  return await response.json();
}
```

### Example Usage

```typescript
// Example: Get cashflow for current UK tax year
const cashflow = await fetchCashflowStatement(businessId, token);

console.log('Operating Cash Flow:', cashflow.operating.net);
console.log('Investing Cash Flow:', cashflow.investing.net);
console.log('Financing Cash Flow:', cashflow.financing.net);
console.log('Net Cash Flow:', cashflow.netCashFlow);
console.log('Revenue:', cashflow.revenue);
console.log('Cash Flow Ratio:', cashflow.cashFlowRatio);

// Example: Get cashflow for specific date range with account details
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-12-31');
const cashflowWithDetails = await fetchCashflowStatementForPeriod(
  businessId,
  startDate,
  endDate,
  token,
  true // includeDetails
);

// Access account-level breakdown
if (cashflowWithDetails.operating.accounts) {
  cashflowWithDetails.operating.accounts.forEach((account) => {
    console.log(`${account.accountName}: ${account.amount}`);
  });
}
```

---

## Migration from Current Approach

### Current Approach (chart-accounts with client-side classification)

```typescript
// ❌ Old approach - unreliable client-side classification
const response = await fetch(
  `${API_BASE_URL}/api/businesses/${businessId}/chart-accounts?withValues=true&startDate=${startDate}&endDate=${endDate}`
);
const data = await response.json();

// Client-side heuristic classification (unreliable)
const operating = data.accounts.filter(
  (acc) =>
    acc.cashflowCategory?.includes('operat') ||
    acc.activity?.includes('operat') ||
    acc.category?.includes('operat')
);
// ... similar for investing and financing

// Infer inflows/outflows from positive/negative values (unreliable)
const inflows = operating.filter((acc) => acc.value > 0).reduce((sum, acc) => sum + acc.value, 0);
const outflows = operating
  .filter((acc) => acc.value < 0)
  .reduce((sum, acc) => sum + Math.abs(acc.value), 0);
```

### New Approach (dedicated cashflow endpoint)

```typescript
// ✅ New approach - server-side proper classification
const cashflow = await fetchCashflowStatementForPeriod(businessId, startDate, endDate, token);

// Direct access to properly categorized cash flows
const operatingNet = cashflow.operating.net;
const operatingInflows = cashflow.operating.inflows;
const operatingOutflows = cashflow.operating.outflows;
// ... same for investing and financing
```

---

## Key Improvements

1. **Proper Classification**: Server-side classification based on account types and transaction analysis, not keyword matching
2. **Accurate Inflows/Outflows**: Determined by transaction nature (debits/credits to Cash/Bank accounts), not account balance signs
3. **Revenue Calculation**: Includes total revenue for cash flow ratio calculation
4. **Optional Details**: Can request account-level breakdown for debugging/detailed views

---

## Cashflow Categories

### Operating Activities

- Cash receipts from customers (sales revenue)
- Cash payments to suppliers/employees (expenses)
- Interest received/paid (operating)
- Taxes paid
- Other day-to-day business operations

### Investing Activities

- Purchase of property, plant, equipment
- Sale of assets
- Investments in securities
- Loans made to others

### Financing Activities

- Proceeds from issuing shares
- Payments to shareholders (dividends)
- Proceeds from borrowing
- Repayment of debt
- Capital contributions

---

## Error Handling

```typescript
async function fetchCashflowStatementWithErrorHandling(businessId: string, token: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/businesses/${businessId}/cashflow-statement`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - redirect to login
        throw new Error('Unauthorized');
      } else if (response.status === 403) {
        // Forbidden - user doesn't have access
        throw new Error('Access denied');
      } else if (response.status === 404) {
        // Business not found
        throw new Error('Business not found');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch cashflow statement');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Cashflow statement error:', error);
    // Show error to user
    throw error;
  }
}
```

---

## Date Range Defaults

- **No dates provided**: Defaults to current UK tax year (6th April to 5th April)
- **Both dates provided**: Uses the specified date range
- **One date provided**: Invalid - both must be provided or both omitted

**Note**: The date range defaults match the `chart-accounts` endpoint for consistency.

---

## Testing Checklist

- [ ] Basic request without parameters (uses UK tax year default)
- [ ] Request with custom date range
- [ ] Request with `includeDetails=true` to verify account breakdown
- [ ] Verify operating, investing, and financing categories are correct
- [ ] Verify inflows and outflows are properly distinguished
- [ ] Verify net cash flow calculation (sum of all three nets)
- [ ] Verify revenue calculation
- [ ] Verify cash flow ratio calculation (when revenue > 0)
- [ ] Error handling for 401, 403, 404, 500 errors
- [ ] Loading states during fetch

---

## Example Response

```json
{
  "businessId": "biz_123",
  "period": {
    "startDate": "2024-04-06T00:00:00.000Z",
    "endDate": "2025-04-05T23:59:59.999Z"
  },
  "operating": {
    "inflows": 5567.0,
    "outflows": 5600.32,
    "net": -33.32
  },
  "investing": {
    "inflows": 0.0,
    "outflows": 0.0,
    "net": 0.0
  },
  "financing": {
    "inflows": 5000.0,
    "outflows": 0.0,
    "net": 5000.0
  },
  "netCashFlow": 4966.68,
  "revenue": 11969.0,
  "cashFlowRatio": -0.3
}
```

---

## Questions?

See full documentation: `docs/api/transactions3/cashflow-report-endpoint.md`
