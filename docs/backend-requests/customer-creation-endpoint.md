# Customer Creation Endpoint Request

## Overview
We need an endpoint to create customers in the Sales Pipeline feature. When a user adds a new lead/customer from the Sales Pipeline screen, the customer data should be saved to Firestore in the `businesses/<businessId>/customers` collection.

## Current Situation
- **Feature**: Sales Pipeline screen with "Add Lead" functionality
- **Frontend**: Modal with customer name input field and save button
- **Missing**: Backend endpoint to persist customer data to Firestore

## Required Endpoint

### Endpoint Specification
```
POST /api/businesses/{businessId}/customers
```

### Request Body
```typescript
{
  name: string                    // Customer/company name (required)
  stage?: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'  // Optional stage
  projectName?: string           // Optional project name
  estimatedProjectValue?: string  // Optional estimated project value
  source?: string                 // Optional source
}
```

### Response Structure

```typescript
{
  id: string                    // Firestore document ID
  businessId: string            // Business ID
  name: string                  // Customer name (trimmed)
  stage: string                 // Stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'
  projectName?: string          // Project name (if provided)
  estimatedProjectValue?: string // Estimated project value (if provided)
  source?: string               // Source (if provided)
  createdAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
}
```

## Firestore Structure

### Collection Path
```
businesses/{businessId}/customers/{customerId}
```

### Document Schema
```typescript
{
  name: string                  // Customer/company name (trimmed, max 200 chars, required)
  businessId: string            // Business ID
  stage: 'lead' | 'conversation' | 'proposal' | 'won' | 'lost'  // Stage (default: 'lead')
  projectName?: string          // Project name (optional)
  estimatedProjectValue?: string // Estimated project value (optional)
  source?: string               // Source (optional)
  createdAt: Timestamp         // Firestore server timestamp
  updatedAt: Timestamp         // Firestore server timestamp
}
```

## Business Logic Requirements

### Validation
1. **Name Field**:
   - `name` is **required** and must be non-empty
   - `name` must be trimmed of leading/trailing whitespace
   - Maximum length: **200 characters**
   - Return `400 Bad Request` if validation fails

2. **Stage Field**:
   - `stage` is optional (defaults to `'lead'` if not provided)
   - Must be one of: `'lead'`, `'conversation'`, `'proposal'`, `'won'`, `'lost'`
   - Return `400 Bad Request` if invalid value

3. **Project Name Field**:
   - `projectName` is optional
   - Must be trimmed of leading/trailing whitespace
   - Required when `stage` is `'proposal'`, `'won'`, or `'lost'`
   - Optional when `stage` is `'lead'` or `'conversation'`
   - Maximum length: **200 characters**
   - Return `400 Bad Request` if required but missing or exceeds max length

4. **Estimated Project Value Field**:
   - `estimatedProjectValue` is optional
   - Must be trimmed of leading/trailing whitespace
   - Required when `stage` is `'proposal'`, `'won'`, or `'lost'`
   - Optional when `stage` is `'lead'` or `'conversation'`
   - Should be a numeric value (string format)
   - Return `400 Bad Request` if required but missing

5. **Source Field**:
   - `source` is optional
   - Must be trimmed of leading/trailing whitespace
   - Maximum length: **200 characters**
   - Return `400 Bad Request` if exceeds max length

### Authentication & Authorization
1. **User Authentication**:
   - Verify user is authenticated
   - Return `401 Unauthorized` if not authenticated

2. **Business Access**:
   - Verify the `businessId` exists
   - Verify user has access to the business
   - Return `404 Not Found` if business doesn't exist

3. **Permission Check**:
   - Validate user has `create_customers` permission for the business
   - Return `403 Forbidden` if permission is missing

### Customer Creation
The endpoint creates a customer document with:
- `name`: From request body (trimmed, required)
- `businessId`: From URL parameter
- `stage`: From request body or defaults to `'lead'` if not provided
- `projectName`: From request body (trimmed, optional, required for certain stages)
- `estimatedProjectValue`: From request body (trimmed, optional, required for certain stages)
- `source`: From request body (trimmed, optional)
- `createdAt`: Server timestamp (Firestore server timestamp)
- `updatedAt`: Server timestamp (Firestore server timestamp)

**Note**: All optional fields should only be saved to Firestore if they are provided in the request. Do not save `null` or empty string values for optional fields.

## Error Handling

The endpoint must return appropriate HTTP status codes:

- `201 Created`: Customer successfully created
- `400 Bad Request`: Invalid request body (missing name, name is empty after trimming, name exceeds 200 characters, invalid format)
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have `create_customers` permission for the business
- `404 Not Found`: Business ID doesn't exist or user doesn't have access to the business
- `500 Internal Server Error`: Server error during creation

### Error Response Format
```typescript
{
  error: string           // Error message
  code?: string          // Optional error code
  details?: any          // Optional additional error details
}
```

## Example Requests

### Minimal Request (Lead)
```json
POST /api/businesses/biz_123/customers
Content-Type: application/json

{
  "name": "Acme Corporation"
}
```

### Full Request (Proposal Stage)
```json
POST /api/businesses/biz_123/customers
Content-Type: application/json

{
  "name": "Acme Corporation",
  "stage": "proposal",
  "projectName": "Website Redesign",
  "estimatedProjectValue": "50000",
  "source": "Referral"
}
```

## Example Responses

### Minimal Response
```json
{
  "id": "customer_abc123",
  "businessId": "biz_123",
  "name": "Acme Corporation",
  "stage": "lead",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Full Response
```json
{
  "id": "customer_abc123",
  "businessId": "biz_123",
  "name": "Acme Corporation",
  "stage": "proposal",
  "projectName": "Website Redesign",
  "estimatedProjectValue": "50000",
  "source": "Referral",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

## Implementation Summary

### Endpoint
- **Method**: `POST`
- **Path**: `/api/businesses/{businessId}/customers`
- **Request Body**: 
  - `name` (string, required)
  - `stage` (string, optional, defaults to 'lead')
  - `projectName` (string, optional, required for proposal/won/lost stages)
  - `estimatedProjectValue` (string, optional, required for proposal/won/lost stages)
  - `source` (string, optional)

### Validation Rules
- `name` is required and non-empty
- `name` is trimmed of whitespace
- `name` maximum length: 200 characters
- `stage` must be one of: 'lead', 'conversation', 'proposal', 'won', 'lost'
- `projectName` is required when stage is 'proposal', 'won', or 'lost'
- `projectName` is optional when stage is 'lead' or 'conversation'
- `projectName` maximum length: 200 characters
- `estimatedProjectValue` is required when stage is 'proposal', 'won', or 'lost'
- `estimatedProjectValue` is optional when stage is 'lead' or 'conversation'
- `source` is optional, maximum length: 200 characters

### Authentication & Authorization
- Verify user authentication
- Check business access
- Validate `create_customers` permission

### Customer Document Fields
- `name`: From request (trimmed, required)
- `businessId`: From URL
- `stage`: From request or `'lead'` (default)
- `projectName`: From request (trimmed, optional, only save if provided)
- `estimatedProjectValue`: From request (trimmed, optional, only save if provided)
- `source`: From request (trimmed, optional, only save if provided)
- `createdAt`: Server timestamp
- `updatedAt`: Server timestamp

**Important**: Only save optional fields (`projectName`, `estimatedProjectValue`, `source`) to Firestore if they are provided in the request. Do not save `null` or empty string values for these fields.

### Response
Returns customer object with: `id`, `businessId`, `name`, `stage`, `createdAt`, `updatedAt` (all timestamps as ISO 8601 strings)

### Error Codes
- `400`: Validation errors
- `401`: Not authenticated
- `403`: Missing `create_customers` permission
- `404`: Business not found or no access
- `500`: Server error

## Priority
**High** - This is needed to complete the "Add Lead" functionality in the Sales Pipeline screen. The frontend is ready and waiting for this endpoint with all fields implemented.

## Backend Confirmation Required

**Please confirm that the following fields will be saved to Firestore:**
- ✅ `name` (required)
- ✅ `stage` (optional, defaults to 'lead')
- ✅ `projectName` (optional, required for proposal/won/lost stages)
- ✅ `estimatedProjectValue` (optional, required for proposal/won/lost stages)
- ✅ `source` (optional)

**All fields are currently being sent from the frontend and should be persisted to Firestore in the `businesses/<businessId>/customers` collection.**

