# Direct Bank Payment Type - Reconciliation Metadata Requirements

## Overview

Transactions with `paymentBreakdown` type `'direct_bank'` need to be properly configured in the backend so they appear in the frontend's "Awaiting bank match" card in the Purchases pipeline.

## Current Frontend Behavior

The frontend (`TransactionsScaffoldScreen.tsx`) filters transactions for the "Awaiting bank match" card using the following criteria:

```typescript
// For purchases3 section, "Awaiting bank match" card:
- classification.kind === 'purchase'
- verification.status === 'verified' OR 'exception'
- reconciliation.status === 'pending_bank_match'
- reconciliation.type === 'bank_transfer'
```

**Important**: The frontend does NOT check the `paymentBreakdown` type directly. It relies entirely on the `reconciliation.type` and `reconciliation.status` metadata fields.

## Required Backend Configuration

For transactions where `paymentBreakdown` contains entries with `type === 'direct_bank'`, the backend MUST set:

```json
{
  "metadata": {
    "reconciliation": {
      "status": "pending_bank_match",
      "type": "bank_transfer"
    }
  }
}
```

## When to Set This Metadata

This metadata should be set when:

1. A purchase transaction is verified (via `confirmVerification` or similar endpoint)
2. The transaction's `paymentBreakdown` array contains at least one entry with `type === 'direct_bank'`
3. The transaction is not already reconciled

## Implementation Notes

- This should happen **after** verification but **before** reconciliation
- The `reconciliation.type = 'bank_transfer'` indicates this transaction needs to be matched against bank statement entries
- The `reconciliation.status = 'pending_bank_match'` indicates it's waiting for bank reconciliation
- This is similar to how other bank transfer transactions are handled, but specifically for the `direct_bank` payment type

## Related Code Locations

Frontend filtering logic:
- `screens/TransactionsScaffoldScreen.tsx` lines 2200-2227 (purchases3ReconcileToBank)
- `screens/TransactionsScaffoldScreen.tsx` lines 1585-1611 (getFullTransactions for "Awaiting bank match")

## Expected User Flow

1. User verifies a purchase transaction with `direct_bank` payment type
2. Backend sets `reconciliation.status = 'pending_bank_match'` and `reconciliation.type = 'bank_transfer'`
3. Transaction appears in "Awaiting bank match" card in Purchases pipeline
4. User can then reconcile it from the Bank section using the reconcile button
5. After reconciliation, backend updates `reconciliation.status = 'matched'` or `'reconciled'`
6. Transaction moves to "All done" card

## Edge Cases to Consider

- What if a transaction has multiple payment methods including `direct_bank`? (Should still be marked for bank reconciliation)
- What if a `direct_bank` transaction is already reconciled? (Should not set `pending_bank_match`)
- What if the transaction is cash-only? (Should not set bank reconciliation metadata)

