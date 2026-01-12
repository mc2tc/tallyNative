# Inventory Items Group Endpoint - Fuzzy Name Matching Update

## Issue
The frontend has been updated to support fuzzy name matching for grouping inventory items, but the backend endpoint still requires exact name matches. This causes grouping to fail even when items should be groupable according to the new frontend logic.

## Current Behavior
When users drag and drop items to group them:
- **Frontend**: Uses fuzzy name matching and correctly identifies items as matchable
- **Backend**: Rejects the grouping with error: `"Items cannot be grouped: names do not match"`

## Example Cases

### Example 1: Brown Onions
Two items that should be groupable but are currently rejected:

**Item 1:**
- Name: `"Brown Onions (Large Sacks)"`
- Primary Packaging Unit: `"kg"`
- Primary Packaging Description: `"sack"`
- Primary Packaging Quantity: `20`

**Item 2:**
- Name: `"Bulk Brown Onions (Top-up)"`
- Primary Packaging Unit: `"kg"`
- Primary Packaging Description: `"sack"`
- Primary Packaging Quantity: `20`

These items should be groupable because:
1. After normalization, both names become `"brown onions"` (fuzzy match)
2. Both have the same primary packaging unit (`"kg"`)

### Example 2: Potatoes
Two items that should be groupable:

**Item 1:**
- Name: `"Potatoes (Washed)"`
- Primary Packaging Unit: `"kg"` (example)

**Item 2:**
- Name: `"Sack of "Maris Piper" Potatoes"`
- Primary Packaging Unit: `"kg"` (example)

These items should be groupable because:
1. After normalization, both names become `"potatoes"` (fuzzy match)
2. Both have the same primary packaging unit

## Frontend Fuzzy Matching Logic

The frontend normalizes names using the following process:

1. Convert to lowercase and trim whitespace
2. Remove parenthetical content (e.g., `"(Large Sacks)"`, `"(Top-up)"`, `"(Washed)"`)
3. Remove quoted content (e.g., `"Maris Piper"`, `'some text'`) - handles both single and double quotes
4. Remove common descriptive words (see full list below)
5. Normalize whitespace (multiple spaces to single space)

**Descriptive Words to Remove:**
- Size descriptors: `"bulk"`, `"large"`, `"small"`, `"medium"`
- Quantity descriptors: `"top-up"`, `"top up"`
- Packaging terms: `"sack"`, `"sacks"`, `"bag"`, `"bags"`, `"box"`, `"boxes"`, `"pack"`, `"packs"`
- Common articles/prepositions: `"of"`, `"the"`, `"a"`, `"an"`

**Examples:**
- `"Brown Onions (Large Sacks)"` → `"brown onions"`
- `"Bulk Brown Onions (Top-up)"` → `"brown onions"`
- `"Potatoes (Washed)"` → `"potatoes"`
- `"Sack of "Maris Piper" Potatoes"` → `"potatoes"` (removes quotes, "sack", and "of")

## Updated Grouping Rules

Items should be groupable if:
1. **Fuzzy name match**: Normalized names are identical (using the logic above)
2. **Same primary packaging unit**: `primaryPackaging.unit` must match exactly

Items do NOT need to match on:
- Exact name (before normalization)
- Primary packaging description
- Primary packaging quantity

## Requested Backend Changes

Please update the `/authenticated/transactions3/api/inventory-items/group` endpoint to:

1. **Implement the same fuzzy name matching logic** as described above
2. **Update validation** to check:
   - Normalized names match (fuzzy)
   - Primary packaging unit matches exactly
3. **Update error messages** to reflect the new matching criteria

## Reference
- Original endpoint specification: `INVENTORY_ITEMS_GROUP_ENDPOINT.md`
- Current validation (line 72): "Both items must have the same `name`" - this should be updated to use fuzzy matching

## Implementation Notes

The normalization function can be implemented as:

```javascript
function normalizeNameForMatching(name) {
  if (!name) return '';
  
  // Convert to lowercase and trim
  let normalized = name.toLowerCase().trim();
  
  // Remove parenthetical content (e.g., "(Large Sacks)", "(Top-up)", "(Washed)")
  normalized = normalized.replace(/\s*\([^)]*\)/g, '');
  
  // Remove quoted content (e.g., "Maris Piper", 'some text') - handles both single and double quotes
  normalized = normalized.replace(/\s*["'][^"']*["']/g, '');
  
  // Remove common descriptive words that don't affect product identity
  const descriptiveWords = [
    'bulk', 'large', 'small', 'medium', 'top-up', 'top up',
    'sack', 'sacks', 'bag', 'bags', 'box', 'boxes', 'pack', 'packs',
    'of', 'the', 'a', 'an'
  ];
  descriptiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  // Normalize whitespace (multiple spaces to single space)
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}
```

Then compare normalized names:
```javascript
const name1Normalized = normalizeNameForMatching(item1.name);
const name2Normalized = normalizeNameForMatching(item2.name);
const namesMatch = name1Normalized === name2Normalized && name1Normalized.length > 0;
```

### Key Changes from Initial Version:
1. **Added quoted content removal** - Handles both single (`'text'`) and double (`"text"`) quotes
2. **Expanded descriptive words list** - Added packaging terms (sack, bag, box, pack) and common articles (of, the, a, an)
3. **More robust matching** - Can now match items with quoted product names or packaging descriptors

## Testing
Please test with both example cases above to ensure they can be grouped successfully:

1. **Brown Onions case**: `"Brown Onions (Large Sacks)"` and `"Bulk Brown Onions (Top-up)"` should match
2. **Potatoes case**: `"Potatoes (Washed)"` and `"Sack of "Maris Piper" Potatoes"` should match

Both cases should normalize to the same core product name and match when they share the same primary packaging unit.

