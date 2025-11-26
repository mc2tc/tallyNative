# Transactions2 Reconciliation API

## Overview

The reconciliation endpoints automatically match bank and credit card transactions with purchase receipts. When users click the "Reconcile" button in the RN app, these endpoints find matching transactions and link them together.

**Important**: Reconciliation only processes transactions that need reconciliation (those without accounting entries from rule matching). Transactions that match rules (like bank fees, withdrawals) bypass reconciliation and go directly to verification.

---

## Endpoints

### Bank Transaction Reconciliation

**POST** `/authenticated/transactions2/api/reconcile/bank`

Reconciles all unreconciled bank transactions with purchase receipts.

### Credit Card Transaction Reconciliation

**POST** `/authenticated/transactions2/api/reconcile/credit-card`

Reconciles all unreconciled credit card transactions with purchase receipts.

---

## Request Format

Both endpoints use the same request format:

```typescript
{
  businessId: string;  // Required
}
```

**Request Example:**
```json
{
  "businessId": "business123"
}
```

---

## Authentication

Include authentication token in headers:

```typescript
const token = await getAuthToken();

const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/reconcile/bank`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    businessId: 'business123'
  })
});
```

---

## Success Response (200)

```json
{
  "success": true,
  "matched": 15,
  "matches": [
    {
      "bankTransactionId": "tx_bank_abc123",
      "purchaseReceiptId": "tx_purchase_xyz789",
      "confidence": 0.95,
      "matchReason": "amount, date, name, and reference match"
    },
    {
      "bankTransactionId": "tx_bank_def456",
      "purchaseReceiptId": "tx_purchase_uvw321",
      "confidence": 0.8,
      "matchReason": "amount, date, and name match"
    }
  ]
}
```

**For Credit Card endpoint**, replace `bankTransactionId` with `creditCardTransactionId`.

---

## Matching Logic

The reconciliation process matches transactions based on the following criteria:

### 1. Amount Match (Exact)
- Exact match on `accounting.paymentBreakdown[i].amount`
- Falls back to `summary.totalAmount` if paymentBreakdown is not available
- Tolerance: ±0.01

### 2. Payment Type Filter
- **Bank transactions**: Only match if `paymentBreakdown[i].type == 'bank-transfer'` or `'card'`
- **Credit card transactions**: Only match if `paymentBreakdown[i].type == 'card'`

### 3. Supplier Name Match (Close)
- Close match on `summary.thirdPartyName`
- Uses substring matching or similarity score (> 0.7)

### 4. Date Constraint
- Bank/credit card transaction date must be **equal to or greater than** the purchase receipt date
- Ensures the payment happened after or on the purchase date

### 5. Reference Match (Tie-breaker)
- If multiple matches found, prefers matches where:
  - Bank/CC `summary.description` matches purchase `metadata.reference`
- This increases confidence from 0.8 to 0.95

---

## What Gets Updated

When a match is found, both transactions are updated:

1. **Reconciliation Status**: `metadata.reconciliation.status` → `'matched'`
2. **Link**: `metadata.reconciliation.matchedBatchTransaction.batchTransactionId` stores the linked transaction's documentId
3. **Metadata**: Records who confirmed the match and when

**Example Updated Transaction:**
```json
{
  "metadata": {
    "reconciliation": {
      "status": "matched",
      "matchedBatchTransaction": {
        "batchTransactionId": "tx_purchase_xyz789",
        "source": "bank_statement_upload",
        "confidence": 0.95,
        "matchedFields": ["amount", "date", "supplier", "reference"],
        "matchedAt": 1704067200000
      },
      "confirmedBy": "user_uid_123",
      "confirmedAt": 1704067200000
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
Missing required fields.

```json
{
  "error": "Business ID is required"
}
```

### 401 Unauthorized
Authentication failed.

```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
User doesn't have access to the specified business.

```json
{
  "error": "Access denied"
}
```

### 500 Internal Server Error
Server error during reconciliation.

```json
{
  "error": "Failed to reconcile bank transactions",
  "requestId": "req_1234567890_abc123"
}
```

---

## Usage in RN App

### Trigger Reconciliation

Call the appropriate endpoint when the user clicks the "Reconcile" button:

```typescript
// For Bank Transactions
const reconcileBankTransactions = async (businessId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions2/api/reconcile/bank`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ businessId })
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`Matched ${data.matched} transactions`);
      // Refresh transaction list to show updated statuses
      refreshTransactions();
    } else {
      const error = await response.json();
      console.error('Reconciliation failed:', error.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// For Credit Card Transactions
const reconcileCreditCardTransactions = async (businessId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions2/api/reconcile/credit-card`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ businessId })
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`Matched ${data.matched} transactions`);
      refreshTransactions();
    } else {
      const error = await response.json();
      console.error('Reconciliation failed:', error.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

---

## Which Transactions Get Reconciled?

### ✅ Included in Reconciliation

- Bank/credit card transactions with:
  - `metadata.capture.source == 'bank_statement_ocr'` or `'credit_card_statement_ocr'`
  - `metadata.reconciliation.status == 'unreconciled'`
  - **No accounting entries** (empty `accounting.debits` and `accounting.credits`)

### ❌ Excluded from Reconciliation

- Transactions with accounting entries (rule-matched transactions)
  - These bypass reconciliation and go to verification instead
  - Examples: bank fees, withdrawals, interest charges

### Purchases

- Purchase receipts with:
  - `metadata.capture.source == 'purchase_invoice_ocr'`
  - `metadata.reconciliation.status == 'unreconciled'`

---

## Important Notes

1. **One-time Process**: Reconciliation processes all eligible transactions in one call. You don't need to call it per transaction.

2. **No Duplicates**: Each purchase receipt can only be matched to one bank/credit card transaction (and vice versa).

3. **No Partial Matches**: The endpoint either finds a complete match based on all criteria, or it doesn't match at all.

4. **Refresh After Reconciliation**: After calling the endpoint, refresh your transaction list to show updated reconciliation statuses.

5. **Separate Endpoints**: Use the bank endpoint for bank transactions and the credit card endpoint for credit card transactions. Don't call both on the same button click.

---

## Example Flow

```
1. User uploads bank statement
   → Transactions saved with status 'unreconciled'

2. User uploads purchase receipts
   → Receipts saved with status 'unreconciled'

3. User clicks "Reconcile" button for bank transactions
   → POST /reconcile/bank
   → Backend matches transactions
   → Updates both transactions to 'matched'
   → Returns match details

4. RN app refreshes transaction list
   → Shows updated reconciliation statuses
   → Matched transactions appear as reconciled
```

---

## Questions?

- Check transaction `metadata.reconciliation.status` to see if reconciliation is needed
- Transactions with `accounting.debits` or `accounting.credits` populated bypass reconciliation
- Contact backend team if you need changes to matching logic

