# Accounts Payable Transactions3 Integration

## Overview

The frontend has been updated to support an "Accounts Payable" card in the Purchases section of the Transactions Scaffold screen. This card displays purchase transactions that have "Accounts Payable" as a payment method and are not yet paid.

## Frontend Implementation

### What Has Been Implemented

1. **New "Accounts Payable" Card**: Added to the Purchases3 section, positioned below the "Reporting Ready" separator line and above the "Reconcile to bank" card.

2. **Transaction Filtering**: The frontend filters transactions based on:
   - Transaction classification: `kind === 'purchase'`
   - Verification status: `verified` or `exception`
   - Payment method: Contains "Accounts Payable" (case-insensitive, supports variations: `accounts_payable`, `accounts payable`, `accountspayable`)
   - Payment status: Not yet reconciled (not `matched`, `reconciled`, or `exception`)
   - Payment type: Not cash-only

3. **Data Source**: The card displays transactions from the `transactions3` collection, specifically from the `source_of_truth` collection (verified transactions).

4. **Transaction Flow**: When a user marks an Accounts Payable transaction as paid from the transaction detail screen:
   - If paid by bank transfer: Transaction should move to "Reconcile to bank" card
   - If paid by credit card: Transaction should move to "Reconcile to Credit Card" card
   - If paid by cash: Transaction should move directly to "Verified, reconciled and audit ready" card

## Backend Requirements

### 1. Transactions3 Collection Support

**Requirement**: Any transaction that has "Accounts Payable" as a payment method must be added to the `transactions3` collection.

**Implementation Details**:
- When a purchase transaction is created or updated with payment method "Accounts Payable", ensure it exists in the `transactions3` collection
- The transaction should be in the `source_of_truth` collection (since it's verified)
- The transaction should have:
  - `metadata.classification.kind = 'purchase'`
  - `metadata.verification.status = 'verified'` (or `'exception'`)
  - Payment method information stored in one of:
    - `accounting.paymentBreakdown[]` with `type` or `paymentType` containing "Accounts Payable"
    - `details.paymentType[]` with `type` containing "Accounts Payable"
    - `details.paymentBreakdown[]` with `type` containing "Accounts Payable"

### 2. Payment Method Detection

**Requirement**: The backend should recognize "Accounts Payable" as a payment method in various formats:
- `accounts_payable` (snake_case)
- `accounts payable` (space-separated)
- `accountspayable` (no separator)
- Case-insensitive matching

### 3. Transaction Status Updates

**Requirement**: When a transaction is marked as paid (via the transaction detail screen or API), update the transaction record accordingly:

**When Paid by Bank Transfer**:
- Update `metadata.reconciliation.status = 'pending_bank_match'`
- Update `metadata.reconciliation.type = 'bank_transfer'`
- Transaction should appear in "Reconcile to bank" card

**When Paid by Credit Card**:
- Update `metadata.reconciliation.status = 'pending_bank_match'`
- Update `metadata.reconciliation.type = 'card'`
- Transaction should appear in "Reconcile to Credit Card" card

**When Paid by Cash**:
- Update `metadata.reconciliation.status = 'reconciled'` (or `'not_required'`)
- Transaction should appear in "Verified, reconciled and audit ready" card

### 4. Payment Method Update

**Requirement**: When a transaction is marked as paid, update the payment method information:
- Remove or update the "Accounts Payable" payment method entry
- Add the new payment method (bank_transfer, card, or cash) to the appropriate payment breakdown fields

### 5. Payment Methods API

**Requirement**: The payment methods API must include "Accounts Payable" as an available option.

**Endpoint**: `GET /api/businesses/{businessId}/payment-methods`

**Response Format**: Should include an option with:
```json
{
  "label": "Accounts Payable",
  "value": "accounts_payable",
  "chartName": "Accounts Payable"
}
```

**Note**: The frontend includes a fallback to ensure "Accounts Payable" is always available in the payment method picker, but the backend should include it in the API response for consistency.

### 6. API Endpoints

**Requirement**: Ensure the following endpoints support Accounts Payable transactions:

- `GET /api/transactions3/{businessId}/source_of_truth`: Should return Accounts Payable transactions when filtered appropriately
- `POST/PUT /api/transactions/{transactionId}/mark-paid`: Should update the transaction status and payment method as described above
- `GET /api/businesses/{businessId}/payment-methods`: Should include "Accounts Payable" in the response

### 7. Transactions3 Payment Method Update Endpoint

**Requirement**: A new endpoint is needed to update payment methods for verified transactions3 transactions.

**Endpoint**: `PATCH /authenticated/transactions3/api/transactions/{transactionId}?businessId={businessId}`

**Request Body**:
```json
{
  "paymentMethod": "cash" // or "bank_transfer", "card", "accounts_payable", etc.
}
```

**Response**: Should return the updated Transaction object.

**Purpose**: This endpoint allows users to update the payment method of verified transactions3 transactions (e.g., changing from "Accounts Payable" to "Cash" when a transaction is paid). This is different from the transactions2 update endpoint which doesn't work for transactions3 transactions.

**Note**: The frontend will use this endpoint when updating payment methods on verified transactions3 transactions (including Accounts Payable transactions that have been marked as paid).

## Testing Checklist

- [ ] Verify "Accounts Payable" appears in payment methods API response
- [ ] Verify "Accounts Payable" appears in payment method picker modal on transaction detail screen
- [ ] Create a purchase transaction with "Accounts Payable" payment method
- [ ] Verify transaction appears in transactions3 collection (source_of_truth)
- [ ] Verify transaction appears in "Accounts Payable" card on frontend
- [ ] Mark transaction as paid by bank transfer
- [ ] Verify transaction moves to "Reconcile to bank" card
- [ ] Mark transaction as paid by credit card
- [ ] Verify transaction moves to "Reconcile to Credit Card" card
- [ ] Mark transaction as paid by cash
- [ ] Verify transaction moves to "Verified, reconciled and audit ready" card
- [ ] Test with various payment method format variations (accounts_payable, accounts payable, etc.)

## Notes

- The frontend currently filters Accounts Payable transactions client-side from the transactions3 source_of_truth collection
- The backend should ensure all Accounts Payable transactions are properly indexed and queryable
- Consider adding a specific query parameter or filter to the transactions3 API to efficiently retrieve Accounts Payable transactions if needed

## Questions or Issues

If you have questions about the frontend implementation or need clarification on any requirements, please reach out to the frontend team.

