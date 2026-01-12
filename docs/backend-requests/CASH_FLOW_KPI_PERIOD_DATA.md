# Cash Flow KPI Period Data - Backend Request

## Overview

The frontend `CashFlowScreen` is currently performing business logic calculations that should be handled by the backend. The frontend is fetching all transactions, filtering by date ranges, and calculating cash flow (cash in - cash out) for multiple periods. This violates the separation of concerns principle where the backend should be responsible for data calculations and the frontend should only handle UX/display.

**Current Problem:**
- Frontend fetches all transactions from `source_of_truth` collection
- Frontend calculates date ranges for multiple periods
- Frontend filters transactions by classification (`sale` vs `purchase`)
- Frontend calculates cash in (sales) and cash out (purchases) for each period
- This logic may not match backend KPI calculations, causing inconsistencies

**Solution:**
The backend should return period-based cash flow data for multiple periods, matching the same logic used to calculate the `cashCoverageRatio` in the health score API.

---

## Current Frontend Requirements

The `CashFlowScreen` needs the following data:

1. **Current Period Cash Flow** (absolute currency amount)
2. **Previous Period Cash Flow** (absolute currency amount)
3. **Period Cash Flow Data** (for bar chart visualization - typically 4 periods)
   - Each period needs: label, cash flow value, start date, end date
4. **Cash Coverage Ratio** (already provided in `rawMetrics.cashCoverageRatio`)

### Cash Flow Calculation

**IMPORTANT:** Cash flow is NOT the same as profit. Cash flow tracks actual cash movements, while profit uses accrual accounting.

**Cash Flow (Actual Cash Movements):**
- **Cash Inflows**: Actual cash received during the period
  - Sales paid in cash (payment method = 'cash')
  - Sales paid by card/bank transfer (actual payment date, not invoice date)
  - Accounts Receivable payments received (when customer pays an invoice)
  - Bank deposits
  - Other cash receipts
  
- **Cash Outflows**: Actual cash paid during the period
  - Purchases paid in cash (payment method = 'cash')
  - Purchases paid by card/bank transfer (actual payment date, not purchase date)
  - Accounts Payable payments made (when business pays a supplier invoice)
  - Bank withdrawals
  - Other cash payments

- **Cash Flow**: Cash Inflows - Cash Outflows

**Profit (Accrual Accounting):**
- Revenue recognized (regardless of when cash is received)
- Expenses recognized (regardless of when cash is paid)
- Profit = Revenue - Expenses

**Key Differences:**
- Accounts Receivable: Revenue recognized but cash not yet received → affects profit but not cash flow
- Accounts Payable: Expenses recognized but cash not yet paid → affects profit but not cash flow
- Prepaid expenses: Cash paid but expense recognized later → affects cash flow but not profit yet
- Inventory: Cash paid for inventory but expense recognized when sold → affects cash flow but not profit yet

**Current Frontend Issue:**
The frontend currently incorrectly calculates cash flow as sales - purchases, which is actually profit, not cash flow. This needs to be corrected to track actual cash movements.

### Period Calculation Logic

The frontend currently calculates periods based on:

- **Timeframe**: `week`, `month`, or `quarter`
- **Rolling Average Flag**: `usesRollingAverage` (from health score response)
- **Period Length**:
  - `week` with rolling average: 28 days (4 weeks)
  - `week` without rolling average: 7 days
  - `month`: 30 days
  - `quarter`: 90 days
- **Number of Periods**: 4 periods (current + 3 previous)
- **Date Range Calculation**: Rolling windows from today backwards
  - Period 0 (current): Today minus 0*periodDays to today
  - Period 1: Today minus 1*periodDays to today minus 0*periodDays
  - Period 2: Today minus 2*periodDays to today minus 1*periodDays
  - Period 3: Today minus 3*periodDays to today minus 2*periodDays

---

## Proposed Solution

### Extend Period Data Structure with Cash Flow

The existing `periodData` structure includes `revenue`, `expenses`, and `profit`, but **cash flow needs to be calculated separately** as it tracks actual cash movements, not accrual-based revenue/expenses.

**Backend needs to add `cashFlow` field to periodData:**

```typescript
periodData: {
  periods: Array<{
    // ... existing fields ...
    revenue: number,      // Revenue (accrual)
    expenses: number,     // Expenses (accrual)
    profit: number,       // Profit (revenue - expenses)
    cashInflows: number,  // NEW: Actual cash received
    cashOutflows: number, // NEW: Actual cash paid
    cashFlow: number,     // NEW: Cash Inflows - Cash Outflows
    currency: string
  }>,
  currentPeriod: {
    revenue: number,
    expenses: number,
    profit: number,
    cashInflows: number,  // NEW
    cashOutflows: number, // NEW
    cashFlow: number      // NEW
  },
  previousPeriod: {
    revenue: number,
    expenses: number,
    profit: number,
    cashInflows: number,  // NEW
    cashOutflows: number, // NEW
    cashFlow: number      // NEW
  }
}
```

### Cash Coverage Ratio Verification

The `cashCoverageRatio` in `rawMetrics` should match:
```
cashCoverageRatio = currentPeriod.cashInflows / currentPeriod.cashOutflows
```

This is the ratio of actual cash received to actual cash paid, not revenue/expenses.

---

## Recommended Response Structure

The `periodData` structure needs to be extended with cash flow fields:

```typescript
{
  success: true,
  data: {
    healthScore: {
      // ... existing fields ...
      periodData?: {
        periods: Array<{
          index: number,
          label: string,
          startDate: number,
          endDate: number,
          revenue: number,      // Revenue (accrual)
          expenses: number,     // Expenses (accrual)
          profit: number,       // Profit (revenue - expenses)
          cashInflows: number,  // Actual cash received
          cashOutflows: number, // Actual cash paid
          cashFlow: number,     // Cash Inflows - Cash Outflows
          currency: string
        }>,
        currentPeriod: {
          revenue: number,
          expenses: number,
          profit: number,
          cashInflows: number,
          cashOutflows: number,
          cashFlow: number
        },
        previousPeriod: {
          revenue: number,
          expenses: number,
          profit: number,
          cashInflows: number,
          cashOutflows: number,
          cashFlow: number
        },
        currency: string
      }
    }
  }
}
```

**Usage:**
- Cash Flow = `periodData.periods[].cashFlow`
- Current Cash Flow = `periodData.currentPeriod.cashFlow`
- Previous Cash Flow = `periodData.previousPeriod.cashFlow`
- Cash Inflows = `periodData.periods[].cashInflows`
- Cash Outflows = `periodData.periods[].cashOutflows`

---

## Calculation Requirements

### Cash Flow Calculation (Actual Cash Movements)

**Cash Inflows:**
- Sales transactions where payment was actually received during the period:
  - Cash sales (payment method = 'cash', transaction date in period)
  - Card/bank sales where payment was processed (payment date in period)
  - Accounts Receivable payments received (when invoice marked as paid, payment date in period)
  - Bank deposits (bank transactions classified as income, date in period)
  - Other cash receipts

**Cash Outflows:**
- Purchase transactions where payment was actually made during the period:
  - Cash purchases (payment method = 'cash', transaction date in period)
  - Card/bank purchases where payment was processed (payment date in period)
  - Accounts Payable payments made (when invoice marked as paid, payment date in period)
  - Bank withdrawals (bank transactions classified as expenses, date in period)
  - Other cash payments

**Cash Flow:**
- `cashFlow = cashInflows - cashOutflows`

**Important:** Cash flow is based on **when cash actually moves**, not when revenue/expenses are recognized. This means:
- An invoice issued but not yet paid → affects revenue/profit but NOT cash flow
- A purchase invoice received but not yet paid → affects expenses/profit but NOT cash flow
- Payment of an old invoice → affects cash flow but NOT current period profit

### Cash Coverage Ratio
- Already calculated in `rawMetrics.cashCoverageRatio`
- Should match: `currentPeriod.cashInflows / currentPeriod.cashOutflows`
- This is the ratio of actual cash received to actual cash paid
- If `cashOutflows` is 0, handle appropriately (e.g., return a high value or null)

### Period Labels
- Period 0 (current):
  - `week` + rolling average: "Last 28 days"
  - `week` without rolling: "Last 7 days"
  - `month`: "Last 30 days"
  - `quarter`: "Last 90 days"
- Period 1+ (previous):
  - `week` + rolling average: "29-56 days ago", "57-84 days ago", etc.
  - `week` without rolling: "8-14 days ago", "15-21 days ago", etc.
  - `month`: "31-60 days ago", "61-90 days ago", etc.
  - `quarter`: "91-180 days ago", "181-270 days ago", etc.

---

## Consistency Requirements

**Critical:** The period cash flow calculations must use the **exact same logic** as the `cashCoverageRatio` calculation in the health score API to ensure consistency:

1. Same transaction filtering (verified/reconciled only)
2. Same classification logic (sale vs purchase)
3. Same date range calculation
4. Same currency handling

The `cashCoverageRatio` should match:
```
cashCoverageRatio = currentPeriod.cashInflows / currentPeriod.cashOutflows
```

And cash flow should match:
```
cashFlow = currentPeriod.cashInflows - currentPeriod.cashOutflows
```

**Note:** Cash flow is NOT the same as profit:
- `profit = revenue - expenses` (accrual accounting)
- `cashFlow = cashInflows - cashOutflows` (cash accounting)

---

## Example Response

```json
{
  "success": true,
  "data": {
    "healthScore": {
      "overall": 59.1,
      "preUnreconciled": 65.0,
      "kpiScores": {
        "revenueGrowth": 58.0,
        "netProfit": 62.0,
        "cashFlow": 33.0,
        "currentRatio": 30.0
      },
      "rawMetrics": {
        "revenueGrowthPercentage": 5.0,
        "netProfitMargin": 15.0,
        "cashCoverageRatio": 1.31,
        "currentRatio": 1.2
      },
      "timeframe": "week",
      "usesRollingAverage": true,
      "periodData": {
        "periods": [
          {
            "index": 0,
            "label": "Last 28 days",
            "startDate": 1704067200000,
            "endDate": 1706659199999,
            "revenue": 10000.00,
            "expenses": 8500.00,
            "profit": 1500.00,
            "cashInflows": 10500.00,
            "cashOutflows": 8000.00,
            "cashFlow": 2500.00,
            "currency": "GBP"
          },
          {
            "index": 1,
            "label": "29-56 days ago",
            "startDate": 1701388800000,
            "endDate": 1704067199999,
            "revenue": 9500.00,
            "expenses": 8200.00,
            "profit": 1300.00,
            "cashInflows": 9000.00,
            "cashOutflows": 8500.00,
            "cashFlow": 500.00,
            "currency": "GBP"
          }
        ],
        "currentPeriod": {
          "revenue": 10000.00,
          "expenses": 8500.00,
          "profit": 1500.00,
          "cashInflows": 10500.00,
          "cashOutflows": 8000.00,
          "cashFlow": 2500.00
        },
        "previousPeriod": {
          "revenue": 9500.00,
          "expenses": 8200.00,
          "profit": 1300.00,
          "cashInflows": 9000.00,
          "cashOutflows": 8500.00,
          "cashFlow": 500.00
        },
        "currency": "GBP"
      }
    }
  }
}
```

**Verification:**
- Cash Flow (current) = 10500 - 8000 = 2500.00 ✓ (Note: different from profit due to timing differences)
- Cash Flow (previous) = 9000 - 8500 = 500.00 ✓
- Cash Coverage Ratio = 10500 / 8000 = 1.31 ✓
- Profit (current) = 10000 - 8500 = 1500.00 (different from cash flow)

---

## Frontend Migration Plan

Once the backend endpoint is ready, the frontend will:

1. Remove transaction fetching logic (lines 154-169 in `CashFlowScreen.tsx`)
2. Remove period calculation logic (lines 43-119 in `CashFlowScreen.tsx`)
3. Use backend-provided `periodData.periods[].cashFlow` for cash flow values
4. Use backend-provided `periodData.periods[].cashInflows` and `cashOutflows` for breakdowns
5. Use backend-provided labels, dates, and currency
6. Verify that `cashCoverageRatio` matches: `currentPeriod.cashInflows / currentPeriod.cashOutflows`

---

## Benefits

1. **Consistency**: Frontend and backend use the same calculation logic
2. **Performance**: No need to fetch all transactions on the frontend
3. **Maintainability**: Business logic centralized in backend
4. **Accuracy**: Single source of truth for cash flow calculations
5. **Reusability**: Same `periodData` structure used by Net Profit, Revenue Growth, and Cash Flow screens

---

## Implementation Note

**IMPORTANT:** Cash flow is NOT the same as profit. The backend needs to:

1. **Add cash flow calculation logic** that tracks actual cash movements:
   - Calculate `cashInflows` based on when cash was actually received (payment dates, not invoice dates)
   - Calculate `cashOutflows` based on when cash was actually paid (payment dates, not purchase dates)
   - Handle Accounts Receivable payments (cash received when invoice is paid)
   - Handle Accounts Payable payments (cash paid when invoice is paid)
   - Consider payment methods (cash, card, bank transfer) and their actual processing dates

2. **Add new fields to periodData:**
   - `cashInflows`: Actual cash received during the period
   - `cashOutflows`: Actual cash paid during the period
   - `cashFlow`: cashInflows - cashOutflows

3. **Update cashCoverageRatio calculation** to use cash flows:
   - `cashCoverageRatio = cashInflows / cashOutflows` (not revenue/expenses)

This is a significant backend change that requires tracking actual payment dates and methods, not just transaction dates.

---

## Questions?

- Should we verify that cash flow calculations in `periodData` match the `cashCoverageRatio` calculation?
- Do we need to support custom date ranges, or only the predefined timeframes?
- What currency handling is needed for multi-currency businesses?

---

## Related Files

- Frontend: `screens/CashFlowScreen.tsx`
- API: `lib/api/transactions2.ts` (healthScoreApi)
- Documentation: `docs/api/TRANSACTIONS2_HEALTH_SCORE_API.md`
- Related: `docs/backend-requests/NET_PROFIT_KPI_PERIOD_DATA.md`

