# Note for RN team: Multi-currency and trading currency (transactions3)

**Summary:** We’ve aligned transactions3 with the rest of the app on **trading currency** and **foreign exchange**. Receipts from the RN app are now converted to the business’s reporting currency on the server. Below is what changed and what you might need to do (if anything) on the RN side.

---

## What we changed (backend / transactions3)

### 1. Single “trading currency” (primaryCurrency first)

- The app’s **trading currency** is now taken from **BusinessContext.primaryCurrency** first, then `settings.currency` / `location.currency`, then a fallback (GBP or USD depending on flow).
- This is used everywhere in transactions3: OCR receipts, manual purchases, bank/credit card statement transforms, sales, KPIs, and operational alerts.
- So all transaction **summary** and **ledger** amounts are in one reporting currency for the business.

### 2. Receipts in a foreign currency (OCR from RN)

- When a **receipt is in a different currency** than the business (e.g. EUR receipt, GBP business):
  - We **convert** all amounts (total, items, charges, payments, VAT) to the **business currency**.
  - **`summary.currency`** and **`summary.totalAmount`** are always in **business currency**.
  - **Accounting (debits/credits)** are also in **business currency**.
  - We keep an audit in **`details.foreignCurrency`**: original currency, original amount, exchange rate, source (receipt/api/fallback), and converted amount.
- We use the rate on the receipt when present and valid; otherwise we fetch a rate (e.g. Fixer.io) for the transaction date.

### 3. Bank and credit card uploads

- Bank and credit card statement upload routes now load **BusinessContext** and pass **primaryCurrency** into the transforms.
- Statement-derived transactions therefore use the same trading currency as the rest of the app.

### 4. Operational alerts

- Price alerts no longer assume GBP; they use the business’s currency (from primaryCurrency/settings/location).

---

## What RN might need to do

### Display (recommended)

- **List/card/summary:** You can rely on **`summary.currency`** and **`summary.totalAmount`** for all transactions. They are always in the business’s reporting currency, including for receipts that were originally in another currency.
- **“Original” / receipt currency:** If you want to show “Paid 100 EUR (≈ 85 GBP)”, use **`details.foreignCurrency`** when present:
  - `originalCurrency`, `originalAmount`, `exchangeRate`, `convertedAmount`, `exchangeRateSource`, `exchangeRateDate`.
- You do **not** need to do any FX conversion on the client for correctness; the server has already converted and stored amounts in business currency.

### Sending receipt/OCR data to the API

- **No change required** to how you call the transactions3 APIs (e.g. purchase OCR). Existing fields are still used:
  - If the receipt is in a foreign currency, you can send **`currency`**, **`originalCurrency`**, **`originalAmount`**, and optionally **`exchangeRate`** / **`convertedAmount`** / **`exchangeRateSource`** / **`exchangeRateDate`** when you have them.
  - If you don’t send a rate, we’ll look one up by date. If you do send one (e.g. from the receipt), we’ll use it when valid.
- You do **not** need to send “business currency” or “primaryCurrency” from the app; we resolve that on the server from BusinessContext/settings/location.

### Business context / onboarding

- If the RN app has **onboarding or settings** where the user sets their **trading currency**, that should still be written to **BusinessContext** (e.g. via the existing business-context API) as **primaryCurrency**. The backend now uses that consistently for all transactions3 flows.

### Edge cases

- If we can’t get an FX rate (e.g. API failure), we fall back to a 1:1 rate and still store the transaction; **`details.foreignCurrency.exchangeRateSource`** will be **`'fallback'`**. You can show a small “rate unknown” or “rate approximate” note if you like when `exchangeRateSource === 'fallback'`.

---

## Quick reference: transaction shape (unchanged, now consistent)

- **`summary.currency`** – Always the business’s reporting currency.
- **`summary.totalAmount`** – Always in that currency (converted if the receipt was foreign).
- **`details.foreignCurrency`** – Present only when the receipt was in another currency; use for “original amount” and “converted to X” display and for audit.

If you have any flows that assumed **summary** could be in the receipt’s currency (e.g. showing “EUR” from the receipt), switching to **summary.currency** and **summary.totalAmount** plus optional **details.foreignCurrency** for “original” will match the new behaviour.

If anything is unclear or you see mismatches with existing RN behaviour, we can align on the exact fields or add a short “multi-currency” section to the API/contract docs.
