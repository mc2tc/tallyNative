# Revenue Growth KPI Period Data - Backend Request

## Overview

The frontend `RevenueGrowthScreen` is currently performing business logic calculations that should be handled by the backend. The frontend is fetching all sales transactions, filtering by date ranges, and calculating revenue for multiple periods. This violates the separation of concerns principle where the backend should be responsible for data calculations and the frontend should only handle UX/display.

**Current Problem:**
- Frontend fetches all sales transactions from `source_of_truth` collection
- Frontend calculates date ranges for multiple periods
- Frontend filters transactions by date and calculates revenue for each period
- This logic may not match backend KPI calculations, causing inconsistencies

**Solution:**
The backend should return period-based revenue data for multiple periods, matching the same logic used to calculate the `revenueGrowthPercentage` in the health score API.

---

## Current Frontend Requirements

The `RevenueGrowthScreen` needs the following data:

1. **Current Period Revenue** (absolute currency amount)
2. **Previous Period Revenue** (absolute currency amount)
3. **Period Revenue Data** (for bar chart visualization - typically 4 periods)
   - Each period needs: label, revenue value, start date, end date
4. **Revenue Growth Percentage** (already provided in `rawMetrics.revenueGrowthPercentage`)

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

### Extend Existing Health Score Endpoint

Extend the existing `/authenticated/transactions3/api/kpis` endpoint to include period revenue data in the response (similar to how period profit data was added).

**Endpoint:**
```
GET /authenticated/transactions3/api/kpis?businessId={businessId}&timeframe={week|month|quarter}&includePeriodData=true
```

**Note:** The `includePeriodData` parameter should return both profit and revenue period data together, as they use the same period calculations.

---

## Recommended Response Structure

### Extended Health Score Response

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
        revenueGrowthPercentage: number,  // Percentage
        netProfitMargin: number,
        cashCoverageRatio: number,
        currentRatio: number
      },
      timeframe: 'week' | 'month' | 'quarter',
      usesRollingAverage: boolean,
      // Existing period profit data
      periodData?: {
        periods: Array<{
          index: number,
          label: string,
          startDate: number,          // Unix timestamp (milliseconds)
          endDate: number,            // Unix timestamp (milliseconds)
          revenue: number,             // Absolute currency amount
          expenses: number,
          profit: number,
          currency: string
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
        currency: string
      }
    }
  }
}
```

**Note:** The `periodData` structure already includes `revenue` in each period object, so the Revenue Growth screen can use the same `periodData.periods` array. The revenue values are already calculated and included.

---

## Calculation Requirements

### Revenue Calculation
- Sum of all **sales transactions** (`classification.kind === 'sale'`)
- Use `summary.totalAmount` (should be positive)
- Only include transactions from `source_of_truth` collection that are verified/reconciled
- Filter by transaction date within the period range

### Revenue Growth Percentage
- Already calculated in `rawMetrics.revenueGrowthPercentage`
- Should match: `((currentPeriod.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100`
- If `previousPeriod.revenue` is 0, growth percentage should be calculated appropriately (e.g., 100% if current > 0, or 0% if both are 0)

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

**Critical:** The period revenue calculations must use the **exact same logic** as the `revenueGrowthPercentage` calculation in the health score API to ensure consistency:

1. Same transaction filtering (verified/reconciled only)
2. Same classification logic (sale transactions)
3. Same date range calculation
4. Same currency handling

The `revenueGrowthPercentage` should match:
```
revenueGrowthPercentage = ((currentPeriod.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100
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
        },
        "currency": "GBP"
      }
    }
  }
}
```

**Verification:**
- `revenueGrowthPercentage` = ((10000 - 9500) / 9500) * 100 = 5.26% ≈ 5.0% ✓

---

## Frontend Migration Plan

Once the backend endpoint is ready, the frontend will:

1. Remove transaction fetching logic (lines 156-172 in `RevenueGrowthScreen.tsx`)
2. Remove period calculation logic (lines 43-119 in `RevenueGrowthScreen.tsx`)
3. Use backend-provided `periodData.periods` directly for revenue values
4. Use backend-provided labels, dates, and currency
5. Verify that `revenueGrowthPercentage` matches: `((currentPeriod.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100`

---

## Benefits

1. **Consistency**: Frontend and backend use the same calculation logic
2. **Performance**: No need to fetch all transactions on the frontend
3. **Maintainability**: Business logic centralized in backend
4. **Accuracy**: Single source of truth for revenue calculations
5. **Reusability**: Same `periodData` structure used by both Net Profit and Revenue Growth screens

---

## Implementation Note

Since the `periodData` structure already includes `revenue` values (added for Net Profit), the backend implementation should already support Revenue Growth. The frontend just needs to:

1. Use `periodData.periods[].revenue` for the bar chart
2. Use `periodData.currentPeriod.revenue` and `previousPeriod.revenue` for summary displays
3. Verify consistency with `rawMetrics.revenueGrowthPercentage`

No additional backend changes should be needed if `periodData` already includes revenue calculations.

---

## Questions?

- Should we verify that revenue calculations in `periodData` match the `revenueGrowthPercentage` calculation?
- Do we need to support custom date ranges, or only the predefined timeframes?
- What currency handling is needed for multi-currency businesses?

---

## Related Files

- Frontend: `screens/RevenueGrowthScreen.tsx`
- API: `lib/api/transactions2.ts` (healthScoreApi)
- Documentation: `docs/api/TRANSACTIONS2_HEALTH_SCORE_API.md`
- Related: `docs/backend-requests/NET_PROFIT_KPI_PERIOD_DATA.md`

