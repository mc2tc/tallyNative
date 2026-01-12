# Inventory Items Group - Plural Handling Bug Fix (RN Sync Required)

## ⚠️ CRITICAL: React Native Team Action Required

**Date:** 2024-12-19  
**Issue:** Bug fix for plural handling - "Cornish Swedes" case not working  
**Status:** Backend fixed, **RN frontend needs to implement the same fix**

## Problem

The grouping of "Cornish Swede (Turnip)" with "Cornish Swedes (Turnips)" was failing because the word "swedes" wasn't being singularized correctly.

**Root Cause:** Words ending in 'es' that don't match the specific pattern (s, x, z, ch, sh before 'es') were being excluded from both the 'es' rule and the 's' removal rule, causing them to remain plural.

## Backend Fix Applied

The backend has been updated with the following fix in `src/app/authenticated/transactions3/api/inventory-items/group/route.ts`.

### Updated `singularizeWord` Function

The key change is in the 'es' handling logic:

```typescript
// Words ending in 'es' after 's', 'x', 'z', 'ch', 'sh' (boxes -> box, dishes -> dish)
if (word.length > 4 && word.endsWith('es')) {
  const beforeEs = word.slice(0, -2);
  if (
    beforeEs.endsWith('s') ||
    beforeEs.endsWith('x') ||
    beforeEs.endsWith('z') ||
    beforeEs.endsWith('ch') ||
    beforeEs.endsWith('sh')
  ) {
    return beforeEs; // Remove 'es' for words like boxes, dishes
  }
  // 🔧 FIX: For words ending in 'es' that don't match the pattern above,
  // remove just the 's' (e.g., swedes -> swede, apples -> apple)
  return word.slice(0, -1);
}

// Words ending in 's' but not 'ss', 'us', 'is', 'es', or already processed endings
// 🔧 FIX: Use length > 3 to avoid breaking short words like "yes", "is", "us"
if (
  word.length > 3 &&  // Changed from > 2 to > 3
  word.endsWith('s') &&
  !word.endsWith('ss') &&
  !word.endsWith('us') &&
  !word.endsWith('is') &&
  !word.endsWith('ies') &&
  !word.endsWith('ves')
) {
  return word.slice(0, -1);
}
```

## Complete Implementation for RN Team

Here's the complete `singularizeWord` function that the RN team should implement:

```typescript
function singularizeWord(word: string): string {
  if (!word || word.length < 2) return word;

  const lowerWord = word.toLowerCase();

  // Common irregular plurals
  const irregular: Record<string, string> = {
    potatoes: 'potato',
    tomatoes: 'tomato',
    heroes: 'hero',
    echoes: 'echo',
    vetoes: 'veto',
  };

  if (irregular[lowerWord]) {
    return irregular[lowerWord];
  }

  // Words ending in 'ies' (cities -> city, berries -> berry)
  if (word.length > 3 && word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }

  // Words ending in 'ves' (leaves -> leaf, knives -> knife, lives -> life)
  if (word.length > 3 && word.endsWith('ves')) {
    // Common irregular cases
    if (lowerWord === 'leaves') return word.slice(0, -5) + 'leaf';
    if (lowerWord === 'knives') return word.slice(0, -5) + 'knife';
    if (lowerWord === 'lives') return word.slice(0, -5) + 'life';
    // Default: remove 'ves' and add 'f' (shelves -> shelf)
    return word.slice(0, -3) + 'f';
  }

  // Words ending in 'es' after 's', 'x', 'z', 'ch', 'sh' (boxes -> box, dishes -> dish)
  if (word.length > 4 && word.endsWith('es')) {
    const beforeEs = word.slice(0, -2);
    if (
      beforeEs.endsWith('s') ||
      beforeEs.endsWith('x') ||
      beforeEs.endsWith('z') ||
      beforeEs.endsWith('ch') ||
      beforeEs.endsWith('sh')
    ) {
      return beforeEs;
    }
    // 🔧 FIX: For words ending in 'es' that don't match the pattern above,
    // remove just the 's' (e.g., swedes -> swede, apples -> apple)
    return word.slice(0, -1);
  }

  // Words ending in 's' but not 'ss', 'us', 'is', 'es', or already processed endings
  // This handles: onions -> onion, apples -> apple (potatoes handled above)
  // 🔧 FIX: Use length > 3 to avoid breaking short words like "yes", "is", "us"
  if (
    word.length > 3 &&
    word.endsWith('s') &&
    !word.endsWith('ss') &&
    !word.endsWith('us') &&
    !word.endsWith('is') &&
    !word.endsWith('ies') &&
    !word.endsWith('ves')
  ) {
    return word.slice(0, -1);
  }

  return word;
}

function singularize(text: string): string {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => singularizeWord(word))
    .join(' ');
}
```

## Test Cases to Verify

Please test the following cases to ensure the fix works:

### ✅ Critical Test Case (The Bug)
```typescript
// This was failing before the fix
const name1 = normalizeNameForMatching('Cornish Swede (Turnip)');
const name2 = normalizeNameForMatching('Cornish Swedes (Turnips)');
// Both should normalize to: "cornish swede"
// They should MATCH: name1 === name2 === true
```

### ✅ Additional Test Cases
```typescript
// All of these should work correctly:
singularizeWord('swedes') === 'swede'      // ✓
singularizeWord('swede') === 'swede'       // ✓
singularizeWord('potatoes') === 'potato'   // ✓
singularizeWord('onions') === 'onion'      // ✓
singularizeWord('berries') === 'berry'     // ✓
singularizeWord('boxes') === 'box'         // ✓
singularizeWord('apples') === 'apple'     // ✓
singularizeWord('yes') === 'yes'           // ✓ (should not change)
singularizeWord('class') === 'class'       // ✓ (should not change)
```

## Expected Behavior

After implementing this fix:

1. **"Cornish Swede (Turnip)"** normalizes to: `"cornish swede"`
2. **"Cornish Swedes (Turnips)"** normalizes to: `"cornish swede"`
3. Both items should be **groupable** when they have the same primary packaging unit

## Verification Steps

1. Implement the updated `singularizeWord` function in the RN codebase
2. Run the test cases above to verify they all pass
3. Test the actual grouping flow with "Cornish Swede (Turnip)" and "Cornish Swedes (Turnips)"
4. Verify that both frontend and backend produce identical normalized strings for the same inputs

## Reference

- Backend implementation: `src/app/authenticated/transactions3/api/inventory-items/group/route.ts`
- Related documentation: `INVENTORY_ITEMS_GROUP_FUZZY_NAME_MATCHING.md`
- Related documentation: `INVENTORY_ITEMS_GROUP_PLURAL_HANDLING_REVIEW.md`

## Questions?

If the RN team has any questions about this implementation or needs clarification, please coordinate with the backend team to ensure both implementations stay in sync.

