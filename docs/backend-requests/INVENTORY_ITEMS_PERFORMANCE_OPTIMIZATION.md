# Backend Request: Inventory Items Performance Optimization

## Context
The React Native app is experiencing performance issues when loading inventory items:
1. Loading inventory items takes a long time
2. Screen flashes during data fetching
3. Multiple API calls are being made

## Current Frontend Optimizations (Already Implemented)
The frontend has been optimized to:
- Remove unnecessary test API calls
- Add 30-second caching to avoid refetching on every screen focus
- Reduce API limits (from 10000 to 100 items for main screen, 500 for detail screen)
- Fix infinite loop issues in useEffect dependencies

## Backend Optimization Recommendations

### 1. Pagination Support
**Current**: Frontend requests `limit: 100` or `limit: 500` to get all items, then filters client-side.

**Recommendation**: 
- Ensure pagination works correctly with `screen` and `includeGrouped` parameters
- Consider adding a `limit` parameter that respects the screen mode
- For `screen=inventory`, we only need the last 3 items (sorted by date), so a smaller limit would be sufficient

### 2. Response Optimization
**Current**: Backend returns full item objects with all fields.

**Recommendation**:
- Consider adding a `fields` query parameter to return only needed fields
- For the main inventory screen (`screen=inventory`), we only need: `id`, `name`, `amount`, `createdAt`, `transactionDate`, `currency`
- This would reduce payload size significantly

### 3. Database Query Optimization
**Current**: Backend may be doing inefficient queries.

**Recommendation**:
- Ensure database indexes exist on:
  - `businessId` + `debitAccount` + `isGrouped` (for filtering)
  - `businessId` + `debitAccount` + `groupedItemIds` (for excluding grouped items)
  - `createdAt` (for sorting)
- Use compound indexes where possible
- Consider using Firestore composite queries for better performance

### 4. Caching Strategy
**Current**: No backend caching mentioned.

**Recommendation**:
- Consider adding short-term caching (30-60 seconds) for frequently accessed inventory lists
- Cache invalidation on write operations (create, update, group)

### 5. Batch Operations
**Current**: Frontend makes separate API calls for Raw Materials and Finished Goods.

**Recommendation**:
- Consider adding a batch endpoint that returns both Raw Materials and Finished Goods in one call
- This would reduce network round-trips from 2 to 1

## Example Optimized Request
```
GET /authenticated/transactions3/api/inventory-items?
  businessId=xxx&
  debitAccount=Raw+Materials&
  screen=inventory&
  page=1&
  limit=10&
  fields=id,name,amount,createdAt,currency
```

## Notes
- **Do not break existing functionality**: All current parameters and behaviors must continue to work
- **Backward compatibility**: New optimizations should be optional (e.g., `fields` parameter)
- **Testing**: Ensure all three screens continue to work correctly:
  1. InventoryManagementScreen (`screen=inventory`)
  2. InventoryViewAllScreen (`screen=viewAll`)
  3. InventoryItemDetailScreen (`includeGrouped=true`)

## Priority
These optimizations are **performance improvements only**. The current functionality is correct and should not be changed. Focus on:
1. Database query optimization (highest impact)
2. Response size reduction (medium impact)
3. Batch operations (low impact, nice to have)

