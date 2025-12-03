# Sale Transaction Not Appearing in Reports

## Issue
Manual sale transactions created via `/authenticated/transactions2/api/sales/manual` are showing as "Reporting Ready" in the UI but are not appearing in the Reports screen (ReportsScreen).

## Current Implementation

### Frontend
- The frontend sends `incomeAccount` in the request payload when creating manual sale transactions
- After creation, the frontend auto-verifies the transaction (since it's manually entered and trusted)
- The transaction appears in the "Reporting Ready" section of the Transactions screen

### Backend Request
```typescript
POST /authenticated/transactions2/api/sales/manual?businessId={businessId}

{
  customerName: string
  transactionDate: string (ISO date)
  totalAmount: number
  currency?: string
  description?: string
  reference?: string
  incomeAccount?: string  // <-- This is being sent (should be a "Sales Revenue" account name)
}
```

## Expected Behavior
When a sale transaction is created with an `incomeAccount` (which should be a "Sales Revenue" account name):
1. The transaction should be created
2. Accounting entries should be automatically created linking the transaction to the Sales Revenue account
3. The transaction value should appear in the chart accounts when fetched with `withValues: true`
4. The ReportsScreen should show the income in its calculations (by filtering accounts with "sales revenue" in the name)

## Current Behavior
- Transaction is created successfully ✅
- Transaction shows as "Reporting Ready" in UI ✅
- Transaction does NOT appear in ReportsScreen ❌
- Chart accounts API (`/api/businesses/{businessId}/chart-accounts?withValues=true`) does not include the transaction value in income accounts ❌

## ReportsScreen Logic
The ReportsScreen calculates income by:
1. Fetching chart accounts with `withValues: true`
2. Filtering accounts where the name contains "sales revenue" or "revenue" (or type === 'income' as fallback)
3. Summing the `value` property of each sales revenue account

**Note:** The chart of accounts uses "Sales Revenue" accounts (by name) rather than accounts with type "income". The frontend has been updated to filter by account name accordingly.

If the transaction's value isn't being added to the sales revenue account's `value`, it won't appear in reports.

## Questions for Backend Team
1. Does the `/authenticated/transactions2/api/sales/manual` endpoint automatically create accounting entries when `incomeAccount` is provided?
2. If not, what additional step is needed to create the accounting entries?
3. Should manual sale transactions be automatically verified, or do they need manual verification?
4. Is there a delay in processing transactions into chart accounts, or should it be immediate?
5. Are there any additional fields or parameters needed to ensure accounting entries are created?

## Related Files
- Frontend API: `lib/api/transactions2.ts` (line 112-130)
- Frontend Screen: `screens/CreateInvoiceScreen.tsx` (line 240-285)
- Reports Screen: `screens/ReportsScreen.tsx` (line 118-122)
- Chart Accounts API: `lib/api/chartAccounts.ts`

## Next Steps
Once we receive confirmation from the backend team, we will:
- Update the frontend if additional steps are needed
- Add proper error handling if accounting entries fail to create
- Update the user experience based on backend requirements

