# Inventory Stock-Take Endpoint - RN Integration Guide

## Overview

This endpoint handles stock-take updates for inventory items using FIFO (First In First Out) logic. It supports both single inventory items and grouped items (items that have been merged together).

## Endpoint

**POST** `/authenticated/transactions3/api/inventory-items/stock-take`

## Request Format

```typescript
{
  businessId: string;                    // Required - Business ID
  inventoryItemId: string;               // Required - Inventory item document ID
  stockNumber: number;                   // Required - Stock count (non-negative)
  isInPrimaryUnits?: boolean;            // Optional - If true, stockNumber is in primaryPackaging.unit (e.g., ml, kg); if false, it's number of primary packages (default: false)
}
```

## Request Examples

### Example 1: Stock count in primary packages
```typescript
{
  businessId: "business_xyz",
  inventoryItemId: "item_abc123",
  stockNumber: 10,                       // 10 bottles
  isInPrimaryUnits: false                // false = number of packages
}
```

### Example 2: Stock count in primary units
```typescript
{
  businessId: "business_xyz",
  inventoryItemId: "item_abc123",
  stockNumber: 2750,                     // 2750ml
  isInPrimaryUnits: true                 // true = amount in primaryPackaging.unit
}
```

## Response Format

### Success Response (200)
```typescript
{
  success: true,
  inventoryItemId: string,
  updatedStock: {
    packages: number,                    // Updated stock count in primary packages
    units: number                        // Updated stock count in primary units
  },
  message: "Stock-take completed successfully"
}
```

### Error Responses

#### 400 Bad Request
```typescript
{
  success: false,
  error: string,                         // Error message
  code: "VALIDATION_ERROR" | "MISSING_PACKAGING"
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

## How It Works

### Case A: Grouped Items (Multiple Inventory Items)

If the inventory item has a `groupedItemIds` array (meaning it's a grouped item with multiple contributing items):

1. **Fetches all contributing items** from the `groupedItemIds` array
2. **Calculates total current stock** across all contributing items
3. **Compares target vs current**:
   - **If target < current** (reduction): Uses FIFO to deduct from oldest items first (sorted by `transactionDate` or `createdAt`)
   - **If target > current** (increase): Adds the difference to the most recent item

### Case B: Single Item

If the inventory item has no `groupedItemIds` (single item):

1. **Updates the item directly** with the new stock values
2. **Calculates the other value** automatically:
   - If `isInPrimaryUnits: false` (packages provided), calculates units: `units = packages × primaryPackaging.quantity`
   - If `isInPrimaryUnits: true` (units provided), calculates packages: `packages = units ÷ primaryPackaging.quantity`

## Implementation Example

```typescript
async function performStockTake(
  businessId: string,
  inventoryItemId: string,
  stockNumber: number,
  isInPrimaryUnits: boolean = false,
  token: string
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/inventory-items/stock-take`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          inventoryItemId,
          stockNumber,
          isInPrimaryUnits,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Stock-take failed');
    }

    const data = await response.json();
    
    console.log('Stock-take successful:', {
      packages: data.updatedStock.packages,
      units: data.updatedStock.units,
    });

    return data;
  } catch (error) {
    console.error('Stock-take error:', error);
    throw error;
  }
}
```

## Important Notes

1. **Packaging Data Required**: The inventory item must have `packaging.primaryPackaging` data for stock-take to work. This includes:
   - `primaryPackaging.quantity` (e.g., 275 for 275ml per bottle)
   - `primaryPackaging.unit` (e.g., "ml", "kg", "count")

2. **FIFO Logic**: For grouped items with stock reductions, the system deducts from the oldest items first (based on `transactionDate` or `createdAt`).

3. **Stock Increases**: For grouped items with stock increases, the difference is added to the most recent item.

4. **New Stock Fields**: The endpoint updates two fields on inventory items:
   - `currentStockOfPrimaryPackages`: Number of primary packages
   - `currentStockInPrimaryUnits`: Total amount in primary packaging units

5. **Automatic Initialization**: When inventory items are created (via the POST `/authenticated/transactions3/api/inventory-items` endpoint), these stock fields are automatically initialized based on the packaging data.

## Related Endpoints

- **GET** `/authenticated/transactions3/api/inventory-items` - Retrieve inventory items
- **POST** `/authenticated/transactions3/api/inventory-items` - Create inventory items (auto-initializes stock fields)
- **POST** `/authenticated/transactions3/api/inventory-items/group` - Group inventory items

