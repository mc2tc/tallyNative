# Product Cost Calculation Unit Conversion Issue

## Overview
There is an error in the cost calculation for products when ingredients are converted to different units during product creation. The issue occurs when some ingredients are converted to different units (e.g., grams to kilograms) while others remain in their original units, resulting in incorrect cost calculations.

## Issue Description

### Scenario
1. User creates a product and enters all ingredients in **grams** (g)
2. Backend converts some ingredients to **kilograms** (kg) and leaves others in **grams** (g) to match inventory item packaging units
3. The `costPerUnit` calculation appears to be incorrect, likely due to mixing units without proper cost basis conversion

### Example
- Ingredient A: User enters 500g → Backend converts to 0.5kg
- Ingredient B: User enters 250g → Backend keeps as 250g
- Ingredient C: User enters 100g → Backend converts to 0.1kg

**Problem**: When calculating the total cost of the product, the backend appears to be using the converted quantities directly without ensuring all costs are normalized to a common unit base for proper calculation.

## Current Behavior

### Frontend Request (CreateProductScreen.tsx)
When creating a product, the frontend sends:
```typescript
{
  businessId: string,
  name: string,
  ingredients: [
    {
      inventoryItemId: string,
      quantity: number,  // e.g., 500 (user entered in grams)
      unit?: string      // e.g., "g"
    }
  ]
}
```

### Backend Response
The backend returns:
```typescript
{
  success: boolean,
  productId: string,
  unitConversions?: [
    {
      inventoryItemId: string,
      originalQuantity: number,    // e.g., 500
      originalUnit: string,        // e.g., "g"
      convertedQuantity: number,   // e.g., 0.5
      convertedUnit: string        // e.g., "kg"
    }
  ],
  note?: string
}
```

The product is created with `costPerUnit` and `costPerUnitUnit` fields (visible in ProductionManagementScreen.tsx), but the calculated value appears incorrect.

## Expected Behavior

### Cost Calculation Logic
The product cost should be calculated as follows:

1. **Normalize all ingredient costs to a common unit base**:
   - If ingredient A is stored as 0.5kg and has a cost of £10/kg, the cost for this recipe is: 0.5kg × £10/kg = £5
   - If ingredient B is stored as 250g and has a cost of £0.02/g, the cost for this recipe is: 250g × £0.02/g = £5
   - If ingredient C is stored as 0.1kg and has a cost of £50/kg, the cost for this recipe is: 0.1kg × £50/kg = £5
   - **Total recipe cost = £5 + £5 + £5 = £15**

2. **Calculate cost per unit**:
   - The `costPerUnit` should represent the cost per standardized product unit
   - The `costPerUnitUnit` should match the product's unit of measurement
   - Both should be calculated based on properly normalized ingredient costs

### Key Requirements
1. **Unit Conversion for Cost Basis**: When converting ingredient quantities to match inventory packaging units, the cost calculations must account for the unit conversion factor
   - Example: If an ingredient is converted from 500g to 0.5kg, the cost calculation should use the kg-based cost, not the g-based cost incorrectly applied to 0.5
   - Example: If costPerPrimaryPackagingUnit is stored per gram, but quantity is converted to kg, multiply by 1000 when calculating

2. **Consistent Unit Base**: All ingredient costs should be normalized to the same unit system (all in base units or all in converted units) before summing

3. **Cost Source**: The cost should come from the inventory item's cost fields:
   - `costPerPrimaryPackagingUnit` (cost per gram/kg/etc. in the packaging unit)
   - `costPerPrimaryPackage` (cost per package)
   - The appropriate field should be used based on how the ingredient quantity is stored in the product

## Technical Details

### Product Structure
From `lib/api/products.ts`, products have:
```typescript
{
  id: string,
  name: string,
  businessId: string,
  ingredients: ProductIngredient[],
  costPerUnit?: number,        // Should be calculated correctly
  costPerUnitUnit?: string,    // Should match product unit
  // ... other fields
}
```

### Inventory Item Cost Fields
Inventory items have cost information:
- `costPerPrimaryPackagingUnit`: Cost per unit (g, kg, etc.) in the primary packaging unit
- `costPerPrimaryPackage`: Cost per package

### Unit Conversion Flow
1. Frontend sends ingredients with quantities and units
2. Backend converts quantities to match inventory item packaging units
3. Backend stores converted quantities in product document
4. **Backend calculates `costPerUnit`** - **THIS IS WHERE THE ISSUE OCCURS**
5. Backend returns conversion information to frontend

## Potential Root Causes

1. **Missing Unit Conversion in Cost Calculation**: The cost calculation may be using converted quantities directly with cost values that are in different units, without applying unit conversion factors

2. **Incorrect Cost Field Selection**: The wrong cost field might be selected (e.g., using costPerPrimaryPackage when costPerPrimaryPackagingUnit is needed, or vice versa)

3. **Unit Mismatch**: Cost per unit values from inventory items may be in one unit (e.g., per gram) while the converted quantity is in another unit (e.g., kilograms), and the conversion factor (1000) is not being applied

4. **Mixed Unit Calculations**: Costs are being summed without normalizing all to a common unit base first

## Impact

- **User Impact**: Users see incorrect product costs, leading to incorrect pricing decisions
- **Business Impact**: Financial calculations for production and pricing are inaccurate
- **Data Integrity**: Product cost data in the system is unreliable

## Requested Fix

### Required Changes
1. **Review cost calculation logic** in the product creation/update endpoint
2. **Ensure unit conversions are properly applied** when calculating ingredient costs
3. **Normalize all costs to a common unit** before summing for total product cost
4. **Validate cost calculations** with test cases that include:
   - Ingredients with same unit (all grams → all stay grams)
   - Ingredients with mixed unit conversions (some grams → kilograms, some stay grams)
   - Ingredients with different cost structures (some per gram, some per kilogram)

### Test Cases Needed
1. **Test Case 1**: All ingredients in grams, all converted to kilograms
   - Verify cost calculation accounts for kg conversion (multiply by 1000 for g→kg cost conversion)

2. **Test Case 2**: Some ingredients in grams (stay grams), some converted to kilograms
   - Verify all costs normalized to same unit base before summing

3. **Test Case 3**: Ingredients with different packaging units and costs
   - Verify correct cost field is used based on how quantity is stored

## Priority
**High** - This affects core financial calculations and product pricing accuracy.

## Related Endpoints
- `POST /authenticated/transactions3/api/products` - Product creation
- `PATCH /authenticated/transactions3/api/products/{productId}` - Product update
- Product retrieval endpoints that return `costPerUnit` and `costPerUnitUnit`

## Additional Notes
- The frontend displays `costPerUnit` and `costPerUnitUnit` in ProductionManagementScreen.tsx (line 115-117)
- The frontend receives `unitConversions` in the response and displays them to the user, but does not perform cost calculations itself
- Cost calculations are entirely handled by the backend
- The issue was discovered when a product was created with all ingredients in grams, some were converted to kilograms, and the resulting cost appeared incorrect

## Questions for Backend Team

1. **Cost Source**: Which inventory item cost field should be used for calculating product cost?
   - `costPerPrimaryPackagingUnit`?
   - `costPerPrimaryPackage`?
   - Both (depending on how quantity is stored)?

2. **Unit Conversion Factor**: When an ingredient is converted from grams to kilograms:
   - Should the cost be multiplied by 1000 (if cost is stored per gram)?
   - Or should the cost be divided by 1000 (if cost is stored per kilogram)?
   - How is this determined?

3. **Normalization Strategy**: Should all costs be normalized to a single unit base (e.g., all to grams, or all to base unit) before summing, or is there another strategy?

4. **Cost Calculation Formula**: Can you provide the exact formula used for calculating `costPerUnit` so we can verify it handles unit conversions correctly?

