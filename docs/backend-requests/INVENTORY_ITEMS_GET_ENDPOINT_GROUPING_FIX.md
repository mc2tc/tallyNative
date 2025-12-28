# Inventory Items GET Endpoint - Grouping Filter Fix

## Issue
The GET endpoint for inventory items (`GET /authenticated/transactions3/api/inventory-items`) is incorrectly filtering out individual (non-grouped) items. Only contributing items (`isGrouped: true`) should be filtered out, not regular items.

## Expected Behavior

### Items to Filter Out (Exclude from Response)
- **Contributing items only**: Items where `isGrouped: true` (these are the original items that are part of a group)
- These items should NOT appear in the list because they are represented by the grouped item

### Items to Include (Show in Response)
- **Regular items**: Items that are NOT part of any group (no `groupedItemId` and `isGrouped` is not `true`)
- **Grouped items**: Items that have a `groupedItemIds` array (these represent aggregated groups)

## Current Problem
The endpoint is filtering out individual transactions/items that should be displayed. Regular items (not part of any group) are being incorrectly excluded.

## Filtering Logic

The correct filtering logic should be:

```typescript
// Filter out ONLY contributing items
if (item.isGrouped === true) {
  // Exclude this item - it's a contributing item that's part of a group
  return false
}

// Include all other items:
// - Regular items (isGrouped is false or undefined, no groupedItemId)
// - Grouped items (has groupedItemIds array)
return true
```

## Summary
- **Filter out**: `isGrouped === true` (contributing items)
- **Keep**: All other items (regular items and grouped items with `groupedItemIds`)

The Inventory Management screen should display:
1. All regular inventory items (not part of any group)
2. All grouped items (with aggregated data and `groupedItemIds` array)
3. NO contributing items (`isGrouped: true`)

