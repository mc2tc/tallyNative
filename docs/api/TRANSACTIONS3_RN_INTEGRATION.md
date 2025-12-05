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

## Update Bank Statement Upload

### Current Implementation (transactions2)

**Endpoint:**

```
POST /authenticated/transactions2/api/transactions
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "transactionType": "bank_transaction",
  "inputMethod": "ocr_pdf",
  "fileUrl": "https://storage.googleapis.com/...",
  "bankName": "Bank Name",
  "accountNumber": "12345678",
  "statementStartDate": "2025-01-01",
  "statementEndDate": "2025-01-31"
}
```

### New Implementation (transactions3)

**Endpoint:**

```
POST /authenticated/transactions3/api/bank-statements/upload
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "fileUrl": "https://storage.googleapis.com/...",
  "bankName": "Bank Name",
  "accountNumber": "12345678",
  "statementStartDate": "2025-01-01",
  "statementEndDate": "2025-01-31"
}
```

**Simpler request format** - No need to specify `transactionType` or `inputMethod` (it's implicit in the endpoint).

### Key Changes

1. **Auto-Classification**: Bank statement transactions are automatically classified using rules:

   - **Bank fees** → Auto-classified, creates accounting entries, no reconciliation needed
   - **Cash withdrawals** → Auto-classified, creates accounting entries, no reconciliation needed
   - **Other transactions** → Need reconciliation with purchase receipts

2. **Grouped Response**: Transactions are returned grouped by status for easy card population:

   - `needsVerification` - Rule-matched transactions (have accounting entries, need verification)
   - `needsReconciliation` - Transactions without rule matches (need reconciliation with purchase receipts)

3. **Saved to Pending**: All bank transactions are saved to `transactions3_pending` collection (not source of truth)

---

## Code Update for Bank Statements

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
    transactionType: 'bank_transaction',
    inputMethod: 'ocr_pdf',
    fileUrl: fileUrl,
    bankName: bankName,
    accountNumber: accountNumber,
    statementStartDate: statementStartDate,
    statementEndDate: statementEndDate,
  }),
});
```

**After:**

```typescript
// New transactions3 endpoint
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/bank-statements/upload`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessId: businessId,
      fileUrl: fileUrl,
      bankName: bankName,
      accountNumber: accountNumber,
      statementStartDate: statementStartDate,
      statementEndDate: statementEndDate,
    }),
  }
);

const data = await response.json();

// Transactions are already grouped for you!
const needsVerification = data.transactions.needsVerification; // Rule-matched (bank fees, withdrawals)
const needsReconciliation = data.transactions.needsReconciliation; // Need to match with purchase receipts
```

### Bank Statement Response Format

**Success Response (200):**

```json
{
  "success": true,
  "summary": {
    "totalTransactions": 10,
    "ruleMatched": 3,
    "needsReconciliation": 7,
    "skipped": 0
  },
  "transactions": {
    "needsVerification": [
      {
        "id": "tx_bank_001",
        "metadata": {
          "verification": {
            "status": "unverified"
          },
          "reconciliation": {
            "status": "not_required"
          }
        },
        "summary": {
          "thirdPartyName": "Bank Fee",
          "totalAmount": 25.0,
          "transactionDate": 1704067200000,
          "currency": "GBP"
        },
        "accounting": {
          "debits": [
            {
              "chartName": "Fees & Charges",
              "amount": 25.0
            }
          ],
          "credits": [
            {
              "chartName": "Bank",
              "amount": 25.0
            }
          ],
          "balanced": true
        }
      }
    ],
    "needsReconciliation": [
      {
        "id": "tx_bank_002",
        "metadata": {
          "verification": {
            "status": "unverified"
          },
          "reconciliation": {
            "status": "pending_bank_match"
          }
        },
        "summary": {
          "thirdPartyName": "SUPPLIER NAME",
          "totalAmount": 150.0,
          "transactionDate": 1704067200000,
          "currency": "GBP"
        },
        "accounting": {
          "debits": [],
          "credits": [],
          "balanced": false
        }
      }
    ]
  },
  "skipped": []
}
```

### Populating the 4 Cards

The response is already grouped for you to populate your cards:

**Card 1: "Needs Verification" (No Reconciliation Required)**

- Use `data.transactions.needsVerification`
- These are rule-matched transactions (bank fees, cash withdrawals)
- They have accounting entries already created
- They just need user verification (no reconciliation needed)
- Display on card titled "Needs Verification"

**Card 2: "Needs Reconciliation"**

- Use `data.transactions.needsReconciliation`
- These transactions don't match any rules
- They need to be matched with purchase receipts
- No accounting entries created yet
- Display on card titled "Needs Reconciliation"

**Card 3: "Confirmed Unreconcilable"**

- Query pending transactions that user has marked as unreconcilable (future feature)
- For now, this card can be empty or show manual entries

**Card 4: "Verified and Audit Ready"**

- Query source of truth transactions that are verified, reconciled, and have accounting entries
- These are ready for reporting
- Use the query endpoint (see "Querying Bank Transactions" section below)

---

## Querying Bank Transactions

**IMPORTANT:** When querying bank transactions, **always filter by `kind=statement_entry`** to exclude purchase receipts. Filtering happens on the **backend** for collection, kind, and status.

### Card 1: "Needs Verification" (Rule-Matched Bank Transactions)

**Backend Query (Filters on server):**

- Collection: `pending`
- Kind: `statement_entry` (bank transactions only)
- Verification Status: `unverified`

**Frontend Filter (Simple check):**

- Has accounting entries (rule-matched)

```typescript
// Query backend for pending unverified bank transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for transactions with accounting entries (rule-matched)
const needsVerification = data.transactions.filter((tx) => {
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return hasAccountingEntries;
});
```

### Card 2: "Needs Reconciliation" (Bank Transactions Without Rule Matches)

**Backend Query (Filters on server):**

- Collection: `pending`
- Kind: `statement_entry` (bank transactions only)
- Verification Status: `unverified`

**Frontend Filter (Simple check):**

- No accounting entries (no rule match)

```typescript
// Query backend for pending unverified bank transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for transactions WITHOUT accounting entries (no rule match)
const needsReconciliation = data.transactions.filter((tx) => {
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return !hasAccountingEntries;
});
```

### Card 3: "Confirmed Unreconcilable"

Query pending transactions that user has marked as unreconcilable (future feature). For now, this card can be empty.

### Card 4: "Verified and Audit Ready"

**Backend Query (Filters on server):**

- Collection: `source_of_truth`
- Kind: `statement_entry` (bank transactions only)
- Verification Status: `verified`

**Frontend Filter (Simple checks):**

- Reconciled or not required
- Has accounting entries

```typescript
// Query backend for verified bank transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for audit ready
const auditReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

### Why Backend + Frontend Filtering?

**Backend filters** (efficient, indexed):

- Collection (`pending`, `source_of_truth`)
- Transaction kind (`statement_entry` for bank transactions)
- Verification status (`unverified`, `verified`)
- Reconciliation status (`pending_bank_match`, `reconciled`)

**Frontend filters** (simple checks):

- Presence of accounting entries (can't be efficiently indexed/queried)
- Complex conditions (e.g., "reporting ready" = verified + reconciled + has accounting)

**Always use `kind=statement_entry`** when querying bank transactions to exclude purchase receipts!

### UI Flow for Bank Statements

1. **User uploads bank statement PDF** → Calls new endpoint
2. **Backend processes and groups transactions** → Returns grouped response
3. **Populate cards immediately**:
   - Card 1: Show `needsVerification` transactions
   - Card 2: Show `needsReconciliation` transactions
4. **User verifies rule-matched transactions** (bank fees, withdrawals) → Move to source of truth
5. **User reconciles other transactions** → Match with purchase receipts

---

## Querying Bank Transactions for the 4 Cards

**IMPORTANT:** When querying bank transactions, **always filter by `kind=statement_entry`** to exclude purchase receipts.

### Backend vs Frontend Filtering

**Backend Filtering (Recommended):**

- ✅ Collection (`pending`, `source_of_truth`)
- ✅ Transaction kind (`statement_entry` for bank transactions, `purchase` for receipts)
- ✅ Verification status (`unverified`, `verified`)
- ✅ Reconciliation status (`pending_bank_match`, `reconciled`, `not_required`)

**Frontend Filtering (Simple Checks):**

- ✅ Presence of accounting entries (to separate rule-matched from non-rule-matched)
- ✅ Complex conditions (e.g., "audit ready" = verified + reconciled + has accounting)

### Card 1: "Needs Verification" Query

**Query for pending unverified bank transactions:**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for transactions with accounting entries (rule-matched)
const needsVerification = data.transactions.filter((tx) => {
  return (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
});
```

**This query:**

- Backend filters: `collection=pending`, `kind=statement_entry`, `status=verification:unverified`
- Frontend filters: Has accounting entries (rule-matched transactions)

### Card 2: "Needs Reconciliation" Query

**Query for pending unverified bank transactions:**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for transactions WITHOUT accounting entries (no rule match)
const needsReconciliation = data.transactions.filter((tx) => {
  return (tx.accounting.debits?.length ?? 0) === 0 && (tx.accounting.credits?.length ?? 0) === 0;
});
```

**This query:**

- Backend filters: `collection=pending`, `kind=statement_entry`, `status=verification:unverified`
- Frontend filters: No accounting entries (transactions needing reconciliation)

### Card 4: "Verified and Audit Ready" Query

**Query for verified bank transactions:**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for audit ready (verified + reconciled + has accounting)
const auditReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

**This query:**

- Backend filters: `collection=source_of_truth`, `kind=statement_entry`, `status=verification:verified`
- Frontend filters: Reconciled/not_required + has accounting entries

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
- `kind` (optional) - Filter by transaction kind:
  - `statement_entry` - Bank/credit card statement transactions
  - `purchase` - Purchase receipts
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
// - metadata.reconciliation.type = 'card' | 'bank_transfer' | 'mixed' (distinguishes reconciliation type)
// - paymentBreakdown contains card/bank_transfer payments (not cash-only)
```

**Distinguishing Card vs Bank Transfer:**

Use `metadata.reconciliation.type` to differentiate between card and bank transfer reconciliations (no need to check `paymentBreakdown.type`):

```typescript
const needsReconciliation = data.transactions;

// Separate by reconciliation type
const cardTransactions = needsReconciliation.filter(
  (tx) => tx.metadata.reconciliation.type === 'card'
);

const bankTransferTransactions = needsReconciliation.filter(
  (tx) => tx.metadata.reconciliation.type === 'bank_transfer'
);

const mixedTransactions = needsReconciliation.filter(
  (tx) => tx.metadata.reconciliation.type === 'mixed'
);

// Show in appropriate UI sections/cards
// - Card transactions → "Reconcile to Credit Card" card
// - Bank transfer transactions → "Reconcile to Bank" card
// - Mixed transactions → Show in both or create "Mixed Payments" section
```

**Reconciliation Type Values:**

- `'card'` - Transaction paid with card (needs credit card statement reconciliation)
- `'bank_transfer'` - Transaction paid with bank transfer (needs bank statement reconciliation)
- `'mixed'` - Transaction paid with both card and bank transfer
- `undefined` - Cash-only or other payment method (reconciliation not required or unclear)

**UI Behavior:**

- Show transactions in appropriate reconciliation card based on `reconciliation.type`
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
        "status": "pending_bank_match", // ← Card/Bank payment needs reconciliation
        "type": "card" // ← Distinguishes: 'card', 'bank_transfer', or 'mixed'
        // OR status: "not_required" if cash-only (type will be undefined)
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
3. **Reconciliation status and type set**:
   - Cash-only → `reconciliation.status = 'not_required'` (no type needed)
   - Card payment → `reconciliation.status = 'pending_bank_match'`, `reconciliation.type = 'card'`
   - Bank transfer → `reconciliation.status = 'pending_bank_match'`, `reconciliation.type = 'bank_transfer'`
   - Mixed (card + bank) → `reconciliation.status = 'pending_bank_match'`, `reconciliation.type = 'mixed'`
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

- If **all** payments are `cash` → `reconciliation.status = 'not_required'` (type is undefined)
- If **any** payment is `card` or `bank_transfer` → `reconciliation.status = 'pending_bank_match'`
  - Only `card` → `reconciliation.type = 'card'`
  - Only `bank_transfer` → `reconciliation.type = 'bank_transfer'`
  - Both `card` and `bank_transfer` → `reconciliation.type = 'mixed'`

**Use `reconciliation.type` to distinguish between card and bank transfer reconciliations in the UI.**

---

## Update Credit Card Statement Upload

### Current Implementation (transactions2)

**Endpoint:**

```
POST /authenticated/transactions2/api/transactions
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "transactionType": "credit_card_transaction",
  "inputMethod": "ocr_pdf",
  "fileUrl": "https://storage.googleapis.com/...",
  "cardName": "Visa Business Card",
  "cardNumber": "****1234",
  "statementStartDate": "2025-01-01",
  "statementEndDate": "2025-01-31"
}
```

### New Implementation (transactions3)

**Endpoint:**

```
POST /authenticated/transactions3/api/credit-card-statements/upload
```

**Request:**

```json
{
  "businessId": "business_xyz",
  "fileUrl": "https://storage.googleapis.com/...",
  "cardName": "Visa Business Card",
  "cardNumber": "****1234",
  "statementStartDate": "2025-01-01",
  "statementEndDate": "2025-01-31"
}
```

**Simpler request format** - No need to specify `transactionType` or `inputMethod` (it's implicit in the endpoint).

### Key Changes

1. **Auto-Classification**: Credit card statement transactions are automatically classified using rules:

   - **Credit card fees** → Auto-classified, creates accounting entries, no reconciliation needed
   - **Interest charges** → Auto-classified, creates accounting entries, no reconciliation needed
   - **Payments** → Auto-classified, creates accounting entries, no reconciliation needed
   - **Other transactions** → Need reconciliation with purchase receipts

2. **Grouped Response**: Transactions are returned grouped by status for easy card population:

   - `needsVerification` - Rule-matched transactions (have accounting entries, need verification)
   - `needsReconciliation` - Transactions without rule matches (need reconciliation with purchase receipts)

3. **Saved to Pending**: All credit card transactions are saved to `transactions3_pending` collection (not source of truth)

4. **Capture Source**: Uses `capture.source = 'credit_card_statement_upload'` to distinguish from bank statements

### Code Update for Credit Card Statements

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
    transactionType: 'credit_card_transaction',
    inputMethod: 'ocr_pdf',
    fileUrl: fileUrl,
    cardName: cardName,
    cardNumber: cardNumber,
    statementStartDate: statementStartDate,
    statementEndDate: statementEndDate,
  }),
});
```

**After:**

```typescript
// New transactions3 endpoint
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/credit-card-statements/upload`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessId: businessId,
      fileUrl: fileUrl,
      cardName: cardName,
      cardNumber: cardNumber,
      statementStartDate: statementStartDate,
      statementEndDate: statementEndDate,
    }),
  }
);

const data = await response.json();

// Transactions are already grouped for you!
const needsVerification = data.transactions.needsVerification; // Rule-matched (fees, interest, payments)
const needsReconciliation = data.transactions.needsReconciliation; // Need to match with purchase receipts
```

### Distinguishing Bank vs Credit Card Transactions

When querying transactions, filter by `capture.source` to distinguish:

```typescript
const isBankTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'bank_statement_upload';

const isCreditCardTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'credit_card_statement_upload';
```

**For Credit Card Transactions Card:**

- Filter queries by `kind=statement_entry` AND `capture.source === 'credit_card_statement_upload'`
- See `TRANSACTIONS3_CREDIT_CARD_STATEMENT_UPLOAD.md` for detailed query examples

---

## Next Steps

1. ✅ **Update purchase photo upload** - Use new transactions3 endpoint (this document)
2. ✅ **Update bank statement upload** - Use new transactions3 endpoint (documented above)
3. ✅ **Update credit card statement upload** - Use new transactions3 endpoint (documented above)
4. ✅ **Verification endpoint** - Verify transactions with optional updates (documented above)
5. ✅ **Reconciliation endpoint** - Available at `/authenticated/transactions3/api/reconcile/bank` (handles both bank and credit card)
6. ⏳ **Update transaction lists** - Query transactions3 collections

---

## Questions?

- Check `src/app/authenticated/transactions3/README.md` for implementation details
- See `docs/architecture/TRANSACTIONS3_IMPLEMENTATION_PLAN.md` for full roadmap
- Contact backend team if you need clarification

---

## Summary

**Quick Update Checklist:**

**Purchase Receipts:**

- [ ] Update API endpoint from `/transactions2/api/transactions` to `/transactions3/api/purchases/ocr`
- [ ] Remove `transactionType` and `inputMethod` from request body (simpler format)
- [ ] Update response handling to check `metadata.verification.status = 'unverified'`

**Bank Statements:**

- [ ] Update API endpoint from `/transactions2/api/transactions` to `/transactions3/api/bank-statements/upload`
- [ ] Remove `transactionType` and `inputMethod` from request body (simpler format)
- [ ] Use grouped response: `data.transactions.needsVerification` and `data.transactions.needsReconciliation`
- [ ] Populate Card 1 ("Needs Verification") with rule-matched transactions
- [ ] Populate Card 2 ("Needs Reconciliation") with transactions needing reconciliation

**Credit Card Statements:**

- [ ] Update API endpoint from `/transactions2/api/transactions` to `/transactions3/api/credit-card-statements/upload`
- [ ] Remove `transactionType` and `inputMethod` from request body (simpler format)
- [ ] Use grouped response: `data.transactions.needsVerification` and `data.transactions.needsReconciliation`
- [ ] Populate Card 1 ("Needs Verification") with rule-matched transactions
- [ ] Populate Card 2 ("Needs Reconciliation") with transactions needing reconciliation
- [ ] Filter queries by `capture.source === 'credit_card_statement_upload'` to distinguish from bank transactions

**General:**

- [ ] Update transaction queries to use new transactions3 endpoint
- [ ] Add UI to show "Needs Verification" transactions
- [ ] Test with real receipt images, bank statement PDFs, and credit card statement PDFs

**That's it!** The endpoints are simpler and align with our new architecture where transaction records are the source of truth.
