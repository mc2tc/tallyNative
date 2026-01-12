# Mark Paid Invoice - Transaction Date and Filtering Issues

**Date**: 2025-01-11  
**Status**: ⚠️ **BUGS IDENTIFIED**  
**Priority**: High  
**Related**: `TRANSACTIONS3_MARK_INVOICE_PAID.md`

---

## Summary

Two issues have been identified when marking an invoice as paid via the `/authenticated/transactions3/api/transactions/{transactionId}/mark-paid` endpoint:

1. **Transaction Date Incorrectly Updated**: The `transaction.summary.transactionDate` is being updated to today's date, but it should remain as the original invoice date.
2. **Filtering Issue (Frontend)**: After marking as paid, invoices may still appear in the "Unpaid invoices" card. This appears to be a frontend filtering issue that needs verification.

---

## Issue 1: Transaction Date Incorrectly Updated

### Expected Behavior

When an invoice is marked as paid:
- **The transaction date (`transaction.summary.transactionDate`) should remain unchanged** (preserve the original invoice date)
- Only the payment method and accounting entries should be updated
- The payment date (if needed) should be stored separately, not overwrite the transaction date

### Actual Behavior

The `transaction.summary.transactionDate` is being updated to today's date (the date when "Mark as paid" is clicked), which is incorrect.

### Impact

- **Accounting/Reporting**: Transaction dates are incorrect for historical reporting and accounting periods
- **Invoice Tracking**: The original invoice date is lost, making it difficult to track when invoices were originally issued
- **Audit Trail**: Breaks the audit trail by changing the transaction date after the fact

### Technical Details

**Endpoint**: `PATCH /authenticated/transactions3/api/transactions/{transactionId}/mark-paid`

**Current Implementation** (from `TRANSACTIONS3_MARK_INVOICE_PAID.md`):
- Line 77: "Updates transaction date if payment date is provided"
- Line 121: "Payment Date: For AR invoices, can update transaction date to payment date"

**Request**: The frontend currently does NOT pass a `paymentDate` parameter, so the backend should NOT be updating the transaction date. However, the transaction date is still being updated to today's date.

### Required Fix

**The `transaction.summary.transactionDate` should NEVER be updated when marking an invoice as paid**, regardless of whether `paymentDate` is provided or not.

**If a payment date needs to be tracked separately**, it should be stored in a separate field (e.g., `metadata.payment.date` or `paymentBreakdown[].date`), not overwrite the original transaction date.

---

## Issue 2: Invoice Still Appears in "Unpaid invoices" Card

### Expected Behavior

When an invoice is marked as paid:
- The invoice should be **removed** from the "Unpaid invoices" card
- The invoice should appear in:
  - "Awaiting bank match" (if payment method is `card` or `bank_transfer`)
  - "Sales Invoices" / "All done" (if payment method is `cash`)

### Actual Behavior

After marking an invoice as paid, it still appears in the "Unpaid invoices" card.

### Frontend Filtering Logic

The "Unpaid invoices" filter currently checks:
- `!isReconciled && !isCashOnly`
- `isReconciled` = `reconciliationStatus === 'matched' || reconciliationStatus === 'reconciled' || reconciliationStatus === 'exception'`
- `isCashOnly` = payment breakdown contains `cash` type

**Problem**: When an invoice is marked as paid with `card` or `bank_transfer`:
- Reconciliation status is set to `pending_bank_match` (which is NOT in the `isReconciled` list)
- `isCashOnly` = false (because payment method is card/bank, not cash)
- Therefore: `!isReconciled && !isCashOnly` = `true && true` = `true`
- Result: Invoice still appears in "Unpaid invoices" (incorrect behavior)

### Root Cause

The frontend filter logic needs to check if `accounts_receivable` is no longer in the payment breakdown. If `accounts_receivable` is NOT in the payment breakdown, the invoice has been paid (regardless of reconciliation status).

However, this issue may also be caused by:
1. **Payment breakdown not updated correctly**: `accounts_receivable` may not be properly replaced with the actual payment method
2. **Reconciliation status not updated correctly**: Status may not be set to `pending_bank_match` or `reconciled` as expected

### Required Investigation

Please verify:
1. Is `paymentBreakdown` correctly updated to remove `accounts_receivable` and add the actual payment method?
2. Is `reconciliation.status` correctly updated to `pending_bank_match` (card/bank) or `reconciled` (cash)?
3. Are all fields in the response transaction properly updated?

**Note**: Once backend confirms the data is correct, the frontend filtering logic will be updated to check for the absence of `accounts_receivable` in the payment breakdown, rather than relying solely on reconciliation status.

---

## Questions for Backend Team

### 1. Transaction Date Update

**Q:** Why is `transaction.summary.transactionDate` being updated when marking an invoice as paid, even when `paymentDate` is not provided in the request?

**Q:** Should the transaction date EVER be updated when marking as paid? Our understanding is that it should remain as the original invoice date.

**Q:** If a payment date needs to be tracked, should it be stored in a separate field instead of overwriting the transaction date?

### 2. Payment Breakdown Update

**Q:** When marking as paid, is `paymentBreakdown` correctly updated to remove `accounts_receivable` and replace it with the actual payment method (cash/card/bank_transfer)?

**Q:** Can you confirm the exact structure of `paymentBreakdown` after marking as paid?

### 3. Reconciliation Status

**Q:** Is `reconciliation.status` correctly set to:
- `reconciled` for cash payments?
- `pending_bank_match` for card/bank_transfer payments?

### 4. Response Data

**Q:** Can you confirm that the response transaction object includes all updated fields (paymentBreakdown, reconciliation.status, etc.) and that no fields are missing or incorrectly formatted?

---

## Testing Scenarios

Please test and verify:

1. ✅ Mark invoice as paid with cash → Verify transaction date is NOT changed
2. ✅ Mark invoice as paid with card → Verify transaction date is NOT changed
3. ✅ Mark invoice as paid with bank_transfer → Verify transaction date is NOT changed
4. ✅ Verify paymentBreakdown is updated correctly (accounts_receivable removed, payment method added)
5. ✅ Verify reconciliation.status is updated correctly (reconciled for cash, pending_bank_match for card/bank)
6. ✅ Verify transaction.summary.transactionDate remains as original invoice date
7. ✅ Verify all updated fields are returned in the response

---

## Related Documentation

- `docs/api/TRANSACTIONS3_MARK_INVOICE_PAID.md` - Current implementation documentation
- `screens/TransactionDetailScreen.tsx` - Frontend mark-as-paid implementation
- `screens/TransactionsScaffoldScreen.tsx` - Frontend filtering logic

---

## Priority

**High** - These issues affect:
- Accounting accuracy (incorrect transaction dates)
- User experience (invoices not properly categorized)
- Data integrity (original invoice dates being lost)

---

## Next Steps

1. ⏳ **Backend Team**: Investigate and fix transaction date update issue
2. ⏳ **Backend Team**: Verify payment breakdown and reconciliation status updates
3. ⏳ **Frontend Team**: Verify filtering logic once backend fixes are confirmed
4. ⏳ **QA**: Test invoice marking workflow end-to-end

