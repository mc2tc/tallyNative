# Product Creation Endpoint Request

## Overview
We need an endpoint to create products in the Production Management feature. When a user designs a product from the Create Product screen by adding a product name and selecting Raw Materials with quantities, the product data should be saved to Firestore in a new `businesses/<businessId>/products` collection.

## Current Situation
- **Feature**: Create Product screen in InventoryItemDetailScreen (Raw Materials section)
- **Frontend**: Screen with product name input and ability to add Raw Materials from inventory with quantities
- **Missing**: Backend endpoint to persist product data to Firestore
- **Trigger**: This endpoint is called when user clicks "Create Product" button after entering product name and adding ingredients

## Required Endpoint

### Endpoint Specification
```
POST /authenticated/transactions3/api/products
```

### Request Body
```typescript
{
  businessId: string                    // Business ID (required)
  name: string                          // Product name (required)
  ingredients: Array<{                  // Array of ingredients (required, non-empty)
    inventoryItemId: string             // Inventory item document ID (required)
    quantity: number                    // Quantity of ingredient (required, must be > 0)
  }>
}
```

### Response Structure

```typescript
{
  success: boolean                       // Operation success status
  productId: string                     // Firestore document ID for the created product
  message?: string                      // Optional success/error message
}
```

## Firestore Structure

### Collection Path
```
businesses/{businessId}/products/{productId}
```

### Document Schema
```typescript
{
  name: string                          // Product name (required, trimmed)
  businessId: string                    // Business ID (required)
  ingredients: Array<{                  // Array of ingredients (required, non-empty)
    inventoryItemId: string             // Inventory item document ID (required)
    quantity: number                    // Quantity of ingredient (required, must be > 0)
  }>
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

2. **Product Name**:
   - `name` is **required** and must be non-empty
   - `name` must be trimmed of leading/trailing whitespace
   - Maximum length: **200 characters**
   - Return `400 Bad Request` if missing, empty after trimming, or exceeds max length

3. **Ingredients Array**:
   - `ingredients` is **required** and must be a non-empty array
   - Minimum 1 ingredient required
   - Maximum 100 ingredients allowed (to prevent abuse)
   - Return `400 Bad Request` if empty or exceeds maximum

4. **Ingredient Fields**:
   - Each ingredient must have `inventoryItemId` (string, required, non-empty)
   - Each ingredient must have `quantity` (number, required, must be > 0)
   - `inventoryItemId` must reference a valid inventory item document in `businesses/<businessId>/inventoryItems`
   - The referenced inventory item must have `debitAccount === "Raw Materials"`
   - Return `400 Bad Request` if any ingredient is invalid
   - Return `404 Not Found` if any `inventoryItemId` doesn't exist or is not a Raw Material

5. **Duplicate Ingredients**:
   - The same `inventoryItemId` should not appear multiple times in the ingredients array
   - If duplicates are found, return `400 Bad Request` with a clear error message
   - Alternatively, backend could merge duplicates by summing quantities (specify preference)

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

### Product Creation
Create a product document with:
- `name`: From request body (trimmed, required)
- `businessId`: From request body
- `ingredients`: From request body (array of ingredient objects)
- `createdAt`: Current timestamp as epoch milliseconds (e.g., `Date.now()` or `new Date().getTime()`)
- `updatedAt`: Current timestamp as epoch milliseconds

**Note on Ingredients**:
- Each ingredient references an inventory item by its Firestore document ID
- The `inventoryItemId` should be validated to ensure:
  1. The document exists in `businesses/<businessId>/inventoryItems`
  2. The inventory item has `debitAccount === "Raw Materials"`
- If validation fails for any ingredient, return an error before creating the product

**Note**: 
- All timestamps should be stored as **numbers** (epoch milliseconds), not strings or Firestore Timestamp objects
- Example timestamp format: `1766581722032` (13-digit number)

## Error Handling

The endpoint must return appropriate HTTP status codes:

- `201 Created`: Product successfully created
- `400 Bad Request`: Invalid request body (missing required fields, invalid data types, empty ingredients array, invalid ingredient references, duplicate ingredients)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission for the business
- `404 Not Found`: Business ID doesn't exist, user doesn't have access, or inventory item doesn't exist/is not a Raw Material
- `500 Internal Server Error`: Server error during creation operation

### Error Response Format
```typescript
{
  error: string           // Error message
  code?: string          // Optional error code
  details?: any          // Optional additional error details
}
```

## Example Requests

### Minimal Request
```json
POST /authenticated/transactions3/api/products
Content-Type: application/json

{
  "businessId": "biz_123",
  "name": "Chocolate Cake",
  "ingredients": [
    {
      "inventoryItemId": "inv_item_001",
      "quantity": 2.5
    }
  ]
}
```

### Full Request (Multiple Ingredients)
```json
POST /authenticated/transactions3/api/products
Content-Type: application/json

{
  "businessId": "biz_123",
  "name": "Premium Chocolate Cake",
  "ingredients": [
    {
      "inventoryItemId": "inv_item_001",
      "quantity": 2.5
    },
    {
      "inventoryItemId": "inv_item_002",
      "quantity": 1.0
    },
    {
      "inventoryItemId": "inv_item_003",
      "quantity": 0.5
    }
  ]
}
```

## Example Responses

### Success Response
```json
{
  "success": true,
  "productId": "prod_abc123",
  "message": "Product created successfully"
}
```

### Error Response (Missing Name)
```json
{
  "error": "Invalid request: Product name is required",
  "code": "VALIDATION_ERROR"
}
```

### Error Response (Empty Ingredients)
```json
{
  "error": "Invalid request: At least one ingredient is required",
  "code": "VALIDATION_ERROR"
}
```

### Error Response (Invalid Inventory Item)
```json
{
  "error": "Invalid request: Inventory item 'inv_item_999' not found or is not a Raw Material",
  "code": "INVALID_INGREDIENT",
  "details": {
    "inventoryItemId": "inv_item_999"
  }
}
```

### Error Response (Duplicate Ingredients)
```json
{
  "error": "Invalid request: Duplicate inventory item IDs found in ingredients",
  "code": "DUPLICATE_INGREDIENTS",
  "details": {
    "duplicateIds": ["inv_item_001"]
  }
}
```

## Implementation Summary

### Endpoint
- **Method**: `POST`
- **Path**: `/authenticated/transactions3/api/products`
- **Request Body**: 
  - `businessId` (string, required)
  - `name` (string, required, max 200 chars, trimmed)
  - `ingredients` (array, required, non-empty, min 1, max 100)

### Validation Rules
- `businessId`: Required, non-empty, business must exist
- `name`: Required, non-empty after trimming, max 200 characters
- `ingredients`: Required, non-empty array, min 1 ingredient, max 100 ingredients
- Each ingredient:
  - `inventoryItemId`: Required, non-empty string, must reference valid Raw Material inventory item
  - `quantity`: Required, must be a positive number (> 0)
- No duplicate `inventoryItemId` values in ingredients array

### Authentication & Authorization
- Verify user authentication
- Check business access
- Validate user permissions

### Product Document Fields
- `name`: From request (trimmed, required)
- `businessId`: From request
- `ingredients`: From request (array of ingredient objects)
- `createdAt`: Current epoch milliseconds (number, e.g., `1766581722032`)
- `updatedAt`: Current epoch milliseconds (number)

**Important**: 
- Timestamps must be stored as **numbers** (epoch milliseconds), not strings or Firestore Timestamp objects
- Product name must be trimmed of leading/trailing whitespace
- All ingredient `inventoryItemId` values must reference valid Raw Materials inventory items

### Response
Returns object with: `success` (boolean), `productId` (string), `message` (optional string)

### Error Codes
- `201`: Product successfully created
- `400`: Validation errors
- `401`: Not authenticated
- `403`: Missing permissions
- `404`: Business not found, no access, or inventory item not found/not Raw Material
- `500`: Server error

## Integration Context

### When This Endpoint is Called
This endpoint is called from the Create Product screen when:
1. User enters a product name
2. User adds one or more Raw Materials from inventory (via dropdown selection)
3. User sets quantities for each ingredient
4. User clicks "Create Product" button

### Frontend Integration
The frontend will:
- Validate product name is not empty
- Validate at least one ingredient is added
- Validate all ingredients have valid quantities (> 0)
- Call this endpoint with the product data
- Handle the response (show success message and navigate back on success, show error on failure)

### Raw Materials Selection
- Raw Materials are fetched from `businesses/<businessId>/inventoryItems` collection
- Filtered by `debitAccount === "Raw Materials"`
- Only items with `status === "received"` should be available for selection (or all items - specify preference)
- Each selected material is added to the ingredients array with its `inventoryItemId` and user-entered `quantity`

## Priority
**High** - This is needed to complete the "Create Product" functionality in the Production Management feature. The frontend is ready and waiting for this endpoint with all fields implemented.

## Backend Confirmation Required

**Please confirm that the following will be implemented:**

1. ✅ Endpoint: `POST /authenticated/transactions3/api/products`
2. ✅ Firestore collection: `businesses/<businessId>/products`
3. ✅ Product name is required, trimmed, max 200 characters
4. ✅ Ingredients array is required, non-empty, min 1, max 100 ingredients
5. ✅ Each ingredient has `inventoryItemId` (string) and `quantity` (number > 0)
6. ✅ All `inventoryItemId` values are validated to reference valid Raw Materials inventory items
7. ✅ Duplicate `inventoryItemId` values in ingredients array are rejected (or merged - specify preference)
8. ✅ Additional fields: `businessId`, `createdAt`, `updatedAt` are added
9. ✅ Timestamps are stored as epoch milliseconds (numbers, e.g., `1766581722032`)

**All fields from the Create Product screen will be sent from the frontend and should be persisted to Firestore in the `businesses/<businessId>/products` collection.**

## Questions for Backend Team

1. **Duplicate Ingredients Handling**: Should duplicate `inventoryItemId` values in the ingredients array be:
   - **Option A**: Rejected with a validation error (recommended)
   - **Option B**: Automatically merged by summing quantities

2. **Raw Materials Status**: Should only Raw Materials with `status === "received"` be allowed, or all Raw Materials regardless of status?

3. **Ingredient Quantity Units**: Should the `quantity` field have any unit validation, or is it just a numeric value that represents the amount needed (units can vary per ingredient)?

4. **Product Name Uniqueness**: Should product names be unique per business, or can multiple products have the same name?

