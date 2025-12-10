# Transactions3 Sales Invoice OCR - RN Integration Guide

**Date**: 2025-01-XX  
**Status**: ✅ **READY FOR INTEGRATION**

---

## Overview

The sales invoice OCR endpoint is now available for creating sales transactions (invoices) from uploaded images and PDFs. This endpoint processes invoices using OCR and automatically creates verified transactions.

---

## Endpoint Details

### Endpoint

**POST** `/authenticated/transactions3/api/sales/ocr`

### Authentication

Requires Bearer token in Authorization header (same as other authenticated endpoints).

---

## Request Format

```typescript
{
  businessId: string,
  fileUrl?: string,    // For image uploads (JPG, PNG, etc.)
  pdfUrl?: string      // For PDF uploads (text-based or scanned)
}
```

**Notes**:
- You must provide **either** `fileUrl` OR `pdfUrl` (not both)
- `fileUrl`: Use for regular image files (JPG, PNG, etc.)
- `pdfUrl`: Use for PDF files (handles both text-based and scanned/image-based PDFs)
- The endpoint automatically detects and handles PDF type (text extraction or image OCR)

---

## Response Format

### Success Response (200)

```typescript
{
  success: true,
  transactionId: string,
  transaction: Transaction3  // Full transaction object
}
```

### Error Responses

**400 Bad Request**
```typescript
{
  error: "Business ID is required" | "Either fileUrl (image) or pdfUrl is required"
}
```

**401 Unauthorized**
```typescript
{
  error: "Unauthorized"
}
```

**403 Forbidden**
```typescript
{
  error: "Access denied"
}
```

**404 Not Found**
```typescript
{
  error: "Business not found"
}
```

**500 Internal Server Error**
```typescript
{
  error: string,
  requestId: string  // For debugging/logging
}
```

---

## Key Features

### ✅ Automatic Verification

Unlike purchase receipts, **sales invoices are automatically verified** upon creation. They are saved directly to the `source_of_truth` collection with `verification.status: 'verified'`.

### ✅ Supports Multiple File Types

- **Images**: JPG, PNG, etc. (via `fileUrl`)
- **PDF Text**: Text-based PDFs (extracts text directly)
- **PDF Images**: Scanned/image-based PDFs (uses OCR on first page)

### ✅ Full Invoice Extraction

The endpoint extracts:
- Customer name
- Invoice number
- Invoice date
- Payment terms
- All line items (description, amount, service date)
- Subtotal, tax, and total due
- Currency

### ✅ Items Array

All invoice line items are stored in the transaction's `details.itemList` array for full visibility.

---

## Example Integration

### TypeScript Example

```typescript
async function uploadSalesInvoice(
  businessId: string,
  fileUrl: string,
  pdfUrl?: string
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/sales/ocr`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          businessId,
          ...(fileUrl ? { fileUrl } : {}),
          ...(pdfUrl ? { pdfUrl } : {}),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload invoice');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Invoice upload failed:', error);
    throw error;
  }
}
```

### React Native Example

```typescript
import * as ImagePicker from 'expo-image-picker';

// Upload from image picker
const handleImageUpload = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const imageUri = result.assets[0].uri;
    
    // Upload image to your storage (e.g., Firebase Storage, S3)
    const fileUrl = await uploadToStorage(imageUri);
    
    // Process invoice via OCR
    const transaction = await uploadSalesInvoice(businessId, fileUrl);
    
    console.log('Invoice processed:', transaction.transactionId);
    // Navigate to transaction detail or show success message
  }
};

// Upload PDF file
const handlePDFUpload = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
  });

  if (result.type === 'success') {
    // Upload PDF to storage
    const pdfUrl = await uploadToStorage(result.uri);
    
    // Process invoice via OCR
    const transaction = await uploadSalesInvoice(businessId, undefined, pdfUrl);
    
    console.log('Invoice processed:', transaction.transactionId);
  }
};
```

---

## Comparison with Other Endpoints

### vs. Purchase OCR (`/transactions3/api/purchases/ocr`)

| Feature | Purchase OCR | Sales Invoice OCR |
|---------|-------------|-------------------|
| **Verification** | Saves to `pending` (unverified) | Saves to `source_of_truth` (verified) |
| **Status** | `unverified` | `verified` |
| **Items** | Expense items | Revenue/invoice items |
| **Third Party** | Vendor (seller) | Customer (buyer) |

### vs. Manual Sales (`/transactions3/api/sales/manual`)

| Feature | Manual Sales | Sales Invoice OCR |
|---------|-------------|-------------------|
| **Input** | Manual entry form | Image/PDF upload |
| **Items** | No items array | Full items array extracted |
| **Verification** | Verified | Verified (automated) |
| **File URL** | No file | Stores file URL in metadata |

---

## Transaction Structure

The returned transaction follows the standard Transaction3 format:

```typescript
{
  metadata: {
    businessId: string,
    reference: string,  // Invoice number
    capture: {
      source: 'sales_invoice_ocr',
      mechanism: 'ocr',
      confidence: number,
      sourceDocumentId: string,  // File URL
    },
    verification: {
      status: 'verified',
      method: 'automated',
      verifiedBy: string,
      verifiedAt: number,
    },
    // ... other metadata
  },
  summary: {
    thirdPartyName: string,  // Customer name
    totalAmount: number,
    transactionDate: number,
    currency: string,
    description: string,
  },
  details: {
    itemCount: number,
    itemList: Array<{
      name: string,  // Item description
      amount: number,
      // ... other item fields
    }>,
    // ... other details
  },
  accounting: {
    // Accounting entries (debits/credits)
  },
}
```

---

## Error Handling Recommendations

### Network Errors

```typescript
try {
  const result = await uploadSalesInvoice(businessId, fileUrl);
} catch (error) {
  if (error.message.includes('Network')) {
    // Show retry option
  } else if (error.message.includes('Unauthorized')) {
    // Redirect to login
  } else {
    // Show generic error message
  }
}
```

### OCR Processing Errors

If the OCR fails (500 error), you may want to:
1. Show a user-friendly message: "We couldn't read the invoice. Please try again or enter manually."
2. Provide option to fall back to manual entry
3. Log the `requestId` for support if user reports issue

---

## User Experience Recommendations

### Loading States

- Show loading indicator during OCR processing (can take 5-15 seconds)
- Display progress message: "Reading invoice..."

### Success Handling

- Show success message: "Invoice processed successfully"
- Navigate to transaction detail view
- Highlight the new transaction in the list

### Error Handling

- Clear error messages for common issues:
  - "Please check your internet connection"
  - "We couldn't read this invoice. Try a clearer image or enter manually."
- Provide manual entry fallback option

---

## Testing Checklist

- [ ] Upload image invoice (JPG/PNG)
- [ ] Upload text-based PDF invoice
- [ ] Upload scanned/image-based PDF invoice
- [ ] Test with invoices containing VAT
- [ ] Test with invoices without VAT
- [ ] Test with multi-item invoices
- [ ] Test error handling (invalid file, network error)
- [ ] Verify transaction appears in sales transactions list
- [ ] Verify transaction is marked as verified
- [ ] Verify all items are extracted correctly

---

## Questions or Issues?

If you encounter any issues during integration:
1. Check the error response for `requestId` (for backend debugging)
2. Verify the file URL is publicly accessible
3. Ensure authentication token is valid
4. Confirm business ID is correct

---

## Related Documentation

- Manual Sales Endpoint: `/docs/api/transactions3/TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md`
- Purchase OCR Endpoint: `/docs/api/transactions3/TRANSACTIONS3_RN_INTEGRATION.md`
- Implementation Plan: `/docs/api/transactions3/TRANSACTIONS3_SALES_OCR_IMPLEMENTATION_PLAN.md`

---

**Ready to integrate!** 🚀

The endpoint is live and ready for testing. All OCR invoices are automatically verified and saved to the source of truth collection.

