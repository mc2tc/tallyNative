# Transactions3 Credit Card Statement Upload - RN Team Update

## Summary

We've implemented a new credit card statement upload endpoint for transactions3. This endpoint automatically classifies credit card transactions using rules (credit card fees, interest charges, payments) and returns transactions grouped by status for easy card population.

---

## Endpoint Change

### Old Endpoint (transactions2)

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

### New Endpoint (transactions3)

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
      // Card 1: Rule-matched transactions (credit card fees, interest, payments)
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

1. **Credit Card Fees** (annual fees, late fees, overlimit fees, etc.)

   - Auto-classified → Creates accounting entries
   - Debits "Fees & Charges", Credits "Credit Card"
   - No reconciliation needed
   - Appears in "Needs Verification" card

2. **Interest Charges** (interest, finance charges, APR)

   - Auto-classified → Creates accounting entries
   - Debits "Interest Expense", Credits "Credit Card"
   - No reconciliation needed
   - Appears in "Needs Verification" card

3. **Payments** (payments received, automatic payments, account credits)

   - Auto-classified → Creates accounting entries
   - Debits "Credit Card", Credits "Bank" (repayment entry)
   - No reconciliation needed
   - Appears in "Needs Verification" card

4. **Other Transactions** (purchases, charges)
   - No rule match → No accounting entries
   - Need reconciliation with purchase receipts
   - Appears in "Needs Reconciliation" card

---

## Code Update for Credit Card Statements

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

---

## Populating the 4 Cards

The response is already grouped for you to populate your cards:

**Card 1: "Needs Verification" (No Reconciliation Required)**

- Use `data.transactions.needsVerification`
- These are rule-matched transactions (credit card fees, interest, payments)
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
- Use the query endpoint (see "Querying Credit Card Transactions" section below)

---

## Querying Credit Card Transactions

**IMPORTANT:** When querying credit card transactions, **always filter by `kind=statement_entry` AND `capture.source=credit_card_statement_upload`** to exclude bank transactions and purchase receipts.

### Card 1: "Needs Verification" (Rule-Matched Credit Card Transactions)

**Backend Query (Filters on server):**

- Collection: `pending`
- Kind: `statement_entry` (credit card transactions only)
- Capture Source: `credit_card_statement_upload`
- Verification Status: `unverified`

**Frontend Filter (Simple check):**

- Has accounting entries (rule-matched)

```typescript
// Query backend for pending unverified credit card transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for credit card transactions with accounting entries (rule-matched)
const needsVerification = data.transactions.filter((tx) => {
  const isCreditCard = tx.metadata?.capture?.source === 'credit_card_statement_upload';
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isCreditCard && hasAccountingEntries;
});
```

### Card 2: "Needs Reconciliation" (Credit Card Transactions Without Rule Matches)

**Backend Query (Filters on server):**

- Collection: `pending`
- Kind: `statement_entry` (credit card transactions only)
- Capture Source: `credit_card_statement_upload`
- Verification Status: `unverified`

**Frontend Filter (Simple check):**

- No accounting entries (no rule match)

```typescript
// Query backend for pending unverified credit card transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=pending&kind=statement_entry&status=verification:unverified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for credit card transactions WITHOUT accounting entries (no rule match)
const needsReconciliation = data.transactions.filter((tx) => {
  const isCreditCard = tx.metadata?.capture?.source === 'credit_card_statement_upload';
  const hasAccountingEntries =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isCreditCard && !hasAccountingEntries;
});
```

### Card 4: "Verified and Audit Ready"

**Backend Query (Filters on server):**

- Collection: `source_of_truth`
- Kind: `statement_entry` (credit card transactions only)
- Capture Source: `credit_card_statement_upload`
- Verification Status: `verified`

**Frontend Filter (Simple checks):**

- Reconciled or not required
- Has accounting entries

```typescript
// Query backend for verified credit card transactions
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=verification:verified`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// Filter client-side for audit ready credit card transactions
const auditReady = data.transactions.filter((tx) => {
  const isCreditCard = tx.metadata?.capture?.source === 'credit_card_statement_upload';
  const isReconciled =
    tx.metadata.reconciliation.status === 'reconciled' ||
    tx.metadata.reconciliation.status === 'not_required';
  const hasAccounting =
    (tx.accounting.debits?.length ?? 0) > 0 || (tx.accounting.credits?.length ?? 0) > 0;
  return isCreditCard && isReconciled && hasAccounting;
});
```

**Note:** The query endpoint doesn't currently support filtering by `capture.source` directly, so you'll need to filter client-side. This is acceptable since the dataset is already filtered by `kind=statement_entry` and status.

---

## Distinguishing Bank vs Credit Card Transactions

Both bank and credit card transactions use `kind=statement_entry`, so you must filter by `capture.source`:

- **Bank Transactions**: `metadata.capture.source === 'bank_statement_upload'`
- **Credit Card Transactions**: `metadata.capture.source === 'credit_card_statement_upload'`

**Example:**

```typescript
const isBankTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'bank_statement_upload';

const isCreditCardTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'credit_card_statement_upload';
```

---

## Reconciliation

The reconciliation endpoint handles both bank and credit card transactions:

**Endpoint:**

```
POST /authenticated/transactions3/api/reconcile/bank
```

**Request:**

```json
{
  "businessId": "business_xyz"
}
```

**What it does:**

- Matches both bank AND credit card statement transactions with verified purchase receipts
- Archives matched statement transactions
- Updates purchase receipts to `reconciliation.status = 'reconciled'`

**Note:** The endpoint name says "bank" but it handles both bank and credit card statements. This is for backward compatibility.

---

## Key Differences: Bank vs Credit Card

| Aspect                     | Bank Statements               | Credit Cards                         |
| -------------------------- | ----------------------------- | ------------------------------------ |
| **Endpoint**               | `/api/bank-statements/upload` | `/api/credit-card-statements/upload` |
| **Capture Source**         | `bank_statement_upload`       | `credit_card_statement_upload`       |
| **Statement Context**      | `bankName`, `accountNumber`   | `cardName`, `cardNumber`             |
| **Payment Method**         | `bank_transfer`, `cheque`     | `card`                               |
| **Default Credit Account** | `Bank`                        | `Credit Card`                        |
| **Rules**                  | Bank fees, cash withdrawals   | Credit card fees, interest, payments |

---

## Error Handling

Same error codes as bank statements:

- `400 Bad Request` - Invalid request (missing businessId, fileUrl, etc.)
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - User doesn't have access to business
- `404 Not Found` - Business not found
- `500 Internal Server Error` - Server error during processing

**Error Response Format:**

```json
{
  "error": "Business ID is required",
  "requestId": "req_1234567890_abc123"
}
```

---

## Testing

### Test Credit Card Statement Upload

```typescript
const testCreditCardStatement = async () => {
  const response = await fetch(
    `${API_BASE_URL}/authenticated/transactions3/api/credit-card-statements/upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessId: 'test-business-id',
        fileUrl: 'https://example.com/cc-statement.pdf',
        cardName: 'Visa Business Card',
        cardNumber: '****1234',
        statementStartDate: '2025-01-01',
        statementEndDate: '2025-01-31',
      }),
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('Transactions created:', data.summary.totalTransactions);
    console.log('Rule matched:', data.summary.ruleMatched);
    console.log('Needs reconciliation:', data.summary.needsReconciliation);
  } else {
    const error = await response.json();
    console.error('Error:', error.error);
  }
};
```

---

## Summary

**Quick Update Checklist:**

- [ ] Update API endpoint from `/transactions2/api/transactions` to `/transactions3/api/credit-card-statements/upload`
- [ ] Remove `transactionType` and `inputMethod` from request body (simpler format)
- [ ] Use grouped response: `data.transactions.needsVerification` and `data.transactions.needsReconciliation`
- [ ] Populate Card 1 ("Needs Verification") with rule-matched transactions
- [ ] Populate Card 2 ("Needs Reconciliation") with transactions needing reconciliation
- [ ] Filter queries by `capture.source === 'credit_card_statement_upload'` to distinguish from bank transactions
- [ ] Test with real credit card statement PDFs

**That's it!** The endpoints are simpler and align with our new architecture where transaction records are the source of truth.
