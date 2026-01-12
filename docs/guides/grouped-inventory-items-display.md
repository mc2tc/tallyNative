# Displaying Grouped Inventory Items - Frontend Note

## Overview
When displaying grouped inventory items, always use the `name` field directly from the grouped item. The backend now returns grouped items with the `name` field populated, so the frontend should use it directly instead of deriving it from original items.

## Correct Implementation

### ✅ Use the name field directly:
```typescript
const displayName = groupedItem.name; // ✅ Correct - "Brown Onions"
```

### ❌ Do NOT derive the name from grouped items:
```typescript
// ❌ Incorrect - Don't derive from groupedItemIds or original items
const displayName = groupedItems[0]?.name || 'Unknown';
const displayName = getDerivedNameFromGroupedItems(groupedItemIds);
```

## Current Implementation

The following screens already implement this correctly:

### InventoryViewAllScreen.tsx
```typescript
const viewAllItems: InventoryViewAllItem[] = response.items.map((item: InventoryItem) => {
  return {
    id: item.id,
    title: item.name, // ✅ Using name directly from backend
    // ... other fields
  }
})
```

### InventoryItemDetailScreen.tsx
```typescript
const renderItemCard = (itemData: InventoryViewAllItem | InventoryItem, isGroupedItemCard: boolean = false) => {
  if (isGroupedItemCard && 'name' in itemData && !('title' in itemData)) {
    const invItem = itemData as InventoryItem
    displayItem = {
      id: invItem.id,
      title: invItem.name, // ✅ Using name directly from backend
      // ... other fields
    }
  }
}
```

## Backend Behavior

The backend now:
1. Populates the `name` field on grouped inventory items
2. Returns grouped items with a normalized name (e.g., "Brown Onions" instead of "Brown Onions (Large Sacks)")
3. Ensures the `name` field is always present for grouped items

## Best Practices

1. **Always trust the backend `name` field** - The backend handles name normalization and grouping logic
2. **No client-side name derivation** - Don't try to construct names from `groupedItemIds` or original items
3. **Fallback handling** - If `name` is missing (edge case), use a sensible default:
   ```typescript
   const displayName = groupedItem.name || 'Unnamed Item';
   ```

## Related Files
- `screens/InventoryViewAllScreen.tsx` - View All screen implementation
- `screens/InventoryItemDetailScreen.tsx` - Detail screen implementation
- `lib/api/inventory.ts` - Inventory API types and methods

