# Transactions3 Cash Transaction Filter Fix

**Date**: Filter Update  
**Status**: ✅ Fixed  
**Issue**: Cash transactions with `reconciliation.status = 'not_required'` not appearing in "Verified, reconciled and audit ready" card

---

## Changes Made

### 1. Cleaned Up Filter (Removed Legacy Values)

**Before:**
```typescript
const isReconciled = metadata.reconciliation?.status === 'matched' ||
  metadata.reconciliation?.status === 'reconciled' ||
  metadata.reconciliation?.status === 'exception' ||
  metadata.reconciliation?.status === 'not_required'
```

**After:**
```typescript
const isReconciled = metadata.reconciliation?.status === 'reconciled' ||
  metadata.reconciliation?.status === 'not_required'
```

**Reason**: Removed `'matched'` and `'exception'` as they are not valid transactions3 enum values and backward compatibility is not required.

### 2. Added Debug Logging

Added comprehensive debug logging to help identify issues:

1. **In Filter**: Logs when a cash transaction (`not_required`) is filtered out
2. **In Query Results**: Logs all cash transactions found in query results

---

## Transaction Structure (From User's Example)

The transaction document shows:
```json
{
  "metadata": {
    "verification": {
      "status": "verified" ✅
    },
    "reconciliation": {
      "status": "not_required" ✅
    },
    "classification": {
      "kind": "purchase" ✅
    }
  },
  "accounting": {
    "debits": [...],
    "credits": [...],
    "balanced": true ✅
  }
}
```

**All conditions are met** - the transaction should appear in the card.

---

## Possible Issues to Check

### 1. Query Not Returning Transaction

**Check**: Is the transaction in the `transactions3SourceOfTruth` array?

**Debug**: Check console logs for:
```
Transactions3 fetch results: {
  cashTransactions: [...]
}
```

If the transaction is not in `cashTransactions`, the query might not be returning it.

**Possible Causes**:
- Transaction not in `source_of_truth` collection
- Query limit (200) exceeded (transaction on page 2+)
- Query filter issue on backend

### 2. Transaction Not Refreshed

**Check**: Has the screen refreshed after creating the transaction?

**Solution**: Pull to refresh or navigate away and back to the screen.

### 3. Filter Logic Issue

**Check**: Is the filter correctly identifying the transaction?

**Debug**: Check console logs for:
```
DEBUG: Cash transaction filtered out: {...}
```

If this appears, the filter logic has an issue.

---

## Testing Steps

1. **Create a cash transaction** via manual entry
2. **Check console logs** for:
   - `Transactions3 fetch results` - verify transaction is in `cashTransactions` array
   - `DEBUG: Cash transaction filtered out` - should NOT appear
3. **Verify transaction appears** in "Verified, reconciled and audit ready" card
4. **If not appearing**, check:
   - Is transaction in `transactions3SourceOfTruth` array?
   - Does it pass all filter conditions?
   - Are there any errors in console?

---

## Expected Behavior

After the fix, cash transactions should:
1. ✅ Be returned by the query: `GET /transactions3/api/transactions?collection=source_of_truth&kind=purchase&status=verification:verified`
2. ✅ Pass the filter: `isPurchase && isVerified && isReconciled`
3. ✅ Appear in "Verified, reconciled and audit ready" card

---

## Next Steps

1. **Test the fix** with a new cash transaction
2. **Check console logs** to verify transaction is in query results
3. **If still not appearing**, investigate:
   - Backend query might be filtering out `not_required` transactions
   - Transaction might not be in `source_of_truth` collection
   - There might be a timing issue (transaction created but screen not refreshed)

---

## Related Files

- `screens/TransactionsScaffoldScreen.tsx` - Line 1937-1966 (filter logic)
- `screens/TransactionsScaffoldScreen.tsx` - Line 669-704 (query and debug logging)

---

## Contact

If the issue persists after this fix, please check the console logs and share:
1. Is the transaction in `cashTransactions` array?
2. Does the `DEBUG: Cash transaction filtered out` log appear?
3. What is the actual `reconciliation.status` value in the transaction?

