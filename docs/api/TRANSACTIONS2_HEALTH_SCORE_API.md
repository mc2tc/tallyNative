# Transactions2 Health Score API

## Overview

The Health Score API provides a single, normalized 0-100 score that represents overall business health, calculated from four key financial metrics. This score helps small business owners quickly understand their business performance without getting lost in individual numbers.

## Endpoint

```
GET /authenticated/transactions2/api/kpis?businessId=<businessId>&timeframe=<week|month|quarter>
```

## Authentication

Requires valid user authentication token in the request headers.

## Query Parameters

| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| `businessId` | Yes | string | - | The business ID to calculate health score for |
| `timeframe` | No | string | `week` | Time period: `week`, `month`, or `quarter` |

## Response Structure

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "healthScore": {
      "overall": 59.1,
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
      "usesRollingAverage": true
    }
  }
}
```

### Health Score Fields

#### `overall` (number, 0-100)
The final weighted health score. This is the primary metric to display.

**Interpretation:**
- **80-100**: 🟢 Excellent Health - Business is performing very well
- **60-79**: 🟡 Good Health - Business is performing well with room for improvement
- **40-59**: 🟠 Moderate Health - Business needs attention in some areas
- **0-39**: 🔴 Poor Health - Business requires immediate attention

#### `kpiScores` (object)
Individual KPI scores normalized to 0-100 scale:

- **`revenueGrowth`** (0-100): Revenue growth performance
- **`netProfit`** (0-100): Profitability performance
- **`cashFlow`** (0-100): Cash flow health (highest weight: 35%)
- **`currentRatio`** (0-100): Liquidity/asset position

#### `rawMetrics` (object)
The underlying raw metric values before normalization:

- **`revenueGrowthPercentage`** (number): Week-over-week or period-over-period growth %
- **`netProfitMargin`** (number): Net profit as % of revenue
- **`cashCoverageRatio`** (number): Cash inflows / cash outflows
- **`currentRatio`** (number): Total assets / total liabilities

#### `timeframe` (string)
The timeframe used for calculation: `week`, `month`, or `quarter`

#### `usesRollingAverage` (boolean)
- `true` for weekly timeframe (uses rolling 4-week average to smooth noise)
- `false` for monthly/quarterly timeframes

## Example Usage

### React Native Example

```typescript
async function fetchHealthScore(businessId: string, timeframe: 'week' | 'month' | 'quarter' = 'week') {
  try {
    const response = await fetch(
      `https://your-api.com/authenticated/transactions2/api/kpis?businessId=${businessId}&timeframe=${timeframe}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      const healthScore = data.data.healthScore;
      
      // Display overall score
      console.log(`Health Score: ${healthScore.overall}/100`);
      
      // Display individual KPI scores
      console.log(`Revenue Growth: ${healthScore.kpiScores.revenueGrowth}/100`);
      console.log(`Net Profit: ${healthScore.kpiScores.netProfit}/100`);
      console.log(`Cash Flow: ${healthScore.kpiScores.cashFlow}/100`);
      console.log(`Current Ratio: ${healthScore.kpiScores.currentRatio}/100`);
      
      return healthScore;
    } else {
      throw new Error(data.error || 'Failed to fetch health score');
    }
  } catch (error) {
    console.error('Error fetching health score:', error);
    throw error;
  }
}
```

## Health Score Calculation

The overall health score uses a **weighted average** of the four KPI scores:

```
Overall Score = (Cash Flow × 35%) + (Net Profit × 25%) + (Revenue Growth × 20%) + (Current Ratio × 20%)
```

**Why this weighting?**
- **Cash Flow (35%)**: "Cash is King" - if a business runs out of cash, other metrics don't matter
- **Net Profit (25%)**: Profitability is critical for sustainability
- **Revenue Growth (20%)**: Growth indicates business momentum
- **Current Ratio (20%)**: Liquidity shows ability to meet short-term obligations

## KPI Normalization

Each KPI is normalized to a 0-100 scale using linear interpolation with defined benchmarks:

### Revenue Growth
- **Floor (0 pts)**: -20% (disaster territory)
- **Target (50 pts)**: 0% (stable)
- **Ceiling (100 pts)**: +30% (excellent growth)

### Net Profit Margin
- **Floor (0 pts)**: -10% (losing money)
- **Target (50 pts)**: 10% (healthy)
- **Ceiling (100 pts)**: 30% (very strong)

### Cash Coverage Ratio
- **Floor (0 pts)**: 0.7 (burning cash fast)
- **Target (50 pts)**: 1.1 (slightly cash positive)
- **Ceiling (100 pts)**: 1.5 (generating significant surplus)

### Current Ratio (Assets/Liabilities)
- **Floor (0 pts)**: 0.8 (danger zone)
- **Target (50 pts)**: 1.5 (standard health)
- **Ceiling (100 pts)**: 3.0 (highly liquid)

## Timeframe Behavior

### Weekly (`timeframe=week`)
- Uses **rolling 4-week average** (not single week)
- Smooths out noise from rent payments, invoice timing, etc.
- `usesRollingAverage: true`

### Monthly (`timeframe=month`)
- Uses completed month ranges
- Compares current month vs previous month
- `usesRollingAverage: false`

### Quarterly (`timeframe=quarter`)
- Uses completed quarter ranges
- Most stable data, least noise
- `usesRollingAverage: false`

## Minimum Data Requirements

### Absolute Minimum
- **1 transaction**: System will calculate a score (~38.3/100), but it's not meaningful
- ⚠️ Score represents "no data" not "poor performance"

### Recommended Minimum
- **4-6 transactions** across 2 periods for meaningful scores:
  - 2 revenue transactions (1 current, 1 previous) → Revenue Growth
  - 1 expense transaction → Net Profit Margin
  - 1 cash transaction → Cash Flow
  - 1-2 asset/liability transactions → Current Ratio

### Best Practice
Wait for at least 1 completed period (week/month/quarter) with transactions in both current and previous periods before relying on the health score.

## Error Responses

### 400 Bad Request
```json
{
  "error": "Business ID is required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Business not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to calculate KPIs",
  "message": "Error details..."
}
```

## UI Recommendations

### Display the Overall Score
- Show prominently (large, color-coded)
- Use color coding:
  - 🟢 Green: 80-100
  - 🟡 Yellow: 60-79
  - 🟠 Orange: 40-59
  - 🔴 Red: 0-39

### Show Individual KPI Scores
- Display as a breakdown or mini-cards
- Helps users understand which areas need attention
- Use same color coding as overall score

### Display Raw Metrics (Optional)
- Show in tooltips or detail views
- Helps users understand the underlying numbers
- Useful for power users who want more detail

### Recommendations
- If any KPI score < 50, show actionable recommendations:
  - Cash Flow < 50: "Focus on improving cash inflows or reducing outflows"
  - Net Profit < 50: "Review expenses and pricing to improve margins"
  - Revenue Growth < 50: "Develop strategies to increase sales"
  - Current Ratio < 50: "Improve asset position or reduce short-term liabilities"

## Notes

- The health score is calculated from **transactions2** data structure
- Transactions must be **verified and reconciled** to be included
- The score uses **normalized metrics** (percentages and ratios) rather than raw currency amounts, making it scalable across businesses of different sizes
- Weekly timeframe automatically uses rolling 4-week average to prevent misleading single-week spikes/dips

## Example Response Interpretation

```json
{
  "overall": 44.6,
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
  }
}
```

**Interpretation:**
- Overall: 44.6/100 → 🟠 Moderate Health (needs attention)
- The business is growing (58) and profitable (62), but has cash flow (33) and liquidity (30) concerns
- **Action**: Focus on improving cash flow and liquidity position

