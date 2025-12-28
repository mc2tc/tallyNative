# Inventory Items Cost Calculations - Backend Update Required

## Summary
The inventory items save endpoint (`POST /authenticated/transactions3/api/inventory-items`) now needs to accept and save:
1. Two additional cost calculation fields when packaging data is present
2. Two transaction summary fields (`thirdPartyName` and `transactionDate`) from the source transaction

## New Fields

### 1. `costPerPrimaryPackage` (number, optional)
- **Calculation**: `amount / totalPrimaryPackages`
- **Description**: Cost per individual primary package (e.g., cost per bottle, cost per box)
- **Example**: If total amount is £1275.00 and there are 10 primary packages, cost per package = £127.50
- **When Included**: Only when packaging data is present and `totalPrimaryPackages > 0`

### 2. `costPerPrimaryPackagingUnit` (number, optional)
- **Calculation**: `amount / (totalPrimaryPackages * primaryPackaging.quantity)`
- **Description**: Cost per unit of the primary packaging measurement (e.g., cost per ml, cost per kg, cost per gram)
- **Example**: If total amount is £1275.00, 10 packages, and 500 ml per package, cost per ml = £0.2550
- **When Included**: Only when packaging data is present, `totalPrimaryPackages > 0`, and `primaryPackaging.quantity > 0`

## Request Body Update

The request body schema now includes these optional fields:

```typescript
{
  businessId: string
  transactionId: string
  items: Array<{
    // ... existing fields ...
    packaging?: { /* packaging data */ }
    costPerPrimaryPackage?: number       // NEW
    costPerPrimaryPackagingUnit?: number // NEW
    thirdPartyName?: string              // NEW - from tx.summary.thirdPartyName
    transactionDate?: number            // NEW - from tx.summary.transactionDate (epoch milliseconds)
  }>
}
```

## Firestore Document Update

These fields should be saved to the Firestore document in `businesses/{businessId}/inventoryItems/{itemId}`:

```typescript
{
  // ... existing fields ...
  packaging?: { /* packaging data */ }
  costPerPrimaryPackage?: number       // NEW - save as number
  costPerPrimaryPackagingUnit?: number // NEW - save as number
  thirdPartyName?: string              // NEW - save as string
  transactionDate?: number              // NEW - save as number (epoch milliseconds)
  businessId: string
  transactionId: string
  createdAt: number
  updatedAt: number
}
```

## New Fields

### 3. `thirdPartyName` (string, optional)
- **Source**: `tx.summary.thirdPartyName` from the source transaction
- **Description**: The supplier/vendor name from the transaction
- **When Included**: Only when saving from ManageStock screen (where transaction data is available)
- **Example**: "ABC Suppliers Ltd"

### 4. `transactionDate` (number, optional)
- **Source**: `tx.summary.transactionDate` from the source transaction
- **Description**: The date of the source transaction
- **Format**: Epoch milliseconds (number, e.g., `1766581722032`)
- **When Included**: Only when saving from ManageStock screen (where transaction data is available)

## Implementation Requirements

1. **Accept all new fields** in the request body (all are optional)
2. **Save cost fields** to Firestore as numbers (not strings)
3. **Save thirdPartyName** as string
4. **Save transactionDate** as number (epoch milliseconds)
5. **Only save if provided** - don't save null/undefined values
6. **No validation needed** - calculations are performed on the frontend and sent pre-calculated
7. **Backward compatible** - existing requests without these fields should continue to work

## Example Request

```json
{
  "businessId": "biz_123",
  "transactionId": "txn_abc456",
  "items": [
    {
      "name": "Steel Sheets",
      "amount": 1275.00,
      "debitAccount": "Raw Materials",
      "packaging": {
        "primaryPackaging": {
          "description": "Bottle",
          "quantity": 500,
          "unit": "ml"
        },
        "totalPrimaryPackages": 10,
        "orderQuantity": 50,
        "orderPackagingLevel": "secondary"
      },
      "costPerPrimaryPackage": 127.50,
      "costPerPrimaryPackagingUnit": 0.2550,
      "thirdPartyName": "ABC Suppliers Ltd",
      "transactionDate": 1766581722032
    }
  ]
}
```

## Full Documentation
See `INVENTORY_ITEMS_SAVE_ENDPOINT.md` for complete endpoint documentation including all fields and validation rules.

## Priority
**Medium** - This is an enhancement to existing functionality. The endpoint should continue to work for requests without these fields (backward compatible).

