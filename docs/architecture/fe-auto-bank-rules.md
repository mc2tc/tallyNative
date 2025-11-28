## Auto Bank Rules – Frontend Usage and Flow

This document explains how **Auto bank rules** are surfaced and used in the app’s UI, based on the current frontend implementation.  
It focuses on how rules are **fetched**, **displayed**, and how they conceptually relate to **bank transactions** and the bank pipeline.

### What an Auto bank rule looks like on the frontend

- The frontend models each rule as a `BankStatementRule` (`lib/api/bankStatementRules.ts`) with:
  - `id`: unique identifier for the rule.
  - `title`: short human‑readable name (shown in the list and detail screen header).
  - `description`: longer explanation of what the rule does.
  - `keywords: string[]`: phrases the rule will use to match bank statement lines (e.g. merchant names, references).
  - `debitAccount`: the account debited when the rule applies (e.g. an expense or asset account).
  - `category`: a higher‑level label for grouping/analytics.
  - `isBusinessExpense: boolean`: backend classification flag (always `true` on create from mobile in the current UX, not shown in the UI).

### Fetching the rules from the backend

- The frontend exposes a small API client in `bankStatementRulesApi`:
  - `bankStatementRulesApi.getRules(businessId)` performs a GET request to:
    - `"/authenticated/transactions2/api/bank-statements/rules?businessId=<business-id>"`
  - It expects a `BankStatementRulesResponse`:
    - `rules: BankStatementRule[]`
    - `count: number`
- On the **Transactions scaffold** (`TransactionsScaffoldScreen.tsx`):
  - A `useFocusEffect` calls `bankStatementRulesApi.getRules(businessId)` when the screen gains focus and a `businessId` is available.
  - On success:
    - The `rules` array is stored in the `bankStatementRules` state.
  - On failure:
    - An error is logged to the console.
    - `bankStatementRules` is set to an empty array, so the Auto bank rules column renders as an empty list.

### Where Auto bank rules appear in the UI

- In the **Bank** section of the Transactions scaffold, the app defines a set of columns for the pipeline:
  - `"Needs verification (no reconciliation required)"`
  - `"Needs reconciliation"`
  - `"Reporting ready"`
  - `"Auto bank rules"`
- The `"Auto bank rules"` column is configured with:
  - `title: "Auto bank rules"`
  - `actions: ["View all", "+ Add rules"]`
  - `rules: bankStatementRules` (the array fetched via `bankStatementRulesApi.getRules()`).
- When rendering this column:
  - The generic `PipelineRow` component sees that the column has a `rules` property and uses `RulesList` instead of the transaction `CardList`.
  - `RulesList` maps over each `BankStatementRule` and shows:
    - The rule `title`.
    - The `description` (if present), truncated to a couple of lines.
    - A chevron icon to hint that the rule is tappable.
  - Tapping a rule navigates to the **BankStatementRuleDetail** screen, passing the full `rule` object.

When the user taps **“+ Add rules”** in this column:

- The `PipelineRow` component navigates to a dedicated **BankStatementRuleCreate** screen in the Transactions stack.
- This screen is used to create a **new per‑business bank rule** (see the next section).

### BankStatementRuleDetailScreen – inspecting and editing a single rule

- The detail screen receives the selected `rule` in its route params and renders three main sections:
  - **Description**
    - Displays `rule.description` as a block of explanatory text.
  - **Triggers on**
    - Renders each entry in `keywords` as a visual tag, making it clear **which keywords on a bank statement line will trigger this rule**.
    - Each tag now includes a small “×” control so the user can **remove** that trigger keyword.
    - Below the tags, an input row lets the user add a new keyword by typing text and tapping **Add** (duplicates are ignored).
  - **Accounting Treatment**
    - Presents a small table‑like block summarizing how the rule affects accounting:
      - `Debits`: shows `rule.debitAccount` (read‑only in this iteration).
      - `Credits`: currently hard‑coded to `"Bank"` to represent the bank side of the posting.
- At the bottom of the screen:
  - A **Save changes** button sends the updated list of `keywords` to the backend.
  - While saving, the button text changes to “Saving…” and is disabled.
  - The button is also disabled if there are no keywords left, to avoid saving an empty rule by mistake.

### Updating Auto bank rules via API

- When the user taps **Save changes**, the app calls a PATCH endpoint through the `bankStatementRulesApi` client:
  - `bankStatementRulesApi.updateRule(id, { businessId, keywords })`
  - The request body is a **simple JSON object** that includes the current business context:

```markdown
{
  businessId: "<business-id>",
  keywords: ["trigger one", "trigger two", "..."]
}
```

- The backend is expected to:
  - Replace the rule’s `keywords` array with the provided list.
  - Return the updated `rule` in the response body.
- On success:
  - The detail screen shows a short “Saved” confirmation and navigates back.
  - The updated rule will be visible the next time rules are fetched for the Auto bank rules column.

### Creating new Auto bank rules from the app

- When the user taps **“+ Add rules”** in the Auto bank rules column:
  - The app opens `BankStatementRuleCreateScreen` in **create** mode (no existing rule passed in).
  - The screen derives `businessId` from `useAuth` using the same non‑personal preference logic as other transaction screens.
- The user can fill in:
  - **Title** (required).
  - **Description** (optional).
  - **Triggers on**: an editable list of keyword tags, with add/remove UX identical to the detail screen.
  - **Debits**: selected from the business’s **debit chart of accounts** (required).
  - **Credits**: read‑only `"Bank"`.
- The **Create rule** button at the bottom is only enabled when:
  - There is a `businessId`.
  - Title is non‑empty.
  - Debit account is non‑empty.
  - At least one trigger keyword has been added.

- On submit, the app calls:
  - `bankStatementRulesApi.createRule({ businessId, title, description, keywords, debitAccount })`
  - This sends a POST to:
    - `"/authenticated/transactions2/api/bank-statements/rules?businessId=<business-id>"`
  - With a JSON body:

```markdown
{
  title: "<rule-title>",
  description: "<optional-description>",
  keywords: ["trigger one", "trigger two", "..."],
  debitAccount: "<selected-debit-account-name>",
  category: "bank_fee",
  isBusinessExpense: true
}
```

- On success:
  - The screen shows a short “Rule created” confirmation and navigates back.
  - The new rule will be returned by the next `getRules(businessId)` call and appear in the **Auto bank rules** column.

### Conceptual link to the bank transaction pipeline

Although the actual rule evaluation and posting logic happen on the backend, the frontend assumes the following high‑level behavior:

- **Matching and posting**
  - When a bank statement transaction is ingested, the backend compares its text fields (e.g. description, reference) against each rule’s `keywords`.
  - If a rule matches:
    - The backend applies the debit side to `debitAccount`.
    - The credit side is the relevant bank account (shown in the UI as “Bank” in the rule detail).
    - The transaction is marked as having **accounting entries**. The `isBusinessExpense` flag is maintained by the backend as a classification field but is not surfaced or controlled in the mobile UI.
- **Effect on the bank pipeline columns**
  - Transactions where a rule has successfully created accounting entries:
    - Will appear in the **“Needs verification (no reconciliation required)”** column if they are not yet verified/exception.
    - Once verified (or marked as exception), they should ultimately flow towards **“Reporting ready”**.
  - Transactions where **no rule matched**:
    - Have **no accounting entries** and appear in the **“Needs reconciliation”** column until manually reconciled or matched some other way.
- This means:
  - The `"Auto bank rules"` column does **not** list transactions; it lists the **rules that shape automatic classification** of bank transactions.
  - The other bank columns reflect the **current status of individual bank transactions** after (or without) those rules being applied.

### User expectations and future extensions

- From a user’s perspective, Auto bank rules should:
  - Reduce the need for manual reconciliation by automatically categorizing common, repeatable bank transactions.
  - Make it clear which keywords and accounts are behind each auto‑classification, via the **rule detail** screen.
- Likely future extensions (not yet implemented in the frontend):
  - A dedicated “View all” experience for all rules (beyond the preview in the pipeline).
  - Creating and editing rules from the mobile app (currently the “+ Add rules” action is just a label, not wired up).
  - Better surfacing, on individual bank transactions, of **which rule** fired, so users can trace behavior end‑to‑end.


