# Transactions3 Manual Entry - Cash Transactions Not Appearing in Audit Ready Card

**Date**: Issue Report  
**Status**: 🔴 Needs Investigation  
**Priority**: High

---

## Issue Summary

Manual purchase entries paid with cash are not appearing in the "Verified, reconciled and audit ready" card on the frontend. These transactions should appear immediately after creation since cash transactions don't require bank reconciliation.

---

## Expected Behavior

When a manual purchase entry is created with **cash-only payment** (`paymentType: [{ type: 'cash', amount: X }]`), the transaction should:

1. ✅ Be saved to `transactions3` collection (source of truth) - **Working**
2. ✅ Have `verification.status = 'verified'` - **Working**
3. ✅ Have `reconciliation.status = 'reconciled'` OR `'not_required'` - **❌ Issue here**
4. ✅ Appear in "Verified, reconciled and audit ready" card - **Not working due to #3**

---

## Frontend Query Logic

The frontend queries transactions for the "Verified, reconciled and audit ready" card using:

**Query:**
```typescript
GET /authenticated/transactions3/api/transactions?businessId=xxx&collection=source_of_truth&kind=purchase&status=verification:verified
```

**Client-side Filter:**
```typescript
// Only purchase transactions
const isPurchase = metadata.classification?.kind === 'purchase'

// Must be verified
const isVerified = metadata.verification?.status === 'verified' || 
                   metadata.verification?.status === 'exception'

// Must be reconciled (or not required if cash-only)
const isReconciled = metadata.reconciliation?.status === 'matched' ||
                     metadata.reconciliation?.status === 'reconciled' ||
                     metadata.reconciliation?.status === 'exception' ||
                     metadata.reconciliation?.status === 'not_required'

return isPurchase && isVerified && isReconciled
```

---

## Root Cause Analysis

The frontend filter requires `reconciliation.status` to be one of:
- `'matched'`
- `'reconciled'`
- `'exception'`
- `'not_required'`

**Hypothesis**: The backend is not setting `reconciliation.status = 'reconciled'` or `'not_required'` for cash-only manual entries.

---

## Expected Backend Behavior (Per Documentation)

According to `TRANSACTIONS3_PURCHASES_MANUAL_ENTRY.md`, cash-only payments should:

### Cash-Only Payments
- **Condition**: All payment methods are `cash`
- **Status**: `metadata.reconciliation.status = 'reconciled'` (or `'not_required'`)
- **Type**: `metadata.reconciliation.type = undefined` (not needed for cash)
- **Display**: "Verified, reconciled and audit ready" card

---

## Test Case

**Request:**
```json
POST /authenticated/transactions3/api/purchases/manual
{
  "businessId": "business_123",
  "transactionData": {
    "vendorName": "Test Vendor",
    "transactionDate": "2024-01-15",
    "totalAmount": 100.00,
    "currency": "GBP",
    "items": [
      {
        "name": "Test Item",
        "debitAccount": "Office Supplies",
        "quantity": 1,
        "unitCost": 100.00,
        "amount": 100.00
      }
    ],
    "paymentType": [
      {
        "type": "cash",
        "amount": 100.00
      }
    ]
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "transactionId": "tx_abc123",
  "transaction": {
    "metadata": {
      "verification": {
        "status": "verified"
      },
      "reconciliation": {
        "status": "reconciled",  // ✅ Should be 'reconciled' or 'not_required'
        "type": undefined
      },
      "classification": {
        "kind": "purchase"
      }
    }
  }
}
```

**Actual Response (Suspected):**
```json
{
  "metadata": {
    "reconciliation": {
      "status": "pending_bank_match",  // ❌ Wrong - cash doesn't need bank reconciliation
      "type": undefined
    }
  }
}
```

---

## Investigation Steps

1. **Check Manual Entry Endpoint Logic**:
   - Verify that cash-only payment detection is working correctly
   - Verify that `reconciliation.status` is being set to `'reconciled'` or `'not_required'` for cash payments
   - Check if there's a condition that's incorrectly setting it to `'pending_bank_match'`

2. **Check Transaction Creation**:
   - Review the code that processes `paymentType` array
   - Ensure all payment methods are checked (not just the first one)
   - Verify the logic that determines if a transaction is "cash-only"

3. **Verify Query Returns Transactions**:
   - Test query: `GET /authenticated/transactions3/api/transactions?businessId=xxx&collection=source_of_truth&kind=purchase&status=verification:verified`
   - Check if cash transactions are being returned
   - Verify `reconciliation.status` value in returned transactions

---

## Possible Issues

1. **Payment Type Detection**: Backend might not be correctly identifying cash-only transactions
   - If multiple payment methods exist, check if it's checking ALL are cash
   - If payment method is an array, ensure iteration logic is correct

2. **Reconciliation Status Logic**: Backend might have incorrect conditional logic
   - Cash payments should bypass `pending_bank_match` status
   - Should set `reconciled` or `not_required` immediately

3. **Query Filtering**: Backend query might be filtering out cash transactions
   - Check if query parameters are excluding transactions with `reconciliation.status = 'reconciled'`
   - Verify query is returning all verified purchases regardless of reconciliation status

---

## Frontend Workaround (Not Recommended)

As a temporary workaround, the frontend could query for all verified transactions and filter client-side, but this is inefficient and doesn't solve the root cause.

**Preferred Solution**: Backend should set correct reconciliation status on creation.

---

## Related Documentation

- [Transactions3 Purchases Manual Entry API](./TRANSACTIONS3_PURCHASES_MANUAL_ENTRY.md)
- [Transactions3 Purchases Manual Entry RN Note](./TRANSACTIONS3_PURCHASES_MANUAL_ENTRY_RN_NOTE.md)
- [Transactions3 RN Integration Guide](./TRANSACTIONS3_RN_INTEGRATION.md)

---

## Questions for Backend Team

1. What `reconciliation.status` value is currently being set for cash-only manual entries?
2. Is the payment type detection logic correctly identifying cash-only transactions?
3. Are cash transactions being returned by the query `GET /authenticated/transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=verification:verified`?
4. Should we add a specific query parameter to filter by reconciliation status, or should the client-side filter be sufficient?

---

## Testing Checklist

Once fixed, please verify:

- [ ] Create manual entry with single cash payment → `reconciliation.status = 'reconciled'` or `'not_required'`
- [ ] Create manual entry with multiple cash payments → `reconciliation.status = 'reconciled'` or `'not_required'`
- [ ] Create manual entry with mixed payments (cash + card) → `reconciliation.status = 'pending_bank_match'` (correct)
- [ ] Query returns cash transactions with correct reconciliation status
- [ ] Cash transactions appear in "Verified, reconciled and audit ready" card on frontend

---

## Contact

If you need more information or have questions, please reach out to the frontend team.

