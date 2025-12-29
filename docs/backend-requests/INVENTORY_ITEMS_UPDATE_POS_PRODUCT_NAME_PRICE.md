# Inventory Items - Update POS Product Name and Price

## Summary

We need an endpoint to update POS-specific product name and price for inventory items. These values should be displayed in the Point of Sale (POS) screen instead of the inventory item's name and cost, allowing businesses to customize how products appear and are priced for POS sales.

## Current Behavior

Currently, the POS screen displays:
- Inventory item's `name` field
- Inventory item's `costPerPrimaryPackage` (or calculated from `amount / totalPrimaryPackages`)

These are the raw inventory values, which may not be suitable for POS display (e.g., internal product codes, cost prices vs. selling prices).

## Required Changes

### 1. New Fields on InventoryItem

Add two optional fields to the InventoryItem model:
- `posProductName?: string` - Custom product name for POS display
- `posProductPrice?: number` - Custom product price for POS display (per primary package)

### 2. New Endpoint

**Endpoint:** `PATCH /authenticated/transactions3/api/inventory-items/{inventoryItemId}/pos-product`

**Request Body:**
```json
{
  "businessId": "string",
  "posProductName": "string (optional)",
  "posProductPrice": "number (optional, must be > 0 if provided)"
}
```

**Response:**
```json
{
  "success": true,
  "inventoryItemId": "string",
  "updatedFields": {
    "posProductName": "string | null",
    "posProductPrice": "number | null"
  },
  "message": "POS product details updated successfully"
}
```

**Validation:**
- `posProductPrice` must be a positive number if provided
- Both fields are optional - can update one or both
- Setting a field to `null` or empty string should clear/reset that field to use the default inventory values

### 3. Update GET Inventory Items Endpoint

Ensure the `GET /authenticated/transactions3/api/inventory-items` endpoint returns these new fields in the response.

## POS Display Logic

When displaying inventory items in POS:
1. If `posProductName` is set, use it; otherwise use `name`
2. If `posProductPrice` is set, use it; otherwise use `costPerPrimaryPackage` (or calculated value)

## Use Case

A business receives inventory items with technical/internal names (e.g., "RM-2024-001") and cost prices. They want to:
- Display user-friendly names in POS (e.g., "Premium Coffee Beans")
- Set selling prices different from cost prices (e.g., cost: £10.00, POS price: £15.00)

## Frontend Implementation Notes

The frontend will:
1. Call this endpoint when saving edits in the POS Edit Item screen
2. Update the local state to reflect changes immediately
3. Display `posProductName` and `posProductPrice` in POS when available, falling back to default values

## Error Handling

Expected error responses:
- 404: Inventory item not found
- 400: Invalid input (e.g., negative price, invalid businessId)
- 401/403: Authentication/authorization errors
- 500: Server error

## Priority

Medium - Enhances POS functionality but not blocking current features.

