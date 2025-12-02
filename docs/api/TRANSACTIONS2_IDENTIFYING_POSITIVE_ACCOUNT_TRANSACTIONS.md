# Identifying Transactions with Positive Account Balance Impact

## Overview

This guide helps the React Native team identify transactions that have a **positive impact** on account balances. This is **NOT** about double-entry accounting "credits" - it's about understanding which transactions increase account balances in a beneficial way.

**Important:** A "positive" transaction means it:
- **Increases** income accounts (sales, revenue)
- **Increases** asset accounts (money coming into bank, cash)
- **Decreases** liability accounts (payments to credit cards - reduces what you owe)

---

## Transaction Types with Positive Impact

### 1. Sales Invoices / Income Transactions

**What they are:** Transactions that generate revenue for the business.

**How to identify:**

```typescript
// Check transaction classification
transaction.metadata.classification.kind === 'sale'

// OR check capture source
transaction.metadata.capture.source === 'sales_invoice_ocr'

// Check accounting entries for income accounts
transaction.accounting.credits.some(credit => credit.isIncome === true)
```

**Example:**
```json
{
  "metadata": {
    "classification": {
      "kind": "sale"
    },
    "capture": {
      "source": "sales_invoice_ocr"
    }
  },
  "accounting": {
    "credits": [
      {
        "chartName": "Sales Revenue",
        "amount": 1000.00,
        "isIncome": true  // ← This indicates positive impact
      }
    ],
    "debits": [
      {
        "chartName": "Accounts Receivable",
        "amount": 1000.00,
        "isAsset": true
      }
    ]
  }
}
```

**Account Impact:**
- ✅ Increases Income accounts (Sales Revenue, Other Income)
- ✅ Increases Asset accounts (Accounts Receivable, Cash, Bank)

---

### 2. Bank Statement Credits (Money Coming In)

**What they are:** Money received into bank accounts (deposits, sales receipts, etc.).

**How to identify:**

```typescript
// Check if it's a bank statement transaction
transaction.metadata.capture.source === 'bank_statement_ocr' ||
transaction.metadata.capture.source === 'bank_stream'

// Check statement context for credit indicator
transaction.metadata.statementContext?.isCredit === true

// OR check accounting entries - Bank account is debited (asset increases)
transaction.accounting.debits.some(debit => 
  debit.chartName === 'Bank' && debit.isAsset === true
)

// AND there's an income credit
transaction.accounting.credits.some(credit => credit.isIncome === true)
```

**Example:**
```json
{
  "metadata": {
    "capture": {
      "source": "bank_statement_ocr"
    },
    "statementContext": {
      "isCredit": true,  // ← Money coming IN
      "bankName": "Chase Bank"
    }
  },
  "accounting": {
    "debits": [
      {
        "chartName": "Bank",
        "amount": 500.00,
        "isAsset": true  // ← Bank balance increases
      }
    ],
    "credits": [
      {
        "chartName": "Sales Revenue",
        "amount": 500.00,
        "isIncome": true  // ← Income increases
      }
    ]
  }
}
```

**Account Impact:**
- ✅ Increases Bank account (asset)
- ✅ Increases Income accounts (Sales Revenue)

---

### 3. Credit Card Payments (Credits to Card Account)

**What they are:** Payments made to credit card accounts, which reduce the amount owed (positive impact).

**How to identify:**

```typescript
// Check if it's a credit card statement transaction
transaction.metadata.capture.source === 'credit_card_statement_ocr' ||
transaction.metadata.capture.source === 'cc_stream'

// Check statement context for credit indicator
transaction.metadata.statementContext?.isCredit === true

// Check accounting entries - Card account is debited (liability decreases)
transaction.accounting.debits.some(debit => 
  debit.chartName === 'Card' && debit.isLiability === true
)

// AND Bank account is credited (asset decreases - money going out)
transaction.accounting.credits.some(credit => 
  credit.chartName === 'Bank' && credit.isAsset === true
)
```

**Example:**
```json
{
  "metadata": {
    "capture": {
      "source": "credit_card_statement_ocr"
    },
    "statementContext": {
      "isCredit": true,  // ← Payment to card (reduces what you owe)
      "cardName": "Visa Business Card"
    }
  },
  "accounting": {
    "debits": [
      {
        "chartName": "Card",
        "amount": 300.00,
        "isLiability": true  // ← Card liability decreases (positive!)
      }
    ],
    "credits": [
      {
        "chartName": "Bank",
        "amount": 300.00,
        "isAsset": true  // ← Bank balance decreases (money paid out)
      }
    ]
  }
}
```

**Account Impact:**
- ✅ Decreases Card liability (reduces amount owed - this is positive!)
- ⚠️ Decreases Bank asset (money going out)

**Note:** Even though Bank decreases, paying off credit card debt is considered a positive transaction because it reduces liabilities.

---

### 4. Cash Sales / POS Transactions

**What they are:** Immediate sales where cash is received.

**How to identify:**

```typescript
// Check transaction kind
transaction.metadata.classification.kind === 'sale'

// Check payment method
transaction.accounting.paymentBreakdown?.some(payment => 
  payment.type === 'cash'
)

// Check accounting entries
transaction.accounting.debits.some(debit => 
  debit.chartName === 'Cash' && debit.isAsset === true
)
transaction.accounting.credits.some(credit => credit.isIncome === true)
```

**Example:**
```json
{
  "metadata": {
    "classification": {
      "kind": "sale"
    }
  },
  "accounting": {
    "paymentBreakdown": [
      {
        "type": "cash",
        "amount": 150.00
      }
    ],
    "debits": [
      {
        "chartName": "Cash",
        "amount": 150.00,
        "isAsset": true  // ← Cash increases
      }
    ],
    "credits": [
      {
        "chartName": "Sales Revenue",
        "amount": 150.00,
        "isIncome": true  // ← Income increases
      }
    ]
  }
}
```

**Account Impact:**
- ✅ Increases Cash account (asset)
- ✅ Increases Income accounts (Sales Revenue)

---

## Quick Reference: Positive Impact Indicators

### For Income Accounts
```typescript
// Transaction has income credits
const hasIncome = transaction.accounting.credits.some(
  credit => credit.isIncome === true
);
```

### For Asset Accounts (Bank, Cash)
```typescript
// Asset account is debited (increases)
const assetIncreases = transaction.accounting.debits.some(
  debit => debit.isAsset === true && 
  (debit.chartName === 'Bank' || debit.chartName === 'Cash')
);
```

### For Liability Accounts (Credit Cards)
```typescript
// Liability account is debited (decreases - reduces what you owe)
const liabilityDecreases = transaction.accounting.debits.some(
  debit => debit.isLiability === true && debit.chartName === 'Card'
);
```

### For Bank Statement Credits
```typescript
// Bank statement shows money coming in
const isBankCredit = 
  transaction.metadata.statementContext?.isCredit === true &&
  (transaction.metadata.capture.source === 'bank_statement_ocr' ||
   transaction.metadata.capture.source === 'bank_stream');
```

### For Credit Card Statement Credits
```typescript
// Credit card statement shows payment made
const isCardCredit = 
  transaction.metadata.statementContext?.isCredit === true &&
  (transaction.metadata.capture.source === 'credit_card_statement_ocr' ||
   transaction.metadata.capture.source === 'cc_stream');
```

---

## Complete Helper Function

```typescript
/**
 * Determines if a transaction has a positive impact on account balances
 * 
 * Positive impact means:
 * - Increases income accounts (sales, revenue)
 * - Increases asset accounts (bank, cash)
 * - Decreases liability accounts (credit card payments)
 * 
 * This is NOT about double-entry accounting "credits" - it's about
 * understanding which transactions benefit the business financially.
 */
function hasPositiveAccountImpact(transaction: Transaction): boolean {
  // 1. Check for income transactions (sales invoices)
  const hasIncome = transaction.accounting.credits.some(
    credit => credit.isIncome === true
  );
  
  // 2. Check for asset increases (money coming in)
  const assetIncreases = transaction.accounting.debits.some(
    debit => debit.isAsset === true && 
    (debit.chartName === 'Bank' || debit.chartName === 'Cash')
  );
  
  // 3. Check for liability decreases (payments to credit cards)
  const liabilityDecreases = transaction.accounting.debits.some(
    debit => debit.isLiability === true && debit.chartName === 'Card'
  );
  
  // 4. Check for bank statement credits (money coming in)
  const isBankCredit = 
    transaction.metadata.statementContext?.isCredit === true &&
    (transaction.metadata.capture.source === 'bank_statement_ocr' ||
     transaction.metadata.capture.source === 'bank_stream');
  
  // 5. Check for credit card statement credits (payments)
  const isCardCredit = 
    transaction.metadata.statementContext?.isCredit === true &&
    (transaction.metadata.capture.source === 'credit_card_statement_ocr' ||
     transaction.metadata.capture.source === 'cc_stream');
  
  // 6. Check transaction kind
  const isSale = transaction.metadata.classification.kind === 'sale';
  
  return hasIncome || assetIncreases || liabilityDecreases || 
         isBankCredit || isCardCredit || isSale;
}
```

---

## Common Patterns

### Pattern 1: Sales Invoice
- `classification.kind === 'sale'`
- `accounting.credits` contains entries with `isIncome === true`
- Usually has `Accounts Receivable` or payment method in debits

### Pattern 2: Bank Deposit
- `statementContext.isCredit === true`
- `accounting.debits` contains `Bank` with `isAsset === true`
- `accounting.credits` contains income account

### Pattern 3: Credit Card Payment
- `statementContext.isCredit === true` (on credit card statement)
- `accounting.debits` contains `Card` with `isLiability === true`
- `accounting.credits` contains `Bank` with `isAsset === true`

### Pattern 4: Cash Sale
- `classification.kind === 'sale'`
- `paymentBreakdown` contains `type === 'cash'`
- `accounting.debits` contains `Cash` with `isAsset === true`
- `accounting.credits` contains income account

---

## Important Notes

1. **Double-Entry Accounting:** Every transaction has both debits and credits. Don't confuse "credits" in the accounting sense with "positive impact". A transaction can have accounting credits that decrease assets (negative impact).

2. **Account Type Matters:**
   - **Assets:** Debits increase, Credits decrease
   - **Liabilities:** Credits increase, Debits decrease
   - **Income:** Credits increase, Debits decrease
   - **Expenses:** Debits increase, Credits decrease

3. **Statement Context:** For bank and credit card statements, `isCredit` indicates:
   - **Bank statements:** `isCredit: true` = money coming IN (positive)
   - **Credit card statements:** `isCredit: true` = payment made (reduces debt - positive)

4. **Transaction Kind:** The `classification.kind` field helps identify transaction type:
   - `'sale'` = Sales/invoice transactions (usually positive)
   - `'purchase'` = Purchase/expense transactions (usually negative)
   - `'statement_entry'` = Bank/CC statement entries (check `isCredit`)

---

## Examples in Context

### Example 1: Sales Invoice (Positive)
```json
{
  "metadata": {
    "classification": { "kind": "sale" },
    "capture": { "source": "sales_invoice_ocr" }
  },
  "accounting": {
    "credits": [
      { "chartName": "Sales Revenue", "isIncome": true, "amount": 1200.00 }
    ],
    "debits": [
      { "chartName": "Accounts Receivable", "isAsset": true, "amount": 1200.00 }
    ]
  }
}
```
**Impact:** ✅ Increases Sales Revenue (income) ✅ Increases Accounts Receivable (asset)

### Example 2: Bank Deposit (Positive)
```json
{
  "metadata": {
    "statementContext": { "isCredit": true },
    "capture": { "source": "bank_statement_ocr" }
  },
  "accounting": {
    "debits": [
      { "chartName": "Bank", "isAsset": true, "amount": 500.00 }
    ],
    "credits": [
      { "chartName": "Sales Revenue", "isIncome": true, "amount": 500.00 }
    ]
  }
}
```
**Impact:** ✅ Increases Bank (asset) ✅ Increases Sales Revenue (income)

### Example 3: Credit Card Payment (Positive)
```json
{
  "metadata": {
    "statementContext": { "isCredit": true },
    "capture": { "source": "credit_card_statement_ocr" }
  },
  "accounting": {
    "debits": [
      { "chartName": "Card", "isLiability": true, "amount": 300.00 }
    ],
    "credits": [
      { "chartName": "Bank", "isAsset": true, "amount": 300.00 }
    ]
  }
}
```
**Impact:** ✅ Decreases Card liability (reduces debt - positive!) ⚠️ Decreases Bank (money paid out)

---

## Summary

To identify transactions with positive account balance impact, check for:

1. ✅ **Income credits** (`accounting.credits` with `isIncome === true`)
2. ✅ **Asset debits** (`accounting.debits` with `isAsset === true` for Bank/Cash)
3. ✅ **Liability debits** (`accounting.debits` with `isLiability === true` for Card)
4. ✅ **Bank statement credits** (`statementContext.isCredit === true` on bank statements)
5. ✅ **Credit card statement credits** (`statementContext.isCredit === true` on CC statements)
6. ✅ **Sale transactions** (`classification.kind === 'sale'`)

Remember: This is about **account balance impact**, not double-entry accounting terminology!

