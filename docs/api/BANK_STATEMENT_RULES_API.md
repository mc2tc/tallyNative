# Bank Statement Rules API - RN Implementation Guide

## Overview

The Bank Statement Rules API provides access to the default rules that automatically classify bank transactions and populate accounting entries. These rules are displayed in the "Auto Bank Rules" card in the RN "Bank Transactions" screen.

---

## Endpoint

**GET** `/authenticated/transactions2/api/bank-statements/rules`

### Authentication
- Requires authenticated user (via `verifyRequestUser`)
- User must have access to a business (rules are business-agnostic)

### Response Format

```typescript
{
  rules: BankStatementRuleResponse[];
  count: number;
}

interface BankStatementRuleResponse {
  id: string;                    // Unique rule identifier (e.g., 'cashWithdrawal', 'bankFee')
  title: string;                 // User-friendly display title (e.g., 'Cash Withdrawal')
  description: string;           // Human-readable description of what the rule does
  keywords: string[];            // Keywords that trigger this rule (e.g., ['withdrawal', 'atm', 'cash machine'])
  debitAccount: string;          // Chart account name that will be debited (e.g., 'Cash', 'Fees & Charges')
  category: string;              // Transaction category (e.g., 'transfer', 'bank_fee')
  isBusinessExpense: boolean;    // Whether this is a business expense
}
```

### Example Response

```json
{
  "rules": [
    {
      "id": "cashWithdrawal",
      "title": "Cash Withdrawal",
      "description": "Automatically classifies ATM withdrawals and cash machine transactions. Debits Cash account, credits Bank account.",
      "keywords": ["withdrawal", "atm", "cash machine", "cash withdrawal", "cash taken"],
      "debitAccount": "Cash",
      "category": "transfer",
      "isBusinessExpense": false
    },
    {
      "id": "bankFee",
      "title": "Bank Fee",
      "description": "Automatically classifies bank fees, service charges, overdraft fees, and commissions. Debits Fees & Charges account, credits Bank account.",
      "keywords": ["bank fee", "service charge", "overdraft fee", "monthly fee", "commission"],
      "debitAccount": "Fees & Charges",
      "category": "bank_fee",
      "isBusinessExpense": true
    }
  ],
  "count": 2
}
```

---

## UI Implementation

### Auto Bank Rules Card

The "Auto Bank Rules" card should display:

1. **Card Header**: "Auto Bank Rules" (or similar)
2. **Rule List**: Each rule displayed as a clickable item with:
   - **Title**: `rule.title` (e.g., "Cash Withdrawal")
   - **Subtitle/Optionally**: Brief preview of keywords or description
   - **Action**: Tap to navigate to rule detail screen

### Rule Detail Screen

When a user taps on a rule, navigate to a dedicated screen showing:

1. **Header**:
   - Rule title (e.g., "Cash Withdrawal")
   - Optional: Back button, edit button (if custom rules are supported in future)

2. **Description Section**:
   - Full description from `rule.description`
   - Explains what the rule does and its accounting treatment

3. **Keywords Section**:
   - Title: "Triggers on:" or "Matches transactions containing:"
   - Display all keywords from `rule.keywords` as:
     - Tags/chips, OR
     - Bulleted list, OR
     - Comma-separated list
   - Example display:
     ```
     Triggers on:
     • withdrawal
     • atm
     • cash machine
     • cash withdrawal
     • cash taken
     ```

4. **Accounting Treatment Section**:
   - Title: "Accounting Treatment" or "How it's recorded:"
   - Display:
     - **Debits**: `rule.debitAccount` (e.g., "Cash")
     - **Credits**: "Bank" (always credits Bank for bank statement entries)
     - **Category**: `rule.category` (e.g., "transfer", "bank_fee")
     - **Business Expense**: Show if `rule.isBusinessExpense === true`

5. **Example Section** (Optional but recommended):
   - Show example transaction descriptions that would match this rule
   - Example: "ATM withdrawal", "Cash machine transaction", etc.

### Visual Design Suggestions

- **Rule List Item**: Card or list row with title prominently displayed
- **Keywords**: Use visual tags/chips to make them scannable
- **Accounting Treatment**: Use a simple table or formatted text to show Debit/Credit
- **Category Badge**: Display category as a small badge/tag

---

## Current Default Rules

### 1. Cash Withdrawal

- **ID**: `cashWithdrawal`
- **Title**: "Cash Withdrawal"
- **Keywords**: `withdrawal`, `atm`, `cash machine`, `cash withdrawal`, `cash taken`
- **Debit Account**: `Cash`
- **Category**: `transfer`
- **Business Expense**: `false`

**What it does**: When a bank transaction description contains any of the keywords, it automatically creates a transaction detail item that debits the Cash account and credits the Bank account. This represents money moving from the bank to cash.

### 2. Bank Fee

- **ID**: `bankFee`
- **Title**: "Bank Fee"
- **Keywords**: `bank fee`, `service charge`, `overdraft fee`, `monthly fee`, `commission`
- **Debit Account**: `Fees & Charges`
- **Category**: `bank_fee`
- **Business Expense**: `true`

**What it does**: When a bank transaction description contains any of the keywords, it automatically creates a transaction detail item that debits the Fees & Charges account and credits the Bank account. This represents bank fees and charges as business expenses.

---

## How Rules Work

1. **Matching**: When a bank statement transaction is processed, the system checks the transaction's normalized description against each rule's keywords (case-insensitive, substring match).

2. **Application**: If a rule matches:
   - The rule's `apply()` function is called
   - It creates `TransactionDetailItem[]` with the appropriate `debitAccount`
   - The system then generates balanced accounting entries (debits and credits)
   - The transaction appears in "Needs Verification" card

3. **No Match**: If no rule matches:
   - No accounting entries are created
   - The transaction appears in "Needs Reconciliation" card
   - User must manually match it with a Purchase Receipt

---

## Future Enhancements

The backend team is planning to support:
- **Custom Rules**: Users will be able to create their own rules from the RN app
- **Rule Management**: Edit, delete, and reorder rules
- **Rule Testing**: Test rules against sample transaction descriptions

These features will be added in future updates. For now, the API is read-only and returns the default rules.

---

## Error Handling

- **401 Unauthorized**: User is not authenticated
- **500 Internal Server Error**: Server error retrieving rules

Handle errors gracefully and show appropriate messages to the user.

---

## Example Implementation (Pseudo-code)

```typescript
// Fetch rules
const response = await fetch(`/authenticated/transactions2/api/bank-statements/rules`);
const data = await response.json();
const rules = data.rules;

// Display in Auto Bank Rules card
<Card title="Auto Bank Rules">
  {rules.map(rule => (
    <RuleListItem
      key={rule.id}
      title={rule.title}
      onPress={() => navigateToRuleDetail(rule)}
    />
  ))}
</Card>

// Rule Detail Screen
<Screen title={rule.title}>
  <Section title="Description">
    <Text>{rule.description}</Text>
  </Section>
  
  <Section title="Triggers on">
    {rule.keywords.map(keyword => (
      <Tag key={keyword}>{keyword}</Tag>
    ))}
  </Section>
  
  <Section title="Accounting Treatment">
    <Row label="Debits" value={rule.debitAccount} />
    <Row label="Credits" value="Bank" />
    <Row label="Category" value={rule.category} />
    {rule.isBusinessExpense && <Badge>Business Expense</Badge>}
  </Section>
</Screen>
```

---

## Questions?

If you need clarification on any aspect of the rules API or implementation, please reach out to the backend team.

