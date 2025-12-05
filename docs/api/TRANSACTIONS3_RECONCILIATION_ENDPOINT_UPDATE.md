# Transactions3 Reconciliation Endpoint - RN Team Update

## Important: Use Transactions3 Reconciliation Endpoint

**The reconciliation endpoint has been updated to handle both bank and credit card statements.**

---

## Endpoint Change

### ❌ Old Endpoint (transactions2) - DO NOT USE

```
POST /authenticated/transactions2/api/reconcile/credit-card
```

This endpoint queries the old `transactions2` collection and will **not** find transactions uploaded via the new transactions3 endpoints.

### ✅ New Endpoint (transactions3) - USE THIS

```
POST /authenticated/transactions3/api/reconcile/bank
```

**Note:** Despite the name "bank", this endpoint handles **both bank AND credit card** statement transactions.

---

## Request Format

```typescript
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

const data = await response.json();
// data.matched - number of transactions matched
// data.matches - array of match details
```

---

## What It Does

- ✅ Reconciles **bank statement transactions** from `transactions3_pending`
- ✅ Reconciles **credit card statement transactions** from `transactions3_pending`
- ✅ Matches with verified purchase receipts from `transactions3` (source of truth)
- ✅ Archives matched statement transactions
- ✅ Updates purchase receipts to `reconciliation.status = 'reconciled'`

---

## Response Format

```json
{
  "success": true,
  "matched": 3,
  "matches": [
    {
      "bankTransactionId": "tx_abc123",
      "purchaseReceiptId": "tx_receipt_xyz789",
      "confidence": 0.95,
      "matchReason": "amount, date, name, and reference match"
    }
  ]
}
```

---

## Why This Matters

- **Bank statements** uploaded via `/transactions3/api/bank-statements/upload` are saved to `transactions3_pending`
- **Credit card statements** uploaded via `/transactions3/api/credit-card-statements/upload` are saved to `transactions3_pending`
- The old transactions2 reconciliation endpoint queries `transactions2` collection, so it won't find these transactions
- **You must use the transactions3 endpoint** to reconcile transactions uploaded via the new endpoints

---

## Action Required

**Update all reconciliation calls to use:**

```
POST /authenticated/transactions3/api/reconcile/bank
```

**Instead of:**

```
POST /authenticated/transactions2/api/reconcile/credit-card
POST /authenticated/transactions2/api/reconcile/bank
```

---

## Questions?

- See `TRANSACTIONS3_BANK_RECONCILIATION.md` for detailed reconciliation guide
- See `TRANSACTIONS3_CREDIT_CARD_STATEMENT_UPLOAD.md` for credit card statement details
- Contact backend team if you need clarification

