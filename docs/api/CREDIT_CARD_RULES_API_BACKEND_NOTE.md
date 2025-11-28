# Credit Card Rules API – Backend Implementation Note

This note is for the backend team to implement the credit card rules API endpoints, mirroring the existing bank statement rules API pattern.

## Overview

The React Native app now supports creating and editing credit card transaction rules, similar to bank statement rules. The frontend expects the following API endpoints to be implemented.

## Required Endpoints

### 1. GET `/authenticated/transactions2/api/credit-card-statements/rules?businessId=<business-id>`

**Purpose**: Fetch all credit card rules for a business.

**Query Parameters**:
- `businessId` (required): The business ID to fetch rules for

**Response**:
```json
{
  "rules": [
    {
      "id": "rule-id-123",
      "title": "Software subscriptions",
      "description": "Matches common SaaS subscription charges",
      "keywords": ["STRIPE", "SUBSCRIPTION", "RECURRING"],
      "debitAccount": "Software Expenses",
      "category": "credit_card_fee",
      "isBusinessExpense": true
    }
  ],
  "count": 1
}
```

**Notes**:
- The `businessId` query parameter is required and should be used to return per-business rule overrides (similar to bank statement rules).
- If a business has custom rules, return those. Otherwise, return default/global rules.
- The `category` field should default to `"credit_card_fee"` for credit card rules.

### 2. PATCH `/authenticated/transactions2/api/credit-card-statements/rules/<rule-id>?businessId=<business-id>`

**Purpose**: Update the keywords for an existing credit card rule.

**URL Parameters**:
- `rule-id` (required): The ID of the rule to update

**Query Parameters**:
- `businessId` (required): The business ID (used to store per-business overrides)

**Request Body**:
```json
{
  "keywords": ["STRIPE", "SUBSCRIPTION", "RECURRING", "NEW_KEYWORD"]
}
```

**Response**:
```json
{
  "rule": {
    "id": "rule-id-123",
    "title": "Software subscriptions",
    "description": "Matches common SaaS subscription charges",
    "keywords": ["STRIPE", "SUBSCRIPTION", "RECURRING", "NEW_KEYWORD"],
    "debitAccount": "Software Expenses",
    "category": "credit_card_fee",
    "isBusinessExpense": true
  }
}
```

**Notes**:
- Only the `keywords` array is editable from the mobile app in this iteration.
- The `businessId` query parameter is used to store per-business keyword overrides.
- When a business edits keywords, those overrides should be saved and returned on subsequent GET requests for that business.

### 3. POST `/authenticated/transactions2/api/credit-card-statements/rules?businessId=<business-id>`

**Purpose**: Create a new credit card rule for a business.

**Query Parameters**:
- `businessId` (required): The business ID to create the rule for

**Request Body**:
```json
{
  "title": "Office supplies",
  "description": "Matches office supply purchases",
  "keywords": ["OFFICE DEPOT", "STAPLES", "AMAZON OFFICE"],
  "debitAccount": "Office Supplies Expense",
  "category": "credit_card_fee",
  "isBusinessExpense": true
}
```

**Response**:
```json
{
  "rule": {
    "id": "new-rule-id-456",
    "title": "Office supplies",
    "description": "Matches office supply purchases",
    "keywords": ["OFFICE DEPOT", "STAPLES", "AMAZON OFFICE"],
    "debitAccount": "Office Supplies Expense",
    "category": "credit_card_fee",
    "isBusinessExpense": true
  }
}
```

**Notes**:
- The `category` field should be set to `"credit_card_fee"` by default.
- The `isBusinessExpense` field should default to `true` (the mobile app always sends `true`).
- The `businessId` query parameter is required and should be used to associate the rule with the business.

## Frontend Implementation Details

The frontend implementation is in:
- **API Client**: `lib/api/creditCardRules.ts`
- **Detail Screen**: `screens/CreditCardRuleDetailScreen.tsx` (allows editing keywords)
- **Create Screen**: `screens/CreditCardRuleCreateScreen.tsx` (allows creating new rules)
- **Integration**: `screens/TransactionsScaffoldScreen.tsx` (displays rules in the "Auto card rules" column)

## Key Differences from Bank Statement Rules

1. **Endpoint Path**: Uses `/credit-card-statements/rules` instead of `/bank-statements/rules`
2. **Category Default**: Default category is `"credit_card_fee"` instead of `"bank_fee"`
3. **Credits Account**: In the UI, the credits account is shown as "Credit Card" instead of "Bank"

## Business Logic Requirements

1. **Per-Business Overrides**: Similar to bank statement rules, keyword edits should be stored as per-business overrides. When a business fetches rules, they should see their custom keywords if they've made edits.

2. **Rule Matching**: When processing credit card transactions, the backend should:
   - Match transaction descriptions/merchants against the `keywords` array (case-insensitive matching recommended)
   - Apply the `debitAccount` from the matching rule
   - Set `isBusinessExpense` based on the rule's value

3. **Validation**:
   - `title` is required and should be non-empty
   - `keywords` array must contain at least one keyword
   - `debitAccount` must be a valid account name from the business's chart of accounts
   - `businessId` must be provided and valid

## Testing Recommendations

1. Test creating a new rule with all required fields
2. Test editing keywords for an existing rule
3. Test that per-business keyword overrides are saved and returned correctly
4. Test that rules are properly applied to credit card transactions during processing
5. Verify that the GET endpoint returns business-specific overrides when available

## Questions or Issues

If you need clarification on any aspect of the credit card rules API or implementation, please reach out to the frontend team.

