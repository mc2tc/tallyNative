# POS Sale Endpoint - Product SKU Support Update

## Summary

The POS sale endpoint (`POST /authenticated/transactions3/api/sales/pos`) has been updated to support product SKU stock tracking. The endpoint now accepts `productId` and `skuId` fields in addition to the existing `inventoryItemId` field.

## What Changed

### New Optional Fields in Request Items

When sending items to the POS sale endpoint, you can now include:

- `productId` (string, optional) - Product ID for product SKU stock tracking
- `skuId` (string, optional) - SKU ID for product SKU stock tracking

**Important**: Both `productId` and `skuId` must be provided together for product SKU stock tracking to work.

### Behavior

1. **Product SKU Stock Tracking**: 
   - If both `productId` and `skuId` are provided, the endpoint will:
     - Find the product and SKU
     - Check if SKU has stock (`currentStockOfPrimaryPackages > 0`)
     - **Only process SKUs with stock** - if `currentStockOfPrimaryPackages = 0`, the item will be added to the transaction without stock deduction
     - Deduct from SKU's `currentStockOfPrimaryPackages` and `currentStockInPrimaryUnits`
     - Use SKU cost data for accounting (from `sku.cost.totalCost` or `sku.cost.productCost`)

2. **Inventory Item Tracking** (unchanged):
   - If `inventoryItemId` is provided, the endpoint continues to track inventory stock levels as before

3. **No Stock Tracking**:
   - If neither `inventoryItemId` nor both `productId`/`skuId` are provided, the item is added without stock tracking

## Example Request

```json
{
  "businessId": "business123",
  "items": [
    {
      "itemId": "item1",
      "name": "Large Coffee",
      "price": 4.50,
      "quantity": 2,
      "productId": "product456",
      "skuId": "sku789"
    },
    {
      "itemId": "item2",
      "name": "Inventory Item",
      "price": 10.00,
      "quantity": 1,
      "inventoryItemId": "inventory123"
    }
  ],
  "payment": {
    "type": "card",
    "subtotal": 19.00,
    "vat": 3.80,
    "total": 22.80
  },
  "metadata": {
    "source": "pos_one_off_item"
  }
}
```

## Implementation Notes for RN Team

1. **When to Include `productId` and `skuId`**:
   - Include these fields when the cart item is a product SKU (not an inventory item)
   - You should already have this information from the product/SKU data structure

2. **Stock Validation**:
   - The backend will only process SKUs with `currentStockOfPrimaryPackages > 0`
   - If a SKU has no stock, the transaction will still succeed, but no stock will be deducted
   - Consider checking SKU stock levels before allowing items to be added to cart

3. **SKU Identification**:
   - The `skuId` can be:
     - The SKU's `id` field (if it exists)
     - The SKU's `name` field
     - The array index (as a string, e.g., "0", "1", "2")

4. **Backward Compatibility**:
   - The endpoint remains backward compatible
   - Existing requests without `productId`/`skuId` will continue to work
   - Only inventory items or non-tracked items will be processed

## Updated Documentation

See `docs/api/transactions3/POS_SALE_TRANSACTION_BACKEND_REQUIREMENTS.md` for complete API documentation.

## Questions?

If you have questions about implementation, please reach out to the backend team.

