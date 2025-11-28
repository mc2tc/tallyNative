# Transactions2 Purchases - Manual Entry API

**Audience**: React Native mobile engineers  
**Scope**: API specification for creating purchase transactions via manual entry form

---

## Endpoint

**POST** `/authenticated/transactions2/api/transactions`

**Base URL**: Your backend API URL

---

## Authentication

- **Auth token**: Request must include a valid authenticated user token (same mechanism as other authenticated Transactions2 APIs)
- **User–business binding**: The authenticated user must belong to or have access to the `businessId` in the payload
- **Failure behavior**:
  - If the user is not authenticated → 401
  - If the user does not have access to `businessId` → 403

---

## Request Format

```typescript
{
  businessId: string;                    // Required
  transactionType: 'purchase';            // Required - must be 'purchase'
  inputMethod: 'manual';                  // Required - must be 'manual'
  transactionData: {                      // Required for manual entry
    // Core transaction fields
    vendorName: string;                   // Required - name of vendor/supplier
    transactionDate: string;              // Required - ISO 8601 date string (e.g., "2024-01-15")
    totalAmount: number;                  // Required - total transaction amount (positive number)
    currency?: string;                    // Optional - currency code (e.g., "GBP", "USD"). Defaults to business currency
    
    // Reference and identification
    reference?: string;                    // Optional - invoice/receipt reference number
    
    // Line items
    items: Array<{                        // Required - at least one item
      name: string;                       // Required - item description/name
      debitAccount: string;                // Required - expense account name from chart of accounts
      quantity: number;                    // Required - quantity (default: 1)
      unitCost: number;                   // Required - cost per unit
      amount: number;                     // Required - total amount for this item (quantity * unitCost)
      amountExcluding?: number;          // Optional - amount excluding VAT (if VAT is separate)
      category?: string;                  // Optional - item category (e.g., "Food", "Office Supplies")
      unit?: string;                      // Optional - unit of measurement (e.g., "pcs", "kg", "hrs")
    }>;
    
    // Charges (taxes, fees, discounts)
    charges?: Array<{                      // Optional
      name: string;                       // Required - charge name (e.g., "VAT", "Service Charge", "Discount")
      rate?: string;                      // Optional - rate or percentage (e.g., "20%", "10%")
      amount: number;                     // Required - charge amount (positive for fees/taxes, negative for discounts)
    }>;
    
    // Payment method
    paymentType?: Array<{                 // Optional - defaults to [{ type: 'unknown', amount: totalAmount }]
      type: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'accounts_payable' | 'employee_expense' | 'unknown';
      amount: number;                     // Required - amount paid with this method
      chequeNumber?: string;              // Optional - required if type is 'cheque'
      cardLastFour?: string;             // Optional - last 4 digits of card if type is 'card'
    }>;
    
    // Foreign currency (if applicable)
    // NOTE: If currency differs from business currency, backend automatically:
    // - Fetches exchange rate from Fixer.io for transaction date
    // - Converts all amounts (items, charges, totalAmount) to business currency
    // - Stores original currency details in foreignCurrency object
    foreignCurrency?: {                   // Optional - only needed if providing manual exchange rate
      originalCurrency: string;           // Required if foreignCurrency provided - original currency code
      originalAmount: number;             // Required if foreignCurrency provided - amount in original currency
      exchangeRate: number;               // Optional - manual exchange rate (if provided, takes priority over API)
      exchangeRateSource?: 'receipt' | 'api' | 'manual' | 'fallback';
      exchangeRateDate?: string;          // Optional - ISO 8601 date when exchange rate was applied
      convertedAmount?: number;           // Optional - amount converted to business currency
    };
  };
}
```

---

## Field Requirements

### Required Fields

1. **businessId** (string): The business ID for which the transaction is being created
2. **transactionType** (string): Must be `"purchase"`
3. **inputMethod** (string): Must be `"manual"`
4. **transactionData.vendorName** (string): Name of the vendor/supplier
5. **transactionData.transactionDate** (string): Transaction date in ISO 8601 format (e.g., `"2024-01-15"`)
6. **transactionData.totalAmount** (number): Total transaction amount (must be positive)
7. **transactionData.items** (array): At least one item must be provided
   - Each item requires: `name`, `debitAccount`, `quantity`, `unitCost`, `amount`

### Optional Fields

- **currency**: If not provided, defaults to business's default currency. If different from business currency, backend automatically converts all amounts using Fixer.io exchange rate for transaction date.
- **reference**: Invoice or receipt reference number
- **charges**: Array of taxes, fees, or discounts
- **paymentType**: Payment method breakdown (defaults to single unknown payment)
- **foreignCurrency**: Optional - only needed if providing manual exchange rate. If currency differs from business currency and foreignCurrency is not provided, backend automatically fetches exchange rate and converts all amounts.

---

## Example Request

```json
{
  "businessId": "business_123",
  "transactionType": "purchase",
  "inputMethod": "manual",
  "transactionData": {
    "vendorName": "Office Supplies Co",
    "transactionDate": "2024-01-15",
    "totalAmount": 150.00,
    "currency": "GBP",
    "reference": "INV-2024-001",
    "items": [
      {
        "name": "Printer Paper",
        "debitAccount": "Office Supplies",
        "quantity": 10,
        "unitCost": 12.50,
        "amount": 125.00,
        "amountExcluding": 104.17,
        "category": "Office Supplies",
        "unit": "pcs"
      },
      {
        "name": "Printer Ink",
        "debitAccount": "Office Supplies",
        "quantity": 2,
        "unitCost": 12.50,
        "amount": 25.00,
        "amountExcluding": 20.83,
        "category": "Office Supplies",
        "unit": "pcs"
      }
    ],
    "charges": [
      {
        "name": "VAT",
        "rate": "20%",
        "amount": 25.00
      }
    ],
    "paymentType": [
      {
        "type": "card",
        "amount": 150.00
      }
    ]
  }
}
```

### Foreign Currency Example

When entering a transaction in a foreign currency, simply provide the currency code and all amounts in that currency. The backend will automatically fetch the exchange rate from Fixer.io for the transaction date and convert all amounts to the business currency.

```json
{
  "businessId": "business_123",
  "transactionType": "purchase",
  "inputMethod": "manual",
  "transactionData": {
    "vendorName": "US Supplier Inc",
    "transactionDate": "2024-01-15",
    "totalAmount": 100.00,
    "currency": "USD",  // Different from business currency (e.g., GBP)
    "reference": "INV-US-001",
    "items": [
      {
        "name": "Equipment",
        "debitAccount": "Equipment",
        "quantity": 1,
        "unitCost": 100.00,
        "amount": 100.00
      }
    ],
    "charges": [
      {
        "name": "Sales Tax",
        "rate": "8%",
        "amount": 8.00
      }
    ],
    "paymentType": [
      {
        "type": "card",
        "amount": 108.00
      }
    ]
    // foreignCurrency object NOT needed - backend auto-converts
  }
}
```

**Backend Processing:**
1. Detects `currency: "USD"` differs from business currency (e.g., `GBP`)
2. Fetches exchange rate from Fixer.io for `2024-01-15`
3. Converts all amounts:
   - `totalAmount`: 100.00 USD → ~79.00 GBP (example rate)
   - `items[0].amount`: 100.00 USD → ~79.00 GBP
   - `charges[0].amount`: 8.00 USD → ~6.32 GBP
   - `paymentType[0].amount`: 108.00 USD → ~85.32 GBP
4. Stores original currency details in `details.foreignCurrency`
5. All accounting entries use converted amounts in business currency

---

## Response Format

### Success Response (200)

```typescript
{
  success: true,
  transactionId: string,        // Firestore document ID of created transaction
  transaction: Transaction       // Full transaction object (see Transaction type)
}
```

### Error Responses

#### Validation Error (400)

```typescript
{
  error: "Invalid request body",
  details: Array<{
    path: string[],
    message: string
  }>
}
```

#### Authentication Error (401)

```typescript
{
  error: "Unauthorized"
}
```

#### Authorization Error (403)

```typescript
{
  error: "Access denied"
}
```

#### Business Not Found (404)

```typescript
{
  error: "Business not found"
}
```

#### Server Error (500)

```typescript
{
  error: string,                  // Error message
  requestId: string              // Request ID for log correlation
}
```

---

## Field Validation Rules

### transactionData.totalAmount
- Must be a positive number
- Should equal the sum of all item amounts plus charges (validation may warn but won't fail)

### transactionData.items
- Array must contain at least one item
- Each item's `amount` should equal `quantity * unitCost` (validation may warn but won't fail)
- `debitAccount` must be a valid account name from the business's chart of accounts

### transactionData.paymentType
- If provided, sum of payment amounts should equal `totalAmount` (validation may warn but won't fail)
- If not provided, defaults to `[{ type: 'unknown', amount: totalAmount }]`

### transactionData.transactionDate
- Must be a valid ISO 8601 date string
- Will be parsed and normalized to UTC
- If parsing fails, current date will be used as fallback

---

## Transaction Structure

The created transaction follows the unified Transactions2 structure:

- **metadata**: Capture source (`manual_entry`), verification state, reconciliation state
- **summary**: Third party name, total amount, transaction date, currency
- **accounting**: Balanced double-entry accounting entries (debits and credits)
- **details**: Item list, grouped by chart account, VAT status

---

## Notes for Mobile Implementation

1. **Account Selection**: The `debitAccount` field should use account names from the business's chart of accounts. Consider fetching available accounts before showing the form.

2. **Date Handling**: Send dates as ISO 8601 strings. The backend will parse and normalize them.

3. **Amount Calculations**: While the backend will validate amounts, it's recommended to calculate `amount = quantity * unitCost` on the client side for better UX.

4. **Payment Methods**: If the user doesn't specify payment method, the backend will default to `unknown`. For better reconciliation, encourage users to specify the actual payment method.

5. **VAT Handling**: If VAT is included in item amounts, set `amountExcluding` to the VAT-exclusive amount. If VAT is separate, include it in the `charges` array.

6. **Error Handling**: Always check the response status and handle errors appropriately. The `requestId` in error responses can be used for support/debugging.

---

## Related Documentation

- [Transactions2 Unified Endpoint](./TRANSACTIONS2_UNIFIED_ENDPOINT.md) - General endpoint documentation
- [Transactions2 Purchases OCR](./TRANSACTIONS2_PURCHASES_OCR_CREATE_TRANSACTION.md) - OCR-based purchase creation
- [React Native Transactions2 Integration](./REACT_NATIVE_TRANSACTIONS2_INTEGRATION.md) - General integration guide

