# Product Manufacturing - Grouped Items Stock Data Issue

## Problem Statement

When manufacturing a product that contains a grouped ingredient (an ingredient that references a grouped inventory item), the backend fails with the error:
```
No stock data available for item Potato
```

This occurs when:
1. A product ingredient references a **grouped inventory item** (an item with `groupedItemIds` array)
2. The grouped item's stock data (`currentStockOfPrimaryPackages`, `currentStockInPrimaryUnits`, `currentStockInMetric`) is not being properly aggregated or accessed
3. The manufacturing endpoint attempts to check stock availability but cannot find stock data on the grouped item

## Expected Behavior

When manufacturing a product with ingredients that reference grouped items:

1. **Stock Data Aggregation**: For grouped items (items with `groupedItemIds` array), the stock data should be aggregated from all contributing items (items referenced in the `groupedItemIds` array)

2. **FIFO Drawdown**: When deducting stock during manufacturing, the system should use FIFO (First In First Out) logic to deduct from the oldest contributing items first, consistent with the stock-take endpoint behavior

3. **Stock Data Access**: The grouped item itself should have aggregated stock values that can be queried, OR the manufacturing endpoint should aggregate stock on-the-fly from contributing items when needed

## Current Issue Details

### Example Scenario
- **Product**: Bread
- **Ingredient**: Potato (grouped item)
  - `inventoryItemId`: "potato_grouped_001"
  - `groupedItemIds`: ["potato_item_001", "potato_item_002", "potato_item_003"]
  - The contributing items have individual stock data:
    - `potato_item_001`: 10 kg
    - `potato_item_002`: 5 kg  
    - `potato_item_003`: 8 kg
  - **Expected aggregated stock**: 23 kg total
- **Manufacturing Request**: Manufacture 100 g of bread
- **Error**: "No stock data available for item Potato"

### Root Cause

The manufacturing endpoint (`POST /authenticated/transactions3/api/products/:productId/manufacture`) is likely:
1. Checking for stock data directly on the grouped item document
2. Not finding stock data because it's not aggregated on the grouped item
3. Not aggregating stock from contributing items before checking availability

## Solution Requirements

### Option 1: Pre-Aggregated Stock (Recommended for Performance)

**When grouped items are created/updated, ensure stock is aggregated on the grouped item:**

```typescript
// Grouped item structure (already exists)
{
  id: "potato_grouped_001",
  name: "Potato",
  groupedItemIds: ["potato_item_001", "potato_item_002", "potato_item_003"],
  isGroupedItem: true,
  
  // ✅ Stock should be aggregated from contributing items
  currentStockOfPrimaryPackages: 23,  // Sum of all contributing items
  currentStockInPrimaryUnits: 23000,  // Sum in primary units (g)
  currentStockInMetric: {
    stock: 23,      // Total in kg
    unit: "kg"
  }
}
```

**Implementation**:
- When grouped items are created via `POST /authenticated/transactions3/api/inventory-items/group`
- When stock-take is performed on contributing items (via stock-take endpoint)
- When stock is updated through any means (stock-take, manufacturing, etc.)
- **Re-aggregate** the grouped item's stock from all contributing items

### Option 2: On-the-Fly Aggregation (Fallback)

**If pre-aggregation is not available, aggregate during manufacturing:**

When the manufacturing endpoint encounters a grouped item:

1. **Fetch contributing items** from `groupedItemIds` array
2. **Aggregate stock values**:
   ```typescript
   // Pseudo-code
   let totalStock = 0
   for (const contributingItemId of groupedItem.groupedItemIds) {
     const contributingItem = await getInventoryItem(contributingItemId)
     totalStock += contributingItem.currentStockInMetric?.stock ?? 0
   }
   ```
3. **Use aggregated stock** for availability checks and manufacturing calculations
4. **Apply FIFO logic** when deducting stock (deduct from oldest contributing items first)

### Option 3: Hybrid Approach (Best Practice)

- **Pre-aggregate** stock on grouped items for read performance
- **Re-verify** by aggregating on-the-fly during manufacturing if stock data is missing or stale
- **Update** the grouped item's stock values after manufacturing to keep them current

## FIFO Drawdown Logic for Manufacturing

When manufacturing with grouped items, use the same FIFO logic as the stock-take endpoint:

1. **Sort contributing items** by `transactionDate` or `createdAt` (oldest first)
2. **Calculate required quantity** for the ingredient based on manufacturing quantity
3. **Deduct from oldest items first** until the required quantity is fulfilled
4. **Update contributing items** with new stock values
5. **Re-aggregate** the grouped item's stock after deduction

### Example FIFO Drawdown

```typescript
// Manufacturing requires 5 kg of Potato
// Contributing items (sorted by date, oldest first):
// - potato_item_001: 10 kg (oldest)
// - potato_item_002: 5 kg
// - potato_item_003: 8 kg (newest)

// FIFO deduction:
// 1. Deduct 5 kg from potato_item_001 → remaining: 5 kg
// 2. No need to deduct from others

// Result:
// - potato_item_001: 5 kg (reduced from 10 kg)
// - potato_item_002: 5 kg (unchanged)
// - potato_item_003: 8 kg (unchanged)
// - Grouped item total: 18 kg (aggregated after deduction)
```

## API Endpoint Behavior

### Current Manufacturing Endpoint

**POST** `/authenticated/transactions3/api/products/:productId/manufacture`

**Request**:
```typescript
{
  businessId: string
  quantity: number
  unit: string
  waste?: number
}
```

**Expected Behavior for Grouped Items**:

1. **For each ingredient** in the product:
   - If ingredient's `inventoryItemId` references a **grouped item** (has `groupedItemIds` array):
     - ✅ Aggregate stock from contributing items (if not pre-aggregated)
     - ✅ Check if aggregated stock is sufficient
     - ✅ Calculate required quantity for this ingredient
     - ✅ Apply FIFO deduction to contributing items
     - ✅ Update contributing items' stock
     - ✅ Re-aggregate grouped item stock
   
   - If ingredient's `inventoryItemId` references a **regular item** (no `groupedItemIds`):
     - ✅ Use existing logic (check stock, deduct, update)

2. **Return appropriate errors**:
   - `404 Not Found`: If grouped item or any contributing item doesn't exist
   - `400 Bad Request`: If aggregated stock is insufficient
   - `400 Bad Request`: If stock data is missing and cannot be aggregated

## Error Handling

### Current Error (Needs Fixing)
```
No stock data available for item Potato
```

### Recommended Error Format

If stock cannot be aggregated:
```json
{
  "success": false,
  "error": "GROUPED_ITEM_STOCK_UNAVAILABLE",
  "message": "No stock data available for grouped item 'Potato'. Contributing items may be missing stock data.",
  "ingredientId": "potato_grouped_001",
  "ingredientName": "Potato",
  "groupedItemIds": ["potato_item_001", "potato_item_002", "potato_item_003"]
}
```

If aggregated stock is insufficient:
```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for ingredient 'Potato'. Required: 5 kg, Available: 3 kg",
  "ingredientId": "potato_grouped_001",
  "ingredientName": "Potato",
  "required": 5,
  "available": 3,
  "unit": "kg"
}
```

## Related Documentation

This issue is related to:

1. **Stock-Take Endpoint** (`docs/backend-requests/INVENTORY_STOCK_TAKE_ENDPOINT.md`):
   - Already implements FIFO logic for grouped items
   - Should serve as reference for manufacturing endpoint

2. **Current Stock Fields** (`docs/backend-requests/INVENTORY_ITEMS_GET_INCLUDE_CURRENT_STOCK.md`):
   - Documents that grouped items should have aggregated stock values
   - States: "The grouped item itself should have `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits` that represent the aggregated total across all contributing items"

3. **Inventory Items Grouping** (`docs/backend-requests/INVENTORY_ITEMS_GET_INCLUDE_GROUPED.md`):
   - Documents how grouped items are structured with `groupedItemIds`
   - Documents how contributing items have `isGrouped: true`

## Testing Requirements

1. **Test grouped item with pre-aggregated stock**:
   - Create a grouped item with aggregated stock values
   - Manufacture product with this grouped ingredient
   - Verify stock is deducted correctly using FIFO

2. **Test grouped item without pre-aggregated stock**:
   - Create a grouped item (stock not aggregated)
   - Manufacture product with this grouped ingredient
   - Verify stock is aggregated on-the-fly and deducted correctly

3. **Test FIFO logic**:
   - Create grouped item with multiple contributing items
   - Manufacture product requiring partial quantity
   - Verify oldest items are deducted first

4. **Test insufficient stock**:
   - Create grouped item with insufficient total stock
   - Attempt to manufacture product
   - Verify appropriate error is returned

5. **Test stock re-aggregation**:
   - Manufacture product with grouped ingredient
   - Verify grouped item's stock values are updated after manufacturing

6. **Test with missing contributing items**:
   - Create grouped item with invalid `groupedItemIds`
   - Attempt to manufacture
   - Verify appropriate error handling

## Implementation Priority

1. **Immediate Fix**: Implement on-the-fly aggregation during manufacturing (Option 2)
2. **Short-term Enhancement**: Implement pre-aggregation on grouped item creation/updates (Option 1)
3. **Long-term**: Implement hybrid approach with caching and verification (Option 3)

## Additional Notes

- The frontend is already fetching grouped items correctly using `screen: 'viewAll'` parameter
- The frontend displays grouped items in the inventory screens
- The issue only manifests when attempting to manufacture products with grouped ingredients
- Stock-take endpoint already handles grouped items correctly (can serve as reference)

