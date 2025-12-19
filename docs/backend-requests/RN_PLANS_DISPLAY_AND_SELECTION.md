# Plans Display and Selection - React Native Integration Guide

## Overview

This guide explains how to display subscription plans to users and handle plan selection/updates in the React Native app.

## Available Plans

The system has 5 plans available:

| Plan ID | Plan Name | Price | Best For |
|---------|-----------|-------|----------|
| `trial` | Free Trial | £0 | New users (7 days) |
| `basic` | Basic | £5/mo | Basic accounting only |
| `starter` | Starter | £15/mo | Small businesses |
| `growth` | Growth | £35/mo | Growing businesses |
| `business` | Business | £75/mo | Established businesses |

**Note:** The `trial` plan is automatically assigned to new businesses and cannot be manually selected. Users should select from `basic`, `starter`, `growth`, or `business` plans.

## API Endpoints

### 1. Get All Available Plans

**Endpoint:** `GET /api/businesses/[businessId]/metadata/plans`

**Note:** This endpoint doesn't exist yet. For now, you can fetch individual plans or use the comparison table below.

**Alternative:** Fetch all plans from Firestore `plans` collection directly, or create a simple endpoint that returns all active plans.

### 2. Get Current Plan

**Endpoint:** `GET /api/businesses/[businessId]/metadata/plan`

**Authentication:** Required (Firebase ID token)

**Response:**
```typescript
{
  planId: string;              // 'trial', 'basic', 'starter', 'growth', 'business'
  planName: string;            // Display name: "Free Trial", "Basic", etc.
  description: string;         // Plan description
  price: number;               // Price in pence (e.g., 500 = £5.00)
  limits: {
    transactions: number | null;      // Monthly transaction limit (null = unlimited)
    vertexAICalls: number | null;      // Monthly AI call limit (null = unlimited)
    storageBytes: number | null;       // Storage limit in bytes (null = unlimited)
    users: number | null;              // User limit (null = unlimited)
    moduleGroups: number | null;       // Number of module groups included (null = all)
  };
  features: {
    includesModuleGroups: string[];    // Array of included group IDs
    allowAddOns: boolean;              // Whether plan allows add-ons
  };
  inTrial: boolean;             // Whether business is currently in trial
  subscription: {
    planId: string;
    planName: string;
    status: 'trial' | 'active' | 'cancelled' | 'expired';
    subscribedAt: string;      // ISO timestamp
    trialEndsAt: string | null; // ISO timestamp (null if not in trial)
  } | null;
}
```

**Example Request:**
```typescript
const response = await fetch(
  `https://your-api.com/api/businesses/${businessId}/metadata/plan`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
  }
);

const currentPlan = await response.json();
```

### 3. Simulate Payment (Temporary - for testing)

**Endpoint:** `POST /api/businesses/[businessId]/subscription/simulate-payment`

**Authentication:** Required (Firebase ID token)

**When to use:** Temporary endpoint for testing payment flow without Stripe integration. This will be removed once Stripe is set up.

**Request Body:**
```typescript
{
  planId: string;              // 'basic', 'starter', 'growth', or 'business'
  status?: 'approved' | 'declined';  // Default: 'approved'
}
```

**Response (Approved):**
```typescript
{
  success: true;
  status: 'approved';
  message: string;
  planId: string;
  planName: string;
  simulated: true;
}
```

**Response (Declined):**
```typescript
{
  success: false;
  status: 'declined';
  message: string;
  planId: string;
}
```

**Example Request:**
```typescript
// Simulate approved payment
const response = await fetch(
  `https://your-api.com/api/businesses/${businessId}/subscription/simulate-payment`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: 'starter',
      status: 'approved',  // or 'declined' to test failure
    }),
  }
);

const result = await response.json();
if (result.success) {
  console.log(`Plan updated to: ${result.planName}`);
}
```

### 4. Confirm Payment and Update Plan

**Endpoint:** `POST /api/businesses/[businessId]/subscription/confirm-payment`

**Authentication:** Required (Firebase ID token)

**When to use:** Call this endpoint after Stripe payment is successfully confirmed. This updates the business plan to the selected plan.

**Note:** Currently uses simulation mode. Will use real Stripe verification when Stripe is configured.

**Request Body:**
```typescript
{
  planId: string;              // 'basic', 'starter', 'growth', or 'business'
  paymentIntentId?: string;   // Optional: Stripe payment intent ID
  stripeSessionId?: string;   // Optional: Stripe checkout session ID
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  planId: string;
  planName: string;
}
```

**Example Request:**
```typescript
// After Stripe payment is confirmed
const response = await fetch(
  `https://your-api.com/api/businesses/${businessId}/subscription/confirm-payment`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: 'starter',
      paymentIntentId: 'pi_xxx',      // From Stripe
      stripeSessionId: 'cs_xxx',      // From Stripe (optional)
    }),
  }
);

const result = await response.json();
if (result.success) {
  console.log(`Plan updated to: ${result.planName}`);
}
```

**Error Responses:**
- `400`: Missing or invalid `planId`, or attempting to assign trial plan
- `404`: Plan not found
- `500`: Server error

### 5. Update Plan (Select New Plan - Pre-Payment)

**Endpoint:** `POST /api/businesses/[businessId]/metadata/plan`

**Authentication:** Required (Firebase ID token)

**Note:** This endpoint is for plan selection only. After payment is confirmed via Stripe, use the payment confirmation endpoint (see below).

**Request Body:**
```typescript
{
  planId: string;  // 'basic', 'starter', 'growth', or 'business'
}
```

**Response:**
```typescript
{
  success: boolean;
  planId: string;
  planName: string;
  description: string;
  price: number;        // Price in pence
  limits: {
    transactions: number | null;
    vertexAICalls: number | null;
    storageBytes: number | null;
    users: number | null;
    moduleGroups: number | null;
  };
  features: {
    includesModuleGroups: string[];
    allowAddOns: boolean;
  };
  subscription: {
    planId: string;
    planName: string;
    status: 'trial' | 'active' | 'cancelled' | 'expired';
    subscribedAt: string;      // ISO timestamp
    trialEndsAt: string | null;
  } | null;
}
```

**Example Request:**
```typescript
const response = await fetch(
  `https://your-api.com/api/businesses/${businessId}/metadata/plan`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseIdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: 'starter',  // User selected Starter plan
    }),
  }
);

const result = await response.json();
if (result.success) {
  // Plan updated successfully
  console.log(`Plan updated to: ${result.planName}`);
}
```

## Plan Limits Reference

### Free Trial (`trial`)
- **Price:** £0 (7 days only)
- **Transactions:** 500/month
- **Vertex AI Calls:** 200/month
- **Storage:** 10 GB
- **Users:** 1
- **Module Groups:** All 5 included
- **Note:** Automatically assigned, cannot be manually selected

### Basic (`basic`)
- **Price:** £5/month
- **Transactions:** 5/month
- **Vertex AI Calls:** 3/month
- **Storage:** 100 MB
- **Users:** 1
- **Module Groups:** 0 (none)

### Starter (`starter`)
- **Price:** £15/month
- **Transactions:** 25/month
- **Vertex AI Calls:** 10/month
- **Storage:** 500 MB
- **Users:** 3
- **Module Groups:** 1 (choose any)

### Growth (`growth`)
- **Price:** £35/month
- **Transactions:** 100/month
- **Vertex AI Calls:** 50/month
- **Storage:** 2 GB
- **Users:** 10
- **Module Groups:** 3 (choose any)

### Business (`business`)
- **Price:** £75/month
- **Transactions:** 500/month
- **Vertex AI Calls:** 200/month
- **Storage:** 10 GB
- **Users:** 25
- **Module Groups:** All 5 included

## Module Groups

The following module groups are available:

1. **`operations`** - Operations
   - Inventory Management
   - Production Management
   - Point of Sale

2. **`sales_marketing`** - Sales & Marketing
   - CRM & Invoicing
   - Online Sales
   - Online Booking

3. **`people`** - People
   - Payroll
   - Expense Management
   - Time Management

4. **`tally_network`** - Tally Network
   - Suppliers
   - Financial Services

5. **`tax_compliance`** - Tax & Compliance
   - VAT
   - Year End Reporting

## UI Implementation Suggestions

### 1. Plans Display Screen

Create a screen that shows all available plans in a comparison table or card layout:

```typescript
// Example structure
interface PlanDisplay {
  planId: string;
  name: string;
  price: number;        // in pence
  priceDisplay: string;  // formatted: "£5/month"
  limits: {
    transactions: string;    // "5/month" or "Unlimited"
    aiCalls: string;         // "3/month" or "Unlimited"
    storage: string;          // "100 MB" or "Unlimited"
    users: string;            // "1 user" or "Unlimited"
    moduleGroups: string;     // "0 groups" or "All 5 groups"
  };
  features: string[];        // List of key features
  isCurrentPlan: boolean;
  isTrial: boolean;
}
```

### 2. Plan Selection Flow

1. **Display Plans:**
   - Show all available plans (exclude `trial` from selection)
   - Highlight current plan
   - Show trial status if applicable
   - Display limits and features for each plan

2. **User Selects Plan:**
   - Show confirmation dialog with plan details
   - Display price and billing information
   - Warn if downgrading (may lose features)

3. **Update Plan:**
   - Call `POST /api/businesses/[businessId]/metadata/plan`
   - Show loading state
   - Handle success/error responses

4. **Post-Selection:**
   - Refresh current plan data
   - Update UI to reflect new plan
   - Show success message
   - Navigate to appropriate screen

### 3. Current Plan Display

Show current plan information in settings or account screen:

```typescript
// Fetch current plan
const currentPlan = await fetchCurrentPlan(businessId);

// Display:
// - Plan name and price
// - Trial status (if applicable)
// - Days remaining in trial (if in trial)
// - Usage vs limits (transactions, AI calls, storage, users)
// - "Change Plan" button
```

### 4. Usage vs Limits Display

Show how much of each limit has been used:

```typescript
// Get usage metrics
const usage = await fetchUsageMetrics(businessId);
const plan = await fetchCurrentPlan(businessId);

// Display progress bars or indicators:
// - Transactions: 15/25 used
// - AI Calls: 8/10 used
// - Storage: 250 MB / 500 MB
// - Users: 2/3 used
```

## Error Handling

### Common Errors

1. **400 Bad Request:**
   - Missing `planId` in request body
   - Invalid `planId` format

2. **404 Not Found:**
   - Plan ID doesn't exist
   - Business ID doesn't exist

3. **500 Server Error:**
   - Database error
   - Plan assignment failed

**Example Error Handling:**
```typescript
try {
  const response = await fetch(...);
  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 404) {
      // Plan not found
      showError('Selected plan is no longer available');
    } else if (response.status === 400) {
      // Invalid request
      showError(data.error || 'Invalid request');
    } else {
      // Other error
      showError('Failed to update plan. Please try again.');
    }
    return;
  }
  
  // Success
  showSuccess('Plan updated successfully');
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

## Price Formatting

Prices are stored in **pence** (smallest currency unit). Convert to pounds for display:

```typescript
function formatPrice(pence: number): string {
  if (pence === 0) return 'Free';
  const pounds = pence / 100;
  return `£${pounds.toFixed(2)}/month`;
}

// Examples:
// formatPrice(0)    → "Free"
// formatPrice(500)   → "£5.00/month"
// formatPrice(1500)  → "£15.00/month"
// formatPrice(3500)  → "£35.00/month"
// formatPrice(7500)  → "£75.00/month"
```

## Storage Formatting

Storage limits are in **bytes**. Convert to human-readable format:

```typescript
function formatStorage(bytes: number | null): string {
  if (bytes === null) return 'Unlimited';
  
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  
  if (bytes >= GB) {
    return `${(bytes / GB).toFixed(1)} GB`;
  } else if (bytes >= MB) {
    return `${(bytes / MB).toFixed(0)} MB`;
  } else {
    return `${(bytes / KB).toFixed(0)} KB`;
  }
}

// Examples:
// formatStorage(104857600)    → "100 MB"
// formatStorage(524288000)    → "500 MB"
// formatStorage(2147483648)   → "2.0 GB"
// formatStorage(10737418240) → "10.0 GB"
// formatStorage(null)         → "Unlimited"
```

## Testing Checklist

- [ ] Display all available plans correctly
- [ ] Show current plan highlighted
- [ ] Show trial status and days remaining (if applicable)
- [ ] Handle plan selection (POST request)
- [ ] Show success message after plan update
- [ ] Refresh plan data after update
- [ ] Handle errors gracefully
- [ ] Format prices correctly (£X.XX/month)
- [ ] Format storage limits correctly (MB/GB)
- [ ] Show usage vs limits correctly
- [ ] Prevent selecting trial plan manually
- [ ] Handle network errors
- [ ] Show loading states during API calls

## Payment Flow

### Recommended Flow: Stripe Checkout

1. **User selects plan** → Show plan details and pricing
2. **Initiate Stripe checkout** → Call your backend to create Stripe checkout session (backend handles Stripe API calls)
3. **Redirect to Stripe** → User completes payment on Stripe
4. **Payment confirmed** → Stripe webhook notifies backend OR RN calls confirmation endpoint
5. **Update plan** → Backend updates business plan automatically

### Option 1: Stripe Webhook (Recommended)

**Backend handles everything automatically:**
- Stripe sends webhook to `/api/webhooks/stripe` when payment succeeds
- Backend updates plan automatically
- No action needed from RN after redirecting to Stripe

**RN Flow:**
```typescript
// 1. User selects plan
async function handlePlanSelect(planId: string) {
  // Call backend to create Stripe checkout session
  const session = await createStripeCheckoutSession(businessId, planId);
  
  // Redirect to Stripe checkout
  await redirectToStripe(session.url);
  
  // After user returns from Stripe, check if payment succeeded
  // (Stripe webhook will have updated the plan automatically)
  await refreshCurrentPlan();
}
```

### Option 2: Manual Confirmation (Alternative)

**RN confirms payment after Stripe redirect:**

```typescript
// 1. User selects plan
async function handlePlanSelect(planId: string) {
  // Call backend to create Stripe checkout session
  const session = await createStripeCheckoutSession(businessId, planId);
  
  // Redirect to Stripe checkout
  const paymentResult = await redirectToStripe(session.url);
  
  // After payment succeeds, confirm with backend
  if (paymentResult.success) {
    await confirmPayment(businessId, {
      planId,
      paymentIntentId: paymentResult.paymentIntentId,
      stripeSessionId: paymentResult.sessionId,
    });
    
    // Refresh current plan
    await refreshCurrentPlan();
  }
}

async function confirmPayment(businessId: string, paymentData: {
  planId: string;
  paymentIntentId?: string;
  stripeSessionId?: string;
}) {
  const response = await fetch(
    `https://your-api.com/api/businesses/${businessId}/subscription/confirm-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseIdToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to confirm payment');
  }
  
  return await response.json();
}
```

## Example Implementation Flow

```typescript
// 1. Fetch current plan
const currentPlan = await fetchCurrentPlan(businessId);

// 2. Display plans screen
<PlansScreen 
  currentPlanId={currentPlan.planId}
  onPlanSelect={handlePlanSelect}
/>

// 3. User selects plan
async function handlePlanSelect(planId: string) {
  // Show confirmation with plan details
  const plan = await getPlanDetails(planId);
  const confirmed = await showConfirmDialog({
    title: 'Subscribe to Plan',
    message: `Subscribe to ${plan.name} for ${formatPrice(plan.price)}?`,
  });
  
  if (!confirmed) return;
  
  // Initiate Stripe checkout (backend creates session)
  try {
    setLoading(true);
    const checkoutSession = await createStripeCheckoutSession(businessId, planId);
    
    // Redirect to Stripe
    await redirectToStripe(checkoutSession.url);
    
    // After returning from Stripe, refresh plan
    // (Webhook will have updated it automatically, or call confirm-payment endpoint)
    await refreshCurrentPlan();
    showSuccess('Plan activated successfully');
  } catch (error) {
    showError('Failed to process payment');
  } finally {
    setLoading(false);
  }
}
```

## Notes

- **Trial Plan:** The `trial` plan is automatically assigned to new businesses when they are created and cannot be manually selected. It lasts 7 days from business creation.
- **Plan Changes:** Users can switch between plans at any time. The new plan takes effect immediately after payment confirmation.
- **Payment Processing:** 
  - **Stripe API calls must be made from the backend** (never expose Stripe secret keys in RN)
  - Backend should create Stripe checkout sessions and handle webhooks
  - RN redirects users to Stripe checkout, then confirms payment after return
- **Stripe Webhook:** The backend automatically updates plans when Stripe sends webhook events (`checkout.session.completed` or `payment_intent.succeeded`)
- **Limits:** When a user exceeds their plan limits, the system will show warnings but may still process requests (depending on configuration).

## Questions?

If you need additional endpoints or have questions about the plan structure, please reach out to the backend team.

