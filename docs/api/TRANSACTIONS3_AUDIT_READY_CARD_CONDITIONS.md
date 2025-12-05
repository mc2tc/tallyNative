# Transactions3 "Verified, reconciled and audit ready" Card - Exact Conditions

**Date**: Conditions Documentation  
**Card**: "Verified, reconciled and audit ready" (Purchases3 section)

---

## Exact Filter Conditions

A transaction appears in the "Verified, reconciled and audit ready" card if **ALL** of the following conditions are met:

### Condition 1: Transaction Type
```typescript
metadata.classification?.kind === 'purchase'
```
- **Required**: Transaction must be a purchase transaction
- **Location**: `metadata.classification.kind`

### Condition 2: Verification Status
```typescript
metadata.verification?.status === 'verified' || 
metadata.verification?.status === 'exception'
```
- **Required**: Transaction must be verified OR have exception status
- **Location**: `metadata.verification.status`
- **Valid values**: `'verified'` OR `'exception'`

### Condition 3: Reconciliation Status
```typescript
metadata.reconciliation?.status === 'reconciled' ||
metadata.reconciliation?.status === 'not_required'
```
- **Required**: Transaction must be reconciled OR reconciliation not required
- **Location**: `metadata.reconciliation.status`
- **Valid values**: `'reconciled'` OR `'not_required'`

---

## Complete Filter Logic

```typescript
const isPurchase = metadata.classification?.kind === 'purchase'
const isVerified = metadata.verification?.status === 'verified' || 
                   metadata.verification?.status === 'exception'
const isReconciled = metadata.reconciliation?.status === 'reconciled' ||
                     metadata.reconciliation?.status === 'not_required'

return isPurchase && isVerified && isReconciled
```

**All three conditions must be true** for the transaction to appear in the card.

---

## Data Source

The filter operates on the `transactions3SourceOfTruth` array, which is populated by:

1. **Query 1**: `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=reconciliation:pending_bank_match`
2. **Query 2**: `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=verification:verified`
3. **Query 3**: `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=reconciliation:reconciled`
4. **Query 4**: `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=reconciliation:not_required`

All results are combined and deduplicated.

**Important**: If a transaction is not returned by any of these queries, it will **not** appear in the card, even if it meets the filter conditions.

### ⚠️ Firestore Index Requirement

**Queries 3 and 4 require composite indexes** in Firestore. If indexes are missing:
- Queries may return 0 results **without errors**
- Transactions won't appear even if they exist and meet all conditions

**Required Indexes**:
- `transactions3` collection: `classification.kind` + `metadata.reconciliation.status`
- For cash transactions: Index must support `kind='purchase'` + `reconciliation.status='not_required'`

See [TRANSACTIONS3_FIRESTORE_INDEXES_REQUIRED.md](./TRANSACTIONS3_FIRESTORE_INDEXES_REQUIRED.md) for details.

---

## Example: Valid Transaction

```json
{
  "id": "tx_abc123",
  "metadata": {
    "classification": {
      "kind": "purchase"  // ✅ Condition 1: Purchase transaction
    },
    "verification": {
      "status": "verified"  // ✅ Condition 2: Verified
    },
    "reconciliation": {
      "status": "not_required"  // ✅ Condition 3: Not required (cash transaction)
    }
  }
}
```

**Result**: ✅ Appears in card (all 3 conditions met)

---

## Example: Invalid Transaction (Missing Verification)

```json
{
  "id": "tx_abc123",
  "metadata": {
    "classification": {
      "kind": "purchase"  // ✅ Condition 1: Purchase transaction
    },
    "verification": {
      "status": "unverified"  // ❌ Condition 2: NOT verified
    },
    "reconciliation": {
      "status": "not_required"  // ✅ Condition 3: Not required
    }
  }
}
```

**Result**: ❌ Does NOT appear in card (condition 2 failed)

---

## Example: Invalid Transaction (Wrong Reconciliation Status)

```json
{
  "id": "tx_abc123",
  "metadata": {
    "classification": {
      "kind": "purchase"  // ✅ Condition 1: Purchase transaction
    },
    "verification": {
      "status": "verified"  // ✅ Condition 2: Verified
    },
    "reconciliation": {
      "status": "pending_bank_match"  // ❌ Condition 3: NOT reconciled/not_required
    }
  }
}
```

**Result**: ❌ Does NOT appear in card (condition 3 failed - needs reconciliation)

---

## Common Scenarios

### Cash Transaction (Manual Entry)
- `classification.kind = 'purchase'` ✅
- `verification.status = 'verified'` ✅ (set immediately for manual entries)
- `reconciliation.status = 'not_required'` ✅ (should be set by backend)
- **Result**: ✅ Appears in card

### Reconciled Bank Transaction
- `classification.kind = 'purchase'` ✅
- `verification.status = 'verified'` ✅
- `reconciliation.status = 'reconciled'` ✅ (after bank reconciliation)
- **Result**: ✅ Appears in card

### Pending Reconciliation
- `classification.kind = 'purchase'` ✅
- `verification.status = 'verified'` ✅
- `reconciliation.status = 'pending_bank_match'` ❌
- **Result**: ❌ Does NOT appear (appears in "Reconcile to bank" or "Reconcile to Credit Card" card instead)

### Unverified Transaction
- `classification.kind = 'purchase'` ✅
- `verification.status = 'unverified'` ❌
- `reconciliation.status = 'not_required'` ✅
- **Result**: ❌ Does NOT appear (appears in "Needs verification" card instead)

---

## Additional Processing

After filtering, transactions are:

1. **Parsed**: Converted to `TransactionStub` format via `parseTransaction3()`
2. **Filtered**: Null results from parsing are removed
3. **Sorted**: By `updatedAt` or `createdAt` (newest first)
4. **Limited**: Only top 3 transactions shown (`.slice(0, 3)`)

---

## Debugging

If a transaction doesn't appear, check:

1. **Does transaction have `metadata.createdAt`?** ⚠️ **MOST COMMON ISSUE FOR MANUAL ENTRIES**
   - Manual transactions must have `metadata.createdAt` set
   - If missing, Firestore index won't match and query returns 0 results
   - Check transaction in Firestore Console
   - See [TRANSACTIONS3_MANUAL_ENTRY_CREATEDAT_ISSUE.md](./TRANSACTIONS3_MANUAL_ENTRY_CREATEDAT_ISSUE.md)

2. **Are Firestore indexes created?** ⚠️ **COMMON ISSUE**
   - Check Firebase Console → Firestore → Indexes
   - Verify index exists for: `classification.kind` + `metadata.reconciliation.status` (+ `metadata.createdAt` if sorting)
   - If missing, queries return 0 results silently
   - See [TRANSACTIONS3_FIRESTORE_INDEXES_REQUIRED.md](./TRANSACTIONS3_FIRESTORE_INDEXES_REQUIRED.md)

2. **Is it in `transactions3SourceOfTruth` array?**
   - Check console logs: `Transactions3 fetch results`
   - Look for: `notRequired: 0` (should be > 0 if cash transaction exists)
   - Verify transaction is returned by one of the 4 queries

3. **Does it meet all 3 conditions?**
   - Check console logs: `DEBUG: Cash transaction filtered out` (if applicable)
   - Verify: `classification.kind === 'purchase'`
   - Verify: `verification.status === 'verified'` or `'exception'`
   - Verify: `reconciliation.status === 'reconciled'` or `'not_required'`

4. **Is it being filtered out by parsing?**
   - Check if `parseTransaction3()` returns null
   - Verify transaction has required fields: `id`, `summary.thirdPartyName`, `summary.totalAmount`, `summary.currency`

---

## Code Location

**File**: `screens/TransactionsScaffoldScreen.tsx`  
**Lines**: 1973-2016

---

## Related Documentation

- [Transactions3 Cash Reconciliation Status Response](./TRANSACTIONS3_CASH_RECONCILIATION_STATUS_RESPONSE.md)
- [Transactions3 Cash Filter Fix](./TRANSACTIONS3_CASH_FILTER_FIX.md)

