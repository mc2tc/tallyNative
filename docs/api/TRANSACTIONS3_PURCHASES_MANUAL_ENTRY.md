# Transactions3 Purchases - Manual Entry Refactor

**Audience**: Backend team  
**Scope**: Refactor Manual Purchase Entry to use transactions3 architecture  
**Current Status**: Manual Purchase Entry currently uses transactions2 endpoint (`/authenticated/transactions2/api/transactions`)

---

## Overview

The Manual Purchase Entry screen currently creates purchase transactions via the transactions2 unified endpoint. This needs to be refactored to use the transactions3 architecture, where manual entries are treated as verified by default and saved directly to the source of truth collection.

---

## Current Implementation

**Endpoint**: `POST /authenticated/transactions2/api/transactions`

**Request Format**:
```json
{
  "businessId": "business_123",
  "transactionType": "purchase",
  "inputMethod": "manual",
  "transactionData": {
    "vendorName": "Office Supplies Co",
    "transactionDate": "2024-01-15",
    "totalAmount": 150.00,
    "currency": "GBP",
    "reference": "INV-2024-001",
    "items": [
      {
        "name": "Printer Paper",
        "debitAccount": "Office Supplies",
        "quantity": 10,
        "unitCost": 12.50,
        "amount": 125.00
      }
    ],
    "charges": [
      {
        "name": "VAT",
        "rate": "20%",
        "amount": 25.00
      }
    ],
    "paymentType": [
      {
        "type": "card",
        "amount": 150.00
      }
    ]
  }
}
```

**Payment Types Supported**:
- `cash`
- `card`
- `bank_transfer`
- `cheque`
- `accounts_payable`
- `employee_expense`
- `unknown`

---

## Required Changes

### 1. New Endpoint

**Create**: `POST /authenticated/transactions3/api/purchases/manual`

**Request Format**: Same as current transactions2 format (maintain backward compatibility for frontend)

**Key Differences from OCR Endpoint**:
- Manual entries are **verified by default** (no verification step needed)
- Save directly to `transactions3` collection (source of truth), **bypassing `transactions3_pending`**
- Generate accounting entries immediately
- Set appropriate reconciliation status based on payment type

---

## Transaction Status Logic

### Verification Status

**All manual entries**:
- `metadata.verification.status = 'verified'` (verified by default since user manually entered)
- `metadata.verification.verifiedBy = user_uid`
- `metadata.verification.verifiedAt = timestamp`
- `metadata.verification.method = 'manual_entry'`

### Reconciliation Status and Type

Set reconciliation status and type based on payment method(s):

#### Cash-Only Payments
- **Condition**: All payment methods are `cash`
- **Status**: `metadata.reconciliation.status = 'reconciled'` (or `'not_required'`)
- **Type**: `metadata.reconciliation.type = undefined` (not needed for cash)
- **Display**: "Verified, reconciled and audit ready" card

#### Accounts Payable Payments
- **Condition**: Payment method includes `accounts_payable`
- **Status**: `metadata.reconciliation.status = 'pending_payment'` (or similar - indicates awaiting payment)
- **Type**: `metadata.reconciliation.type = undefined` (not applicable)
- **Display**: "Accounts Payable" card
- **Note**: When marked as paid later, update reconciliation status based on new payment method (see Accounts Payable integration doc)

#### Card Payments
- **Condition**: Payment method includes `card` (and no `accounts_payable`)
- **Status**: `metadata.reconciliation.status = 'pending_bank_match'`
- **Type**: `metadata.reconciliation.type = 'card'`
- **Display**: "Reconcile to Credit Card" card

#### Bank Transfer Payments
- **Condition**: Payment method includes `bank_transfer` (and no `accounts_payable`)
- **Status**: `metadata.reconciliation.status = 'pending_bank_match'`
- **Type**: `metadata.reconciliation.type = 'bank_transfer'`
- **Display**: "Reconcile to bank" card

#### Mixed Payments
- **Condition**: Multiple payment methods including both `card` and `bank_transfer`
- **Status**: `metadata.reconciliation.status = 'pending_bank_match'`
- **Type**: `metadata.reconciliation.type = 'mixed'`
- **Display**: Show in both "Reconcile to bank" and "Reconcile to Credit Card" cards (or create mixed section)

#### Cheque Payments
- **Condition**: Payment method includes `cheque`
- **Status**: `metadata.reconciliation.status = 'pending_bank_match'`
- **Type**: `metadata.reconciliation.type = 'bank_transfer'` (cheques clear through bank)
- **Display**: "Reconcile to bank" card

---

## Collection and Accounting

### Collection
- **Save to**: `transactions3` collection (source of truth)
- **Do NOT save to**: `transactions3_pending` (manual entries bypass pending state)

### Accounting Entries
- **Generate immediately**: Create balanced double-entry accounting entries
- **Debits**: Based on item `debitAccount` fields
- **Credits**: Based on payment methods:
  - `cash` → Credit to "Cash" account
  - `card` → Credit to "Bank Account" or appropriate card account
  - `bank_transfer` → Credit to "Bank Account"
  - `cheque` → Credit to "Bank Account"
  - `accounts_payable` → Credit to "Accounts Payable" account
  - `employee_expense` → Credit to "Employee Expenses" or appropriate account

### Transaction Kind
- **Set**: `metadata.classification.kind = 'purchase'`

### Capture Metadata
- **Set**: `metadata.capture.source = 'manual_entry'`
- **Set**: `metadata.capture.mechanism = 'manual'`

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
      "businessId": "business_123",
      "capture": {
        "source": "manual_entry",
        "mechanism": "manual"
      },
      "verification": {
        "status": "verified",
        "verifiedBy": "user_uid",
        "verifiedAt": 1704067200000,
        "method": "manual_entry"
      },
      "reconciliation": {
        "status": "pending_bank_match",
        "type": "card"
      },
      "classification": {
        "kind": "purchase"
      }
    },
    "summary": {
      "thirdPartyName": "Office Supplies Co",
      "totalAmount": 150.00,
      "transactionDate": 1704067200000,
      "currency": "GBP"
    },
    "accounting": {
      "debits": [
        {
          "chartName": "Office Supplies",
          "amount": 125.00
        },
        {
          "chartName": "VAT",
          "amount": 25.00
        }
      ],
      "credits": [
        {
          "chartName": "Bank Account",
          "amount": 150.00
        }
      ],
      "balanced": true
    },
    "details": {
      "items": [...],
      "charges": [...],
      "paymentBreakdown": [...]
    }
  }
}
```

---

## Display Card Mapping

The frontend will query transactions3 and display them in the appropriate cards based on reconciliation status and type:

### "Accounts Payable" Card
- **Query**: `collection=source_of_truth`, `kind=purchase`, `verification.status=verified`
- **Filter**: Payment method includes `accounts_payable`
- **Status**: `reconciliation.status = 'pending_payment'` (or similar)

### "Reconcile to bank" Card
- **Query**: `collection=source_of_truth`, `kind=purchase`, `verification.status=verified`
- **Filter**: `reconciliation.status = 'pending_bank_match'` AND `reconciliation.type = 'bank_transfer'` (or `'mixed'`)

### "Reconcile to Credit Card" Card
- **Query**: `collection=source_of_truth`, `kind=purchase`, `verification.status=verified`
- **Filter**: `reconciliation.status = 'pending_bank_match'` AND `reconciliation.type = 'card'` (or `'mixed'`)

### "Verified, reconciled and audit ready" Card
- **Query**: `collection=source_of_truth`, `kind=purchase`, `verification.status=verified`
- **Filter**: `reconciliation.status = 'reconciled'` OR `reconciliation.status = 'not_required'`
- **Note**: Cash-only manual entries should appear here immediately

---

## Foreign Currency Handling

If `currency` differs from business currency:
- Fetch exchange rate from Fixer.io for `transactionDate`
- Convert all amounts (items, charges, totalAmount) to business currency
- Store original currency details in `details.foreignCurrency`
- All accounting entries use converted amounts in business currency

---

## Validation

Maintain all existing validation rules from transactions2:
- Required fields: `businessId`, `vendorName`, `transactionDate`, `totalAmount`, `items`
- Item validation: `name`, `debitAccount`, `quantity`, `unitCost`, `amount`
- Payment method validation: Sum of payment amounts must equal `totalAmount`
- Date validation: Valid ISO 8601 date string

---

## Error Handling

Same error codes as transactions2:
- `400 Bad Request` - Invalid request (missing required fields, validation errors)
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - User doesn't have access to business
- `404 Not Found` - Business not found
- `500 Internal Server Error` - Server error during processing

---

## Migration Notes

### Frontend Impact
- Frontend will update to call new endpoint: `/authenticated/transactions3/api/purchases/manual`
- Request format remains the same (backward compatible)
- Response format changes (now includes transactions3 metadata structure)

### Backward Compatibility
- Consider maintaining transactions2 endpoint temporarily for other clients
- Or migrate all clients to transactions3 simultaneously

---

## Testing Checklist

- [ ] Create manual entry with `cash` payment → Verify appears in "Verified, reconciled and audit ready" card
- [ ] Create manual entry with `accounts_payable` payment → Verify appears in "Accounts Payable" card
- [ ] Create manual entry with `card` payment → Verify appears in "Reconcile to Credit Card" card
- [ ] Create manual entry with `bank_transfer` payment → Verify appears in "Reconcile to bank" card
- [ ] Create manual entry with `cheque` payment → Verify appears in "Reconcile to bank" card
- [ ] Create manual entry with mixed payments (`card` + `bank_transfer`) → Verify appears in both reconciliation cards
- [ ] Verify transaction saved to `transactions3` collection (not `transactions3_pending`)
- [ ] Verify `verification.status = 'verified'` immediately
- [ ] Verify accounting entries generated immediately
- [ ] Verify foreign currency conversion works correctly
- [ ] Verify all validation rules still apply
- [ ] Test error handling (missing fields, invalid data, etc.)

---

## Related Documentation

- [Transactions2 Purchases Manual Entry](./TRANSACTIONS2_PURCHASES_MANUAL_ENTRY.md) - Current implementation
- [Transactions3 RN Integration](./TRANSACTIONS3_RN_INTEGRATION.md) - General transactions3 architecture
- [Accounts Payable Transactions3 Integration](./ACCOUNTS_PAYABLE_TRANSACTIONS3_INTEGRATION.md) - Accounts Payable card requirements

---

## Questions?

If you have questions about the requirements or need clarification, please reach out to the frontend team.

