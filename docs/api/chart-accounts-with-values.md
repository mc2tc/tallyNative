# Chart Accounts API with Values

## Overview

The Chart Accounts API returns the list of available accounts for a business, with optional account balance values calculated server-side. This eliminates the need for the React Native client to fetch and process all transactions locally.

## Endpoint

```
GET /api/businesses/{businessId}/chart-accounts
```

## Authentication

Requires authentication via Bearer token in the Authorization header.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `'all'` | Filter accounts by type: `'debit'`, `'credit'`, or `'all'` |
| `withValues` | boolean | No | `false` | Include account balance values in response |
| `startDate` | ISO string | No | Current UK tax year start | Start date for balance calculation (ISO 8601 format) |
| `endDate` | ISO string | No | Current UK tax year end | End date for balance calculation (ISO 8601 format) |

### Account Type Filtering

- **`type=debit`**: Returns expense accounts and purchase-related asset accounts (Inventory, Equipment, etc.)
- **`type=credit`**: Returns income, liability, and equity accounts
- **`type=all`** (default): Returns all account types

### Date Range Defaults

When `withValues=true` and dates are not provided, the API defaults to the **current UK tax year**:
- **Start**: 6th April of current year (or previous year if before 6th April)
- **End**: 5th April of following year

Example: If today is 15th March 2025, the tax year is 6th April 2024 to 5th April 2025.

## Request Examples

### Basic Request (No Values)

```http
GET /api/businesses/MyBusiness_abc123/chart-accounts?type=all
Authorization: Bearer {token}
```

### Request with Values (UK Tax Year)

```http
GET /api/businesses/MyBusiness_abc123/chart-accounts?withValues=true&type=all
Authorization: Bearer {token}
```

### Request with Custom Date Range

```http
GET /api/businesses/MyBusiness_abc123/chart-accounts?withValues=true&startDate=2024-01-01&endDate=2024-12-31&type=all
Authorization: Bearer {token}
```

### Request for Debit Accounts Only

```http
GET /api/businesses/MyBusiness_abc123/chart-accounts?withValues=true&type=debit
Authorization: Bearer {token}
```

## Response Format

### Without Values (`withValues=false` or omitted)

```json
{
  "businessId": "MyBusiness_abc123",
  "type": "all",
  "accounts": [
    {
      "name": "Sales Revenue",
      "type": "income"
    },
    {
      "name": "Rent",
      "type": "expense"
    },
    {
      "name": "Cash",
      "type": "asset"
    }
  ],
  "count": 3
}
```

### With Values (`withValues=true`)

```json
{
  "businessId": "MyBusiness_abc123",
  "type": "all",
  "accounts": [
    {
      "name": "Sales Revenue",
      "type": "income",
      "value": 50000.00
    },
    {
      "name": "Rent",
      "type": "expense",
      "value": 12000.00
    },
    {
      "name": "Cash",
      "type": "asset",
      "value": 15000.00
    },
    {
      "name": "Marketing & Advertising",
      "type": "expense",
      "value": 0.00
    }
  ],
  "count": 4,
  "period": {
    "startDate": "2024-04-06T00:00:00.000Z",
    "endDate": "2025-04-05T23:59:59.999Z"
  }
}
```

## Response Fields

### Root Object

| Field | Type | Description |
|-------|------|-------------|
| `businessId` | string | The business ID |
| `type` | string | The requested account type filter (`'debit'`, `'credit'`, or `'all'`) |
| `accounts` | array | Array of account objects |
| `count` | number | Total number of accounts returned |
| `period` | object | (Only present when `withValues=true`) Date range used for calculations |

### Account Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Account name (e.g., "Sales Revenue", "Rent") |
| `type` | string | Account type: `'income'`, `'expense'`, `'asset'`, `'liability'`, or `'equity'` |
| `value` | number | (Only present when `withValues=true`) Account balance for the period |

### Period Object (when `withValues=true`)

| Field | Type | Description |
|-------|------|-------------|
| `startDate` | ISO string | Start date of the calculation period |
| `endDate` | ISO string | End date of the calculation period |

## Account Value Calculation

### How Values Are Calculated

1. **Transaction Filtering**: Only transactions with status `'Tallied'` or `'pending'` are included
2. **Date Range**: Only transactions within the specified date range (or UK tax year default) are processed
3. **Aggregation**: Uses the same server-side logic as financial reports:
   - Processes all debits and credits from transactions
   - Applies proper accounting rules (debits increase assets/expenses, credits increase income/liabilities/equity)
   - Handles VAT accounts based on business VAT registration status
   - Supports COGS (Cost of Goods Sold) presentation for appropriate business types

### Value Interpretation

- **Income accounts**: Positive values represent income earned
- **Expense accounts**: Positive values represent expenses incurred
- **Asset accounts**: Positive values represent asset balances
- **Liability accounts**: Positive values represent amounts owed
- **Equity accounts**: Positive values represent equity balances

**Note**: Values are calculated using the same accounting rules as the web application's financial reports, ensuring consistency across platforms.

### Zero vs. Missing Values

- If an account has no transactions in the period, `value` will be `0.00`
- If `withValues=false`, the `value` field is not included in the response

## Error Handling

### Error Response Format

```json
{
  "error": "Error message description"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| `400` | Bad Request - Missing or invalid business ID |
| `401` | Unauthorized - Invalid or missing authentication token |
| `403` | Forbidden - User does not have access to this business |
| `404` | Not Found - Business not found |
| `500` | Internal Server Error - Server-side error occurred |

### Error Handling Notes

- If account value calculation fails, the API will still return the account list without values (rather than failing the entire request)
- Invalid date formats will result in a 400 error
- If `startDate` is after `endDate`, the API will still process but may return unexpected results

## Performance Considerations

### Without Values (`withValues=false`)

- **Fast**: Returns immediately with static account list
- **No database queries**: Only fetches business metadata
- **Recommended**: Use for account selection dropdowns, forms, etc.

### With Values (`withValues=true`)

- **Moderate**: Fetches and processes transactions for the date range
- **Database queries**: Fetches all transactions with status 'Tallied' or 'pending', then filters by date
- **Processing**: Aggregates transaction debits/credits using accounting rules
- **Recommended**: Use for financial reports, dashboards, account balance displays

### Optimization Tips

1. **Use specific date ranges**: Narrower date ranges process fewer transactions
2. **Cache results**: Consider caching responses for frequently accessed periods
3. **Request only needed account types**: Use `type=debit` or `type=credit` to reduce response size
4. **Avoid frequent polling**: Values don't change unless new transactions are added

## Integration Examples

### React Native Example

```typescript
// Fetch accounts with values for current UK tax year
const fetchAccountsWithValues = async (businessId: string) => {
  const response = await fetch(
    `/api/businesses/${businessId}/chart-accounts?withValues=true&type=all`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

// Fetch accounts with custom date range
const fetchAccountsForPeriod = async (
  businessId: string,
  startDate: Date,
  endDate: Date
) => {
  const startISO = startDate.toISOString().split('T')[0];
  const endISO = endDate.toISOString().split('T')[0];

  const response = await fetch(
    `/api/businesses/${businessId}/chart-accounts?withValues=true&startDate=${startISO}&endDate=${endISO}&type=all`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};
```

### Filtering Accounts by Type

```typescript
// Get only income accounts
const incomeAccounts = accounts.filter(acc => acc.type === 'income');

// Get only accounts with non-zero balances
const activeAccounts = accounts.filter(acc => acc.value && acc.value !== 0);

// Group accounts by type
const accountsByType = accounts.reduce((acc, account) => {
  if (!acc[account.type]) {
    acc[account.type] = [];
  }
  acc[account.type].push(account);
  return acc;
}, {} as Record<string, typeof accounts>);
```

## Business-Specific Account Sets

The API automatically returns the appropriate chart of accounts based on the business category:

- **Services**: Professional Services, Personal Services, Restaurants & Bars, etc.
- **Retail**: Clothing & Apparel, Grocery & Food, Electronics, etc.
- **Manufacturing**: Food & Beverage Production, Manufacturing, Crafts, etc.
- **Wholesale/Distribution**: Wholesale Trade, Distribution & Logistics, etc.
- **Online & Digital**: E-commerce, Digital Services, SaaS & Software, etc.
- **Personal**: Personal finance tracking accounts

If no category is set, the API defaults to `baseAccounts` (common accounts for all businesses).

## VAT Handling

- **VAT Registered Businesses**: VAT Input Tax and VAT Output Tax accounts are included and calculated
- **Non-VAT Registered Businesses**: VAT accounts are excluded from calculations (treated as part of expenses/income)

## COGS (Cost of Goods Sold) Support

For certain business types (Restaurants, Retail, Manufacturing, etc.), specific expense accounts are flagged as COGS and can be presented above the gross profit line in financial reports. The account values still reflect their true accounting type (expense), but the `isCOGS` flag can be used for presentation purposes.

## Migration Notes

### From Client-Side Calculation

If you were previously fetching all transactions and calculating balances client-side:

1. **Remove transaction fetching**: No longer need to fetch all transactions
2. **Use `withValues=true`**: Request account values directly from the API
3. **Handle date ranges**: Use query parameters for custom periods
4. **Simplify logic**: Server handles all aggregation rules

### Backward Compatibility

- Existing calls without `withValues` continue to work unchanged
- Account structure and types remain the same
- Only new functionality is added (values and period info)

## Future Enhancements

Potential future additions (not yet implemented):
- Caching of calculated values
- Incremental updates (only changed accounts)
- Additional aggregation options (YTD, MTD, etc.)
- Support for multiple currencies
- Account grouping/hierarchy information

## Support

For questions or issues:
1. Check error messages in API responses
2. Verify date formats are ISO 8601 compliant
3. Ensure authentication token is valid
4. Confirm business ID is correct
5. Check that user has access to the business

