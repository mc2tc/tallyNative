# Transactions3 Bank Reconciliation - RN Team Note

## Overview

This note explains how to implement the "Reconcile" button functionality for bank statement transactions that appear on the "Needs Reconciliation" card.

---

## Endpoint

**POST** `/authenticated/transactions3/api/reconcile/bank`

### Request

```typescript
{
  businessId: string  // Required
}
```

### Response

```typescript
{
  success: true,
  matched: number,           // Number of transactions matched
  matches: Array<{           // Array of matched transactions
    bankTransactionId: string,
    purchaseReceiptId: string,
    confidence: number,      // 0.8 or 0.95
    matchReason: string      // Description of match criteria
  }>
}
```

---

## Implementation

### Step 1: Add "Reconcile" Button

Add a "Reconcile" button to your "Needs Reconciliation" card. This button should call the reconciliation endpoint.

### Step 2: Call Reconciliation Endpoint

When the user clicks "Reconcile", call the endpoint:

```typescript
async function handleReconcile(businessId: string, token: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/reconcile/bank`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: businessId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Reconciliation failed');
    }

    const data = await response.json();
    
    // Show success message
    console.log(`Reconciled ${data.matched} transaction(s)`);
    
    // IMPORTANT: Refresh cards after reconciliation
    await refreshCards();
  } catch (error) {
    console.error('Reconciliation error:', error);
    // Show error to user
  }
}
```

### Step 3: Refresh Cards After Reconciliation

After reconciliation, you **must refresh both cards**:

1. **"Needs Reconciliation" card** - Matched bank transactions are archived (removed)
2. **"Verified, Reconciled and Audit Ready" card** - Matched purchase receipts are added

```typescript
async function refreshCards() {
  // Refresh "Needs Reconciliation" card
  const needsReconciliation = await loadNeedsReconciliation(businessId, token);
  setNeedsReconciliation(needsReconciliation);

  // Refresh "Verified, Reconciled and Audit Ready" card
  const auditReady = await loadAuditReady(businessId, token);
  setAuditReady(auditReady);
}
```

---

## What Happens During Reconciliation

### Backend Process

1. **Finds Matches**: Automatically matches bank transactions with purchase receipts based on:
   - Amount (exact match)
   - Date (bank transaction date >= purchase receipt date)
   - Vendor name (fuzzy matching)
   - Reference number (optional, increases confidence)

2. **Updates Purchase Receipts**: For each match:
   - Purchase receipt in `transactions3` collection is updated
   - `metadata.reconciliation.status = 'reconciled'`
   - Match details are stored in `metadata.reconciliation.currentMatch`

3. **Archives Bank Transactions**: For each match:
   - Bank transaction is moved from `transactions3_pending` → `transactions3_archived`
   - Preserves audit trail and links to matched purchase receipt

### UI Impact

- **"Needs Reconciliation" card**: Matched bank transactions disappear (archived)
- **"Verified, Reconciled and Audit Ready" card**: Matched purchase receipts appear (status changed to reconciled)

---

## Query for "Verified, Reconciled and Audit Ready" Card

After reconciliation, query for reconciled purchase receipts:

```typescript
// Query for verified purchase receipts
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=purchase&status=verification:verified`
);

const data = await response.json();

// Filter for audit-ready (reconciled + has accounting entries)
const auditReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

**Important:** Use `kind=purchase` for purchase receipts, not `kind=statement_entry` (which is for bank transactions).

---

## Complete Flow Example

```typescript
// 1. Load "Needs Reconciliation" card
async function loadNeedsReconciliation(businessId: string, token: string) {
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`
  );
  const data = await response.json();
  
  // Filter for transactions without accounting entries
  return data.transactions.filter((tx) => {
    return (tx.accounting.debits?.length ?? 0) === 0 && 
           (tx.accounting.credits?.length ?? 0) === 0;
  });
}

// 2. Handle "Reconcile" button click
async function handleReconcileClick(businessId: string, token: string) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/reconcile/bank`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Reconciliation failed');
    }

    const result = await response.json();
    
    // Show success
    console.log(`Successfully reconciled ${result.matched} transaction(s)`);
    
    // Refresh cards
    const needsReconciliation = await loadNeedsReconciliation(businessId, token);
    const auditReady = await loadAuditReady(businessId, token);
    
    setNeedsReconciliation(needsReconciliation);
    setAuditReady(auditReady);
  } catch (error) {
    console.error('Reconciliation error:', error);
    // Show error to user
  }
}

// 3. Load "Verified, Reconciled and Audit Ready" card
async function loadAuditReady(businessId: string, token: string) {
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=purchase&status=verification:verified`
  );
  const data = await response.json();
  
  // Filter for audit-ready transactions
  return data.transactions.filter((tx) => {
    const isReconciled =
      tx.metadata.reconciliation.status === 'reconciled' ||
      tx.metadata.reconciliation.status === 'not_required';
    const hasAccounting =
      (tx.accounting.debits?.length ?? 0) > 0 || 
      (tx.accounting.credits?.length ?? 0) > 0;
    return isReconciled && hasAccounting;
  });
}
```

---

## Key Points

1. **Automatic Matching**: Backend automatically finds matches - no manual selection needed
2. **Refresh Required**: Always refresh both cards after reconciliation
3. **Bank Transactions**: Matched bank transactions are archived (removed from "Needs Reconciliation" card)
4. **Purchase Receipts**: Matched purchase receipts are marked as reconciled (added to "Verified, Reconciled and Audit Ready" card)
5. **Query Filters**: 
   - "Needs Reconciliation": `collection=pending&kind=statement_entry&status=verification:unverified`
   - "Verified, Reconciled and Audit Ready": `collection=source_of_truth&kind=purchase&status=verification:verified`

---

## Error Handling

Handle these error cases:

- **401 Unauthorized**: User not authenticated - redirect to login
- **403 Forbidden**: User doesn't have access to business
- **500 Server Error**: Show error message with requestId for debugging

---

## Testing Checklist

- [ ] "Reconcile" button calls the endpoint
- [ ] Success message shows number of matches
- [ ] "Needs Reconciliation" card refreshes (matched transactions removed)
- [ ] "Verified, Reconciled and Audit Ready" card refreshes (matched purchase receipts added)
- [ ] Error handling works for failed requests
- [ ] Loading state shown during reconciliation

---

## Questions?

See full documentation: `docs/api/TRANSACTIONS3_BANK_RECONCILIATION.md`

