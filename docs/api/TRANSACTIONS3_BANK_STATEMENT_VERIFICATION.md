# Transactions3 Bank Statement Verification Guide

## Overview

This guide explains how to verify bank statement transactions in Transactions3. When a bank statement transaction is rule-matched (e.g., bank fees, cash withdrawals), it appears on the "Needs Verification" card. After the user confirms the Chart of Accounts (debit accounts), the transaction is verified and moves to the "Verified and audit ready" card.

---

## Verification Endpoint

**PATCH** `/authenticated/transactions3/api/transactions/[transactionId]/verify?businessId=xxx`

### Purpose

Verify a bank statement transaction by confirming the Chart of Accounts (debit accounts). The transaction is moved from `transactions3_pending` to `transactions3` (source of truth) and becomes audit-ready.

### Request Body

**Optional updates to confirm Chart of Accounts:**

```typescript
{
  itemList?: Array<{
    name: string;                    // Item name (e.g., "Service Charge", "Bank Fee")
    debitAccount: string;            // Chart of Accounts account (e.g., "Fees & Charges")
    amount: number;                  // Amount
    amountExcluding?: number;        // VAT-exclusive amount (if applicable)
    quantity?: number;               // Quantity (usually 1 for fees)
    unitCost?: number;               // Unit cost (usually same as amount)
    category?: string;               // Category (e.g., "bank_fee")
    debitAccountConfirmed?: boolean; // Set to true when user confirms
    isBusinessExpense?: boolean;     // Whether it's a business expense
  }>
}
```

**Note:** You can send an empty body `{}` if the transaction already has correct Chart of Accounts and just needs verification.

### Example Request

```typescript
// Verify a bank fee transaction with confirmed Chart of Accounts
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
          name: 'Service Charge',
          debitAccount: 'Fees & Charges',
          amount: 50.0,
          debitAccountConfirmed: true,
          isBusinessExpense: true,
          category: 'bank_fee',
        },
      ],
    }),
  }
);

const data = await response.json();
```

### Response

**Success Response (200):**

```json
{
  "success": true,
  "transactionId": "tx_verified_abc123",
  "transaction": {
    "metadata": {
      "id": "tx_verified_abc123",
      "verification": {
        "status": "verified",
        "verifiedBy": "user_uid",
        "verifiedAt": 1704067300000
      },
      "reconciliation": {
        "status": "not_required",
        "type": undefined
      },
      "classification": {
        "kind": "statement_entry"
      }
    },
    "accounting": {
      "debits": [
        {
          "chartName": "Fees & Charges",
          "amount": 50.0,
          "isExpense": true
        }
      ],
      "credits": [
        {
          "chartName": "Bank",
          "amount": 50.0,
          "isAsset": true
        }
      ],
      "balanced": true
    },
    "summary": {
      "thirdPartyName": "Service Charge",
      "totalAmount": 50.0,
      "currency": "GBP"
    }
  }
}
```

---

## What Happens During Verification

1. **Transaction moved**: From `transactions3_pending` → `transactions3` (source of truth collection)
2. **Accounting entries regenerated**: Based on confirmed `itemList` (debit accounts)
3. **Reconciliation status preserved**: If transaction was rule-matched with `reconciliation.status = 'not_required'`, it stays `'not_required'`
4. **Verification status updated**: `verification.status = 'verified'`
5. **Audit trail updated**: Verification action added to audit trail

---

## Querying "Verified and Audit Ready" Card

After verification, bank statement transactions appear on the "Verified and audit ready" card.

### Query Endpoint

**GET** `/authenticated/transactions3/api/transactions?businessId=xxx&collection=source_of_truth&kind=statement_entry&status=verification:verified`

### Query Parameters

- `businessId` (required) - Business ID
- `collection` = `source_of_truth` (verified transactions)
- `kind` = `statement_entry` (bank transactions only)
- `status` = `verification:verified` (verified transactions)

### Frontend Filtering

After fetching, filter client-side for audit-ready transactions:

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
// Audit-ready = verified + (reconciled OR not_required) + has accounting entries
const auditReady = data.transactions.filter((tx) => {
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isReconciled && hasAccounting;
});
```

### Complete Example: Loading "Verified and Audit Ready" Card

```typescript
async function loadAuditReadyBankTransactions(businessId: string, token: string) {
  // Query backend
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=verification:verified`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  // Filter for audit-ready transactions
  const auditReady = data.transactions.filter((tx) => {
    const isReconciled =
      tx.metadata.reconciliation.status === 'reconciled' ||
      tx.metadata.reconciliation.status === 'not_required';
    const hasAccounting =
      (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
    return isReconciled && hasAccounting;
  });

  return auditReady;
}
```

---

## UI Workflow

### 1. Display "Needs Verification" Card

Bank statement transactions that are rule-matched appear on the "Needs Verification" card:

```typescript
// Query for pending unverified bank transactions with accounting entries
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`
);

const data = await response.json();

// Filter for transactions with accounting entries (rule-matched)
const needsVerification = data.transactions.filter((tx) => {
  return (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
});
```

### 2. User Reviews and Confirms Chart of Accounts

User sees the transaction details:
- Description (e.g., "Service Charge")
- Amount
- Debit account (e.g., "Fees & Charges")
- Credit account (e.g., "Bank")

User confirms the Chart of Accounts (debit account).

### 3. Call Verification Endpoint

```typescript
// Verify with confirmed Chart of Accounts
const verifyResponse = await fetch(
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
          name: transaction.details.itemList[0].name,
          debitAccount: transaction.details.itemList[0].debitAccount, // User confirmed
          amount: transaction.details.itemList[0].amount,
          debitAccountConfirmed: true,
          isBusinessExpense: transaction.details.itemList[0].isBusinessExpense,
          category: transaction.details.itemList[0].category,
        },
      ],
    }),
  }
);
```

### 4. Transaction Moves to "Verified and Audit Ready" Card

After verification, refresh the "Verified and audit ready" card:

```typescript
// Reload audit-ready transactions
const auditReady = await loadAuditReadyBankTransactions(businessId, token);
setAuditReadyTransactions(auditReady);
```

---

## Important Notes

1. **Reconciliation Status Preserved**: Rule-matched bank transactions have `reconciliation.status = 'not_required'`. This is preserved during verification, so they immediately become audit-ready.

2. **Accounting Entries Regenerated**: Accounting entries are regenerated during verification based on the confirmed `itemList` to ensure accuracy.

3. **Empty Body Allowed**: You can send an empty body `{}` if the transaction already has correct Chart of Accounts and just needs verification (no updates needed).

4. **Always Use `kind=statement_entry`**: When querying bank transactions, always filter by `kind=statement_entry` to exclude purchase receipts.

5. **Backend Filtering**: Collection, kind, and verification status are filtered on the backend. Reconciliation status and accounting entries are checked client-side.

---

## Summary

- **Verification Endpoint**: `PATCH /transactions3/api/transactions/[id]/verify?businessId=xxx`
- **Optional Body**: Send `itemList` to confirm Chart of Accounts
- **After Verification**: Transaction moves to `source_of_truth` collection
- **Query Audit Ready**: `collection=source_of_truth&kind=statement_entry&status=verification:verified`
- **Filter Client-Side**: Check `reconciliation.status` and accounting entries for audit-ready

---

## Example Transaction Flow

1. **Bank statement uploaded** → Transaction saved to `transactions3_pending` with accounting entries
2. **Rule matched** → `reconciliation.status = 'not_required'`
3. **Appears on "Needs Verification" card** → User confirms Chart of Accounts
4. **Verification called** → Transaction moves to `transactions3` (source of truth)
5. **Appears on "Verified and audit ready" card** → Ready for reporting

