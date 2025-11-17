# React Native Transaction Architecture Guide

## Overview

Transactions are the "lifeblood" of the app and will be used across multiple screens. This document outlines the recommended architecture for handling transactions in the React Native client.

## API Endpoint

### Get Single Transaction

**Endpoint:** `GET /authenticated/transactions2/api/transactions/[transactionId]?businessId={businessId}`

**Authentication:** Bearer token required

**Response:**

```typescript
{
  id: string;
  metadata: {
    businessId: string;
    businessLocation?: string;
    imageUrl?: string;
    reference?: string;
    capture: { ... };
    classification: { ... };
    createdBy: string;
    createdAt: number;
    updatedAt: number;
  };
  summary: {
    thirdPartyName: string;      // ✅ What you need
    totalAmount: number;           // ✅ What you need
    subTotalBeforeCharges?: number;
    transactionDate: number;
    currency: string;
    description?: string;
  };
  accounting: { ... };
  details: { ... };
}
```

**Example Usage:**

```typescript
const response = await fetch(
  `${API_BASE_URL}/authenticated/transactions2/api/transactions/${transactionId}?businessId=${businessId}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
const transaction = await response.json();
console.log(transaction.summary.totalAmount);
console.log(transaction.summary.thirdPartyName);
```

## Local Storage Architecture

### Recommended Approach: Hybrid Caching Strategy

Since transactions are used across multiple screens, use a **tiered caching strategy**:

#### 1. **In-Memory Cache (State Management)**

**Purpose:** Fast access for current session, optimistic updates

**What to Store:**

- Recently viewed transactions (last 20-50)
- Currently active transaction being edited
- Transaction lists for current filters/views

**Technology Options:**

- **Zustand** (recommended for simplicity)
- **Redux Toolkit** (if you need complex middleware)
- **React Context + useReducer** (for smaller apps)

**Example with Zustand:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TransactionStore {
  transactions: Map<string, Transaction>;
  recentTransactionIds: string[];

  // Actions
  setTransaction: (tx: Transaction) => void;
  getTransaction: (id: string) => Transaction | undefined;
  addToRecent: (id: string) => void;
  clearCache: () => void;
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: new Map(),
      recentTransactionIds: [],

      setTransaction: (tx) => {
        const transactions = new Map(get().transactions);
        transactions.set(tx.id, tx);
        set({ transactions });
      },

      getTransaction: (id) => {
        return get().transactions.get(id);
      },

      addToRecent: (id) => {
        const recent = get().recentTransactionIds.filter((x) => x !== id);
        recent.unshift(id);
        set({ recentTransactionIds: recent.slice(0, 50) }); // Keep last 50
      },

      clearCache: () => {
        set({ transactions: new Map(), recentTransactionIds: [] });
      },
    }),
    {
      name: 'transaction-cache',
      // Only persist summary data to reduce storage
      partialize: (state) => ({
        transactions: Array.from(state.transactions.entries())
          .slice(0, 20) // Only persist last 20
          .reduce((map, [id, tx]) => {
            // Store only essential fields
            map.set(id, {
              id: tx.id,
              summary: tx.summary,
              metadata: {
                businessId: tx.metadata.businessId,
                createdAt: tx.metadata.createdAt,
              },
            });
            return map;
          }, new Map()),
        recentTransactionIds: state.recentTransactionIds.slice(0, 20),
      }),
    }
  )
);
```

#### 2. **AsyncStorage (Persistent Cache)**

**Purpose:** Offline access, app restart persistence

**What to Store:**

- **Summary-only cache** for list views (lightweight)
- **Full transaction cache** for recently viewed details (limited to ~50-100)
- **Cache metadata** (last sync time, version)

**Storage Limits:**

- AsyncStorage has ~6MB limit on iOS, ~10MB on Android
- Store **summary data** for list views (small footprint)
- Store **full transactions** only for recently accessed ones

**Example Structure:**

```typescript
// Store summary for list views
{
  "transactions:summary:businessId": [
    {
      id: "tx123",
      summary: {
        thirdPartyName: "Vendor Name",
        totalAmount: 150.00,
        transactionDate: 1234567890,
        currency: "USD"
      },
      metadata: {
        createdAt: 1234567890
      }
    }
  ]
}

// Store full transaction for detail view (when accessed)
{
  "transactions:full:tx123": { /* full transaction object */ }
}
```

#### 3. **Cache Strategy**

**Cache Layers (in order of access):**

1. **In-Memory (Zustand/Redux)** → Fastest, session-only
2. **AsyncStorage (Summary)** → Fast, survives app restart
3. **AsyncStorage (Full)** → Slower, for detail views
4. **API Call** → Slowest, always fresh

**Cache Invalidation:**

```typescript
// Cache invalidation rules
const CACHE_TTL = {
  SUMMARY: 5 * 60 * 1000, // 5 minutes
  FULL: 15 * 60 * 1000, // 15 minutes
  OFFLINE: Infinity, // Keep until online
};

// Check if cache is stale
function isCacheStale(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}
```

### Recommended Data Flow

```
┌─────────────────┐
│  Screen Request │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Check In-Memory Cache   │ ← Fastest (0ms)
└────────┬────────────────┘
         │ Not found?
         ▼
┌─────────────────────────┐
│ Check AsyncStorage      │ ← Fast (5-10ms)
│ (Summary or Full)       │
└────────┬────────────────┘
         │ Not found or stale?
         ▼
┌─────────────────────────┐
│ API Call                │ ← Slow (100-500ms)
│ GET /transactions/[id]  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Update All Caches       │
│ - In-Memory             │
│ - AsyncStorage          │
└─────────────────────────┘
```

## Implementation Recommendations

### 1. **Transaction Service Layer**

Create a service that abstracts caching logic:

```typescript
// services/transactionService.ts
class TransactionService {
  async getTransaction(
    transactionId: string,
    businessId: string,
    options?: { forceRefresh?: boolean }
  ): Promise<Transaction> {
    // 1. Check in-memory cache
    const cached = useTransactionStore.getState().getTransaction(transactionId);
    if (cached && !options?.forceRefresh) {
      return cached;
    }

    // 2. Check AsyncStorage
    const stored = await AsyncStorage.getItem(`transactions:full:${transactionId}`);
    if (stored) {
      const tx = JSON.parse(stored);
      const cacheTime = await AsyncStorage.getItem(`transactions:cacheTime:${transactionId}`);
      if (cacheTime && !isCacheStale(Number(cacheTime), CACHE_TTL.FULL)) {
        useTransactionStore.getState().setTransaction(tx);
        return tx;
      }
    }

    // 3. Fetch from API
    const tx = await this.fetchFromAPI(transactionId, businessId);

    // 4. Update all caches
    useTransactionStore.getState().setTransaction(tx);
    await AsyncStorage.setItem(`transactions:full:${transactionId}`, JSON.stringify(tx));
    await AsyncStorage.setItem(`transactions:cacheTime:${transactionId}`, Date.now().toString());

    return tx;
  }

  async getTransactionSummary(
    transactionId: string,
    businessId: string
  ): Promise<TransactionSummary> {
    // Similar flow but only fetch/return summary data
  }
}
```

### 2. **List View Optimization**

For transaction lists, only fetch summaries:

```typescript
// Only store what you need for list views
interface TransactionListItem {
  id: string;
  summary: {
    thirdPartyName: string;
    totalAmount: number;
    transactionDate: number;
    currency: string;
  };
  metadata: {
    createdAt: number;
  };
}

// Store lightweight list in AsyncStorage
await AsyncStorage.setItem(`transactions:list:${businessId}`, JSON.stringify(listItems));
```

### 3. **Detail View Pattern**

When user taps a transaction in list:

```typescript
// Screen component
function TransactionDetailScreen({ transactionId, businessId }) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Service handles caching automatically
      const tx = await transactionService.getTransaction(transactionId, businessId);
      setTransaction(tx);
      setLoading(false);
    }
    load();
  }, [transactionId]);

  if (loading) return <LoadingSpinner />;
  if (!transaction) return <ErrorScreen />;

  return (
    <View>
      <Text>{transaction.summary.thirdPartyName}</Text>
      <Text>${transaction.summary.totalAmount}</Text>
      {/* Full transaction details */}
    </View>
  );
}
```

## Storage Size Estimates

**Per Transaction:**

- **Summary only:** ~200-500 bytes
- **Full transaction:** ~2-5 KB (depending on item count)

**Storage Capacity:**

- **1,000 summaries:** ~200-500 KB
- **100 full transactions:** ~200-500 KB
- **Total recommended cache:** ~1-2 MB (well within AsyncStorage limits)

## Best Practices

### ✅ DO:

- Cache **summary data** for list views (lightweight)
- Cache **full transactions** only when viewed in detail
- Implement **cache expiration** (5-15 minutes)
- Use **optimistic updates** for better UX
- **Invalidate cache** when transaction is updated
- **Limit cache size** (last 50-100 transactions)
- **Clear old cache** on app startup if needed

### ❌ DON'T:

- Don't cache **all transactions** (storage limits)
- Don't cache **indefinitely** (stale data)
- Don't cache **without expiration** strategy
- Don't store **full transactions** in list cache
- Don't **block UI** waiting for cache (use loading states)

## Offline Support

For offline access:

1. Check AsyncStorage first (even if stale)
2. Show "Last synced: X minutes ago" indicator
3. Queue API calls when back online
4. Use React Query or similar for retry logic

## Summary

**Recommended Architecture:**

- **In-Memory:** Zustand/Redux for session cache (20-50 transactions)
- **AsyncStorage:** Summary cache for lists, full cache for recent details (50-100)
- **API:** Always available as fallback, updates caches on success
- **Cache TTL:** 5 minutes for summaries, 15 minutes for full transactions

This approach balances **performance**, **storage efficiency**, and **data freshness** while keeping the architecture simple and maintainable.
