# API Endpoints Usage

This document categorizes all API endpoints in the tallyNative codebase by how they are used:
- **(i)** Called from user interaction (button press, form submit, etc.)
- **(ii)** Called in background (screen load, useEffect, useFocusEffect)
- **(iii)** Not called (defined but never invoked)

---

## (i) Called from User Interaction

These endpoints are triggered by explicit user actions (button press, form submit, menu action, etc.).

| Endpoint | Method | Trigger |
|----------|--------|---------|
| `/api/auth/bootstrap-owner` | POST | Sign up form submit |
| `/api/auth/invites/:id/accept` | POST | Accept invite form submit |
| `/api/auth/claims/refresh` | POST | Part of sign-in/refresh flow |
| `/api/business-context` | POST | Save business context (onboarding, settings) |
| `/api/business-context/vat-status` | PATCH | Save VAT status in settings |
| `/api/businesses/:id/bank-accounts` | POST | Add bank account |
| `/api/businesses/:id/credit-cards` | POST | Add credit card |
| `/api/businesses/:id/subscription/confirm-payment` | POST | Confirm payment on PaymentScreen |
| `/api/businesses/:id/customers` | POST | Create customer |
| `/authenticated/transactions2/api/bank-statements/rules` | POST | Create bank statement rule |
| `/authenticated/transactions2/api/bank-statements/rules/:id` | PATCH | Update bank statement rule |
| `/authenticated/transactions2/api/credit-card-statements/rules` | POST | Create credit card rule |
| `/authenticated/transactions2/api/credit-card-statements/rules/:id` | PATCH | Update credit card rule |
| `/authenticated/transactions2/api/actions/reconcile-clicked` | POST | Reconcile button in ScaffoldViewAllScreen |
| `/authenticated/transactions3/api/sales/manual` | POST | Create invoice form submit |
| `/authenticated/transactions3/api/transactions/:id/verify` | PATCH | Verify transaction |
| `/authenticated/transactions3/api/transactions/:id` | PATCH | Update verified purchase (item list, payment method) |
| `/authenticated/transactions3/api/transactions/:id/mark-paid` | PATCH | Mark invoice as paid |
| `/authenticated/transactions3/api/sales/:id/generate-pdf` | POST | Generate invoice PDF |
| `/authenticated/transactions3/api/inventory-items` | POST | Save inventory items on verify |
| `/authenticated/transactions3/api/purchases/manual` | POST | Manual purchase entry form submit |
| `/authenticated/transactions3/api/purchases/ocr` | POST | Receipt OCR (after user selects file) |
| `/authenticated/transactions3/api/sales/ocr` | POST | Sales invoice OCR (after user selects file) |
| `/authenticated/transactions3/api/bank-statements/upload` | POST | Bank statement upload (after user selects file) |
| `/authenticated/transactions3/api/credit-card-statements/upload` | POST | Credit card statement upload (after user selects file) |
| `/authenticated/transactions2/api/transactions` | POST | Fallback create transaction (UploadProcessingScreen) |
| `/authenticated/transactions3/api/reconcile/bank` | POST | Reconcile bank / credit card button |
| `/authenticated/transactions3/api/sales/pos` | POST | POS confirm payment |
| `/authenticated/transactions3/api/inventory-items/:id` | PATCH | Mark item as received |
| `/authenticated/transactions3/api/inventory-items/group` | POST | Group items (drag-drop) |
| `/authenticated/transactions3/api/inventory-items/stock-take` | POST | Submit stock take |
| `/authenticated/transactions3/api/inventory-items/re-order` | POST | Add re-order |
| `/authenticated/transactions3/api/inventory-items/:id/pos-product` | PATCH | Save POS product name/price |
| `/authenticated/transactions3/api/products` | POST | Create product |
| `/authenticated/transactions3/api/products/:id` | PATCH | Update product |
| `/authenticated/transactions3/api/products/:id/manufacture` | POST | Manufacture product |
| `/authenticated/transactions3/api/products/:id/skus` | POST | Save SKUs |
| `/authenticated/transactions3/api/products/:id/skus/:id/add-stock` | POST | Add stock to SKU |
| `/authenticated/transactions3/api/compliance/alerts/:id/dismiss` | POST | Dismiss compliance alert |
| `/authenticated/transactions3/api/operational/alerts/:id/dismiss` | POST | Dismiss operational alert |
| `/api/oversight/alerts/:id/dismiss` | POST | Dismiss oversight alert |

---

## (ii) Called in Background (Screen Load, Focus, etc.)

These endpoints run on mount, focus, or as part of data load/refresh, not directly from a user tap.

| Endpoint | Method | Trigger |
|----------|--------|---------|
| `/api/business-context` | GET | Load context on settings / form screens |
| `/api/business-context/vat-status` | GET | Load VAT status on settings screens |
| `/api/businesses/:id/bank-accounts` | GET | Load bank accounts (Statements, Settings, Accounts) |
| `/api/businesses/:id/credit-cards` | GET | Load credit cards (Statements, Settings, Accounts) |
| `/api/businesses/:id/chart-accounts` | GET | Load chart accounts for reports and forms |
| `/api/businesses/:id/cashflow-statement` | GET | Load cashflow on Reports and Cashflow screens |
| `/api/businesses/:id/customers` | GET | Load customers on AddCustomer, SalesPipeline |
| `/api/businesses/:id/payment-methods` | GET | Load payment methods on TransactionDetail (mount + picker) |
| `/api/businesses/:id/metadata/plan` | GET | Load current plan (PlansSelection, SettingsPlan, Settings) |
| `/api/oversight/check` | POST | Check oversight (OversightAlertsCard) |
| `/api/oversight/alerts` | GET | Load oversight alerts (OversightAlertsCard, OversightAlertsInitializer) |
| `/authenticated/transactions2/api/bank-statements/rules` | GET | Load bank rules on BankStatementRulesListScreen |
| `/authenticated/transactions3/api/transactions` | GET | Load transactions (various screens) |
| `/authenticated/transactions3/api/transactions/:id` | GET | Load single transaction (TransactionDetail, ManageStock, CreateInvoice) |
| `/authenticated/transactions3/api/kpis` | GET | Load health score (Home, CurrentRatio, RevenueGrowth, CashFlow, NetProfit) |
| `/authenticated/transactions3/api/kpis/insights` | POST | Load insights (MotivationalCard, InsightsScreen) |
| `/authenticated/transactions3/api/inventory-items` | GET | Load inventory items (Inventory, POS, Production, etc.) |
| `/authenticated/transactions3/api/products` | GET | Load products (CreateInvoice, POS, Production, Manufacture) |
| `/authenticated/transactions3/api/products/:id/skus` | GET | Load product SKUs (CreateInvoice, POS, CreateSku, SkusScreen) |
| `/authenticated/transactions3/api/packaging/extract` | POST | Extract packaging on ManageStock (mount + focus) |
| `/authenticated/transactions3/api/compliance/check` | POST | Check compliance (ComplianceAlertsCard) |
| `/authenticated/transactions3/api/compliance/alerts` | GET | Load compliance alerts |
| `/authenticated/transactions3/api/operational/check` | POST | Check operational (OperationalAlertsCard) |
| `/authenticated/transactions3/api/operational/alerts` | GET | Load operational alerts |

---

## (iii) Not Called

These API functions/endpoints are defined in the codebase but never invoked.

| Endpoint | Method | API Module |
|----------|--------|------------|
| `/api/auth/businesses` | POST | authApi.createBusiness |
| `/api/auth/invites` | POST | authApi.createInvite |
| `/api/businesses/:id/metadata/plan` | POST | plansApi.updatePlan |
| `/authenticated/transactions2/api/credit-card-statements/rules` | GET | creditCardRulesApi.getRules |
| `/authenticated/transactions2/api/receipts` | POST | transactions2Api.processReceipt |
| `/authenticated/transactions2/api/transactions/:id` | PATCH | transactions2Api.updateItemDebitAccount |
| `/authenticated/transactions2/api/transactions/:id` | PATCH | transactions2Api.updatePaymentMethod |
| `/authenticated/transactions3/api/transactions/:id` | PATCH | transactions2Api.splitExpenseItem |
| `/authenticated/transactions3/api/transactions/:id` | PATCH | transactions2Api.unsplitExpenseItem |
| `/api/oversight/alerts/:id` | GET | oversightApi.getAlertDetails |
| `/authenticated/transactions3/api/compliance/alerts/:id` | GET | complianceApi.getAlertDetails |
| `/authenticated/transactions3/api/operational/alerts/:id` | GET | operationalApi.getAlertDetails |

---

## Notes

1. **UploadProcessingScreen**: `createPurchaseOcr`, `createSalesInvoiceOcr`, `uploadBankStatement`, `uploadCreditCardStatement`, and `createTransaction` run inside a `useEffect` after the user has selected a file—categorized as user-initiated since they follow an explicit file selection.

2. **TransactionDetailScreen** uses `verifyTransaction` and `updateTransactions3VerifiedPurchase` to apply item and payment method edits in a single call; the legacy `updateItemDebitAccount` and `updatePaymentMethod` endpoints are unused.

3. **creditCardRulesApi.getRules** is never called; there is no CreditCardRulesListScreen equivalent to the bank rules flow.

4. **plansApi.updatePlan** is never called; the "Update plan" button only navigates to PlansSelectionScreen.

5. **authApi.createBusiness** and **authApi.createInvite** are defined for onboarding/invite flows but have no current callers.
