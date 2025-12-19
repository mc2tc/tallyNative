# Additional Modules Drawer Structure

## Overview
The mobile app includes a drawer navigation (accessible via the More Vert icon in the App Bar) that organizes premium/additional modules into logical groups. The drawer is titled "Additional Modules" and contains 5 main groups.

## Drawer Groups and Items

### 1. Operations
Core business operations and inventory management:
- **Inventory** → Route: `InventoryManagement`
- **Production** → Route: `ProductionManagement`
- **Point of Sale** → Route: `PointOfSale`

### 2. Sales & Marketing
Customer acquisition and sales management:
- **CRM & Invoicing** → Routes: `MainTabs` (defaults to SalesPipeline) or `Invoicing`
- **Online Sales** → Route: `OnlineSales`
- **Online Booking** → Route: `OnlineBooking`

### 3. People
Human resources and workforce management:
- **Payroll** → Route: `Payroll`
- **Expense Management** → Route: `Expenses`
- **Time Management** → Route: `TimeManagement`

### 4. Tally Network
Supplier network and financial services:
- **Suppliers** → Route: `Suppliers`
- **Financial Services** → Route: `FinancialServices`

### 5. Tax & Compliance
Regulatory compliance and reporting:
- **VAT** → Route: `VAT`
- **Year End Reporting** → Route: `YearEndReporting`

## Notes
- All modules are premium/additional features beyond the core accounting & bookkeeping functionality
- Navigation routes are defined in `AppDrawerParamList` type in `navigation/AppNavigator.tsx`
- The drawer uses React Native Paper's Drawer component with custom styling
- Route names should match exactly between frontend navigation and any backend route references
