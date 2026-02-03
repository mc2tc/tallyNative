# Swipe to Move Items to Drawings or Director's Loan Account

## Overview
We've implemented a swipe-left gesture on purchase transaction item cards that allows users to move items to either "Drawings" (for sole traders/partnerships) or "Director's Loan Account" (for limited companies). When users swipe left on an item and then confirm the transaction, the item's `debitAccount` is updated accordingly.

## Frontend Implementation

### User Flow
1. User views a purchase transaction detail screen
2. User swipes left on an item card
3. Item is visually removed from the screen
4. User clicks "Confirm and save"
5. Transaction is updated with the item's `debitAccount` set to the appropriate account

### Account Selection Logic
The account is determined based on the business entity type:
- **Sole Trader** or **Partnership** → `debitAccount: "Drawings"`
- **Limited Company** (or other entity types) → `debitAccount: "Director's Loan Account"`

### API Update
When `handleConfirmVerification` is called, we send an updated `itemList` to either:
- `POST /api/transactions3/verify` (for unverified transactions)
- `PATCH /api/transactions3/verified-purchase/:transactionId` (for verified transactions)

The update includes all items with their `debitAccount` values:
- **Removed items (swiped)**: `debitAccount` is set to "Drawings" or "Director's Loan Account" based on business entity
- **Visible items**: Keep their existing or edited `debitAccount` values

Example payload structure:
```typescript
{
  itemList: [
    {
      name: string,
      amount: number,
      amountExcluding?: number,
      vatAmount?: number,
      debitAccount: "Drawings" | "Director's Loan Account" | string,
      debitAccountConfirmed: true,
      isBusinessExpense: boolean, // false for removed items
      category?: string
    }
  ],
  paymentBreakdown?: Array<{ type: string; amount: number }>
}
```

## Issue: Director's Loan Account Falling Back to General Expense

### Problem
When an item's `debitAccount` is set to "Director's Loan Account" and the transaction is saved, the backend appears to be creating accounting entries where `debits[i].chartName` is falling back to "General Expense" instead of using "Director's Loan Account".

### Expected Behavior
When `debitAccount: "Director's Loan Account"` is sent in the `itemList`:
- The backend should create a debit entry with `chartName: "Director's Loan Account"`
- This should match the behavior for "Drawings" which appears to work correctly

### Current Behavior
- Items with `debitAccount: "Drawings"` → correctly creates `debits[i].chartName: "Drawings"`
- Items with `debitAccount: "Director's Loan Account"` → incorrectly creates `debits[i].chartName: "General Expense"`

### Investigation Needed
Please check:
1. The account mapping logic in the backend that converts `itemList[].debitAccount` to `debits[].chartName`
2. Whether "Director's Loan Account" is recognized as a valid chart of accounts name
3. If there's a case-sensitivity or exact string matching issue
4. The fallback logic that defaults to "General Expense" when an account isn't found

### Test Cases
1. **Sole Trader/Partnership**: Swipe item → should set `debitAccount: "Drawings"` → should create `debits[].chartName: "Drawings"` ✅ (working)
2. **Limited Company**: Swipe item → should set `debitAccount: "Director's Loan Account"` → should create `debits[].chartName: "Director's Loan Account"` ❌ (falling back to "General Expense")

## Files Modified
- `screens/TransactionDetailScreen.tsx`: Added swipe gesture, removal tracking, and account update logic

## Related Code Location
The update logic is in `handleConfirmVerification` function around line 350-395 in `TransactionDetailScreen.tsx`.

