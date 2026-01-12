# POS Sale - SKU Stock Not Deducting Issue

## Overview
When processing POS sales that include product SKUs, the stock is not being deducted from the SKU's `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits` fields, even though the transaction completes successfully.

## Issue Description

### Current Behavior
1. User adds stock to a SKU via the "Add Stock" modal (works correctly - stock is added)
2. SKU appears in POS screen with correct stock count displayed
3. User sells the SKU via POS (transaction completes successfully)
4. **Stock is NOT deducted from the SKU** - stock count remains the same after sale

### Expected Behavior
When a POS sale includes items with `productId` and `skuId`, the backend should:
1. Find the product and SKU
2. Verify SKU has stock (`currentStockOfPrimaryPackages > 0`)
3. Deduct `quantity` (count of packages sold) from `currentStockOfPrimaryPackages`
4. Deduct `quantity × sku.size` from `currentStockInPrimaryUnits`
5. Update the SKU stock levels in the database

## Frontend Implementation

### What We're Sending
The frontend is correctly sending the following request structure:

```json
{
  "businessId": "Ockkz5xJ5RrpN4sXFwCS",
  "items": [
    {
      "itemId": "Ockkz5xJ5RrpN4sXFwCS-Small",
      "name": "Test Product - Small",
      "price": 12.99,
      "quantity": 1,
      "productId": "Ockkz5xJ5RrpN4sXFwCS",
      "skuId": "Small"
    }
  ],
  "payment": {
    "type": "cash",
    "subtotal": 12.99,
    "vat": 2.60,
    "total": 15.59
  },
  "metadata": {
    "source": "pos_one_off_item"
  }
}
```

### Frontend Logs (Confirmed Working)
```
LOG  [POS] loadProducts: Added 1 SKU products for product Ockkz5xJ5RrpN4sXFwCS
LOG  [POS] loadProducts: Total product SKU products: 1
LOG  [POS] loadProducts: Total products loaded: {"inventory": 0, "oneOff": 0, "productSkus": 1, "total": 1}
```

The frontend logs confirm:
- ✅ Products are being loaded correctly
- ✅ SKU data is being retrieved successfully
- ✅ `productId` and `skuId` are being sent in the request
- ✅ Transaction completes successfully (no errors returned)

### SKU Identification
The frontend is using SKU `name` as the `skuId` (e.g., "Small", "Medium", "Large") which should be supported according to the documentation. The backend should accept:
- SKU's `id` field (if exists)
- SKU's `name` field ← **We're using this**
- SKU's array index (as string)

## Backend Investigation Needed

### Questions for Backend Team
1. **Is the SKU being found correctly?**
   - When `productId: "Ockkz5xJ5RrpN4sXFwCS"` and `skuId: "Small"` are provided, is the backend successfully locating the SKU?

2. **Is stock deduction logic being executed?**
   - Are there any conditions that prevent stock deduction even when stock exists?
   - Is there an error being silently caught/ignored?

3. **Quantity interpretation:**
   - The `quantity` field represents the **count of SKU packages** being sold (e.g., `quantity: 1` = 1 package)
   - Is this being correctly interpreted for stock deduction?
   - Should we deduct: `quantity` from `currentStockOfPrimaryPackages` and `quantity × sku.size` from `currentStockInPrimaryUnits`?

4. **Transaction vs Stock Update:**
   - Is the transaction being created before or after stock deduction?
   - Could there be a rollback issue where transaction succeeds but stock update fails?

5. **Stock validation:**
   - The documentation states: "Only process SKUs with stock - if `currentStockOfPrimaryPackages = 0`, the item will be added without stock deduction"
   - What happens when `currentStockOfPrimaryPackages > 0`? Should stock always be deducted?

## Example Test Case

### Setup
1. Product ID: `Ockkz5xJ5RrpN4sXFwCS`
2. SKU Name: `Small`
3. Initial Stock: `currentStockOfPrimaryPackages = 5`
4. SKU Size: `250` (unit: `g`)

### POS Sale Request
```json
{
  "businessId": "Ockkz5xJ5RrpN4sXFwCS",
  "items": [{
    "itemId": "Ockkz5xJ5RrpN4sXFwCS-Small",
    "name": "Test Product - Small",
    "price": 12.99,
    "quantity": 1,
    "productId": "Ockkz5xJ5RrpN4sXFwCS",
    "skuId": "Small"
  }],
  "payment": {
    "type": "cash",
    "subtotal": 12.99,
    "vat": 2.60,
    "total": 15.59
  }
}
```

### Expected Result After Sale
- `currentStockOfPrimaryPackages` should be: `4` (5 - 1)
- `currentStockInPrimaryUnits` should be: `1000` (if it was 1250, then 1250 - 250)
- Transaction should exist in system
- POS screen should show updated stock: `4`

### Actual Result
- `currentStockOfPrimaryPackages` remains: `5` ❌
- `currentStockInPrimaryUnits` remains unchanged ❌
- Transaction exists ✅
- POS screen still shows: `5` ❌

## Additional Context

### Related Endpoints
- `POST /authenticated/transactions3/api/products/{productId}/skus/{skuId}/add-stock` - ✅ **Works correctly** (stock is added successfully)
- `GET /authenticated/transactions3/api/products/{productId}/skus` - ✅ **Works correctly** (returns updated stock after adding)
- `POST /authenticated/transactions3/api/sales/pos` - ❌ **Issue here** (stock not deducted on sale)

### Frontend Code Location
- `screens/PointOfSaleScreen.tsx` - POS sale transaction handling
- `lib/api/transactions2.ts` - POS sale API client
- Request payload construction: Lines 307-324 in `PointOfSaleScreen.tsx`

## Request
Please investigate the POS sale endpoint (`POST /authenticated/transactions3/api/sales/pos`) to determine why SKU stock is not being deducted when both `productId` and `skuId` are provided in the request items.

## Priority
**High** - This blocks proper inventory management for product SKUs in the POS system.

## Additional Notes
- The frontend is correctly implementing the API as documented in `POS_SALE_PRODUCT_SKU_UPDATE.md`
- Stock addition works perfectly, so the SKU data structure and identification should be correct
- The issue appears to be specifically with stock deduction during POS sales
- No errors are being returned from the API, suggesting the issue may be silent or in post-transaction processing

