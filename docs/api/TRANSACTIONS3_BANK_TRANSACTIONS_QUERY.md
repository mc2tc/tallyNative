# Transactions3 Bank Transactions Query Guide

## Overview

This guide explains how to query bank transactions from transactions3. **All filtering happens on the backend** - you query with specific parameters and the backend returns only the transactions you need.

---

## Key Identifiers

Bank transactions can be identified by:
- `metadata.classification.kind = 'statement_entry'` (distinguishes from purchase receipts)
- `metadata.capture.source = 'bank_statement_upload'`
- `metadata.statementContext` exists (contains bank account info)

Purchase receipts have:
- `metadata.classification.kind = 'purchase'`

---

## Query Endpoint

**GET** `/authenticated/transactions3/api/transactions`

### Query Parameters

- `businessId` (required) - Business ID
- `collection` (optional) - `pending`, `source_of_truth`, or `archived` (default: `source_of_truth`)
- `kind` (optional) - Filter by transaction kind:
  - `statement_entry` - Bank/credit card statement transactions
  - `purchase` - Purchase receipts
- `status` (optional) - Filter by status:
  - `verification:unverified` - Unverified transactions
  - `verification:verified` - Verified transactions
  - `reconciliation:pending_bank_match` - Need bank reconciliation
  - `reconciliation:reconciled` - Already reconciled
  - `reconciliation:not_required` - No reconciliation needed
- `limit` (optional) - Page size (default: 20, max: 100)
- `page` (optional) - Page number (default: 1)

---

## Queries for Bank Transactions Screen Cards

### Card 1: "Needs Verification" (Rule-Matched Bank Transactions)

**These are bank transactions that matched rules (bank fees, cash withdrawals) and have accounting entries created. They just need user verification.**

**Backend Query:**

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
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return hasAccountingEntries;
});
```

**Why client-side filtering for accounting entries?**
- Firestore queries can only filter by one indexed field at a time
- We're already filtering by `kind` and `verification.status` on the backend
- The accounting entries check is simple and the dataset is already filtered

### Card 2: "Needs Reconciliation" (Bank Transactions Without Rule Matches)

**These are bank transactions that didn't match any rules. They need to be reconciled with purchase receipts.**

**Backend Query:**

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
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return !hasAccountingEntries;
});
```

### Card 3: "Confirmed Unreconcilable"

**Future feature - for now, this card can be empty or query transactions marked as unreconcilable.**

### Card 4: "Verified and Audit Ready"

**Bank transactions that have been verified and are ready for reporting.**

**Backend Query:**

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

// Filter client-side for audit ready (verified + reconciled/not_required + has accounting)
const auditReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

---

## Backend vs Frontend Filtering

### Backend Filtering (Recommended)

✅ **Backend filters by:**
- Collection (`pending`, `source_of_truth`, `archived`)
- Transaction kind (`statement_entry` for bank transactions)
- Verification status (`unverified`, `verified`)
- Reconciliation status (`pending_bank_match`, `reconciled`, `not_required`)

**Example:**
```typescript
// Backend filters: pending collection, statement_entry kind, unverified status
GET /api/transactions?collection=pending&kind=statement_entry&status=verification:unverified
```

### Frontend Filtering (When Needed)

⚠️ **Frontend filters by:**
- Presence of accounting entries (for rule-matched vs not rule-matched)
- Complex conditions (e.g., "reporting ready" = verified + reconciled + has accounting)

**Example:**
```typescript
// Backend returns all pending unverified bank transactions
// Frontend filters for those with accounting entries
const ruleMatched = transactions.filter(tx => tx.accounting.debits?.length > 0);
```

---

## Complete Example: Populating All 4 Cards

```typescript
// Query for all pending bank transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const pendingBankTransactions = data.transactions;

// Card 1: Needs Verification (rule-matched with accounting entries)
const needsVerification = pendingBankTransactions.filter((tx) => {
  return (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
});

// Card 2: Needs Reconciliation (no rule match, no accounting entries)
const needsReconciliation = pendingBankTransactions.filter((tx) => {
  return (tx.accounting.debits?.length ?? 0) === 0 && (tx.accounting.credits?.length ?? 0) === 0;
});

// Card 3: Confirmed Unreconcilable (future feature)
const unreconcilable = []; // Empty for now

// Card 4: Verified and Audit Ready (query source of truth)
const auditReadyResponse = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const auditReadyData = await auditReadyResponse.json();
const auditReady = auditReadyData.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

---

## Important Notes

1. **Always filter by `kind=statement_entry`** when querying bank transactions - this excludes purchase receipts
2. **Backend does most filtering** - Collection, kind, and status filters happen on the backend
3. **Frontend does simple filtering** - Only for checking accounting entries (which can't be indexed/queried efficiently)
4. **Use the upload response immediately** - After upload, use the grouped response from the upload endpoint to populate cards
5. **Refresh with queries** - For ongoing queries (e.g., when user navigates back to screen), use the query endpoint with filters

---

## Troubleshooting

### Bank transactions not showing up?

1. **Check the collection** - Are you querying `collection=pending`?
2. **Check the kind filter** - Are you filtering by `kind=statement_entry`?
3. **Check the verification status** - Unverified transactions need `status=verification:unverified`
4. **Check if transactions were saved** - Verify the upload endpoint returned success and transactions in the response

### Getting purchase receipts mixed with bank transactions?

- **Add `kind=statement_entry` filter** to your query to exclude purchase receipts
- Purchase receipts have `kind=purchase`, bank transactions have `kind=statement_entry`

---

## Summary

- **Filtering happens on the backend** for collection, kind, and status
- **Filtering happens on the frontend** for accounting entries (simple check)
- **Always use `kind=statement_entry`** when querying bank transactions
- **Upload response is already grouped** - use it immediately after upload
- **Query endpoint with filters** - use it for refreshing/reloading the screen

