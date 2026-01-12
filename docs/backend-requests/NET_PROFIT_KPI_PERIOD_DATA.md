# Net Profit KPI Period Data - Backend Request

## Overview

The frontend `NetProfitScreen` is currently performing business logic calculations that should be handled by the backend. The frontend is fetching all transactions, filtering by date ranges, and calculating revenue/expenses/profit for multiple periods. This violates the separation of concerns principle where the backend should be responsible for data calculations and the frontend should only handle UX/display.

**Current Problem:**
- Frontend fetches all transactions from `source_of_truth` collection
- Frontend calculates date ranges for multiple periods
- Frontend filters transactions by classification (`sale` vs `purchase`)
- Frontend calculates revenue, expenses, and profit for each period
- This logic may not match backend KPI calculations, causing inconsistencies

**Solution:**
The backend should return period-based profit data (revenue, expenses, net profit) for multiple periods, matching the same logic used to calculate the `netProfitMargin` in the health score API.

---

## Current Frontend Requirements

The `NetProfitScreen` needs the following data:

1. **Current Period Profit** (absolute currency amount)
2. **Previous Period Profit** (absolute currency amount)
3. **Period Profit Data** (for bar chart visualization - typically 4 periods)
   - Each period needs: label, profit value, start date, end date
4. **Revenue and Expenses Breakdown** (optional, for debugging/transparency)

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

### Option 1: Extend Existing Health Score Endpoint

Extend the existing `/authenticated/transactions3/api/kpis` endpoint to include period profit data in the response.

**Endpoint:**
```
GET /authenticated/transactions3/api/kpis?businessId={businessId}&timeframe={week|month|quarter}&includePeriodData=true
```

**New Query Parameter:**
- `includePeriodData` (optional, boolean): Include period-based profit data (default: false)

### Option 2: New Dedicated Endpoint

Create a new endpoint specifically for period profit data.

**Endpoint:**
```
GET /authenticated/transactions3/api/kpis/net-profit/periods?businessId={businessId}&timeframe={week|month|quarter}
```

---

## Recommended Response Structure

### Extended Health Score Response (Option 1)

```typescript
{
  success: true,
  data: {
    healthScore: {
      overall: number,
      preUnreconciled: number,
      kpiScores: {
        revenueGrowth: number,
        netProfit: number,
        cashFlow: number,
        currentRatio: number
      },
      rawMetrics: {
        revenueGrowthPercentage: number,
        netProfitMargin: number,  // Percentage
        cashCoverageRatio: number,
        currentRatio: number
      },
      timeframe: 'week' | 'month' | 'quarter',
      usesRollingAverage: boolean,
      // NEW: Period profit data
      periodData?: {
        periods: Array<{
          index: number,              // 0 = current, 1 = previous, etc.
          label: string,              // e.g., "Last 28 days", "8-14 days ago"
          startDate: number,          // Unix timestamp (milliseconds)
          endDate: number,            // Unix timestamp (milliseconds)
          revenue: number,            // Absolute currency amount
          expenses: number,           // Absolute currency amount
          profit: number,             // revenue - expenses
          currency: string            // e.g., "GBP", "USD"
        }>,
        currentPeriod: {
          revenue: number,
          expenses: number,
          profit: number
        },
        previousPeriod: {
          revenue: number,
          expenses: number,
          profit: number
        }
      }
    }
  }
}
```

### Dedicated Endpoint Response (Option 2)

```typescript
{
  success: true,
  data: {
    businessId: string,
    timeframe: 'week' | 'month' | 'quarter',
    usesRollingAverage: boolean,
    currency: string,
    periods: Array<{
      index: number,
      label: string,
      startDate: number,        // Unix timestamp (milliseconds)
      endDate: number,          // Unix timestamp (milliseconds)
      revenue: number,
      expenses: number,
      profit: number
    }>,
    currentPeriod: {
      revenue: number,
      expenses: number,
      profit: number
    },
    previousPeriod: {
      revenue: number,
      expenses: number,
      profit: number
    },
    // Optional: Include the KPI score and margin for consistency
    kpiScore: number,           // 0-100 normalized score
    netProfitMargin: number     // Percentage
  }
}
```

---

## Calculation Requirements

### Revenue Calculation
- Sum of all **sales transactions** (`classification.kind === 'sale'`)
- Use `summary.totalAmount` (should be positive)
- Only include transactions from `source_of_truth` collection that are verified/reconciled
- Filter by transaction date within the period range

### Expenses Calculation
- Sum of all **purchase transactions** (`classification.kind === 'purchase'`)
- Use absolute value of `summary.totalAmount` (treat as positive expense)
- Only include transactions from `source_of_truth` collection that are verified/reconciled
- Filter by transaction date within the period range

### Profit Calculation
- `profit = revenue - expenses`
- Can be positive (profit) or negative (loss)

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

## Date Range Calculation

The backend should calculate date ranges using the same logic as the frontend currently does:

```typescript
// Pseudo-code for period calculation
function calculatePeriods(timeframe: string, usesRollingAverage: boolean, numPeriods: number = 4) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  const nowTimestamp = now.getTime()
  
  // Determine period length in days
  let periodDays: number
  if (timeframe === 'week') {
    periodDays = usesRollingAverage ? 28 : 7
  } else if (timeframe === 'month') {
    periodDays = 30
  } else { // quarter
    periodDays = 90
  }
  
  const periods = []
  for (let i = 0; i < numPeriods; i++) {
    const endDate = new Date(now)
    endDate.setDate(now.getDate() - (i * periodDays))
    endDate.setHours(23, 59, 59, 999)
    
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - periodDays + 1)
    startDate.setHours(0, 0, 0, 0)
    
    periods.push({
      index: i,
      startDate: i === 0 ? startDate.getTime() : startDate.getTime(),
      endDate: i === 0 ? nowTimestamp : endDate.getTime()
    })
  }
  
  return periods
}
```

---

## Consistency Requirements

**Critical:** The period profit calculations must use the **exact same logic** as the `netProfitMargin` calculation in the health score API to ensure consistency:

1. Same transaction filtering (verified/reconciled only)
2. Same classification logic (sale vs purchase)
3. Same date range calculation
4. Same currency handling

The `netProfitMargin` percentage should match:
```
netProfitMargin = (currentPeriod.profit / currentPeriod.revenue) * 100
```

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
        "cashCoverageRatio": 0.9,
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
            "currency": "GBP"
          },
          {
            "index": 2,
            "label": "57-84 days ago",
            "startDate": 1698710400000,
            "endDate": 1701388799999,
            "revenue": 9000.00,
            "expenses": 8000.00,
            "profit": 1000.00,
            "currency": "GBP"
          },
          {
            "index": 3,
            "label": "85-112 days ago",
            "startDate": 1696032000000,
            "endDate": 1698703999999,
            "revenue": 8800.00,
            "expenses": 7900.00,
            "profit": 900.00,
            "currency": "GBP"
          }
        ],
        "currentPeriod": {
          "revenue": 10000.00,
          "expenses": 8500.00,
          "profit": 1500.00
        },
        "previousPeriod": {
          "revenue": 9500.00,
          "expenses": 8200.00,
          "profit": 1300.00
        }
      }
    }
  }
}
```

---

## Frontend Migration Plan

Once the backend endpoint is ready, the frontend will:

1. Remove transaction fetching logic (lines 154-169 in `NetProfitScreen.tsx`)
2. Remove period calculation logic (lines 171-227 in `NetProfitScreen.tsx`)
3. Use backend-provided `periodData` directly
4. Display backend-provided labels, dates, and values
5. Verify that `netProfitMargin` matches: `(currentPeriod.profit / currentPeriod.revenue) * 100`

---

## Benefits

1. **Consistency**: Frontend and backend use the same calculation logic
2. **Performance**: No need to fetch all transactions on the frontend
3. **Maintainability**: Business logic centralized in backend
4. **Accuracy**: Single source of truth for profit calculations
5. **Scalability**: Backend can optimize queries and caching

---

## Questions?

- Should this be an extension of the existing health score endpoint or a new endpoint?
- Do we need to support custom date ranges, or only the predefined timeframes?
- Should we include transaction-level breakdowns for debugging?
- What currency handling is needed for multi-currency businesses?

---

## Related Files

- Frontend: `screens/NetProfitScreen.tsx`
- API: `lib/api/transactions2.ts` (healthScoreApi)
- Documentation: `docs/api/TRANSACTIONS2_HEALTH_SCORE_API.md`

