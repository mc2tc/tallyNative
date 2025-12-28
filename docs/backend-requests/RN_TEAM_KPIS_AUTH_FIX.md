# 🔴 URGENT: Transactions3 KPIs Endpoint - Authentication Fix Required

## Issue

The `/authenticated/transactions3/api/kpis` endpoint is returning `401 Unauthorized` errors because requests are missing the required `Authorization` header.

## Quick Fix

**All requests to this endpoint MUST include the Authorization header:**

```typescript
// ✅ CORRECT
const token = await user.getIdToken();
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/kpis?businessId=${businessId}&timeframe=week`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,  // ✅ REQUIRED
      'Content-Type': 'application/json',
    },
  }
);
```

```typescript
// ❌ WRONG - Missing Authorization header
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/kpis?businessId=${businessId}`
);
```

## Pattern

This endpoint follows the **same authentication pattern as ALL transactions3 endpoints**:

1. Get Firebase Auth token: `await user.getIdToken()`
2. Include in headers: `Authorization: Bearer ${token}`
3. Handle 401 errors: Refresh token and retry

## Error Response

When authentication is missing, you'll see:

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

Status code: `401`

## Full Documentation

See `docs/api/transactions3/TRANSACTIONS3_KPIS_RN_INTEGRATION.md` for:
- Complete API documentation
- Response format
- Error handling examples
- Helper function patterns
- Testing checklist

## All Transactions3 Endpoints

**Note**: ALL transactions3 API endpoints require the same authentication pattern:
- `GET /authenticated/transactions3/api/transactions`
- `GET /authenticated/transactions3/api/kpis` ← **This one**
- `GET /authenticated/transactions3/api/kpis/insights`
- `POST /authenticated/transactions3/api/purchases/ocr`
- `POST /authenticated/transactions3/api/sales/pos`
- And all others...

If you're calling any transactions3 endpoint without the Authorization header, it will fail with 401.

## Action Required

1. ✅ Add `Authorization: Bearer ${token}` header to all KPIs requests
2. ✅ Verify token is valid: `await user.getIdToken(true)` if needed
3. ✅ Handle 401 errors gracefully (refresh token and retry)
4. ✅ Test the endpoint with proper authentication

## Questions?

Contact the backend team if you need assistance with:
- Token refresh logic
- Error handling patterns
- Integration examples

