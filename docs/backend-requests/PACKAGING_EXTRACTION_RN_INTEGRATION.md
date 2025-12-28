# Packaging Extraction API - React Native Integration

## Overview

The Packaging Extraction API extracts structured packaging information from transaction receipt text using AI. It identifies the 3-level packaging model (Primary, Secondary, Tertiary) and calculates the total amount of product based on the order quantity and packaging structure.

**Use Case**: When processing purchase receipts, extract packaging details to determine total quantities (e.g., "3 case Banks Beer 24x275ml" → 72 bottles × 275ml = 19,800ml total).

---

## Endpoint

**POST** `/authenticated/transactions3/api/packaging/extract`

---

## Request

### Headers

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}` // Firebase Auth token - REQUIRED
}
```

### Request Body

```typescript
interface PackagingExtractionRequest {
  businessId: string;  // REQUIRED - Current business ID
  text: string;        // REQUIRED - Packaging-related text from receipt
}
```

### Example Request

```typescript
const token = await auth().currentUser?.getIdToken();

const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/packaging/extract`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      businessId: 'business_xyz',
      text: '3 case Banks Beer 24x275ml',
    }),
  }
);
```

---

## Response

### Success Response (200)

```typescript
interface PackagingExtractionResponse {
  success: true;
  packaging: {
    // Primary Packaging - Direct contact with product (bottles, cans, individual units)
    primaryPackaging: Array<{
      description: string;      // e.g., "bottle", "can", "blister pack"
      material?: string;        // e.g., "glass", "aluminum", "plastic"
      quantity?: number;        // Number of primary units
    }>;

    // Secondary Packaging - Retail/display grouping (cases, boxes, packs)
    secondaryPackaging: Array<{
      description: string;      // e.g., "12-pack box", "case"
      material?: string;        // e.g., "cardboard", "plastic wrap"
      quantity?: number;        // Number of secondary units
      primaryUnitsPerSecondary?: number;  // e.g., 12 for a 12-pack
    }>;

    // Tertiary Packaging - Bulk/warehouse storage (pallets, large boxes)
    tertiaryPackaging: Array<{
      description: string;      // e.g., "pallet", "large corrugated box"
      material?: string;        // e.g., "corrugated cardboard", "stretch film"
      quantity?: number;        // Number of tertiary units
      secondaryUnitsPerTertiary?: number;  // Secondary units per tertiary
    }>;

    // Order Information
    orderQuantity: number;              // Quantity being ordered (e.g., 3 in "3 case")
    orderPackagingLevel: 'primary' | 'secondary' | 'tertiary';  // What level is being ordered

    // Calculated Total
    totalAmount: number;        // Total amount calculated (e.g., 19800)
    unit: string;              // Unit of measurement (e.g., "ml", "L", "g", "count")

    confidence?: number;       // Confidence score (0-1)
    notes?: string;            // Additional notes or context
  };
  metadata: {
    requestId: string;         // Request ID for tracking
    duration: number;          // Processing time in milliseconds
    timestamp: string;         // ISO timestamp
  };
}
```

### Example Response

```json
{
  "success": true,
  "packaging": {
    "primaryPackaging": [
      {
        "description": "bottle",
        "quantity": 72
      }
    ],
    "secondaryPackaging": [
      {
        "description": "case",
        "quantity": 3,
        "primaryUnitsPerSecondary": 24
      }
    ],
    "tertiaryPackaging": [],
    "orderQuantity": 3,
    "orderPackagingLevel": "secondary",
    "totalAmount": 19800,
    "unit": "ml",
    "confidence": 0.95
  },
  "metadata": {
    "requestId": "req_1766238841130_o1uqkh5kv",
    "duration": 1234,
    "timestamp": "2025-01-20T10:30:00.000Z"
  }
}
```

---

## Key Concepts

### Order Quantity vs Packaging Structure

The API distinguishes between **what is being ordered** and **how it's packaged**:

- **"2 BTLS Kettle One Vodka 12x1L"**
  - Ordering: 2 bottles (primary packaging)
  - Structure: Each bottle is 1L (described by "12x1L" = case with 12 bottles)
  - Total: 2 × 1L = **2L**

- **"2 CASE Kettle One Vodka 12x1L"**
  - Ordering: 2 cases (secondary packaging)
  - Structure: Each case contains 12 bottles of 1L each
  - Total: 2 × 12 × 1L = **24L**

The `orderQuantity` and `orderPackagingLevel` fields indicate what you're ordering, while the packaging arrays describe the structure.

### Packaging Levels

1. **Primary**: Individual units (bottles, cans, pieces)
   - Keywords: BTLS, bottles, cans, units, pieces, pcs

2. **Secondary**: Cases/packs/boxes (groups of primary units)
   - Keywords: CASE, case, cases, box, boxes, pack, packs, carton

3. **Tertiary**: Bulk storage (pallets, large containers)
   - Keywords: pallet, pallets, crate, crates

### Unit Calculation

- If a measurable unit is mentioned (ml, L, g, kg, etc.), `totalAmount` is calculated in that unit
- If no measurable unit is specified, `totalAmount` represents the total count with `unit: "count"`

---

## Error Handling

### 400 Bad Request

Missing or invalid request parameters.

```json
{
  "error": "Missing or invalid text parameter"
}
```

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "error": "Failed to extract packaging information",
  "message": "UNAUTHENTICATED",
  "requestId": "req_..."
}
```

### 403 Forbidden

User doesn't have access to the specified business.

```json
{
  "error": "Access denied"
}
```

### 429 Too Many Requests

Vertex AI usage limit exceeded.

```json
{
  "error": "Vertex AI limit exceeded",
  "currentUsage": 100,
  "limit": 100
}
```

### 500 Internal Server Error

Server error during processing.

```json
{
  "error": "Failed to extract packaging information",
  "message": "Error details...",
  "requestId": "req_..."
}
```

---

## Integration Example

```typescript
import { auth } from './firebase'; // Your Firebase auth setup
import API_BASE_URL from './config/api';

async function extractPackaging(
  businessId: string,
  receiptText: string
): Promise<PackagingExtractionResponse> {
  try {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await user.getIdToken();
    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/packaging/extract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          text: receiptText,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data: PackagingExtractionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Packaging extraction failed:', error);
    throw error;
  }
}

// Usage
const result = await extractPackaging(
  'business_xyz',
  '3 case Banks Beer 24x275ml'
);

console.log(`Total: ${result.packaging.totalAmount} ${result.packaging.unit}`);
// Output: Total: 19800 ml
```

---

## Display Recommendations

### Show Total Amount Prominently

The `totalAmount` and `unit` fields are the key outputs - display them prominently in your UI:

```tsx
<View>
  <Text style={styles.totalAmount}>
    {packaging.totalAmount.toLocaleString()} {packaging.unit}
  </Text>
  <Text style={styles.orderInfo}>
    Order: {packaging.orderQuantity} {packaging.orderPackagingLevel}
  </Text>
</View>
```

### Show Packaging Breakdown

Display the packaging structure to help users verify the calculation:

```tsx
{packaging.secondaryPackaging.map((item, idx) => (
  <View key={idx}>
    <Text>{item.description}</Text>
    {item.primaryUnitsPerSecondary && (
      <Text>{item.primaryUnitsPerSecondary} per {item.description}</Text>
    )}
  </View>
))}
```

---

## Testing

Use the admin page to test extraction with various text inputs:

**Location**: `/admin/packaging-extraction`

**Test Examples**:
- `"3 case Banks Beer 24x275ml"` → 19,800ml
- `"2 BTLS Kettle One Vodka 12x1L"` → 2L
- `"2 CASE Kettle One Vodka 12x1L"` → 24L
- `"10 boxes of apples, 12 per box"` → 120 count

---

## Notes

- **Non-blocking**: If packaging extraction fails, you can still save the transaction without packaging data
- **Confidence scores**: Use `confidence` field to determine if extraction should be reviewed/verified
- **Usage tracking**: Each extraction call counts against Vertex AI usage limits (tracked per business)
- **Performance**: Typical response time is 1-3 seconds depending on text complexity

---

## Questions?

- See the admin test page: `/admin/packaging-extraction`
- Check usage limits via: `/api/businesses/{businessId}/metadata/usage`

