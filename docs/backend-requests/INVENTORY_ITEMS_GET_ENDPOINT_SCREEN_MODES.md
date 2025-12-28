# Inventory Items GET Endpoint - Screen Modes Clarification

## Current Implementation
The GET endpoint supports two screen modes via the `screen` query parameter:
- `screen=inventory` - Inventory screen mode
- `screen=viewAll` or omitted - View All screen mode (default)

## Required Behavior

### Main Inventory Screen (`screen=inventory`)
**Purpose**: Display the last 3 individual (non-grouped) transactions by transactionDate

**Filtering**:
- ✅ Include: Individual items (items that are NOT part of a group - no `groupedItemId`, `isGrouped` is not `true`, and no `groupedItemIds` array)
- ❌ Exclude: Grouped items (items with `groupedItemIds` array)
- ❌ Exclude: Contributing items (items with `isGrouped === true`)

**Sorting**: By `transactionDate` descending (most recent first)

**Limit**: Should return all individual items (no limit, or high limit like 10000), as the frontend will take the last 3

**Summary**: Show only standalone, non-grouped inventory items, sorted by transactionDate desc. The frontend will display the top 3.

### View All Screen (`screen=viewAll` or omitted)
**Purpose**: Display all items (both grouped and individual) for detailed viewing

**Filtering**:
- ✅ Include: Individual items (items that are NOT part of a group)
- ✅ Include: Grouped items (items with `groupedItemIds` array - these are aggregated items)
- ❌ Exclude: Contributing items (items with `isGrouped === true`)

**Sorting**: By `transactionDate` or `createdAt` descending (most recent first)

**Pagination**: Normal pagination (default 20, max 100)

**Summary**: Show both grouped items (with aggregated data) and individual items, excluding only contributing items.

## Key Differences

| Aspect | Inventory Screen | View All Screen |
|--------|------------------|-----------------|
| **Grouped Items** | ❌ Excluded | ✅ Included |
| **Individual Items** | ✅ Included | ✅ Included |
| **Contributing Items** | ❌ Excluded | ❌ Excluded |
| **Pagination** | Effectively disabled (high limit) | Normal pagination |
| **Purpose** | Quick overview (last 3) | Full list view |

## Implementation Notes

1. **Individual Item Definition**: An item is "individual" if:
   - It does NOT have `groupedItemId` (not part of a group)
   - It does NOT have `isGrouped === true` (not a contributing item)
   - It does NOT have `groupedItemIds` array (not a grouped item itself)

2. **Grouped Item Definition**: An item is "grouped" if:
   - It has a `groupedItemIds` array (contains IDs of contributing items)

3. **Contributing Item Definition**: An item is "contributing" if:
   - It has `isGrouped === true` (it's part of a group)

## Example Queries

**Inventory Screen**:
```
GET /authenticated/transactions3/api/inventory-items?businessId=xxx&debitAccount=Raw Materials&screen=inventory
```
Returns: Only individual items, sorted by transactionDate desc

**View All Screen**:
```
GET /authenticated/transactions3/api/inventory-items?businessId=xxx&debitAccount=Raw Materials&screen=viewAll
```
Returns: Individual items + grouped items, sorted by transactionDate/createdAt desc, with pagination

