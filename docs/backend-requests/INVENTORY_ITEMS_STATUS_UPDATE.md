# Inventory Items Status Update - RN Integration Guide

## Overview

Inventory items now include a `status` field that tracks whether items have been received. This allows users to mark inventory items as "received" when they physically arrive.

## Status Field

- **Field Name**: `status`
- **Type**: `'pending' | 'received'`
- **Default Value**: `'pending'` (set automatically on creation)
- **User Action**: Can be updated to `'received'` via button click

## API Endpoint

### Update Inventory Item Status

**PATCH** `/authenticated/transactions3/api/inventory-items/[itemId]?businessId={businessId}`

**Request Body:**
```json
{
  "status": "received"
}
```

**Response:**
```json
{
  "success": true,
  "itemId": "item_abc123",
  "status": "received",
  "updatedAt": 1766581722032
}
```

**Error Responses:**
- `400 Bad Request`: Invalid status value (must be 'pending' or 'received')
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have access to business
- `404 Not Found`: Inventory item not found
- `500 Internal Server Error`: Server error

## Implementation Example

```typescript
// Mark inventory item as received
const markAsReceived = async (itemId: string, businessId: string) => {
  try {
    const response = await fetch(
      `/authenticated/transactions3/api/inventory-items/${itemId}?businessId=${businessId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'received',
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update status');
    }

    const result = await response.json();
    console.log('Status updated:', result);
    return result;
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};
```

## UI Recommendation

1. **Display Status**: Show the current status on each inventory item card/list item
   - "Pending" badge/indicator for items with `status: 'pending'`
   - "Received" badge/indicator for items with `status: 'received'`

2. **Action Button**: 
   - Show "Mark as Received" button for items with `status: 'pending'`
   - Hide or disable button for items with `status: 'received'`
   - Show loading state while API call is in progress

3. **Filtering**: 
   - Optionally filter items by status using the GET endpoint's `status` query parameter
   - Example: `GET /inventory-items?businessId=xxx&status=pending`

## GET Endpoint Enhancement

The GET endpoint now supports filtering by status:

**GET** `/authenticated/transactions3/api/inventory-items?businessId={businessId}&status=pending`

**Query Parameters:**
- `status` (optional): Filter by `'pending'` or `'received'`

## Notes

- Status is automatically set to `'pending'` when inventory items are created from transactions
- Status is preserved when inventory items are updated (e.g., when transaction is updated)
- Only `'pending'` and `'received'` are valid status values
- The `updatedAt` timestamp is automatically updated when status changes

