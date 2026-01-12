# Inventory Items Group Endpoint - Plural Handling Enhancement

## Update
The frontend fuzzy name matching logic has been enhanced to handle plural/singular variations. The backend has been updated to implement plural handling to ensure consistent matching behavior.

## Sync Status with React Native Frontend

⚠️ **VERIFICATION REQUIRED**: This documentation reflects the **backend implementation** as of the last update. The React Native frontend team should verify that their implementation produces identical normalized strings for the same inputs to ensure consistent matching behavior between frontend and backend.

**Test Cases to Verify:**
1. `"Potato"` and `"Potatoes (Washed)"` should both normalize to `"potato"`
2. `"Onion"` and `"Brown Onions (Large Sacks)"` should both normalize to `"onion"`
3. `"Berry"` and `"Berries"` should both normalize to `"berry"`

If the frontend uses different plural handling rules, coordinate with the backend team to align both implementations.

## Background
This is an enhancement to the existing fuzzy name matching described in `INVENTORY_ITEMS_GROUP_FUZZY_NAME_MATCHING.md`. The frontend now converts plural words to singular form during normalization, allowing items like "Potato" and "Potatoes" to be matched.

## Current Frontend Behavior
The frontend now handles plurals in addition to the existing fuzzy matching logic:
- **Before**: `"Potato"` and `"Potatoes"` would NOT match (different normalized strings)
- **After**: `"Potato"` and `"Potatoes"` both normalize to `"potato"` → **match**

## Example Cases

### Example 1: Potato vs Potatoes
Two items that should now be groupable:

**Item 1:**
- Name: `"Potato"`
- Primary Packaging Unit: `"kg"`

**Item 2:**
- Name: `"Potatoes (Washed)"`
- Primary Packaging Unit: `"kg"`

These items should be groupable because:
1. After normalization (including plural handling), both names become `"potato"` (fuzzy match)
2. Both have the same primary packaging unit (`"kg"`)

### Example 2: Onion vs Onions
**Item 1:**
- Name: `"Onion"`
- Primary Packaging Unit: `"kg"`

**Item 2:**
- Name: `"Brown Onions (Large Sacks)"`
- Primary Packaging Unit: `"kg"`

These items should be groupable because:
1. After normalization, both names become `"onion"` (fuzzy match with plural handling)
2. Both have the same primary packaging unit

### Example 3: Berry vs Berries
**Item 1:**
- Name: `"Berry"`
- Primary Packaging Unit: `"kg"`

**Item 2:**
- Name: `"Berries"`
- Primary Packaging Unit: `"kg"`

These items should be groupable because:
1. After normalization, both names become `"berry"` (fuzzy match with plural handling)
2. Both have the same primary packaging unit

## Updated Frontend Fuzzy Matching Logic

The frontend now normalizes names using the following process (in order):

1. Convert to lowercase and trim whitespace
2. Remove parenthetical content (e.g., `"(Large Sacks)"`, `"(Top-up)"`, `"(Washed)"`)
3. Remove quoted content (e.g., `"Maris Piper"`, `'some text'`) - handles both single and double quotes
4. Remove common descriptive words (see list in `INVENTORY_ITEMS_GROUP_FUZZY_NAME_MATCHING.md`)
5. Normalize whitespace (multiple spaces to single space)
6. **NEW**: Convert plurals to singular form (see plural handling rules below)

### Plural Handling Rules (Backend Implementation)

The plural-to-singular conversion is applied to each word individually after all other normalization steps, in the following order:

1. **Irregular Plurals Dictionary** (checked first)
   - Examples: `potatoes` → `potato`, `tomatoes` → `tomato`, `heroes` → `hero`
   - Handles common irregular English plurals that don't follow standard rules

2. **Words ending in 'ies'** → convert to 'y'
   - Examples: `berries` → `berry`, `cherries` → `cherry`, `cities` → `city`
   - Rule: `word.slice(0, -3) + 'y'` (only if word length > 3)

3. **Words ending in 'ves'** → convert to 'f' or 'fe'
   - Examples: `leaves` → `leaf`, `knives` → `knife`, `lives` → `life`, `shelves` → `shelf`
   - Rule: Special handling for irregular cases, otherwise `word.slice(0, -3) + 'f'` (only if word length > 3)

4. **Words ending in 'es'** → remove 'es' (only after specific letters)
   - Examples: `boxes` → `box`, `dishes` → `dish`, `buses` → `bus`
   - Rule: Only removes 'es' if it follows 's', 'x', 'z', 'ch', or 'sh' (standard English pluralization)
   - Note: `potatoes` is handled by the irregular dictionary, not this rule

5. **Words ending in 's'** → remove 's'
   - Examples: `onions` → `onion`, `apples` → `apple`, `swedes` → `swede`
   - Rule: `word.slice(0, -1)` (only if word length > 2, and not ending in 'ss', 'us', 'is', 'es', 'ies', 'ves')

**Safeguards:**
- Words with length < 2 are not modified (too short to be plurals)
- Words ending in 'ss', 'us', or 'is' are not modified (to avoid breaking non-plural words)
- Words ending in 'es' are only modified if they follow specific letters (s, x, z, ch, sh) and length > 4
- Order matters: irregular plurals are checked first, then specific endings ('ies', 'ves'), then general rules

**Examples:**
- `"Potatoes (Washed)"` → remove parentheses → `"potatoes"` → irregular dictionary → `"potato"`
- `"Brown Onions (Large Sacks)"` → remove parentheses and descriptive words → `"brown onions"` → 's' removal → `"brown onion"`
- `"Sack of "Maris Piper" Potatoes"` → remove quotes and descriptive words → `"potatoes"` → irregular dictionary → `"potato"`
- `"Berries"` → 'ies' rule → `"berry"`
- `"Leaves"` → 'ves' rule → `"leaf"`

## Backend Implementation Status

✅ **COMPLETED**: The `/authenticated/transactions3/api/inventory-items/group` endpoint has been updated with:

1. ✅ **Plural-to-singular conversion** added to the existing fuzzy name matching logic
2. ✅ **Plural handling applied** after all other normalization steps (lowercase, remove parentheses/quotes/descriptive words, normalize whitespace)
3. ✅ **Enhanced plural handling rules** implemented (see Implementation Notes below)

The backend implementation is more sophisticated than the original specification, including:
- Irregular plurals dictionary
- 'ves' ending handling
- More specific 'es' rule (only after certain letters)
- Lower length threshold for 's' removal

⚠️ **Verification Needed**: Please verify that the React Native frontend implementation produces the same normalized strings as the backend for all test cases to ensure consistent matching behavior.

## Implementation Notes

### Backend Implementation (Current)

The backend implementation in `src/app/authenticated/transactions3/api/inventory-items/group/route.ts` uses a more sophisticated plural handling approach:

```typescript
function singularizeWord(word: string): string {
  if (!word || word.length < 2) return word;

  const lowerWord = word.toLowerCase();

  // Common irregular plurals dictionary
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
  }

  // Words ending in 's' but not 'ss', 'us', 'is', or already processed endings
  // This handles: swedes -> swede, onions -> onion, potatoes -> (handled above)
  if (
    word.length > 2 &&
    word.endsWith('s') &&
    !word.endsWith('ss') &&
    !word.endsWith('us') &&
    !word.endsWith('is') &&
    !word.endsWith('es') &&
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

### Key Differences from Original Specification

The backend implementation includes several enhancements beyond the original specification:

1. **Irregular Plurals Dictionary**: Handles words like "potatoes" → "potato" via a dictionary lookup, rather than relying on the 'es' rule
2. **'ves' Handling**: Handles words ending in 'ves' (e.g., "leaves" → "leaf", "shelves" → "shelf")
3. **More Specific 'es' Rule**: Only removes 'es' when it follows 's', 'x', 'z', 'ch', or 'sh' (standard English pluralization patterns)
4. **Lower Length Threshold**: Uses `length > 2` for 's' removal instead of `length > 3`

### Frontend Verification Required

⚠️ **IMPORTANT**: This documentation reflects the **backend implementation**. The React Native frontend team should verify that their implementation matches this behavior to ensure consistent matching between frontend and backend.

If the React Native frontend uses different plural handling rules, the backend implementation may need to be adjusted to match, or vice versa. Please coordinate with the RN team to ensure both implementations produce identical normalized strings for the same input.

## Testing

Please test with the following cases to ensure they can be grouped successfully:

1. **Potato case**: `"Potato"` and `"Potatoes (Washed)"` should match
2. **Onion case**: `"Onion"` and `"Brown Onions (Large Sacks)"` should match
3. **Berry case**: `"Berry"` and `"Berries"` should match
4. **Existing cases**: All existing test cases from `INVENTORY_ITEMS_GROUP_FUZZY_NAME_MATCHING.md` should still work

All cases should normalize to the same core product name (in singular form) and match when they share the same primary packaging unit.

## Reference
- Original fuzzy matching specification: `INVENTORY_ITEMS_GROUP_FUZZY_NAME_MATCHING.md`
- Original endpoint specification: `INVENTORY_ITEMS_GROUP_ENDPOINT.md`

