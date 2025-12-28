# Inventory Items Group Endpoint Request

## Overview
We need an endpoint to group matching inventory items when a user drags and drops one inventory item card onto another. When two items match (same name and same primary packaging), they should be grouped together by creating a new "grouped" inventory item record and updating both original items to reference the grouped record.

## Current Situation
- **Feature**: Drag-and-drop functionality on Inventory View All screen
- **Frontend**: Users can drag inventory item cards and drop them on other cards
- **Matching Logic**: Items match when they have the same `name` and the same `primaryPackaging` (description, quantity, and unit)
- **Missing**: Backend endpoint to create grouped inventory items and update original items
- **Trigger**: This endpoint should be called when a successful drop occurs (items match)

## Required Endpoint

### Endpoint Specification
```
POST /authenticated/transactions3/api/inventory-items/group
```

### Request Body
```typescript
{
  businessId: string                    // Business ID (required)
  inventoryItemIds: string[]            // Array of inventory item IDs to group (required, must have exactly 2 items)
}
```

### Response
```typescript
{
  success: boolean
  groupedItemId: string                 // ID of the newly created grouped inventory item
  updatedItemIds: string[]              // Array of the original item IDs that were updated
  message?: string                      // Optional success/error message
}
```

## Firestore Operations

### 1. Create New Grouped Inventory Item
- **Collection Path**: `businesses/{businessId}/inventoryItems/{newGroupedItemId}`
- **Document Structure**: 
  - **Minimal structure for now** - only include:
    - `groupedItemIds: string[]` - Array containing both original inventory item IDs (required)
    - `businessId: string` - Business ID (required)
    - `createdAt: number` - Current epoch milliseconds (required)
    - `updatedAt: number` - Current epoch milliseconds (required)
  - **Note**: Do NOT sum quantities, amounts, or other fields. Do NOT copy fields from original items. Do NOT set `isGrouped` on the grouped item itself.

### 2. Update Original Inventory Items
- **Collection Path**: `businesses/{businessId}/inventoryItems/{originalItemId}`
- **For each of the two original items**, add/update:
  - `groupedItemId: string` - Reference to the new grouped item ID (required)
  - `isGrouped: boolean = true` - Flag to indicate this item is part of a group (required - set to `true` for contributing items)
  - `updatedAt: number` - Current epoch milliseconds (required)
  - **Note**: `isGrouped: true` applies to the contributing inventory items, NOT to the grouped item itself

## Validation

1. **Authentication & Authorization**:
   - Verify user is authenticated
   - Verify user has access to the specified business
   - Verify business exists

2. **Request Validation**:
   - `businessId` must be provided and non-empty
   - `inventoryItemIds` must be an array with exactly 2 items
   - Both inventory item IDs must exist in `businesses/{businessId}/inventoryItems`
   - Both items must belong to the same business

3. **Business Logic Validation**:
   - Both items must have the same `name`
   - Both items must have the same `primaryPackaging` (description, quantity, and unit must match)
   - Both items must have the same `debitAccount` (both "Raw Materials" or both "Finished Goods")
   - Items should not already be part of another group (check if `groupedItemId` exists)

## Error Handling

### Error Responses
- **400 Bad Request**: Invalid request body, missing required fields, or validation failures
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User doesn't have access to the business
- **404 Not Found**: Business or inventory items not found
- **409 Conflict**: Items cannot be grouped (already grouped, don't match, etc.)

### Error Response Format
```typescript
{
  success: false
  error: string                        // Error message
  code?: string                        // Error code (e.g., "VALIDATION_ERROR", "ITEMS_DONT_MATCH", "ALREADY_GROUPED")
}
```

## Example Request
```json
{
  "businessId": "PastyExpress_iit54q",
  "inventoryItemIds": [
    "z2jjnfVYqRRDxz58XevZ",
    "rtfzbomdbM5OiStK70JZ"
  ]
}
```

## Example Response (Success)
```json
{
  "success": true,
  "groupedItemId": "newGroupedItemId123",
  "updatedItemIds": [
    "z2jjnfVYqRRDxz58XevZ",
    "rtfzbomdbM5OiStK70JZ"
  ],
  "message": "Inventory items grouped successfully"
}
```

## Example Response (Error - Items Don't Match)
```json
{
  "success": false,
  "error": "Items cannot be grouped: names or primary packaging do not match",
  "code": "ITEMS_DONT_MATCH"
}
```

## Example Response (Error - Already Grouped)
```json
{
  "success": false,
  "error": "One or more items are already part of a group",
  "code": "ALREADY_GROUPED"
}
```

## Notes

1. **Minimal Grouped Item**: For now, the grouped item should only contain:
   - `groupedItemIds` array
   - Standard document metadata (`businessId`, `createdAt`, `updatedAt`)
   - No field aggregation or copying from original items

2. **isGrouped Flag**: 
   - Set `isGrouped: true` on the **contributing inventory items** (the original items being grouped)
   - Do NOT set `isGrouped` on the grouped item itself
   - The grouped item is identified by the presence of `groupedItemIds` array

3. **Idempotency**: Consider checking if these items are already grouped together before creating a new group

4. **Transaction Safety**: Consider using Firestore transactions to ensure atomicity when creating the grouped item and updating both original items

5. **Future Considerations**: 
   - May need to support ungrouping items
   - May need to support adding more items to an existing group
   - May need to handle groups with more than 2 items

