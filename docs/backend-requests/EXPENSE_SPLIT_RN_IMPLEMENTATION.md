# Expense Split Feature - React Native Implementation Guide

## Overview

This feature allows users to split transaction items that are commonly shared between business and personal use (e.g., fuel, home office expenses, phone/internet bills) into business and personal portions. Items are flagged during OCR processing as `isMixedExpense: true`, and users can split them when confirming accounts in the TransactionDetailScreen.

## Data Model

### TransactionDetailItem Fields

```typescript
interface TransactionDetailItem {
  // ... existing fields
  isBusinessExpense?: boolean; // Defaults to true, even for mixed expenses
  isMixedExpense?: boolean; // Flag indicating item CAN be split (set by OCR)
  expenseSplit?: {
    businessAmount: number;
    personalAmount: number;
  };
  splitFromItemId?: string; // Reference to original item when created from split
  isActive?: boolean; // false when item has been split and replaced (defaults to true)
}
```

### Key Behaviors

- **Default State**: All items have `isBusinessExpense: true` and `isActive: true` by default
- **Mixed Expense Detection**: OCR sets `isMixedExpense: true` for fuel, home office, phone/internet, vehicle expenses
- **No Auto-Prompt**: System waits for user to initiate split - **DO NOT** automatically prompt users
- **Split Creates New Items**: When split, original item becomes inactive, two new active items are created

## UI Requirements

### TransactionDetailScreen

**Current State**: Screen shows "Inventory" and "Other" buttons for each item

**New Requirement**: Add "Split" button when:
- `item.isMixedExpense === true`
- Item is not already split (`item.expenseSplit === undefined` OR `item.splitFromItemId === undefined`)
- Item is active (`item.isActive !== false`)

**Button Placement**: Add "Split" button alongside existing "Inventory" and "Other" buttons

**Button Visibility Logic**:
```typescript
const showSplitButton = 
  item.isMixedExpense === true && 
  !item.expenseSplit && 
  !item.splitFromItemId &&
  item.isActive !== false;
```

### Split Modal/Screen

When user taps "Split" button, show a modal or navigate to a split screen with:

**Required Fields**:
1. **Item Information Display**:
   - Item name
   - Total amount (read-only)
   - Current debit account (read-only)

2. **Split Input**:
   - Business amount input (default: full item amount)
   - Personal amount input (default: 0)
   - **OR** Percentage slider/input:
     - Business percentage: 0-100% (default: 100%)
     - Personal percentage: 0-100% (calculated automatically, or vice versa)

3. **Validation**:
   - `businessAmount + personalAmount === item.amount` (within rounding tolerance, e.g., ±0.01)
   - Display error if amounts don't match
   - Real-time validation as user types/adjusts

4. **Actions**:
   - "Cancel" - close without saving
   - "Save Split" - proceed with split (see API call below)

**UI Considerations**:
- Show total amount prominently
- Make it clear that amounts must sum to total
- Consider using a slider for percentage-based splitting (common UX pattern)
- Show current split balance (e.g., "Business: £30.00 | Personal: £20.00 | Total: £50.00")

## API Implementation

### Endpoint

`PATCH /authenticated/transactions3/api/transactions/[transactionId]`

### Request Body for Split

```typescript
{
  action: 'split_item',
  itemIndex: number, // Index of the item in transaction.details.itemList
  splitDetails: {
    businessAmount: number,
    personalAmount: number
  }
}
```

### Expected Response

The API should:
1. Mark original item as `isActive: false`
2. Create two new items:

   **Business Item**:
   ```typescript
   {
     ...originalItem, // Copy all fields
     amount: businessAmount,
     amountExcluding: proportionalAmountExcluding, // Split proportionally if exists
     isBusinessExpense: true,
     debitAccount: originalItem.debitAccount, // Keep original account
     splitFromItemId: originalItemId, // Reference to original
     isActive: true,
     expenseSplit: undefined // Not set on split items
   }
   ```

   **Personal Item**:
   ```typescript
   {
     ...originalItem, // Copy all fields
     amount: personalAmount,
     amountExcluding: proportionalAmountExcluding, // Split proportionally if exists
     isBusinessExpense: false,
     debitAccount: 'Drawings', // Always use Drawings account
     splitFromItemId: originalItemId, // Reference to original
     isActive: true,
     expenseSplit: undefined // Not set on split items
   }
   ```

3. Regenerate accounting entries:
   - Business portion → original debit account
   - Personal portion → Drawings account (equity)
   - Update `groupedItemsByChartAccount` to include Drawings
   - Split VAT proportionally if `amountExcluding` exists

4. Return updated transaction with new item list

### Proportional Calculations

**For VAT/amountExcluding**:
```typescript
const businessRatio = businessAmount / originalAmount;
const personalRatio = personalAmount / originalAmount;

const businessAmountExcluding = originalAmountExcluding 
  ? originalAmountExcluding * businessRatio 
  : undefined;
  
const personalAmountExcluding = originalAmountExcluding 
  ? originalAmountExcluding * personalRatio 
  : undefined;
```

**For other proportional fields** (quantity, unitCost if applicable):
- Split proportionally based on amount ratio
- Or set to undefined if not applicable

## Editing Split Items

### Adjusting Split Amounts

When editing a split item (one with `splitFromItemId`):

1. **Find the paired item**: Look for the other item with the same `splitFromItemId`
2. **Allow editing ONE side only**: User edits business amount OR personal amount
3. **Auto-adjust the other**: Other amount automatically adjusts to maintain total
4. **Validation**: Ensure adjusted amounts still equal original total

**UI Flow**:
- Show both split items together in the edit view
- Allow editing of business amount (personal auto-adjusts) OR personal amount (business auto-adjusts)
- Display: "Business: [editable] | Personal: [editable but auto-calculated] | Total: [read-only]"

### Removing Split (Unsplitting)

**User Action**: Option to "Remove Split" or "Combine Items"

**API Request**:
```typescript
{
  action: 'unsplit_item',
  originalItemId: string, // The splitFromItemId from both split items
}
```

**API Behavior**:
1. Find both split items by `splitFromItemId`
2. Reactivate original item:
   - `isActive: true`
   - `amount: businessAmount + personalAmount`
   - `isBusinessExpense: true` (always reverts to business)
   - `debitAccount: originalAccount` (from business item)
   - Remove `splitFromItemId`
   - Remove `expenseSplit` if present
3. Delete/remove the two split items
4. Regenerate accounting entries (back to original)
5. Return updated transaction

**Important**: No choice given - always reverts to 100% business when unsplitting

## Multiple Edits

Users can:
- Split an item
- Adjust the split amounts
- Remove the split (revert to business)
- Re-split the same item (split again after unsplitting)

All operations should be allowed and properly handled.

## Display Logic

### TransactionDetailScreen Item Display

**For Active Items**:
- Display normally
- Show "Split" button if `isMixedExpense === true` and not already split

**For Inactive Items** (split originals):
- Option 1: Hide inactive items (recommended for cleaner UI)
- Option 2: Show with visual indicator (grayed out, strikethrough) and label "Split into Business/Personal"

**For Split Items** (with `splitFromItemId`):
- Display both items
- Visual grouping (e.g., indent, border, background color)
- Show badge/indicator: "Split: Business" and "Split: Personal"
- Show original item name (they share the same name from original)
- Show amounts: business amount and personal amount

**Recommended Display**:
```
┌─────────────────────────────────────┐
│ Fuel - £50.00 (SPLIT)              │
│ ├─ Business: £30.00 → Fuel         │
│ └─ Personal: £20.00 → Drawings     │
└─────────────────────────────────────┘
```

## Validation Rules

1. **Split Amount Validation**:
   - `businessAmount + personalAmount === item.amount` (±0.01 tolerance)
   - Both amounts must be >= 0
   - Both amounts must be <= item.amount

2. **Before Split**:
   - Original item must be active
   - Original item must have `isMixedExpense === true`

3. **After Split**:
   - Original item must be marked inactive
   - Two new items must be created
   - Both new items must reference original via `splitFromItemId`
   - Business item: `isBusinessExpense: true`, original debitAccount
   - Personal item: `isBusinessExpense: false`, debitAccount: 'Drawings'
   - Sum of new item amounts must equal original amount

4. **When Editing Split**:
   - Can only edit amounts of items with `splitFromItemId`
   - Must maintain: `businessAmount + personalAmount === originalAmount`
   - Must find paired item by `splitFromItemId`

## Error Handling

**Common Errors to Handle**:
1. **Split amounts don't match total**: Show validation error, prevent save
2. **Network error during split**: Show error message, allow retry
3. **Item already split**: Prevent duplicate split (shouldn't show button, but handle edge case)
4. **Original item not found**: Show error, refresh transaction data
5. **Paired item not found** (when editing): Show error, refresh transaction data

## Testing Checklist

- [ ] Split button appears for items with `isMixedExpense: true`
- [ ] Split button does NOT appear for items without `isMixedExpense: true`
- [ ] Split button does NOT appear for already-split items
- [ ] Split modal/screen allows entering business and personal amounts
- [ ] Validation prevents save when amounts don't sum to total
- [ ] Split creates two new items correctly
- [ ] Original item is marked inactive
- [ ] Split items reference original via `splitFromItemId`
- [ ] Business item has correct debitAccount, personal item uses 'Drawings'
- [ ] VAT/amountExcluding is split proportionally
- [ ] Can edit split amounts (one side auto-adjusts)
- [ ] Can remove split (reverts to 100% business)
- [ ] Can re-split after unsplitting
- [ ] Inactive items are hidden or clearly marked
- [ ] Split items are visually grouped in UI
- [ ] Accounting entries are correctly regenerated after split
- [ ] Accounting entries are correctly regenerated after unsplit
- [ ] Works with various item types (with/without VAT, with/without quantity, etc.)

## Notes

- **Drawings Account**: Always use 'Drawings' (from baseAccounts) for personal portions - this is a fixed account name
- **No User Prompting**: The system waits for user action - never automatically prompt to split
- **Default to Business**: All items default to 100% business until explicitly split
- **Backward Compatibility**: Existing transactions without these fields should work fine (fields are optional)
- **Only New Transactions**: This feature only applies to transactions3 (not legacy transactions2)

## API Endpoint Details

See `/src/app/authenticated/transactions3/api/transactions/[transactionId]/route.ts` for current implementation. The endpoint should be extended to handle:
- `action: 'split_item'` - Create split
- `action: 'unsplit_item'` - Remove split
- `action: 'update_split'` - Adjust split amounts (optional, could use split_item logic)

## Questions?

If you need clarification on any aspect of this implementation, please refer to:
- Type definitions: `/src/app/authenticated/transactions3/types/interfaces.ts`
- OCR transform: `/src/app/authenticated/transactions3/services/ocrTransform.ts`
- OCR route: `/src/app/authenticated/transactions3/api/purchases/ocr/route.ts`

