# Transactions3 Bank Statement Upload - RN Team Update

## Summary

We've implemented a new bank statement upload endpoint for transactions3. This endpoint automatically classifies bank transactions using rules (bank fees, cash withdrawals) and returns transactions grouped by status for easy card population.

---

## Endpoint Change

### Old Endpoint (transactions2)
```
POST /authenticated/transactions2/api/transactions
```

### New Endpoint (transactions3)
```
POST /authenticated/transactions3/api/bank-statements/upload
```

---

## Request Format

### Before
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

### After
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

**Simpler!** No need to specify `transactionType` or `inputMethod` (it's implicit in the endpoint).

---

## Response Format

The response is **already grouped** for you to populate your 4 cards:

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
      // Card 1: Rule-matched transactions (bank fees, cash withdrawals)
      // These have accounting entries already created
      // Just need user verification (no reconciliation needed)
    ],
    "needsReconciliation": [
      // Card 2: Transactions without rule matches
      // Need to be matched with purchase receipts
      // No accounting entries created yet
    ]
  },
  "skipped": []
}
```

---

## Auto-Classification Rules

The backend automatically classifies transactions:

1. **Bank Fees** (service charges, monthly fees, etc.)
   - ✅ Auto-classified
   - ✅ Accounting entries created
   - ✅ No reconciliation needed
   - → Appears in `needsVerification` array

2. **Cash Withdrawals** (ATM, cash machine, etc.)
   - ✅ Auto-classified
   - ✅ Accounting entries created
   - ✅ No reconciliation needed
   - → Appears in `needsVerification` array

3. **Other Transactions** (purchases, payments, etc.)
   - ❌ No rule match
   - ❌ No accounting entries
   - ⚠️ Need reconciliation with purchase receipts
   - → Appears in `needsReconciliation` array

---

## Card Population

### Card 1: "Needs Verification" (No Reconciliation Required)
```typescript
const needsVerification = data.transactions.needsVerification;

// These are rule-matched transactions:
// - Have accounting entries already created
// - reconciliation.status = 'not_required'
// - Just need user verification
// - No reconciliation needed
```

### Card 2: "Needs Reconciliation"
```typescript
const needsReconciliation = data.transactions.needsReconciliation;

// These transactions:
// - Don't match any rules
// - Need to be matched with purchase receipts
// - No accounting entries created yet
// - reconciliation.status = 'pending_bank_match'
```

### Card 3: "Confirmed Unreconcilable"
- Query pending transactions that user has marked as unreconcilable (future feature)
- For now, this card can be empty

### Card 4: "Verified and Audit Ready"
- Query source of truth transactions that are verified, reconciled, and have accounting entries
- Use the query endpoint: `GET /authenticated/transactions3/api/transactions?businessId=xxx&collection=source_of_truth`

---

## Code Example

```typescript
// Upload bank statement PDF
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
const needsVerification = data.transactions.needsVerification; // Card 1
const needsReconciliation = data.transactions.needsReconciliation; // Card 2

// Populate your cards
updateCard1(needsVerification); // "Needs Verification" card
updateCard2(needsReconciliation); // "Needs Reconciliation" card
```

---

## Migration Steps

1. **Update endpoint URL** - Change from `/transactions2/api/transactions` to `/transactions3/api/bank-statements/upload`
2. **Simplify request body** - Remove `transactionType` and `inputMethod`
3. **Use grouped response** - Use `data.transactions.needsVerification` and `data.transactions.needsReconciliation`
4. **Update card population** - Populate cards directly from grouped arrays
5. **Test** - Test with real bank statement PDFs

---

## Error Handling

Same error codes as before:
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - User doesn't have access to business
- `404 Not Found` - Business not found
- `500 Internal Server Error` - Server error

---

## Questions?

- See full documentation: `docs/api/TRANSACTIONS3_RN_INTEGRATION.md`
- Check implementation: `src/app/authenticated/transactions3/api/bank-statements/upload/route.ts`
- Contact backend team if you need clarification

---

## Quick Reference

**Endpoint:** `POST /authenticated/transactions3/api/bank-statements/upload`

**Required Fields:**
- `businessId` (string)
- `fileUrl` (string)

**Optional Fields:**
- `bankName` (string)
- `accountNumber` (string)
- `statementStartDate` (string, ISO date)
- `statementEndDate` (string, ISO date)

**Response:**
- `transactions.needsVerification` - Rule-matched transactions (Card 1)
- `transactions.needsReconciliation` - Transactions needing reconciliation (Card 2)

