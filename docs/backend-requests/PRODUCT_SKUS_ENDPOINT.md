# Product SKUs Endpoint - React Native Integration Guide

## Endpoint

**POST** `/authenticated/transactions3/api/products/{productId}/skus`

## Overview

This endpoint allows you to save SKUs (Stock Keeping Units) to a product. SKUs are stored at the product level and include pricing, stock tracking, cost breakdown, and optional ancillary items.

## Authentication

The endpoint requires authentication. Include the user's authentication token in the request headers.

## Request Body

```typescript
{
  businessId: string;        // Required: Business ID
  skus: Array<{             // Required: Array of SKU objects (at least 1)
    name: string;            // Required: SKU name
    size: number;            // Required: Size/quantity (must be > 0)
    unit: string;            // Required: Unit of measurement
    price: number;           // Required: Selling price (must be >= 0)
    ancillaryItems?: Array<{ // Optional: Ancillary items array
      inventoryItemId: string; // Required: Inventory item ID
      quantity: number;        // Required: Quantity (must be > 0)
    }>;
    tags?: string[];         // Optional: Array of tag strings
    currentStock: number;    // Required: Current stock level (must be >= 0)
    cost: {                  // Required: Cost breakdown
      productCost: number;    // Required: Product cost (must be >= 0)
      ancillaryCost: number; // Required: Ancillary items cost (must be >= 0)
      totalCost: number;     // Required: Total cost (must be >= 0)
    };
  }>;
}
```

## Example Request

```typescript
const response = await fetch(
  `https://your-api-domain.com/authenticated/transactions3/api/products/${productId}/skus`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, // Your auth token
    },
    body: JSON.stringify({
      businessId: 'your-business-id',
      skus: [
        {
          name: 'Small',
          size: 250,
          unit: 'g',
          price: 12.99,
          ancillaryItems: [
            {
              inventoryItemId: 'inventory-item-id-1',
              quantity: 1,
            },
          ],
          tags: ['popular', 'small'],
          currentStock: 50,
          cost: {
            productCost: 5.00,
            ancillaryCost: 0.50,
            totalCost: 5.50,
          },
        },
        {
          name: 'Large',
          size: 500,
          unit: 'g',
          price: 22.99,
          tags: ['large'],
          currentStock: 30,
          cost: {
            productCost: 9.00,
            ancillaryCost: 0,
            totalCost: 9.00,
          },
        },
      ],
    }),
  }
);

const data = await response.json();
```

## Response

### Success Response (200)

```typescript
{
  success: true;
  productId: string;
  message: 'SKUs saved successfully';
  skuCount: number;
  availableInventoryItems: Array<{
    id: string;
    name: string;
  }>;
}
```

### Error Responses

#### 400 - Validation Error
```typescript
{
  error: 'Invalid request' | 'Invalid ancillary items';
  code: 'VALIDATION_ERROR';
  details: Array<{
    skuIndex?: number;
    skuName?: string;
    error: string;
  }>;
}
```

#### 401 - Unauthorized
```typescript
{
  error: 'Unauthorized';
  code: 'UNAUTHORIZED';
}
```

#### 403 - Access Denied
```typescript
{
  error: 'Access denied';
  code: 'ACCESS_DENIED';
}
```

#### 404 - Product Not Found
```typescript
{
  error: 'Product not found';
  code: 'PRODUCT_NOT_FOUND';
}
```

#### 500 - Internal Error
```typescript
{
  error: string;
  code: 'INTERNAL_ERROR';
}
```

## Available Inventory Items

The response includes `availableInventoryItems`, which is an array of all inventory items in the business that can be selected as ancillary items for SKUs. Use this list to populate a selection UI.

```typescript
// Example: Display inventory items for selection
const { availableInventoryItems } = await response.json();

// Render selection UI
availableInventoryItems.forEach((item) => {
  console.log(`${item.name} (ID: ${item.id})`);
});
```

## Usage Flow

1. **Fetch Available Inventory Items**: The endpoint returns `availableInventoryItems` in the response. You can use this to populate a selection UI when adding ancillary items to SKUs.

2. **Build SKU Data**: Create the SKU objects with all required fields. Calculate costs based on your business logic.

3. **Submit SKUs**: POST the SKUs array to the endpoint.

4. **Handle Response**: Check for success and use the `availableInventoryItems` for future selections.

## Notes

- SKUs are stored at the product level (not within ingredients)
- All SKU fields are validated before saving
- Ancillary items are validated to ensure inventory items exist and belong to the business
- The `availableInventoryItems` array is returned with each request for convenience
- SKUs replace any existing SKUs on the product (use PATCH if you need to merge)

## TypeScript Types

```typescript
interface SKUAncillaryItem {
  inventoryItemId: string;
  quantity: number;
}

interface SKUCost {
  productCost: number;
  ancillaryCost: number;
  totalCost: number;
}

interface SKU {
  name: string;
  size: number;
  unit: string;
  price: number;
  ancillaryItems?: SKUAncillaryItem[];
  tags?: string[];
  currentStock: number;
  cost: SKUCost;
}

interface SaveSKUsRequest {
  businessId: string;
  skus: SKU[];
}

interface AvailableInventoryItem {
  id: string;
  name: string;
}

interface SaveSKUsResponse {
  success: true;
  productId: string;
  message: string;
  skuCount: number;
  availableInventoryItems: AvailableInventoryItem[];
}
```

