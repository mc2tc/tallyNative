# Inventory Items GET Endpoint - Filtering Issue

## Problem
The GET endpoint for inventory items is returning empty arrays (`{"items": [], "totalItems": 0}`) even though items exist in the Firestore `inventoryItems` collection.

## Current Behavior
When calling:
```
GET /authenticated/transactions3/api/inventory-items?businessId=PastyExpress_iit54q&debitAccount=Raw+Materials&screen=inventory
GET /authenticated/transactions3/api/inventory-items?businessId=PastyExpress_iit54q&debitAccount=Finished+Goods&screen=inventory
```

The API returns:
```json
{
  "items": [],
  "totalItems": 0
}
```

However, items **do exist** in the Firestore collection `businesses/{businessId}/inventoryItems` with the correct `debitAccount` values.

## Expected Behavior for `screen=inventory`

The Inventory Management screen should display **individual (non-grouped) items only**. 

### Items to Include:
- ✅ **Individual items**: Items that are NOT part of any group
  - Do NOT have `groupedItemIds` field (or it's empty/undefined)
  - Do NOT have `isGrouped: true` (not a contributing item)
  - These are standalone inventory items

### Items to Exclude:
- ❌ **Grouped items**: Items that have `groupedItemIds` array (these represent aggregated groups)
- ❌ **Contributing items**: Items that have `isGrouped: true` (these are part of a group)

## Filtering Logic

The correct filtering for `screen=inventory` should be:

```typescript
// Include item if:
// 1. It does NOT have groupedItemIds (or groupedItemIds is empty/undefined)
// 2. It does NOT have isGrouped === true

const shouldInclude = !item.groupedItemIds && item.isGrouped !== true
```

Or more explicitly:

```typescript
// Exclude if it's a grouped item (has groupedItemIds)
if (item.groupedItemIds && item.groupedItemIds.length > 0) {
  return false // Exclude grouped items
}

// Exclude if it's a contributing item (isGrouped === true)
if (item.isGrouped === true) {
  return false // Exclude contributing items
}

// Include all other items (individual/standalone items)
return true
```

## Debugging Steps

1. **Verify items exist in Firestore**: Check that items exist in `businesses/{businessId}/inventoryItems` with:
   - `debitAccount: "Raw Materials"` or `"Finished Goods"`
   - No `groupedItemIds` field (or empty array)
   - `isGrouped` is not `true` (or undefined/false)

2. **Check query filters**: Ensure the Firestore query is:
   - Filtering by `businessId` correctly
   - Filtering by `debitAccount` correctly
   - Not applying incorrect filters that exclude all items

3. **Verify filtering logic**: The `screen=inventory` filter should:
   - Only exclude items with `groupedItemIds` array
   - Only exclude items with `isGrouped === true`
   - Include all other items

## Test Cases

### Test Case 1: Individual Item (Should be included)
```json
{
  "id": "item1",
  "name": "Test Item",
  "debitAccount": "Raw Materials",
  "groupedItemIds": undefined,  // or missing
  "isGrouped": undefined  // or false or missing
}
```
**Expected**: ✅ Included in response

### Test Case 2: Grouped Item (Should be excluded)
```json
{
  "id": "item2",
  "name": "Grouped Item",
  "debitAccount": "Raw Materials",
  "groupedItemIds": ["item1", "item3"],  // Has groupedItemIds
  "isGrouped": undefined
}
```
**Expected**: ❌ Excluded from response

### Test Case 3: Contributing Item (Should be excluded)
```json
{
  "id": "item3",
  "name": "Contributing Item",
  "debitAccount": "Raw Materials",
  "groupedItemIds": undefined,
  "isGrouped": true  // Is a contributing item
}
```
**Expected**: ❌ Excluded from response

### Test Case 4: Individual Item with isGrouped false (Should be included)
```json
{
  "id": "item4",
  "name": "Individual Item",
  "debitAccount": "Finished Goods",
  "groupedItemIds": undefined,
  "isGrouped": false  // Explicitly false, not part of group
}
```
**Expected**: ✅ Included in response

## Current Issue

The backend is likely:
1. Filtering out ALL items incorrectly
2. Applying a filter that excludes items that should be included
3. Not querying Firestore correctly
4. Having an issue with the `screen=inventory` parameter logic

## Request

Please:
1. Check the Firestore query and filters
2. Verify the `screen=inventory` filtering logic matches the requirements above
3. Ensure individual items (without `groupedItemIds` and without `isGrouped: true`) are included
4. Test with the test cases above
5. Add debug logging to see what items are being filtered and why

## Frontend Impact

The Inventory Management screen cannot display any items because the API returns empty arrays. Users see empty "Raw Materials" and "Finished Goods" sections even though items exist in the database.

