# Invoice Product SKU Selection - Optional Performance Optimization

## Overview
The Create Invoice screen now includes product and SKU selection for invoice items. Users can select a product and then select a SKU from that product, which auto-fills the unit cost and description fields.

## Current Implementation
The frontend currently uses the existing endpoints:
- `GET /authenticated/transactions3/api/products?businessId={businessId}&page=1&limit=500` - Fetches all products
- `GET /authenticated/transactions3/api/products/{productId}/skus?businessId={businessId}` - Fetches SKUs for a specific product when selected

## Current Flow
1. On screen load, fetch all products (paginated, up to 500)
2. When user selects a product for an invoice item, fetch SKUs for that product
3. When user selects a SKU, populate unit cost and description

## Performance Considerations
The current approach works well for most use cases. However, if a business has many products (hundreds or thousands), the following optimization could improve performance:

### Optional Enhancement: Bulk Products with SKUs Endpoint
Consider adding a new endpoint that returns all products with their SKUs in a single request:

**Suggested Endpoint:**
```
GET /authenticated/transactions3/api/products/with-skus?businessId={businessId}&page=1&limit=500
```

**Suggested Response:**
```typescript
{
  products: Array<{
    id: string;
    name: string;
    businessId: string;
    skus: Array<{
      name: string;
      size: number;
      unit: string;
      price: number;
      currentStock: number;
      // ... other SKU fields
    }>;
    // ... other product fields
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

This would eliminate the need for multiple API calls when users select different products for invoice items.

## Priority
**Low Priority** - The current implementation is functional and performs well for typical use cases. This optimization would only be beneficial for businesses with a very large number of products (500+).

## Current API Status
✅ All required endpoints exist and work correctly
✅ No changes needed for current functionality
⚠️ Optional optimization for future enhancement

