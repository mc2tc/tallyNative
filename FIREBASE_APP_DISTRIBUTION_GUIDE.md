# Firebase App Distribution Guide

This guide explains how to distribute pre-release versions of your app to trusted testers using Firebase App Distribution, integrated with EAS Build.

## Overview

Firebase App Distribution allows you to:
- Distribute builds to testers quickly (no app review process)
- Manage tester groups easily
- Get crash reports and analytics
- Works for both iOS and Android
- Faster than TestFlight (no Apple review delay for testers)

## Prerequisites

1. **Firebase Project**: You already have Firebase configured for Auth
2. **EAS CLI**: Already installed (used for TestFlight)
3. **Firebase CLI**: Needs to be installed for App Distribution
4. **Tester Access**: Firebase accounts for your testers (can use Google accounts)

## Setup Steps

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window to authenticate with your Firebase/Google account.

### 3. Verify Firebase Project

Check that your Firebase project is correctly configured:

```bash
firebase projects:list
```

Your project ID should match the one in `lib/config/firebase.ts` (from `EXPO_PUBLIC_FIREBASE_PROJECT_ID` environment variable).

### 4. Create Apps in Firebase Console (if needed)

Firebase App Distribution requires you to register your iOS and Android apps in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon) > **Your apps** section
4. If you don't see iOS/Android apps:
   - Click **Add app** > **iOS** (use bundle ID: `com.mc2tc.tallynative`)
   - Click **Add app** > **Android** (use package name: `com.mc2tc.tallynative`)
5. Note the **App IDs** for each platform (you'll need these for distribution)

**Note**: You don't need to download config files or run `firebase init` - App Distribution works directly with the CLI using App IDs.

### 5. Install EAS Build Plugin for Firebase App Distribution

The easiest way is to use EAS Build's built-in support for Firebase App Distribution via the `@expo/eas-build-plugin-firebase-app-distribution` plugin, or use the Firebase CLI in post-build hooks.

For Expo/EAS, we'll use environment variables and build hooks to integrate Firebase App Distribution.

## Configuration

### Update eas.json

Your `eas.json` has been updated to include Firebase App Distribution configuration. The build profiles will automatically distribute builds to Firebase App Distribution after successful builds.

### Environment Variables

You'll need to set these environment variables (in EAS secrets or locally):

```bash
# Firebase App Distribution
FIREBASE_TOKEN=your-firebase-token
FIREBASE_APP_ID_IOS=your-ios-app-id
FIREBASE_APP_ID_ANDROID=your-android-app-id
```

#### Getting Firebase Token

Generate a CI token for automated distribution:

```bash
firebase login:ci
```

This will output a token. Save it securely (use EAS secrets for cloud builds).

#### Getting App IDs

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. You'll see your iOS and Android apps with their App IDs

If you haven't created iOS/Android apps in Firebase yet:
- Click **Add app** > **iOS** or **Android**
- Use your bundle identifier: `com.mc2tc.tallynative`
- Download config files (optional for App Distribution, but recommended)

## Building and Distributing

### Option 1: Using EAS Build with Post-Build Hook (Recommended)

After an EAS build completes, you can automatically distribute to Firebase:

```bash
# Build for iOS
eas build --platform ios --profile preview

# Build for Android  
eas build --platform android --profile preview
```

Then distribute manually using Firebase CLI:

```bash
# For iOS
firebase appdistribution:distribute path/to/build.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0 - Initial release"

# For Android
firebase appdistribution:distribute path/to/build.aab \
  --app YOUR_ANDROID_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0 - Initial release"
```

### Option 2: Using EAS Build with Custom Build Script

You can create a script that builds and distributes automatically. See the scripts section below.

### Option 3: Manual Distribution

1. Build with EAS as usual:
   ```bash
   eas build --platform ios --profile preview
   ```

2. Download the build from EAS dashboard

3. Distribute via Firebase CLI:
   ```bash
   firebase appdistribution:distribute ./build.ipa \
     --app YOUR_IOS_APP_ID \
     --groups "trusted-testers" \
     --release-notes "Your release notes"
   ```

## Setting Up Tester Groups

### Create Tester Groups

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **App Distribution** (in left menu)
4. Go to **Testers & Groups** tab
5. Click **Create group**
6. Name it (e.g., "trusted-testers")
7. Add tester email addresses
8. Testers will receive an invitation email

### Adding Individual Testers

You can also add testers directly to builds without groups:

```bash
firebase appdistribution:distribute build.ipa \
  --app YOUR_APP_ID \
  --testers "tester1@example.com,tester2@example.com" \
  --release-notes "Testing new features"
```

## Automation Scripts

### Quick Distribution Script

Create a script in `package.json` for easy distribution:

```json
{
  "scripts": {
    "distribute:ios": "eas build --platform ios --profile preview && firebase appdistribution:distribute ...",
    "distribute:android": "eas build --platform android --profile preview && firebase appdistribution:distribute ..."
  }
}
```

**Note**: EAS builds are async, so you'll need to download the build first or use EAS webhooks for full automation.

## Workflow Comparison: Firebase vs TestFlight

### Firebase App Distribution
- ✅ **Faster**: No review process, instant distribution
- ✅ **Both platforms**: Works for iOS and Android the same way
- ✅ **Easy setup**: Simple tester management
- ✅ **Analytics**: Built-in crash reporting and analytics
- ✅ **Unlimited testers**: No limits like TestFlight's 10,000
- ❌ **Requires Firebase account**: Testers need Google accounts
- ❌ **No App Store preview**: Different from final distribution process

### TestFlight
- ✅ **Official Apple process**: Preview of App Store experience
- ✅ **No account required**: Testers just need Apple ID
- ✅ **App Store integration**: Part of the official distribution flow
- ❌ **Slower**: Beta review for external testers (24-48 hours)
- ❌ **iOS only**: Need separate solution for Android
- ❌ **Tester limits**: 100 internal, 10,000 external

### Recommendation

Use **both**:
- **Firebase App Distribution**: For rapid testing, early feedback, both platforms
- **TestFlight**: For final pre-release testing, iOS-specific validation

## Version Management

Update version in `app.config.js` before building:

```javascript
module.exports = () => ({
  expo: {
    version: '1.0.0',  // Update for new releases
    // ...
  }
})
```

Firebase App Distribution doesn't enforce version numbers like the App Store, but it's good practice to track versions.

## Tester Experience

### For Testers

1. **Receive invitation email** from Firebase
2. **Click the link** in the email
3. **Install Firebase App Tester app** (iOS/Android) if not already installed
4. **Accept the invitation** in the app
5. **Download and install** your app
6. **Get automatic updates** when you distribute new builds to their group

### Tester Requirements

- **Firebase/Google account**: Testers need to sign in with Google account
- **Firebase App Tester app**: Free app from App Store/Play Store
- **Device**: iOS or Android device (not simulator)

## Troubleshooting

### Build Distribution Fails

- Verify Firebase token is valid: `firebase login:ci` to regenerate
- Check App ID matches Firebase Console
- Ensure you're logged in: `firebase login`
- Verify tester group exists in Firebase Console

### Testers Can't Install

- Verify they received and accepted the invitation email
- Check they have Firebase App Tester app installed
- Ensure they're signed in with the correct Google account
- Verify the build is compatible with their device/OS version

### Authentication Issues

- Regenerate Firebase token: `firebase login:ci`
- Check token hasn't expired (CI tokens don't expire, but user login tokens do)
- Verify project permissions in Firebase Console

### App ID Not Found

- Create the app in Firebase Console if it doesn't exist
- Verify bundle identifier matches (`com.mc2tc.tallynative`)
- Check App ID in Firebase Console > Project Settings > Your apps

## Security Best Practices

1. **Use CI tokens**: For automated builds, use `firebase login:ci` tokens, not user login
2. **Store tokens securely**: Use EAS secrets for cloud builds
3. **Limit tester groups**: Create specific groups for different testing phases
4. **Rotate tokens**: Regenerate CI tokens periodically
5. **Monitor access**: Regularly review tester groups and remove inactive testers

## Quick Reference Commands

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Generate CI token (for automation)
firebase login:ci

# List Firebase projects
firebase projects:list

# Initialize Firebase (if needed)
firebase init

# Distribute iOS build
firebase appdistribution:distribute build.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version notes"

# Distribute Android build
firebase appdistribution:distribute build.aab \
  --app YOUR_ANDROID_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version notes"

# Add tester to group (via Firebase Console recommended)
# Or use: --testers "email1@example.com,email2@example.com"

# Build with EAS (then distribute manually)
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

## Integration with Your Current Workflow

You can use Firebase App Distribution alongside TestFlight:

1. **Early testing**: Use Firebase for rapid iteration
2. **Broader testing**: Use Firebase for larger tester groups
3. **Final validation**: Use TestFlight for final iOS testing
4. **Android testing**: Use Firebase (TestFlight is iOS-only)

Both can run in parallel - distribute the same build to both platforms for comprehensive testing.

## Next Steps

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Create tester groups in Firebase Console
4. Build with EAS: `eas build --platform ios --profile preview`
5. Distribute: `firebase appdistribution:distribute ...`
6. Invite testers and start testing!

