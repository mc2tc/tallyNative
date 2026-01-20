# Firebase App Distribution - Android Guide

This guide provides step-by-step instructions to build and deploy Android apps via Firebase App Distribution using the Firebase CLI.

## Prerequisites

1. **Firebase Project**: Your project must have Firebase configured
2. **EAS CLI**: Installed and authenticated (`npm install -g eas-cli`)
3. **Firebase CLI**: Installed (`npm install -g firebase-tools`)
4. **Google Account**: For Firebase authentication

## Initial Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This opens a browser window to authenticate with your Google account.

### 3. Verify Firebase Project

Check that you can access your Firebase project:

```bash
firebase projects:list
```

Verify the project ID matches the one in `lib/config/firebase.ts` (from `EXPO_PUBLIC_FIREBASE_PROJECT_ID`).

### 4. Register Android App in Firebase Console

If your Android app isn't registered in Firebase yet:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon) > **Your apps** section
4. Click **Add app** > **Android**
5. Enter package name: `com.mc2tc.tallynative`
6. Register the app (you can skip downloading config files for App Distribution)
7. **Note the App ID** shown after registration (you'll need this later)

### 5. Get Your Android App ID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find your Android app and copy the **App ID** (format: `1:xxxxx:android:xxxxx`)

Save this App ID - you'll use it for distribution commands.

## Setting Up Tester Groups

Before distributing builds, set up tester groups:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **App Distribution** (in left sidebar)
4. Go to **Testers & Groups** tab
5. Click **Create group**
6. Name it (e.g., "trusted-testers" or "beta-testers")
7. Add tester email addresses (they must have Google accounts)
8. Click **Create**

Testers will receive an invitation email when you distribute builds to their group.

## Building the Android App

### Update Version (Optional but Recommended)

Update the version in `app.config.js` before building:

```javascript
module.exports = () => ({
  expo: {
    version: '1.0.0',  // Update this
    // ...
  }
})
```

### Build with EAS

Build your Android app using EAS:

```bash
eas build --platform android --profile preview
```

**Note**: The `preview` profile is configured to build APK format (not AAB) in `eas.json`, which works well for Firebase App Distribution.

The build process:
1. Uploads your code to EAS servers
2. Builds the Android app
3. Provides a download link when complete

### Download the Build

After the build completes:

1. Copy the build URL from the terminal output
2. Download the `.apk` file to your local machine
3. Note the file path (e.g., `./builds/tallyNative-preview-1.0.0.apk`)

Alternatively, download from the [EAS Build dashboard](https://expo.dev/accounts/mc2tc/projects/tallynative/builds).

## Distributing via Firebase CLI

### Basic Distribution Command

Once you have the downloaded `.apk` file, distribute it using Firebase CLI:

```bash
firebase appdistribution:distribute path/to/your-app.apk \
  --app YOUR_ANDROID_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0 - Initial release"
```

**Replace**:
- `path/to/your-app.apk` with the actual path to your downloaded APK
- `YOUR_ANDROID_APP_ID` with your Android App ID from Firebase Console
- `"trusted-testers"` with your tester group name
- The release notes with your version notes

### Example

```bash
firebase appdistribution:distribute ./builds/tallyNative-preview-1.0.0.apk \
  --app 1:123456789:android:abcdef123456 \
  --groups "trusted-testers" \
  --release-notes "Fixed login bug, added new dashboard features"
```

### Alternative: Distribute to Individual Testers

Instead of a group, you can distribute to specific email addresses:

```bash
firebase appdistribution:distribute path/to/your-app.apk \
  --app YOUR_ANDROID_APP_ID \
  --testers "tester1@example.com,tester2@example.com" \
  --release-notes "Quick test build"
```

## Using the Distribution Script (Optional)

A helper script is available at `scripts/distribute-firebase.sh`:

```bash
./scripts/distribute-firebase.sh android path/to/build.apk "Release notes" "group-name"
```

Or set environment variables and use shorter syntax:

```bash
export FIREBASE_APP_ID_ANDROID="1:123456789:android:abcdef123456"
./scripts/distribute-firebase.sh android path/to/build.apk "Version 1.0.0"
```

## Complete Workflow Example

Here's a complete example of building and distributing:

```bash
# 1. Update version in app.config.js (manually)

# 2. Build the app
eas build --platform android --profile preview

# 3. Wait for build to complete, then download the APK

# 4. Distribute to Firebase
firebase appdistribution:distribute ./downloads/tallyNative-preview.apk \
  --app 1:123456789:android:abcdef123456 \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.1 - Bug fixes and improvements"

# 5. Verify in Firebase Console
# Go to App Distribution > Releases to see your distributed build
```

## Verifying Distribution

After running the distribution command:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **App Distribution** > **Releases**
4. You should see your newly distributed build
5. Testers will receive email invitations automatically

## Tester Experience

### What Testers Need

1. **Google Account**: Must sign in with the email address you added to the tester group
2. **Firebase App Tester**: Free app from Google Play Store
3. **Android Device**: Physical device (not emulator)

### Tester Installation Steps

1. Receive invitation email from Firebase
2. Click the link in the email
3. Install **Firebase App Tester** from Play Store (if not already installed)
4. Open Firebase App Tester and sign in with their Google account
5. Accept the invitation for your app
6. Download and install the app
7. Receive automatic updates when new builds are distributed to their group

## Troubleshooting

### Build Distribution Fails

- **Check Firebase login**: Run `firebase login` to ensure you're authenticated
- **Verify App ID**: Double-check the App ID in Firebase Console matches what you're using
- **Check file path**: Ensure the APK file path is correct and the file exists
- **Validate file**: Make sure the APK file is not corrupted

### Authentication Errors

- **Regenerate token**: If using CI/CD, run `firebase login:ci` to get a new token
- **Check permissions**: Verify you have App Distribution permissions in Firebase Console
- **Re-login**: Run `firebase logout` then `firebase login` again

### Testers Can't Install

- **Verify invitation**: Check that testers received and accepted the email invitation
- **Firebase App Tester**: Ensure testers have the Firebase App Tester app installed
- **Correct account**: Verify testers are signed in with the Google account matching the email you added
- **Device compatibility**: Check that the build is compatible with their Android version

### App ID Not Found

- **Create app**: If the Android app doesn't exist in Firebase Console, create it first
- **Package name**: Verify the package name matches `com.mc2tc.tallynative` exactly
- **Project selection**: Ensure you're using the correct Firebase project

### Build File Issues

- **File format**: Ensure you're using `.apk` (not `.aab`) for preview builds
- **Download complete**: Verify the APK downloaded completely from EAS
- **File permissions**: Check that the file is readable

## Quick Reference

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# List Firebase projects
firebase projects:list

# Build Android app with EAS
eas build --platform android --profile preview

# Distribute to Firebase App Distribution
firebase appdistribution:distribute path/to/app.apk \
  --app YOUR_ANDROID_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Your release notes here"

# Distribute to individual testers
firebase appdistribution:distribute path/to/app.apk \
  --app YOUR_ANDROID_APP_ID \
  --testers "email1@example.com,email2@example.com" \
  --release-notes "Testing build"

# Using the helper script
export FIREBASE_APP_ID_ANDROID="your-app-id"
./scripts/distribute-firebase.sh android path/to/app.apk "Release notes"
```

## Environment Variables (Optional)

For automation, you can set these environment variables:

```bash
export FIREBASE_APP_ID_ANDROID="1:123456789:android:abcdef123456"
export FIREBASE_TOKEN="your-firebase-ci-token"  # From firebase login:ci
```

These are used by the distribution script if set.

## Next Steps

1. Build your app: `eas build --platform android --profile preview`
2. Download the APK when build completes
3. Distribute: `firebase appdistribution:distribute ...`
4. Testers receive invitations and can install via Firebase App Tester
5. Iterate and distribute new builds as needed!

