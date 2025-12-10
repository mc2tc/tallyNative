# POS Sales Querying - Backend Requirements

## Overview

This document outlines the backend API requirements for querying Point of Sale (POS) sales transactions in the Sales section of the TransactionsScaffoldScreen. POS sales need to be fetched separately from regular sales invoices because they are stored in the `transactions3` collection and have different characteristics.

**Status**: ✅ **IMPLEMENTED** - The backend now supports the `source` query parameter. See `POS_SALES_QUERYING_IMPLEMENTATION.md` for implementation details.

## Context

POS sales are created via the `/authenticated/transactions3/api/sales/pos` endpoint and are stored in the `transactions3` collection. They are automatically verified and audit-ready, making them distinct from regular sales invoices that require verification and reconciliation.

## Query Requirements

### Endpoint

**GET** `/authenticated/transactions3/api/transactions/{businessId}/source_of_truth`

### Query Parameters

When fetching POS sales for the Sales section, the frontend will call:

```
GET /authenticated/transactions3/api/transactions/{businessId}/source_of_truth?kind=sale&page=1&limit=200
```

### Backend Filtering Requirements

The backend should filter transactions to return **only POS sales** when the following conditions are met:

1. **Collection**: `source_of_truth` (POS sales are automatically verified and audit-ready)
2. **Kind**: `sale` (`metadata.classification.kind === 'sale'`)
3. **Source**: `pos_one_off_item` (`metadata.capture.source === 'pos_one_off_item'`)

### Expected Response

The backend should return only transactions that match:
- `metadata.classification.kind === 'sale'`
- `metadata.capture.source === 'pos_one_off_item'`
- Located in `source_of_truth` collection (automatically verified)

### Transaction Structure

POS sales have the following key characteristics:

```javascript
{
  id: "transaction_id",
  businessId: "business_id",
  summary: {
    transactionDate: timestamp,
    totalAmount: number,
    currency: "GBP",
    thirdPartyName: "POS Sale",
    description: "POS transaction - [cash|card]"
  },
  metadata: {
    capture: {
      source: "pos_one_off_item",  // KEY IDENTIFIER
      mechanism: "manual",
      confidence: 1,
      processedAt: timestamp
    },
    classification: {
      kind: "sale",  // KEY IDENTIFIER
      confidence: 1,
      needsReview: false
    },
    verification: {
      status: "verified",  // POS sales are auto-verified
      method: "automated",
      verifiedAt: timestamp,
      verifiedBy: "user_id"
    },
    reconciliation: {
      status: "not_required" | "pending_bank_match",  // Cash = not_required, Card = pending_bank_match
      reference: "POS-{timestamp}"
    },
    auditTrail: [
      {
        action: "created",
        source: "pos_one_off_item",
        timestamp: timestamp
      },
      {
        action: "verified",
        timestamp: timestamp
      }
    ]
  },
  accounting: {
    credits: [
      {
        chartName: "Sales Revenue",
        amount: number,
        isIncome: true
      },
      {
        chartName: "VAT Output Tax",
        amount: number,
        isLiability: true
      }
    ],
    debits: [
      {
        chartName: "Cash" | "Bank",  // Based on payment type
        amount: number,
        isAsset: true
      }
    ],
    paymentBreakdown: [
      {
        type: "cash" | "card",
        amount: number,
        userConfirmed: true
      }
    ]
  },
  details: {
    itemList: [
      {
        name: string,
        quantity: number,
        unitCost: number,
        amount: number,
        category: "Revenue",
        debitAccount: "Sales Revenue",
        vatStatus: "vat_excluded"
      }
    ],
    itemCount: number,
    groupedItemsByChartAccount: {
      "Sales Revenue": number
    }
  }
}
```

## Frontend Integration

The frontend will:

1. Call the transactions3 API with `kind=sale` filter
2. Expect the backend to filter for `source === 'pos_one_off_item'`
3. Display POS sales in a separate "POS Sales" card below the "Audit Ready" separator
4. Display regular sales invoices in a "Sales Invoices" card (also below "Audit Ready")

### Frontend Fallback

As a defensive measure, the frontend will also filter client-side:

```typescript
const posSales = (response.transactions || []).filter(tx => 
  tx.metadata.capture?.source === 'pos_one_off_item' && 
  tx.metadata.classification?.kind === 'sale'
)
```

However, **the backend should perform this filtering** to reduce payload size and improve performance.

## Performance Considerations

- POS sales queries should be optimized since they're fetched every time the Sales section is viewed
- Consider adding a dedicated query parameter or endpoint if filtering becomes complex
- Cache results if appropriate (POS sales are audit-ready and don't change frequently)

## Example Request

```
GET /authenticated/transactions3/api/transactions/PastyExpress_5url2n/source_of_truth?kind=sale&page=1&limit=200
Authorization: Bearer <token>
```

## Example Response

```json
{
  "transactions": [
    {
      "id": "tx_abc123",
      "businessId": "PastyExpress_5url2n",
      "summary": {
        "transactionDate": 1765310358683,
        "totalAmount": 10.8,
        "currency": "GBP",
        "thirdPartyName": "POS Sale",
        "description": "POS transaction - cash"
      },
      "metadata": {
        "capture": {
          "source": "pos_one_off_item",
          "mechanism": "manual"
        },
        "classification": {
          "kind": "sale"
        },
        "verification": {
          "status": "verified"
        },
        "reconciliation": {
          "status": "not_required"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 200
}
```

## Notes

- POS sales are always audit-ready (in `source_of_truth` collection)
- They are automatically verified upon creation
- Cash payments have `reconciliation.status = 'not_required'`
- Card payments have `reconciliation.status = 'pending_bank_match'` (need bank reconciliation)
- The frontend displays POS sales separately from regular sales invoices for clarity
- Both POS Sales and Sales Invoices appear below the "Audit Ready" separator in the UI

