# Usage Tracking - React Native Integration Guide

## Overview

Usage tracking is now implemented to measure business usage for billing. This system tracks:
- **Transaction counts** (by type and source)
- **Vertex AI calls** (by operation type)
- **Storage usage** (bytes and file counts)
- **User counts** (total, active, by role)
- **Module access** (which modules used, how often)

All tracking happens **server-side** when RN calls API endpoints, plus one **client-side** call for module access tracking.

---

## What's Tracked Automatically

### ✅ Transaction Creation
When RN calls these endpoints, transactions are automatically tracked:

- `POST /authenticated/transactions3/api/purchases/ocr` - Purchase OCR
- `POST /authenticated/transactions3/api/purchases/manual` - Manual purchase entry
- `POST /authenticated/transactions3/api/sales/ocr` - Sales invoice OCR
- `POST /authenticated/transactions3/api/sales/manual` - Manual sales entry
- `POST /authenticated/transactions3/api/bank-statements/upload` - Bank statements
- `POST /authenticated/transactions3/api/credit-card-statements/upload` - Credit card statements

**No action required** - tracking happens automatically on the server.

### ✅ Vertex AI Calls
When OCR endpoints use Vertex AI, calls are automatically tracked:

- Purchase OCR → `ocr_purchase`
- Sales OCR → `ocr_sale`
- Bank statement analysis → `ocr_bank_statement`
- Credit card statement analysis → `ocr_credit_card_statement`

**No action required** - tracking happens automatically on the server.

### ✅ Storage Tracking (Optional)
Storage usage is tracked when you upload files. To enable accurate storage tracking, include `fileSize` (in bytes) in your request body:

**Endpoints that support `fileSize`:**
- `POST /authenticated/transactions3/api/purchases/ocr`
- `POST /authenticated/transactions3/api/sales/ocr`
- `POST /authenticated/transactions3/api/bank-statements/upload`
- `POST /authenticated/transactions3/api/credit-card-statements/upload`

**Example:**
```typescript
// When uploading a file, include fileSize in the request
const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/purchases/ocr`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: businessId,
    fileUrl: fileUrl,
    fileSize: file.size, // Optional: include file size in bytes
  }),
});
```

**Note**: `fileSize` is optional. If not provided, storage won't be tracked for that upload, but other metrics (transactions, Vertex AI) will still be tracked.

---

## Client-Side Tracking (RN App)

### Track Module Group Access

When a user navigates to a module group in your RN app, call this endpoint:

**POST** `/api/businesses/[businessId]/metadata/track-module-access`

```typescript
// Example: When user opens Operations group
const trackModuleGroupAccess = async (businessId: string, groupId: string) => {
  const token = await user.getIdToken();
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/businesses/${businessId}/metadata/track-module-access`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId }),
      }
    );

    if (!response.ok) {
      console.error('Failed to track module group access');
    }
  } catch (error) {
    // Don't block user flow if tracking fails
    console.error('Error tracking module group access:', error);
  }
};

// Usage
trackModuleGroupAccess(businessId, 'operations');
trackModuleGroupAccess(businessId, 'sales_marketing');
trackModuleGroupAccess(businessId, 'people');
trackModuleGroupAccess(businessId, 'tally_network');
trackModuleGroupAccess(businessId, 'tax_compliance');
```

**Group IDs** (from RN drawer structure):
- `operations` - Inventory, Production, Point of Sale
- `sales_marketing` - CRM & Invoicing, Online Sales, Online Booking
- `people` - Payroll, Expense Management, Time Management
- `tally_network` - Suppliers, Financial Services
- `tax_compliance` - VAT, Year End Reporting

**Best Practice**: Call this when a user accesses any module within a group (track at group level, not individual modules).

---

## Get Usage Metrics

To display usage to users (e.g., in a billing/settings screen):

**GET** `/api/businesses/[businessId]/metadata/usage`

```typescript
const getUsageMetrics = async (businessId: string) => {
  const token = await user.getIdToken();
  
  const response = await fetch(
    `${API_BASE_URL}/api/businesses/${businessId}/metadata/usage`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch usage metrics');
  }

  return await response.json();
};

// Response format:
{
  transactions: {
    totalCount: number;
    countByType: {
      purchase?: number;
      sale?: number;
      bank_transaction?: number;
      credit_card_transaction?: number;
      internal?: number;
    };
    countBySource: {
      ocr_image?: number;
      ocr_pdf?: number;
      manual?: number;
      bank_statement?: number;
      credit_card_statement?: number;
    };
    lastUpdated: string | null; // ISO timestamp
  };
  vertexAI: {
    totalCalls: number;
    callsByOperation: {
      ocr_purchase?: number;
      ocr_sale?: number;
      ocr_bank_statement?: number;
      ocr_credit_card_statement?: number;
      chat?: number;
      data_query?: number;
      document_analysis?: number;
    };
    lastCallAt: string | null; // ISO timestamp
    lastUpdated: string | null; // ISO timestamp
  };
  storage: {
    totalBytes: number;
    bytesByType: {
      receipts?: number;
      invoices?: number;
      bank_statements?: number;
      credit_card_statements?: number;
      other?: number;
    };
    fileCount: number;
    lastCalculatedAt: string | null; // ISO timestamp
    lastUpdated: string | null; // ISO timestamp
  };
  users: {
    totalCount: number;
    activeCount: number;
    countByRole: {
      owner?: number;
      super?: number;
      other?: number;
    };
    lastUpdated: string | null; // ISO timestamp
  };
  moduleGroups: {
    enabledGroups: string[]; // Group IDs user has access to
    groupAccessCounts: Record<string, number>; // Access count per group
    lastGroupAccess: Record<string, string | null>; // ISO timestamps
    lastUpdated: string | null; // ISO timestamp
  };
  billingPeriod: {
    currentPeriodStart: string | null; // ISO timestamp
    currentPeriodEnd: string | null; // ISO timestamp
    periodTransactions: number;
    periodVertexAICalls: number;
    periodStorageBytes: number;
  };
}
```

---

## Implementation Checklist

### ✅ Already Implemented (Server-Side)
- [x] Transaction tracking (all transaction endpoints)
- [x] Vertex AI call tracking (all OCR endpoints)
- [x] Storage tracking (when `fileSize` provided)
- [x] User count tracking (automatic on user add)
- [x] Module group access tracking endpoint
- [x] Usage metrics retrieval endpoint
- [x] Billing period reset cron job (monthly)
- [x] 7-day free trial period tracking

### 📋 To Implement (RN App)
- [ ] Call `track-module-access` with `groupId` when user accesses module groups
- [ ] (Optional) Include `fileSize` in upload requests for storage tracking
- [ ] Display usage metrics in settings/billing screen (optional)
- [ ] Show usage warnings when approaching limits (future)

---

## Example RN Integration

```typescript
// hooks/useModuleGroupTracking.ts
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api.com';

export const useModuleGroupTracking = (groupId: string) => {
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    if (!user || !currentBusiness?.id || !groupId) return;

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
            body: JSON.stringify({ groupId }),
          }
        );
      } catch (error) {
        // Silent fail - don't interrupt user experience
        console.error('Module group tracking error:', error);
      }
    };

    trackAccess();
  }, [user, currentBusiness?.id, groupId]);
};

// Usage in module group screens:
// OperationsScreen.tsx (or any screen in Operations group)
export default function OperationsScreen() {
  useModuleGroupTracking('operations');
  // ... rest of component
}

// SalesMarketingScreen.tsx
export default function SalesMarketingScreen() {
  useModuleGroupTracking('sales_marketing');
  // ... rest of component
}
```

---

## Notes

1. **Tracking is non-blocking**: If tracking fails, it won't affect the user experience
2. **Server-side tracking is automatic**: No RN code needed for transactions or Vertex AI calls
3. **Module tracking is optional**: Only track if you want to measure which modules users access
4. **Timestamps are ISO strings**: All timestamps returned as ISO 8601 strings for RN compatibility
5. **Storage tracking is optional**: Include `fileSize` in upload requests to track storage usage. If omitted, other metrics still track correctly.
6. **User counts update automatically**: When users accept invites, user counts are recalculated automatically

---

## Summary

**What RN needs to do:**
1. ✅ **Module group tracking** - Add `useModuleGroupTracking('groupId')` when users access module groups
2. ✅ **Storage tracking (optional)** - Include `fileSize` in upload request bodies

**What's automatic (no RN code needed):**
- ✅ Transaction counts
- ✅ Vertex AI call counts
- ✅ User counts (on user add)
- ✅ Billing period management
- ✅ 7-day free trial tracking

**Module Group IDs:**
- `operations` - Inventory, Production, Point of Sale
- `sales_marketing` - CRM & Invoicing, Online Sales, Online Booking
- `people` - Payroll, Expense Management, Time Management
- `tally_network` - Suppliers, Financial Services
- `tax_compliance` - VAT, Year End Reporting

