# Inventory Items Re-Order Endpoint - RN Integration Guide

## Overview

This endpoint allows users to add re-orders to inventory items. When a user swipes right on an inventory item card, they can confirm to add a re-order entry to that item's `reOrdered` array.

## New Field on InventoryItem

### reOrdered Array

- **Field Name**: `reOrdered`
- **Type**: `Array<{ dateCreated: number, status: 'pending' | 'ordered' | 'received' | 'cancelled' }>`
- **Default Value**: `undefined` (field doesn't exist until first re-order is added)
- **Description**: Array of re-order entries, each containing:
  - `dateCreated`: Timestamp (number) when the re-order was created
  - `status`: Status of the re-order, initially set to `'pending'`

## API Endpoint

### Add Re-Order to Inventory Item

**POST** `/authenticated/transactions3/api/inventory-items/re-order`

## Request Format

```typescript
{
  businessId: string;                    // Required - Business ID
  inventoryItemId: string;               // Required - Inventory item document ID
}
```

## Request Example

```typescript
{
  businessId: "business_xyz",
  inventoryItemId: "item_abc123"
}
```

## Response Format

### Success Response (200)

```typescript
{
  success: true,
  inventoryItemId: string,
  reOrder: {
    dateCreated: number,                 // Timestamp when re-order was created
    status: "pending"                    // Initial status is always "pending"
  },
  message: "Re-order added successfully"
}
```

### Error Responses

#### 400 Bad Request
```typescript
{
  success: false,
  error: string,                         // Error message
  code: "VALIDATION_ERROR" | "MISSING_FIELDS"
}
```

#### 401 Unauthorized
```typescript
{
  error: "Unauthorized"
}
```

#### 403 Forbidden
```typescript
{
  success: false,
  error: string,
  code: "BUSINESS_MISMATCH" | "Access denied"
}
```

#### 404 Not Found
```typescript
{
  success: false,
  error: string,
  code: "ITEM_NOT_FOUND"
}
```

#### 500 Internal Server Error
```typescript
{
  success: false,
  error: string
}
```

## Implementation Details

### Backend Implementation

1. **Validate Input**: Ensure `businessId` and `inventoryItemId` are provided
2. **Verify Access**: Check that the user has access to the business and the inventory item belongs to that business
3. **Create Re-Order Entry**: 
   - Create a new re-order object with:
     - `dateCreated`: Current timestamp (`Date.now()` or equivalent)
     - `status`: `'pending'`
4. **Update Inventory Item**: 
   - If `reOrdered` array doesn't exist, initialize it as an empty array
   - Append the new re-order entry to the `reOrdered` array
   - Update the `updatedAt` timestamp
5. **Return Response**: Return success response with the created re-order entry

### Example Backend Implementation (Pseudocode)

```javascript
async function addReOrder(businessId, inventoryItemId) {
  // 1. Validate input
  if (!businessId || !inventoryItemId) {
    throw new ValidationError('Missing required fields');
  }

  // 2. Verify access and fetch item
  const item = await getInventoryItem(inventoryItemId, businessId);
  if (!item) {
    throw new NotFoundError('Inventory item not found');
  }

  // 3. Create re-order entry
  const reOrder = {
    dateCreated: Date.now(),
    status: 'pending'
  };

  // 4. Update inventory item
  const reOrdered = item.reOrdered || [];
  reOrdered.push(reOrder);

  await updateInventoryItem(inventoryItemId, {
    reOrdered: reOrdered,
    updatedAt: Date.now()
  });

  // 5. Return response
  return {
    success: true,
    inventoryItemId: inventoryItemId,
    reOrder: reOrder,
    message: 'Re-order added successfully'
  };
}
```

## Implementation Example (React Native)

```typescript
async function addReOrder(
  businessId: string,
  inventoryItemId: string,
  token: string
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/inventory-items/re-order`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          inventoryItemId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add re-order');
    }

    const data = await response.json();
    
    console.log('Re-order added successfully:', {
      dateCreated: new Date(data.reOrder.dateCreated),
      status: data.reOrder.status,
    });

    return data;
  } catch (error) {
    console.error('Add re-order error:', error);
    throw error;
  }
}
```

## GET Endpoint Enhancement

The GET endpoint should return the `reOrdered` array as part of the inventory item data:

**GET** `/authenticated/transactions3/api/inventory-items?businessId={businessId}`

The response will include inventory items with the `reOrdered` field (if any re-orders exist):

```typescript
{
  items: [
    {
      id: "item_abc123",
      name: "Product Name",
      // ... other fields
      reOrdered: [
        {
          dateCreated: 1766581722032,
          status: "pending"
        },
        {
          dateCreated: 1766581800000,
          status: "pending"
        }
      ]
    }
  ],
  pagination: { ... }
}
```

## UI Recommendations

1. **Display Re-Orders**: Show the `reOrdered` array in the inventory item detail screen
   - Display each re-order entry with its creation date and status
   - Format dates in a user-friendly way (e.g., "15 January 2025")
   - Show status badges (e.g., "Pending", "Ordered", "Received", "Cancelled")

2. **Swipe Gesture**: 
   - Allow users to swipe right on inventory item cards to initiate a re-order
   - Show a confirmation modal before adding the re-order
   - Provide visual feedback during the API call (loading state)

3. **Status Updates**: 
   - In the future, allow users to update re-order status (e.g., from "pending" to "ordered" to "received")
   - This would require additional endpoints for updating individual re-order entries

## Important Notes

1. **Array Initialization**: The `reOrdered` array should be initialized as an empty array on the first re-order, not as `null` or `undefined`

2. **Status Values**: Currently only `'pending'` is used when creating re-orders. Future status values (`'ordered'`, `'received'`, `'cancelled'`) will be set via status update endpoints

3. **Date Format**: `dateCreated` is stored as a Unix timestamp (number) for consistency with other date fields in the system

4. **Ordering**: Re-orders are appended to the array in chronological order (newest last). Consider sorting by `dateCreated` descending when displaying in the UI

5. **Backward Compatibility**: Existing inventory items without the `reOrdered` field should be handled gracefully (treat as empty array)

## Related Endpoints

- **GET** `/authenticated/transactions3/api/inventory-items` - Retrieve inventory items (includes `reOrdered` array)
- **PATCH** `/authenticated/transactions3/api/inventory-items/[itemId]` - Update inventory item status
- **POST** `/authenticated/transactions3/api/inventory-items/stock-take` - Perform stock-take

## Future Enhancements

1. **Update Re-Order Status**: Endpoint to update individual re-order status
2. **Delete Re-Order**: Endpoint to remove/cancel a re-order entry
3. **Re-Order Details**: Add additional fields like quantity, supplier, expected delivery date, etc.
4. **Re-Order History**: Filter and view re-orders across all inventory items

