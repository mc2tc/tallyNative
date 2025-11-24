# Bank Transaction Workflow States - RN Implementation Guide

## Overview

Bank statement transactions flow through three distinct states in the RN "Bank Transactions" screen:

1. **Needs Verification** (no reconciliation required)
2. **Needs Reconciliation**
3. **Reporting Ready**

This document explains how to determine which card/section a bank transaction should appear in based on the Transaction data model.

---

## Transaction Type Identification

First, identify bank transactions by checking:

```typescript
transaction.metadata.classification.kind === 'statement_entry'
```

---

## State Determination Logic

### 1. **Needs Verification** (No Reconciliation Required)

**Condition**: Transaction has accounting entries (rule matched) but is not yet verified.

```typescript
function isNeedsVerification(transaction: Transaction): boolean {
  const hasAccountingEntries = 
    (transaction.accounting.debits?.length ?? 0) > 0 ||
    (transaction.accounting.credits?.length ?? 0) > 0;
  
  const isVerified = transaction.metadata.verification.status === 'verified';
  const isException = transaction.metadata.verification.status === 'exception';
  
  return hasAccountingEntries && !isVerified && !isException;
}
```

**What this means:**
- A rule matched (e.g., "bank fee", "cash withdrawal")
- Accounting entries were created automatically
- User needs to verify/confirm the `debitAccount` assignment
- Once verified, transaction moves directly to "Reporting Ready" (no reconciliation needed for standalone transactions)

**User Action Required:**
- Confirm the `debitAccount` for items in `details.itemList`
- This updates `metadata.verification.status` to `'verified'`
- For transactions with accounting entries, verification is sufficient (no reconciliation required)

---

### 2. **Needs Reconciliation**

**Condition**: Transaction has no accounting entries (no rule matched) OR is verified but still needs reconciliation (rare case).

```typescript
function isNeedsReconciliation(transaction: Transaction): boolean {
  const hasAccountingEntries = 
    (transaction.accounting.debits?.length ?? 0) > 0 ||
    (transaction.accounting.credits?.length ?? 0) > 0;
  
  const isVerified = transaction.metadata.verification.status === 'verified';
  const isExceptionVerified = transaction.metadata.verification.status === 'exception';
  
  const reconciliationStatus = transaction.metadata.reconciliation.status;
  const isReconciled = 
    reconciliationStatus === 'matched' || 
    reconciliationStatus === 'exception';
  
  // Needs reconciliation if:
  // 1. No accounting entries (no rule matched) - skip verification, go straight to reconciliation
  // 2. Verified but not reconciled AND no accounting entries (shouldn't happen, but handle it)
  // IMPORTANT: Transactions with accounting entries that are verified should NOT appear here
  return !hasAccountingEntries && !isReconciled;
}
```

**What this means:**
- **Primary case**: Transaction has no accounting entries (no rule matched)
  - These transactions skip verification and go directly to reconciliation
  - They need to be matched with a Purchase Receipt
- Once reconciled, transaction moves to "Reporting Ready"

**User Action Required:**
- Match this bank transaction with a corresponding Purchase Receipt
- This updates `metadata.reconciliation.status` to `'matched'`

**Important**: Transactions with accounting entries (rule matched) that are verified should NOT appear in this section - they go directly to "Reporting Ready".

---

### 3. **Reporting Ready**

**Condition**: Transaction is verified AND (reconciled OR has accounting entries).

```typescript
function isReportingReady(transaction: Transaction): boolean {
  const isVerified = transaction.metadata.verification.status === 'verified';
  const isExceptionVerified = transaction.metadata.verification.status === 'exception';
  
  const reconciliationStatus = transaction.metadata.reconciliation.status;
  const isReconciled = 
    reconciliationStatus === 'matched' || 
    reconciliationStatus === 'exception';
  
  const hasAccountingEntries = 
    (transaction.accounting.debits?.length ?? 0) > 0 ||
    (transaction.accounting.credits?.length ?? 0) > 0;
  
  // Reporting ready if:
  // 1. Verified AND reconciled, OR
  // 2. Verified with accounting entries (standalone transactions like bank fees - no reconciliation needed)
  return (isVerified || isExceptionVerified) && (isReconciled || hasAccountingEntries);
}
```

**What this means:**
- Transaction is fully processed and ready for reporting
- All required verification and reconciliation steps are complete
- Transaction can be included in financial reports

---

## Field Reference

### Verification Status
- **Path**: `transaction.metadata.verification.status`
- **Type**: `TransactionVerificationStatus`
- **Values**:
  - `'unverified'` - Not yet verified
  - `'verified'` - User has verified/confirmed
  - `'rejected'` - User rejected the transaction
  - `'exception'` - Exception case (e.g., cash-only, doesn't need verification)

### Reconciliation Status
- **Path**: `transaction.metadata.reconciliation.status`
- **Type**: `TransactionReconciliationStatus`
- **Values**:
  - `'unreconciled'` - Not yet reconciled
  - `'matched'` - Matched with a Purchase Receipt
  - `'needs_review'` - Needs manual review
  - `'exception'` - Exception case (e.g., cash-only, bank fee - doesn't need reconciliation)

### Accounting Entries
- **Path**: `transaction.accounting.debits` and `transaction.accounting.credits`
- **Type**: `AccountingLedgerEntry[]`
- **Empty arrays** (`[]`) indicate no rule matched - transaction needs reconciliation
- **Non-empty arrays** indicate a rule matched - transaction may only need verification

### Details Items
- **Path**: `transaction.details.itemList`
- **Type**: `TransactionDetailItem[]`
- **Empty array** (`[]`) indicates no rule matched
- **Non-empty array** indicates rule matched - user needs to verify `debitAccount`

---

## State Transition Flow

```
┌─────────────────────────────────┐
│  Bank Statement Uploaded        │
│  (OCR Analysis Complete)        │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Rule Matched?       │
    └──┬───────────────┬───┘
       │               │
    YES│               │NO
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│ Has         │  │ No          │
│ Accounting  │  │ Accounting   │
│ Entries     │  │ Entries      │
│ (Rule       │  │ (No Rule     │
│  Matched)   │  │  Matched)    │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Needs       │  │ Needs       │
│ Verification│  │ Reconciliation│
│ (Card 1)    │  │ (Card 2)     │
│             │  │             │
│ [User       │  │ [Skip        │
│  confirms   │  │  verification│
│  debitAccount│  │  - nothing  │
│             │  │  to verify]  │
│             │  │             │
│ [No         │  │ [Must match │
│  Reconcil.  │  │  with Receipt│
│  Required]  │  │             │
└──────┬──────┘  └──────┬──────┘
       │                │
       │ User verifies  │ User matches
       │ debitAccount   │ with Receipt
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ Reporting   │  │ Reporting   │
│ Ready       │  │ Ready       │
│ (Card 3)    │  │ (Card 3)    │
│             │  │             │
│ [Standalone │  │ [Matched     │
│  transaction│  │  with Receipt│
│  like fee]  │  │             │
└─────────────┘  └─────────────┘
```

---

## Implementation Example

```typescript
function getBankTransactionCard(transaction: Transaction): 'verification' | 'reconciliation' | 'reporting' {
  // Must be a statement entry
  if (transaction.metadata.classification.kind !== 'statement_entry') {
    throw new Error('Not a bank transaction');
  }

  const verificationStatus = transaction.metadata.verification.status;
  const reconciliationStatus = transaction.metadata.reconciliation.status;
  
  const hasAccountingEntries = 
    (transaction.accounting.debits?.length ?? 0) > 0 ||
    (transaction.accounting.credits?.length ?? 0) > 0;
  
  const isVerified = verificationStatus === 'verified' || verificationStatus === 'exception';
  const isReconciled = reconciliationStatus === 'matched' || reconciliationStatus === 'exception';

  // Reporting Ready: Verified with accounting entries (standalone) OR verified and reconciled
  if (isVerified && (hasAccountingEntries || isReconciled)) {
    return 'reporting';
  }

  // Needs Verification: Has accounting entries but not verified
  // (Transactions with rules need user to confirm debitAccount)
  if (hasAccountingEntries && !isVerified) {
    return 'verification';
  }

  // Needs Reconciliation: No accounting entries (no rule matched) - skip verification
  // IMPORTANT: Do NOT include verified transactions with accounting entries here
  if (!hasAccountingEntries && !isReconciled) {
    return 'reconciliation';
  }

  // Fallback: Should not reach here, but default to reconciliation
  return 'reconciliation';
}
```

**Critical Logic**: The key is to check `isReportingReady` FIRST before checking `isNeedsReconciliation`. This ensures that verified transactions with accounting entries go to "Reporting Ready" and NOT to "Needs Reconciliation".

---

## Special Cases

### Cash-Only Transactions
- If transaction is cash-only and verified, it may have `reconciliation.status = 'exception'` with `exceptionReason = 'cash_receipt'`
- These should be considered "Reporting Ready" (cash doesn't need bank reconciliation)
- The verification endpoint automatically sets reconciliation to 'exception' for cash-only transactions

### Bank Fees and Standalone Transactions
- Bank fees that match a rule (e.g., "bank fee" keyword) will have accounting entries
- Cash withdrawals that match a rule will have accounting entries
- These only need verification, not reconciliation
- **Once verified, they're "Reporting Ready" and should NOT appear in "Needs Reconciliation"**

### Transactions Without Rules
- Transactions that don't match any rule have empty `accounting.debits` and `accounting.credits`
- **These skip verification and go directly to "Needs Reconciliation"**
- They don't need verification because there's nothing to verify (no accounting entries to confirm)
- They need to be matched with a Purchase Receipt
- Once reconciled with a Purchase Receipt, they're "Reporting Ready"

### Transactions That Need Both Verification and Reconciliation
- Some transactions may have accounting entries but still need to be matched with a Purchase Receipt
- These will appear in "Needs Verification" first
- After verification, if they still need reconciliation, they move to "Needs Reconciliation"
- Once both steps are complete, they're "Reporting Ready"

---

## API Endpoints

### Verify Transaction
- **Endpoint**: `PATCH /authenticated/transactions2/api/transactions/[transactionId]/verify`
- **Updates**: `metadata.verification.status = 'verified'`
- **Also updates**: `details.itemList[].debitAccountConfirmed = true`
- **Note**: For transactions with accounting entries, verification is sufficient (no reconciliation needed)

### Reconcile Transaction
- **Endpoint**: `PATCH /authenticated/transactions2/api/transactions/[transactionId]`
- **Updates**: `metadata.reconciliation.status = 'matched'`
- **Links**: Transaction to a Purchase Receipt via `metadata.reconciliation.matchedBatchTransaction`

---

## Common Issues

### Issue: Verified transaction with accounting entries appears in both "Reporting Ready" and "Needs Reconciliation"

**Cause**: The `isNeedsReconciliation()` function is checking `isVerified && !isReconciled` without first checking if the transaction has accounting entries.

**Fix**: Always check `isReportingReady()` FIRST. If a transaction is verified and has accounting entries, it should be in "Reporting Ready" only, not "Needs Reconciliation".

**Correct Logic**:
```typescript
// Check Reporting Ready FIRST
if (isVerified && (hasAccountingEntries || isReconciled)) {
  return 'reporting';
}

// Then check other states
// ...
```

---

## Questions?

If you need clarification on any of these states or the data model, please reach out to the backend team.
