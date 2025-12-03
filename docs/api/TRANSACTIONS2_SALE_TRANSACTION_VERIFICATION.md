# Backend Verification Request: Sale Transaction Support

## Context

The frontend React Native app has a "Sales Pipeline" section in the Transactions screen. When users tap the "Add Transaction" button from this section, the app attempts to create transactions with `transactionType: 'sale'`.

## Current Frontend Implementation

The frontend sends requests to the unified transaction endpoint:

**Endpoint:** `POST /authenticated/transactions2/api/transactions`

**Request Payload:**
```typescript
{
  businessId: string
  transactionType: 'sale'  // <-- This is the value in question
  inputMethod: 'ocr_image' | 'ocr_pdf' | 'manual'
  fileUrl?: string
  transactionData?: any
  captureSource?: string
  captureMechanism?: string
}
```

**Response:**
```typescript
{
  success: boolean
  transactionId?: string
  transaction?: unknown
  message?: string
  logged?: boolean  // <-- Set to true if returning 501 (not yet implemented)
  logId?: string
}
```

## Verification Request

Please confirm if the backend fully supports creating transactions with `transactionType: 'sale'` for the following input methods:

1. **`inputMethod: 'ocr_image'`** - When uploading an image file (photo of invoice/receipt)
2. **`inputMethod: 'ocr_pdf'`** - When uploading a PDF file (invoice/receipt PDF)
3. **`inputMethod: 'manual'`** - When manually entering transaction data

## Current Behavior

- The frontend currently shows all input options (photo, PDF, manual) for the Sales Pipeline section
- Manual input explicitly shows a "coming soon" message for sales transactions
- Photo/PDF upload options will attempt to create sale transactions, but we're unsure if the backend fully supports this

## Questions

1. Is `transactionType: 'sale'` fully implemented and tested for all three input methods?
2. If not fully implemented, which input methods are supported?
3. Should the frontend disable certain options for sales transactions until backend support is ready?
4. Are there any specific requirements or differences in how sale transactions should be created compared to purchase transactions?

## Related Files

- Frontend API client: `lib/api/transactions2.ts` (line 173-180)
- Frontend Add Transaction screen: `screens/AddTransactionScreen.tsx` (line 72-90, 116-144)
- Frontend Transactions Scaffold: `screens/TransactionsScaffoldScreen.tsx` (line 1343-1352)

## Next Steps

Once we receive confirmation, we will:
- Update the frontend to show appropriate options based on backend support
- Add proper error handling and user messaging
- Potentially disable unsupported input methods for sales transactions

Thank you!

