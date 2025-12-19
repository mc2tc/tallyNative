# Daily Development Summaries

## 2025-12-19

### Summary
Reorganized drawer navigation into logical categories, implemented comprehensive usage tracking system, and added multiple new premium module screens. Restructured drawer from flat list to categorized sections (Operations, Sales & Marketing, People, Tally Network, Tax & Compliance) for better organization. Implemented usage tracking hooks and API integration for module access tracking and transaction creation tracking. Added new premium module screens: Expenses, Invoicing, Payment, Payroll, Plans Selection, Suppliers, Time Management, VAT, and Year End Reporting. Enhanced Settings screen with plans selection functionality and module management. Updated Sales Pipeline screen with improved functionality and better user experience. Created comprehensive backend documentation for usage tracking implementation, drawer structure, and plans display.

### Commits

#### 1. feat: Reorganize drawer with categories, add usage tracking, and implement new premium modules
**Commit:** `d8d5ed1`  
**Files Changed:** 40 files, 3820 insertions(+), 147 deletions(-)

**Changes:**
- Reorganized drawer navigation into logical categories:
  - Operations: Inventory, Production, Point of Sale
  - Sales & Marketing: CRM, Invoicing, Online Sales, Online Booking
  - People: Payroll, Expenses, Time Management
  - Tally Network: Suppliers, Financial Services
  - Tax & Compliance: VAT, Year End Reporting
  - Changed drawer title from "Premium Modules" to "Additional Modules"
  - Added section headers with custom styling for better visual hierarchy
  - Updated drawer item styling with consistent grayscale design
- Implemented usage tracking system:
  - Created `useModuleTracking` hook for automatic module access tracking
  - Created `useModuleGroupTracking` hook for category-level tracking
  - Added `track-module-access` API endpoint integration
  - Automatic tracking on screen mount for all premium modules
  - Silent error handling to prevent interruption of user experience
  - Transaction creation tracking already handled by backend automatically
- Added new premium module screens:
  - ExpensesScreen - Employee expense tracking and management
  - InvoicingScreen - Invoice creation and management
  - PaymentScreen - Payment processing and management (393 lines)
  - PayrollScreen - Employee payroll processing
  - PlansSelectionScreen - Subscription plan selection and management (288 lines)
  - SuppliersScreen - Supplier network and management
  - TimeManagementScreen - Employee time tracking and attendance
  - VATScreen - VAT management and reporting
  - YearEndReportingScreen - Year-end financial reporting
  - All screens follow wireframe grayscale design pattern
- Enhanced Settings screen:
  - Added plans selection functionality with plan display and selection
  - Integrated plans API client for fetching available plans
  - Added plan pricing display with proper formatting
  - Module management and organization improvements
  - Better integration with SettingsNavigator
- Updated Sales Pipeline screen:
  - Improved functionality and user experience
  - Enhanced transaction handling and display
  - Better integration with navigation system
- Updated TransactionsScaffoldScreen:
  - Enhanced module tracking integration
  - Improved navigation and routing
  - Better handling of transaction workflows
- Created comprehensive backend documentation:
  - `RN_TEAM_USAGE_TRACKING_IMPLEMENTATION.md` - Complete guide for usage tracking (362 lines)
  - `USAGE_TRACKING_RN_INTEGRATION.md` - Integration guide for React Native team (332 lines)
  - `RN_PLANS_DISPLAY_AND_SELECTION.md` - Plans API and selection documentation (670 lines)
  - `ADDITIONAL_MODULES_DRAWER_STRUCTURE.md` - Drawer organization documentation (40 lines)
  - `RN_STORAGE_TRACKING_UPDATE.md` - Storage tracking updates (83 lines)
  - `drawer-organization-summary.md` - Drawer structure summary (40 lines)
  - `premium-modules-categorization.md` - Module categorization guide (164 lines)
- Created new API clients and hooks:
  - `lib/api/plans.ts` - Plans API client with getPlans and getPlanDetails methods (74 lines)
  - `lib/hooks/useModuleTracking.ts` - Module access tracking hook (32 lines)
  - `lib/hooks/useModuleGroupTracking.ts` - Module group tracking hook (31 lines)
- Updated navigation structure:
  - Created SettingsNavigator for settings-related screens
  - Added all new screens to AppNavigator
  - Updated DrawerContent with new category structure
  - Enhanced MainTabNavigator for better navigation flow
- Updated storage utilities:
  - Enhanced storage tracking functionality
  - Better error handling and data persistence

**Files Modified:**
- `navigation/DrawerContent.tsx` - Major reorganization with categories (167 lines updated)
- `screens/SettingsScreen.tsx` - Enhanced with plans selection (117 lines added)
- `screens/SalesPipelineScreen.tsx` - Improved functionality (212 lines updated)
- `screens/TransactionsScaffoldScreen.tsx` - Enhanced with tracking (160 lines updated)
- `navigation/AppNavigator.tsx` - Added all new routes (21 lines added)
- `navigation/SettingsNavigator.tsx` - New navigator for settings (new, 23 lines)
- `navigation/MainTabNavigator.tsx` - Updated navigation flow (16 lines updated)
- `lib/api/plans.ts` - New plans API client (new, 74 lines)
- `lib/hooks/useModuleTracking.ts` - New tracking hook (new, 32 lines)
- `lib/hooks/useModuleGroupTracking.ts` - New group tracking hook (new, 31 lines)
- `lib/api/transactions2.ts` - Added tracking support (8 lines added)
- `lib/utils/storage.ts` - Enhanced storage tracking (9 lines updated)
- `screens/PaymentScreen.tsx` - New payment screen (new, 393 lines)
- `screens/PlansSelectionScreen.tsx` - New plans selection screen (new, 288 lines)
- `screens/InvoicingScreen.tsx` - New invoicing screen (new, 138 lines)
- `screens/ExpensesScreen.tsx` - New expenses screen (new, 91 lines)
- `screens/PayrollScreen.tsx` - New payroll screen (new, 91 lines)
- `screens/SuppliersScreen.tsx` - New suppliers screen (new, 91 lines)
- `screens/TimeManagementScreen.tsx` - New time management screen (new, 91 lines)
- `screens/VATScreen.tsx` - New VAT screen (new, 80 lines)
- `screens/YearEndReportingScreen.tsx` - New year-end reporting screen (new, 91 lines)
- Multiple other screens - Added module tracking integration (2-4 lines each)
- 6 new documentation files in `docs/backend-requests/` and `docs/`

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 40 files
- **Total Lines Added:** 3820 insertions
- **Total Lines Removed:** 147 deletions
- **Net Change:** +3673 lines

### Key Features Added
1. Drawer reorganization into logical categories (Operations, Sales & Marketing, People, Tally Network, Tax & Compliance)
2. Comprehensive usage tracking system with automatic module access tracking
3. Nine new premium module screens (Expenses, Invoicing, Payment, Payroll, Plans Selection, Suppliers, Time Management, VAT, Year End Reporting)
4. Enhanced Settings screen with plans selection functionality
5. Plans API client for subscription management
6. Module tracking hooks for automatic usage tracking
7. SettingsNavigator for better settings navigation
8. Comprehensive backend documentation for usage tracking and drawer structure
9. Improved Sales Pipeline screen functionality
10. Enhanced TransactionsScaffoldScreen with tracking integration

### Notes
- Drawer reorganization improves navigation and discoverability of premium modules
- Usage tracking is automatic - modules track access on screen mount using hooks
- Transaction creation tracking is handled automatically by backend when calling transaction endpoints
- All new screens follow wireframe design guidelines (black, white, grayscale only)
- Plans selection screen provides full subscription management functionality
- Module tracking hooks use silent error handling to prevent interruption of user experience
- Backend documentation provides complete specifications for usage tracking implementation
- All TypeScript types properly defined and codebase passes type-checking
- New screens are ready for future feature implementation

---

## 2025-12-13

### Summary
Created landing pages for missing Premium Modules and fixed drawer styling issues. Added Work In Progress screens for Production Management, Employee Management, Online Sales, Online Booking, and Tally Network modules. Fixed drawer item purple background issue by removing invalid props, adding custom Paper theme, and implementing transparent background styling. Removed divider line from drawer section. All new screens follow consistent wireframe grayscale design pattern and are properly integrated into navigation.

### Commits

#### 1. feat: Add Premium Modules landing pages and fix drawer styling
**Commit:** `d1daade`  
**Files Changed:** 8 files, 472 insertions(+), 5 deletions(-)

**Changes:**
- Created WIP landing pages for missing Premium Modules:
  - ProductionManagementScreen - Production management module placeholder
  - EmployeeManagementScreen - Employee management module placeholder
  - OnlineSalesScreen - Online sales module placeholder
  - OnlineBookingScreen - Online booking module placeholder
  - TallyNetworkScreen - Tally Network module placeholder
  - All screens display "Work In Progress" message with module description
  - Consistent wireframe grayscale styling matching app design system
- Added all new screens to AppNavigator:
  - Added imports for all five new screens
  - Added routes to AppDrawerParamList type definition
  - Registered all screens as Drawer.Screen components
  - All drawer navigation items now have working routes
- Fixed drawer item styling to remove purple background:
  - Removed invalid `activeBackgroundColor` prop from Drawer.Item components (not supported by react-native-paper)
  - Added `style` prop with conditional transparent background for active items
  - Added `drawerActiveBackgroundColor: 'transparent'` to AppNavigator screenOptions
  - Created custom Paper theme in App.tsx to override default purple/violet colors
  - Set `rippleColor="#e0e0e0"` for grayscale press effect
- Removed divider line from Drawer.Section:
  - Added `showDivider={false}` prop to remove bottom divider line below Financial Services
- Added debug logging to DrawerContent:
  - Logs active route name, state index, and all route names
  - Logs item active states for troubleshooting
  - Logs navigation events when items are pressed

**Files Modified:**
- `screens/ProductionManagementScreen.tsx` - New WIP landing page (new, 67 lines)
- `screens/EmployeeManagementScreen.tsx` - New WIP landing page (new, 67 lines)
- `screens/OnlineSalesScreen.tsx` - New WIP landing page (new, 67 lines)
- `screens/OnlineBookingScreen.tsx` - New WIP landing page (new, 67 lines)
- `screens/TallyNetworkScreen.tsx` - New WIP landing page (new, 67 lines)
- `navigation/AppNavigator.tsx` - Added all new routes and screenOptions (updated, 25 lines added)
- `navigation/DrawerContent.tsx` - Fixed styling, removed divider, added logging (updated, 144 lines)
- `App.tsx` - Added custom Paper theme (updated, 20 lines)

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 8 files
- **Total Lines Added:** 472 insertions
- **Total Lines Removed:** 5 deletions
- **Net Change:** +467 lines

### Key Features Added
1. Production Management landing page with WIP message
2. Employee Management landing page with WIP message
3. Online Sales landing page with WIP message
4. Online Booking landing page with WIP message
5. Tally Network landing page with WIP message
6. All Premium Modules drawer items now have working navigation
7. Fixed purple background issue on active drawer items
8. Removed divider line from drawer section
9. Custom Paper theme to override default colors
10. Debug logging for drawer navigation troubleshooting

### Notes
- All new screens follow wireframe design guidelines (black, white, grayscale only)
- Screens are marked as "Work In Progress" and ready for future implementation
- Drawer item active state now has transparent background (no purple color)
- Press ripple effect uses grayscale (#e0e0e0) instead of default purple
- Custom Paper theme ensures consistent grayscale colors throughout app
- All TypeScript types properly defined and codebase passes type-checking
- Debug logs help identify active route detection issues if they occur

---

## 2025-12-12

### Summary
Implemented Sales Pipeline feature with Add Customer screen, autocomplete functionality, and comprehensive form validation. Created SalesPipelineScreen displaying 5-stage pipeline (Lead, In Conversation, Proposal/Quote Sent, Closed WON, Closed LOST), built AddCustomerScreen with customer name autocomplete, stage selector, project name, estimated project value, and source fields. Integrated react-native-autocomplete-input package for customer name suggestions, implemented conditional validation where project name and estimated project value are required for proposal/won/lost stages but optional for lead/conversation. Created customers API client with createCustomer and getCustomers endpoints, updated backend documentation for customer creation endpoint with all new fields, removed dummy customer data, and cleaned up UI by removing info icons from pipeline cards.

### Commits

#### 1. feat: Add Sales Pipeline with Add Customer screen and autocomplete
**Commit:** `23b47ba`  
**Files Changed:** 9 files, 1242 insertions(+), 40 deletions(-)

**Changes:**
- Created SalesPipelineScreen with 5-stage pipeline visualization:
  - Displays pipeline columns: Lead, In Conversation, Proposal / Quote Sent, Closed WON, Closed LOST
  - Each column shows up to 3 most recent sales leads with company name, project title, subtitle, and amount
  - Wireframe grayscale design consistent with app design system
  - Removed dummy customer data - now shows empty columns ready for API integration
  - Removed info icon from pipeline cards for cleaner UI
- Created AddCustomerScreen with comprehensive form:
  - Customer name input with autocomplete functionality using react-native-autocomplete-input package
  - Autocomplete shows suggestions from existing customers (fetches all customers once, filters locally)
  - Simple text input for customer name when stage is 'Lead' (no autocomplete)
  - Stage selector with bottom sheet modal (Lead, In Conversation, Proposal / Quote Sent, Closed WON, Closed LOST)
  - Project name field with conditional validation (optional for Lead/In Conversation, required otherwise)
  - Estimated Project Value field with numeric keyboard (optional for Lead/In Conversation, required otherwise)
  - Source field (optional, always)
  - Save button with loading state and validation
  - All fields properly styled with consistent input design
- Implemented conditional validation logic:
  - Customer name: Always required (red asterisk indicator)
  - Project name: Required for proposal/won/lost stages, optional for lead/conversation (shows "(optional)" or "*")
  - Estimated Project Value: Required for proposal/won/lost stages, optional for lead/conversation (shows "(optional)" or "*")
  - Source: Always optional
  - Save button disabled when required fields are missing
- Created customers API client (`lib/api/customers.ts`):
  - `getCustomers()` method to fetch customers with optional search and limit parameters
  - `createCustomer()` method to create new customers with name, stage, projectName, estimatedProjectValue, and source
  - Proper TypeScript types for Customer, CreateCustomerPayload, CustomersListResponse
- Integrated autocomplete package:
  - Installed react-native-autocomplete-input package
  - Implemented local filtering after fetching all customers (up to 100)
  - Proper touch handling with keyboardShouldPersistTaps for suggestion selection
  - Loading indicator while fetching customers
  - Styled suggestions list with proper shadows and borders
- Updated navigation:
  - Added SalesPipeline and AddCustomer routes to TransactionsNavigator
  - Linked CRM drawer item to Sales Pipeline screen
  - Added "+" icon to Sales Pipeline app bar that navigates to Add Customer screen
- Updated backend documentation:
  - Enhanced customer-creation-endpoint.md with all new fields (projectName, estimatedProjectValue, source)
  - Added validation rules for conditional requirements based on stage
  - Added example requests showing both minimal and full payloads
  - Added backend confirmation section requesting confirmation that all fields will be saved to Firestore
  - Created customers-list-endpoint.md documenting GET endpoint for autocomplete functionality

**Files Modified:**
- `screens/SalesPipelineScreen.tsx` - Created Sales Pipeline screen with 5-stage pipeline (new, 285 lines)
- `screens/AddCustomerScreen.tsx` - Created Add Customer screen with form and autocomplete (new, 670 lines)
- `lib/api/customers.ts` - Created customers API client (new, 61 lines)
- `navigation/TransactionsNavigator.tsx` - Added SalesPipeline and AddCustomer routes
- `navigation/DrawerContent.tsx` - Linked CRM drawer item to Sales Pipeline
- `package.json` - Added react-native-autocomplete-input dependency
- `docs/backend-requests/customer-creation-endpoint.md` - Updated with all new fields and validation rules (updated, 269 lines)
- `docs/backend-requests/customers-list-endpoint.md` - Created endpoint documentation for autocomplete (new, 208 lines)

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 9 files
- **Total Lines Added:** 1242 insertions
- **Total Lines Removed:** 40 deletions
- **Net Change:** +1202 lines

### Key Features Added
1. Sales Pipeline screen with 5-stage pipeline visualization (Lead, In Conversation, Proposal, Closed WON, Closed LOST)
2. Add Customer screen with comprehensive form fields
3. Customer name autocomplete using react-native-autocomplete-input package
4. Conditional validation for project name and estimated project value based on stage
5. Stage selector with bottom sheet modal matching MetricsCard design pattern
6. Customers API client with createCustomer and getCustomers methods
7. Local filtering for autocomplete suggestions (fetches all customers once, filters client-side)
8. Proper form validation with required field indicators
9. Backend documentation updated with all new fields and validation requirements
10. Navigation integration from CRM drawer to Sales Pipeline
11. Removed dummy customer data from Sales Pipeline screen
12. Cleaned up UI by removing info icons from pipeline cards

### Notes
- Autocomplete uses react-native-autocomplete-input package for reliable touch handling and suggestion display
- Customer name autocomplete is disabled when stage is 'Lead' (shows simple text input instead)
- Project name and estimated project value are conditionally required based on stage selection
- All form fields are properly validated before allowing save
- Backend needs to confirm that all fields (name, stage, projectName, estimatedProjectValue, source) will be saved to Firestore
- Sales Pipeline screen currently shows empty columns - ready for API integration to fetch real customer data
- Autocomplete fetches up to 100 customers and filters locally for better performance
- All TypeScript types properly defined and codebase passes type-checking

---

## 2025-12-11

### Summary
Implemented comprehensive Assistant screen with Security and Operations & Performance features. Created HelpScreen with intro card and two assistant cards, built OversightChatScreen and InsightChatScreen for detailed views, implemented OversightAlertsCard component with alert display and dismiss functionality, added AssistantInfoCard component for card-based navigation, created oversight API client, added AssistantContext for managing unread counts, updated MainTabNavigator to show combined unread count badge, added pull-to-refresh functionality, implemented OversightAlertsInitializer for app-level unread count updates, and added back navigation buttons. Updated card styling with darker grayscale and improved layout, and added comprehensive API documentation files for the oversight system. Integrated new cashflow statement API endpoint, replacing unreliable client-side classification with server-side proper categorization. Updated CashflowReportScreen and ReportsScreen to use dedicated cashflow endpoint, and added backend request documentation.

### Commits

#### 1. Integrate new cashflow statement API endpoint
**Commit:** `21caa8b`  
**Files Changed:** 5 files, 812 insertions(+), 302 deletions(-)

**Changes:**
- Added cashflow statement API integration:
  - Created TypeScript types for `CashflowStatementResponse`, `CashflowActivity`, and `CashflowAccountDetail`
  - Added `getCashflowStatement()` function to chartAccounts API client
  - Supports optional query parameters: `startDate`, `endDate`, and `includeDetails`
  - Endpoint: `GET /api/businesses/{businessId}/cashflow-statement`
- Updated CashflowReportScreen:
  - Removed unreliable client-side cashflow classification logic (keyword matching)
  - Now fetches data directly from dedicated cashflow statement endpoint
  - Uses structured response with `operating`, `investing`, `financing` activities
  - Each activity includes `inflows`, `outflows`, and `net` values
  - Displays revenue and cash flow ratio from API response
  - Simplified code by removing complex classification calculations
- Updated ReportsScreen:
  - Added separate state and fetch function for cashflow data
  - Cashflow card now uses values from dedicated endpoint instead of calculating from chart accounts
  - Shows accurate operating, investing, and financing subtotals
  - Net cash flow calculated from API response
- Added backend request documentation:
  - `docs/backend-requests/cashflow-report-endpoint.md` - Initial request document for cashflow endpoint
  - `docs/backend-requests/CASHFLOW_STATEMENT_RN_NOTE.md` - Backend team's implementation notes and API specification

**Files Modified:**
- `lib/api/chartAccounts.ts` - Added cashflow statement types and API function (new types and function)
- `screens/CashflowReportScreen.tsx` - Complete refactor to use new endpoint (removed ~180 lines of classification logic, added ~50 lines of API integration)
- `screens/ReportsScreen.tsx` - Updated to fetch cashflow from new endpoint (added cashflow state and fetch function)
- `docs/backend-requests/cashflow-report-endpoint.md` - New backend request document (new, 335 lines)
- `docs/backend-requests/CASHFLOW_STATEMENT_RN_NOTE.md` - Backend implementation notes (new, 335 lines)

---

#### 2. feat: Implement Assistant screen with Security and Operations & Performance features
**Commit:** `cf49aef`  
**Files Changed:** 19 files, 1922 insertions(+), 26 deletions(-)

**Changes:**
- Created HelpScreen with intro card and two assistant cards:
  - Intro card explaining assistant purpose as "right hand" providing security protection and operational guidance
  - Security card with "View alerts" action linking to OversightChatScreen
  - Operations & Performance card with "Get insights" action linking to InsightChatScreen
  - Both cards display unread count badges and have darker grayscale styling
  - Added pull-to-refresh functionality that calls oversight API check and updates unread counts
- Created OversightChatScreen for Security detailed view:
  - Displays OversightAlertsCard showing security alerts with severity, unread status, and dismiss functionality
  - Shows Security Assistant chatbot card below alerts
  - 50/50 vertical split layout with scrollable sections
  - Back button navigation to HelpScreen
- Created InsightChatScreen for Operations & Performance detailed view:
  - Displays Operations & Performance Assistant chatbot card
  - Back button navigation to HelpScreen
  - Added bottom padding for better spacing
- Implemented OversightAlertsCard component:
  - Fetches and displays oversight alerts with severity indicators (critical, warning, info)
  - Shows alert details: rule name, message, detected date, unread status
  - Implements "Got it" dismiss button that calls dismissAlert API
  - Updates global unread count via AssistantContext
  - Handles loading, error, and empty states
  - Supports pull-to-refresh with oversight API check
  - Uses detectedAt or createdAt for date display with robust formatting
  - Exposes refresh method via useImperativeHandle for parent components
- Created AssistantInfoCard component:
  - Reusable card component for displaying assistant features
  - Shows title, description, unread count badge, and action button
  - Customizable action text (defaults to "Open")
  - Darker grayscale styling for bottom cards
  - Separator line between title and description
  - "View details" button positioned at bottom right
- Created oversight API client (`lib/api/oversight.ts`):
  - `check()` method to trigger new oversight evaluation
  - `getAlerts()` method to fetch alerts with filters (unread, severity, limit, page, status)
  - `getAlertDetails()` method to retrieve details for specific alert
  - `dismissAlert()` method to mark alert as resolved
- Created AssistantContext (`lib/context/OversightAlertsContext.tsx`):
  - Manages unread counts for both oversight and insight assistant types
  - Provides `oversightUnreadCount`, `setOversightUnreadCount`, `insightUnreadCount`, `setInsightUnreadCount`
  - Includes legacy support for `unreadCount` and `setUnreadCount` (maps to oversight)
  - Exports `useAssistant()` hook for combined access
- Created OversightAlertsInitializer component:
  - Fetches initial oversight unread count when app starts
  - Updates AssistantContext to ensure badge displays on app launch
  - Runs when user is authenticated and businessId is available
- Updated MainTabNavigator:
  - Changed Help tab icon from 'help-outline' to 'face-retouching-natural' (chatbot icon)
  - Uses `useAssistant()` hook to retrieve both unread counts
  - Calculates `totalUnreadCount = oversightUnreadCount + insightUnreadCount`
  - Sets `tabBarBadge` on Help tab to show combined unread count (only if > 0)
  - Custom badge styling with red background
- Updated navigation:
  - Added OversightChat and InsightChat routes to AppNavigator
  - Integrated screens into DrawerNavigator
  - Added back button navigation from detail screens to HelpScreen
- Enhanced ChatbotCard component:
  - Made `title` and `initialMessages` configurable via props
  - Fixed tabBarHeight calculation to prevent errors when used outside BottomTabNavigator
  - Updated cardStyle to support flex: 1 height within constrained containers
- Added comprehensive API documentation:
  - `MICRO_BUSINESS_OVERSIGHT_SYSTEM.md` - Background and core philosophy of oversight system
  - `RN_TESTING_READY.md` - Backend API readiness for React Native testing with authentication, authorization, error handling, and example API calls
  - `OVERSIGHT_ALERTS_DATE_FORMAT.md` - Date format specifications for alerts
- Updated type definitions:
  - Added `OversightCheckRequest`, `OversightCheckResponse` types
  - Added `OversightAlert` type with `status`, `resolvedAt`, `resolvedBy`, `detectedAt` fields
  - Added `OversightAlertsResponse` with `message` field
  - Added `OversightAlertDismissResponse` type
  - Made date fields flexible to handle various date types (ISO strings, timestamps, Firestore timestamps)

**Files Modified:**
- `screens/HelpScreen.tsx` - Complete redesign with intro card and two assistant cards (150 lines updated)
- `screens/OversightChatScreen.tsx` - New Security detail screen (new, 77 lines)
- `screens/InsightChatScreen.tsx` - New Operations & Performance detail screen (new, 33 lines)
- `components/OversightAlertsCard.tsx` - New alert display component (new, 525 lines)
- `components/AssistantInfoCard.tsx` - New reusable card component (new, 132 lines)
- `components/OversightAlertsInitializer.tsx` - New initializer component (new, 53 lines)
- `lib/api/oversight.ts` - New oversight API client (new, 94 lines)
- `lib/context/OversightAlertsContext.tsx` - New context for unread counts (new, 51 lines)
- `lib/hooks/useSafeTabBarHeight.ts` - New hook for safe tab bar height (new, 28 lines)
- `lib/types/api.ts` - Added oversight-related types (71 lines added)
- `navigation/AppNavigator.tsx` - Added new routes (6 lines added)
- `navigation/MainTabNavigator.tsx` - Updated Help tab icon and badge (23 lines updated)
- `navigation/RootNavigator.tsx` - Integrated OversightAlertsInitializer (3 lines added)
- `components/ChatbotCard.tsx` - Made configurable for both assistant types (28 lines updated)
- `App.tsx` - Minor updates (5 lines updated)
- `components/MotivationalCard.tsx` - Minor updates (4 lines updated)
- `docs/api/MICRO_BUSINESS_OVERSIGHT_SYSTEM.md` - New documentation (new, 446 lines)
- `docs/api/RN_TESTING_READY.md` - New API documentation (new, 170 lines)
- `docs/api/OVERSIGHT_ALERTS_DATE_FORMAT.md` - New date format documentation (new, 49 lines)

---

### Statistics
- **Total Commits:** 2
- **Total Files Changed:** 24 files
- **Total Lines Added:** 2734 insertions
- **Total Lines Removed:** 328 deletions
- **Net Change:** +2406 lines

### Key Features Added
1. HelpScreen with intro card and two assistant feature cards (Security, Operations & Performance)
2. OversightChatScreen for detailed Security alerts and chatbot interaction
3. InsightChatScreen for Operations & Performance chatbot interaction
4. OversightAlertsCard component with full alert display, dismiss, and refresh functionality
5. AssistantInfoCard reusable component for card-based navigation
6. Oversight API client with check, getAlerts, getAlertDetails, and dismissAlert methods
7. AssistantContext for managing unread counts for both assistant types
8. Combined unread count badge on Help tab in bottom navigation
9. Pull-to-refresh functionality on HelpScreen that triggers oversight API check
10. OversightAlertsInitializer for app-level unread count initialization
11. Back navigation buttons on detail screens
12. Darker grayscale styling for assistant cards
13. Comprehensive API documentation for oversight system
14. Cashflow statement API integration with dedicated endpoint
15. Proper server-side cashflow categorization (operating, investing, financing)
16. Accurate cashflow inflows/outflows distinction from transaction analysis
17. Cashflow card on ReportsScreen showing three activity subtotals

### Notes
- Security card focuses on fraud, theft, and security risk detection
- Operations & Performance card focuses on actionable recommendations for inventory, costs, and cash flow
- Unread counts are fetched on app launch via OversightAlertsInitializer to ensure badge displays immediately
- Pull-to-refresh on HelpScreen triggers oversight API check to look for new issues, then updates unread counts
- Alert dates use `detectedAt` field (or fallback to `createdAt`) with robust formatting handling various date types
- OversightAlertsCard prevents duplicate API calls using isLoadingRef
- ChatbotCard is now reusable for both Security and Operations & Performance contexts
- All TypeScript types properly defined and codebase passes type-checking
- Backend API documentation provides complete specifications for oversight system integration
- Cashflow statement now uses proper server-side classification instead of unreliable client-side keyword matching
- Cashflow endpoint defaults to current UK tax year if no dates provided
- Cashflow data includes revenue for cash flow ratio calculation
- Removed ~180 lines of complex client-side cashflow classification logic
- CashflowReportScreen structure matches image specification with proper hierarchy and formatting

---

## 2025-12-10

### Summary
Integrated POS sales into the Sales section of TransactionsScaffoldScreen, splitting the "All done" card into separate "POS Sales" and "Sales Invoices" cards below the Audit Ready separator. Added source parameter support to transactions3 API for filtering POS sales, updated Sales section data fetching to include POS sales from transactions3, and fixed TypeScript errors. Added comprehensive backend documentation for POS sales querying requirements and implementation.

### Commits

#### 1. feat: Add POS sales integration, invoice PDF generation, and Sales section enhancements
**Commit:** `ff608be`  
**Files Changed:** 19 files, 3750 insertions(+), 99 deletions(-)

**Changes:**
- Integrated POS sales into Sales section of TransactionsScaffoldScreen:
  - Added `isPOSSaleTransaction` helper function to identify POS sales by `metadata.capture.source === 'pos_one_off_item'`
  - Added `transactions3POSSales` state to store POS sales fetched from transactions3
  - Updated Sales section to fetch POS sales from transactions3 `source_of_truth` collection with `kind=sale` and `source=pos_one_off_item` filters
  - Split "All done" card into two separate cards:
    - "POS Sales": Shows audit-ready POS transactions (automatically verified)
    - "Sales Invoices": Shows reconciled regular sales invoices (excluding POS sales)
  - Updated "Audit Ready" separator to appear once before "POS Sales" card
  - Updated `getFullTransactions` function to handle "POS Sales" and "Sales Invoices" card titles
  - Updated both `useFocusEffect` and `onRefresh` handlers to fetch POS sales when Sales section is active
- Enhanced transactions3 API with source parameter support:
  - Added `source?: string` parameter to `getTransactions3` options
  - Passes `source` query parameter to backend API for filtering by `metadata.capture.source`
  - Enables backend filtering of POS sales (`source=pos_one_off_item`) for better performance
- Fixed TypeScript errors:
  - Fixed duplicate `totalLabel` style property in PointOfSaleScreen by renaming first occurrence to `totalLabelSmall`
  - Fixed navigation type issue in ScaffoldViewAllScreen by simplifying navigation type to `StackNavigationProp<TransactionsStackParamList>`
- Added comprehensive backend documentation:
  - Created `POS_SALES_QUERYING_BACKEND_REQUIREMENTS.md` with API endpoint specifications and filtering requirements
  - Created `POS_SALES_QUERYING_IMPLEMENTATION.md` documenting backend implementation with source parameter support
  - Updated requirements document to reflect implemented status

**Files Modified:**
- `lib/api/transactions2.ts` - Added source parameter support to getTransactions3 (1 line added)
- `screens/TransactionsScaffoldScreen.tsx` - Major updates for POS sales integration (150+ lines updated)
- `screens/PointOfSaleScreen.tsx` - Fixed duplicate style property (3 lines updated)
- `screens/ScaffoldViewAllScreen.tsx` - Fixed navigation type issue (2 lines updated)
- `docs/api/POS_SALES_QUERYING_BACKEND_REQUIREMENTS.md` - New backend requirements documentation (new, 221 lines)
- `docs/api/POS_SALES_QUERYING_IMPLEMENTATION.md` - New implementation documentation (new, 303 lines)

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 19 files
- **Total Lines Added:** 3750 insertions
- **Total Lines Removed:** 99 deletions
- **Net Change:** +3651 lines

### Key Features Added
1. POS sales integration into Sales section with separate "POS Sales" card
2. Split "All done" card into "POS Sales" and "Sales Invoices" for better organization
3. Source parameter support in transactions3 API for backend filtering
4. POS sales fetching from transactions3 source_of_truth collection
5. Updated Sales section refresh logic to include POS sales
6. Fixed TypeScript compilation errors
7. Comprehensive backend documentation for POS sales querying

### Notes
- POS sales are automatically verified and audit-ready, appearing in `source_of_truth` collection
- Backend now supports `source` query parameter for filtering transactions by `metadata.capture.source`
- Frontend uses `source=pos_one_off_item` parameter to fetch only POS sales, reducing payload size
- "POS Sales" and "Sales Invoices" cards appear below "Audit Ready" separator in Sales section
- All TypeScript errors resolved - codebase passes type-checking without errors
- Backend documentation provides complete API specifications for POS sales querying implementation

---

## 2025-12-09

### Summary
Added Financial Services screens (FinancialServicesScreen and InvoiceFinancingScreen) to provide users with access to various financing options, enhanced ChatbotCard component with timestamps, assistant icon, and updated messaging, and improved TransactionsScaffoldScreen with clearer card titles and user-friendly pipeline descriptions for better UX.

### Commits

#### 1. feat: Add Financial Services screens and improve chatbot UX
**Commit:** `31e8343`  
**Files Changed:** 6 files, 375 insertions(+), 99 deletions(-)

**Changes:**
- Created FinancialServicesScreen displaying list of financial service options:
  - Services include: Borrowing from Friends & Family, Business Credit Cards & Overdrafts, Invoice Financing, Trade Credit, Merchant Cash Advance, Asset Finance, Lease Financing, Hire Purchase, Medium Term Business Loans
  - Each service card shows title and subtitle
  - Navigation to Invoice Financing screen when Invoice Financing card is pressed
  - Wireframe grayscale design consistent with app design system
- Created InvoiceFinancingScreen with detailed financing offer display:
  - Shows offer details from CapitalFlow Solutions supplier
  - Displays advance rate (up to 90%), fee (2.5% per invoice), payment terms, minimum invoice, and credit check information
  - Includes description of invoice financing service
  - "Learn more" button for additional information
  - Wireframe grayscale design
- Enhanced ChatbotCard component with improved UX:
  - Added timestamp support to messages with time display (HH.MM format)
  - Added assistant icon (face-retouching-natural) to AI messages
  - Updated initial messages with more relevant business context:
    - First message about low inventory with supplier recommendation and Tally Network benefits
    - Second message about outstanding payments and invoice financing benefits
  - Improved message layout with message wrapper and row structure
  - Adjusted bottom margin to account for tab bar height
- Updated TransactionsScaffoldScreen with improved card titles and descriptions:
  - Changed "Needs verification (no reconciliation required)" to "Needs verification"
  - Changed "Needs reconciliation" to "Needs matching"
  - Changed "Accounts Payable" to "Unpaid purchases"
  - Changed "Confirmed unreconcilable" to "Couldn't be matched"
  - Changed "Verified and audit ready" / "Verified, reconciled and audit ready" to "All done"
  - Changed "Invoices submitted pending payment" to "Unpaid invoices"
  - Changed "Invoices paid, needs match" to "Awaiting bank match"
  - Changed "Reconcile to bank" to "Awaiting bank match"
  - Changed "Reconcile to Credit Card" to "Awaiting card match"
  - Updated pipeline descriptions with more user-friendly explanations:
    - Bank pipeline: Explains automatic rule matching and reconciliation process
    - Credit Cards pipeline: Similar explanation for credit card transactions
    - Sales pipeline: Explains invoice organization and tracking workflow
    - Purchases pipeline: Explains receipt organization and tracking workflow
  - Added "Audit Ready" separator line for completed transactions across all pipelines
  - Updated reconciliation button check to use new "Needs matching" title
- Added Financial Services navigation:
  - Added FinancialServices and InvoiceFinancing routes to AppNavigator
  - Added Financial Services drawer menu item with bank icon
  - Integrated screens into drawer navigation structure

**Files Modified:**
- `screens/FinancialServicesScreen.tsx` - New Financial Services screen (new, 85 lines)
- `screens/InvoiceFinancingScreen.tsx` - New Invoice Financing screen (new, 131 lines)
- `components/ChatbotCard.tsx` - Enhanced with timestamps, icon, and updated messages (99 lines updated)
- `screens/TransactionsScaffoldScreen.tsx` - Improved card titles and descriptions (276 lines updated)
- `navigation/AppNavigator.tsx` - Added Financial Services routes (2 lines added)
- `navigation/DrawerContent.tsx` - Added Financial Services menu item (6 lines added)

---

### Statistics
- **Total Commits:** 1
- **Total Files Changed:** 6 files
- **Total Lines Added:** 375 insertions
- **Total Lines Removed:** 99 deletions
- **Net Change:** +276 lines

### Key Features Added
1. Financial Services screen with comprehensive list of financing options
2. Invoice Financing screen with detailed offer display and supplier information
3. Enhanced ChatbotCard with timestamps and assistant icon for better UX
4. Improved pipeline card titles for better clarity and user understanding
5. User-friendly pipeline descriptions explaining workflow processes
6. "Audit Ready" visual separator for completed transactions
7. Financial Services navigation integration in drawer menu

### Notes
- Financial Services screens follow wireframe design guidelines (black, white, grayscale only)
- ChatbotCard messages now include timestamps and visual distinction between user and AI messages
- Pipeline card titles simplified for better user comprehension (e.g., "Needs matching" instead of "Needs reconciliation")
- Pipeline descriptions rewritten to be more conversational and user-friendly, explaining what Tally does automatically vs. what requires user action
- "Audit Ready" separator provides visual distinction for completed transactions across all pipeline sections
- Financial Services drawer menu item uses bank icon for consistency with financial services theme

---

## 2025-12-08

### Summary
Added Point of Sale and Inventory Management screens with order management functionality, enhanced Home dashboard with comprehensive business health score visualization including KPI detail cards and motivational messaging, significantly improved Revenue Growth screen with detailed metrics, enhanced Transaction Detail screen with invoice marking capabilities, and added comprehensive API documentation for sales manual implementation and invoice payment workflows. Fixed TypeScript errors in InsightsScreen and MotivationalCard components, and added new Insights and Control Compliance screens.

### Commits

#### 1. feat: Add Point of Sale and Inventory Management screens, enhance Home dashboard with health scores, and add sales invoice functionality
**Commit:** `ee6f96a`  
**Files Changed:** 22 files, 3297 insertions(+), 573 deletions(-)

**Changes:**
- Created PointOfSaleScreen with product grid, shopping cart, and checkout functionality:
  - Product cards displaying name, pack size, and price
  - Shopping cart showing selected items with quantities
  - Checkout card with subtotal, VAT calculation (20%), and total
  - Fixed checkout card positioned at bottom right
  - Wireframe grayscale design with proper styling
- Created InventoryManagementScreen for managing inventory orders:
  - Integration with OrderCard component for supplier information display
  - Integration with OrderDetailsCard for order item details
  - Support for Tally Network supplier badges
  - Order placement functionality via Tally Network
- Enhanced HomeScreen with comprehensive business health score dashboard:
  - Integrated health score API with timeframe selection (week, month, quarter)
  - Added pull-to-refresh functionality
  - Large MetricsCard showing overall business health score with dual-circle visualization (outer: overall score, inner: pre-unreconciled performance score)
  - Three small circular metrics for Revenue Growth, Cash Flow, and Net Profit
  - Current Ratio metric display
  - MotivationalCard component with dismissible messaging about improving business health
  - Four KPI detail cards (Revenue Growth, Cash Flow, Net Profit, Current Ratio) with navigation to detail screens
  - Dynamic business name extraction from business ID with proper formatting
  - Loading and error states with proper UI feedback
- Created new reusable components:
  - BottomNavBar: Bottom navigation bar with Home, Transactions, Reports, Settings, and Assistant tabs
  - KPIDetailCard: Card component displaying KPI metrics with circular progress indicators and navigation support
  - MotivationalCard: Dismissible card with motivational messaging for business improvement
  - OrderCard: Supplier information card with address, phone, and Tally Network badge
  - OrderDetailsCard: Order item details card with line items, totals, and order action button
- Significantly enhanced MetricsCard component:
  - Dual-circle visualization for large metrics (overall vs performance score)
  - Animated circular progress indicators with custom arc rendering (270° arc from 7:30 to 4:30)
  - Timeframe selector with modal bottom sheet
  - Detailed metrics breakdown modal showing health score components
  - Support for control/compliance score adjustment affecting outer circle
  - Improved styling and layout for better UX
- Enhanced RevenueGrowthScreen with detailed revenue growth metrics:
  - Revenue trend visualization with period comparisons
  - Detailed breakdown of revenue growth factors
  - KPI scoring explanation
  - Enhanced data visualization and presentation
- Enhanced TransactionDetailScreen with invoice payment functionality:
  - Mark invoice as paid functionality
  - Enhanced transaction detail display
  - Improved navigation and state management
- Updated TransactionsScaffoldScreen with improved filtering and display logic
- Updated navigation:
  - Added PointOfSale and InventoryManagement routes to AppNavigator
  - Added drawer menu items for Point of Sale and Inventory Management
  - Updated MainTabNavigator for proper navigation flow
- Updated HelpScreen with chatbot integration improvements
- Added comprehensive API documentation:
  - TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md: Complete guide for sales manual entry endpoint implementation
  - TRANSACTIONS3_MARK_INVOICE_PAID.md: Documentation for marking invoices as paid workflow
  - TRANSACTIONS3_REPORTING_READY_RN_MIGRATION.md: Migration guide for reporting ready transactions
- Updated ChatbotCard component with improved functionality
- Minor currency utility updates

**Files Modified:**
- `screens/PointOfSaleScreen.tsx` - New Point of Sale screen (new, 271 lines)
- `screens/InventoryManagementScreen.tsx` - New Inventory Management screen (new, 50 lines)
- `screens/HomeScreen.tsx` - Enhanced with health score dashboard (172 insertions, significant refactor)
- `components/MetricsCard.tsx` - Major enhancement with dual-circle visualization (614 lines refactored)
- `components/BottomNavBar.tsx` - New bottom navigation component (new, 77 lines)
- `components/KPIDetailCard.tsx` - New KPI detail card component (new, 91 lines)
- `components/MotivationalCard.tsx` - New motivational card component (new, 77 lines)
- `components/OrderCard.tsx` - New order card component (new, 82 lines)
- `components/OrderDetailsCard.tsx` - New order details card component (new, 140 lines)
- `screens/RevenueGrowthScreen.tsx` - Enhanced revenue growth screen (413 insertions)
- `screens/TransactionDetailScreen.tsx` - Enhanced transaction detail screen (425 insertions)
- `screens/TransactionsScaffoldScreen.tsx` - Updated transactions scaffold (665 lines refactored)
- `navigation/AppNavigator.tsx` - Added new routes (6 insertions)
- `navigation/DrawerContent.tsx` - Added drawer menu items (52 lines updated)
- `navigation/MainTabNavigator.tsx` - Navigation updates (2 lines updated)
- `components/ChatbotCard.tsx` - Improved chatbot functionality (76 lines updated)
- `lib/api/transactions2.ts` - API enhancements (51 lines updated)
- `lib/utils/currency.ts` - Currency utility updates (2 lines updated)
- `screens/HelpScreen.tsx` - Help screen updates (10 lines updated)
- `docs/api/TRANSACTIONS3_SALES_MANUAL_IMPLEMENTATION.md` - New API documentation (new, 276 lines)
- `docs/api/TRANSACTIONS3_MARK_INVOICE_PAID.md` - New API documentation (new, 211 lines)
- `docs/api/TRANSACTIONS3_REPORTING_READY_RN_MIGRATION.md` - New API documentation (new, 107 lines)

---

#### 2. fix: Fix TypeScript errors in InsightsScreen and MotivationalCard
**Commit:** `882770e`  
**Files Changed:** 11 files, 1678 insertions(+), 101 deletions(-)

**Changes:**
- Fixed InsightsResponse type usage in MotivationalCard and InsightsScreen (removed non-existent 'data' property)
- Added explicit types for map callback parameters in InsightsScreen (area, risk, action parameters)
- Created new InsightsScreen for displaying business insights with summary, strategy, explanation, risks, and actions
- Created new ControlComplianceScreen for control and compliance metrics
- Enhanced CashFlowScreen, CurrentRatioScreen, and NetProfitScreen with detailed metrics and visualizations
- Updated KPIDetailCard and MetricsCard components with improvements
- Added insights API integration to transactions2 API client
- Updated HomeNavigator with Insights route
- All TypeScript type-check errors resolved

**Files Modified:**
- `components/MotivationalCard.tsx` - Fixed type errors, enhanced with insights integration (102 lines updated)
- `screens/InsightsScreen.tsx` - New insights screen (new, 267 lines)
- `screens/ControlComplianceScreen.tsx` - New control compliance screen (new, 130 lines)
- `screens/CashFlowScreen.tsx` - Enhanced with detailed metrics (398 insertions)
- `screens/CurrentRatioScreen.tsx` - Enhanced with detailed metrics (366 insertions)
- `screens/NetProfitScreen.tsx` - Enhanced with detailed metrics (402 insertions)
- `components/KPIDetailCard.tsx` - Component updates (14 lines updated)
- `components/MetricsCard.tsx` - Component updates (20 lines updated)
- `lib/api/transactions2.ts` - Added insights API (37 lines added)
- `navigation/HomeNavigator.tsx` - Added Insights route (11 lines added)
- `screens/HomeScreen.tsx` - Minor updates (32 lines updated)

---

### Statistics
- **Total Commits:** 2
- **Total Files Changed:** 33 files
- **Total Lines Added:** 4975 insertions
- **Total Lines Removed:** 674 deletions
- **Net Change:** +4301 lines

### Key Features Added
1. Point of Sale screen with product grid, shopping cart, and checkout functionality
2. Inventory Management screen with supplier information and order management
3. Comprehensive business health score dashboard on Home screen with dual-circle visualization
4. KPI detail cards for Revenue Growth, Cash Flow, Net Profit, and Current Ratio
5. Motivational card with dismissible messaging for business improvement
6. Bottom navigation bar component for consistent navigation across screens
7. Enhanced MetricsCard with dual-circle progress visualization and detailed metrics modal
8. Significantly enhanced Revenue Growth screen with detailed metrics and visualization
9. Enhanced Transaction Detail screen with invoice payment functionality
10. Comprehensive API documentation for sales manual entry and invoice workflows
11. Order management components (OrderCard, OrderDetailsCard) for inventory functionality
12. Pull-to-refresh functionality on Home screen for health score updates
13. Insights screen displaying business insights with strategy, risks, and recommended actions
14. Control Compliance screen for control and compliance metrics
15. Enhanced Cash Flow, Current Ratio, and Net Profit screens with detailed metrics and visualizations
16. Fixed all TypeScript type-check errors for improved code quality

### Notes
- Point of Sale screen uses wireframe grayscale design consistent with app design system
- Health score dashboard shows overall business health with performance breakdown (pre-unreconciled score)
- Dual-circle visualization in MetricsCard: outer circle shows overall score (adjusted by control/compliance), inner circle shows performance score
- All new components follow wireframe design guidelines (black, white, grayscale only)
- BottomNavBar provides consistent navigation pattern for main app sections
- KPI detail cards are clickable and navigate to detailed KPI screens (Revenue Growth, Cash Flow, Net Profit, Current Ratio)
- API documentation provides backend team with complete specifications for sales manual entry and invoice payment workflows
- Inventory Management screen demonstrates integration with Tally Network for supplier orders
- Timeframe selector in MetricsCard allows users to view health scores for different periods (week, month, quarter)
- InsightsScreen displays comprehensive business insights including strategy recommendations, risk identification, and actionable steps
- All TypeScript errors resolved - codebase now passes type-checking without errors
- Enhanced KPI detail screens provide deeper insights into business metrics with detailed breakdowns and visualizations

---

## 2025-12-06

### Summary
Fixed AccountLedgerScreen to use transactions3 API instead of transactions2, updated Reporting Ready filtering logic to match transactions3 definition, and added comprehensive debug logging to diagnose why transactions weren't appearing in reports. Added pull-to-refresh functionality to ReportsScreen. Fixed TypeScript errors in Firebase configuration and updated transactions2 API endpoint to transactions3. Identified that the backend chart accounts API needs to be updated to read from transactions3 instead of transactions2.

### Commits

#### 1. fix: Update AccountLedgerScreen to use transactions3 and add debug logging
**Commit:** `f118a02`  
**Files Changed:** 2 files, 208 insertions(+), 50 deletions(-)

**Changes:**
- Updated AccountLedgerScreen to use `getTransactions3` with `source_of_truth` collection instead of `getTransactions`
- Changed API query to fetch from `source_of_truth` collection with `status: 'verification:verified'` filter
- Updated Reporting Ready filtering logic to match transactions3 definition:
  - Removed redundant verification check (already filtered by backend)
  - Updated reconciliation status check to use transactions3 values: `reconciled`, `not_required` (with legacy `matched` support)
  - Simplified logic: include if `reconciled/not_required OR has accounting entries`
- Added comprehensive debug logging to AccountLedgerScreen:
  - Logs account name, type, businessId, and period when fetching
  - Logs API response with total transactions, pagination, and sample transaction details
  - Logs filtering process with counts at each stage (date filtering, Reporting Ready filtering, account matching)
  - Logs account matching details for first 3 transactions showing debits/credits
  - Logs final ledger entries count
- Added debug logging to ReportsScreen:
  - Logs chart accounts API response with total accounts, period, and sample accounts
  - Logs normalized accounts breakdown by type
  - Logs calculated metrics (income, expenses, net profit, assets, liabilities, equity)
  - Added diagnostic check to verify transactions3 transactions exist before chart accounts calculation
- Added pull-to-refresh functionality to ReportsScreen:
  - Imported `RefreshControl` from react-native
  - Added `refreshing` state
  - Created `onRefresh` callback that refetches chart accounts data
  - Extracted `fetchData` into `useCallback` for reuse
  - Added `RefreshControl` to ScrollView

**Files Modified:**
- `screens/AccountLedgerScreen.tsx` - Updated to use transactions3, improved filtering, added debug logs
- `screens/ReportsScreen.tsx` - Added pull-to-refresh, debug logging, and diagnostic checks

---

#### 2. fix: Fix TypeScript errors and update transactions2 API to transactions3
**Commit:** `71d61e1`  
**Files Changed:** 3 files, 37 insertions(+), 8 deletions(-)

**Changes:**
- Fixed Firebase `getReactNativePersistence` TypeScript import error:
  - Changed import from `'firebase/auth'` to `'firebase/auth/react-native'`
  - Added `@ts-ignore` comment for type definition gap (function exists at runtime)
  - Added `initializeAuth` import and AsyncStorage persistence initialization
  - Added error handling for already-initialized auth state
- Updated `TransactionsListResponse` type to use pagination object structure:
  - Changed from flat `total`, `page`, `limit` fields to nested `pagination` object
  - Matches transactions3 API response format with `totalCount`, `totalPages`, `hasNextPage`, `hasPreviousPage`
- Updated `getTransactions` endpoint from transactions2 to transactions3:
  - Changed endpoint from `/authenticated/transactions2/api/transactions` to `/authenticated/transactions3/api/transactions`
  - This completes the migration of the legacy `getTransactions` method to use transactions3
- Added defensive unverified status check in `purchases3NeedsVerification` filter:
  - Added explicit check for `verification.status === 'unverified'` in addition to purchase kind check
  - Ensures only unverified purchase transactions appear in "Needs verification" card

**Files Modified:**
- `lib/config/firebase.ts` - Fixed TypeScript import error, added AsyncStorage persistence
- `lib/api/transactions2.ts` - Updated response type and endpoint to transactions3
- `screens/TransactionsScaffoldScreen.tsx` - Added defensive unverified status check

---

#### 3. fix: Correct getReactNativePersistence import path
**Commit:** `d0fa650`  
**Files Changed:** 1 file, 2 insertions(+), 3 deletions(-)

**Changes:**
- Fixed runtime bundling error by correcting import path:
  - Changed from `'firebase/auth/react-native'` (doesn't exist at runtime) to `'firebase/auth'`
  - The function `getReactNativePersistence` exists at runtime in `'firebase/auth'` but TypeScript types don't include it
  - Using `@ts-ignore` comment to suppress TypeScript error while maintaining runtime functionality
  - Fixes Metro bundler error: "Unable to resolve 'firebase/auth/react-native'"

**Files Modified:**
- `lib/config/firebase.ts` - Corrected import path for getReactNativePersistence

---

### Statistics
- **Total Commits:** 3
- **Total Files Changed:** 5 files
- **Total Lines Added:** 247 insertions
- **Total Lines Removed:** 61 deletions
- **Net Change:** +186 lines

### Key Features Added
1. AccountLedgerScreen now correctly queries transactions3 `source_of_truth` collection
2. Updated Reporting Ready filtering to match transactions3 definition
3. Comprehensive debug logging for transaction fetching and filtering
4. Pull-to-refresh functionality on ReportsScreen
5. Diagnostic checks to verify transactions3 data availability
6. Fixed TypeScript errors in Firebase configuration
7. Updated legacy `getTransactions` method to use transactions3 endpoint
8. Improved type safety with pagination object structure

### Notes
- **Root Cause Identified:** The backend chart accounts API (`/api/businesses/{businessId}/chart-accounts`) is still reading from transactions2 instead of transactions3, which is why all account values are 0. The frontend changes are correct - the backend needs to be updated to query transactions3 `source_of_truth` collection.
- Diagnostic logs show that transactions exist in transactions3 with accounting entries, but the chart accounts API isn't finding them.
- Frontend is now correctly using transactions3 for AccountLedgerScreen, which should work once backend chart accounts API is updated.
- Debug logs will help identify where transactions are being filtered out or if there are account name mismatches.
- Fixed TypeScript compilation error that was blocking type-checking workflow.
- Fixed runtime bundling error by correcting Firebase import path (getReactNativePersistence from 'firebase/auth' not 'firebase/auth/react-native').
- Legacy `getTransactions` method now uses transactions3 endpoint, completing the API migration for this method.
- Firebase auth persistence now properly configured for React Native with AsyncStorage.

---

## 2025-12-05

### Summary
Removed all legacy transactions2 code from refactored sections (Purchases, Bank, Credit Cards) to complete the transactions3 migration. Eliminated the old "receipts" section entirely in favor of "Purchases3", updated all filtering logic to use transactions3 exclusively, and fixed navigation/type errors in upload processing. Added TypeScript type-checking scripts for easier development workflow. Implemented Accounts Payable card for unpaid purchase transactions, integrated transactions3 manual purchase entry endpoint, and added payment method update functionality for transactions3 transactions.

### Commits

#### 1. refactor: Remove legacy transactions2 code from refactored sections
**Commit:** `local`  
**Files Changed:** 2 files, ~500 insertions(+), ~800 deletions(-)

**Changes:**
- Removed 'receipts' section entirely from navigation and type definitions (replaced by 'purchases3')
- Removed all `getTransactions()` calls for bank and cards sections (now use transactions3 exclusively)
- Removed backward compatibility code that used `allTransactions` for bank/cards filtering
- Removed receipts section rendering code and related variables (needsVerificationTransactions, verifiedNeedsMatchTransactions, recentReportingReadyReceipts, parsedTransactions, receiptColumnsWithData)
- Updated `getFullTransactions` to use transactions3 data for bank and cards sections instead of allTransactions
- Updated section switching logic to use 'purchases3' instead of 'receipts'
- Added handling for legacy 'receipts' route params (converts to 'purchases3')
- Updated reconciliation handlers to only use transactions3 endpoints
- Updated refresh handlers to only fetch transactions3 data for bank/cards
- Updated initial fetch comment to clarify it's only for Sales and Reporting sections (not yet migrated)

**Files Modified:**
- `screens/TransactionsScaffoldScreen.tsx` - Major cleanup removing all transactions2 references from refactored sections
- `screens/UploadProcessingScreen.tsx` - Fixed 'receipts' references and navigation type errors

---

#### 2. fix: Update UploadProcessingScreen to remove receipts references and fix navigation types
**Commit:** `local`  
**Files Changed:** 1 file, ~20 insertions(+), ~15 deletions(-)

**Changes:**
- Removed outdated comment about "receipts section"
- Updated activeSection type to remove 'receipts' and add 'purchases3'
- Updated pipelineSection mapping to convert legacy 'receipts' to 'purchases3' activeSection
- Fixed navigation type errors by using proper type assertions instead of `as never`

**Files Modified:**
- `screens/UploadProcessingScreen.tsx` - Fixed type errors and legacy section references

---

#### 3. feat: Add TypeScript type-checking scripts to package.json
**Commit:** `local`  
**Files Changed:** 1 file, 2 insertions(+)

**Changes:**
- Added `type-check` and `check` scripts to run `tsc --noEmit` for type checking
- Provides similar functionality to Next.js `npm run build` for finding type errors

**Files Modified:**
- `package.json` - Added type-checking scripts

---

#### 4. feat: Add Accounts Payable card, transactions3 manual entry, and payment method updates
**Commit:** `d0af420`  
**Files Changed:** 27 files, 2475 insertions(+), 110 deletions(-)

**Changes:**
- Added Accounts Payable card to Purchases3 section for unpaid purchase transactions with Accounts Payable payment method
- Integrated transactions3 manual purchase entry endpoint (`createPurchaseManual`) - transactions are verified by default and saved directly to source_of_truth
- Added transactions3 payment method update endpoint support (`updateTransactions3PaymentMethod`) for verified transactions
- Enhanced transaction filtering with `hasAccountsPayablePayment` helper function to detect Accounts Payable transactions
- Improved cash transaction filtering and reconciliation status handling (reconciled, not_required statuses)
- Enhanced transaction fetching to include reconciled and not_required transactions for audit ready card
- Updated transaction detail screen to support transactions3 payment method updates
- Enhanced ManualPurchaseEntryScreen with transactions3 integration and proper endpoint usage
- Fixed various transaction filtering issues across scaffold screens (CashFlow, NetProfit, RevenueGrowth, CurrentRatio)
- Updated Firebase config and business context constants
- Added comprehensive API documentation for Accounts Payable integration, manual entry flows, audit ready conditions, cash filtering, reconciliation status handling, Firestore indexes, and related transaction3 workflows

**Files Modified:**
- `lib/api/transactions2.ts` - Added createPurchaseManual and updateTransactions3PaymentMethod endpoints
- `screens/TransactionsScaffoldScreen.tsx` - Added Accounts Payable card, enhanced filtering logic
- `screens/TransactionDetailScreen.tsx` - Added transactions3 payment method update support
- `screens/ManualPurchaseEntryScreen.tsx` - Integrated transactions3 manual entry endpoint
- `lib/config/firebase.ts` - Updated Firebase configuration
- `lib/constants/businessContext.ts` - Updated business context constants
- Various scaffold and screen files - Fixed transaction filtering issues
- `docs/api/*.md` - Added 10 new documentation files for Accounts Payable, manual entry, and transactions3 workflows

---

### Statistics
- **Total Commits:** 4
- **Total Files Changed:** 30 files
- **Total Lines Added:** ~2995 insertions
- **Total Lines Removed:** ~925 deletions
- **Net Change:** ~+2070 lines

### Key Features Added
1. Complete removal of legacy transactions2 code from Purchases, Bank, and Credit Cards sections
2. Elimination of 'receipts' section in favor of 'purchases3'
3. All refactored sections now use transactions3 exclusively
4. Fixed navigation and type errors in upload processing
5. Added TypeScript type-checking scripts for development workflow
6. Accounts Payable card for tracking unpaid purchase transactions
7. Transactions3 manual purchase entry endpoint integration (verified by default, direct to source_of_truth)
8. Transactions3 payment method update functionality for verified transactions
9. Enhanced transaction filtering for Accounts Payable and cash-only transactions
10. Comprehensive API documentation for Accounts Payable and manual entry workflows

### Notes
- **Preserved transactions2 code** for Sales and Reporting Ready sections (will be refactored next)
- **Preserved transactions2 code** for Payroll, Internal, and Financial Services (not yet started)
- All bank and credit card transaction filtering now uses transactions3 data exclusively
- Navigation properly handles legacy 'receipts' pipelineSection values by converting to 'purchases3'
- Type-checking scripts allow developers to find TypeScript errors without running the app (similar to Next.js build)
- Accounts Payable transactions are filtered from verified purchase transactions with Accounts Payable payment method
- Manual purchase entries via transactions3 endpoint are immediately verified and saved to source_of_truth (no pending state)
- Payment method updates for transactions3 transactions use new PATCH endpoint (different from transactions2 update endpoint)
- Accounts Payable transactions move through workflow: unpaid → paid by bank/card (reconciliation) → paid by cash (direct to audit ready)
- Backend must support Accounts Payable payment method detection in various formats (accounts_payable, accounts payable, etc.)

---

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


