# Credit Card Statement Integration (React Native → transactions2)

## Overview

Credit card statements now flow end-to-end through the unified `/authenticated/transactions2/api/transactions` endpoint. This guide focuses on the React Native requirements, payload structure, and downstream behavior so the “Credit Card Transactions” card displays the correct records (without duplicating bank transactions).

---

## Endpoint

**POST** `/authenticated/transactions2/api/transactions`

```typescript
interface CreditCardStatementRequest {
  businessId: string;
  transactionType: 'credit_card_transaction';   // REQUIRED
  inputMethod: 'ocr_pdf';                       // REQUIRED for statements
  fileUrl: string;                              // Cloud storage URL (GCS/S3/etc.)
  cardName?: string;                            // e.g. "Visa Business", "Mastercard 1234"
  cardNumber?: string;                          // Masked (e.g. "****1234")
  statementStartDate?: string;                  // ISO date (YYYY-MM-DD)
  statementEndDate?: string;                    // ISO date (YYYY-MM-DD)
  captureSource?: string;                       // Optional override (default = credit_card_statement_ocr)
  captureMechanism?: string;                    // Optional override (default = batch)
}
```

### Minimal Example

```json
{
  "businessId": "biz_001",
  "transactionType": "credit_card_transaction",
  "inputMethod": "ocr_pdf",
  "fileUrl": "https://storage.googleapis.com/.../cc-statement.pdf",
  "cardName": "Visa Business Card",
  "cardNumber": "****1234",
  "statementStartDate": "2025-01-01",
  "statementEndDate": "2025-01-31"
}
```

---

## Backend Processing Pipeline

1. **Vertex AI OCR** (shared bank/credit card analyzer)  
   - Prompt now includes credit-card-specific hints (± signs, trailing `CR/DR`, single-letter debit/credit columns).
   - Statement kind is passed as `statementKind = 'credit_card'`.

2. **Credit Card Transform** (`creditCardStatementTransform.ts`)  
   - Converts OCR output into `transactions2` documents.
   - Stores card context in `metadata.statementContext.cardName/cardNumber`.
   - Sets `metadata.capture.source = 'credit_card_statement_ocr'`.

3. **Rule-Driven Classification** (`creditCardStatementRules.ts`)  
   - Default rules (extendable later):
     - `creditCardFee`: Matches “annual fee”, “overlimit fee”, etc. → debit `Fees & Charges`.
     - `interestCharge`: Matches “interest”, “finance charge” → debit `Interest Expense`.
     - `payment`: Matches “payment”, “automatic payment” → debit `Credit Card` (repayment entry).
   - Only rules populate `details.itemList` and accounting entries. No rule match → empty arrays to keep reconciliation simple.

4. **Firestore Save**  
   - Transactions land in `transactions2` with `classification.kind = 'statement_entry'`.
   - Workflow state:
     - Rule hit → appears under **Needs Verification** until user confirms debit account.
     - No rule → appears under **Needs Reconciliation** until matched to a purchase receipt.

---

## RN Display Logic

### Filtering

```typescript
const isCreditCardTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'credit_card_statement_ocr';

const isBankTransaction = (tx: Transaction) =>
  tx.metadata?.capture?.source === 'bank_statement_ocr';
```

- **Credit Card Transactions card**: render only transactions where `metadata.capture.source === 'credit_card_statement_ocr'`.
- **Bank Transactions card**: render only `bank_statement_ocr`.
- Both share `classification.kind = 'statement_entry'`, so relying on `kind` alone will duplicate rows across cards.

### Status Cards

Use the reporting-ready logic documented in `BANK_TRANSACTION_WORKFLOW_STATES.md` (same applies to credit cards):

- `Needs Verification`: accounting entries exist (rule matched) but `metadata.verification.status !== 'verified'`.
- `Needs Reconciliation`: no accounting entries OR verified but `metadata.reconciliation.status !== matched/exception`.
- `Reporting Ready`: verified AND (has accounting entries OR reconciliation complete).

---

## Error Handling

| Scenario | Response | Notes |
|----------|----------|-------|
| Missing `fileUrl` | 400 | RN must upload PDF to storage first. |
| Unauthenticated | 401 | Token missing/expired. |
| Business not found | 404 | Wrong `businessId` or user lacks access. |
| OCR failure / Vertex rate limit | 500/429 | Response includes `requestId` for log lookup. |
| No transactions extracted | 422 | Returns skipped rows so RN can notify the user. |

Each response includes `requestId` to trace server logs.

---

## Testing Snippet

```typescript
const testCreditCardStatementUpload = async () => {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessId: 'biz_001',
      transactionType: 'credit_card_transaction',
      inputMethod: 'ocr_pdf',
      fileUrl: 'https://storage.googleapis.com/.../cc-statement.pdf',
      cardName: 'Visa Business',
      cardNumber: '****1234',
      statementStartDate: '2025-01-01',
      statementEndDate: '2025-01-31',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Upload failed', data);
    return;
  }

  console.log('Transactions saved:', data.savedTransactionIds);
};
```

---

## Future Enhancements

- Allow businesses to define custom credit card rules from RN (UI for Auto Bank Rules → “Auto Card Rules”).
- Extend OCR schema to detect minimum payment, credit limit, and statement balance for dashboard insights.
- Auto-link payments to credit card liability accounts when matched with bank statement uploads.

---

Need more details? Check `creditCardStatementTransform.ts`, `creditCardStatementRules.ts`, and `REACT_NATIVE_TRANSACTIONS2_INTEGRATION.md`, or ping the backend team for demos. 👋

