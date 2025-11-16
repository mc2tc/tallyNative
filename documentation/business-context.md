# Business Context API

This API stores VAT-related configuration for UK businesses. The React Native onboarding flow should gather the fields below and send them to the server so downstream transaction flows know how to interpret receipts, VAT thresholds, and supply types.

## Endpoint

```
POST /api/business-context
```

## Request Body

```json
{
  "businessId": "string",
  "createdBy": "user email or uid",
  "context": {
    "isVatRegistered": true,
    "vatRegistrationNumber": "GB123456789",
    "vatRegistrationDate": "2024-01-01",
    "vatScheme": "standard",
    "taxableTurnoverLast12Months": 65000,
    "expectedTurnoverNext12Months": 72000,
    "wantsThresholdMonitoring": true,
    "supplyTypes": ["standard_rated", "services"],
    "partiallyExempt": false,
    "sellsToEU": false,
    "sellsOutsideEU": false,
    "importsGoods": false,
    "exportsGoods": false,
    "primaryCurrency": "GBP",
    "secondaryCurrencies": ["EUR"],
    "keepReceiptsForVatReclaim": true,
    "plansToRegister": false,
    "registrationTimeline": "unknown",
    "mainCategory": "Services",
    "subCategory": "Professional Services"
  }
}
```

### Field Notes

- `businessId`: Firestore document ID for the business.
- `createdBy`: email or UID of the user providing the info (used for audit).
- `isVatRegistered`: true if the business is already registered with HMRC.
- `vatScheme`: one of `standard | flat_rate | cash_accounting | retail | margin | other`.
- `supplyTypes`: at least one from `standard_rated`, `zero_rated`, `vat_exempt`, `mixed`, `services`, `goods`.
- `primaryCurrency`: 3-letter ISO code (default to `GBP`).
- `registrationTimeline`: `next_3_months | next_6_months | next_12_months | unknown`.
- `mainCategory` / `subCategory`: business type selection used to assign the chart of accounts (see table below).

## Business Type & Chart of Accounts

The RN onboarding flow must also send the business type so we can map to the correct chart of accounts. Send both `mainCategory` and `subCategory` using the labels below.

### Main Categories (with example subcategories)

| Main Category                                | Example Subcategories                                                                                                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Services`                                   | `Personal Services`, `Professional Services`, `Food & Beverage Services`, `Restaurants & Bars`, `Wellness & Beauty`, `Fitness & Health`, `Property`, `Short-Term Rentals`, `Consulting`, `Healthcare` |
| `Retail / Goods`                             | `Clothing & Apparel`, `Grocery & Food`, `Electronics & Appliances`, `Home Goods & Furnishings`, `General Merchandise`                                                                                 |
| `Manufacturing, Production and Construction` | `Food & Beverage Production`, `Manufacturing`, `Crafts`, `Printing & Publishing`, `Building and Construction`                                                                                         |
| `Wholesale / Distribution`                   | `Wholesale Trade`, `Distribution & Logistics`, `Warehousing & Fulfillment`, `Import & Export`, `B2B Supplies`                                                                                         |
| `Online & Digital`                           | `E-commerce`, `Digital Services`, `Online Education`, `Content Creation`, `SaaS & Software`, `Online Consulting`, `Digital Products`                                                                  |
| `Personal`                                   | `Personal` (used for personal-finance tracking)                                                                                                                                                       |

If the user skips this step, default to:

```json
"mainCategory": "Services",
"subCategory": "Professional Services"
```

The server uses these values to call `getBusinessAccounts(mainCategory, subCategory)` and assign the matching chart of accounts.

## Response

```json
{
  "success": true,
  "context": {
    "businessId": "string",
    "createdAt": 1713123456789,
    "updatedAt": 1713123456789,
    "createdBy": "user@example.com",
    "...": "all context fields echoed back"
  }
}
```

## Firestore Storage

Documents are stored under:

```
businessContext/{businessId}
```

The API merges updates so the RN app can re-submit the form whenever settings change.

## RN Integration Checklist

1. Collect the VAT onboarding answers in the RN account creation flow.
2. Call `POST /api/business-context` after the business document is created (or whenever the user updates their VAT profile).
3. Store the returned context locally if needed for offline state.
4. Use the stored flags to tailor client UX (e.g., show VAT prompts only when relevant).

Let the Web team know if additional fields or validation rules are needed. This schema is the single source of truth for VAT decisions across Tally services.
