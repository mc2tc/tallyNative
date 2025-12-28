# Packaging Extraction API - Response Format

## Endpoint
`POST /authenticated/transactions3/api/packaging/extract`

## Request Body
```typescript
{
  businessId: string;
  text: string; // Transaction receipt text to analyze
}
```

## Response Format

### Success Response (200)
```typescript
{
  success: true;
  packaging: {
    // PRIMARY PACKAGING (optional)
    // The individual unit containing the product
    primaryPackaging?: {
      description: string;        // e.g., "bottle", "can", "box", "bag", "piece"
      quantity: number;           // Size/capacity of ONE primary package
                                  // e.g., 275 for 275ml, 25 for 25cl, 1 for 1kg
      unit: string;                // Unit: "ml", "cl", "L", "g", "kg", "count", etc.
      material?: string;          // Optional: e.g., "glass", "plastic", "aluminum"
    };
    
    // SECONDARY PACKAGING (optional)
    // Groups of primary packages (cases, boxes, packs)
    secondaryPackaging?: {
      description: string;        // e.g., "case", "box", "pack", "carton"
      quantity: number;           // Number of secondary packages
      primaryPackagesPerSecondary: number;  // e.g., 24 for a 24-pack case
      material?: string;          // Optional: e.g., "cardboard", "plastic"
    };
    
    // CALCULATED FIELDS
    totalPrimaryPackages: number;  // Total number of primary packages
                                  // = orderQuantity × primaryPackagesPerSecondary (if secondary)
                                  // = orderQuantity (if primary)
    
    // ORDER INFORMATION
    orderQuantity: number;         // Quantity being ordered
    orderPackagingLevel: "primary" | "secondary";  // What level is being ordered
    
    // OPTIONAL METADATA
    confidence?: number;           // 0-1 confidence score
    notes?: string;               // Additional context
  };
  metadata: {
    requestId: string;
    duration: number;             // milliseconds
    timestamp: string;            // ISO timestamp
  };
}
```

### Error Response (400/403/429/500)
```typescript
{
  error: string;
  message?: string;
  requestId: string;
  // For 429 errors:
  currentUsage?: number;
  limit?: number;
}
```

## Examples

### Example 1: Secondary Packaging Order
**Input:** `"3 CASE BANKS BEER 24x275ml"`

**Response:**
```json
{
  "success": true,
  "packaging": {
    "primaryPackaging": {
      "description": "bottle",
      "quantity": 275,
      "unit": "ml"
    },
    "secondaryPackaging": {
      "description": "case",
      "quantity": 3,
      "primaryPackagesPerSecondary": 24
    },
    "totalPrimaryPackages": 72,
    "orderQuantity": 3,
    "orderPackagingLevel": "secondary"
  }
}
```

### Example 2: Primary Packaging Order with Centiliters
**Input:** `"2 BTLS Absolut Vodka 75cl"`

**Response:**
```json
{
  "success": true,
  "packaging": {
    "primaryPackaging": {
      "description": "bottle",
      "quantity": 75,
      "unit": "cl"
    },
    "totalPrimaryPackages": 2,
    "orderQuantity": 2,
    "orderPackagingLevel": "primary"
  }
}
```

### Example 3: Secondary Packaging with Centiliters
**Input:** `"3 CASE DEPUTY BEER 24x25cl"`

**Response:**
```json
{
  "success": true,
  "packaging": {
    "primaryPackaging": {
      "description": "bottle",
      "quantity": 25,
      "unit": "cl"
    },
    "secondaryPackaging": {
      "description": "case",
      "quantity": 3,
      "primaryPackagesPerSecondary": 24
    },
    "totalPrimaryPackages": 72,
    "orderQuantity": 3,
    "orderPackagingLevel": "secondary"
  }
}
```

### Example 4: Count-Based Item
**Input:** `"5 PCS Widget"`

**Response:**
```json
{
  "success": true,
  "packaging": {
    "primaryPackaging": {
      "description": "piece",
      "quantity": 1,
      "unit": "count"
    },
    "totalPrimaryPackages": 5,
    "orderQuantity": 5,
    "orderPackagingLevel": "primary"
  }
}
```

## Key Changes from Previous Version

1. **`primaryPackaging`** is now an **object** (not array) - represents a single primary package type
2. **`secondaryPackaging`** is now an **object** (not array) - represents a single secondary package type
3. **Removed** `tertiaryPackaging` - no longer supported
4. **Removed** `totalAmount` and separate `unit` - replaced by `primaryPackaging.quantity` and `primaryPackaging.unit`
5. **Added** `totalPrimaryPackages` - calculated total count of primary packages
6. **`orderPackagingLevel`** now only supports `"primary"` or `"secondary"` (removed `"tertiary"`)

## TypeScript Interface

```typescript
interface PackagingExtractResponse {
  success: boolean;
  packaging: {
    primaryPackaging?: {
      description: string;
      quantity: number;
      unit: string;
      material?: string;
    };
    secondaryPackaging?: {
      description: string;
      quantity: number;
      primaryPackagesPerSecondary: number;
      material?: string;
    };
    totalPrimaryPackages: number;
    orderQuantity: number;
    orderPackagingLevel: "primary" | "secondary";
    confidence?: number;
    notes?: string;
  };
  metadata: {
    requestId: string;
    duration: number;
    timestamp: string;
  };
}
```

## Usage Notes

1. **Primary Packaging**: Always check if `primaryPackaging` exists before accessing its properties
2. **Secondary Packaging**: Only present when ordering at secondary level (cases, boxes, etc.)
3. **Units**: Preserved exactly as found in the text (e.g., "cl" stays as "cl", not converted to "ml")
4. **Total Calculation**: `totalPrimaryPackages` is pre-calculated for convenience
5. **Optional Fields**: `material`, `confidence`, and `notes` may not always be present

