# Business Context VAT Status API

## Overview

This API endpoint provides VAT-related information from the business context for display in the React Native Settings screen. It returns only VAT-specific fields, making it ideal for displaying the business's VAT registration status and related configuration.

## Endpoint

**GET** `/api/business-context/vat-status`

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
| `businessId` | string | Yes | The business ID to fetch VAT status for |

### Example Request

```typescript
GET /api/business-context/vat-status?businessId=business123
Headers:
  Authorization: Bearer <firebase_id_token>
  Content-Type: application/json
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "vatStatus": {
    "isVatRegistered": true,
    "vatRegistrationNumber": "GB123456789",
    "vatRegistrationDate": "2024-01-01",
    "vatScheme": "standard",
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

### Business Context Not Found (200)

If the business context doesn't exist yet, the endpoint returns:

```json
{
  "success": true,
  "vatStatus": null,
  "message": "Business context not found"
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

#### 500 Internal Server Error
```json
{
  "error": "Failed to fetch VAT status",
  "details": "Error message details"
}
```

## Response Fields

### VAT Basics
- `isVatRegistered` (boolean): Whether the business is VAT registered
- `vatRegistrationNumber` (string | null): VAT registration number (e.g., "GB123456789")
- `vatRegistrationDate` (string | null): Date of VAT registration (ISO format)
- `vatScheme` (string | null): VAT scheme type. Possible values:
  - `"standard"` - Standard VAT scheme
  - `"flat_rate"` - Flat rate scheme
  - `"cash_accounting"` - Cash accounting scheme
  - `"retail"` - Retail scheme
  - `"margin"` - Margin scheme
  - `"other"` - Other scheme
- `vatFlatRateBusinessType` (string | null): Business type for flat rate scheme
- `vatFlatRateLimitedCostBusiness` (boolean | null): Whether business is a limited cost trader
- `vatFlatRatePercentageOverride` (number | null): Custom flat rate percentage override

### Threshold Monitoring
- `taxableTurnoverLast12Months` (number | null): Taxable turnover in the last 12 months
- `expectedTurnoverNext12Months` (number | null): Expected turnover in the next 12 months
- `wantsThresholdMonitoring` (boolean | null): Whether threshold monitoring is enabled

### Supply Types
- `supplyTypes` (string[]): Array of supply types. Possible values:
  - `"standard_rated"` - Standard rated supplies
  - `"zero_rated"` - Zero rated supplies
  - `"vat_exempt"` - VAT exempt supplies
  - `"mixed"` - Mixed supplies
  - `"services"` - Services
  - `"goods"` - Goods
- `partiallyExempt` (boolean | null): Whether the business is partially exempt

### Markets
- `sellsToEU` (boolean | null): Whether the business sells to EU
- `sellsOutsideEU` (boolean | null): Whether the business sells outside EU
- `importsGoods` (boolean | null): Whether the business imports goods
- `exportsGoods` (boolean | null): Whether the business exports goods

### Receipts
- `keepReceiptsForVatReclaim` (boolean | null): Whether to keep receipts for VAT reclaim

### Future Intent
- `plansToRegister` (boolean | null): Whether the business plans to register for VAT
- `registrationTimeline` (string | null): Timeline for registration. Possible values:
  - `"next_3_months"`
  - `"next_6_months"`
  - `"next_12_months"`
  - `"unknown"`

### Metadata
- `updatedAt` (number): Timestamp of last update (Unix timestamp in milliseconds)

## React Native Integration Example

```typescript
import { getAuth } from 'firebase/auth';

async function fetchVatStatus(businessId: string) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get Firebase ID token
    const idToken = await user.getIdToken();

    // Make API request
    const response = await fetch(
      `${API_BASE_URL}/api/business-context/vat-status?businessId=${businessId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch VAT status');
    }

    const data = await response.json();
    
    if (data.success && data.vatStatus) {
      return data.vatStatus;
    } else {
      // Business context doesn't exist yet
      return null;
    }
  } catch (error) {
    console.error('Error fetching VAT status:', error);
    throw error;
  }
}

// Usage in Settings screen
const VatStatusCard = () => {
  const [vatStatus, setVatStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVatStatus() {
      try {
        const status = await fetchVatStatus(businessId);
        setVatStatus(status);
      } catch (error) {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    
    loadVatStatus();
  }, [businessId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!vatStatus) {
    return <Text>VAT information not available</Text>;
  }

  return (
    <Card>
      <Card.Title>VAT Status</Card.Title>
      <Card.Content>
        <Text>Registered: {vatStatus.isVatRegistered ? 'Yes' : 'No'}</Text>
        {vatStatus.vatRegistrationNumber && (
          <Text>VAT Number: {vatStatus.vatRegistrationNumber}</Text>
        )}
        {vatStatus.vatScheme && (
          <Text>Scheme: {vatStatus.vatScheme}</Text>
        )}
      </Card.Content>
    </Card>
  );
};
```

## Notes

- This endpoint only returns VAT-related fields. For the complete business context, use `GET /api/business-context?businessId={businessId}` (note: that endpoint may not have authentication).
- All fields except `isVatRegistered` and `supplyTypes` are optional and may be `null` or `undefined`.
- The `supplyTypes` array will always be present (empty array if not set).
- The `isVatRegistered` field defaults to `false` if not set.
- The endpoint verifies that the authenticated user has access to the requested business before returning data.

## Integration Checklist

1. ✅ Get Firebase ID token from authenticated user
2. ✅ Include `businessId` as query parameter
3. ✅ Add `Authorization: Bearer <token>` header
4. ✅ Handle case where `vatStatus` is `null` (business context not set up yet)
5. ✅ Display VAT information in Settings screen card
6. ✅ Handle error states appropriately

