## Transactions Purchases Flow on Initial Load

This document focuses on what happens **when `TransactionsScaffoldScreen.tsx` first loads**, with the default section set to **Purchases** internally `activeSection === 'receipts'`. It starts at screen load, then describes the **API call**, the **filtering pipeline**, and how the Purchases sections are built and rendered. 

### Text Summary

- **Determining `businessId` on first load**
  - The screen calls `useAuth()` to read `businessUser` and `memberships`.
  - It collects all membership IDs and prefers a **non‑personal** one: any ID that does not include `"personal"` (case‑insensitive).
  - If `businessUser.businessId` exists and is not marked as personal, that is used; otherwise it falls back to the first suitable membership ID.
  - This resolved `businessId` is used as the key for all subsequent API calls on this screen.

- **Initial Purchases section state**
  - `activeSection` is a `useState` with initial value `'receipts'`, which corresponds to the **Purchases** tab in the UI.
  - On initial render, this means the screen is in “Purchases mode” before any user interaction with the section nav.

- **Transactions API call on focus**
  - A `useFocusEffect` with a `useCallback` runs whenever the screen comes into focus and `businessId` is available.
  - Inside this effect, the screen calls:
    - `transactions2Api.getTransactions(businessId, { page: 1, limit: 200 })`
  - The response’s `transactions` array is stored in the `allTransactions` state, and `loading` is toggled appropriately.
  - This call is intentionally **unfiltered by classification kind** so that the client can apply its own logic for receipts, bank, and cards.

- **Parsing and narrowing to receipt‑style Purchases**
  - The component derives `parsedTransactions` as:
    - `allTransactions.map(tx => ({ original: tx, parsed: parseTransaction(tx) }))`
    - then filters out entries where `parsed` is `null`.
  - `parseTransaction(tx)` inspects:
    - `tx.metadata.capture.source` and `.mechanism` to decide if the transaction looks like a receipt (e.g. purchase invoice OCR or other purchase‑like sources).
    - `tx.metadata.verification.status` to distinguish unverified vs. verified/exception.
    - `tx.metadata.reconciliation.status` and `tx.accounting` to derive `isReportingReady` for verified receipts.
  - Only transactions that satisfy the **receipt criteria** become `TransactionStub` objects; everything else is discarded for the Purchases view.

- **Building the Purchases “Needs verification” column**
  - From `parsedTransactions`, the screen selects items whose underlying `original.metadata.verification.status === 'unverified'`.
  - These entries are sorted by recency:
    - Prefer `updatedAt` from `original.metadata`, falling back to `createdAt` if `updatedAt` is missing.
  - After sorting descending by this timestamp, the list is sliced to the **3 most recent** and transformed to:
    - `needsVerificationTransactions`, each including both the stub and the `originalTransaction`.
  - This array populates the **“Needs verification”** Purchases column when `activeSection === 'receipts'`.

- **Building the Purchases “Verified, needs match” column**
  - From `parsedTransactions`, the screen selects items where:
    - `original.metadata.verification.status` is **not** `'unverified'` (i.e. verified or exception), **and**
    - the stub’s `isReportingReady` flag is **false**.
  - The same recency sort (`updatedAt` then `createdAt`) is applied, and the list is sliced to the **3 most recent**.
  - These items become `verifiedNeedsMatchTransactions`, which fill the **“Verified, needs match”** Purchases column.

- **Building the Purchases “Reporting ready” column**
  - Independently of `parsedTransactions`, the screen scans `allTransactions` again to find **receipt‑style** transactions that are already reporting ready:
    - Confirms the transaction is a receipt using capture metadata (same criteria as `parseTransaction`).
    - Checks `metadata.verification.status` is **not** `'unverified'`.
    - Checks `metadata.reconciliation.status` is one of `matched`, `reconciled`, or `exception`.
  - These matching transactions are sorted by `updatedAt` / `createdAt` descending, then the most recent 3 are kept as `recentReportingReadyReceipts`.
  - This array populates the **“Reporting ready”** Purchases column on initial load.

- **Assembling columns and rendering the default Purchases view**
  - The three arrays above are combined into `receiptColumnsWithData`:
    - Column 1: title `"Needs verification"`, `transactions: needsVerificationTransactions`.
    - Column 2: title `"Verified, needs match"`, `transactions: verifiedNeedsMatchTransactions`.
    - Column 3: title `"Reporting ready"`, `transactions: recentReportingReadyReceipts`.
  - Since `activeSection` is `'receipts'` on first load:
    - `renderSection('receipts', ...)` is called, which returns a `PipelineRow` with `columns={receiptColumnsWithData}`.
    - `PipelineRow` then renders the three Purchases columns using `CardList` for each set of `TransactionStub` items.
  - At this point, without the user doing anything, the screen already shows a **three‑column Purchases pipeline** derived solely from the initial API response and the filtering logic described above.


