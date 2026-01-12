# Product Update Endpoint Request

## Overview
We need an endpoint to update existing products in the Production Management feature. When a user edits a product's recipe (ingredients) from the Product Detail screen, the updated product data should be saved to Firestore in the `businesses/<businessId>/products` collection.

## Current Situation
- **Feature**: Product Detail screen with editable Recipe section
- **Frontend**: Screen allows users to add/edit/delete ingredients from a product's recipe
- **Missing**: Backend endpoint to update product data in Firestore
- **Trigger**: This endpoint is called when user clicks "Confirm and Save" button after making changes to ingredients

## Required Endpoint

### Endpoint Specification
```
PATCH /authenticated/transactions3/api/products/{productId}
```

### Query Parameters
- `businessId` (string, required) - Business ID as query parameter

### Request Body
```typescript
{
  name?: string                          // Product name (optional)
  ingredients?: Array<{                  // Array of ingredients (optional)
    inventoryItemId: string              // Inventory item document ID (required)
    quantity: number                     // Quantity of ingredient (required, must be > 0)
    unit?: string                        // Unit of measurement (optional)
    skus?: {                             // SKUs map (optional)
      [skuId: string]: {
        name: string                     // SKU name (required)
        quantity: number                 // SKU quantity (required, must be > 0)
        unit: string                     // SKU unit (required)
        ancillaryItems?: Array<{         // Ancillary items (optional)
          name: string                   // Ancillary item name (required)
          quantity: number              // Ancillary item quantity (required, must be > 0)
          unit: string                  // Ancillary item unit (required)
          stock?: number                 // Ancillary item stock (optional, non-negative)
        }>
      }
    }
  }>
  stock?: number                         // Product stock quantity (optional, non-negative)
}
```

**Note**: All fields in the request body are optional. Only provided fields will be updated. This allows partial updates (e.g., updating only ingredients without changing the name).

### Response Structure

```typescript
{
  success: boolean                       // Operation success status
  productId: string                     // Firestore document ID for the updated product
  message?: string                      // Optional success/error message
}
```

## Firestore Structure

### Collection Path
```
businesses/{businessId}/products/{productId}
```

### Document Schema (Updated Fields)
The endpoint should update the following fields in the existing product document:

```typescript
{
  name?: string                          // Product name (if provided, trimmed)
  ingredients?: Array<{                  // Array of ingredients (if provided)
    inventoryItemId: string              // Inventory item document ID (required)
    quantity: number                     // Quantity of ingredient (required, must be > 0)
    unit?: string                        // Unit of measurement (optional)
    skus?: {                             // SKUs map (optional)
      [skuId: string]: {
        name: string                     // SKU name (required)
        quantity: number                 // SKU quantity (required, must be > 0)
        unit: string                     // SKU unit (required)
        ancillaryItems?: Array<{         // Ancillary items (optional)
          name: string                   // Ancillary item name (required)
          quantity: number              // Ancillary item quantity (required, must be > 0)
          unit: string                  // Ancillary item unit (required)
          stock?: number                 // Ancillary item stock (optional, non-negative)
        }>
      }
    }
  }>
  stock?: number                         // Product stock quantity (optional, non-negative)
  updatedAt: number                     // Last update timestamp (epoch milliseconds) - ALWAYS updated
}
```

**Important**: The `updatedAt` field should ALWAYS be updated to the current timestamp, even if only partial fields are being updated.

## Business Logic Requirements

### Validation

1. **Product ID**:
   - `productId` in URL path is **required** and must be non-empty
   - Product must exist in Firestore at `businesses/<businessId>/products/<productId>`
   - Return `404 Not Found` if product doesn't exist

2. **Business ID**:
   - `businessId` query parameter is **required** and must be non-empty
   - Business must exist in Firestore
   - Product must belong to the specified business
   - Return `400 Bad Request` if missing or invalid
   - Return `404 Not Found` if business doesn't exist or product doesn't belong to business

3. **Product Name** (if provided):
   - `name` must be non-empty if provided
   - `name` must be trimmed of leading/trailing whitespace
   - Maximum length: **200 characters**
   - Return `400 Bad Request` if empty after trimming or exceeds max length

4. **Ingredients Array** (if provided):
   - `ingredients` must be a non-empty array if provided
   - Minimum 1 ingredient required if array is provided
   - Maximum 100 ingredients allowed (to prevent abuse)
   - Return `400 Bad Request` if empty array or exceeds maximum

5. **Ingredient Fields** (if ingredients provided):
   - Each ingredient must have `inventoryItemId` (string, required, non-empty)
   - Each ingredient must have `quantity` (number, required, must be > 0)
   - `inventoryItemId` must reference a valid inventory item document in `businesses/<businessId>/inventoryItems`
   - The referenced inventory item must have `debitAccount === "Raw Materials"`
   - Return `400 Bad Request` if any ingredient is invalid
   - Return `404 Not Found` if any `inventoryItemId` doesn't exist or is not a Raw Material

6. **Duplicate Ingredients** (if ingredients provided):
   - The same `inventoryItemId` should not appear multiple times in the ingredients array
   - If duplicates are found, return `400 Bad Request` with a clear error message

7. **Stock** (if provided):
   - `stock` must be a non-negative number (>= 0) if provided
   - Return `400 Bad Request` if negative

8. **SKUs** (if provided in ingredients):
   - Each SKU must have `name` (string, required, non-empty)
   - Each SKU must have `quantity` (number, required, must be > 0)
   - Each SKU must have `unit` (string, required, non-empty)
   - Return `400 Bad Request` if any SKU is invalid

9. **Ancillary Items** (if provided in SKUs):
   - Each ancillary item must have `name` (string, required, non-empty)
   - Each ancillary item must have `quantity` (number, required, must be > 0)
   - Each ancillary item must have `unit` (string, required, non-empty)
   - `stock` must be non-negative if provided
   - Return `400 Bad Request` if any ancillary item is invalid

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

### Product Update Logic

1. **Partial Updates**:
   - Only update fields that are provided in the request body
   - Use conditional spreading to include only defined fields
   - Example: If only `ingredients` is provided, only update `ingredients` and `updatedAt`

2. **Field Updates**:
   - If `name` is provided: Update `name` (trimmed) and `updatedAt`
   - If `ingredients` is provided: Replace entire `ingredients` array and update `updatedAt`
   - If `stock` is provided: Update `stock` and `updatedAt`
   - Always update `updatedAt` to current timestamp (epoch milliseconds)

3. **Timestamp Format**:
   - `updatedAt` must be stored as **number** (epoch milliseconds), not string or Firestore Timestamp
   - Example: `1766581722032` (13-digit number)

## Error Handling

The endpoint must return appropriate HTTP status codes:

- `200 OK`: Product successfully updated
- `400 Bad Request`: Invalid request body (invalid data types, empty ingredients array, invalid ingredient references, duplicate ingredients, negative stock, invalid SKUs/ancillary items)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission for the business
- `404 Not Found`: Product ID doesn't exist, business ID doesn't exist, user doesn't have access, or inventory item doesn't exist/is not a Raw Material
- `500 Internal Server Error`: Server error during update operation

### Error Response Format
```typescript
{
  error: string           // Error message
  code?: string          // Optional error code
  details?: any          // Optional additional error details
}
```

## Example Requests

### Update Ingredients Only
```json
PATCH /authenticated/transactions3/api/products/prod_abc123?businessId=biz_123
Content-Type: application/json

{
  "ingredients": [
    {
      "inventoryItemId": "inv_item_001",
      "quantity": 2.5,
      "unit": "kg"
    },
    {
      "inventoryItemId": "inv_item_002",
      "quantity": 1.0,
      "unit": "L"
    }
  ]
}
```

### Update Name and Stock
```json
PATCH /authenticated/transactions3/api/products/prod_abc123?businessId=biz_123
Content-Type: application/json

{
  "name": "Updated Product Name",
  "stock": 50
}
```

### Update All Fields
```json
PATCH /authenticated/transactions3/api/products/prod_abc123?businessId=biz_123
Content-Type: application/json

{
  "name": "Premium Chocolate Cake",
  "ingredients": [
    {
      "inventoryItemId": "inv_item_001",
      "quantity": 2.5,
      "unit": "kg"
    },
    {
      "inventoryItemId": "inv_item_002",
      "quantity": 1.0,
      "unit": "L",
      "skus": {
        "sku_001": {
          "name": "Premium SKU",
          "quantity": 10,
          "unit": "pieces",
          "ancillaryItems": [
            {
              "name": "Packaging",
              "quantity": 1,
              "unit": "box",
              "stock": 5
            }
          ]
        }
      }
    }
  ],
  "stock": 100
}
```

## Example Responses

### Success Response
```json
{
  "success": true,
  "productId": "prod_abc123",
  "message": "Product updated successfully"
}
```

### Error Response (Product Not Found)
```json
{
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND"
}
```

### Error Response (Invalid Ingredients)
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

## Implementation Summary

### Endpoint
- **Method**: `PATCH`
- **Path**: `/authenticated/transactions3/api/products/{productId}`
- **Query Parameters**: `businessId` (string, required)
- **Request Body**: 
  - `name` (string, optional, max 200 chars, trimmed)
  - `ingredients` (array, optional, non-empty if provided, min 1, max 100)
  - `stock` (number, optional, non-negative)

### Validation Rules
- `productId`: Required in URL path, product must exist
- `businessId`: Required query parameter, business must exist, product must belong to business
- `name`: Optional, if provided: non-empty after trimming, max 200 characters
- `ingredients`: Optional, if provided: non-empty array, min 1 ingredient, max 100 ingredients
- Each ingredient:
  - `inventoryItemId`: Required, non-empty string, must reference valid Raw Material inventory item
  - `quantity`: Required, must be a positive number (> 0)
  - `unit`: Optional string
  - `skus`: Optional map with SKU objects
- `stock`: Optional, if provided: must be non-negative (>= 0)
- No duplicate `inventoryItemId` values in ingredients array

### Authentication & Authorization
- Verify user authentication
- Check business access
- Validate user permissions

### Product Update Logic
- Only update fields that are provided in request body
- Always update `updatedAt` to current epoch milliseconds (number)
- Use conditional spreading to include only defined fields

### Response
Returns object with: `success` (boolean), `productId` (string), `message` (optional string)

### Error Codes
- `200`: Product successfully updated
- `400`: Validation errors
- `401`: Not authenticated
- `403`: Missing permissions
- `404`: Product not found, business not found, no access, or inventory item not found/not Raw Material
- `500`: Server error

## Integration Context

### When This Endpoint is Called
This endpoint is called from the Product Detail screen when:
1. User views a product's details
2. User adds/edits/deletes ingredients in the Recipe section
3. User clicks "Confirm and Save" button

### Frontend Integration
The frontend will:
- Track changes to ingredients in local state (`editableIngredients`)
- Validate that at least one ingredient exists before saving
- Call this endpoint with only the `ingredients` field (and `businessId` as query param)
- Handle the response (show success message and navigate back on success, show error on failure)

### Current Frontend Implementation
The frontend currently sends:
```typescript
{
  businessId: string,  // As query parameter
  ingredients: ProductIngredient[]  // Updated ingredients array
}
```

**Note**: The frontend currently only sends `ingredients` in the request body. The endpoint should support partial updates, so this is correct behavior.

## Priority
**High** - This is needed to complete the "Edit Product Recipe" functionality in the Production Management feature. The frontend is ready and waiting for this endpoint. Currently receiving 404 errors when attempting to update products.

## Backend Confirmation Required

**Please confirm that the following will be implemented:**

1. ✅ Endpoint: `PATCH /authenticated/transactions3/api/products/{productId}?businessId={businessId}`
2. ✅ Firestore collection: `businesses/<businessId>/products/{productId}`
3. ✅ Support partial updates (only update fields provided in request body)
4. ✅ Product name is optional, if provided: trimmed, max 200 characters
5. ✅ Ingredients array is optional, if provided: non-empty, min 1, max 100 ingredients
6. ✅ Each ingredient has `inventoryItemId` (string) and `quantity` (number > 0)
7. ✅ Each ingredient can have optional `unit` (string)
8. ✅ Each ingredient can have optional `skus` map with SKU objects
9. ✅ SKUs can have optional `ancillaryItems` array
10. ✅ All `inventoryItemId` values are validated to reference valid Raw Materials inventory items
11. ✅ Duplicate `inventoryItemId` values in ingredients array are rejected
12. ✅ Stock field is optional, if provided: must be non-negative
13. ✅ `updatedAt` field is ALWAYS updated to current epoch milliseconds (number)
14. ✅ Timestamps are stored as epoch milliseconds (numbers, e.g., `1766581722032`)

**The frontend is currently calling this endpoint and receiving 404 errors, indicating the endpoint does not exist yet.**

## Questions for Backend Team

1. **Partial Updates**: Should the endpoint support updating individual fields (e.g., only `ingredients`) without requiring all fields? (Frontend expects this behavior)

2. **Ingredient Validation**: Should the same validation rules apply as the create endpoint (e.g., must be Raw Materials, no duplicates)?

3. **Stock Field**: Should `stock` be updated separately, or should it be part of a different endpoint/flow?

4. **SKUs and Ancillary Items**: Should these be validated the same way as in the create endpoint, or are there additional validation rules for updates?

