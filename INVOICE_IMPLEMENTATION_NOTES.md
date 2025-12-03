# Invoice Implementation Notes

## Current Implementation

The invoice creation flow currently:

1. ✅ Creates transaction via backend API (`/authenticated/transactions2/api/sales/manual`)
2. ✅ Shows success message with transaction ID
3. ⏳ PDF generation - **To be implemented later**

## Backend API Integration

The frontend calls the sales manual entry endpoint with:
- `customerName` - Customer name (pre-filled from lead if coming from Sales Pipeline)
- `transactionDate` - Invoice date
- `totalAmount` - Grand total (including VAT if applicable)
- `currency` - Currency code
- `description` - Concatenated item descriptions
- `reference` - Invoice number or project reference

## Next Steps: PDF Generation

PDF generation will be implemented later. Recommended approaches:

### Option 1: Backend PDF Generation (Recommended)
- Create backend endpoint that generates PDF server-side
- Frontend downloads and saves PDF
- Works in Expo Go (no native modules)
- More reliable and consistent

### Option 2: Client-Side PDF Generation
- Use `expo-print` with HTML (requires development build, not Expo Go)
- Or use `@react-pdf/renderer` (has React Native compatibility issues)
- Requires native modules and development build

## Implementation Summary

### 1. Backend API Integration
- Added `createSaleTransaction` method to `lib/api/transactions2.ts`
- Calls `/authenticated/transactions2/api/sales/manual` endpoint
- Creates sale transaction with Accounts Receivable accounting entries

### 2. PDF Invoice Generation
- Created `components/InvoicePDF.tsx` using `@react-pdf/renderer`
- Generates professional invoice PDF with:
  - Business name and VAT number
  - Customer details
  - Invoice number, date, reference
  - Line items table with quantities, unit costs, VAT indicators
  - Subtotal, VAT, and Grand Total
  - Bank account details for payment

### 3. Business Data Fetching
- Fetches VAT number from `businessContextApi.getContext()`
- Fetches bank accounts from `bankAccountsApi.getBankAccounts()` (uses first account)
- Business name: Currently set to placeholder "Your Business Name"
  - **TODO**: Fetch actual business name from business document or user profile

### 4. File Saving
- Saves PDF to device using `expo-file-system`
- Offers sharing via `expo-sharing` if available
- File naming: `Invoice_{invoiceNumber}_{customerName}.pdf`

## Next Steps / TODOs

1. **Install @react-pdf/renderer package**
   ```bash
   npm install @react-pdf/renderer
   ```

2. **Business Name**: Update to fetch actual business name
   - Option A: Add business name to business context API response
   - Option B: Fetch from business document in Firestore
   - Option C: Add to user profile/business membership data

3. **Business Address**: Consider adding business address to invoice header
   - May need to add to business context or fetch separately

4. **Invoice Numbering**: Consider auto-generating invoice numbers if not provided
   - Could use transaction ID or sequential numbering

5. **Error Handling**: Add more specific error messages for different failure scenarios

6. **Testing**: Test PDF generation on both iOS and Android devices

## API Payload Mapping

The invoice form data is mapped to the backend API as follows:

- `customerName` → `customerName` (required)
- `invoiceDate` → `transactionDate` (required, ISO date string)
- `grandTotal` → `totalAmount` (required, positive number)
- `currency || businessCurrency` → `currency` (optional, defaults to business currency)
- `items.map(i => i.description).join(', ')` → `description` (optional)
- `invoiceNumber || reference` → `reference` (optional, invoice number)

## PDF Features

- Professional invoice layout
- Responsive table for line items
- VAT breakdown (if applicable)
- Bank account details for payment
- Payment terms (Net 30 days - can be customized)

