# Transactions3 Manual Entry - Missing createdAt Field in Index

**Date**: Issue Report  
**Status**: 🔴 Needs Backend Fix  
**Priority**: High

---

## Issue Summary

Manual purchase entries are not appearing in the "Verified, reconciled and audit ready" card because the Firestore index requires `metadata.createdAt`, but manual transactions don't have this field set.

---

## Root Cause

The Firestore composite index for querying transactions likely includes `metadata.createdAt` as a required field:

```
Collection: transactions3
Index Fields:
  - classification.kind
  - metadata.reconciliation.status
  - metadata.createdAt  ← Required by index but missing in manual entries
```

**Manual transactions** created via `/authenticated/transactions3/api/purchases/manual` don't set `metadata.createdAt`, so they don't match the index and queries return 0 results.

---

## Expected Behavior

Manual transactions should have `metadata.createdAt` set when created, matching the structure of OCR transactions.

---

## Current Transaction Structure (Manual Entry)

```json
{
  "metadata": {
    "auditTrail": [
      {
        "action": "created",
        "timestamp": 1764951644839,
        "performedBy": "user_id",
        "source": "manual_entry"
      }
    ],
    "createdBy": "user_id",
    "reconciliation": {
      "status": "not_required"
    },
    "verification": {
      "status": "verified"
    }
    // ❌ Missing: "createdAt": 1764951644839
  }
}
```

---

## Expected Transaction Structure

```json
{
  "metadata": {
    "createdAt": 1764951644839,  // ✅ Should be set
    "updatedAt": 1764951644839,  // ✅ Should be set
    "auditTrail": [...],
    "createdBy": "user_id",
    "reconciliation": {
      "status": "not_required"
    },
    "verification": {
      "status": "verified"
    }
  }
}
```

---

## Backend Fix Required

### Option 1: Set createdAt/updatedAt in Manual Entry Endpoint

When creating a manual transaction, set:
```typescript
metadata.createdAt = Date.now() // or timestamp from transactionDate
metadata.updatedAt = Date.now()
```

### Option 2: Update Index to Not Require createdAt

If `createdAt` isn't needed for the query logic, update the Firestore index to exclude it:
- Remove `metadata.createdAt` from the composite index
- Keep only: `classification.kind` + `metadata.reconciliation.status`

**Note**: This might affect sorting if queries are sorted by `createdAt` on the server.

---

## Query That's Failing

The query for cash transactions (not_required):
```
GET /authenticated/transactions3/api/transactions?
  collection=source_of_truth&
  kind=purchase&
  status=reconciliation:not_required
```

**Backend Implementation**: This likely translates to a Firestore query like:
```typescript
collection('transactions3')
  .where('classification.kind', '==', 'purchase')
  .where('metadata.reconciliation.status', '==', 'not_required')
  .orderBy('metadata.createdAt', 'desc')  // ← Requires createdAt in index
```

If `orderBy('metadata.createdAt')` is used, the index **must** include `metadata.createdAt`.

---

## Recommended Solution

**Set `createdAt` and `updatedAt` in manual entry endpoint**:

```typescript
// In manual entry endpoint
const now = Date.now()
const transactionDate = parseTransactionDate(transactionData.transactionDate)

metadata.createdAt = transactionDate || now
metadata.updatedAt = now
```

This ensures:
1. ✅ Manual transactions match the Firestore index
2. ✅ Consistent structure with OCR transactions
3. ✅ Proper sorting by creation date
4. ✅ Queries return manual transactions

---

## Testing

After fix, verify:

1. **Create manual entry with cash payment**
2. **Check transaction in Firestore**:
   - Verify `metadata.createdAt` exists
   - Verify `metadata.updatedAt` exists
3. **Query returns transaction**:
   - `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=reconciliation:not_required`
   - Transaction should be in results
4. **Transaction appears in card**:
   - "Verified, reconciled and audit ready" card should show the transaction

---

## Related Documentation

- [Transactions3 Audit Ready Card Conditions](./TRANSACTIONS3_AUDIT_READY_CARD_CONDITIONS.md)
- [Transactions3 Firestore Indexes Required](./TRANSACTIONS3_FIRESTORE_INDEXES_REQUIRED.md)
- [Transactions3 Purchases Manual Entry API](./TRANSACTIONS3_PURCHASES_MANUAL_ENTRY.md)

---

## Questions for Backend Team

1. Does the Firestore index include `metadata.createdAt`?
2. Is server-side sorting by `createdAt` required?
3. Should `createdAt` use `transactionDate` or current timestamp?
4. Should `updatedAt` be set to the same value on creation?

---

## Contact

If you need more information or have questions, please reach out to the frontend team.

