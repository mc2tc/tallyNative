# Inventory Items GET Endpoint - Include Current Stock Fields

## Issue
The GET endpoint for inventory items (`GET /authenticated/transactions3/api/inventory-items`) is not returning the current stock tracking fields (`currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits`) in the response, even though these fields are updated by the stock-take endpoint and should be available on inventory items.

## Current Behavior
When fetching inventory items via the GET endpoint, the response does not include:
- `currentStockOfPrimaryPackages` (undefined/missing)
- `currentStockInPrimaryUnits` (undefined/missing)

## Expected Behavior
The GET endpoint should include these fields in the response for all inventory items that have packaging information:

```typescript
{
  id: string,
  name: string,
  // ... other fields ...
  packaging?: {
    primaryPackaging?: {
      description: string,
      quantity: number,
      unit: string,
      // ...
    },
    totalPrimaryPackages: number,
    // ...
  },
  currentStockOfPrimaryPackages?: number,  // ✅ Should be included
  currentStockInPrimaryUnits?: number,     // ✅ Should be included
  // ... other fields ...
}
```

## Field Definitions

### `currentStockOfPrimaryPackages`
- **Type**: `number | undefined`
- **Description**: The current stock count in primary packages (e.g., number of bottles)
- **Example**: `36` (meaning 36 bottles currently in stock)
- **Initialization**: Should be initialized to `packaging.totalPrimaryPackages` when the item is first created
- **Updates**: Updated by the stock-take endpoint (`POST /authenticated/transactions3/api/inventory-items/stock-take`)

### `currentStockInPrimaryUnits`
- **Type**: `number | undefined`
- **Description**: The current stock count in primary packaging units (e.g., total milliliters)
- **Example**: `9900` (meaning 9900ml currently in stock, where each bottle is 275ml)
- **Calculation**: `currentStockOfPrimaryPackages × primaryPackaging.quantity`
- **Initialization**: Should be initialized when the item is first created based on packaging data
- **Updates**: Updated by the stock-take endpoint

## Use Cases

### Frontend Display Requirements

1. **View All Screen**: Needs to display "currentStock of totalPrimaryPackages" format
   - Example: "36 of 72" (36 bottles currently in stock out of 72 originally purchased)
   - Currently showing only "72" because `currentStockOfPrimaryPackages` is undefined

2. **Detail Screen**: Needs to show separate cards for:
   - Total primary packages (originally purchased): `packaging.totalPrimaryPackages`
   - Current stock (packages): `currentStockOfPrimaryPackages`
   - Current stock (units): `currentStockInPrimaryUnits`

3. **Stock-take Screen**: Needs to show current stock values to allow users to update them

## Special Cases

### Grouped Items
For grouped items (items with `groupedItemIds` array):
- The grouped item itself should have `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits` that represent the aggregated total across all contributing items
- These values should be computed/summed from the contributing items' current stock values
- The frontend will use these aggregated values for display

### Contributing Items
For contributing items (items with `isGrouped === true`):
- These items should also include their individual `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits` values
- Even though they're filtered out from the main inventory list, they may be fetched when viewing grouped item details (`includeGrouped=true`)

## Initialization Behavior

According to the stock-take endpoint documentation, these fields should be automatically initialized when inventory items are created:
> "Automatic Initialization: When inventory items are created (via the POST `/authenticated/transactions3/api/inventory-items` endpoint), these stock fields are automatically initialized based on the packaging data."

**Expected Initialization**:
- `currentStockOfPrimaryPackages` should be set to `packaging.totalPrimaryPackages` initially
- `currentStockInPrimaryUnits` should be set to `packaging.totalPrimaryPackages × packaging.primaryPackaging.quantity` initially

## API Endpoints Affected

This request applies to:
- `GET /authenticated/transactions3/api/inventory-items` - Should include these fields in response items
- All query parameter combinations (debitAccount, screen, includeGrouped, etc.)

### Important Note on Query Parameters

**Issue Observed**: The `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits` fields appear to be available when fetching with `includeGrouped: true`, but may be missing when using `screen: 'viewAll'`. 

**Expected Behavior**: These fields should be included in the response regardless of which query parameters are used:
- ✅ `screen: 'viewAll'` - Should include current stock fields
- ✅ `screen: 'inventory'` - Should include current stock fields  
- ✅ `includeGrouped: true` - Should include current stock fields
- ✅ No special parameters - Should include current stock fields

Please ensure consistent behavior across all parameter combinations.

## Frontend Implementation Status

The frontend is already prepared to receive and use these fields:
- ✅ Type definitions include `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits`
- ✅ Display logic is implemented to show "X of Y" format
- ✅ Fallback to `totalPrimaryPackages` is in place for display purposes, but actual stock values are needed

## Request Summary

**Please update the GET `/authenticated/transactions3/api/inventory-items` endpoint to:**
1. Include `currentStockOfPrimaryPackages` in the response for all items that have packaging data
2. Include `currentStockInPrimaryUnits` in the response for all items that have packaging data
3. Ensure grouped items have aggregated current stock values
4. Ensure contributing items have their individual current stock values when fetched with `includeGrouped=true`

This will enable the frontend to properly display current stock vs. originally purchased stock across all inventory screens.

