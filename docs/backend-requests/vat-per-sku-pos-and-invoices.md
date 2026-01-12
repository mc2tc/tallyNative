## VAT per SKU for POS and Invoices – Frontend Changes

**Date**: 2026-01-12  
**Area**: Products SKUs, POS sale transactions, manual sale invoices

### Overview

The frontend now supports an **optional VAT rate per SKU**, and uses that rate in both:

- Point of Sale checkout calculations.
- Manual sale invoices created in `CreateInvoiceScreen`.

Existing SKUs and flows continue to work because the new field is **fully optional** and default behaviour still assumes 20% where a rate is not provided.

### New / Updated Fields

- **SKU model (products service)**
  - `vatRate?: number`
    - Percentage value, e.g. `20` for 20%.
    - Optional for backward compatibility.
    - Set on the Create SKU screen when “Charge VAT” is enabled for a SKU.

- **POS sale transaction – request items**
  - Each POS line item now includes:
    - Existing:
      - `itemId`
      - `name`
      - `price`
      - `quantity`
      - `description?`
      - `inventoryItemId?`
      - `productId?`
      - `skuId?`
    - **New (optional):**
      - `vatRate?: number` (copied from SKU.vatRate where available)

- **Manual sale invoice – items passed to `transactions2Api.createSaleTransaction`**
  - Existing item fields:
    - `name`
    - `price`
    - `quantity`
    - `description?`
    - `productId?`
    - `skuId?`
  - **New (optional):**
    - `vatRate?: number` (from the selected SKU where present; falls back to 20% in UI only)

- **Manual sale invoice – transaction level**
  - We already send:
    - `totalAmount` (gross, including VAT)
    - `vatAmount?` (sum of VAT for all lines; was previously hard-coded at 20% in the UI)
  - Now `vatAmount` is computed as the sum of **per-line VAT**, using:
    - `lineVat = quantity * unitCost * (vatRate / 100)`
    - `vatRate` from the line item if provided, otherwise `20` (for backwards compatibility).

### Frontend Calculation Behaviour

- **Create SKU**
  - Users can enable “Charge VAT” and enter a VAT percentage.
  - When enabled, `SKU.vatRate` is saved with that percentage.
  - When disabled, `vatRate` is omitted from the SKU payload (field not sent).

- **PointOfSaleScreen**
  - Each SKU-derived product in POS carries `vatRate` from `SKU.vatRate` when present.
  - Cart totals:
    - `subtotal` = sum of `price * quantity` for all items.
    - `vat` = sum of `lineSubtotal * (vatRate / 100)` **only for items where `vatRate > 0`**.
    - `total` = `subtotal + vat`.
  - The `payment` object we send to `createPOSSaleTransaction` still has:
    - `subtotal`, `vat`, `total`.

- **CreateInvoiceScreen**
  - Each invoice line has optional `vatRate`:
    - When a SKU is selected and `SKU.vatRate` exists, we copy that into the item.
    - For manual (non-SKU) lines, `vatRate` is undefined and the UI uses `20` as a default.
  - Line totals:
    - If `hasVat`:
      - `lineTotal = quantity * unitCost * (1 + (vatRate / 100))`
    - Else:
      - `lineTotal = quantity * unitCost`
  - Summary:
    - `subtotal` = sum of `quantity * unitCost`.
    - `vatTotal` = sum of `quantity * unitCost * (vatRate / 100)` for lines with `hasVat`.
    - `grandTotal` = sum of each line’s `total`.
  - `vatAmount` passed to `createSaleTransaction` is this computed `vatTotal`.

### Backend Suggestions

1. **Products / SKUs**
   - Accept and persist `vatRate?: number` on SKU definitions.
   - Ensure that `getProductSkus` returns `vatRate` so that POS and invoice UIs stay in sync with server-side VAT logic.

2. **POS Sale Transaction API**
   - Optionally:
     - Trust the frontend `vat` in `payment` as the tax amount, **or**
     - Recompute `vatAmount` on the backend from line items using `vatRate` and ignore/validate the client-provided value.
   - Consider storing per-line `vatRate` and computed VAT for auditability.

3. **Manual Sale Transactions (Invoices)**
   - Use incoming per-line `vatRate` (when present) to compute:
     - `vatAmount` (and validate versus client-sent value, if desired).
     - Proper postings between Sales Revenue and VAT Output Tax.
   - Continue to support legacy behaviour where `vatRate` is omitted and a global 20% rate is assumed.


