# Inventory Items Save Endpoint Request

## Overview
We need an endpoint to save inventory items to Firestore when a transaction is confirmed. When a user clicks "Confirm and Save" on a transaction detail screen, any items with `debitAccount` set to "Raw Materials" or "Finished Goods" should be saved to a new Firestore collection `businesses/<businessId>/inventoryItems`.

## Current Situation
- **Feature**: Transaction Detail Screen with "Confirm and Save" functionality
- **Frontend**: Transaction items are displayed and can be edited before confirmation
- **Missing**: Backend endpoint to persist inventory items (Raw Materials/Finished Goods) to Firestore
- **Trigger**: This endpoint should be called after successful transaction verification/confirmation

## Required Endpoint

### Endpoint Specification
```
POST /authenticated/transactions3/api/inventory-items
```

### Request Body
```typescript
{
  businessId: string                    // Business ID (required)
  transactionId: string                  // Transaction ID (required)
  items: Array<{                        // Array of inventory items (required)
    name: string                         // Item name (required)
    quantity?: number                    // Quantity (optional)
    unit?: string                        // Unit of measurement (optional, e.g., "kg", "pieces", "liters")
    unitCost?: number                    // Cost per unit (optional)
    amount: number                       // Total amount (required)
    amountExcluding?: number            // Amount excluding VAT (optional)
    vatAmount?: number                  // VAT amount (optional)
    debitAccount: string                 // Debit account (required, must be "Raw Materials" or "Finished Goods")
    debitAccountConfirmed?: boolean      // Whether debit account is confirmed (optional)
    isBusinessExpense?: boolean         // Whether this is a business expense (optional)
    category?: string                    // Item category (optional)
    packaging?: {                        // Packaging data (optional, from ManageStock screen)
      primaryPackaging?: {
        description: string
        quantity: number
        unit: string
        material?: string
      }
      secondaryPackaging?: {
        description: string
        quantity: number
        primaryPackagesPerSecondary: number
        material?: string
      }
      totalPrimaryPackages: number
      orderQuantity: number
      orderPackagingLevel: 'primary' | 'secondary'
      confidence?: number
      notes?: string
    }
    costPerPrimaryPackage?: number       // Cost per primary package (optional, calculated: amount / totalPrimaryPackages)
    costPerPrimaryPackagingUnit?: number // Cost per primary packaging unit (optional, calculated: amount / (totalPrimaryPackages * primaryPackaging.quantity))
    thirdPartyName?: string              // Third party name from transaction (optional, from tx.summary.thirdPartyName)
    transactionDate?: number            // Transaction date from transaction (optional, from tx.summary.transactionDate, epoch milliseconds)
    reference?: string                  // Reference from transaction (optional, from tx.metadata.reference)
  }>
}
```

### Response Structure

```typescript
{
  success: boolean                       // Operation success status
  savedCount: number                    // Number of items successfully saved
  itemIds: string[]                     // Array of Firestore document IDs for saved items
  message?: string                      // Optional success/error message
}
```

## Firestore Structure

### Collection Path
```
businesses/{businessId}/inventoryItems/{itemId}
```

### Document Schema
```typescript
{
  // All fields from itemList
  name: string                          // Item name (required)
  quantity?: number                     // Quantity (optional)
  unit?: string                         // Unit of measurement (optional)
  unitCost?: number                     // Cost per unit (optional)
  amount: number                        // Total amount (required)
  amountExcluding?: number              // Amount excluding VAT (optional)
  vatAmount?: number                    // VAT amount (optional)
  debitAccount: string                  // Debit account: "Raw Materials" or "Finished Goods" (required)
  debitAccountConfirmed?: boolean       // Whether debit account is confirmed (optional)
  isBusinessExpense?: boolean          // Whether this is a business expense (optional)
  category?: string                     // Item category (optional)
  packaging?: {                         // Packaging data (optional, from ManageStock screen)
    primaryPackaging?: {
      description: string
      quantity: number
      unit: string
      material?: string
    }
    secondaryPackaging?: {
      description: string
      quantity: number
      primaryPackagesPerSecondary: number
      material?: string
    }
    totalPrimaryPackages: number
    orderQuantity: number
    orderPackagingLevel: 'primary' | 'secondary'
    confidence?: number
    notes?: string
  }
  costPerPrimaryPackage?: number        // Cost per primary package (optional, calculated: amount / totalPrimaryPackages)
  costPerPrimaryPackagingUnit?: number  // Cost per primary packaging unit (optional, calculated: amount / (totalPrimaryPackages * primaryPackaging.quantity))
  thirdPartyName?: string               // Third party name from transaction (optional, from tx.summary.thirdPartyName)
  transactionDate?: number               // Transaction date from transaction (optional, from tx.summary.transactionDate, epoch milliseconds)
  reference?: string                    // Reference from transaction (optional, from tx.metadata.reference)
  
  // Additional metadata fields
  businessId: string                    // Business ID (required)
  transactionId: string                 // Source transaction ID (required)
  createdAt: number                     // Creation timestamp (epoch milliseconds, e.g., 1766581722032)
  updatedAt: number                     // Last update timestamp (epoch milliseconds)
}
```

## Business Logic Requirements

### Validation
1. **Business ID**:
   - `businessId` is **required** and must be non-empty
   - Business must exist in Firestore
   - Return `400 Bad Request` if missing or invalid
   - Return `404 Not Found` if business doesn't exist

2. **Transaction ID**:
   - `transactionId` is **required** and must be non-empty
   - Transaction should exist (validation only, don't fail if missing)
   - Return `400 Bad Request` if missing

3. **Items Array**:
   - `items` is **required** and must be a non-empty array
   - Each item must have `name` (non-empty string)
   - Each item must have `amount` (number, > 0)
   - Each item must have `debitAccount` that is either "Raw Materials" or "Finished Goods"
   - Items with other debit accounts should be **filtered out** (not saved, not an error)
   - Return `400 Bad Request` if items array is empty or invalid

4. **Item Fields**:
   - `name`: Required, non-empty string, max 500 characters
   - `amount`: Required, must be a positive number
   - `quantity`: Optional, must be a positive number if provided
   - `unitCost`: Optional, must be a positive number if provided
   - `amountExcluding`: Optional, must be a positive number if provided
   - `vatAmount`: Optional, must be a non-negative number if provided
   - `debitAccount`: Required, must be exactly "Raw Materials" or "Finished Goods" (case-sensitive)
   - `unit`: Optional, max 50 characters if provided
   - `category`: Optional, max 200 characters if provided

### Filtering Logic
- **Only save items where `debitAccount === "Raw Materials"` OR `debitAccount === "Finished Goods"`**
- Items with other debit accounts should be silently filtered out (not saved, not an error)
- If all items are filtered out, return success with `savedCount: 0` and empty `itemIds` array

### Authentication & Authorization
1. **User Authentication**:
   - Verify user is authenticated
   - Return `401 Unauthorized` if not authenticated

2. **Business Access**:
   - Verify the `businessId` exists
   - Verify user has access to the business
   - Return `404 Not Found` if business doesn't exist or user doesn't have access

3. **Permission Check**:
   - Validate user has appropriate permissions for the business
   - Return `403 Forbidden` if permission is missing

### Item Creation
For each valid item (where `debitAccount` is "Raw Materials" or "Finished Goods"), create a document with:
- All fields from the item object (name, quantity, unit, unitCost, amount, amountExcluding, vatAmount, debitAccount, debitAccountConfirmed, isBusinessExpense, category, packaging, costPerPrimaryPackage, costPerPrimaryPackagingUnit, thirdPartyName, transactionDate)
- `businessId`: From request body
- `transactionId`: From request body
- `createdAt`: Current timestamp as epoch milliseconds (e.g., `Date.now()` or `new Date().getTime()`)
- `updatedAt`: Current timestamp as epoch milliseconds

**Note on Packaging Data**:
- Packaging data is optional and comes from the ManageStock screen when a user confirms and saves an inventory item
- If provided, the entire `packaging` object should be saved to Firestore as-is
- Packaging data includes primary packaging, secondary packaging (if applicable), total primary packages, order quantity, packaging level, confidence score, and notes

**Note on Cost Calculations**:
- `costPerPrimaryPackage`: Optional field calculated as `amount / totalPrimaryPackages`
  - Only included when packaging data is present and `totalPrimaryPackages > 0`
  - Represents the cost per individual primary package (e.g., cost per bottle)
- `costPerPrimaryPackagingUnit`: Optional field calculated as `amount / (totalPrimaryPackages * primaryPackaging.quantity)`
  - Only included when packaging data is present, `totalPrimaryPackages > 0`, and `primaryPackaging.quantity > 0`
  - Represents the cost per primary packaging unit (e.g., cost per ml, cost per gram)
  - This is the cost per unit of the primary packaging measurement (ml, kg, etc.)

**Note on Transaction Fields**:
- `thirdPartyName`: Optional field from `tx.summary.thirdPartyName`
  - Only included when saving from ManageStock screen (where transaction data is available)
  - Represents the supplier/vendor name from the source transaction
- `transactionDate`: Optional field from `tx.summary.transactionDate`
  - Only included when saving from ManageStock screen (where transaction data is available)
  - Stored as epoch milliseconds (number, e.g., `1766581722032`)
  - Represents the date of the source transaction
- `reference`: Optional field from `tx.metadata.reference`
  - Included when saving from ManageStock screen or TransactionDetailScreen (where transaction data is available)
  - Represents the transaction reference number or identifier

**Note**: 
- Only save optional fields if they are provided in the request (don't save `null` or `undefined` values)
- All timestamps should be stored as **numbers** (epoch milliseconds), not strings or Firestore Timestamp objects
- Example timestamp format: `1766581722032` (13-digit number)

## Error Handling

The endpoint must return appropriate HTTP status codes:

- `200 OK`: Items successfully saved (even if some were filtered out)
- `400 Bad Request`: Invalid request body (missing required fields, invalid data types, empty items array after filtering)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission for the business
- `404 Not Found`: Business ID doesn't exist or user doesn't have access
- `500 Internal Server Error`: Server error during save operation

### Error Response Format
```typescript
{
  error: string           // Error message
  code?: string          // Optional error code
  details?: any          // Optional additional error details
}
```

## Example Requests

### Request with Raw Materials and Finished Goods
```json
POST /authenticated/transactions3/api/inventory-items
Content-Type: application/json

{
  "businessId": "biz_123",
  "transactionId": "txn_abc456",
  "items": [
    {
      "name": "Steel Sheets",
      "quantity": 50,
      "unit": "pieces",
      "unitCost": 25.50,
      "amount": 1275.00,
      "amountExcluding": 1062.50,
      "vatAmount": 212.50,
      "debitAccount": "Raw Materials",
      "debitAccountConfirmed": true,
      "isBusinessExpense": true,
      "category": "Manufacturing"
    },
    {
      "name": "Finished Widget A",
      "quantity": 100,
      "unit": "units",
      "unitCost": 15.00,
      "amount": 1500.00,
      "amountExcluding": 1250.00,
      "vatAmount": 250.00,
      "debitAccount": "Finished Goods",
      "debitAccountConfirmed": true,
      "isBusinessExpense": false
    },
    {
      "name": "Office Supplies",
      "amount": 50.00,
      "debitAccount": "Office Expenses",
      "debitAccountConfirmed": true
    }
  ]
}
```

**Note**: The third item with `debitAccount: "Office Expenses"` should be filtered out and not saved.

### Minimal Request
```json
POST /authenticated/transactions3/api/inventory-items
Content-Type: application/json

{
  "businessId": "biz_123",
  "transactionId": "txn_abc456",
  "items": [
    {
      "name": "Raw Material X",
      "amount": 500.00,
      "debitAccount": "Raw Materials"
    }
  ]
}
```

### Request with Packaging Data (from ManageStock screen)
```json
POST /authenticated/transactions3/api/inventory-items
Content-Type: application/json

{
  "businessId": "biz_123",
  "transactionId": "txn_abc456",
  "items": [
    {
      "name": "Steel Sheets",
      "quantity": 50,
      "unit": "pieces",
      "unitCost": 25.50,
      "amount": 1275.00,
      "amountExcluding": 1062.50,
      "vatAmount": 212.50,
      "debitAccount": "Raw Materials",
      "debitAccountConfirmed": true,
      "isBusinessExpense": true,
      "category": "Manufacturing",
      "packaging": {
        "primaryPackaging": {
          "description": "Box",
          "quantity": 10,
          "unit": "pieces",
          "material": "Cardboard"
        },
        "secondaryPackaging": {
          "description": "Pallet",
          "quantity": 2,
          "primaryPackagesPerSecondary": 5,
          "material": "Wood"
        },
        "totalPrimaryPackages": 10,
        "orderQuantity": 50,
        "orderPackagingLevel": "secondary",
        "confidence": 0.95,
        "notes": "Packaging verified by warehouse staff"
      },
      "costPerPrimaryPackage": 127.50,
      "costPerPrimaryPackagingUnit": 0.2550,
      "thirdPartyName": "ABC Suppliers Ltd",
      "transactionDate": 1766581722032,
      "reference": "INV-2024-001"
    }
  ]
}
```

**Note**: 
- Packaging data is optional and only included when saving from the ManageStock screen after the user has confirmed packaging information.
- `costPerPrimaryPackage` is calculated as: `amount / totalPrimaryPackages` (e.g., 1275.00 / 10 = 127.50)
- `costPerPrimaryPackagingUnit` is calculated as: `amount / (totalPrimaryPackages * primaryPackaging.quantity)` (e.g., 1275.00 / (10 * 500) = 0.2550 per ml)

## Example Responses

### Success Response (Multiple Items Saved)
```json
{
  "success": true,
  "savedCount": 2,
  "itemIds": ["inv_item_001", "inv_item_002"],
  "message": "Successfully saved 2 inventory items"
}
```

### Success Response (Some Items Filtered Out)
```json
{
  "success": true,
  "savedCount": 1,
  "itemIds": ["inv_item_001"],
  "message": "Successfully saved 1 inventory item (1 item filtered out)"
}
```

### Success Response (All Items Filtered Out)
```json
{
  "success": true,
  "savedCount": 0,
  "itemIds": [],
  "message": "No inventory items to save (all items filtered out)"
}
```

### Error Response (Invalid Debit Account)
```json
{
  "error": "Invalid request: All items have invalid debitAccount. Only 'Raw Materials' and 'Finished Goods' are allowed.",
  "code": "INVALID_DEBIT_ACCOUNT"
}
```

### Error Response (Missing Required Field)
```json
{
  "error": "Invalid request: Missing required field 'name' in item at index 0",
  "code": "VALIDATION_ERROR"
}
```

## Implementation Summary

### Endpoint
- **Method**: `POST`
- **Path**: `/authenticated/transactions3/api/inventory-items`
- **Request Body**: 
  - `businessId` (string, required)
  - `transactionId` (string, required)
  - `items` (array, required, non-empty)

### Item Filtering
- **Only save items where `debitAccount === "Raw Materials"` OR `debitAccount === "Finished Goods"`**
- Items with other debit accounts are silently filtered out (not an error)
- If all items are filtered out, return success with `savedCount: 0`

### Validation Rules
- `businessId`: Required, non-empty, business must exist
- `transactionId`: Required, non-empty
- `items`: Required, non-empty array
- Each item:
  - `name`: Required, non-empty string, max 500 chars
  - `amount`: Required, positive number
  - `debitAccount`: Required, must be "Raw Materials" or "Finished Goods" (case-sensitive)
  - `quantity`: Optional, positive number if provided
  - `unitCost`: Optional, positive number if provided
  - `amountExcluding`: Optional, positive number if provided
  - `vatAmount`: Optional, non-negative number if provided
  - `unit`: Optional, max 50 chars if provided
  - `category`: Optional, max 200 chars if provided

### Authentication & Authorization
- Verify user authentication
- Check business access
- Validate user permissions

### Inventory Item Document Fields
- All item fields from request (only save if provided, don't save null/undefined)
- `businessId`: From request
- `transactionId`: From request
- `createdAt`: Current epoch milliseconds (number, e.g., `1766581722032`)
- `updatedAt`: Current epoch milliseconds (number)

**Important**: 
- Timestamps must be stored as **numbers** (epoch milliseconds), not strings or Firestore Timestamp objects
- Only save optional fields if they are provided in the request
- Filter out items that don't have "Raw Materials" or "Finished Goods" as debitAccount

### Response
Returns object with: `success` (boolean), `savedCount` (number), `itemIds` (string array), `message` (optional string)

### Error Codes
- `200`: Success (even if items were filtered out)
- `400`: Validation errors
- `401`: Not authenticated
- `403`: Missing permissions
- `404`: Business not found or no access
- `500`: Server error

## Integration Context

### When This Endpoint is Called
This endpoint should be called **after** a transaction is successfully verified/confirmed. The frontend flow is:

1. User clicks "Confirm and Save" on TransactionDetailScreen
2. Transaction verification endpoint is called (either `verifyTransaction` or `updateTransactions3VerifiedPurchase`)
3. **If verification succeeds**, this inventory items endpoint is called with the transaction's itemList
4. Only items with `debitAccount === "Raw Materials"` or `debitAccount === "Finished Goods"` are sent

### Frontend Integration
The frontend will:
- Extract items from `transaction.details.itemList`
- Filter items where `debitAccount === "Raw Materials"` OR `debitAccount === "Finished Goods"`
- Call this endpoint with the filtered items
- Handle the response (show success/error message if needed)

### Transaction Item Structure Reference
The items come from the transaction's `details.itemList` array, which has the following structure:
```typescript
{
  name: string
  quantity?: number
  unit?: string
  unitCost?: number
  amount: number
  debitAccount?: string
  amountExcluding?: number
  vatAmount?: number
  debitAccountConfirmed?: boolean
  isBusinessExpense?: boolean
  category?: string
}
```

## Priority
**High** - This is needed to complete the inventory tracking functionality. The frontend will integrate this endpoint after transaction confirmation to automatically track inventory items.

## Backend Confirmation Required

**Please confirm that the following will be implemented:**

1. ✅ Endpoint: `POST /authenticated/transactions3/api/inventory-items`
2. ✅ Firestore collection: `businesses/<businessId>/inventoryItems`
3. ✅ Only items with `debitAccount === "Raw Materials"` or `debitAccount === "Finished Goods"` are saved
4. ✅ All itemList fields are preserved in the Firestore document
5. ✅ Additional fields: `businessId`, `transactionId`, `createdAt`, `updatedAt` are added
6. ✅ Timestamps are stored as epoch milliseconds (numbers, e.g., `1766581722032`)
7. ✅ Optional fields are only saved if provided (no null/undefined values)
8. ✅ Items with other debit accounts are filtered out silently (not an error)

**All fields from the transaction itemList will be sent from the frontend and should be persisted to Firestore in the `businesses/<businessId>/inventoryItems` collection.**

## Update: Packaging Data Support

**NEW REQUIREMENT**: The endpoint must now also accept and save packaging data when provided.

### When Packaging Data is Included
Packaging data is included when an inventory item is saved from the **ManageStock screen** after the user has:
1. Viewed the extracted packaging information
2. Optionally edited the packaging details
3. Selected whether the item is "Raw Materials" or "Finished Goods"
4. Clicked "Confirm and Save"

### Packaging Data Structure
The `packaging` field is optional and contains:
- `primaryPackaging`: Primary packaging details (description, quantity, unit, material)
- `secondaryPackaging`: Secondary packaging details (if applicable)
- `totalPrimaryPackages`: Total number of primary packages
- `orderQuantity`: Order quantity
- `orderPackagingLevel`: 'primary' | 'secondary'
- `confidence`: Confidence score (0-1) from extraction
- `notes`: Optional notes about the packaging

### Cost Calculation Fields
Two new optional fields are included when packaging data is present:

1. **`costPerPrimaryPackage`** (number, optional):
   - Calculated as: `amount / totalPrimaryPackages`
   - Example: If total amount is £1275.00 and there are 10 primary packages, cost per package = £127.50
   - Only included when `totalPrimaryPackages > 0`

2. **`costPerPrimaryPackagingUnit`** (number, optional):
   - Calculated as: `amount / (totalPrimaryPackages * primaryPackaging.quantity)`
   - Example: If total amount is £1275.00, 10 packages, and 500 ml per package, cost per ml = £0.2550
   - Only included when `totalPrimaryPackages > 0` and `primaryPackaging.quantity > 0`
   - This represents the cost per unit of the primary packaging measurement (ml, kg, grams, etc.)

### Implementation Notes
- Packaging data should be saved to Firestore as a nested object
- Cost calculation fields should be saved as numbers (not strings)
- If packaging data is not provided (e.g., when saving from TransactionDetailScreen), the packaging and cost fields should not be saved (don't save null/undefined)
- The packaging object structure should be preserved exactly as received from the frontend
- Cost calculations are performed on the frontend and sent pre-calculated to the backend

