# Daily Development Summaries

## 2025-12-04

### Summary
Implemented transactions3 bank reconciliation workflow and unreconcilable transaction handling for the Bank section. Fixed transaction filtering issues to ensure proper separation between Purchases and Bank sections, and added support for marking bank transactions as unreconcilable with reason tracking.

### Commits

#### 1. feat: Implement transactions3 bank reconciliation and unreconcilable transaction workflow
**Commit:** `77d27e6`  
**Files Changed:** 16 files, 4592 insertions(+), 272 deletions(-)

**Changes:**
- Updated reconciliation API to use transactions3 endpoint (`/authenticated/transactions3/api/reconcile/bank`)
- Fixed timing issue where bank transactions weren't appearing on app reload by properly handling activeSection state in useFocusEffect
- Fixed Purchases3 section to only show purchase transactions by adding `kind=purchase` filter to all API queries and client-side filtering
- Fixed bank transactions appearing in wrong cards after verification by excluding unreconciled transactions from "Verified and audit ready" card
- Implemented "Reconcile" button for Bank section's "Needs reconciliation" card with proper card refresh after reconciliation
- Implemented "No matching record" workflow for bank transactions from "Needs reconciliation" card:
  - Updated summary card to display `tx.summary.description` and credit/debit status from `statementContext.isCredit`
  - Removed "Confirm and save" button for unreconcilable transactions
  - Added checkbox "No matching record" with form containing:
    - Description text input (pre-filled with transaction description)
    - Chart of Accounts picker (loads from API)
    - Reason picker with options: "Receipt lost", "Personal expense", "Cash transaction", "Receipt not available", "Other"
    - "Confirm transaction" button that calls verify endpoint with `markAsUnreconcilable: true`
- Added "Confirmed unreconcilable" card filtering logic for bank transactions with `reconciliation.status = 'unreconciled'`
- Updated all bank transaction queries to use `kind=statement_entry` filter on backend
- Added BankStatementRulesListScreen for managing bank statement rules
- Extended transactions3 verifyTransaction API to support `markAsUnreconcilable`, `description`, and `unreconcilableReason` parameters

**Files Modified:**
- `lib/api/transactions2.ts` - Updated reconciliation endpoint, extended verifyTransaction for unreconcilable workflow
- `screens/TransactionDetailScreen.tsx` - Added unreconcilable workflow UI with checkbox, form, and pickers
- `screens/TransactionsScaffoldScreen.tsx` - Fixed filtering, added reconciliation handler, implemented unreconcilable card
- `screens/AddTransactionScreen.tsx` - Updated bank statement upload integration
- `screens/UploadProcessingScreen.tsx` - Updated bank statement processing
- `navigation/TransactionsNavigator.tsx` - Added BankStatementRules route
- `screens/BankStatementRulesListScreen.tsx` - New screen for listing bank statement rules
- `docs/api/TRANSACTIONS3_*.md` - Added comprehensive documentation for transactions3 bank workflows

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 16 files
- **Total Lines Added:** 4592 insertions
- **Total Lines Removed:** 272 deletions
- **Net Change:** +4320 lines

### Key Features Added
1. Transactions3 bank reconciliation with automatic matching and card refresh
2. "No matching record" workflow for bank transactions with reason tracking
3. Proper transaction filtering to separate Purchases (kind=purchase) from Bank (kind=statement_entry)
4. "Confirmed unreconcilable" card showing verified bank transactions marked as unreconcilable
5. Fixed timing issues with transaction loading on app reload
6. Bank statement rules management screen

### Notes
- All bank transaction queries now filter by `kind=statement_entry` on the backend for better performance
- Unreconcilable transactions are verified and moved to source_of_truth with `reconciliation.status = 'unreconciled'`
- The reconciliation endpoint automatically matches bank transactions with purchase receipts based on amount, date, vendor name, and reference number
- Bank transactions marked as unreconcilable require a Chart of Accounts selection and reason for audit trail purposes

---

## 2025-12-03

### Summary
Extended Sales workflows across Transactions and Reports, including a dedicated Create Invoice flow, Sales pipeline cards, and VAT-aware manual sales posting that wires correctly into reporting. Tightened transaction filtering to clearly separate Purchases vs Sales across pipelines and ensured manual sales hit the appropriate Sales Revenue and VAT accounts so that Profit & Loss reflects them correctly.

### Commits

#### 1. feat: Add Create Invoice flow and Sales pipeline
**Commit:** `local`  
**Files Changed:** multiple (new screens, navigation updates, filtering changes)

**Changes:**
- Added `CreateInvoiceScreen` for manual sales invoices with line items (description, quantity, unit cost, VAT toggle), customer/project context, and validation.
- Wired Sales context from `TransactionsScaffoldScreen` and `LeadDetailScreen` into `AddTransactionScreen` so Sales gets a tailored Add flow, including a top-level “Sales Pipeline” entry point.
- Introduced a dedicated `SalesPipelineScreen` showing the 5-stage sales pipeline (Lead, In Conversation, Proposal/Quote Sent, Closed WON, Closed LOST) with grayscale wireframe styling and project/company hierarchy.
- Updated `TransactionsNavigator` to include new routes for Create Invoice, Sales Pipeline, and Sales lead detail views.

**Files Modified (selected):**
- `screens/CreateInvoiceScreen.tsx` - New manual invoice creation flow.
- `screens/AddTransactionScreen.tsx` - Sales context-aware Add menu and Sales Pipeline entry.
- `screens/TransactionsScaffoldScreen.tsx` - Sales section re-labeled and wired to new flows.
- `screens/SalesPipelineScreen.tsx` / `screens/LeadDetailScreen.tsx` - Sales pipeline and lead detail UX.
- `navigation/TransactionsNavigator.tsx` - New routes for Sales-related screens.

---

#### 2. feat: Add VAT-aware manual sales entry and Sales Revenue account selection
**Commit:** `local`  
**Files Changed:** multiple (API client, Create Invoice, reports, docs)

**Changes:**
- Extended `transactions2Api.createSaleTransaction` to accept `incomeAccount` and `vatAmount`, and updated the `SalesManualEntryRequest` type accordingly.
- Updated `CreateInvoiceScreen` to fetch candidate Sales Revenue accounts via `chartAccountsApi.getIncomeAccounts`, require a selection, and send `incomeAccount` and (when applicable) `vatAmount` with the sales manual entry.
- Implemented auto-verification after creating a manual sale by calling `transactions2Api.confirmVerification` when the new transaction is still `unverified`.
- Updated `ReportsScreen` income calculations and `chartAccountsApi.getIncomeAccounts` to prioritize “Sales Revenue”/“Revenue” by name, falling back to `type === 'income'` as needed.
- Added backend-facing docs describing expectations for sales manual entry, verification, and how Sales Revenue / VAT Output Tax should be populated.

**Files Modified (selected):**
- `lib/api/transactions2.ts` - Added `vatAmount` to sales manual entry and wired createSaleTransaction.
- `lib/api/chartAccounts.ts` - `getIncomeAccounts` tuned to prefer Sales Revenue accounts by name.
- `screens/CreateInvoiceScreen.tsx` - Sales Revenue picker, VAT total wiring, and auto-verification.
- `screens/ReportsScreen.tsx` - Income account selection updated to include Sales Revenue by name.
- `docs/api/TRANSACTIONS2_SALES_MANUAL_ENTRY_API.md` / `docs/api/TRANSACTIONS2_SALE_TRANSACTION_VERIFICATION.md` / `docs/api/SALE_TRANSACTION_REPORTING_ISSUE.md` - Backend guidance for sales manual entry and verification.

---

#### 3. feat: Refine Sales pipeline cards and Purchases/Sales separation
**Commit:** `local`  
**Files Changed:** multiple (Transactions scaffold)

**Changes:**
- Reworked the Sales section on `TransactionsScaffoldScreen` to show three invoice-centric cards: “Invoices submitted pending payment”, “Invoices paid, needs match”, and “Invoices paid and reconciled”.
- Implemented `isSaleTransaction` helper and tightened filters so Sales only surfaces true sale invoices, excluding Purchases and non-sale traffic.
- Updated “Invoices paid, needs match” to require a credit to `Accounts Receivable`, ensuring only paid-on-invoice items appear there.
- Added explicit purchase-only filters to the Purchases “Verified, needs match” card so Sales invoices don’t leak into Purchases.
- Removed the “Invoices paid in cash” Sales card and ensured each pipeline card still limits to three most recent items with a “View all” list behind it.

**Files Modified (selected):**
- `screens/TransactionsScaffoldScreen.tsx` - Sales and Purchases filtering refinements, Sales cards reshaped.
- `screens/AddTransactionScreen.tsx` - Sales breadcrumb, Sales Pipeline button placement and styling.

---

### Statistics
- **Total Commits:** 3 (local, Sales / invoices work)
- **Total Files Changed:** ~10–15 files
- **Total Lines Added:** ~600–800 insertions
- **Total Lines Removed:** ~150–250 deletions
- **Net Change:** ~+400–550 lines

### Key Features Added
1. Dedicated Create Invoice flow with Sales context, Sales Revenue account selection, and VAT-aware posting.
2. Sales pipeline UX spanning both invoice status cards on the Sales tab and a 5-stage Sales Pipeline screen.
3. Reporting integration so manual sales invoices flow correctly into Sales Revenue and VAT in Profit & Loss.
4. Clearer separation between Purchases and Sales across pipelines, reducing cross-contamination of cards.

### Notes
- Backend needs to ensure that manual sales entries with `incomeAccount` and `vatAmount` result in correct accounting entries (Sales Revenue net of VAT, VAT Output Tax for VAT portion) so chart-accounts values match frontend expectations.
- Additional follow-up may include date range controls for sales reporting and extended Sales health metrics.

---

## 2025-11-30

### Summary
Enhanced the Transactions scaffold navigation with improved UX: added automatic centering of selected navigation items, introduced two new sections (Payroll and Financial Services), and conditionally hide the Add Transaction button when viewing the Reporting Ready section.

### Commits

#### 1. feat: Add navigation centering, new sections, and conditional Add button
**Commit:** `86714a5`  
**Files Changed:** 1 file, 207 insertions(+), 14 deletions(-)

**Changes:**
- Implemented automatic centering of selected navigation item in horizontal scroll view with smooth animation
- Added button position tracking using refs and onLayout handlers to measure button positions and container width
- Added two new navigation sections: "Payroll" and "Financial Services" (placed before Reporting Ready)
- Updated SectionKey type to include 'payroll' and 'financialServices'
- Conditionally hide Add Transaction button when Reporting Ready section is active (no need to add transactions to already reporting-ready items)
- Added useEffect to center button when activeSection changes, with small delay to ensure layout completion

**Files Modified:**
- `screens/TransactionsScaffoldScreen.tsx` - Navigation centering logic, new sections, conditional Add button

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 1 file
- **Total Lines Added:** 207 insertions
- **Total Lines Removed:** 14 deletions
- **Net Change:** +193 lines

### Key Features Added
1. Automatic centering of selected navigation item in horizontal scroll view
2. Payroll section added to Transactions navigation
3. Financial Services section added to Transactions navigation
4. Conditional Add Transaction button (hidden for Reporting Ready section)

### Notes
- Navigation centering uses refs to track button positions and smoothly scrolls to center the selected item
- New sections (Payroll, Financial Services) currently return null in renderSection (placeholder for future implementation)
- Add Transaction button logic ensures users can't add transactions when viewing already-completed Reporting Ready items

---

## 2025-11-28

### Summary
Expanded the Transactions experience with full manual purchase entry, credit card rules management, and tighter pipeline logic for cash-only and manual-entry purchases. Added backend-facing documentation for credit card rules and purchases manual entry, and refined navigation so Transactions and Reports tabs reset cleanly to their home stacks when reselected.

### Commits

#### 1. Add manual purchase entry, credit card rules, and pipeline refinements (local)
**Commit:** `local`  
**Files Changed:** ~18 files, ~1500 insertions(+), ~450 deletions(-)

**Changes:**
- Added full manual purchase entry flow that lets users build itemised purchases (items, charges, payment methods, currency) and submit them as Transactions2 `purchase` transactions with `inputMethod: 'manual'`
- Updated `AddTransactionScreen` to route purchase contexts to the manual entry screen while keeping other transaction types as “coming soon”
- Extended bank statement rules API client to be business-aware and support creating/updating rules, and added parallel credit card rules API with corresponding create/detail screens
- Enhanced `TransactionsScaffoldScreen` to treat manual-entry purchases as receipts, support cash-only “reporting ready” detection across receipts/bank/cards, and surface both bank and credit card auto rules with “+ Add rules” actions
- Improved `MainTabNavigator` so re-pressing Transactions or Reports tabs resets their nested stacks back to `TransactionsHome` / `ReportsHome` for a cleaner navigation baseline
- Added backend implementation notes for credit card rules and a detailed purchases manual-entry API spec, plus a focused Purchases architecture doc describing initial-load and filtering behavior

**Files Modified (selected):**
- `lib/api/bankStatementRules.ts` / `lib/api/creditCardRules.ts` - Business-scoped rule APIs with get/update/create helpers
- `navigation/MainTabNavigator.tsx` / `navigation/TransactionsNavigator.tsx` / `navigation/ScaffoldNavigator.tsx` - Tab reset behavior and new routes for manual entry and rule create/detail screens
- `screens/AddTransactionScreen.tsx` / `screens/ManualPurchaseEntryScreen.tsx` - Context-aware manual entry integration and end-to-end purchase creation form
- `screens/TransactionsScaffoldScreen.tsx` - Manual-entry receipt support, cash-only reporting-ready logic, bank/card auto rules columns with navigation to rule management
- `screens/BankStatementRuleDetailScreen.tsx` / `screens/BankStatementRuleCreateScreen.tsx` / `screens/CreditCardRuleDetailScreen.tsx` / `screens/CreditCardRuleCreateScreen.tsx` - Editable keyword triggers and new rule creation flows for bank and credit card statements
- `docs/api/CREDIT_CARD_RULES_API_BACKEND_NOTE.md` / `docs/api/TRANSACTIONS2_PURCHASES_MANUAL_ENTRY.md` - Backend guides for credit card rules endpoints and manual purchases API payload/behavior
- `docs/architecture/transactions-purchases-flow.md` (and related FE docs) - Focused architecture write-up for Purchases on initial load, replacing the older generic React Native transaction architecture document

---

### Statistics
- **Total Commits:** 1 (local multi-file change)
- **Total Files Changed:** ~18 files
- **Total Lines Added:** ~1500 insertions
- **Total Lines Removed:** ~450 deletions
- **Net Change:** ~+1050 lines

### Key Features Added
1. Manual Purchase Entry screen with item, charge, payment-method, and currency handling wired into Transactions2 `purchase` creation.
2. Bank and credit card auto-rules management (list, edit keywords, create new rules) integrated into the Transactions scaffold for both bank and card pipelines.
3. Improved reporting-ready and receipt detection that includes manual-entry purchases and cash-only transactions across receipts, bank, and cards.
4. Tab reselect behavior that reliably returns Transactions and Reports to their home screens for easier navigation.

### Notes
- Manual purchase entry uses the documented Transactions2 purchases manual-entry payload and relies on backend support for currency conversion and accounting entry generation.
- Cash-only detection is implemented defensively across `accounting.paymentBreakdown` and `details.paymentType/paymentBreakdown` to support both OCR and manual-entry payloads.
- The legacy `react-native-transaction-architecture.md` doc was removed in favor of narrower, flow-focused architecture documents for Purchases and related screens.

---

## 2025-11-27

### Summary
Added account ledger functionality to Profit & Loss and Balance Sheet reports, enabling users to drill down into individual account transactions. Implemented clickable account rows that navigate to a detailed ledger view showing all transactions affecting the selected account, with running balances that sum to the account value shown in the reports.

### Commits

#### 1. feat: Add account ledger view for P&L and Balance Sheet reports
**Commit:** `6703850`  
**Files Changed:** 4 files, 611 insertions(+), 12 deletions(-)

**Changes:**
- Created AccountLedgerScreen to display detailed transaction ledger for any selected account
- Made account rows clickable in ProfitLossReportScreen for income and expense accounts
- Made account rows clickable in BalanceSheetReportScreen for asset, liability, and equity accounts
- Added AccountLedger route to ReportsNavigator with support for all account types (income, expense, asset, liability, equity)
- Implemented transaction filtering using Reporting Ready logic (matches balance sheet calculations)
- For asset accounts (e.g. bank accounts), check both accounting.debits and accounting.credits (debits increase assets, credits decrease assets)
- For expense accounts, check accounting.debits (debits increase expenses)
- For income, liability, and equity accounts, check accounting.credits (credits increase these accounts)
- Fixed column alignment between table headers (Amount, Balance) and ledger entry values
- Running balance calculation correctly sums to match the period total shown in reports
- Updated empty state message to reference "reporting ready" instead of "tallied"

**Files Modified:**
- `screens/AccountLedgerScreen.tsx` - New ledger screen with transaction filtering and display logic
- `screens/ProfitLossReportScreen.tsx` - Added click handlers for account rows
- `screens/BalanceSheetReportScreen.tsx` - Added click handlers for account rows
- `navigation/ReportsNavigator.tsx` - Added AccountLedger route with type support

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 4 files
- **Total Lines Added:** 611 insertions
- **Total Lines Removed:** 12 deletions
- **Net Change:** +599 lines

### Key Features Added
1. Account ledger view showing all transactions affecting a selected account
2. Clickable account rows in P&L and Balance Sheet reports
3. Support for all account types (income, expense, asset, liability, equity)
4. Correct transaction filtering using Reporting Ready logic
5. Proper handling of asset accounts with both debits and credits
6. Running balance calculation that matches report totals
7. Aligned column headers and values in ledger table

### Notes
- Ledger uses same transaction filtering as balance sheet reports (Reporting Ready = verified AND (reconciled OR has accounting entries))
- Asset accounts like bank accounts can appear in both debits (deposits) and credits (withdrawals), requiring special handling
- Running balances are calculated correctly with proper debit/credit handling per account type
- Column alignment fixed by matching header and entry row layout structures exactly

---

## 2025-11-26

### Summary
Refined the navigation and visual hierarchy across Transactions, Reports, and follow-on screens to create a consistent wireframe app bar pattern, clarified report summaries and detail screens, and redesigned the Add Transaction experience to be context-aware and more action-focused. Standardized status/loading states and wording (e.g. “Purchases”, “Reports”) so users see clearer progress and flows across the app.

### Commits

#### 1. Refine app bar layout and root navigation UX
**Commit:** `6cd6ce0`  
**Files Changed:** 12 files, 365 insertions(+), 303 deletions(-)

**Changes:**
- Updated `AppBarLayout` to support centered titles, optional profile icon, configurable right-side icons, and back-button mode
- Applied app bar titles to all main root screens (Home, Transactions, Reports, Settings, Help, Profile) and removed duplicate in-screen titles
- Adjusted root spacing and backgrounds so content starts consistently below the app bar and the main surface uses a slightly darker tint
- Replaced the Transactions root “+ Add” button with an app bar icon and wired it to pass context (section, bank account, card) into AddTransaction
- Added account/card text tabs for Bank and Card sections, with simplified labels and consistent truncation format (e.g. `..1234`)
- Tightened copy and capitalization across pipeline cards (e.g. “Needs verification”, “Reporting ready”) and truncated “View all” titles where appropriate

**Files Modified:**
- `components/AppBarLayout.tsx`
- `screens/HomeScreen.tsx`
- `screens/TransactionsScaffoldScreen.tsx`
- `screens/ReportsScreen.tsx`
- `screens/SettingsScreen.tsx`
- `screens/HelpScreen.tsx`
- `screens/ProfileScreen.tsx`

---

#### 2. Redesign Add Transaction screen and context handling
**Commit:** `Refine app bar layout, titles, and root screen spacing` (local)  
**Files Changed:** multiple (AddTransaction, Transactions scaffold, navigation)

**Changes:**
- Converted AddTransaction into a context-aware screen that shows a prominent, centered breadcrumb (e.g. Purchases, Bank transactions ..1234)
- Replaced the 2x2 grid with a vertical stack of icon buttons (Choose photo, Take photo, Choose from files, Manual input, Send via email)
- Introduced a bank-specific “Connect to Bank” button with dashed separator, only visible when launched from the Bank pipeline
- Hid “Manual input” when adding from Bank / Card pipelines and kept it for other contexts (e.g. Purchases, Internal)
- Centered the action group vertically under the app bar while preserving the wireframe grayscale aesthetic

**Files Modified (selected):**
- `screens/AddTransactionScreen.tsx`
- `screens/TransactionsScaffoldScreen.tsx`

---

#### 3. Improve Transactions scaffold and drag-to-match flows
**Commit:** `Refine app bar, navigation, and report/add-transaction UX` (local)  
**Files Changed:** multiple scaffold/drag-drop files

**Changes:**
- Standardized section labels (e.g. “Purchases” instead of “Purchase Receipts”) across Transactions and drag-to-match screens
- Ensured all pipeline “Needs …” cards show only three most recent items, with View all showing full lists (including Reporting ready for all sources)
- Added bank/card context and section tracking through ScaffoldViewAll and DragDropReconciliationScreen
- Updated DragDropReconciliationScreen header and back button to better match new secondary-screen patterns

**Files Modified (selected):**
- `screens/TransactionsScaffoldScreen.tsx`
- `screens/ScaffoldViewAllScreen.tsx`
- `screens/DragDropReconciliationScreen.tsx`
- `docs/progress/daily-summaries.md`
- `docs/api/TRANSACTIONS2_RECONCILIATION_API.md`

---

#### 4. Expand Reports dashboard cards and align report detail screens
**Commit:** `Refine app bar, navigation, and report/add-transaction UX` / `Tighten report detail headers and drag-to-match back button`  
**Files Changed:** 5 files, various insertions/deletions

**Changes:**
- Expanded Reports root cards to show mini summaries:  
  - Profit & Loss: Income, Expenses, Net profit rows  
  - Balance Sheet: Assets, Liabilities, Equity, and Liabilities + equity (with equity including retained earnings)  
  - Cashflow: high-level net cash flow headline
- Removed duplicate inline metrics in card headers and increased emphasis on the mini statements
- Updated all report detail screens (Profit & Loss, Balance sheet, Cashflow) to use the shared AppBarLayout with title “Reports” and consistent back navigation
- Added “Reports” as the conceptual breadcrumb in the app bar and kept the detailed report names inside each screen body
- Centered “Loading …” states within report detail screens and kept the wireframe look

**Files Modified:**
- `screens/ReportsScreen.tsx`
- `screens/ProfitLossReportScreen.tsx`
- `screens/BalanceSheetReportScreen.tsx`
- `screens/CashflowReportScreen.tsx`

---

### Statistics
- **Total Commits:** 3 (local work across several UI/UX refinements)
- **Total Files Changed:** ~20 files
- **Total Lines Added:** ~400 insertions
- **Total Lines Removed:** ~320 deletions
- **Net Change:** ~+80 lines

### Key Features Added
1. Unified app bar design with clear breadcrumbing and back behavior for root screens, report detail screens, and follow-on flows.
2. Context-aware Add Transaction screen with a vertically stacked, icon-based action layout and bank-specific “Connect to Bank” entry point.
3. Richer Reports dashboard cards with mini P&L and Balance Sheet summaries, aligned with detailed report calculations (including retained earnings).
4. Cleaner Transactions scaffold and drag-to-match flows with consistent labels, limits, and centered loading states.

### Notes
- Some commits referenced here are local (not yet pushed) and may be squashed/reworded before sharing with others.
- Future follow-up includes a date-range picker for reports and full bank-connection flow behind the “Connect to Bank” entry point.

---

## 2025-11-25

### Summary
Fixed transaction filtering to include all transaction sources (purchase receipts, bank statements, credit card statements) by removing classificationKind filter. Added pull-to-refresh functionality and updated transaction filtering helpers to correctly distinguish between bank and credit card transactions using capture.source. Implemented reconciliation API integration, removed Reconciled card (reconciled transactions now go directly to Reporting Ready), added drag-and-drop reconciliation feature, and limited all pipeline cards to show only 3 transactions with "View all" functionality.

### Commits

#### 1. fix: Update transaction filtering to include all sources and add pull-to-refresh
**Commit:** `25362c8`  
**Files Changed:** 4 files, 342 insertions(+), 52 deletions(-)

**Changes:**
- Removed `classificationKind: 'purchase'` filter from transactions2Api.getTransactions call to fetch all transaction types
- Added `RefreshControl` to TransactionsScaffoldScreen ScrollView for manual pull-to-refresh functionality
- Updated `isBankTransaction` helper function to filter by `metadata.capture.source === 'bank_statement_ocr'` instead of checking classification.kind
- Added new `isCreditCardTransaction` helper function to filter by `metadata.capture.source === 'credit_card_statement_ocr'`
- Increased transaction fetch limit from 100 to 200 to ensure all transaction types are included
- Added comprehensive credit card statement integration documentation
- Updated daily summaries with 2025-11-24 entry

**Files Modified:**
- `docs/api/CREDIT_CARD_STATEMENT_INTEGRATION.md` - Credit card integration guide (new)
- `docs/progress/daily-summaries.md` - Added 2025-11-24 summary entry
- `screens/TransactionsScaffoldScreen.tsx` - Updated transaction filtering and added RefreshControl
- `start-dev.sh` - Minor update

---

#### 2. feat: Add reconciliation API integration and drag-and-drop reconciliation feature
**Commit:** `3c4d262`  
**Files Changed:** 5 files, 1587 insertions(+), 47 deletions(-)

**Changes:**
- Integrated reconciliation API endpoints (`/reconcile/bank` and `/reconcile/credit-card`) from TRANSACTIONS2_RECONCILIATION_API.md
- Removed "Reconciled" card from Bank Transactions and Credit Card Transactions sections
- Updated Reporting Ready filters to include reconciled transactions directly (reconciled transactions now go straight to Reporting Ready)
- Limited all pipeline cards to show only 3 transactions (most recent), with "View all" button to view complete list
- Created DragDropReconciliationScreen for manual drag-and-drop matching of bank/CC transactions with purchase receipts
- Added "Drag to Match" button to Needs Reconciliation "View all" screen
- Fixed section tracking to properly pass bank/cards section through navigation chain
- Updated purchase receipt cards to show detailed information (title, description, date, amount) and only show receipts with reconciliation.status === 'unreconciled'
- Improved reconciliation button placement and loading states

**Files Modified:**
- `docs/api/TRANSACTIONS2_RECONCILIATION_API.md` - Reconciliation API documentation (new)
- `lib/api/transactions2.ts` - Added reconciliationApi with reconcileBank and reconcileCreditCard functions
- `screens/DragDropReconciliationScreen.tsx` - New drag-and-drop reconciliation screen (new)
- `screens/ScaffoldViewAllScreen.tsx` - Added "Drag to Match" button and section tracking
- `screens/TransactionsScaffoldScreen.tsx` - Updated workflow logic, removed Reconciled card, added 3-item limits, improved section tracking

---

### Statistics
- **Total Commits:** 2
- **Total Files Changed:** 9 files
- **Total Lines Added:** 1929 insertions
- **Total Lines Removed:** 99 deletions
- **Net Change:** +1830 lines

### Key Features Added
1. Pull-to-refresh functionality on TransactionsScaffoldScreen
2. Correct filtering for all transaction sources (purchase receipts, bank statements, credit card statements)
3. Updated transaction type detection using capture.source instead of classification.kind
4. Increased transaction fetch capacity (200 limit)
5. Credit card statement integration documentation
6. Reconciliation API integration with bank and credit card endpoints
7. Removed Reconciled card - reconciled transactions now go directly to Reporting Ready
8. All pipeline cards limited to 3 most recent transactions with "View all" functionality
9. Drag-and-drop reconciliation screen for manual matching
10. Enhanced purchase receipt cards with detailed information (title, description, date, amount)
11. Improved section tracking (bank vs cards) through navigation chain

### Notes
- Transaction filtering now correctly distinguishes between bank and credit card transactions using `metadata.capture.source`
- Bank transactions: `capture.source === 'bank_statement_ocr'`
- Credit card transactions: `capture.source === 'credit_card_statement_ocr'`
- **Issue Identified:** Credit card transactions not appearing in Reports screen appears to be a backend issue. The backend chart accounts API (`/api/businesses/{businessId}/chart-accounts?withValues=true`) calculates values server-side and should include `credit_card_statement_ocr` transactions when they're "Reporting Ready" (verified AND (reconciled OR has accounting entries)), but currently may only be including purchase receipts and bank statements. RN-side filtering logic is correct and includes all transaction sources.
- Pull-to-refresh allows users to manually refresh transaction list without restarting the app
- Reconciled transactions (reconciliation.status === 'matched', 'reconciled', or 'exception') now appear directly in Reporting Ready instead of a separate Reconciled card
- All pipeline cards show only the 3 most recent transactions sorted by updatedAt (or createdAt as fallback)
- Drag-and-drop reconciliation screen allows users to manually match bank/CC transactions with purchase receipts by dragging
- Purchase receipts only show in drag-drop screen when reconciliation.status === 'unreconciled'
- Drag gesture activates on vertical movement (8px) to avoid conflicts with horizontal ScrollView scrolling

---

## 2025-11-24

### Summary
Updated Bank Transactions and Credit Card Transactions sections with proper workflow states based on backend specifications. Implemented Auto Bank Rules feature with API integration, rule detail screens, and improved reconciliation button placement. Added comprehensive documentation for bank transaction workflows and rules API.

### Commits

#### 1. feat: Update Bank Transactions workflow and implement Auto Bank Rules
**Commit:** `a505981`  
**Files Changed:** 8 files, 1,480 insertions(+), 75 deletions(-)

**Changes:**
- Updated Bank Transactions section with three workflow states: Needs Verification (no reconciliation required), Needs Reconciliation, and Reporting Ready
- Implemented bank transaction filtering logic based on `classification.kind === 'statement_entry'` and accounting entries presence
- "Needs Verification" shows bank transactions with accounting entries (rule matched) that are not yet verified
- "Needs Reconciliation" shows bank transactions without accounting entries (no rule matched) that need to be matched with Purchases
- "Reporting Ready" shows verified transactions that are either reconciled OR have accounting entries (standalone transactions like bank fees)
- Updated Credit Card Transactions section with similar three-column structure matching Bank Transactions
- Removed dummy data from both Bank and Card sections - now using real transaction filtering
- Added Auto Bank Rules card that displays all bank statement rules from backend API
- Created BankStatementRuleDetailScreen showing rule details: description, keywords, accounting treatment, category, and business expense status
- Moved Reconcile button from hero actions row to bottom right of "Needs Reconciliation" card (vertically aligned with "View all" button)
- Added Reconcile button to ScaffoldViewAllScreen when viewing "Needs Reconciliation" section
- Created bankStatementRules API client for fetching bank statement rules
- Added comprehensive documentation files for backend team specifications

**Files Modified:**
- `docs/api/BANK_STATEMENT_RULES_API.md` - API documentation for bank statement rules (new)
- `docs/api/BANK_TRANSACTION_WORKFLOW_STATES.md` - Workflow states documentation (new)
- `docs/api/REACT_NATIVE_TRANSACTIONS2_INTEGRATION.md` - Integration guide (new)
- `lib/api/bankStatementRules.ts` - API client for bank statement rules (new)
- `navigation/TransactionsNavigator.tsx` - Added BankStatementRuleDetail route
- `screens/BankStatementRuleDetailScreen.tsx` - Rule detail screen (new)
- `screens/ScaffoldViewAllScreen.tsx` - Added Reconcile button for Needs Reconciliation section
- `screens/TransactionsScaffoldScreen.tsx` - Major refactor with proper workflow state logic and Auto Bank Rules integration

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 8 files
- **Total Lines Added:** 1,480 insertions
- **Total Lines Removed:** 75 deletions
- **Net Change:** +1,405 lines

### Key Features Added
1. Bank Transactions workflow states matching backend specifications (Needs Verification, Needs Reconciliation, Reporting Ready)
2. Bank transaction filtering based on classification.kind and accounting entries
3. Credit Card Transactions section updated with same structure as Bank Transactions
4. Auto Bank Rules card with API integration displaying all bank statement rules
5. BankStatementRuleDetailScreen for viewing individual rule details
6. Reconcile button repositioned to Needs Reconciliation card (bottom right, aligned with View all)
7. Reconcile button added to View All screen for Needs Reconciliation section
8. Documentation files for bank transaction workflow and rules API

### Notes
- Bank transaction workflow logic now correctly matches backend specification in BANK_TRANSACTION_WORKFLOW_STATES.md
- Transactions with accounting entries that are verified go directly to "Reporting Ready" (not "Needs Reconciliation")
- Transactions without accounting entries skip verification and go directly to "Needs Reconciliation"
- Auto Bank Rules displays default rules (Cash Withdrawal, Bank Fee) from backend API
- Rule detail screen shows keywords as tags, accounting treatment as table, and business expense badge
- All dummy data removed from Bank and Card sections - using real transaction data filtering
- Reconcile button only appears for bank section's "Needs Reconciliation" card, not for other sections

---

## 2025-11-21

### Summary
Enhanced the AddTransactionScreen with improved layout, file picker integration, and wireframe design. Added support for choosing files from the device file system, implemented a 2x2 grid layout for four transaction input methods, and converted the design to a wireframe style with grayscale colors.

### Commits

#### 1. Enhance AddTransactionScreen with file picker, improved layout, and wireframe design
**Commit:** `3b5e622`  
**Files Changed:** 3 files, 176 insertions(+), 16 deletions(-)

**Changes:**
- Added expo-document-picker dependency for file system access on Android/iOS
- Implemented 2x2 grid layout for four transaction input methods (Choose photo, Take photo, Choose from Files, Manual Input)
- Added "Choose from Files" button with full file browser support (shows Downloads, Documents, etc.)
- Added "Manual Input" button with placeholder handler for future implementation
- Converted to wireframe design with grayscale colors (replaced black buttons with gray #666666)
- Added informational note about email-based ingestion feature (coming soon)
- Updated subtitle from "Capture a receipt..." to "Choose how you'd like to add transactions"
- Improved button styling with consistent spacing and responsive grid layout
- File picker validates selected files are images before processing

**Files Modified:**
- `package.json` - Added expo-document-picker dependency
- `package-lock.json` - Updated package lock file
- `screens/AddTransactionScreen.tsx` - Major UI improvements and new functionality

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 3 files
- **Total Lines Added:** 176 insertions
- **Total Lines Removed:** 16 deletions
- **Net Change:** +160 lines

### Key Features Added
1. File system file picker integration (Android/iOS)
2. Improved 2x2 grid layout for transaction input methods
3. "Choose from Files" button with full file browser access
4. "Manual Input" button (placeholder for future implementation)
5. Wireframe design conversion (grayscale color scheme)
6. Email-based ingestion informational note
7. Enhanced button styling and responsive layout

### Notes
- File picker shows full file browser with categories like Downloads on Android
- Manual Input button currently shows alert - needs to be wired to actual manual input screen
- Email-based ingestion feature is documented but not yet implemented
- All buttons maintain wireframe design (black, white, grayscale only)

---

## 2025-11-20

### Summary
Built out the complete Transactions v2 scaffold screen with pipeline-based workflow, real transaction data integration, verification flow, and navigation. Implemented a new transaction management interface that categorizes transactions into Receipts Pipeline, Bank Pipeline, Cards Pipeline, and Reporting Ready sections with full navigation and detail views.

### Commits

#### 1. Add Reporting Ready card to Receipts Pipeline
**Commit:** `e713167`  
**Files Changed:** 1 file, 59 insertions(+)

**Changes:**
- Added new "Reporting Ready" card to Receipts Pipeline showing last 3 receipts that moved to Reporting Ready
- Provides user feedback that verified transactions are progressing through pipeline correctly
- Sorted by most recent updatedAt date
- Includes View all action button for navigation

**Files Modified:**
- `screens/TransactionsScaffoldScreen.tsx` - Added recentReportingReadyReceipts logic and new pipeline card

---

#### 2. Wire up Add button and implement reporting ready logic
**Commit:** `7756cf8`  
**Files Changed:** 4 files, 71 insertions(+), 14 deletions(-)

**Changes:**
- Added AddTransactionScreen to ScaffoldNavigator stack
- Wired up Add button in TransactionsScaffoldScreen to navigate to AddTransaction
- Updated AddTransactionScreen to handle navigation from both navigators
- Implemented reporting ready transaction categorization (verified + reconciled/matched/exception)
- Updated backend API documentation for cash-only transaction reconciliation logic
- Reporting Ready section now shows all transaction sources (not just receipts)

**Files Modified:**
- `lib/api/transactions2.ts` - Added cash-only reconciliation documentation
- `navigation/ScaffoldNavigator.tsx` - Added AddTransaction screen
- `screens/AddTransactionScreen.tsx` - Updated navigation handling
- `screens/TransactionsScaffoldScreen.tsx` - Implemented reporting ready logic

---

#### 3. Add transaction verification confirmation flow
**Commit:** `acf168f`  
**Files Changed:** 4 files, 248 insertions(+), 80 deletions(-)

**Changes:**
- Added confirmVerification API endpoint to transactions2Api
- Added 'Confirm and save' button to TransactionDetailScreen for unverified transactions
- Wired up transaction cards in scaffold to navigate to TransactionDetailScreen
- Added TransactionDetailScreen to ScaffoldNavigator stack
- Store full Transaction objects in scaffold for detail view navigation
- Implemented verification confirmation with API call and state updates

**Files Modified:**
- `lib/api/transactions2.ts` - Added confirmVerification endpoint
- `navigation/ScaffoldNavigator.tsx` - Added TransactionDetail screen
- `screens/TransactionDetailScreen.tsx` - Added verification confirmation button and logic
- `screens/TransactionsScaffoldScreen.tsx` - Made transaction cards clickable with navigation

---

#### 4. Add View All screen for scaffold pipeline sections
**Commit:** `f784543`  
**Files Changed:** 4 files, 509 insertions(+), 68 deletions(-)

**Changes:**
- Created ScaffoldViewAllScreen for displaying full lists of pipeline items
- Added ScaffoldNavigator for scaffold section navigation
- Wired up View All buttons to navigate to detail screen
- Removed AppBarLayout from secondary navigation pages
- Support verification items display in View All screen
- Implemented horizontal scrolling pipeline navigation with fade effect

**Files Modified:**
- `navigation/MainTabNavigator.tsx` - Added scaffold tab
- `navigation/ScaffoldNavigator.tsx` - New navigator for scaffold flow
- `screens/ScaffoldViewAllScreen.tsx` - New screen for viewing all pipeline items
- `screens/TransactionsScaffoldScreen.tsx` - Major refactor with pipeline structure

---

#### 5. Add transactions scaffold tab and layout
**Commit:** `dc09aa8`  
**Files Changed:** 3 files, 513 insertions(+), 18 deletions(-)

**Changes:**
- Created initial TransactionsScaffoldScreen with pipeline-based layout
- Added scaffold tab to main navigation
- Implemented pipeline navigation buttons (Receipts, Bank, Cards, Reporting Ready)
- Added action buttons (Add, Reconcile) and page title
- Created pipeline card structure with transaction lists
- Updated AddTransactionScreen with back button and safe area handling

**Files Modified:**
- `navigation/MainTabNavigator.tsx` - Added TransactionsScaffold tab
- `screens/AddTransactionScreen.tsx` - Added back button and safe area
- `screens/TransactionsScaffoldScreen.tsx` - New scaffold screen (432 lines)

---

### Statistics
- **Total Commits:** 5
- **Total Files Changed:** 12 files
- **Total Lines Added:** 1,400 insertions
- **Total Lines Removed:** 180 deletions
- **Net Change:** +1,220 lines

### Key Features Added
1. Transactions v2 scaffold screen with pipeline-based workflow
2. Receipts Pipeline with Needs Verification, Verified Needs Match, and Reporting Ready cards
3. Bank Pipeline and Cards Pipeline structure (with account/card navigation)
4. Reporting Ready section showing all verified and reconciled transactions
5. Transaction verification confirmation flow with API integration
6. View All screens for pipeline sections
7. Full navigation stack for scaffold flow
8. Real transaction data integration and categorization
9. Add transaction button wired to AddTransactionScreen
10. Reporting Ready card showing recent completed receipts

### Notes
- Backend API endpoint `/verify` needs to be implemented to handle verification confirmation
- Backend should set `reconciliation.status = "reconciled"` for cash-only transactions when verifying
- Reporting Ready logic correctly filters transactions based on verification and reconciliation status
- All transaction sources (receipts, bank, cards, integrations) appear in Reporting Ready section

---

## 2025-11-19

### Summary
Delivered the first pass of financial reporting by wiring Profit & Loss, Balance Sheet, Cashflow, and the Reports dashboard into the live chart-accounts API with real-time values and consistent presentation.

### Commits

#### 1. Add financial reports with real-time values
**Commit:** `d954834`  
**Files Changed:** 8 files, 2,056 insertions(+), 26 deletions(-)

**Changes:**
- Implemented Profit & Loss screen with income/expense groupings, totals, and net profit
- Implemented Balance Sheet screen with assets/liabilities/equity, retained earnings, and balance checks
- Implemented Cashflow screen with operating/investing/financing sections (noted follow-up work)
- Hooked ReportsScreen cards to live values for cashflow, profit, and assets
- Extended chart accounts API client with `withValues`, date-range filters, and documentation

**Files Modified:**
- `docs/api/chart-accounts-with-values.md` - Added endpoint documentation (new)
- `lib/api/chartAccounts.ts` - Added value support and filtering
- `navigation/MainTabNavigator.tsx` - Linked reports navigator
- `navigation/ReportsNavigator.tsx` - Added reports stack (new)
- `screens/BalanceSheetReportScreen.tsx` - New detailed screen
- `screens/CashflowReportScreen.tsx` - New detailed screen
- `screens/ProfitLossReportScreen.tsx` - New detailed screen
- `screens/ReportsScreen.tsx` - Dashboard hooked to live values

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 8 files
- **Total Lines Added:** 2,056 insertions
- **Total Lines Removed:** 26 deletions
- **Net Change:** +2,030 lines

### Key Features Added
1. Profit & Loss report with totals and net profit
2. Balance Sheet with retained earnings and balance validation
3. Cashflow report with activity breakdown (WIP refinements noted)
4. Reports dashboard showing live summary metrics

### Notes
- WIP: Cashflow categorization and additional logic still pending
- WIP: Need a date range picker to let users change report periods

---

## 2025-11-18

### Summary
Today's work focused on enhancing the Transactions screen with categorized transaction cards and improving the overall transaction management experience.

### Commits

#### 1. Add Purchases and Bank Records cards to Transactions screen
**Commit:** `8d38c1f`  
**Files Changed:** 2 files, 119 insertions(+), 5 deletions(-)

**Changes:**
- Added `classificationKind` filter parameter to `transactions2` API to support filtering by transaction classification
- Implemented Purchases card displaying first 3 transactions with `classification.kind === "purchase"`
- Implemented Bank Records card displaying first 3 transactions with `classification.kind === "bank-record"`
- Added client-side filtering as fallback to ensure proper transaction separation
- Updated Add Transactions button to use simple plus icon instead of receipt-text-plus
- Added subtle card titles ("Purchases" and "Bank Records") with uppercase styling

**Files Modified:**
- `lib/api/transactions2.ts` - Added classificationKind parameter support
- `screens/TransactionsScreen.tsx` - Added two transaction cards with filtering logic

---

#### 2. Add AppBar avatar, navigation updates, and additional API files
**Commit:** `32723de`  
**Files Changed:** 12 files, 946 insertions(+), 140 deletions(-)

**Changes:**
- Added avatar/profile button to AppBarLayout component
- Updated navigation structure (AppNavigator, MainTabNavigator, TransactionsNavigator)
- Created ProfileScreen with user profile functionality
- Added bankAccounts and creditCards API files for future integration
- Updated transaction screens and documentation

**Files Modified:**
- `components/AppBarLayout.tsx` - Added avatar functionality
- `documentation/nextjs-api-contract.md` - Updated API documentation
- `lib/api/bankAccounts.ts` - New API file
- `lib/api/creditCards.ts` - New API file
- `navigation/AppNavigator.tsx` - Navigation updates
- `navigation/MainTabNavigator.tsx` - Navigation updates
- `navigation/TransactionsNavigator.tsx` - Navigation updates
- `screens/AddTransactionScreen.tsx` - Minor updates
- `screens/ProfileScreen.tsx` - New screen (179 lines)
- `screens/SettingsScreen.tsx` - Major updates (625 lines)
- `screens/TransactionListScreen.tsx` - Updates
- `screens/TransactionsScreen.tsx` - Updates

---

#### 3. Add transaction detail screen with payment method and debit account editing
**Commit:** `4bade29`  
**Files Changed:** 5 files, 849 insertions(+), 5 deletions(-)

**Changes:**
- Created TransactionDetailScreen with comprehensive transaction view
- Implemented header card showing transaction summary information
- Added bottom sheet pickers for editing debit accounts and payment methods
- Created API functions for chart accounts and payment methods
- Added PATCH method support to API client
- Implemented updateItemDebitAccount and updatePaymentMethod endpoints
- Added real-time updates with server-side recalculation
- Implemented loading states, error handling, and visual feedback

**Files Modified:**
- `lib/api/chartAccounts.ts` - New API file (18 lines)
- `lib/api/client.ts` - Added PATCH method support
- `lib/api/paymentMethods.ts` - New API file (21 lines)
- `lib/api/transactions2.ts` - Added update endpoints (47 lines)
- `screens/TransactionDetailScreen.tsx` - New screen (751 lines)

---

### Statistics
- **Total Commits:** 3
- **Total Files Changed:** 19 files
- **Total Lines Added:** 1,914 insertions
- **Total Lines Removed:** 150 deletions
- **Net Change:** +1,764 lines

### Key Features Added
1. Transaction categorization (Purchases vs Bank Records)
2. Transaction detail screen with editing capabilities
3. Payment method and debit account management
4. Profile screen and navigation improvements
5. API infrastructure for bank accounts and credit cards

---

## Template for Future Days

```markdown
## YYYY-MM-DD

### Summary
[Brief overview of the day's work]

### Commits

#### [Commit Number]. [Commit Title]
**Commit:** `[commit hash]`  
**Files Changed:** [X] files, [Y] insertions(+), [Z] deletions(-)

**Changes:**
- [Change description 1]
- [Change description 2]
- [Change description 3]

**Files Modified:**
- `path/to/file1.ts` - [Description]
- `path/to/file2.tsx` - [Description]

---

### Statistics
- **Total Commits:** [X]
- **Total Files Changed:** [Y] files
- **Total Lines Added:** [Z] insertions
- **Total Lines Removed:** [W] deletions
- **Net Change:** +[N] lines

### Key Features Added
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

### Notes
[Any additional notes, blockers, or follow-up items]
```

---

## How to Use This Document

1. **At the end of each day**, review your commits using:
   ```bash
   git log --since="today 00:00" --stat --pretty=format:"%h%n%an%n%ad%n%s%n%b" --date=short
   ```

2. **Add a new section** at the top of this file (above previous days) with today's date

3. **Fill in the template** with:
   - Summary of the day's work
   - Each commit with details
   - Statistics
   - Key features added
   - Any notes or follow-ups

4. **Commit the summary** along with your code changes or as a separate commit


