# Customers List/Search Endpoint Request

## Overview
We need an endpoint to fetch and search customers from Firestore for the Sales Pipeline autocomplete feature. When a user types in the customer name field, the frontend should be able to query existing customers to provide autocomplete suggestions.

## Current Situation
- **Feature**: Add Customer screen with customer name input
- **Frontend**: Currently using a simple text input
- **Missing**: Backend endpoint to fetch/search customers from Firestore for autocomplete

## Required Endpoint

### Endpoint Specification
```
GET /api/businesses/{businessId}/customers
```

### Query Parameters
- `search` (optional, string): Search query to filter customers by name (case-insensitive partial match)
- `limit` (optional, number): Maximum number of results to return. Default: 20. Maximum: 100

### Response Structure

```typescript
{
  customers: Customer[]
  count: number  // Total number of customers matching the query (before limit)
}

type Customer = {
  id: string                    // Firestore document ID
  businessId: string            // Business ID
  name: string                  // Customer name
  stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
  createdAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
}
```

## Firestore Structure

### Collection Path
```
businesses/{businessId}/customers/{customerId}
```

### Query Requirements
1. **Search Functionality**:
   - If `search` parameter is provided, filter customers where `name` contains the search string (case-insensitive)
   - Use Firestore query with `where` clause and appropriate indexing
   - Consider using `array-contains` or text search if available, or simple string matching

2. **Sorting**:
   - Sort results by `name` alphabetically (ascending)
   - This ensures consistent ordering for autocomplete suggestions

3. **Pagination**:
   - Apply `limit` to restrict number of results
   - Default limit: 20 customers
   - Maximum limit: 100 customers

## Business Logic Requirements

### Authentication & Authorization
1. **User Authentication**:
   - Verify user is authenticated
   - Return `401 Unauthorized` if not authenticated

2. **Business Access**:
   - Verify the `businessId` exists
   - Verify user has access to the business
   - Return `404 Not Found` if business doesn't exist or user doesn't have access

3. **Permission Check**:
   - User should have read access to customers (typically implied by business access)
   - Consider if a specific permission is needed (e.g., `read_customers`)

### Search Implementation
1. **Search Query**:
   - Trim whitespace from search parameter
   - Perform case-insensitive partial match on `name` field
   - If search is empty or not provided, return all customers (up to limit)

2. **Performance**:
   - Consider adding a Firestore index on `businessId` and `name` for efficient queries
   - Limit results to prevent large payloads

## Error Handling

The endpoint should return appropriate HTTP status codes:

- `200 OK`: Successfully retrieved customers
- `400 Bad Request`: Invalid query parameters (e.g., limit exceeds maximum)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission to read customers
- `404 Not Found`: Business ID doesn't exist or user doesn't have access
- `500 Internal Server Error`: Server error during query

### Error Response Format
```typescript
{
  error: string           // Error message
  code?: string          // Optional error code
  details?: any          // Optional additional error details
}
```

## Example Requests

### Get all customers (limited)
```json
GET /api/businesses/biz_123/customers
```

### Search customers by name
```json
GET /api/businesses/biz_123/customers?search=acme&limit=10
```

## Example Responses

### Success Response (with search)
```json
{
  "customers": [
    {
      "id": "customer_abc123",
      "businessId": "biz_123",
      "name": "Acme Corporation",
      "stage": "lead",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "customer_def456",
      "businessId": "biz_123",
      "name": "Acme Industries",
      "stage": "conversation",
      "createdAt": "2024-01-10T08:15:00Z",
      "updatedAt": "2024-01-12T14:20:00Z"
    }
  ],
  "count": 2
}
```

### Success Response (no search, empty result)
```json
{
  "customers": [],
  "count": 0
}
```

## Implementation Summary

### Endpoint
- **Method**: `GET`
- **Path**: `/api/businesses/{businessId}/customers`
- **Query Parameters**: 
  - `search` (optional): Search string for customer name
  - `limit` (optional): Maximum results (default: 20, max: 100)

### Authentication & Authorization
- Verify user authentication
- Check business access
- Consider read permission check

### Query Logic
- Filter by `businessId` (from URL)
- If `search` provided: filter by `name` containing search string (case-insensitive)
- Sort by `name` ascending
- Apply `limit` (default 20, max 100)

### Response
Returns object with:
- `customers`: Array of Customer objects
- `count`: Total number of matching customers

### Error Codes
- `200`: Success
- `400`: Invalid parameters
- `401`: Not authenticated
- `403`: No permission
- `404`: Business not found
- `500`: Server error

## Firestore Index Requirements

Consider creating a composite index for efficient queries:
- Collection: `businesses/{businessId}/customers`
- Fields: `businessId` (ascending), `name` (ascending)

This will optimize queries that filter by businessId and search by name.

## Priority
**Medium** - This is needed for the autocomplete functionality in the Add Customer screen. The frontend can work without it (fallback to simple text input), but autocomplete improves user experience.

## Status
✅ **IMPLEMENTED** - The endpoint has been implemented and is ready for use. The frontend autocomplete functionality in `AddCustomerScreen.tsx` is configured to use this endpoint.

## Questions for Backend Team
1. What Firestore query method should be used for case-insensitive partial matching? (Simple string matching vs. array-contains vs. text search)
2. Should we implement pagination with cursor-based navigation, or is limit sufficient?
3. Do we need a specific permission for reading customers, or is business access sufficient?
4. Should the search be limited to exact matches, or should it support fuzzy matching?

