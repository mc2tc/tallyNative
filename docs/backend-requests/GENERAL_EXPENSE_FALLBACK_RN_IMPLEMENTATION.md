# General Expense Fallback Warning - React Native Implementation Guide

## Overview

When OCR extraction errors occur (such as confusing unit cost with total cost) or when accounting entries cannot be balanced, the system falls back to using the "General Expense" account. A flag is set on the transaction to indicate this fallback occurred, and the RN app should display a warning to the user so they can review and correct the transaction.

## Data Model

### TransactionAccounting Flag

```typescript
interface TransactionAccounting {
  balanced: boolean;
  charges: TransactionCharge[];
  credits: AccountingLedgerEntry[];
  debits: AccountingLedgerEntry[];
  paymentBreakdown?: PaymentBreakdownEntry[];
  /**
   * Flag indicating that accounting fell back to General Expense due to unbalanced entries.
   * This typically happens when OCR extraction errors cause item amounts to not match totals,
   * or when items cannot be properly categorized. Frontend should display a warning to the user.
   */
  hasGeneralExpenseFallback?: boolean;
}
```

### Detection Methods

There are **two ways** to detect General Expense fallback:

1. **Primary Method**: Check the `hasGeneralExpenseFallback` flag
   ```typescript
   const hasFallback = transaction.accounting?.hasGeneralExpenseFallback === true;
   ```

2. **Fallback Method**: Check if any debit entry uses "General Expense"
   ```typescript
   const hasGeneralExpenseDebit = transaction.accounting?.debits?.some(
     (debit) => debit.chartName === 'General Expense'
   ) === true;
   ```

**Recommended**: Use both methods for maximum compatibility:
```typescript
const hasGeneralExpenseWarning = 
  transaction.accounting?.hasGeneralExpenseFallback === true ||
  transaction.accounting?.debits?.some(
    (debit) => debit.chartName === 'General Expense'
  ) === true;
```

## When This Occurs

The fallback to General Expense typically happens in these scenarios:

1. **OCR Math Errors**: OCR confuses unit cost with total cost
   - Example: Item shows "15kg @ £12" but OCR extracts `quantity: 15, unitCost: 12, amount: 12`
   - Expected: `15 × 12 = 180`, but OCR extracted `amount: 12`
   - Result: Item totals don't match transaction total → accounting unbalanced → fallback

2. **Missing Account Mapping**: Items cannot be mapped to valid expense accounts

3. **Unbalanced Accounting**: Debits and credits don't match (difference > 0.01)

## UI Requirements

### TransactionDetailScreen

**Requirement**: Display a warning alert/banner when `hasGeneralExpenseWarning === true`

**Placement**: 
- Show at the top of the transaction detail screen
- Before the items list
- Use a warning/alert style (yellow/orange background)

**Alert Content**:
```
⚠️ This transaction fell back to General Expense

This may be due to OCR extraction errors or unbalanced accounting. Please review:

• Verify item quantities and unit costs match the receipt
• Update items to more specific expense accounts
• Check that item amounts add up correctly
```

**Visual Design**:
- Use warning color scheme (yellow/orange)
- Include warning icon (⚠️)
- Make it dismissible (user can close it)
- Keep it visible until user reviews the transaction

### Transaction List Screen

**Optional Enhancement**: Add a visual indicator on transaction cards

- Small warning badge/icon next to transaction amount or vendor name
- Tooltip/tap to reveal: "General Expense fallback - needs review"
- Helps users quickly identify transactions requiring attention

## Implementation Example

```typescript
// In TransactionDetailScreen component
const transaction = useTransaction(); // Your transaction hook

const hasGeneralExpenseWarning = 
  transaction.accounting?.hasGeneralExpenseFallback === true ||
  transaction.accounting?.debits?.some(
    (debit) => debit.chartName === 'General Expense'
  ) === true;

// In render:
{hasGeneralExpenseWarning && (
  <Alert variant="warning" sx={{ mb: 2 }}>
    <AlertTitle>⚠️ General Expense Fallback</AlertTitle>
    <AlertDescription>
      This transaction fell back to General Expense, likely due to OCR extraction 
      errors or unbalanced accounting. Please review:
      <ul>
        <li>Verify item quantities and unit costs match the receipt</li>
        <li>Update items to more specific expense accounts</li>
        <li>Check that item amounts add up correctly</li>
      </ul>
    </AlertDescription>
  </Alert>
)}
```

## User Actions

When users see this warning, they should be able to:

1. **Review Items**: Check each item's quantity, unit cost, and total amount
2. **Edit Items**: Update incorrect values (especially unit costs)
3. **Change Accounts**: Assign items to more specific expense accounts
4. **Verify Math**: Ensure item totals match the transaction total

## Backend Behavior

- The flag is set automatically when accounting falls back to General Expense
- No API changes required - flag is already included in transaction responses
- Flag persists until user manually corrects the transaction

## Related Features

- **OCR Item Math Validation**: Backend now validates `quantity × unitCost === amount` during OCR processing
- **Item Math Warnings**: Backend logs warnings when item math doesn't match (helps identify OCR errors)
- **Accounting Balance Check**: System automatically detects unbalanced entries and applies fallback

## Testing

Test scenarios:

1. **OCR Math Error**: Upload receipt where OCR confuses unit/total cost
2. **Unbalanced Items**: Create transaction where item totals don't match transaction total
3. **Missing Accounts**: Transaction with items that can't be mapped to valid accounts
4. **Normal Transaction**: Verify warning doesn't show for correctly processed transactions

## Questions?

If you have questions about:
- Flag detection logic
- UI/UX recommendations
- Edge cases

Please reach out to the backend team or refer to:
- `src/app/authenticated/transactions3/services/accountingEntryCreationService.ts` (fallback logic)
- `src/app/authenticated/transactions3/services/ocrTransform.ts` (flag setting)
- `src/app/authenticated/transactions3/types/interfaces.ts` (type definitions)

