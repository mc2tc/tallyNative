# Oversight Alerts - Date Format Question

## Issue
The React Native app is receiving "Invalid Date" when trying to parse the `createdAt` field from oversight alerts.

## Current Implementation
The `OversightAlert` type defines `createdAt` as a `string`, but we need to know the exact format to parse it correctly.

## Question for Backend Team
**What format is the `createdAt` field in the `/api/oversight/alerts` response?**

Possible formats we're seeing in the codebase:
1. **ISO 8601 string**: `"2024-01-15T10:30:00Z"` or `"2024-01-15T10:30:00.000Z"`
2. **Timestamp string**: `"1704067200000"` (milliseconds as string)
3. **Timestamp number**: `1704067200000` (milliseconds as number)
4. **Firestore Timestamp object**: `{ seconds: 1704067200, nanoseconds: 0 }`
5. **Other format**: Please specify

## Example Response Needed
Could you provide an example of what the actual `createdAt` value looks like in the API response?

```json
{
  "alerts": [
    {
      "id": "alert_123",
      "createdAt": "???" // <-- What format is this?
      // ... other fields
    }
  ]
}
```

## Current Code
We're currently trying to handle multiple formats:
- ISO strings (with 'T' or date pattern)
- Timestamp strings (numeric strings)
- Timestamp numbers
- Firestore timestamp objects

But we're still seeing "Invalid Date" errors, which suggests the format might be different than expected.

## Request
Please confirm:
1. The exact format of `createdAt` in the API response
2. Whether it's consistent across all alerts
3. If there are any edge cases (e.g., null values, different formats for different alert types)

Once we know the format, we can update the frontend parsing logic accordingly.
