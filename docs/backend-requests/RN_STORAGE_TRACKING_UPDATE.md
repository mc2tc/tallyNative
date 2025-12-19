# Storage Tracking - RN Update Required

## Issue

Storage usage is not being tracked because `fileSize` is not being sent in the request body.

**Current behavior:** When uploading receipts/invoices, the `fileSize` parameter is missing, so storage tracking is skipped.

## Fix Required

Include `fileSize` (in bytes) in the request body when calling upload endpoints.

### Affected Endpoints

- `POST /authenticated/transactions3/api/purchases/ocr`
- `POST /authenticated/transactions3/api/sales/ocr`
- `POST /authenticated/transactions3/api/bank-statements/upload`
- `POST /authenticated/transactions3/api/credit-card-statements/upload`

### Example Update

**Before:**
```typescript
const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/purchases/ocr`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: businessId,
    fileUrl: fileUrl,
  }),
});
```

**After:**
```typescript
const response = await fetch(`${API_BASE_URL}/authenticated/transactions3/api/purchases/ocr`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    businessId: businessId,
    fileUrl: fileUrl,
    fileSize: file.size, // Add this - file size in bytes
  }),
});
```

### Where to Get fileSize

If you're uploading from a File object:
```typescript
fileSize: file.size
```

If you're uploading from a Blob:
```typescript
fileSize: blob.size
```

If you're uploading from React Native ImagePicker:
```typescript
// After selecting image
const fileSize = response.assets[0].fileSize; // or response.assets[0].size
```

## Impact

- **Without `fileSize`**: Storage usage won't be tracked (other metrics still work)
- **With `fileSize`**: Storage usage will be accurately tracked for billing

## Priority

**Medium** - Storage tracking is optional but recommended for accurate billing. The app will continue to work without it, but usage metrics will be incomplete.

---

**Note:** The `fileSize` parameter is optional - if you can't get the file size, the request will still succeed, but storage won't be tracked for that upload.

