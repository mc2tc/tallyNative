# Transactions3: Mark Bank Transaction as Confirmed Unreconcilable

## Overview

When a bank statement record exists but the receipt is not available (lost, etc.), users can mark the transaction as "confirmed unreconcilable". This moves the transaction to the source of truth collection with `reconciliation.status = 'unreconciled'` and it appears on the "Confirmed unreconcilable" card.

## Use Case

- User uploads bank statement → transactions appear on "Needs Reconciliation" card
- User determines receipt is not available/lost
- User clicks "Confirm Unreconcilable" button
- Transaction moves to `transactions3` collection (source of truth)
- Transaction appears on "Confirmed unreconcilable" card

---

## Endpoint

**Reuse the existing verification endpoint** with a special flag:

```
PATCH /authenticated/transactions3/api/transactions/[transactionId]/verify?businessId={businessId}
```

## Request

**Method:** `PATCH`

**URL:** `/authenticated/transactions3/api/transactions/{transactionId}/verify?businessId={businessId}`

**Headers:**
```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "markAsUnreconcilable": true,
  "itemList": [
    {
      "name": "Transaction description",
      "debitAccount": "General Expense",
      "amount": 100.00,
      "amountExcluding": 100.00,
      "isBusinessExpense": true,
      "debitAccountConfirmed": true
    }
  ]
}
```

**Note:** `itemList` is optional but recommended. If provided, it will be used to generate accounting entries. If not provided, accounting entries will be generated from existing transaction data (if available).

### Parameters

- `transactionId` (path parameter): ID of the bank transaction in the `pending` collection
- `businessId` (query parameter): Business ID
- `markAsUnreconcilable` (body, optional): Set to `true` to mark as confirmed unreconcilable

## Response

**Success (200):**
```json
{
  "success": true,
  "transactionId": "new_transaction_id",
  "transaction": {
    "metadata": {
      "verification": {
        "status": "verified",
        "verifiedBy": "user_uid",
        "verifiedAt": 1764877000000
      },
      "reconciliation": {
        "status": "unreconciled",
        "type": undefined
      }
    },
    "summary": {
      "description": "Cornish Pasty Supplies",
      "totalAmount": 700,
      "transactionDate": 1760270400000
    },
    "accounting": {
      "debits": [...],
      "credits": [...],
      "balanced": true
    }
  }
}
```

**Error (400/404/500):**
```json
{
  "error": "Error message",
  "requestId": "req_..."
}
```

---

## Implementation Guide

### Step 1: User Clicks "Confirm Unreconcilable" Button

When the user clicks the button on a bank transaction in the "Needs Reconciliation" card:

```typescript
const handleConfirmUnreconcilable = async (transactionId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          markAsUnreconcilable: true,
          // Optional: Update itemList to specify Chart of Accounts
          // itemList: [{
          //   name: transaction.summary.description,
          //   debitAccount: 'General Expense', // User-selected account
          //   amount: transaction.summary.totalAmount,
          //   amountExcluding: transaction.summary.totalAmount,
          //   isBusinessExpense: true,
          //   debitAccountConfirmed: true
          // }]
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark transaction as unreconcilable');
    }

    const data = await response.json();
    
    // Transaction has been moved to source of truth
    // Refresh the cards to update the UI
    await refreshBankTransactions();
    
  } catch (error) {
    console.error('Error marking transaction as unreconcilable:', error);
    // Show error message to user
  }
};
```

### Step 2: Query for "Confirmed Unreconcilable" Card

Query transactions in the source of truth collection with `reconciliation.status = 'unreconciled'`:

```typescript
// Query for confirmed unreconcilable bank transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=reconciliation:unreconciled`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const confirmedUnreconcilable = data.transactions;
```

**Query Parameters:**
- `collection=source_of_truth` - Query the source of truth collection
- `kind=statement_entry` - Only bank statement transactions (excludes purchase receipts)
- `status=reconciliation:unreconciled` - Filter by unreconciled status

---

## Complete Card Query Example

```typescript
// Card 3: "Confirmed Unreconcilable"
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=reconciliation:unreconciled&limit=200&page=1`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const confirmedUnreconcilable = data.transactions;

// Display these transactions on the "Confirmed unreconcilable" card
```

---

## What Happens When You Mark as Unreconcilable

1. **Transaction is verified** → `verification.status = 'verified'`
2. **Moved to source of truth** → Transaction moves from `transactions3_pending` to `transactions3` collection
3. **Reconciliation status set** → `reconciliation.status = 'unreconciled'`
4. **Accounting entries generated** → Transaction has debits/credits for reporting
5. **Appears on correct card** → Query shows it on "Confirmed unreconcilable" card

---

## Notes

- **No new endpoint needed** - Reuses existing verification endpoint with `markAsUnreconcilable` flag
- **Transaction is still verified** - It moves to source of truth and has accounting entries
- **User responsibility** - Marking as unreconcilable indicates user confirms receipt is not available
- **Audit trail** - Action is recorded in the transaction's audit trail

---

## Error Handling

- **400 Bad Request**: Missing transactionId or businessId
- **403 Forbidden**: User doesn't have access to the business
- **404 Not Found**: Transaction not found in pending collection
- **500 Internal Server Error**: Server error during verification

---

## Example: Complete Workflow

```typescript
// 1. User clicks "Confirm Unreconcilable" on a bank transaction
async function markAsUnreconcilable(transactionId: string) {
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        markAsUnreconcilable: true,
      }),
    }
  );

  if (response.ok) {
    // 2. Refresh cards - transaction will now appear on "Confirmed unreconcilable"
    await refreshCards();
  }
}

// 3. Query for "Confirmed Unreconcilable" card
async function getConfirmedUnreconcilable() {
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=reconciliation:unreconciled`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data.transactions; // Display on "Confirmed unreconcilable" card
}
```

