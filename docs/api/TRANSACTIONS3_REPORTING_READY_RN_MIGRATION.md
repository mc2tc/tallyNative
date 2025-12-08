# Transactions3 Reporting Ready Screen Migration - RN Note

## Overview

When migrating the "Reporting Ready" screen from transactions2 to transactions3, you can **simplify the implementation** by removing client-side filtering. This is because the `source_of_truth` collection only contains transactions that are already reporting ready.

## Key Simplification

**No client-side filtering needed** when querying `source_of_truth` collection.

### Why?

The `source_of_truth` collection (`transactions3`) only contains:
- ✅ Verified transactions (`verification.status = 'verified'`)
- ✅ Transactions with complete accounting entries
- ✅ Transactions that are reconciled or don't require reconciliation

**All transactions in `source_of_truth` are by definition reporting ready.**

## Implementation

### Endpoint

```
GET /authenticated/transactions3/api/transactions
```

### Query Parameters

- `businessId` (required) - Business ID
- `collection=source_of_truth` (optional, this is the default)
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Page size (default: 20, max: 100)

**Note:** You don't need to pass `collection=source_of_truth` explicitly since it's the default, but it's fine to include it for clarity.

### Example Request

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();

// ✅ All transactions in data.transactions are reporting ready
// No client-side filtering needed!
const reportingReadyTransactions = data.transactions;
```

### Response Structure

```typescript
{
  transactions: Transaction3[],  // All are reporting ready
  pagination: {
    page: number,
    limit: number,
    totalCount: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean
  }
}
```

## What Changed from transactions2?

### Old Approach (transactions2)
- Query all transactions
- Filter client-side for reporting ready (checking for accounting entries)

### New Approach (transactions3)
- Query `source_of_truth` collection
- **No filtering needed** - all results are reporting ready

## Collection Architecture

Transactions3 uses three collections:

1. **`transactions3_pending`** - Unverified transactions (from OCR, bank uploads)
2. **`transactions3`** (source_of_truth) - Verified transactions with accounting entries ✅ **Use this for Reporting Ready**
3. **`transactions3_archived`** - Bank records archived after reconciliation

Transactions move from `pending` → `source_of_truth` when verified, so `source_of_truth` is guaranteed to contain only reporting-ready transactions.

## Migration Checklist

- [ ] Update endpoint from transactions2 to `/authenticated/transactions3/api/transactions`
- [ ] Use `collection=source_of_truth` (or omit since it's default)
- [ ] Remove client-side filtering logic for reporting ready
- [ ] Update TypeScript types to use `Transaction3` instead of `Transaction`
- [ ] Test that all returned transactions have accounting entries

## Questions?

If you need to filter by additional criteria (e.g., date range, transaction kind), you can:
- Use query parameters: `kind=purchase` or `status=reconciliation:reconciled`
- Or filter client-side for business logic (e.g., date ranges, specific accounts)

But for "reporting ready" status, no filtering is needed when using `source_of_truth` collection.

