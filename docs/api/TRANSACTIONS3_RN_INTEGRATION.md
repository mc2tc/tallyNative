# Transactions3 RN Integration Guide

## Overview

Transactions3 is the new single-source-of-truth architecture for transactions. This guide explains how to update the purchase transaction photo upload flow to use the new endpoint.

**Key Change**: Purchase receipts now save to a `pending` collection initially, then move to the source of truth collection after verification. This aligns with our USP: transaction records (receipts) are the source of truth, not bank records.

---

## Update Purchase Photo Upload

### Current Implementation (transactions2)

**Endpoint:**

```
POST /authenticated/transactions2/api/transactions
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "transactionType": "purchase",
  "inputMethod": "ocr_image",
  "fileUrl": "https://storage.googleapis.com/..."
}
```

### New Implementation (transactions3)

**Endpoint:**

```
POST /authenticated/transactions3/api/purchases/ocr
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "fileUrl": "https://storage.googleapis.com/..."
}
```

**Simpler request format** - No need to specify `transactionType` or `inputMethod` for purchase OCR (it's implicit in the endpoint).

---

## Code Update

### Update Your API Client

**Before:**

```typescript
// Old transactions2 endpoint
const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/transactions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: businessId,
    transactionType: 'purchase',
    inputMethod: 'ocr_image',
    fileUrl: fileUrl,
  }),
});
```

**After:**

```typescript
// New transactions3 endpoint
const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/purchases/ocr`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: businessId,
    fileUrl: fileUrl,
  }),
});
```

### Update Screen/Component

Find where you handle "Choose Photo" or "Take Photo" for purchase transactions and update the endpoint URL.

**Example locations to update:**

- Purchase transaction upload screen
- Receipt capture flow
- Any component that calls the purchase OCR endpoint

---

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "transactionId": "tx_abc123",
  "transaction": {
    "metadata": {
      "id": "tx_abc123",
      "businessId": "business_xyz",
      "capture": {
        "source": "purchase_invoice_ocr",
        "mechanism": "ocr"
      },
      "verification": {
        "status": "unverified",  // ← Starts as unverified
        "method": "receipt_ocr"
      },
      "reconciliation": {
        "status": "pending_bank_match"  // ← Waiting for bank reconciliation
      },
      "auditTrail": [
        {
          "action": "created",
          "timestamp": 1704067200000,
          "performedBy": "user_uid",
          "source": "purchase_invoice_ocr"
        }
      ]
    },
    "summary": {
      "thirdPartyName": "Vendor Name",
      "totalAmount": 100.00,
      "transactionDate": 1704067200000,
      "currency": "GBP"
    },
    "accounting": {
      "debits": [],  // ← Empty until verified
      "credits": [],
      "balanced": true
    },
    "details": { ... }
  }
}
```

### Key Differences from transactions2

1. **Transaction Status**: Starts as `verification.status = 'unverified'` (not verified)
2. **Accounting Entries**: Empty until transaction is verified
3. **Audit Trail**: Complete lifecycle tracking in `metadata.auditTrail`
4. **Collection**: Saved to `transactions3_pending` collection (not source of truth yet)

---

## Querying Transactions3

### Get Pending Transactions (Unverified)

**Endpoint:**

```
GET /authenticated/transactions3/api/transactions?businessId=xxx&collection=pending
```

**Query Parameters:**

- `businessId` (required) - Business ID
- `collection` - `pending` (for unverified), `source_of_truth` (for verified), or `archived` (for archived bank records)
- `status` (optional) - Filter by status (e.g., `verification:unverified`)
- `limit` (optional) - Page size (default: 20, max: 100)
- `page` (optional) - Page number (default: 1)

**Example:**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// data.transactions - array of pending transactions
// data.pagination - pagination info
```

### Get Source of Truth Transactions (Verified)

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Get Transactions That Need Reconciliation

**For the "Reconcile to Bank" card**, query verified transactions that need bank reconciliation:

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&status=reconciliation:pending_bank_match`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// data.transactions - array of verified transactions waiting for bank reconciliation
// These transactions have:
// - metadata.verification.status = 'verified'
// - metadata.reconciliation.status = 'pending_bank_match'
```

**Why API-side filtering is recommended:**

- ✅ More efficient (only fetches needed transactions)
- ✅ Better performance (less data transfer)
- ✅ Single source of truth for filtering logic
- ✅ Easier to maintain

**Alternative (not recommended):** You could fetch all verified transactions and filter client-side, but this is less efficient:

```typescript
// ❌ Not recommended - fetches all transactions, then filters client-side
const allTransactions = await fetchAllVerifiedTransactions(businessId);
const needsReconciliation = allTransactions.filter(
  (tx) => tx.metadata.reconciliation.status === 'pending_bank_match'
);
```

### Get Reporting Ready Transactions

Query transactions that are verified, reconciled (or not required), and have accounting entries:

```typescript
// Get all verified transactions from source of truth
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// Filter client-side for reporting ready (has accounting entries and reconciliation complete)
const reportingReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return tx.metadata.verification.status === 'verified' && isReconciled && hasAccounting;
});
```

**Note:** Firestore queries can only filter by one field at a time. For complex filters like "reporting ready", you may need to filter client-side after fetching verified transactions.

---

## Transaction Display Cards

### Card 1: "Needs Verification"

**Query:** Unverified transactions in pending collection

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// data.transactions - transactions waiting for user verification
```

### Card 2: "Reconcile to Bank" (Needs Reconciliation)

**Query:** Verified transactions that need bank reconciliation

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&status=reconciliation:pending_bank_match`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// data.transactions - verified purchase receipts waiting for bank/credit card match
// These transactions have:
// - metadata.verification.status = 'verified'
// - metadata.reconciliation.status = 'pending_bank_match'
// - paymentBreakdown contains card/bank_transfer payments (not cash-only)
```

**UI Behavior:**

- Show these transactions in the "Reconcile to Bank" card
- User can match them with bank/credit card statement entries
- After reconciliation, status changes to `reconciliation.status = 'reconciled'`

### Card 3: "All Transactions" (Reporting Ready)

**Query:** Verified, reconciled transactions with accounting entries

```typescript
// Step 1: Get verified transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Step 2: Filter for reporting ready (client-side)
const reportingReady = data.transactions.filter((tx) => {
  // Verified
  const isVerified = tx.metadata.verification.status === 'verified';

  // Reconciled or not required
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';

  // Has accounting entries
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;

  return isVerified && isReconciled && hasAccounting;
});
```

**Why client-side filtering for reporting ready?**

- Firestore queries can only filter by one field at a time
- "Reporting ready" requires multiple conditions (verified + reconciled + has accounting)
- The dataset is typically smaller (already filtered to verified), so client-side filtering is efficient

---

## Workflow Changes

### Old Workflow (transactions2)

```
1. User uploads photo
2. Transaction saved directly to transactions2 collection
3. Transaction appears in "All Transactions" immediately
```

### New Workflow (transactions3)

```
1. User uploads photo
2. Transaction saved to transactions3_pending collection
3. Transaction appears in "Needs Verification" list
4. User verifies transaction (future endpoint)
5. Transaction moves to transactions3 (source of truth)
6. Transaction appears in "All Transactions" and reporting
```

**For now**: Transactions will appear in pending collection. Verification endpoint coming soon.

---

## UI Considerations

### Show Pending Transactions

You may want to add a new section or filter to show pending (unverified) transactions:

```typescript
// Get unverified transactions
const pendingTransactions = await fetchPendingTransactions(businessId);

// Display in "Needs Verification" section
```

### Transaction Status Indicators

Use `metadata.verification.status` to show status:

- `unverified` - Show "Needs Verification" badge
- `verified` - Show "Verified" badge (once verification endpoint is live)

---

## Migration Strategy

### Option 1: Feature Flag (Recommended)

Add a feature flag to gradually roll out transactions3:

```typescript
const useTransactions3 = getFeatureFlag('use_transactions3');

const endpoint = useTransactions3
  ? '/authenticated/transactions3/api/purchases/ocr'
  : '/authenticated/transactions2/api/transactions';
```

### Option 2: Direct Switch

Update all purchase photo uploads to use transactions3 endpoint directly.

---

## Error Handling

### Same Error Codes

The endpoint uses the same error codes as transactions2:

- `400 Bad Request` - Invalid request (missing businessId, fileUrl, etc.)
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - User doesn't have access to business
- `404 Not Found` - Business not found
- `500 Internal Server Error` - Server error during processing

### Error Response Format

```json
{
  "error": "Business ID is required",
  "requestId": "req_1234567890_abc123"
}
```

---

## Testing

### Test Purchase Photo Upload

```typescript
const testPurchasePhoto = async () => {
  const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/purchases/ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessId: 'test-business-id',
      fileUrl: 'https://example.com/receipt.jpg',
    }),
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Transaction created:', data.transactionId);
    console.log('Status:', data.transaction.metadata.verification.status); // Should be 'unverified'
  } else {
    const error = await response.json();
    console.error('Error:', error.error);
  }
};
```

---

## Verifying Transactions

### Verify Endpoint

After a transaction is created via OCR, it starts in the `pending` collection with `verification.status = 'unverified'`. Users can verify the transaction to move it to the source of truth and generate accounting entries.

**Endpoint:**

```
PATCH /authenticated/transactions3/api/transactions/[transactionId]/verify?businessId=xxx
```

**Optional Request Body (for corrections):**

You can optionally update `paymentBreakdown` and/or `itemList` during verification:

```json
{
  "paymentBreakdown": [
    {
      "type": "card",
      "amount": 50.0
    },
    {
      "type": "cash",
      "amount": 25.0
    }
  ],
  "itemList": [
    {
      "name": "Office Supplies",
      "amount": 75.0,
      "amountExcluding": 62.5,
      "vatAmount": 12.5,
      "debitAccount": "Office Expenses"
    }
  ]
}
```

**Example: Verify with No Updates**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
// data.transactionId - new ID in source of truth collection
// data.transaction - full verified transaction with accounting entries
```

**Example: Verify with Payment Breakdown Update**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paymentBreakdown: [
        { type: 'card', amount: 50.0 },
        { type: 'cash', amount: 25.0 },
      ],
    }),
  }
);
```

**Example: Verify with Item List Update**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
  {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      itemList: [
        {
          name: 'Office Supplies',
          amount: 75.0,
          amountExcluding: 62.5,
          vatAmount: 12.5,
          debitAccount: 'Office Expenses',
        },
      ],
    }),
  }
);
```

### Verification Response

**Success Response (200):**

```json
{
  "success": true,
  "transactionId": "tx_verified_abc123",
  "transaction": {
    "metadata": {
      "id": "tx_verified_abc123",
      "verification": {
        "status": "verified", // ← Now verified
        "verifiedBy": "user_uid",
        "verifiedAt": 1704067300000
      },
      "reconciliation": {
        "status": "pending_bank_match" // ← Card/Bank payment needs reconciliation
        // OR "not_required" if cash-only
      }
    },
    "accounting": {
      "debits": [
        // ← Accounting entries generated
        {
          "chartName": "Office Expenses",
          "amount": 62.5
        },
        {
          "chartName": "VAT",
          "amount": 12.5
        }
      ],
      "credits": [
        {
          "chartName": "Bank Account",
          "amount": 50.0
        },
        {
          "chartName": "Cash",
          "amount": 25.0
        }
      ],
      "balanced": true
    }
  }
}
```

### What Happens During Verification

1. **Transaction moved**: From `transactions3_pending` → `transactions3` (source of truth)
2. **Accounting entries generated**: Debits and credits created based on items and payment methods
3. **Reconciliation status set**:
   - Cash-only → `reconciliation.status = 'not_required'`
   - Card/Bank → `reconciliation.status = 'pending_bank_match'` (needs bank reconciliation)
4. **Audit trail updated**: Verification action added to audit trail

### UI Flow

1. **Show pending transactions** - Display unverified transactions with "Verify" button
2. **User reviews transaction** - Shows OCR-extracted data (vendor, amount, items, etc.)
3. **Optional corrections** - User can update payment breakdown or item list before verifying
4. **User clicks "Verify"** - Calls verification endpoint
5. **Transaction appears in reports** - Once verified, it's in source of truth and appears in accounting reports

### Payment Breakdown Types

- `cash` - Cash payment (no bank reconciliation needed)
- `card` - Card payment (needs bank reconciliation)
- `bank_transfer` - Bank transfer (needs bank reconciliation)
- `cheque` - Cheque payment (needs bank reconciliation)
- `other` - Other payment method

**Reconciliation Logic:**

- If **all** payments are `cash` → `reconciliation.status = 'not_required'`
- If **any** payment is `card` or `bank_transfer` → `reconciliation.status = 'pending_bank_match'`

---

## Next Steps

1. ✅ **Update purchase photo upload** - Use new transactions3 endpoint (this document)
2. ✅ **Verification endpoint** - Verify transactions with optional updates (documented above)
3. ⏳ **Reconciliation endpoint** - Coming soon (to reconcile with bank records)
4. ⏳ **Update transaction lists** - Query transactions3 collections

---

## Questions?

- Check `src/app/authenticated/transactions3/README.md` for implementation details
- See `docs/architecture/TRANSACTIONS3_IMPLEMENTATION_PLAN.md` for full roadmap
- Contact backend team if you need clarification

---

## Summary

**Quick Update Checklist:**

- [ ] Update API endpoint from `/transactions2/api/transactions` to `/transactions3/api/purchases/ocr`
- [ ] Remove `transactionType` and `inputMethod` from request body (simpler format)
- [ ] Update response handling to check `metadata.verification.status = 'unverified'`
- [ ] Update transaction queries to use new transactions3 endpoint
- [ ] Add UI to show "Needs Verification" transactions
- [ ] Test with real receipt images

**That's it!** The endpoint is simpler and aligns with our new architecture where transaction records are the source of truth.
