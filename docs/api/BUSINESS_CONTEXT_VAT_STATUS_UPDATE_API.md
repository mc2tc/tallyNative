# Business Context VAT Status Update API

## Overview

This API endpoint allows updating VAT-related information in the business context. It provides a PATCH endpoint to update only VAT-specific fields without requiring the full business context payload.

## Endpoint

**PATCH** `/api/business-context/vat-status`

**Base URL:** Your backend API URL (e.g., `https://your-api.com`)

## Authentication

This endpoint requires authentication via Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## Request Format

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessId` | string | Yes | The business ID to update VAT status for |

### Request Body

All fields are optional. Only provided fields will be updated. Fields can be set to `null` to clear them.

```typescript
{
  isVatRegistered?: boolean
  vatRegistrationNumber?: string | null
  vatRegistrationDate?: string | null  // ISO format (YYYY-MM-DD)
  vatScheme?: 'standard' | 'flat_rate' | 'cash_accounting' | 'retail' | 'margin' | 'other' | null
  vatFlatRateBusinessType?: string | null
  vatFlatRateLimitedCostBusiness?: boolean | null
  vatFlatRatePercentageOverride?: number | null
  taxableTurnoverLast12Months?: number | null
  expectedTurnoverNext12Months?: number | null
  wantsThresholdMonitoring?: boolean
  supplyTypes?: string[]  // Array of: 'standard_rated', 'zero_rated', 'vat_exempt', 'mixed', 'services', 'goods'
  partiallyExempt?: boolean | null
  sellsToEU?: boolean | null
  sellsOutsideEU?: boolean | null
  importsGoods?: boolean | null
  exportsGoods?: boolean | null
  keepReceiptsForVatReclaim?: boolean
  plansToRegister?: boolean | null
  registrationTimeline?: 'next_3_months' | 'next_6_months' | 'next_12_months' | 'unknown' | null
}
```

### Example Request

```typescript
PATCH /api/business-context/vat-status?businessId=business123
Headers:
  Authorization: Bearer <firebase_id_token>
  Content-Type: application/json

Body:
{
  "isVatRegistered": true,
  "vatRegistrationNumber": "GB123456789",
  "vatRegistrationDate": "2024-01-01",
  "vatScheme": "flat_rate",
  "vatFlatRateBusinessType": "IT consultant",
  "vatFlatRateLimitedCostBusiness": false,
  "taxableTurnoverLast12Months": 65000,
  "expectedTurnoverNext12Months": 72000,
  "wantsThresholdMonitoring": true,
  "supplyTypes": ["standard_rated", "services"],
  "partiallyExempt": false,
  "sellsToEU": false,
  "sellsOutsideEU": false,
  "importsGoods": false,
  "exportsGoods": false,
  "keepReceiptsForVatReclaim": true,
  "plansToRegister": false
}
```

## Response Format

### Success Response (200)

Returns the updated VAT status:

```json
{
  "success": true,
  "vatStatus": {
    "isVatRegistered": true,
    "vatRegistrationNumber": "GB123456789",
    "vatRegistrationDate": "2024-01-01",
    "vatScheme": "flat_rate",
    "vatFlatRateBusinessType": "IT consultant",
    "vatFlatRateLimitedCostBusiness": false,
    "vatFlatRatePercentageOverride": null,
    "taxableTurnoverLast12Months": 65000,
    "expectedTurnoverNext12Months": 72000,
    "wantsThresholdMonitoring": true,
    "supplyTypes": ["standard_rated", "services"],
    "partiallyExempt": false,
    "sellsToEU": false,
    "sellsOutsideEU": false,
    "importsGoods": false,
    "exportsGoods": false,
    "keepReceiptsForVatReclaim": true,
    "plansToRegister": false,
    "registrationTimeline": "unknown",
    "updatedAt": 1713123456789
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Business ID is required"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

#### 422 Validation Error
```json
{
  "error": "Validation failed",
  "details": {
    "vatScheme": "Invalid VAT scheme value",
    "supplyTypes": "At least one supply type is required"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to update VAT status",
  "details": "Error message details"
}
```

## Implementation Notes

1. **Partial Updates**: The endpoint should support partial updates. Only fields provided in the request body should be updated. Fields not included should remain unchanged.

2. **Null Values**: Fields can be explicitly set to `null` to clear them. The backend should handle this appropriately.

3. **Validation**:
   - If `isVatRegistered` is `true`, `vatRegistrationNumber` should be required
   - `supplyTypes` array should not be empty if provided
   - `vatRegistrationDate` should be in ISO format (YYYY-MM-DD)
   - `vatScheme` should be one of the valid enum values
   - `registrationTimeline` should be one of the valid enum values

4. **Business Context Creation**: If the business context doesn't exist yet, the endpoint should create it with the provided VAT status fields.

5. **Access Control**: The endpoint should verify that the authenticated user has access to the requested business before allowing updates.

6. **Updated Timestamp**: The `updatedAt` field should be automatically updated to the current timestamp when any field is modified.

## Integration with Existing Endpoints

This endpoint complements the existing endpoints:
- `GET /api/business-context/vat-status` - Read VAT status
- `GET /api/business-context` - Read full business context
- `POST /api/business-context` - Create/update full business context

The PATCH endpoint is specifically designed for updating only VAT-related fields, which is more efficient than using the full upsert endpoint when only VAT information needs to be updated.

## React Native Integration

The React Native app uses this endpoint via:

```typescript
import { businessContextApi } from '../lib/api/businessContext'

await businessContextApi.updateVatStatus(businessId, {
  isVatRegistered: true,
  vatRegistrationNumber: "GB123456789",
  // ... other fields
})
```

The API client automatically handles:
- Firebase ID token authentication
- Request/response serialization
- Error handling

