## Add Transaction Flow for Purchases

This document explains what happens **when `AddTransactionScreen.tsx` is used from the Purchases pipeline**,  
for example when the user taps **“Add”** while the Transactions scaffold is in the **Purchases** section.

### Determining context and businessId

- **Navigation context**
  - `AddTransactionScreen` can be reached from both the `TransactionsStack` and the `ScaffoldStack` as route name `AddTransaction`.
  - The screen receives an optional `context` object via route params:
    - When launched from the Purchases section, `context.pipelineSection` is set to `'receipts'`.
    - For future use, context can also contain:
      - `bankAccountId` when launched from a specific bank account.
      - `cardId` when launched from a specific credit card.

- **Deriving `businessId`**
  - The screen calls `useAuth()` to get `businessUser` and `memberships`.
  - It then computes `businessId` with the same preference logic used by the Transactions scaffold:
    - Collect all membership IDs from `memberships`.
    - Find `nonPersonalMembershipId` as the **first membership ID** that does **not** contain `"personal"` (case‑insensitive).
    - If `businessUser.businessId` exists and is not a “personal” ID, use that.
    - Otherwise, fall back to `nonPersonalMembershipId`, or as a last resort the **first membership ID**.
  - This `businessId` is required to upload files and create transactions; if it is missing, the user is prompted to sign in or select a business.

- **Screen‑level state used during capture**
  - `busy`: boolean flag to disable actions while an upload or API call is in progress.
  - `lastImageUri`: string URI of the most recently chosen or captured file, used for preview.
  - `resultSummary`: short status text (e.g. “Created transaction XYZ”) shown after a successful create.
  - `canCapture`: derived flag that is `true` only when `businessId` exists and `busy` is `false`; this controls button enablement.

### Determining transaction type from Purchases context

- The helper `getTransactionType()` maps the incoming context to an internal transaction type string:
  - If `context.pipelineSection` is `'receipts'`, it returns `'purchase'`.
  - If there is **no context**, it also defaults to `'purchase'`, so Add Transaction used in isolation behaves like a Purchases capture by default.
  - Other sections map to:
    - `'sales'` -> `'sale'`
    - `'bank'` -> `'bank_transaction'`
    - `'cards'` -> `'credit_card_transaction'`
    - `'internal'` -> `'internal'`
  - For this Purchases‑focused iteration we care primarily about the `'purchase'` branch and the default fallback.

### Uploading a Purchases receipt and creating a transaction

- **Common handling path**
  - `handleAsset(asset, actionType, isPdf = false)` contains the shared workflow for image and file selection:
    - Validates `businessId` and `asset.uri`.
    - Persists `asset.uri` into `lastImageUri` for on‑screen preview.
    - Calls `uploadReceiptAndGetUrl({ businessId, localUri, fileNameHint, contentType })` to store the receipt and obtain a `downloadUrl`.
    - Calls `getTransactionType()` to choose the correct `transactionType` for the current context:
      - In Purchases, this yields `'purchase'`.
    - Derives `inputMethod`:
      - `'ocr_image'` for image uploads.
      - `'ocr_pdf'` when a PDF is selected.
    - Invokes `transactions2Api.createTransaction` with a **simple JSON payload**:
      - **`businessId`**: the resolved business identifier for the current user.
      - **`transactionType`**: here always `'purchase'` when called from Purchases (or when no context is provided).
      - **`inputMethod`**:
        - `'ocr_image'` when the user chose or captured an image.
        - `'ocr_pdf'` when the user chose a PDF file.
      - **`fileUrl`**: the public or signed URL returned by `uploadReceiptAndGetUrl`, pointing to the uploaded receipt file.
  - Conceptually, for Purchases the request body looks like:

```markdown
{
  businessId: "<business-id>",
  transactionType: "purchase",
  inputMethod: "ocr_image" | "ocr_pdf",
  fileUrl: "<url-to-uploaded-receipt>"
}
```

- The API response is interpreted as:
    - If `response.success` is true:
      - The screen sets `resultSummary` to a short success message containing `response.transactionId`.
      - This transaction will later appear in the Transactions scaffold once fetched and processed by OCR/verification.
    - If `response.logged` is true:
      - The user sees a “Not Yet Available” alert explaining that this combination of transaction type and input method is not yet implemented, but the request has been logged.
    - Otherwise:
      - An error is thrown and displayed in an “Error” alert to the user.

- **User actions that feed into `handleAsset`**
  - **Choose photo**
    - Uses `launchImageLibrary` with `mediaType: 'photo'`, `selectionLimit: 1`.
    - On success, passes the first asset to `handleAsset(asset, 'choose-photo')`.
  - **Take photo**
    - Uses `launchCamera` with `mediaType: 'photo'`, `saveToPhotos: true`.
    - On success, passes the first asset to `handleAsset(asset, 'take-photo')`.
  - **Choose from files**
    - Uses `DocumentPicker.getDocumentAsync` with a broad file type filter.
    - Validates that the selection is either an **image** or a **PDF** based on MIME type and file extension.
    - Uploads the file, then calls `transactions2Api.createTransaction` with `inputMethod` set according to whether the file is an image or a PDF.

### Purchases‑specific behavior and constraints

- **Purchases label and context display**
  - When `context.pipelineSection === 'receipts'`, the screen shows a context label “Purchases” at the top, reinforcing that the Add Transaction action is scoped to the Purchases pipeline.
  - This mirrors how the Transactions scaffold passes context so that Add Transaction knows which type of transaction the user is adding.

- **Available ingestion methods for Purchases**
  - For Purchases, all of the following buttons are available (subject to `canCapture`):
    - **Choose photo**
    - **Take photo**
    - **Choose from files**
    - **Manual input** (placeholder, currently shows a “coming soon” alert)
    - **Send via email** (placeholder, “coming soon” alert)
  - Bank‑specific options (such as “Connect to Bank”) are only shown when `context.pipelineSection === 'bank'`, not for Purchases.

- **Manual and email ingestion placeholders**
  - `handleManualInput`:
    - Resolves `transactionType` via `getTransactionType()` and currently shows an alert stating that manual input for that type is coming soon.
    - Includes commented guidance on how a future implementation would call `transactions2Api.createTransaction` with `inputMethod: 'manual'`.
  - `handleEmailIngestion`:
    - Shows an informational alert explaining that email‑based ingestion of receipts and statements is planned, using a dedicated forwarding address.

### How this integrates back into the Purchases pipeline

- From the user’s perspective:
  - Starting in the Transactions scaffold on the **Purchases** section, tapping **Add** opens `AddTransactionScreen` with `context.pipelineSection === 'receipts'`.
  - The user selects an ingestion method such as “Take photo” or “Choose from files”.
  - The screen uploads the file, calls `transactions2Api.createTransaction` with `transactionType: 'purchase'`, and shows a success or error message.
- From the system’s perspective:
  - The new purchase transaction becomes part of the backend’s transaction set for that `businessId`.
  - On the next refresh or focus of the Transactions scaffold, the new transaction will be included in `transactions2Api.getTransactions` results.
  - It will then be classified and appear in one of the Purchases pipeline columns (Needs verification, Verified, needs match, or Reporting ready) according to the logic documented in `transactions-purchases-flow.md`.


