# Micro Business Oversight System

## Protection Against Fraud, Theft, and Errors

### Core Philosophy

**Oversight ≠ Insight**

- **Insight**: "How is my business performing?" (analytics, KPIs, trends)
- **Oversight**: "Is something wrong?" (anomalies, fraud, errors, theft)

For micro businesses, oversight needs to be:

1. **Simple** - No statistical jargon, just clear alerts
2. **Actionable** - "Check this transaction" not "correlation dropped 0.2"
3. **Early** - Catch problems before they escalate
4. **Low false positives** - Business owners can't ignore alerts

---

## The "Guard Rails" Approach

Think of oversight as guard rails on a highway - they don't tell you how fast you're going (insight), they alert you when you're about to go off the road (oversight).

### Three Layers of Protection

#### Layer 1: Hard Rules (Immediate Alerts)

**"This should never happen"**

These are violations of business rules that indicate clear problems:

1. **Missing Transactions**

   - Business is normally open Mon-Fri, but no transactions on Tuesday
   - Expected daily sales > $500, but $0 today
   - **Alert**: "No transactions recorded on [day] - business may be closed or transactions not recorded"

2. **Impossible Amounts**

   - Cash withdrawal > $10,000 (unusual for micro business)
   - Single transaction > 3x average transaction size
   - Negative sales (refunds exceeding sales)
   - **Alert**: "Unusually large transaction: $X on [date] - verify this is correct"

3. **Timing Violations**

   - Transactions outside business hours (e.g., 2am sales for retail shop)
   - Transactions on known closed days
   - **Alert**: "Transaction recorded at [time] on [date] - outside normal business hours"

4. **Accounting Violations**
   - Debits ≠ Credits (books don't balance)
   - Missing required fields (no vendor, no customer)
   - **Alert**: "Accounting error detected - debits don't match credits"

#### Layer 2: Pattern Breaks (Suspicious Activity)

**"This is unusual based on your history"**

These detect when normal patterns break down:

1. **Velocity Anomalies**

   - **Missing**: Expected 20 transactions/day, got 5
   - **Sudden spike**: Expected 20 transactions/day, got 50
   - **Pattern**: "You typically have [X] transactions on [day], but only [Y] today"

2. **Magnitude Anomalies**

   - Average transaction $50, but today's average is $200
   - Cash sales normally 40% of total, today 90%
   - **Pattern**: "Cash sales are unusually high today (90% vs normal 40%)"

3. **Vendor/Customer Anomalies**

   - New vendor with large transaction (potential fraud)
   - Regular vendor disappears (might be using different name)
   - **Pattern**: "New vendor '[Name]' with $X transaction - verify this is legitimate"

4. **Payment Method Shifts**
   - Cash ratio suddenly drops (employee might not be recording cash)
   - Card ratio suddenly drops (card machine issues or theft)
   - **Pattern**: "Cash sales dropped from 40% to 5% - verify cash is being recorded"

#### Layer 3: Relationship Breakdowns (Your Current System)

**"These things normally move together"**

Your correlation approach fits here - detecting when established relationships break:

1. **Cash vs Card Correlation** (existing)

   - When cash and card sales normally move together, but stop
   - **Pattern**: "Cash and card sales usually correlate, but pattern broke down"

2. **Expense vs Revenue Correlation**

   - Marketing spend normally correlates with sales, but not anymore
   - **Pattern**: "Marketing spend increased but sales didn't - verify marketing effectiveness"

3. **Category Consistency**
   - Normal distribution of expense categories changes suddenly
   - **Pattern**: "Expense categories shifted unexpectedly - review transactions"

---

## Practical Implementation Strategy

### Rule Engine Architecture

```typescript
interface OversightRule {
  id: string;
  name: string; // Human-readable name
  description: string; // What it checks
  severity: 'critical' | 'warning' | 'info';
  category: 'hard-rule' | 'pattern-break' | 'relationship';
  enabled: boolean;

  // Rule logic
  check: (context: BusinessContext) => Promise<RuleResult>;

  // Alert configuration
  alertMessage: (result: RuleResult) => string;
  actionRequired: boolean; // Does user need to do something?
}

interface RuleResult {
  triggered: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  evidence: any; // Transaction IDs, amounts, dates, etc.
  confidence: number; // 0-100, how sure are we?
  requiresReview: boolean;
}
```

### Example Rules

#### Rule 1: Missing Daily Transactions

```typescript
{
  id: 'missing-daily-transactions',
  name: 'Missing Daily Transactions',
  description: 'Detects when expected daily transactions are missing',
  severity: 'warning',
  category: 'hard-rule',

  check: async (context) => {
    const avgDailyTransactions = calculateRollingAverage(context.transactions, 30);
    const todayCount = getTodayTransactionCount(context.transactions);
    const expectedMin = avgDailyTransactions * 0.5; // 50% of average

    if (todayCount < expectedMin && context.isBusinessDay) {
      return {
        triggered: true,
        severity: 'warning',
        message: `Only ${todayCount} transactions today (expected ~${Math.round(avgDailyTransactions)})`,
        evidence: { todayCount, expectedMin, avgDailyTransactions },
        confidence: 85,
        requiresReview: true
      };
    }
    return { triggered: false, ... };
  }
}
```

#### Rule 2: Unusually Large Transaction

```typescript
{
  id: 'unusually-large-transaction',
  name: 'Unusually Large Transaction',
  description: 'Flags transactions that are significantly larger than normal',
  severity: 'critical',
  category: 'pattern-break',

  check: async (context) => {
    const recentTransactions = getRecentTransactions(context.transactions, 30);
    const avgAmount = calculateMean(recentTransactions.map(t => t.totalAmount));
    const stdDev = calculateStdDev(recentTransactions.map(t => t.totalAmount));
    const threshold = avgAmount + (3 * stdDev); // 3 sigma

    const largeTransactions = recentTransactions.filter(
      t => Math.abs(t.totalAmount) > threshold
    );

    if (largeTransactions.length > 0) {
      return {
        triggered: true,
        severity: 'critical',
        message: `${largeTransactions.length} unusually large transaction(s) detected`,
        evidence: {
          transactions: largeTransactions.map(t => ({
            id: t.id,
            date: t.transactionDate,
            amount: t.totalAmount,
            threshold
          })),
          averageAmount: avgAmount
        },
        confidence: 90,
        requiresReview: true
      };
    }
    return { triggered: false, ... };
  }
}
```

#### Rule 3: Cash Ratio Anomaly

```typescript
{
  id: 'cash-ratio-anomaly',
  name: 'Cash Sales Ratio Anomaly',
  description: 'Detects sudden changes in cash vs card sales ratio',
  severity: 'warning',
  category: 'pattern-break',

  check: async (context) => {
    const historicalRatio = calculateCashRatio(context.transactions, 30); // Last 30 days
    const recentRatio = calculateCashRatio(context.transactions, 7); // Last 7 days
    const change = Math.abs(recentRatio - historicalRatio);

    // Alert if ratio changed by more than 30 percentage points
    if (change > 0.30) {
      return {
        triggered: true,
        severity: 'warning',
        message: `Cash sales ratio changed from ${(historicalRatio * 100).toFixed(0)}% to ${(recentRatio * 100).toFixed(0)}%`,
        evidence: { historicalRatio, recentRatio, change },
        confidence: 75,
        requiresReview: true
      };
    }
    return { triggered: false, ... };
  }
}
```

---

## Alert Presentation

### Alert Card Design

```
┌─────────────────────────────────────────┐
│ ⚠️  OVERSIGHT ALERT                     │
├─────────────────────────────────────────┤
│ Missing Daily Transactions              │
│                                         │
│ Only 5 transactions today               │
│ Expected: ~20 transactions             │
│                                         │
│ [View Transactions] [Mark as Reviewed]  │
└─────────────────────────────────────────┘
```

### Alert Prioritization

1. **Critical** (Red) - Immediate action required

   - Accounting errors
   - Impossible amounts
   - Hard rule violations

2. **Warning** (Orange) - Review recommended

   - Pattern breaks
   - Unusual activity
   - Relationship breakdowns

3. **Info** (Blue) - Awareness
   - New patterns detected
   - System learning
   - Non-critical anomalies

### Alert Aggregation

Don't overwhelm users with 50 individual alerts. Group related alerts:

```
┌─────────────────────────────────────────┐
│ 🔍 3 Oversight Issues Detected         │
├─────────────────────────────────────────┤
│ • 2 unusually large transactions       │
│ • Cash ratio anomaly                    │
│ • Missing transactions on Tuesday       │
│                                         │
│ [Review All] [Dismiss]                 │
└─────────────────────────────────────────┘
```

---

## Learning & Adaptation

### Business Profile Learning

The system should learn each business's normal patterns:

```typescript
interface BusinessProfile {
  businessId: string;

  // Normal operating patterns
  operatingHours: { [day: string]: { open: string; close: string } };
  typicalDailyTransactions: number;
  typicalTransactionSize: { mean: number; stdDev: number };
  normalCashRatio: number;
  normalCategoryDistribution: { [category: string]: number };

  // Established relationships (your correlation system)
  establishedCorrelations: Correlation[];

  // Anomaly thresholds (learned, not fixed)
  velocityThreshold: number; // std devs
  magnitudeThreshold: number; // std devs

  // Last updated
  lastProfileUpdate: Date;
  confidence: number; // How confident are we in this profile?
}
```

### Threshold Adaptation

Instead of fixed thresholds, adapt to each business:

1. **Initial Phase** (0-30 days)

   - Use conservative thresholds
   - Learn patterns
   - Build business profile

2. **Learning Phase** (30-90 days)

   - Refine thresholds based on actual patterns
   - Establish normal ranges
   - Build confidence

3. **Monitoring Phase** (90+ days)
   - Use learned thresholds
   - Detect deviations from established patterns
   - High confidence alerts

---

## Key Differences from Current Approach

| Current (Correlation)   | Proposed (Oversight) |
| ----------------------- | -------------------- |
| Statistical analysis    | Rule-based detection |
| Relationship focus      | Threat focus         |
| "Correlation dropped"   | "Cash not recorded"  |
| Requires interpretation | Actionable alerts    |
| Pattern establishment   | Immediate detection  |
| Complex                 | Simple               |

---

## Implementation Phases

### Phase 1: Hard Rules (Week 1-2)

- Missing transactions detection
- Impossible amounts
- Timing violations
- Accounting errors

### Phase 2: Pattern Breaks (Week 3-4)

- Velocity anomalies
- Magnitude anomalies
- Payment method shifts
- Vendor/customer anomalies

### Phase 3: Relationship Breakdowns (Week 5-6)

- Enhance existing correlation system
- Add more relationship types
- Improve alert messaging

### Phase 4: Learning & Adaptation (Week 7-8)

- Business profile learning
- Adaptive thresholds
- Confidence scoring

---

## Success Metrics

1. **Detection Rate**: % of actual fraud/theft caught
2. **False Positive Rate**: % of alerts that are false alarms
3. **Time to Detection**: How quickly problems are caught
4. **User Engagement**: Do users actually review alerts?
5. **Action Rate**: % of alerts that lead to corrective action

---

## Example: Complete Alert Flow

**Scenario**: Employee starts stealing cash by not recording small cash transactions

**Day 1-7**: Normal operations

- System learns: Cash ratio ~40%, 20 transactions/day

**Day 8**: Employee steals $50 cash

- Cash ratio drops to 35%
- Still within normal variance
- **No alert** (avoid false positives)

**Day 9-14**: Employee continues stealing

- Cash ratio drops to 25%
- Transaction count stays same (employee records fewer cash transactions)
- **Alert triggered**: "Cash sales ratio dropped from 40% to 25% - verify cash is being recorded"

**Day 15**: Owner reviews alert, checks transactions

- Finds missing cash transactions
- Takes corrective action

**Result**: Theft caught early, before it escalates

---

## Conclusion

For micro business oversight, focus on:

1. **Simple rules** that catch real problems
2. **Clear alerts** that tell owners what to check
3. **Early detection** before problems escalate
4. **Low false positives** so alerts aren't ignored
5. **Learning system** that adapts to each business

Your correlation system is valuable for Layer 3 (relationship breakdowns), but Layers 1 and 2 (hard rules and pattern breaks) will catch most problems faster and more clearly.
