# Tally Native App Map

## Overview
This document provides a visual map of the Tally Native application structure, navigation flow, and feature organization for the product team.

---

## High-Level App Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    TALLY NATIVE APP                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
   ┌────▼────┐                            ┌─────▼─────┐
   │  AUTH   │                            │   MAIN    │
   │ Navigator│                            │ Navigator │
   └────┬────┘                            └─────┬─────┘
        │                                       │
   ┌────▼───────────────────────────────────────▼────┐
   │         DRAWER NAVIGATOR (AppNavigator)          │
   │  ┌──────────────────────────────────────────┐   │
   │  │  Primary Entry: TRANSACTIONS              │   │
   │  └──────────────────────────────────────────┘   │
   │  ┌──────────────────────────────────────────┐   │
   │  │  Category-Based Navigation                 │   │
   │  │  • Finance                                 │   │
   │  │  • Operations                              │   │
   │  │  • Marketing                               │   │
   │  │  • People                                  │   │
   │  │  • Tally Network                           │   │
   │  │  • Settings                                │   │
   │  └──────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────┘
```

---

## Navigation Hierarchy

### Level 1: Drawer Navigator
The main navigation container with two primary entry points:

1. **TRANSACTIONS** (Primary Entry Point)
   - Direct access from drawer
   - Independent navigation stack

2. **MainTabs** (Category-Based)
   - Dynamic bottom tabs based on selected category
   - Each category shows different tabs

### Level 2: Category Selection
When a category is selected from the drawer, the bottom tab navigator dynamically changes:

```
Drawer Category Selected
         │
         ├─► Finance
         │   └─► Tabs: Health | Reporting Ready | Reports | Compliance
         │
         ├─► Operations  
         │   └─► Tabs: Control Room | Inventory | Production | Point of Sale
         │
         ├─► Marketing
         │   └─► Tabs: Web | Email | Social
         │
         ├─► People
         │   └─► Tabs: Payroll | Team | Talent
         │
         ├─► Tally Network
         │   └─► Tabs: Suppliers | Financial Services | Commerce Graph
         │
         └─► Settings
             └─► Tabs: Plan | Accounts | VAT Status | Units | Users
```

### Level 3: Stack Navigators
Each tab typically contains a stack navigator with multiple screens:

```
Tab Selected
    │
    ├─► HomeNavigator (Health tab)
    │   ├─► HomeMain (Dashboard)
    │   ├─► ControlCompliance
    │   ├─► RevenueGrowth
    │   ├─► CashFlow
    │   ├─► NetProfit
    │   ├─► CurrentRatio
    │   └─► Insights
    │
    ├─► TransactionsNavigator (Standalone)
    │   ├─► TransactionsHome (Bottom tabs)
    │   │   ├─► Sales
    │   │   ├─► Purchases
    │   │   ├─► Payroll
    │   │   ├─► Other
    │   │   └─► Statements
    │   ├─► AddTransaction
    │   ├─► TransactionDetail
    │   ├─► SalesPipeline
    │   └─► [More transaction screens...]
    │
    └─► ReportsNavigator
        ├─► ReportsHome
        ├─► CashflowReport
        ├─► ProfitLossReport
        ├─► BalanceSheetReport
        └─► AccountLedger
```

---

## Category Breakdown

### 1. FINANCE
**Purpose**: Financial health monitoring, transaction management, reporting, and tax compliance

**Bottom Tabs**:
- **Health**: Business health dashboard with KPIs
- **Reporting Ready**: Transactions ready for reporting
- **Reports**: Financial reports (P&L, Cashflow, Balance Sheet)
- **Compliance**: Tax compliance and VAT management

**Key Screens**:
- HomeScreen (Health dashboard)
- RevenueGrowthScreen
- CashFlowScreen
- NetProfitScreen
- CurrentRatioScreen
- ControlComplianceScreen
- InsightsScreen
- ReportsScreen
- CashflowReportScreen
- ProfitLossReportScreen
- BalanceSheetReportScreen
- AccountLedgerScreen
- TaxesComplianceScreen
- VATScreen
- YearEndReportingScreen

---

### 2. OPERATIONS
**Purpose**: Inventory management, production, and point-of-sale operations

**Bottom Tabs**:
- **Control Room**: Operations oversight and alerts
- **Inventory**: Track items, stock levels, packaging
- **Production**: Product creation and manufacturing
- **Point of Sale**: POS system for sales

**Key Screens**:
- HelpScreen (Control Room)
- InventoryManagementScreen
- InventoryViewAllScreen
- InventoryItemDetailScreen
- PendingOrdersScreen
- PrepareOrdersScreen
- StockTakeScreen
- ManageStockScreen
- EditPackagingScreen
- ProductionManagementScreen
- CreateProductScreen
- ProductDetailScreen
- ManufactureScreen
- SkusScreen
- CreateSkuScreen
- PointOfSaleScreen
- POSManagementScreen
- POSEditItemsScreen
- POSEditItemScreen
- AddOneOffItemScreen

**Special Navigation**:
- Sales (from drawer, under Operations) → SalesPipelineScreen

---

### 3. MARKETING
**Purpose**: Online sales channels, email marketing, and social booking

**Bottom Tabs**:
- **Web**: Online sales platform
- **Email**: Email marketing management
- **Social**: Online booking and social integration

**Key Screens**:
- OnlineSalesScreen
- EmailScreen
- OnlineBookingScreen

---

### 4. PEOPLE
**Purpose**: Human resources, payroll, team management, and talent acquisition

**Bottom Tabs**:
- **Payroll**: Employee payroll processing
- **Team**: Team management
- **Talent**: Talent acquisition and management

**Key Screens**:
- PayrollScreen
- TeamScreen
- TalentScreen
- EmployeeManagementScreen
- TimeManagementScreen
- ExpensesScreen

---

### 5. TALLY NETWORK
**Purpose**: Supplier network, financial services, and commerce connections

**Bottom Tabs**:
- **Suppliers**: Supplier network and management
- **Financial Services**: Financing options (invoice financing, loans)
- **Commerce Graph**: Business network visualization

**Key Screens**:
- SuppliersScreen
- FinancialServicesScreen
- InvoiceFinancingScreen
- CommerceGraphScreen
- TallyNetworkScreen

---

### 6. SETTINGS
**Purpose**: Account management, subscription, and configuration

**Bottom Tabs**:
- **Plan**: Subscription and plan management
- **Accounts**: Bank and payment account management
- **VAT Status**: VAT configuration
- **Units**: Unit of measurement settings
- **Users**: User management

**Key Screens**:
- SettingsPlanScreen
- SettingsAccountsScreen
- SettingsVATStatusScreen
- SettingsUnitsScreen
- SettingsUsersScreen
- PlansSelectionScreen
- PaymentScreen
- ProfileScreen

---

## Standalone Navigation: TRANSACTIONS

**Access**: Direct from drawer (primary entry point)

**Structure**:
```
TransactionsNavigator
    │
    └─► TransactionsBottomNavigator (Home)
        ├─► Sales Tab
        ├─► Purchases Tab
        ├─► Payroll Tab
        ├─► Other Tab
        └─► Statements Tab
    │
    ├─► AddTransaction
    ├─► ManualPurchaseEntry
    ├─► CreateInvoice
    ├─► SalesPipeline
    ├─► AddCustomer
    ├─► TransactionList
    ├─► TransactionDetail
    ├─► ScaffoldViewAll
    ├─► BankStatementRuleDetail
    ├─► BankStatementRuleCreate
    ├─► BankStatementRules
    ├─► CreditCardRuleDetail
    ├─► CreditCardRuleCreate
    ├─► UploadProcessing
    ├─► ManageStock
    └─► EditPackaging
```

---

## Additional Drawer Screens

These screens are accessible directly from the drawer (not part of category tabs):

- Test
- FirestoreTest
- All Inventory screens (when navigated from transactions)
- All Production screens (when navigated from inventory)
- All POS screens (when navigated from operations)
- OversightChat
- InsightChat
- Invoicing
- [Many more context-specific screens...]

---

## Key User Flows

### Flow 1: Add a Purchase Transaction
```
Drawer → TRANSACTIONS
    → TransactionsBottomNavigator → Purchases Tab
    → AddTransaction
    → [Upload receipt/PDF or Manual Entry]
    → TransactionDetail (if auto-categorized)
    → ManageStock (if inventory item)
```

### Flow 2: Create and Manufacture a Product
```
Drawer → Operations Category
    → Production Tab
    → ProductionManagementScreen
    → CreateProduct
    → ProductDetail
    → Manufacture
```

### Flow 3: View Financial Health
```
Drawer → Finance Category
    → Health Tab
    → HomeScreen (Dashboard)
    → [Select KPI Card]
    → RevenueGrowth / CashFlow / NetProfit / etc.
```

### Flow 4: Generate Financial Report
```
Drawer → Finance Category
    → Reports Tab
    → ReportsScreen
    → [Select Report Type]
    → CashflowReport / ProfitLossReport / BalanceSheetReport
```

---

## Screen Count Summary

- **Total Screens**: ~90+ screens
- **Navigation Levels**: 3-4 levels deep
- **Categories**: 6 main categories
- **Standalone Modules**: Transactions (primary entry point)

---

## Notes for Product Team

1. **Dynamic Navigation**: Bottom tabs change based on drawer category selection
2. **Primary Entry**: TRANSACTIONS is the main entry point, accessible directly from drawer
3. **Context-Aware**: Many screens are accessible from multiple entry points (e.g., inventory from operations or transactions)
4. **Stack-Based**: Most navigation uses stack navigators, allowing back navigation
5. **Drawer Access**: Many screens can be accessed directly from drawer for deep linking

---

*This is the initial version. We'll refine and expand this map step by step.*

