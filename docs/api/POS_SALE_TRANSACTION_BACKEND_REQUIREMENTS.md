# POS Sale Transaction API - Backend Requirements

## Overview

This document outlines the API endpoint requirements for saving Point of Sale (POS) sale transactions to Firestore. When a user completes a payment in the POS system, the frontend needs to create a sale transaction record that integrates with the existing transaction system.

## Endpoint

**POST** `/authenticated/transactions3/api/sales/pos`

## Authentication

- **Type**: Bearer Token
- **Header**: `Authorization: Bearer <token>`

## Request Format

```json
{
  "businessId": "string (required)",
  "items": [
    {
      "itemId": "string (required)",
      "name": "string (required)",
      "price": "number (required)",
      "quantity": "number (required)",
      "description": "string (optional)"
    }
  ],
  "payment": {
    "type": "cash" | "card" (required),
    "subtotal": "number (required)",
    "vat": "number (required)",
    "total": "number (required)"
  },
  "metadata": {
    "source": "pos_one_off_item",
    "createdAt": "number (timestamp, optional - backend can set)"
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `businessId` | string | Yes | Business ID for the transaction |
| `items` | array | Yes | Array of items sold in this transaction |
| `items[].itemId` | string | Yes | Unique identifier for the item (from local storage) |
| `items[].name` | string | Yes | Item name |
| `items[].price` | number | Yes | Unit price of the item |
| `items[].quantity` | number | Yes | Quantity sold |
| `items[].description` | string | No | Optional item description |
| `payment.type` | string | Yes | Payment method: "cash" or "card" |
| `payment.subtotal` | number | Yes | Subtotal before VAT |
| `payment.vat` | number | Yes | VAT amount (typically 20% of subtotal) |
| `payment.total` | number | Yes | Total amount including VAT |
| `metadata.source` | string | Yes | Should be "pos_one_off_item" to identify POS transactions |
| `metadata.createdAt` | number | No | Timestamp (backend can set if not provided) |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "transactionId": "string",
  "message": "Sale transaction created successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message",
  "errors": {
    "field": "error message"
  }
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - invalid or missing token"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden - user does not have access to this business"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Firestore Structure

The transaction should be stored in the `transactions3` collection with the following structure:

### Document Structure

```javascript
{
  id: "transaction_id",
  businessId: "business_id",
  summary: {
    transactionDate: timestamp,
    totalAmount: number,
    currency: "GBP", // or from business context
    thirdPartyName: "POS Sale", // or customer name if available
    description: "POS transaction - [payment type]"
  },
  accounting: {
    credits: [
      {
        chartName: "Sales Revenue", // or appropriate income account
        amount: number,
        isIncome: true
      }
    ],
    debits: [
      {
        chartName: payment.type === "cash" ? "Cash" : "Bank", // or appropriate account
        amount: number,
        isAsset: true
      }
    ]
  },
  details: {
    itemList: items.map(item => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    })),
    paymentBreakdown: [
      {
        type: payment.type,
        amount: payment.total
      }
    ]
  },
  metadata: {
    capture: {
      source: "pos_one_off_item",
      mechanism: "manual"
    },
    classification: {
      kind: "sale"
    },
    verification: {
      status: "verified" // POS sales are auto-verified
    },
    reconciliation: {
      status: payment.type === "cash" ? "not_required" : "pending_bank_match",
      type: payment.type === "cash" ? undefined : "bank_transfer"
    },
    pos: {
      items: items, // Store original item data
      paymentType: payment.type,
      subtotal: payment.subtotal,
      vat: payment.vat,
      total: payment.total
    }
  }
}
```

## Key Features

1. **Automatic Verification**: POS sales should be automatically marked as `verified` since they're created at the point of sale
2. **Reconciliation Status**: 
   - Cash payments: `reconciliation.status = "not_required"`
   - Card payments: `reconciliation.status = "pending_bank_match"` (needs to be matched with bank statement)
3. **Accounting Entries**: 
   - Credit to Sales Revenue (income account)
   - Debit to Cash or Bank (asset account)
4. **Transaction Classification**: Should be classified as `kind: "sale"` to appear in Sales section
5. **Integration**: Should integrate with existing transactions3 architecture and appear in the Sales pipeline

## Business Context

The endpoint should use the business context to:
- Determine the correct currency
- Set appropriate chart of accounts (Sales Revenue, Cash, Bank accounts)
- Apply business VAT rate if different from 20%

## Example Request

```json
{
  "businessId": "business_123",
  "items": [
    {
      "itemId": "oneoff_1234567890_abc123",
      "name": "Custom Widget",
      "price": 25.00,
      "quantity": 2,
      "description": "Custom made widget"
    },
    {
      "itemId": "oneoff_1234567891_def456",
      "name": "Special Item",
      "price": 15.50,
      "quantity": 1
    }
  ],
  "payment": {
    "type": "card",
    "subtotal": 65.50,
    "vat": 13.10,
    "total": 78.60
  },
  "metadata": {
    "source": "pos_one_off_item"
  }
}
```

## Example Response

```json
{
  "success": true,
  "transactionId": "tx_abc123def456",
  "message": "Sale transaction created successfully"
}
```

## Frontend Integration

The frontend will:
1. Call this endpoint when user confirms payment
2. Pass all cart items with their details
3. Include payment breakdown (subtotal, VAT, total)
4. Specify payment type (cash or card)
5. Handle success/error responses appropriately
6. Clear the cart on successful transaction creation
7. Optionally navigate to transaction detail screen or show success message

## Notes

- The transaction should appear in the Sales section of the TransactionsScaffoldScreen
- Card payments will need to be reconciled with bank statements later
- Cash payments are immediately reporting-ready
- The transaction should be queryable using existing transactions3 filters (e.g., `kind: "sale"`)
- Consider adding a timestamp for when the sale occurred (may differ from transaction creation time)

