# Invoice SKU Stock Deduction - Backend Implementation Request

**Date**: 2025-01-XX  
**Status**: ✅ **BACKEND IMPLEMENTED** - Ready for Frontend Integration  
**Priority**: Medium  
**Related**: POS Sale SKU Stock Deduction (`POS_SALE_SKU_STOCK_DEDUCTION_ISSUE.md`)

---

## Summary

We need to extend the manual sales (invoice) endpoint to support SKU stock deduction, similar to how the POS endpoint handles it. When creating an invoice with items that have selected product SKUs, the system should validate stock availability and immediately deduct stock from the SKU's inventory.

---

## Current State

### Manual Sales Endpoint (`/authenticated/transactions3/api/sales/manual`)

- Currently accepts **summary-level data only** (customerName, transactionDate, totalAmount, currency, description, reference, incomeAccount, vatAmount)
- Does **NOT** accept item-level details
- Does **NOT** handle stock deduction
- Creates accounting entries: Accounts Receivable (debit), Sales Revenue + VAT Output Tax (credit)

### POS Sales Endpoint (`/authenticated/transactions3/api/sales/pos`)

- Accepts **item-level array** with `productId` and `skuId` fields
- **Validates stock availability** before creating transaction
- **Immediately deducts stock** from SKU when `productId` + `skuId` are provided
- Stock deduction logic is working correctly (when both fields are provided)

---

## Desired State

### Manual Sales Endpoint Extension

Extend `/authenticated/transactions3/api/sales/manual` to accept an optional `items` array that:

1. Allows item-level invoice details
2. Validates SKU stock availability before creating transaction
3. Immediately deducts stock from SKUs (same behavior as POS endpoint)
4. Stores items in `transaction.details.itemList` for invoice PDF generation
5. Maintains backward compatibility (items array is optional)

---

## Technical Details

### Request Format Extension

**Current Request:**

```typescript
{
  businessId: string,
  transactionData: {
    customerName: string
    transactionDate: string
    totalAmount: number
    currency?: string
    description?: string
    reference?: string
    incomeAccount?: string
    vatAmount?: number
  }
}
```

**Extended Request (with items):**

```typescript
{
  businessId: string,
  transactionData: {
    customerName: string
    transactionDate: string
    totalAmount: number
    currency?: string
    description?: string
    reference?: string
    incomeAccount?: string
    vatAmount?: number
    items?: Array<{                    // NEW: Optional items array
      name: string
      price: number
      quantity: number                 // Count of SKU packages
      description?: string
      productId?: string               // Required for SKU stock tracking
      skuId?: string                   // Required for SKU stock tracking (must be provided with productId)
    }>
  }
}
```

### Item Structure

- **Fields match POS endpoint format** (for consistency and code reuse)
- `productId` + `skuId`: Both must be provided together to trigger stock deduction
- `skuId`: Backend accepts SKU id, name, or index (frontend uses SKU name, same as POS)
- `quantity`: Represents count of SKU packages being sold (same as POS)

### Stock Deduction Logic

**Reuse POS endpoint logic:**

1. When `items` array includes items with `productId` + `skuId`:

   - Find the product and SKU
   - Check stock availability: `currentStockOfPrimaryPackages` (or `currentStock` as fallback)
   - Validate `quantity` <= available stock
   - If insufficient stock: **Return error, do NOT create transaction**
   - If sufficient stock: **Immediately deduct** (same as POS)
     - Deduct `quantity` from `currentStockOfPrimaryPackages`
     - Deduct `quantity × sku.size` from `currentStockInPrimaryUnits`

2. **Stock validation should happen BEFORE transaction creation** (all-or-nothing)

3. **No inventory item stock deduction**: Only SKU stock is deducted (not inventory items)

### Example Request

```json
POST /authenticated/transactions3/api/sales/manual

{
  "businessId": "business_123",
  "transactionData": {
    "customerName": "John Doe",
    "transactionDate": "2024-01-15",
    "totalAmount": 1200.00,
    "vatAmount": 200.00,
    "currency": "GBP",
    "reference": "INV-001",
    "incomeAccount": "Sales Revenue",
    "items": [
      {
        "name": "Product A - Large",
        "price": 50.00,
        "quantity": 2,
        "description": "Product A - Large",
        "productId": "product_123",
        "skuId": "Large"
      },
      {
        "name": "Manual Item",
        "price": 100.00,
        "quantity": 1,
        "description": "Manual entry item without SKU"
      }
    ]
  }
}
```

### Example Error Response (Insufficient Stock)

```json
{
  "success": false,
  "error": "Insufficient stock",
  "details": {
    "productId": "product_123",
    "skuId": "Large",
    "requestedQuantity": 2,
    "availableStock": 1
  }
}
```

---

## Questions for Backend Team

### 1. Stock Deduction Logic Reuse

**Q:** Can we reuse the existing POS stock deduction logic/service function for the manual sales endpoint? This would ensure consistency and reduce code duplication.

### 2. Stock Validation Timing

**Q:** Should stock validation happen before transaction creation (fail early, no transaction created), or is there a different preferred approach?

### 3. Error Response Format

**Q:** What format should errors take for insufficient stock? Should it include:

- Which item/SKU failed
- Requested quantity vs available stock
- Should the response allow partial success (some items pass, others fail)?

### 4. Transaction Details Storage

**Q:** When `items` array is provided, should items be automatically stored in `transaction.details.itemList`? This is needed for invoice PDF generation. Is there any special handling required?

### 5. Backward Compatibility

**Q:** Since `items` is optional, can we ensure that existing calls (without items array) continue to work exactly as before? This is critical for backward compatibility.

### 6. Accounting Entries

**Q:** Are there any changes needed to accounting entries when items array is provided? Or does the existing logic (Accounts Receivable debit, Sales Revenue + VAT credit) remain the same?

### 7. SKU Identification

**Q:** The frontend sends SKU name as `skuId` (same as POS endpoint). The backend should accept SKU id, name, or index. Can you confirm this is already supported, or does it need to be added?

### 8. Stock Fields

**Q:** For stock checking, should we use `currentStockOfPrimaryPackages` (preferred) with fallback to `currentStock`, or is there a different field/approach you recommend?

---

## Frontend Implementation Status

**✅ Backend is now ready!** The manual sales endpoint now supports the `items` array with SKU stock deduction.

**Frontend tasks remaining:**

- ✅ Product/SKU selection UI already implemented
- ✅ Invoice items store `selectedProductId` and `selectedSkuId`
- ✅ Stock availability data available from SKU selection
- ⏳ **TODO**: Add stock availability validation before API call
- ⏳ **TODO**: Transform `InvoiceItem[]` to API `items` format and include in request payload
- ⏳ **TODO**: Send `items` array when SKUs are selected (backend is ready to receive it)

**Required frontend changes:**

1. Transform `InvoiceItem[]` to API `items` format (map to: `name`, `price`, `quantity`, `description?`, `productId?`, `skuId?`)
2. Include `items` array in the API request payload to `/authenticated/transactions3/api/sales/manual`
3. Add stock availability validation before submission (optional but recommended)
4. Handle error responses for insufficient stock (400 status with `error: "Insufficient stock"`)

---

## Testing Scenarios

Once implemented, we'll test:

1. ✅ Invoice creation without items array (backward compatibility)
2. ✅ Invoice creation with items array containing SKUs (stock deduction)
3. ✅ Invoice creation with items array containing manual items (no SKU)
4. ✅ Invoice creation with mixed items (some SKU, some manual)
5. ✅ Stock availability validation (insufficient stock error)
6. ✅ Stock deduction verification (stock decreases after invoice)
7. ✅ Accounting entries correctness
8. ✅ Transaction details.itemList storage
9. ✅ Invoice PDF generation with items

---

## Related Documentation

- `POS_SALE_SKU_STOCK_DEDUCTION_ISSUE.md` - POS endpoint stock deduction reference
- `docs/api/TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md` - Current manual sales endpoint docs
- `lib/api/transactions2.ts` - Frontend API client (will be updated after backend)

---

## Next Steps

1. ✅ **Backend Team:** Implementation complete (2026-01-11)
2. ⏳ **Frontend Team:** Update API client and CreateInvoiceScreen to send `items` array
3. ⏳ **QA:** Test stock deduction and validation scenarios

---

## Priority

**Medium** - This feature enables proper inventory management for invoiced sales, ensuring stock levels are accurate when products are sold via invoices (not just POS).
