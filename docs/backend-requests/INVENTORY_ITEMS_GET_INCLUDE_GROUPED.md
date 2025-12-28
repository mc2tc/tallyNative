# Backend Request: Include Grouped Items in GET Inventory Items Endpoint

## Endpoint
`GET /authenticated/transactions3/api/inventory-items`

## Request
Add a new optional query parameter `includeGrouped` (boolean) to the existing GET endpoint.

## Context: Three Inventory Screens in React Native

The React Native app displays inventory items in three different screens, each with different requirements:

### 1. InventoryManagementScreen (`screen=inventory`)
- **Purpose**: Main inventory screen showing the pipeline
- **Displays**: Only individual (non-grouped) transactions
- **Excludes**: 
  - Grouped items (items with `groupedItemIds` array)
  - Contributing items (items with `isGrouped: true`)
- **Current behavior**: ✅ Correct - uses `screen=inventory` parameter

### 2. InventoryViewAllScreen (`screen=viewAll` or omitted)
- **Purpose**: "View all" screen showing all items in a category
- **Displays**: 
  - Non-grouped transactions (individual items)
  - Aggregate view of grouped transactions (the grouped item itself, not the contributing items)
- **Excludes**: 
  - Contributing items (items with `isGrouped: true`)
- **Current behavior**: ✅ Correct - uses `screen=viewAll` parameter

### 3. InventoryItemDetailScreen (this request)
- **Purpose**: Detail screen for a single inventory item
- **Displays**:
  - For **non-grouped items**: The single item on one card
  - For **grouped items**: A separate card for each contributing item (items referenced in `groupedItemIds`)
- **Requires**: Access to contributing items (items with `isGrouped: true`) that are normally filtered out
- **Current behavior**: ❌ Missing - contributing items are filtered out, so grouped item details cannot display individual cards

## Query Parameter
- **Name**: `includeGrouped`
- **Type**: `boolean` (query parameter, e.g., `includeGrouped=true`)
- **Default**: `false` (maintains current behavior when not specified)
- **Optional**: Yes

## Behavior
When `includeGrouped=true`:
- Include items where `isGrouped === true` in the response (these are the contributing items that are part of a group)
- Still apply other filters (debitAccount, screen, etc.)
- Still exclude items that are part of a group (items with `groupedItemId` field) unless they match other criteria

When `includeGrouped=false` or omitted:
- Current behavior: Exclude items where `isGrouped === true` (no change)
- This maintains the correct behavior for screens 1 and 2 above

## Use Case: InventoryItemDetailScreen
When displaying a grouped item's detail screen:
1. The grouped item has `groupedItemIds: ["itemId1", "itemId2"]` (array of contributing item IDs)
2. We need to fetch the individual contributing items with IDs `itemId1` and `itemId2`
3. These contributing items have `isGrouped: true` and are currently filtered out by the backend
4. With `includeGrouped=true`, these contributing items will be included in the response
5. The screen then displays each contributing item as a separate card

## Example Request
```
GET /authenticated/transactions3/api/inventory-items?businessId=xxx&debitAccount=Finished+Goods&includeGrouped=true&page=1&limit=1000
```

## Notes
- This parameter should work in conjunction with the existing `screen` parameter
- When `screen=inventory`, `includeGrouped` should still be respected (but typically won't be used together)
- When `screen=viewAll`, `includeGrouped` should still be respected (but typically won't be used together)
- The `includeGrouped` parameter is **specifically for the InventoryItemDetailScreen** to fetch contributing items when viewing grouped item details
- Screens 1 and 2 will continue to work as before (they don't use `includeGrouped=true`)

