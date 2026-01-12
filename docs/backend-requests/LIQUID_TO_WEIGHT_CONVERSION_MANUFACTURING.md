# Liquid-to-Weight Conversion Issue in Product Manufacturing

## Problem Statement

When manufacturing a product that contains ingredients with mixed unit categories (volume vs weight), the backend fails with the error:
```
Ingredient unit l is incompatible with manufacturing unit g
```

This occurs because:
1. Products can contain ingredients with volume units (e.g., Water in "L" or "l" - liters)
2. Products can also contain ingredients with weight units (e.g., flour in "kg" or "g")
3. When calculating production capacity, the frontend determines a "common unit" based on the first ingredient's category:
   - If first ingredient is weight category → common unit = "g" (grams)
   - If first ingredient is volume category → common unit = "ml" (milliliters)
4. The backend receives a manufacture request with `quantity` and `unit` (the common unit)
5. The backend then tries to convert this manufacturing unit back to each ingredient's original unit
6. **Conversion fails** when trying to convert between volume (L) and weight (g) because they are different measurement categories

## Specific Case: Water

Water has a standard density: **1 L of water = 1 kg = 1000 g**

For the Water ingredient specifically (name = "Water", unit = "L" or "l"), the backend should:
- When manufacturing unit is weight (g, kg, etc.): Convert using 1 L = 1 kg = 1000 g
- When manufacturing unit is volume (ml, L, etc.): Use standard volume conversions

## General Solution: Liquid-to-Weight Conversions

For other liquid ingredients (oils, syrups, etc.), we need a more flexible approach since density varies:

1. **Product Ingredient Schema Enhancement**: Add an optional `density` or `conversionFactor` field to product ingredients:
   ```typescript
   {
     inventoryItemId: string
     quantity: number
     unit: string  // e.g., "L"
     density?: number  // e.g., 0.92 (kg/L for oil) - optional, only needed for cross-category conversions
   }
   ```

2. **Backend Conversion Logic**:
   - When manufacturing unit is weight and ingredient unit is volume (or vice versa):
     - Check if ingredient has a `density` factor
     - If yes, use it: `weight = volume × density` or `volume = weight ÷ density`
     - If no, return an error prompting the user to provide density

3. **Error Handling**: When conversion is needed but density is missing, return a specific error:
   ```json
   {
     "error": "LIQUID_WEIGHT_CONVERSION_REQUIRED",
     "message": "Ingredient 'Oil' requires density factor for volume-to-weight conversion",
     "ingredientId": "ingredient-123",
     "ingredientName": "Oil",
     "ingredientUnit": "L",
     "manufacturingUnit": "g"
   }
   ```

4. **Frontend Handling**: When frontend receives `LIQUID_WEIGHT_CONVERSION_REQUIRED` error:
   - Prompt user to enter density/conversion factor for the specific ingredient
   - Store this in the product ingredient definition
   - Retry manufacturing with updated product definition

## Implementation Priority

1. **Immediate Fix**: Hardcode Water conversion (1 L = 1 kg = 1000 g) in the backend manufacturing logic
2. **Short-term Enhancement**: Add `density` field to product ingredient schema and support user-provided conversion factors
3. **Long-term Enhancement**: Consider storing ingredient-specific densities in the inventory item metadata for reuse across products

## API Changes Needed

### ManufactureProduct Request (Current)
```typescript
{
  businessId: string
  quantity: number
  unit: string
  waste?: number
}
```

### Product Ingredient Schema (Proposed Enhancement)
```typescript
{
  inventoryItemId: string
  quantity: number
  unit: string
  density?: number  // kg/L for volume→weight conversion, L/kg for weight→volume
  // For Water: density = 1.0 (1 L = 1 kg)
  // For Oil: density ≈ 0.92 (1 L = 0.92 kg)
  // For Syrup: density ≈ 1.36 (1 L = 1.36 kg)
}
```

## Backend Conversion Algorithm

When manufacturing with mixed units, the backend should:

1. Receive manufacture request: `{ quantity: 100, unit: "g" }`
2. For each product ingredient:
   - If ingredient unit category matches manufacturing unit category:
     - Use standard unit conversion (already working)
   - If ingredient unit category differs from manufacturing unit category:
     - **Special case: Water**
       - If ingredient name = "Water" and unit is volume ("L", "l", "ml"):
         - Convert: 1 L = 1000 g, 1 ml = 1 g
     - **General case: Other liquids**
       - Check if ingredient has `density` field
       - If yes: `requiredIngredientQuantity = (manufacturingQuantity × ingredientQuantity) × density`
       - If no: Return `LIQUID_WEIGHT_CONVERSION_REQUIRED` error

## Example Scenarios

### Scenario 1: Water + Weight Ingredients (Current Issue)
- Product: Bread
- Ingredients:
  - Water: 0.5 L
  - Flour: 500 g
- Manufacturing: 100 g of bread
- Backend should calculate:
  - Water needed: (100 g bread × 0.5 L per unit) / 1000 g/L = 0.05 L ✅
  - Flour needed: (100 g bread × 500 g per unit) / 1 = 50 g ✅

### Scenario 2: Oil + Weight Ingredients (Future Case)
- Product: Cake
- Ingredients:
  - Oil: 0.25 L (density: 0.92 kg/L)
  - Flour: 300 g
- Manufacturing: 500 g of cake
- Backend should calculate:
  - Oil needed: (500 g cake × 0.25 L per unit) × (0.92 kg/L) = 0.115 L = 115 ml ✅
  - Flour needed: (500 g cake × 300 g per unit) / 1 = 150 g ✅

### Scenario 3: Missing Density
- Product: Sauce
- Ingredients:
  - Syrup: 0.1 L (no density provided)
  - Spice: 5 g
- Manufacturing: 200 g of sauce
- Backend should return: `LIQUID_WEIGHT_CONVERSION_REQUIRED` error
- Frontend prompts user for syrup density (e.g., 1.36 kg/L)
- User provides density, product ingredient updated
- Retry manufacturing

## Related Files

- Frontend: `screens/ManufactureScreen.tsx` - Manufacturing UI and unit calculations
- Frontend: `screens/CreateProductScreen.tsx` - Product creation with ingredients
- Frontend: `lib/api/products.ts` - API client for product operations
- Backend: `/authenticated/transactions3/api/products/:productId/manufacture` - Manufacturing endpoint

## Testing Requirements

1. Test Water conversion: Product with Water (L) + weight ingredients (g/kg)
2. Test pure weight: All ingredients in weight units
3. Test pure volume: All ingredients in volume units
4. Test mixed with density: Product with liquid (has density) + weight ingredients
5. Test mixed without density: Product with liquid (no density) + weight ingredients → should error
6. Test error handling: Verify `LIQUID_WEIGHT_CONVERSION_REQUIRED` error format

## Notes

- The frontend currently filters out Water from the Ingredient Stock Levels display but includes it in production capacity calculations
- The frontend's `commonUnit` calculation may need refinement to better handle mixed categories
- Consider adding a unit conversion API endpoint that handles cross-category conversions with user-provided densities

