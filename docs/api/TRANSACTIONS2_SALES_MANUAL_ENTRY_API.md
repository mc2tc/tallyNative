# Manual Sale Transaction Entry API

## Overview

This endpoint allows the React Native app to create sale transactions (invoices) manually with complete accounting entries. This endpoint is for recording the sale/invoice creation - payment receipt is handled separately through bank reconciliation or other payment endpoints.

## ⚠️ Important: VAT Handling

**If your invoice includes VAT, you MUST include the `vatAmount` field in the request.**

- **Without `vatAmount`**: The entire `totalAmount` will be credited to Sales Revenue (incorrect for VAT invoices)
- **With `vatAmount`**: Sales Revenue gets the net amount, VAT Output Tax gets the VAT amount (correct)

**Example:**

- Invoice: £10,000 + £2,000 VAT = £12,000 total
- **Correct request**: `{ totalAmount: 12000, vatAmount: 2000 }` → Sales Revenue: £10,000, VAT Output Tax: £2,000 ✅
- **Incorrect request**: `{ totalAmount: 12000 }` → Sales Revenue: £12,000 ❌

## Endpoint

**POST** `/authenticated/transactions2/api/sales/manual`

**Base URL:** Your backend API URL (e.g., `https://your-api.com`)

## Request Format

### Query Parameters (Optional)

- `businessId` (string, optional) - Business ID. Can also be provided in request body.

### Request Body

```typescript
{
  customerName: string;              // Required - Name of the customer
  transactionDate: string;           // Required - ISO date string (e.g., "2024-01-15")
  totalAmount: number;               // Required - Positive number for sale amount
  currency?: string;                 // Optional - Currency code (defaults to business currency)
  description?: string;              // Optional - Transaction description
  reference?: string;                // Optional - Transaction reference number (used as invoice number if VAT present)
  incomeAccount?: string;            // Optional - Income account name (defaults to "Sales Revenue")
  vatAmount?: number;                // Optional - VAT amount for invoices (REQUIRED if invoice includes VAT - see VAT Handling section)
  businessId?: string;               // Optional - Can be in query params instead
}
```

### Example Request (Without VAT)

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "John Doe",
  "transactionDate": "2024-01-15",
  "totalAmount": 1000.00,
  "currency": "USD",
  "description": "Product sale - Invoice #12345",
  "reference": "INV-12345",
  "incomeAccount": "Sales Revenue"
}
```

### Example Request (With VAT)

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "John Doe",
  "transactionDate": "2024-01-15",
  "totalAmount": 1200.00,           // Total including VAT
  "vatAmount": 200.00,              // ⚠️ REQUIRED: Must include VAT amount for proper accounting
  "currency": "GBP",
  "description": "Product sale - Invoice #12345",
  "reference": "INV-12345",
  "incomeAccount": "Sales Revenue"
}

// Result Accounting (if business is VAT registered):
// Debit: Accounts Receivable £1200.00
// Credit: Sales Revenue £1000.00
// Credit: VAT Output Tax £200.00
```

## Response Format

### Success Response (200 OK)

```typescript
{
  success: true,
  transactionId: string,
  transaction: {
    id: string,
    metadata: {
      businessId: string,
      capture: {
        source: "manual_entry",
        mechanism: "manual",
        confidence: 1.0
      },
      classification: {
        kind: "sale",
        confidence: 1.0,
        needsReview: false
      },
      verification: {
        status: "verified",
        method: "manual_entry",
        verifiedBy: string,
        verifiedAt: number
      },
      // ... other metadata fields
    },
    summary: {
      thirdPartyName: string,
      totalAmount: number,
      transactionDate: number,
      currency: string,
      description?: string
    },
    accounting: {
      balanced: boolean,
      credits: AccountingLedgerEntry[],
      debits: AccountingLedgerEntry[],
      paymentBreakdown: PaymentTypeEntry[]
    },
    details: {
      // ... detail fields
    }
  }
}
```

### Error Responses

#### Validation Error (400 Bad Request)

```typescript
{
  error: "Invalid request body",
  details: [
    {
      path: string[],
      message: string
    }
  ]
}
```

#### Business Not Found (404 Not Found)

```typescript
{
  error: 'Business not found';
}
```

#### Authentication Error (401 Unauthorized)

```typescript
{
  error: 'Unauthorized';
}
```

#### Server Error (500 Internal Server Error)

```typescript
{
  error: string,
  requestId: string
}
```

## Accounting Logic

This endpoint creates sale transactions (invoices) with appropriate accounting based on whether VAT is included:

### Without VAT (Standard Sale)

**Accounting Entries:**

- **Debit:** `Accounts Receivable` (Asset) - for the full sale amount
- **Credit:** `Sales Revenue` (Income) or custom `incomeAccount` - for the full sale amount

**Payment Method:** `accounts_receivable`

### With VAT (Invoice)

**Accounting Entries:**

- **Debit:** `Accounts Receivable` (Asset) - for the full invoice amount (includes VAT)
- **Credit:** `Sales Revenue` (Income) - for the net amount (excluding VAT)
- **Credit:** `VAT Output Tax` (Liability) - for the VAT amount

**Payment Method:** `accounts_receivable`

**VAT Handling:**

⚠️ **IMPORTANT**: If your invoice includes VAT, you **MUST** include the `vatAmount` field in the request. Without it, the entire `totalAmount` will be credited to Sales Revenue, which is incorrect for VAT-registered businesses.

- **If `vatAmount` is provided and business is VAT registered**:

  - VAT is credited to `VAT Output Tax` liability account
  - Sales Revenue is credited for the net amount (totalAmount - vatAmount)
  - Example: totalAmount=1200, vatAmount=200 → Sales Revenue=1000, VAT Output Tax=200

- **If `vatAmount` is provided but business is not VAT registered**:

  - VAT is included in Sales Revenue (no separate VAT Output Tax entry)
  - Sales Revenue is credited for the full amount

- **If no `vatAmount` provided**:
  - Standard sale accounting is used (entire amount to Sales Revenue)
  - This is correct for sales without VAT, but **incorrect for invoices with VAT**

**Use Case:** Creating an invoice/sale on credit. The customer owes the business, recorded as Accounts Receivable.

**Note:** This endpoint is for invoice/sale creation only. Payment receipt (which would debit Bank/Cash and credit Accounts Receivable) is handled separately through bank reconciliation or payment receipt endpoints.

## Key Features

1. **Standard Credit Sale Accounting**: Always creates Debit Accounts Receivable, Credit Sales Revenue entries
2. **Uses Accounting Service**: Leverages the centralized accounting service for consistent entry creation
3. **Verification**: Manual entries are automatically marked as verified
4. **Date Handling**: Accepts ISO date strings and converts to timestamps
5. **Currency Support**: Uses business default currency if not specified
6. **Transaction ID**: Returns the created transaction ID immediately
7. **Invoice Creation**: Designed for creating invoices/sales on credit - payment receipt handled separately

## Field Descriptions

| Field             | Type   | Required | Description                                                                                                                                                                                   |
| ----------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customerName`    | string | Yes      | Name of the customer for the sale                                                                                                                                                             |
| `transactionDate` | string | Yes      | ISO date string (e.g., "2024-01-15" or "2024-01-15T10:30:00Z")                                                                                                                                |
| `totalAmount`     | number | Yes      | Positive number representing the sale amount                                                                                                                                                  |
| `currency`        | string | No       | Currency code (defaults to business settings currency)                                                                                                                                        |
| `description`     | string | No       | Optional description of the transaction                                                                                                                                                       |
| `reference`       | string | No       | Optional reference number (e.g., invoice number - used as invoice number if VAT present)                                                                                                      |
| `incomeAccount`   | string | No       | Income account name (defaults to "Sales Revenue")                                                                                                                                             |
| `vatAmount`       | number | No       | **REQUIRED for invoices with VAT** - VAT amount to be separated from Sales Revenue. If invoice includes VAT, this field must be provided or all revenue will incorrectly go to Sales Revenue. |
| `businessId`      | string | Yes      | Business ID (can be in query params or body)                                                                                                                                                  |

## Date Format

The `transactionDate` field accepts ISO 8601 date strings:

- `"2024-01-15"` (date only)
- `"2024-01-15T10:30:00Z"` (with time and timezone)

The backend will parse the date and convert it to a timestamp.

## Example Use Cases

### Example 1: Standard Invoice Creation

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "Acme Corp",
  "transactionDate": "2024-01-15",
  "totalAmount": 5000.00,
  "currency": "USD",
  "description": "Q1 Services Invoice",
  "reference": "INV-2024-001"
}

// Result Accounting:
// Debit: Accounts Receivable $5000.00
// Credit: Sales Revenue $5000.00
```

### Example 2: Invoice with Custom Income Account

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "Tech Services Inc",
  "transactionDate": "2024-01-15",
  "totalAmount": 2000.00,
  "currency": "USD",
  "incomeAccount": "Service Revenue",
  "description": "Consulting services invoice",
  "reference": "INV-2024-002"
}

// Result Accounting:
// Debit: Accounts Receivable $2000.00
// Credit: Service Revenue $2000.00
```

### Example 3: Simple Sale Invoice

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business456

{
  "customerName": "ABC Company",
  "transactionDate": "2024-01-20",
  "totalAmount": 1500.00,
  "currency": "USD",
  "description": "Product sale invoice"
}

// Result Accounting:
// Debit: Accounts Receivable $1500.00
// Credit: Sales Revenue $1500.00
```

### Example 4: Invoice with VAT (VAT Registered Business) ⚠️ REQUIRES vatAmount

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "XYZ Ltd",
  "transactionDate": "2024-01-15",
  "totalAmount": 1200.00,        // Total including VAT
  "vatAmount": 200.00,           // ⚠️ MUST include this field!
  "currency": "GBP",
  "description": "Services invoice",
  "reference": "INV-2024-003"
}

// Result Accounting (if business is VAT registered):
// Debit: Accounts Receivable £1200.00
// Credit: Sales Revenue £1000.00 (net amount)
// Credit: VAT Output Tax £200.00 (VAT amount)
```

### Example 5: Large Invoice with VAT

```typescript
POST /authenticated/transactions2/api/sales/manual?businessId=business123

{
  "customerName": "Jupiter Systems",
  "transactionDate": "2025-12-02",
  "totalAmount": 12000.00,       // £10,000 + £2,000 VAT
  "vatAmount": 2000.00,           // ⚠️ MUST include this field!
  "currency": "GBP",
  "description": "Audit - Phase 1",
  "reference": "INV-2025-001"
}

// Result Accounting (if business is VAT registered):
// Debit: Accounts Receivable £12,000.00
// Credit: Sales Revenue £10,000.00 (net amount)
// Credit: VAT Output Tax £2,000.00 (VAT amount)
```

**Note:** All sale transactions created through this endpoint use Accounts Receivable. When payment is received later (via bank transfer, cash, etc.), a separate transaction or reconciliation will debit Bank/Cash and credit Accounts Receivable to clear the receivable.

## Integration Notes

1. **Authentication**: All requests require valid authentication via Firebase Auth token
2. **Business Access**: User must have access to the specified business
3. **Transaction Collection**: Transactions are saved to `transactions2` subcollection
4. **Immediate Response**: Transaction ID is returned immediately after successful save
5. **Automatic Verification**: Manual entries are automatically verified (no review needed)
6. **VAT Field Requirement**:
   - ⚠️ **CRITICAL**: If the invoice includes VAT, you **MUST** include the `vatAmount` field
   - The backend cannot infer VAT from the total amount
   - If `vatAmount` is missing, the entire `totalAmount` will be credited to Sales Revenue (incorrect for VAT invoices)
   - Always send: `{ totalAmount: 12000, vatAmount: 2000 }` for invoices with VAT

## Error Handling

The frontend should handle the following error scenarios:

1. **400 Bad Request**: Validate all required fields and data types before sending
2. **401 Unauthorized**: Refresh authentication token and retry
3. **404 Not Found**: Verify business ID is correct
4. **500 Server Error**: Log error with requestId for debugging

## Next Steps

1. Implement this endpoint in the React Native app
2. Add form validation for required fields
3. Handle success/error responses appropriately
4. Display created transaction ID to user
5. Optionally refresh transaction list after creation

## Related Documentation

- [Transactions2 Unified Endpoint](./TRANSACTIONS2_UNIFIED_ENDPOINT.md)
- [React Native Transactions2 Integration Guide](./REACT_NATIVE_TRANSACTIONS2_INTEGRATION.md)
- [Sale Transaction Verification](./TRANSACTIONS2_SALE_TRANSACTION_VERIFICATION.md)
