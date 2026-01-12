# Expense Split VAT Allocation Fix

**Date**: 2025-01-27  
**Status**: 🔧 **FIX REQUIRED**  
**Priority**: High  
**Related**: `EXPENSE_SPLIT_RN_IMPLEMENTATION.md`

---

## Summary

When splitting an expense item that includes VAT between business and personal portions, the VAT allocation is currently incorrect. **Personal expenses cannot reclaim VAT**, so the personal portion should have `vatAmount: 0`, and all VAT should be allocated to the business portion proportionally.

---

## Issue Description

### Current Behavior (Incorrect)

When splitting an expense item with VAT:
- Personal portion (Drawings) receives proportional VAT allocation
- Business portion receives proportional VAT allocation
- **Problem**: Personal expenses cannot reclaim VAT, so allocating VAT to the personal portion is incorrect for accounting purposes

### Example Scenario

**Original Item**:
- Name: Fuel
- Total Amount: £94.50
- VAT Amount: £15.75
- Net Amount (excluding VAT): £78.75
- Debit Account: Fuel Expenses

**User Splits**:
- Business: £54.50
- Personal: £40.00

**Current (Incorrect) Result**:
- Business Item: £54.50 total, ~£9.08 VAT, ~£45.42 net
- Personal Item: £40.00 total, ~£6.67 VAT, ~£33.33 net ❌ **WRONG - Personal cannot reclaim VAT**

**Expected (Correct) Result**:
- Business Item: £54.50 total, £9.08 VAT, £45.42 net ✅
- Personal Item: £40.00 total, £0.00 VAT, £40.00 net ✅ **Full amount is net (no VAT reclaimable)**

---

## Required Fix

### VAT Allocation Rules

1. **Personal Portion** (`isBusinessExpense: false`, `debitAccount: 'Drawings'`):
   - `vatAmount: 0` (personal expenses cannot reclaim VAT)
   - `amountExcluding: personalAmount` (full amount is treated as net, no VAT component)

2. **Business Portion** (`isBusinessExpense: true`):
   - `vatAmount: originalVatAmount * (businessAmount / originalAmount)` (proportional VAT allocation)
   - `amountExcluding: businessAmount - vatAmount` (net = total - VAT)

### Calculation Formula

```typescript
const originalAmount = item.amount; // e.g., £94.50
const originalVatAmount = item.vatAmount || 0; // e.g., £15.75
const businessAmount = splitDetails.businessAmount; // e.g., £54.50
const personalAmount = splitDetails.personalAmount; // e.g., £40.00

// Business portion VAT calculation
const businessRatio = businessAmount / originalAmount; // 54.50 / 94.50 = 0.5767
const businessVatAmount = originalVatAmount * businessRatio; // 15.75 * 0.5767 = £9.08

// Business item
const businessItem = {
  amount: businessAmount, // £54.50
  vatAmount: businessVatAmount, // £9.08
  amountExcluding: businessAmount - businessVatAmount, // £45.42
  isBusinessExpense: true,
  debitAccount: originalItem.debitAccount,
  // ... other fields
};

// Personal item
const personalItem = {
  amount: personalAmount, // £40.00
  vatAmount: 0, // £0.00 - NO VAT reclaimable on personal expenses
  amountExcluding: personalAmount, // £40.00 - full amount is net
  isBusinessExpense: false,
  debitAccount: 'Drawings',
  // ... other fields
};
```

---

## Accounting Impact

### VAT Input Tax Entries

**Current (Incorrect)**:
- VAT Input Tax: £15.75 (full original VAT) ❌
- **Problem**: This includes VAT from the personal portion, which should not be reclaimable

**Expected (Correct)**:
- VAT Input Tax: £9.08 (only business portion VAT) ✅
- **Result**: Only reclaimable VAT is allocated to VAT Input Tax account

### Debit Account Entries

**Business Portion**:
- Debit: Original account (e.g., Fuel Expenses) - £45.42 net
- Debit: VAT Input Tax - £9.08 VAT
- Credit: Payment method account - £54.50 total

**Personal Portion**:
- Debit: Drawings - £40.00 (full amount, no VAT)
- Credit: Payment method account - £40.00

---

## Validation Requirements

The backend should validate:

1. **Personal Expense VAT Validation**:
   ```typescript
   if (item.isBusinessExpense === false || item.debitAccount === 'Drawings') {
     // Personal expense - must have zero VAT
     if (item.vatAmount !== 0 && item.vatAmount !== undefined) {
       throw new Error('Personal expenses cannot have VAT. vatAmount must be 0.');
     }
     // Personal expense - amountExcluding should equal amount (no VAT)
     if (item.amountExcluding !== item.amount) {
       // Log warning or auto-correct: amountExcluding = amount
     }
   }
   ```

2. **VAT Sum Validation**:
   ```typescript
   // After split, sum of business VAT should equal original VAT
   const totalVatAfterSplit = businessItem.vatAmount + personalItem.vatAmount;
   // personalItem.vatAmount should be 0, so:
   const expectedVat = businessItem.vatAmount;
   if (Math.abs(expectedVat - originalVatAmount * businessRatio) > 0.01) {
     // Log warning about rounding differences
   }
   ```

3. **Amount Sum Validation**:
   ```typescript
   // Total amounts should still sum correctly
   const totalAmountAfterSplit = businessItem.amount + personalItem.amount;
   if (Math.abs(totalAmountAfterSplit - originalAmount) > 0.01) {
     throw new Error('Split amounts must sum to original amount');
   }
   ```

---

## API Endpoint

### Endpoint
`PATCH /authenticated/transactions3/api/transactions/{transactionId}`

### Request Body
```typescript
{
  action: 'split_item',
  itemIndex: number,
  splitDetails: {
    businessAmount: number,
    personalAmount: number
  }
}
```

### Expected Response

The API should return an updated transaction with:

1. **Original item** marked as `isActive: false`
2. **Business item** with:
   - `amount: businessAmount`
   - `vatAmount: calculated business VAT` (proportional)
   - `amountExcluding: businessAmount - vatAmount`
   - `isBusinessExpense: true`
   - `debitAccount: originalAccount`
3. **Personal item** with:
   - `amount: personalAmount`
   - `vatAmount: 0` ✅ **CRITICAL FIX**
   - `amountExcluding: personalAmount` ✅ **CRITICAL FIX**
   - `isBusinessExpense: false`
   - `debitAccount: 'Drawings'`
4. **Accounting entries** regenerated with correct VAT allocation:
   - VAT Input Tax should only include business portion VAT
   - Drawings should debit the full personal amount (no VAT)

---

## Frontend Implementation

The frontend has been updated in `screens/TransactionDetailScreen.tsx` to send the correct VAT allocation:

```typescript
// Personal portion: no VAT reclaimable
const personalItem = {
  amount: personalAmount,
  amountExcluding: personalAmount, // Full amount is net
  vatAmount: 0, // Personal expenses cannot reclaim VAT
  isBusinessExpense: false,
  debitAccount: 'Drawings',
  // ...
};

// Business portion: gets all VAT proportionally
const businessVatAmount = originalVatAmount * businessRatio;
const businessItem = {
  amount: businessAmount,
  amountExcluding: businessAmount - businessVatAmount,
  vatAmount: businessVatAmount,
  isBusinessExpense: true,
  debitAccount: originalItem.debitAccount,
  // ...
};
```

**The frontend is now sending the correct data structure. The backend must process it correctly.**

---

## Testing Scenarios

Please test and verify:

1. ✅ Split expense with VAT: Business portion gets proportional VAT, personal gets £0 VAT
2. ✅ Split expense with VAT: VAT Input Tax only includes business portion VAT
3. ✅ Split expense with VAT: Personal portion `amountExcluding` equals `amount`
4. ✅ Split expense with VAT: Business portion `amountExcluding` = `amount - vatAmount`
5. ✅ Split expense with VAT: Accounting entries correctly allocate VAT
6. ✅ Split expense without VAT: Works correctly (no VAT to allocate)
7. ✅ Validation: Reject personal items with non-zero VAT
8. ✅ Validation: Ensure amounts sum correctly after split
9. ✅ Edge case: Very small personal portion (e.g., £0.01) - VAT should still be £0
10. ✅ Edge case: Very small business portion - VAT should be proportionally small

---

## Example Test Case

**Input**:
```json
{
  "originalItem": {
    "name": "Fuel",
    "amount": 94.50,
    "vatAmount": 15.75,
    "amountExcluding": 78.75,
    "debitAccount": "Fuel Expenses"
  },
  "splitDetails": {
    "businessAmount": 54.50,
    "personalAmount": 40.00
  }
}
```

**Expected Output**:
```json
{
  "businessItem": {
    "name": "Fuel",
    "amount": 54.50,
    "vatAmount": 9.08,
    "amountExcluding": 45.42,
    "isBusinessExpense": true,
    "debitAccount": "Fuel Expenses"
  },
  "personalItem": {
    "name": "Fuel",
    "amount": 40.00,
    "vatAmount": 0,
    "amountExcluding": 40.00,
    "isBusinessExpense": false,
    "debitAccount": "Drawings"
  }
}
```

**Expected Accounting Entries**:
- Fuel Expenses (Debit): £45.42
- VAT Input Tax (Debit): £9.08
- Drawings (Debit): £40.00
- Payment Method (Credit): £94.50

---

## Questions for Backend Team

1. **Q**: Does the current backend implementation allocate VAT proportionally to both business and personal portions?
   - **A**: [Backend to confirm]

2. **Q**: Are there any existing validations that prevent personal expenses from having VAT?
   - **A**: [Backend to confirm]

3. **Q**: How is VAT Input Tax currently calculated when an expense is split?
   - **A**: [Backend to confirm]

4. **Q**: Are there any edge cases or special scenarios we should be aware of?
   - **A**: [Backend to confirm]

---

## Priority

**High** - This issue affects:
- **Accounting accuracy**: Incorrect VAT allocation leads to wrong VAT Input Tax entries
- **Tax compliance**: Personal expenses with allocated VAT could cause tax reporting issues
- **Data integrity**: VAT should only be allocated to business expenses

---

## Related Documentation

- `docs/backend-requests/EXPENSE_SPLIT_RN_IMPLEMENTATION.md` - Original expense split implementation
- `screens/TransactionDetailScreen.tsx` - Frontend implementation (lines 1075-1095)

---

## Next Steps

1. ⏳ **Backend Team**: Review current VAT allocation logic in expense split endpoint
2. ⏳ **Backend Team**: Implement fix to set `vatAmount: 0` for personal portions
3. ⏳ **Backend Team**: Update VAT Input Tax calculation to only include business portion VAT
4. ⏳ **Backend Team**: Add validation to prevent personal expenses from having VAT
5. ⏳ **QA**: Test expense split with VAT scenarios
6. ⏳ **Frontend Team**: Verify backend response matches expected structure

---

## Notes

- **Personal Expenses Cannot Reclaim VAT**: This is a fundamental accounting principle. Personal expenses (Drawings) should never have VAT allocated to them.
- **VAT Input Tax**: Only business expenses can reclaim VAT, so VAT Input Tax should only reflect VAT from business portions.
- **Backward Compatibility**: Existing split items may have incorrect VAT allocation. Consider a migration script if needed.
- **Frontend Ready**: The frontend is already sending the correct data structure. The backend needs to process it correctly.

