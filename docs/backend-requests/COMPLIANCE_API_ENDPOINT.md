# Compliance API Endpoint

## Overview
We need a new compliance monitoring system that checks transactions for patterns that government authorities like HMRC might flag during an audit. This is similar to the existing oversight system but focuses specifically on compliance and audit concerns.

## API Endpoints Required

### 1. POST /api/compliance/check
Triggers a compliance check for a business, analyzing transactions for compliance issues.

**Request:**
```typescript
{
  businessId: string
  transactionId?: string  // Optional: check specific transaction
  forceRefresh?: boolean  // Optional: force re-check even if recently checked
}
```

**Response:**
```typescript
{
  businessId: string
  checkDate: string  // ISO date string
  rulesChecked: number
  alertsGenerated: number
  alerts: string[]  // Array of alert IDs
  processingTime: number  // milliseconds
  message: string  // User-friendly status message
}
```

### 2. GET /api/compliance/alerts
Query compliance alerts with optional filters.

**Query Parameters:**
- `businessId` (required): The business ID
- `unread` (optional): boolean - filter by read/unread status
- `severity` (optional): 'critical' | 'warning' | 'info'
- `limit` (optional): number - max number of alerts to return
- `page` (optional): number - pagination
- `includeDismissed` (optional): boolean
- `status` (optional): 'active' | 'dismissed'

**Response:**
```typescript
{
  alerts: ComplianceAlert[]
  total: number
  unreadCount: number
  message?: string  // User-friendly status message
}
```

### 3. GET /api/compliance/alerts/:alertId
Get detailed information about a specific compliance alert.

**Query Parameters:**
- `businessId` (required): The business ID

**Response:**
```typescript
{
  alert: ComplianceAlert
  relatedTransactions?: Array<{
    id: string
    date: string
    amount: number
    description?: string
  }>
  evidence?: Record<string, unknown>
  recommendations?: string[]
}
```

### 4. POST /api/compliance/alerts/:alertId/dismiss
Dismiss a compliance alert.

**Query Parameters:**
- `businessId` (required): The business ID

**Response:**
```typescript
{
  success: boolean
  alertId: string
  message?: string
}
```

## ComplianceAlert Type

```typescript
{
  id: string
  businessId: string
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  evidence?: Record<string, unknown>
  confidence?: number
  requiresReview: boolean
  read: boolean
  status?: 'active' | 'dismissed'
  resolvedAt?: string
  resolvedBy?: string
  detectedAt?: string  // ISO date string when alert was detected
  createdAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  updatedAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  category?: string
  title?: string
  readBy?: string[]
  readAt?: string[]
  actionRequired?: boolean
  relatedTransactionIds?: string[]
  relatedAlertIds?: string[]
  recommendations?: string[]
}
```

## Initial Compliance Rule: Fuel Expense Without Personal Use Allocation

### Rule Description
Monitor the `transactions3` collection for transactions where:
- The transaction's `accounting.debits` array includes an item with `chartName: "Fuel Expense"`
- BUT the transaction's `accounting.debits` array does NOT include an item with `chartName: "Director's Loan Account"` OR `chartName: "Drawings"`

### Why This Matters
When a business claims fuel expenses, HMRC expects that any personal use portion is properly allocated. If fuel expenses are recorded without a corresponding entry to "Director's Loan Account" (for limited companies) or "Drawings" (for sole traders/partnerships), it suggests the business may be claiming 100% of fuel costs as business expenses when some portion may be personal use. This is a red flag for tax authorities.

### Rule Implementation Details

**Collection to Monitor:** `transactions3`

**Transaction Structure:**
```typescript
{
  id: string
  businessId: string
  accounting: {
    debits: Array<{
      chartName: string
      amount: number
      // ... other fields
    }>
    credits: Array<{
      chartName: string
      amount: number
      // ... other fields
    }>
  }
  // ... other transaction fields
}
```

**Rule Logic:**
1. Query `transactions3` collection where `businessId` matches
2. For each transaction, check if `accounting.debits` array contains:
   - At least one item with `chartName === "Fuel Expense"`
   - AND does NOT contain any item with `chartName === "Director's Loan Account"` OR `chartName === "Drawings"`
3. If condition is met, create a compliance alert

**Alert Details:**
- `ruleId`: "fuel_expense_without_personal_allocation"
- `ruleName`: "Fuel Expense Without Personal Use Allocation"
- `severity`: "warning" (could be escalated to "critical" based on amount/frequency)
- `message`: "This transaction includes fuel expenses but does not allocate any portion to personal use (Director's Loan Account or Drawings). HMRC may question this during an audit if personal use is not properly accounted for."
- `relatedTransactionIds`: [transaction.id]
- `requiresReview`: true
- `actionRequired`: true

### Example Alert Message
```
"Transaction dated [date] includes £[amount] in fuel expenses but does not allocate any portion to personal use. HMRC may question this during an audit. Consider reviewing whether any portion of this fuel expense should be allocated to Director's Loan Account (limited companies) or Drawings (sole traders/partnerships)."
```

## Authentication & Authorization

All endpoints should follow the same authentication and authorization pattern as the oversight API:

1. **Authentication**: Require Firebase Auth token in `Authorization: Bearer <token>` header
2. **Authorization**: Verify user has access to the requested `businessId` by checking `businesses/{businessId}/users/{userId}` collection
3. **Error Responses**:
   - `401` for authentication failures
   - `403` for authorization failures (user doesn't have access to business)
   - `400` for missing/invalid parameters
   - `500` for server errors

## Data Storage

Similar to the oversight system, compliance alerts should be stored in a collection (e.g., `compliance_alerts` or `complianceAlerts`) with:
- Indexed by `businessId`
- Indexed by `businessId` + `status` (for filtering active/dismissed)
- Indexed by `businessId` + `read` (for unread count queries)
- Indexed by `businessId` + `detectedAt` (for sorting by date)

## Performance Considerations

1. **Incremental Checks**: When `forceRefresh: false`, only check transactions that have been created or updated since the last check
2. **Caching**: Consider caching check results for a short period to avoid duplicate checks
3. **Batch Processing**: For large businesses, process transactions in batches
4. **Background Jobs**: Consider running compliance checks as background jobs rather than synchronous API calls

## Future Rules

This is the first compliance rule. The system should be designed to easily add more rules in the future, such as:
- Unusual expense patterns
- Missing VAT documentation
- Round number transactions (potential cash transactions)
- Transactions without proper categorization
- etc.

## Testing

Please provide test cases for:
1. Transaction with fuel expense and personal allocation → No alert
2. Transaction with fuel expense but no personal allocation → Alert generated
3. Transaction without fuel expense → No alert
4. Multiple transactions matching rule → Multiple alerts
5. Dismissing an alert → Alert status updated
6. Querying alerts with filters → Correct filtering applied

## Related Documentation

- See `/api/oversight/check` and `/api/oversight/alerts` for similar implementation patterns
- See `docs/api/MICRO_BUSINESS_OVERSIGHT_SYSTEM.md` for oversight system architecture

