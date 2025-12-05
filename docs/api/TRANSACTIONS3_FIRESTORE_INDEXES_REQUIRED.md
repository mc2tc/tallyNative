# Transactions3 Firestore Indexes Required

**Date**: Index Requirements Documentation  
**Issue**: Queries returning 0 results without errors - likely missing composite indexes

---

## Problem

When querying Firestore with multiple filters (e.g., `kind=purchase` AND `status=reconciliation:not_required`), Firestore requires **composite indexes**. If an index doesn't exist, the query may:
- Return 0 results silently
- Not show an error in the console
- Appear to work but return empty arrays

---

## Required Indexes for "Verified, reconciled and audit ready" Card

The following queries are made to populate the card. Each requires a composite index:

### Query 1: Pending Unverified Purchases
```
Collection: transactions3_pending
Filters:
  - kind = 'purchase'
  - verification.status = 'unverified'
```
**Index Required**: `transactions3_pending` collection
- Fields: `classification.kind` (Ascending), `metadata.verification.status` (Ascending)

### Query 2: Bank Reconciliation Needed
```
Collection: transactions3 (source_of_truth)
Filters:
  - kind = 'purchase'
  - reconciliation.status = 'pending_bank_match'
```
**Index Required**: `transactions3` collection
- Fields: `classification.kind` (Ascending), `metadata.reconciliation.status` (Ascending)

### Query 3: All Verified Purchases
```
Collection: transactions3 (source_of_truth)
Filters:
  - kind = 'purchase'
  - verification.status = 'verified'
```
**Index Required**: `transactions3` collection
- Fields: `classification.kind` (Ascending), `metadata.verification.status` (Ascending)

### Query 4: Reconciled Purchases ⚠️ **LIKELY MISSING**
```
Collection: transactions3 (source_of_truth)
Filters:
  - kind = 'purchase'
  - reconciliation.status = 'reconciled'
```
**Index Required**: `transactions3` collection
- Fields: `classification.kind` (Ascending), `metadata.reconciliation.status` (Ascending)

### Query 5: Not Required Purchases (Cash Transactions) ⚠️ **LIKELY MISSING**
```
Collection: transactions3 (source_of_truth)
Filters:
  - kind = 'purchase'
  - reconciliation.status = 'not_required'
```
**Index Required**: `transactions3` collection
- Fields: `classification.kind` (Ascending), `metadata.reconciliation.status` (Ascending)

---

## How to Check for Missing Indexes

### Method 1: Check Firestore Console

1. Go to Firebase Console → Firestore Database → Indexes
2. Look for indexes on `transactions3` collection
3. Check if there's an index with:
   - `classification.kind` (or `metadata.classification.kind`)
   - `metadata.reconciliation.status`

### Method 2: Check Browser Console

When a query fails due to missing index, Firestore usually logs a link to create the index:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

**Note**: This link might not always appear, especially in React Native.

### Method 3: Check Query Results

If queries return 0 results but you know transactions exist:
- Check if transactions are in the collection (Firestore Console)
- Check if transactions have the correct field values
- **Most likely cause**: Missing composite index

---

## Creating the Indexes

### Option 1: Use Firebase Console Link

If Firestore provides a link in the error message, click it to create the index automatically.

### Option 2: Create Manually in Firebase Console

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Select collection: `transactions3`
4. Add fields:
   - Field: `classification.kind` (or `metadata.classification.kind`)
     - Order: Ascending
   - Field: `metadata.reconciliation.status`
     - Order: Ascending
5. Click "Create"

**Repeat for each status value**:
- `reconciliation.status = 'reconciled'`
- `reconciliation.status = 'not_required'`
- `reconciliation.status = 'pending_bank_match'`

### Option 3: Use firestore.indexes.json

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "transactions3",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "classification.kind",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "metadata.reconciliation.status",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "transactions3",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "classification.kind",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "metadata.verification.status",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "transactions3_pending",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "classification.kind",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "metadata.verification.status",
          "order": "ASCENDING"
        }
      ]
    }
  ]
}
```

Then deploy: `firebase deploy --only firestore:indexes`

---

## Field Path Variations

Firestore field paths might vary depending on how data is stored:

**Option A**: Nested in metadata
```
metadata.classification.kind
metadata.reconciliation.status
metadata.verification.status
```

**Option B**: Top-level fields
```
classification.kind
reconciliation.status
verification.status
```

**Check your actual data structure** in Firestore Console to determine the correct field paths.

---

## Testing After Creating Indexes

1. **Wait for index to build** (can take a few minutes)
2. **Refresh the app** (or navigate away and back)
3. **Check console logs**:
   ```
   Transactions3 fetch results: {
     notRequired: 1,  // Should be > 0 if cash transaction exists
     reconciled: X,
     ...
   }
   ```
4. **Verify transaction appears** in "Verified, reconciled and audit ready" card

---

## Common Issues

### Issue 1: Index Still Building
- **Symptom**: Query returns 0 results even after creating index
- **Solution**: Wait 2-5 minutes for index to build, then refresh

### Issue 2: Wrong Field Paths
- **Symptom**: Index created but queries still return 0 results
- **Solution**: Check actual field paths in Firestore Console and update index

### Issue 3: Multiple Collections
- **Symptom**: Index works for one collection but not another
- **Solution**: Create separate indexes for `transactions3` and `transactions3_pending`

---

## Related Documentation

- [Transactions3 Audit Ready Card Conditions](./TRANSACTIONS3_AUDIT_READY_CARD_CONDITIONS.md)
- [Transactions3 RN Integration Guide](./TRANSACTIONS3_RN_INTEGRATION.md)

---

## Next Steps

1. **Backend Team**: Verify which field paths are used in Firestore
2. **Backend Team**: Create required composite indexes
3. **Frontend Team**: Test queries after indexes are created
4. **Both Teams**: Verify cash transactions appear in card

---

## Contact

If indexes are created but queries still return 0 results, check:
1. Field paths match actual data structure
2. Index has finished building (check Firebase Console)
3. Collection names are correct (`transactions3` vs `transactions3_pending`)

