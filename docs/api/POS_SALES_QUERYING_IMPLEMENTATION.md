# POS Sales Querying - Implementation Complete

**Date**: 2025-01-XX  
**Status**: ✅ **IMPLEMENTED**

---

## Overview

The transactions3 query endpoint now supports filtering POS sales transactions by `capture.source`. This allows the frontend to fetch POS sales separately from regular sales invoices for display in the Sales section.

---

## Implementation Summary

### ✅ Backend Changes

**File**: `src/app/authenticated/transactions3/api/transactions/route.ts`

**Added**:
- Support for `source` query parameter
- Filters by `metadata.capture.source` when `source` parameter is provided
- Works in combination with existing filters (`kind`, `status`, etc.)

---

## Query Endpoint

**GET** `/authenticated/transactions3/api/transactions`

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessId` | string | Yes | Business ID |
| `collection` | string | No | `source_of_truth` (default), `pending`, or `archived` |
| `kind` | string | No | Transaction kind: `sale`, `purchase`, `statement_entry`, etc. |
| `source` | string | No | Capture source: `pos_one_off_item`, `sales_invoice_ocr`, `manual_entry`, etc. |
| `status` | string | No | Status filter: `verification:verified`, `reconciliation:pending_bank_match`, etc. |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Page size (default: 20, max: 100) |

---

## Querying POS Sales

### Get All POS Sales

To fetch only POS sales transactions:

```typescript
GET /authenticated/transactions3/api/transactions?businessId={businessId}&collection=source_of_truth&kind=sale&source=pos_one_off_item&page=1&limit=200
```

**Query Breakdown**:
- `collection=source_of_truth` - POS sales are verified and in source of truth
- `kind=sale` - Only sale transactions
- `source=pos_one_off_item` - Only POS sales (filters out invoices)

### Get Regular Sales Invoices (Exclude POS)

To fetch sales invoices (excluding POS sales):

```typescript
GET /authenticated/transactions3/api/transactions?businessId={businessId}&collection=source_of_truth&kind=sale&source=sales_invoice_ocr&page=1&limit=200
```

Or for manual sales:

```typescript
GET /authenticated/transactions3/api/transactions?businessId={businessId}&collection=source_of_truth&kind=sale&source=manual_entry&page=1&limit=200
```

### Get All Sales (POS + Invoices)

To fetch all sales (both POS and invoices):

```typescript
GET /authenticated/transactions3/api/transactions?businessId={businessId}&collection=source_of_truth&kind=sale&page=1&limit=200
```

Then filter client-side if needed, or use separate queries for each type.

---

## Example Request

### POS Sales Only

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=sale&source=pos_one_off_item&page=1&limit=200`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const posSales = data.transactions; // Already filtered for POS sales
```

### Sales Invoices Only

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=sale&source=sales_invoice_ocr&page=1&limit=200`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const salesInvoices = data.transactions; // Already filtered for OCR invoices
```

---

## Response Format

```typescript
{
  transactions: Transaction3[],
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

---

## POS Sales Transaction Structure

POS sales have these key identifiers:

```typescript
{
  id: string,
  metadata: {
    capture: {
      source: 'pos_one_off_item',  // KEY IDENTIFIER
      mechanism: 'manual',
      confidence: 1.0
    },
    classification: {
      kind: 'sale'  // KEY IDENTIFIER
    },
    verification: {
      status: 'verified',  // Always verified (auto-verified)
      method: 'automated'
    },
    reconciliation: {
      status: 'not_required' | 'pending_bank_match'  // Cash = not_required, Card = pending_bank_match
    }
  },
  summary: {
    thirdPartyName: 'POS Sale',
    totalAmount: number,
    transactionDate: number,
    currency: string,
    description: 'POS transaction - [cash|card]'
  },
  accounting: {
    credits: [{ chartName: 'Sales Revenue', ... }],
    debits: [{ chartName: 'Cash' | 'Bank', ... }]
  },
  details: {
    itemList: [
      {
        name: string,
        quantity: number,
        unitCost: number,
        amount: number
      }
    ],
    itemCount: number
  }
}
```

---

## Firestore Index Requirements

⚠️ **Important**: Queries with multiple filters (`kind` + `source`) and `orderBy` require composite indexes.

When you first run a query with both `kind` and `source` filters, Firestore may return an error with a link to create the required index automatically.

**Expected Composite Index**:

```
Collection: businesses/{businessId}/transactions3_source_of_truth
Fields:
  - metadata.classification.kind (Ascending)
  - metadata.capture.source (Ascending)
  - metadata.createdAt (Descending)
```

**Note**: Firestore will automatically prompt you to create this index when the query is first executed.

---

## Frontend Integration Pattern

### Recommended Approach: Separate Queries

Query POS sales and invoices separately for better performance and clarity:

```typescript
// Fetch POS sales
const posSalesResponse = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=sale&source=pos_one_off_item&page=1&limit=200`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const posSalesData = await posSalesResponse.json();

// Fetch sales invoices (OCR and manual)
const invoicesResponse = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=sale&source=sales_invoice_ocr&page=1&limit=200`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const invoicesData = await invoicesResponse.json();

// Display separately
// - POS Sales card
// - Sales Invoices card
```

### Alternative: Single Query with Client-Side Filtering

```typescript
// Fetch all sales
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=sale&page=1&limit=200`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const data = await response.json();

// Filter client-side
const posSales = data.transactions.filter(
  tx => tx.metadata.capture?.source === 'pos_one_off_item'
);
const salesInvoices = data.transactions.filter(
  tx => tx.metadata.capture?.source !== 'pos_one_off_item'
);
```

**Note**: The backend filtering (using `source` parameter) is recommended as it reduces payload size and improves performance.

---

## Capture Source Values

| Source Value | Description | Use Case |
|-------------|-------------|----------|
| `pos_one_off_item` | POS sale transaction | POS system sales |
| `sales_invoice_ocr` | OCR-processed invoice | Uploaded invoices (image/PDF) |
| `manual_entry` | Manually entered sale | Manual invoice creation |

---

## Testing Checklist

- [ ] Query POS sales with `source=pos_one_off_item`
- [ ] Query sales invoices with `source=sales_invoice_ocr`
- [ ] Query manual sales with `source=manual_entry`
- [ ] Query all sales without `source` parameter
- [ ] Verify pagination works with source filter
- [ ] Check Firestore index is created automatically
- [ ] Verify transactions appear in correct UI sections

---

## Performance Notes

1. **Backend Filtering**: Always use `source` parameter when possible to reduce payload size
2. **Separate Queries**: Query POS sales and invoices separately for better performance
3. **Pagination**: Use appropriate `limit` values (default 20, max 100)
4. **Indexes**: Firestore will auto-create required composite indexes on first query

---

## Related Documentation

- POS Sale Creation: `/docs/api/transactions3/POS_SALE_TRANSACTION_BACKEND_REQUIREMENTS.md`
- Sales OCR: `/docs/api/transactions3/TRANSACTIONS3_SALES_OCR_RN_INTEGRATION.md`
- Transactions3 Query Guide: `/docs/api/transactions3/TRANSACTIONS3_RN_INTEGRATION.md`

---

**Implementation Complete!** ✅

The endpoint now supports filtering POS sales by `source=pos_one_off_item`. The frontend can query POS sales separately from regular sales invoices for display in the Sales section.

