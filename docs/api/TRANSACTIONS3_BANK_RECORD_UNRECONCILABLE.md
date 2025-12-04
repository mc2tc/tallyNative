# Transactions3: Bank Record - No Matching Record Workflow

## Overview

When a user views a bank transaction from the "Needs reconciliation" card, they can mark it as "No matching record" if there's no corresponding receipt. This allows them to provide details about the transaction and confirm it without reconciliation.

## UI Requirements

### Bank Record Detail Screen

**Summary Card:**
- Display `tx.summary.description`
- Display whether transaction is a credit:
  - If `tx.metadata.statementContext.isCredit === true` → Show "Credit"
  - If `tx.metadata.statementContext.isCredit === false` → Show "Debit"
  - If `tx.metadata.statementContext.isCredit === undefined` → Show "Unknown"

**Remove:**
- "Confirm and save" button

**Add:**
- Checkbox: "No matching record"
- When checked, show form with:
  - **Description** (text input, pre-filled with `tx.summary.description`)
  - **Chart of Accounts** (dropdown/select)
  - **Reason** (dropdown/select) - List of usual reasons why there's no matching record
  - **Confirm transaction** button

## Reason Options

Suggested reasons for "No matching record":

1. "Receipt lost"
2. "Personal expense"
3. "Cash transaction"
4. "Receipt not available"
5. "Other" (with optional text field)

## Endpoint

**PATCH** `/authenticated/transactions3/api/transactions/[transactionId]/verify?businessId={businessId}`

## Request

**Method:** `PATCH`

**URL:** `/authenticated/transactions3/api/transactions/{transactionId}/verify?businessId={businessId}`

**Headers:**
```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "markAsUnreconcilable": true,
  "description": "Updated transaction description",
  "itemList": [
    {
      "name": "Transaction description",
      "debitAccount": "General Expense",
      "amount": 100.00,
      "amountExcluding": 100.00,
      "isBusinessExpense": true,
      "debitAccountConfirmed": true
    }
  ],
  "unreconcilableReason": "Receipt lost"
}
```

### Parameters

- `transactionId` (path parameter): ID of the bank transaction in the `pending` collection
- `businessId` (query parameter): Business ID
- `markAsUnreconcilable` (body, required when marking as unreconcilable): Set to `true`
- `description` (body, optional): Updated transaction description
- `itemList` (body, optional): Array of transaction items with Chart of Accounts
  - `debitAccount` (required): Chart of Accounts account name (e.g., "General Expense", "Equipment")
  - `amount` (required): Transaction amount
  - `amountExcluding` (optional): VAT-exclusive amount (if VAT-registered)
  - `isBusinessExpense` (required): Whether this is a business expense
  - `debitAccountConfirmed` (optional): Whether the user confirmed the account
- `unreconcilableReason` (body, optional): Reason why transaction is unreconcilable (e.g., "Receipt lost", "Personal expense")

## Response

**Success (200):**
```json
{
  "success": true,
  "transactionId": "new_transaction_id",
  "transaction": {
    "metadata": {
      "verification": {
        "status": "verified",
        "verifiedBy": "user_uid",
        "verifiedAt": 1764877000000
      },
      "reconciliation": {
        "status": "unreconciled",
        "unreconcilableReason": "Receipt lost",
        "type": undefined
      }
    },
    "summary": {
      "description": "Updated transaction description",
      "totalAmount": 100.00,
      "transactionDate": 1760270400000
    },
    "accounting": {
      "debits": [...],
      "credits": [...],
      "balanced": true
    }
  }
}
```

## Implementation Guide

### Step 1: Display Bank Record Details

```typescript
// Get transaction from pending collection
const transaction = await getTransaction(transactionId);

// Display summary
const isCredit = transaction.metadata.statementContext?.isCredit;
const transactionType = isCredit === true 
  ? 'Credit' 
  : isCredit === false 
    ? 'Debit' 
    : 'Unknown';

// Summary card
<SummaryCard>
  <Text>{transaction.summary.description}</Text>
  <Text>Type: {transactionType}</Text>
  <Text>Amount: {transaction.summary.totalAmount}</Text>
</SummaryCard>
```

### Step 2: Handle "No Matching Record" Checkbox

```typescript
const [noMatchingRecord, setNoMatchingRecord] = useState(false);
const [description, setDescription] = useState(transaction.summary.description);
const [selectedAccount, setSelectedAccount] = useState('');
const [reason, setReason] = useState('');

// Checkbox
<Checkbox
  value={noMatchingRecord}
  onValueChange={setNoMatchingRecord}
>
  No matching record
</Checkbox>

// Form (shown when checkbox is checked)
{noMatchingRecord && (
  <View>
    <TextInput
      label="Description"
      value={description}
      onChangeText={setDescription}
    />
    
    <Picker
      label="Chart of Accounts"
      selectedValue={selectedAccount}
      onValueChange={setSelectedAccount}
    >
      {/* Options from Chart of Accounts */}
    </Picker>
    
    <Picker
      label="Reason"
      selectedValue={reason}
      onValueChange={setReason}
    >
      <Picker.Item label="Receipt lost" value="Receipt lost" />
      <Picker.Item label="Personal expense" value="Personal expense" />
      <Picker.Item label="Cash transaction" value="Cash transaction" />
      <Picker.Item label="Receipt not available" value="Receipt not available" />
      <Picker.Item label="Other" value="Other" />
    </Picker>
    
    <Button
      title="Confirm transaction"
      onPress={handleConfirmUnreconcilable}
    />
  </View>
)}
```

### Step 3: Call Verification Endpoint

```typescript
const handleConfirmUnreconcilable = async () => {
  try {
    // Build itemList from selected account
    const itemList = [
      {
        name: description,
        debitAccount: selectedAccount,
        amount: transaction.summary.totalAmount,
        amountExcluding: transaction.summary.totalAmount, // Adjust if VAT-registered
        isBusinessExpense: true,
        debitAccountConfirmed: true,
      }
    ];

    const response = await fetch(
      `${API_BASE_URL}/authenticated/transactions3/api/transactions/${transactionId}/verify?businessId=${businessId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          markAsUnreconcilable: true,
          description: description,
          itemList: itemList,
          unreconcilableReason: reason,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to confirm transaction');
    }

    const data = await response.json();
    
    // Transaction has been moved to source of truth
    // Refresh cards to update UI
    await refreshBankTransactions();
    
    // Navigate back or show success message
    
  } catch (error) {
    console.error('Error confirming transaction:', error);
    // Show error message to user
  }
};
```

## What Happens

1. **Transaction is verified** → `verification.status = 'verified'`
2. **Moved to source of truth** → Transaction moves from `transactions3_pending` to `transactions3` collection
3. **Reconciliation status set** → `reconciliation.status = 'unreconciled'`
4. **Reason stored** → `reconciliation.unreconcilableReason` = selected reason
5. **Description updated** → `summary.description` = user-provided description
6. **Accounting entries generated** → Based on Chart of Accounts selection
7. **Appears on correct card** → Query shows it on "Confirmed unreconcilable" card

## Query for "Confirmed Unreconcilable" Card

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions3/api/transactions?businessId=${businessId}&collection=source_of_truth&kind=statement_entry&status=reconciliation:unreconciled`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
const confirmedUnreconcilable = data.transactions; // Display on card
```

## Notes

- **Description is editable** - User can update the description when marking as unreconcilable
- **Chart of Accounts required** - User must select an account to generate accounting entries
- **Reason is optional** - But recommended for audit trail
- **Transaction still verified** - It moves to source of truth and has accounting entries
- **Audit trail** - All actions are recorded in the transaction's audit trail

