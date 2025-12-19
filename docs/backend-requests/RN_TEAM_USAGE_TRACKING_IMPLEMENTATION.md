# Usage Tracking Implementation - RN Team Guide

## Quick Start

Usage tracking is now live! Most tracking happens automatically on the server when you call our API endpoints. You only need to add **one small piece** for module access tracking.

---

## What You Need to Do

### ✅ Automatic (No Action Required)

These are already tracked automatically when you call our endpoints:

- **Transaction creation** - When you call:
  - `POST /authenticated/transactions3/api/purchases/ocr`
  - `POST /authenticated/transactions3/api/purchases/manual`
  - `POST /authenticated/transactions3/api/sales/ocr`
  - `POST /authenticated/transactions3/api/sales/manual`
  - `POST /authenticated/transactions3/api/bank-statements/upload`
  - `POST /authenticated/transactions3/api/credit-card-statements/upload`

- **Vertex AI calls** - Automatically tracked when OCR endpoints use AI

**You don't need to do anything for these!** They're already working.

---

## What You Need to Implement

### Track Module Access

When a user opens a module screen (Purchasing, Commerce, Employees, etc.), call this endpoint to track which modules they're using.

**Endpoint:**
```
POST /api/businesses/{businessId}/metadata/track-module-access
```

**Request:**
```json
{
  "moduleId": "purchasing"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Module access tracked"
}
```

---

## Implementation Steps

### Step 1: Create a Tracking Hook

Create a reusable hook for module tracking:

```typescript
// hooks/useModuleTracking.ts
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Adjust import path as needed
import { useBusiness } from '@/contexts/BusinessContext'; // Adjust import path as needed

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com';

export const useModuleTracking = (moduleId: string) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    // Only track if we have all required data
    if (!user || !currentBusiness?.id || !moduleId) {
      return;
    }

    const trackAccess = async () => {
      try {
        const token = await user.getIdToken();
        
        const response = await fetch(
          `${API_BASE_URL}/api/businesses/${currentBusiness.id}/metadata/track-module-access`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ moduleId }),
          }
        );

        // Don't throw errors - tracking is non-critical
        if (!response.ok) {
          console.warn(`[Module Tracking] Failed to track ${moduleId}`);
        }
      } catch (error) {
        // Silent fail - don't interrupt user experience
        console.warn(`[Module Tracking] Error tracking ${moduleId}:`, error);
      }
    };

    // Track when component mounts
    trackAccess();
  }, [user, currentBusiness?.id, moduleId]);
};
```

### Step 2: Add to Module Screens

Add the hook to each module screen. Here are examples:

**Purchasing Screen:**
```typescript
// screens/PurchasingScreen.tsx
import { useModuleTracking } from '@/hooks/useModuleTracking';

export default function PurchasingScreen() {
  useModuleTracking('purchasing');
  
  // ... rest of your component
}
```

**Commerce Screen:**
```typescript
// screens/CommerceScreen.tsx
import { useModuleTracking } from '@/hooks/useModuleTracking';

export default function CommerceScreen() {
  useModuleTracking('commerce');
  
  // ... rest of your component
}
```

**Employees/Payroll Screen:**
```typescript
// screens/EmployeesScreen.tsx
import { useModuleTracking } from '@/hooks/useModuleTracking';

export default function EmployeesScreen() {
  useModuleTracking('employees');
  
  // ... rest of your component
}
```

### Step 3: Module ID Reference

Use these exact module IDs (case-sensitive):

| Module Name | Module ID |
|------------|-----------|
| Purchasing | `purchasing` |
| Distribution | `distribution` |
| Employees | `employees` |
| Fixed Asset Register | `assetTracking` |
| Commerce | `commerce` |
| Events Management | `events` |
| Customers | `customers` |
| Marketing | `marketing` |
| Year End Reporting and Taxation | `taxPreparation` |
| Performance | `performance` |
| Financial Services | `financialServices` |

---

## Alternative: Simple Function Approach

If you prefer not to use hooks, you can call the endpoint directly:

```typescript
// utils/trackModuleAccess.ts
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com';

export const trackModuleAccess = async (
  businessId: string,
  moduleId: string,
  userToken: string
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/businesses/${businessId}/metadata/track-module-access`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ moduleId }),
      }
    );

    if (!response.ok) {
      console.warn(`[Module Tracking] Failed to track ${moduleId}`);
    }
  } catch (error) {
    console.warn(`[Module Tracking] Error tracking ${moduleId}:`, error);
  }
};

// Usage in component:
useEffect(() => {
  if (user && currentBusiness?.id) {
    user.getIdToken().then((token) => {
      trackModuleAccess(currentBusiness.id, 'purchasing', token);
    });
  }
}, [user, currentBusiness?.id]);
```

---

## Testing

### Test Module Tracking

1. Open a module screen (e.g., Purchasing)
2. Check your network tab - you should see a POST request to `/api/businesses/{businessId}/metadata/track-module-access`
3. The request should succeed (200 status)

### Verify Tracking Works

You can check if tracking is working by calling the usage metrics endpoint:

```typescript
// Test function (optional)
const checkUsageMetrics = async (businessId: string, userToken: string) => {
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/metadata/usage`,
    {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    }
  );

  const metrics = await response.json();
  console.log('Module access counts:', metrics.modules.moduleAccessCounts);
  // Should show: { purchasing: 1, commerce: 1, ... }
};
```

---

## Important Notes

1. **Non-blocking**: Tracking failures won't affect your app. If the API call fails, just log a warning and continue.

2. **Track once per screen visit**: Call the tracking when the screen first loads/mounts, not on every render or navigation.

3. **Module IDs are case-sensitive**: Use the exact IDs from the table above.

4. **Authentication required**: Make sure the user is authenticated and you have a valid token before calling.

5. **Business ID required**: Ensure you have the current business ID from your context.

---

## Questions?

If you run into issues:

1. **Check network requests**: Make sure the POST request is being sent
2. **Verify authentication**: Ensure the token is valid
3. **Check business ID**: Make sure `currentBusiness.id` is set
4. **Verify module ID**: Use exact IDs from the table above

---

## Summary

**What you need to do:**
1. Create `useModuleTracking` hook (or use function approach)
2. Add `useModuleTracking('moduleId')` to each module screen
3. Done! ✅

**What's already working:**
- Transaction tracking (automatic)
- Vertex AI tracking (automatic)
- No action needed for these

**Time estimate:** 30-60 minutes to add tracking to all module screens

---

## Example: Complete Implementation

```typescript
// hooks/useModuleTracking.ts
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com';

export const useModuleTracking = (moduleId: string) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    if (!user || !currentBusiness?.id || !moduleId) return;

    const trackAccess = async () => {
      try {
        const token = await user.getIdToken();
        await fetch(
          `${API_BASE_URL}/api/businesses/${currentBusiness.id}/metadata/track-module-access`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ moduleId }),
          }
        );
      } catch (error) {
        // Silent fail
        console.warn(`[Module Tracking] ${moduleId}:`, error);
      }
    };

    trackAccess();
  }, [user, currentBusiness?.id, moduleId]);
};

// screens/PurchasingScreen.tsx
import { useModuleTracking } from '@/hooks/useModuleTracking';

export default function PurchasingScreen() {
  useModuleTracking('purchasing');
  
  return (
    // Your screen content
  );
}

// screens/CommerceScreen.tsx
import { useModuleTracking } from '@/hooks/useModuleTracking';

export default function CommerceScreen() {
  useModuleTracking('commerce');
  
  return (
    // Your screen content
  );
}

// ... repeat for other module screens
```

That's it! 🎉

