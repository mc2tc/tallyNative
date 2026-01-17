# Firebase App Distribution - Quick Start

A quick reference for getting started with Firebase App Distribution.

## Initial Setup (One-Time)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Get your Firebase App IDs**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Project Settings > Your apps
   - If apps don't exist, click "Add app" to create iOS/Android apps
   - Use bundle ID: `com.mc2tc.tallynative`
   - Note your iOS and Android App IDs

4. **Create tester groups**
   - Firebase Console > App Distribution > Testers & Groups
   - Create a group (e.g., "trusted-testers")
   - Add tester email addresses

## Typical Workflow

### 1. Build with EAS

```bash
# For iOS
eas build --platform ios --profile preview

# For Android
eas build --platform android --profile preview
```

### 2. Download the build

Download the build from the EAS dashboard (or it may be in your `builds/` folder if configured).

### 3. Distribute to Firebase

```bash
# Using the helper script
npm run distribute:firebase ios ./path/to/build.ipa "Release notes here"

# Or directly with Firebase CLI
firebase appdistribution:distribute ./build.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0"
```

## Environment Variables (Optional)

Set these for easier automation:

```bash
export FIREBASE_APP_ID_IOS="your-ios-app-id"
export FIREBASE_APP_ID_ANDROID="your-android-app-id"
```

## Quick Commands

```bash
# Login to Firebase
firebase login

# Generate CI token (for automation)
firebase login:ci

# List Firebase projects
firebase projects:list

# Distribute iOS build
firebase appdistribution:distribute build.ipa \
  --app APP_ID \
  --groups "trusted-testers" \
  --release-notes "Notes"

# Distribute Android build
firebase appdistribution:distribute build.aab \
  --app APP_ID \
  --groups "trusted-testers" \
  --release-notes "Notes"
```

## For Testers

Testers will:
1. Receive an email invitation
2. Install "Firebase App Tester" app from App Store/Play Store
3. Accept invitation in the app
4. Download and install your app
5. Receive automatic updates when you distribute new builds

## Full Documentation

See [FIREBASE_APP_DISTRIBUTION_GUIDE.md](./FIREBASE_APP_DISTRIBUTION_GUIDE.md) for complete documentation.

