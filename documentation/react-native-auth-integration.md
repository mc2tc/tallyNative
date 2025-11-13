## React Native Auth Integration Plan

This guide explains how to plug the React Native (RN) app into the new auth flow we built on the Next.js project. The goal is for both apps to share the same Firebase project, server-side APIs, and permissions model. Everything below assumes you’re running against the same Firebase backend and Next.js API routes documented during the web refactor.

---

### 1. High-Level Flow

1. **Client-side Firebase Auth**

   - RN signs in (or signs up) using the standard Firebase Auth SDK.
   - RN retrieves the Firebase ID token from `currentUser.getIdToken()`.

2. **Server interactions via Next.js API routes**

   - ID token is attached as a Bearer token when calling our Next.js routes (owner bootstrap, business creation, invite issuance/acceptance, claim refresh).
   - All privileged writes (creating businesses, invites, etc.) happen on the server; RN never writes directly to Firestore for those actions.

3. **Custom claims + fallback memberships**

   - The `/api/auth/claims/refresh` route returns both the user’s Firebase custom claims **and** a fallback membership map (derived from `businesses/{id}/users/{uid}`).
   - RN uses this response to hydrate local auth state (user, memberships, permissions).

4. **Permission-aware navigation**
   - App navigation is based on `businessUser.role` and the permission array (`view_transactions`, `view_financial_reports`, etc.), replicating the web logic.

---

### 2. React Native Implementation Steps

#### 2.1 Dependencies

- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- HTTP client of choice (`fetch`, `axios`, etc.)
- Optional: local state management (Redux, Zustand, React Context) to persist `businessUser` + `memberships`

#### 2.2 Firebase Setup

1. Use the same Firebase project as the Next.js app.
2. Configure RN Firebase credentials (`google-services.json` for Android, `GoogleService-Info.plist` for iOS).
3. Ensure the RN app has the same auth providers enabled (email/password, Google, etc.).

#### 2.3 Auth Context (RN)

Replicate the shape we use on web:

```ts
type BusinessMembership = {
  role: 'owner' | 'super' | 'other';
  permissions: string[] | 'all';
};

type AuthState = {
  user: FirebaseAuth.User | null;
  businessUser: {
    role: 'owner' | 'super' | 'other';
    businessId?: string;
    permissions: string[];
    email: string;
  } | null;
  memberships: Record<string, BusinessMembership> | null;
  loading: boolean;
  signIn(email, password): Promise<void>;
  signOut(): Promise<void>;
  refreshAuthState(): Promise<void>;
  acceptInvite(inviteId, payload?): Promise<void>;
  createInvite?(...): Promise<string>; // optional if RN will send invites
  createBusiness?(...): Promise<string>;
};
```

- On app start, call `onAuthStateChanged`.
- When a user is present, call `/api/auth/claims/refresh` (see above), hydrate `businessUser` using the returned memberships & Firestore fallbacks (the API already handles the fallback).
- Construct `businessUser.permissions`: owners get `'all'` (use `OWNER_PERMISSIONS` equivalent); other roles use the array provided.

#### 2.4 API Calls from RN

**Token handling**

```ts
const token = await firebase.auth().currentUser?.getIdToken(true);
const response = await fetch(`${NEXT_APP_URL}/api/auth/claims/refresh`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

All Next.js APIs expect this header; you’ll repeat the pattern for:

- `POST /api/auth/bootstrap-owner`
- `POST /api/auth/businesses`
- `POST /api/auth/invites`
- `POST /api/auth/invites/{inviteId}/accept`
- `POST /api/auth/claims/refresh` (already shown)

**Owner bootstrap** (for new signups)

```ts
await fetch('/api/auth/bootstrap-owner', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    owner: { firstName, lastName, email },
    businesses: [businessPayload],
    createPersonalBusiness: true,
  }),
});
```

**Invite acceptance** (for invited users)

```ts
await fetch(`/api/auth/invites/${inviteId}/accept`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ firstName, lastName }),
});
```

After each successful call, invoke `refreshAuthState()` to pull fresh memberships.

#### 2.5 Navigation Rules (mirror web app)

- Owners → `/businesses` (list or add businesses).
- Supers → `/dashboard?businessId=...` (if they have `businessId`).
- Others → First available module they have `view_*` permission for:
  1. `view_transactions` → transactions screen.
  2. `view_financial_reports` → reports screen.
  3. `view_dashboard` → dashboard.
  4. Else → fallback or error screen.

The RN navigation tree should hide or disable screens when the corresponding permission is missing (for example, hide “Financial Reports” unless `view_financial_reports` exists).

---

### 3. Server-Side Summary (for RN dev reference)

- **Next.js APIs used by RN:**

  - `/api/auth/bootstrap-owner` • creates owner + businesses.
  - `/api/auth/businesses` • owner-additional business.
  - `/api/auth/invites` • create invites (owner-only).
  - `/api/auth/invites/{inviteId}/accept` • consume invite, create user doc.
  - `/api/auth/claims/refresh` • returns `claims` + `memberships` map.

- **Firestore rules** rely on `businessMemberships` custom claim or fallback documents. No direct RN writes to Firestore besides reading data allowed by those rules.

- **ENV**
  - Ensure `INVITE_BASE_URL` is set so invite emails point to the correct environment (e.g. `http://localhost:3000` in dev, production URL in prod).
  - RN should call the Next.js instance (e.g. `http://localhost:3000` during local dev, deployed domain otherwise).

---

### 4. Testing Checklist

1. **Owner signup** on RN:

   - Firebase account created, bootstrap API returns 201.
   - RN refreshes claims, owner sees business list.

2. **Invite issuance** (if RN handles it):

   - Owner sends invite via API, invite doc appears in Firestore, email link works.

3. **Invite acceptance**:

   - Invited user signs in on RN, accept API returns 200.
   - Claims refresh contains membership; RN routes to permitted screen.
   - Forbidden routes are hidden or disabled.

4. **Logout / login switch**:
   - `signOut()` clears state; `onAuthStateChanged` unsubscribes and rehydrates on next login.

---

### 5. Notes for Future Integration

- Once custom claims are reliably set via Cloud Functions or Admin SDK hooks, the fallback Firestore scan becomes a safety net rather than the primary source.
- Keep RN and web in sync on permission constants (`OWNER_PERMISSIONS`, module names) to avoid divergence.
- If the RN app eventually needs offline support, cache the `memberships` map locally; but always call `/api/auth/claims/refresh` after a new login, business creation, or invite acceptance.

---

With this structure, the RN project mirrors the web app: all trust boundaries are server-side, permissions are consistent, and your mobile features can grow alongside the Next.js app without diverging auth logic.
