# React Native Transactions2 Integration Guide

## Overview

The transactions2 system now uses a **unified endpoint** that accepts explicit transaction type and input method from the frontend. This eliminates the need for backend classification logic.

## Endpoint

**POST** `/authenticated/transactions2/api/transactions`

**Base URL:** Your backend API URL (e.g., `https://your-api.com`)

## Request Format

```typescript
{
  businessId: string;                    // Required
  transactionType: string;               // Required - see types below
  inputMethod: string;                    // Required - see methods below
  fileUrl?: string;                       // Required for OCR methods
  transactionData?: any;                  // Required for manual entry
  captureSource?: string;                  // Optional - auto-derived if omitted
  captureMechanism?: string;              // Optional - auto-derived if omitted
}
```

## Transaction Types

| Type | Description | Supported Input Methods |
|------|-------------|------------------------|
| `purchase` | Purchase receipts/invoices | `ocr_image` ✅, `ocr_pdf` ⏳, `manual` ⏳ |
| `sale` | Sales invoices | `ocr_pdf` ⏳, `manual` ⏳ |
| `bank_transaction` | Bank statement transactions | `ocr_pdf` ⏳ |
| `credit_card_transaction` | Credit card statement transactions | `ocr_pdf` ⏳ |
| `internal` | Internal/adjustment transactions | `manual` ⏳ |

Legend:
- ✅ = **Currently implemented and working**
- ⏳ = **Logged but not yet implemented** (returns 501)

## Input Methods

| Method | Description | Requires |
|--------|-------------|----------|
| `ocr_image` | OCR processing of image file | `fileUrl` |
| `ocr_pdf` | OCR processing of PDF file | `fileUrl` |
| `manual` | Manual transaction entry | `transactionData` |

## Currently Implemented

### ✅ Purchase/Image OCR

**Request Example:**
```json
{
  "businessId": "business123",
  "transactionType": "purchase",
  "inputMethod": "ocr_image",
  "fileUrl": "https://storage.googleapis.com/your-bucket/receipt.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "transactionId": "tx_abc123",
  "transaction": {
    "metadata": { ... },
    "summary": { ... },
    "accounting": { ... },
    "details": { ... }
  }
}
```

## Not Yet Implemented

All other transaction type/input method combinations are **logged** but return a `501 Not Implemented` response.

**Request Example (Not Implemented):**
```json
{
  "businessId": "business123",
  "transactionType": "sale",
  "inputMethod": "ocr_pdf",
  "fileUrl": "https://storage.googleapis.com/your-bucket/invoice.pdf"
}
```

**Response (501):**
```json
{
  "success": false,
  "message": "Transaction type 'sale' with input method 'ocr_pdf' is not yet implemented",
  "transactionType": "sale",
  "inputMethod": "ocr_pdf",
  "captureMetadata": {
    "source": "sales_invoice_ocr",
    "mechanism": "ocr"
  },
  "transactionKind": "sale",
  "logged": true,
  "logId": "2025-01-XX..."
}
```

**What happens:**
- Request details are logged to server console
- You can check logs using the `logId` timestamp
- Implementation will be added incrementally

## Capture Metadata (Optional)

If you don't provide `captureSource` and `captureMechanism`, they are automatically derived:

| Transaction Type | Input Method | Auto-Derived Source | Auto-Derived Mechanism |
|------------------|--------------|---------------------|------------------------|
| purchase | ocr_image | purchase_invoice_ocr | ocr |
| purchase | ocr_pdf | purchase_invoice_ocr | ocr |
| purchase | manual | manual_entry | manual |
| sale | ocr_pdf | sales_invoice_ocr | ocr |
| sale | manual | manual_entry | manual |
| bank_transaction | ocr_pdf | bank_statement_ocr | batch |
| credit_card_transaction | ocr_pdf | credit_card_statement_ocr | batch |
| internal | manual | manual_entry | manual |

**You can override these if needed:**
```json
{
  "businessId": "business123",
  "transactionType": "purchase",
  "inputMethod": "ocr_image",
  "fileUrl": "...",
  "captureSource": "purchase_invoice_ocr",
  "captureMechanism": "ocr"
}
```

## Authentication

Include authentication token in headers:

```typescript
const token = await getAuthToken(); // Your auth method

const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/transactions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    businessId: 'business123',
    transactionType: 'purchase',
    inputMethod: 'ocr_image',
    fileUrl: 'https://...'
  })
});
```

## Error Handling

### 400 Bad Request
Invalid request body or missing required fields.

```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["transactionType"],
      "message": "Required"
    }
  ]
}
```

### 401 Unauthorized
Authentication failed. Check your auth token.

### 403 Forbidden
User doesn't have access to the specified business.

### 404 Not Found
Business not found.

### 500 Internal Server Error
Server error during processing.

### 501 Not Implemented
Transaction type/input method combination not yet implemented (but logged for future implementation).

## Migration Notes

### If you were using `/receipts` endpoint:

**Old:**
```json
POST /authenticated/transactions2/api/receipts
{
  "imageUrl": "...",
  "businessId": "..."
}
```

**New:**
```json
POST /authenticated/transactions2/api/transactions
{
  "businessId": "...",
  "transactionType": "purchase",
  "inputMethod": "ocr_image",
  "fileUrl": "..."
}
```

The `/receipts` endpoint still works for backward compatibility, but the unified endpoint is preferred.

## Implementation Roadmap

The backend will implement transaction types incrementally. Check server logs or contact backend team to see when your needed transaction type is available.

**Priority order (subject to change):**
1. ✅ Purchase/Image OCR - **DONE**
2. ⏳ Purchase/PDF OCR - Next
3. ⏳ Purchase/Manual - Next
4. ⏳ Sale/PDF OCR
5. ⏳ Sale/Manual
6. ⏳ Bank Transactions/PDF
7. ⏳ Credit Card/PDF
8. ⏳ Internal/Manual

## Testing

### Test Purchase/Image (Working)
```typescript
const testPurchaseImage = async () => {
  const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      businessId: 'test-business-id',
      transactionType: 'purchase',
      inputMethod: 'ocr_image',
      fileUrl: 'https://example.com/receipt.jpg'
    })
  });
  
  if (response.status === 200) {
    const data = await response.json();
    console.log('Transaction created:', data.transactionId);
  }
};
```

### Test Unimplemented Type (Returns 501)
```typescript
const testSalePDF = async () => {
  const response = await fetch(`${API_BASE_URL}/authenticated/transactions2/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      businessId: 'test-business-id',
      transactionType: 'sale',
      inputMethod: 'ocr_pdf',
      fileUrl: 'https://example.com/invoice.pdf'
    })
  });
  
  if (response.status === 501) {
    const data = await response.json();
    console.log('Not implemented yet:', data.message);
    console.log('Logged with ID:', data.logId);
  }
};
```

## Questions?

- Check server logs using the `logId` from 501 responses
- Contact backend team for implementation status
- See `docs/accounting/TRANSACTIONS2_UNIFIED_ENDPOINT.md` for detailed API docs

