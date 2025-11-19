# Authentication Setup Guide

This guide will help you configure and test the authentication system in the React Native app.

## Prerequisites

1. **Firebase Project**: You need access to the same Firebase project used by the Next.js backend
2. **Next.js API**: The Next.js backend should be running and accessible
3. **Environment Variables**: Firebase configuration values

## Step 1: Configure Firebase

Create a `.env` file in the project root (or add to your existing environment configuration):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

**Where to find these values:**
- Go to Firebase Console → Project Settings → General
- Scroll to "Your apps" section
- If you have a web app, the config is there
- If not, click "Add app" → Web, and copy the config values

**Note:** For Android emulator, you may need to use `http://10.0.2.2:3000` instead of `localhost:3000`

## Step 2: Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

## Step 3: Start the App

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Or scan QR code with Expo Go app

## Step 4: Test Sign Up Flow

1. The app should automatically redirect to the sign-in screen if not authenticated
2. Click "Sign Up" to create a new account
3. Fill in:
   - First Name
   - Last Name
   - Email
   - Password (at least 6 characters)
   - Business Name (optional)
4. Click "Create Account"
5. The app will:
   - Create Firebase Auth account
   - Call `/api/auth/bootstrap-owner` to create owner account
   - Refresh auth claims to get memberships
   - Navigate to home screen

## Step 5: Test Sign In Flow

1. Sign out (if signed in)
2. Enter email and password
3. Click "Sign In"
4. Should navigate to home screen

## Step 6: Test Invite Acceptance

1. Get an invite ID from the Next.js backend (or create one via API)
2. Navigate to: `/(auth)/accept-invite?inviteId=YOUR_INVITE_ID`
3. If not signed in, you'll be prompted to sign in first
4. Enter optional first/last name (or leave blank to use invite data)
5. Click "Accept Invitation"
6. Auth state will refresh and show updated memberships

## Architecture Overview

### File Structure

```
lib/
├── api/
│   ├── client.ts          # Base API client with token injection
│   └── auth.ts            # Auth-specific API calls
├── auth/
│   ├── AuthContext.tsx    # Main auth context provider
│   └── hooks.ts           # Additional auth hooks
├── config/
│   └── firebase.ts        # Firebase initialization
├── types/
│   ├── api.ts             # API contract types
│   └── auth.ts            # Auth state types
└── utils/
    └── permissions.ts     # Permission normalization utilities

app/
├── _layout.tsx            # Root layout with AuthProvider
├── (auth)/
│   ├── _layout.tsx        # Auth routes layout
│   ├── sign-in.tsx        # Sign in screen
│   ├── sign-up.tsx        # Sign up screen
│   └── accept-invite.tsx # Invite acceptance screen
└── index.tsx              # Home screen with auth guard
```

### Key Components

1. **AuthProvider** (`lib/auth/AuthContext.tsx`)
   - Manages authentication state
   - Handles Firebase Auth state changes
   - Provides sign in, sign up, sign out, and invite acceptance
   - Automatically refreshes claims when auth state changes

2. **API Client** (`lib/api/client.ts`)
   - Automatically attaches Firebase ID tokens to all requests
   - Handles errors consistently
   - Uses environment-based API base URL

3. **Permission Utilities** (`lib/utils/permissions.ts`)
   - Normalizes `"all"` permissions to full array for owners
   - Provides permission checking utilities

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"
- Check that your `.env` file has the correct Firebase config values
- Make sure environment variables are prefixed with `EXPO_PUBLIC_`
- Restart the Expo dev server after changing `.env`

### "Network request failed"
- Ensure Next.js backend is running on the expected port
- Check `EXPO_PUBLIC_API_BASE_URL` is correct
- For Android emulator, use `http://10.0.2.2:3000` instead of `localhost:3000`
- For physical device, use your computer's local IP address

### "401 Unauthorized" errors
- Token might be expired - the app should auto-refresh, but try signing out and back in
- Ensure Firebase project matches the Next.js backend project

### "403 Forbidden" on invite acceptance
- Check that the signed-in user's email matches the invite email
- Verify the invite hasn't expired (7 days)
- Check invite status in Firestore

### Auth state not updating
- Check browser/device console for errors
- Verify `/api/auth/claims/refresh` endpoint is working in Next.js
- Try manually calling `refreshAuthState()` from the auth context

## Next Steps

1. **Add Sign Out Button**: Add a sign out button to the home screen
2. **Business List Screen**: Create a screen for owners to see their businesses
3. **Dashboard Screen**: Create dashboard for supers and other roles
4. **Permission-Based Navigation**: Implement navigation based on user permissions
5. **Deep Linking**: Set up deep linking for invite acceptance (e.g., `tallynative://accept-invite?id=...`)

## API Integration Notes

- All API calls automatically include the Firebase ID token
- Token is refreshed automatically when needed
- Error handling follows the contract in `nextjs-api-contract.md`
- The app follows the thin client architecture - all business logic is on the server

## Testing Checklist

- [ ] Sign up with new account
- [ ] Sign in with existing account
- [ ] Sign out
- [ ] Accept invite (with matching email)
- [ ] Try accepting invite with wrong email (should get 403)
- [ ] Try accepting expired invite (should get 410)
- [ ] Verify permissions are normalized correctly (owners get "all" converted to array)
- [ ] Test on both iOS and Android
- [ ] Test with Next.js backend running
- [ ] Test error handling (network errors, API errors)

