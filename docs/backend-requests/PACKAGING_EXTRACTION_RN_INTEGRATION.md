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
  businessId: string; // REQUIRED - Current business ID
  text: string; // REQUIRED - Packaging-related text from receipt
}
```

### Example Request

```typescript
const token = await auth().currentUser?.getIdToken();

const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/packaging/extract`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: 'business_xyz',
    text: '3 case Banks Beer 24x275ml',
  }),
});
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
      description: string; // e.g., "bottle", "can", "blister pack"
      material?: string; // e.g., "glass", "aluminum", "plastic"
      quantity?: number; // Number of primary units
    }>;

    // Secondary Packaging - Retail/display grouping (cases, boxes, packs)
    secondaryPackaging: Array<{
      description: string; // e.g., "12-pack box", "case"
      material?: string; // e.g., "cardboard", "plastic wrap"
      quantity?: number; // Number of secondary units
      primaryUnitsPerSecondary?: number; // e.g., 12 for a 12-pack
    }>;

    // Tertiary Packaging - Bulk/warehouse storage (pallets, large boxes)
    tertiaryPackaging: Array<{
      description: string; // e.g., "pallet", "large corrugated box"
      material?: string; // e.g., "corrugated cardboard", "stretch film"
      quantity?: number; // Number of tertiary units
      secondaryUnitsPerTertiary?: number; // Secondary units per tertiary
    }>;

    // Order Information
    orderQuantity: number; // Quantity being ordered (e.g., 3 in "3 case")
    orderPackagingLevel: 'primary' | 'secondary' | 'tertiary'; // What level is being ordered

    // Calculated Total
    totalAmount: number; // Total amount calculated (e.g., 19800)
    unit: string; // Unit of measurement (e.g., "ml", "L", "g", "count")

    confidence?: number; // Confidence score (0-1)
    notes?: string; // Additional notes or context
  };
  metadata: {
    requestId: string; // Request ID for tracking
    duration: number; // Processing time in milliseconds
    timestamp: string; // ISO timestamp
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

**CRITICAL: Graceful Degradation Principle**

Packaging extraction is a **non-blocking, optional enhancement** to the transaction workflow. **Never block the user from completing their transaction** if packaging extraction fails. Always allow users to:

1. Continue without packaging data
2. Manually enter packaging information if needed
3. Save the transaction even if extraction fails

The API uses a discriminated union response type - always check `success` before accessing packaging data.

### Error Response Format

All error responses follow this structure:

```typescript
interface PackagingExtractionErrorResponse {
  success: false;
  error: string;              // User-friendly error message
  message?: string;           // Additional error details (optional)
  requestId: string;          // Request ID for tracking/debugging
  currentUsage?: number;      // Current usage count (for rate limit errors)
  limit?: number;            // Usage limit (for rate limit errors)
}
```

### 400 Bad Request

Missing or invalid request parameters.

```json
{
  "success": false,
  "error": "Missing or invalid text parameter",
  "requestId": "req_..."
}
```

### 401 Unauthorized

Missing or invalid authentication token.

```json
{
  "success": false,
  "error": "Failed to extract packaging information",
  "message": "UNAUTHENTICATED",
  "requestId": "req_..."
}
```

### 403 Forbidden

User doesn't have access to the specified business.

```json
{
  "success": false,
  "error": "Access denied",
  "requestId": "req_..."
}
```

### 429 Too Many Requests

Vertex AI rate limit exceeded (service temporarily busy). This is a **temporary condition** - the service will be available again shortly.

```json
{
  "success": false,
  "error": "The AI service is temporarily busy. Please try again in a moment.",
  "requestId": "req_...",
  "currentUsage": 45,
  "limit": 50
}
```

**Graceful Handling for 429 Errors:**
- Display the user-friendly error message from the API
- Offer an automatic retry with exponential backoff (see retry logic below)
- **Do not block the user** - allow them to continue without packaging data
- Consider showing usage information if provided (`currentUsage` / `limit`)

### 500 Internal Server Error

Server error during processing.

```json
{
  "success": false,
  "error": "Failed to extract packaging information",
  "message": "Error details...",
  "requestId": "req_..."
}
```

**Graceful Handling for 500 Errors:**
- Log the error with `requestId` for debugging
- Show a user-friendly message
- Allow the user to continue without packaging data
- Consider offering manual entry as an alternative

---

## Integration Example

### Basic Integration with Type Guards

```typescript
import { packagingApi, isPackagingExtractionSuccess } from './lib/api/packaging';

async function extractPackaging(
  businessId: string,
  receiptText: string
): Promise<PackagingExtractionResponse | null> {
  try {
    const response = await packagingApi.extractPackaging(businessId, receiptText);
    
    // Use type guard to check success
    if (!isPackagingExtractionSuccess(response)) {
      // Handle error gracefully - return null instead of throwing
      console.warn('Packaging extraction failed:', response.error);
      return null; // Allow caller to continue without packaging data
    }
    
    return response;
  } catch (error) {
    // Network errors, etc. - log but don't block
    console.error('Packaging extraction error:', error);
    return null; // Graceful degradation
  }
}

// Usage with graceful degradation
const result = await extractPackaging('business_xyz', '3 case Banks Beer 24x275ml');

if (result && isPackagingExtractionSuccess(result)) {
  console.log(`Total: ${result.packaging.totalPrimaryPackages} packages`);
} else {
  // Continue without packaging data - don't block the user
  console.log('Packaging extraction unavailable - user can continue manually');
}
```

### Retry Logic with Exponential Backoff

For rate limit errors (429), implement automatic retry with exponential backoff:

```typescript
async function extractPackagingWithRetry(
  businessId: string,
  receiptText: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<PackagingExtractionResponse | null> {
  let lastError: PackagingExtractionErrorResponse | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await packagingApi.extractPackaging(businessId, receiptText);
      
      if (isPackagingExtractionSuccess(response)) {
        return response;
      }
      
      // Check if it's a rate limit error (429) and we should retry
      const errorResponse = response as PackagingExtractionErrorResponse;
      const isRateLimit = errorResponse.error?.includes('temporarily busy') || 
                         errorResponse.error?.includes('try again');
      
      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = errorResponse;
        continue;
      }
      
      // Non-retryable error or max retries reached
      return null;
      
    } catch (error) {
      // Network errors - only retry on first attempt
      if (attempt === 0 && error instanceof Error) {
        console.warn('Network error, retrying once:', error.message);
        await new Promise(resolve => setTimeout(resolve, initialDelay));
        continue;
      }
      
      // Give up after network error retry
      console.error('Packaging extraction failed after retries:', error);
      return null;
    }
  }
  
  return null; // Graceful degradation after all retries
}
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
{
  packaging.secondaryPackaging.map((item, idx) => (
    <View key={idx}>
      <Text>{item.description}</Text>
      {item.primaryUnitsPerSecondary && (
        <Text>
          {item.primaryUnitsPerSecondary} per {item.description}
        </Text>
      )}
    </View>
  ));
}
```

### Error Handling Best Practices

**Always implement graceful degradation** - packaging extraction should never block the user workflow:

```tsx
const [packagingData, setPackagingData] = useState<PackagingExtractionSuccessResponse | null>(null);
const [extractionError, setExtractionError] = useState<string | null>(null);
const [isExtracting, setIsExtracting] = useState(false);

const handleExtractPackaging = async () => {
  setIsExtracting(true);
  setExtractionError(null);
  
  try {
    const response = await extractPackagingWithRetry(businessId, receiptText);
    
    if (response && isPackagingExtractionSuccess(response)) {
      setPackagingData(response);
      // Success - show packaging data in UI
    } else {
      // Extraction failed - show optional manual entry option
      setExtractionError('Packaging extraction unavailable. You can continue without it or enter manually.');
      // DON'T block - allow user to proceed
    }
  } catch (error) {
    // Unexpected error - log but don't block
    console.error('Unexpected packaging extraction error:', error);
    setExtractionError('Packaging extraction unavailable. You can continue without it.');
  } finally {
    setIsExtracting(false);
  }
};

// In your UI component
<View>
  {isExtracting && <ActivityIndicator />}
  
  {extractionError && (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{extractionError}</Text>
      <Button 
        title="Try Again" 
        onPress={handleExtractPackaging}
        // Optional - don't force retry
      />
      <Button 
        title="Enter Manually" 
        onPress={() => setShowManualEntry(true)}
        // Always provide manual option
      />
    </View>
  )}
  
  {packagingData && (
    <PackagingDisplay data={packagingData.packaging} />
  )}
  
  {/* Always show save button - even without packaging data */}
  <Button 
    title="Save Transaction" 
    onPress={handleSave}
    // Save should work with or without packaging data
  />
</View>
```

**Critical Graceful Error Handling Principles:**

1. **Never Block the User**
   - Always allow transaction save without packaging data
   - Show errors as informational, not blocking alerts
   - Provide manual entry as an alternative

2. **Handle Rate Limits Gracefully**
   - Implement automatic retry with exponential backoff (1s, 2s, 4s)
   - Show user-friendly message: "AI service is temporarily busy"
   - Don't show technical error details to end users
   - Allow user to continue without waiting

3. **Network Error Handling**
   - Retry once for transient network errors
   - Show clear message: "Unable to connect - you can continue manually"
   - Never fail the entire transaction due to packaging extraction failure

4. **User Experience**
   - Show loading state during extraction
   - Display extraction results when available
   - Show optional "Enter Manually" button if extraction fails
   - Make it clear that packaging data is optional, not required

5. **Error Logging**
   - Log all errors with `requestId` for debugging
   - Include error context (businessId, text snippet) in logs
   - Don't expose technical details to users

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

## Graceful Error Handling Summary

### Core Principles

1. **Packaging extraction is optional** - transactions can be saved without it
2. **Never block user workflow** - always allow continuation without packaging data
3. **Implement automatic retries** - use exponential backoff for rate limit errors (429)
4. **Provide manual alternatives** - always offer manual entry option
5. **User-friendly error messages** - don't expose technical details

### Error Response Handling Pattern

```typescript
// Always use type guard to check success
const response = await packagingApi.extractPackaging(businessId, text);

if (!isPackagingExtractionSuccess(response)) {
  const error = response as PackagingExtractionErrorResponse;
  
  // Log for debugging
  console.warn('Packaging extraction failed:', {
    error: error.error,
    requestId: error.requestId,
    currentUsage: error.currentUsage,
    limit: error.limit,
  });
  
  // Show user-friendly message (don't block)
  showInfoMessage(error.error || 'Packaging extraction unavailable');
  
  // Allow user to continue - return null or empty state
  return null;
}

// Success - use the packaging data
return response;
```

### Retry Strategy for Rate Limits

- **Initial delay**: 1 second
- **Max retries**: 3 attempts
- **Backoff**: Exponential (1s → 2s → 4s)
- **After max retries**: Gracefully degrade, allow manual entry

## Notes

- **Non-blocking**: If packaging extraction fails, you can still save the transaction without packaging data
- **Confidence scores**: Use `confidence` field to determine if extraction should be reviewed/verified
- **Usage tracking**: Each extraction call counts against Vertex AI usage limits (tracked per business)
- **Performance**: Typical response time is 1-3 seconds depending on text complexity
- **Graceful degradation**: Always implement fallback to manual entry or allow proceeding without packaging data

---

## Questions?

- See the admin test page: `/admin/packaging-extraction`
- Check usage limits via: `/api/businesses/{businessId}/metadata/usage`
