# Firebase App Distribution - iOS Guide

This guide provides step-by-step instructions to build and deploy iOS apps via Firebase App Distribution using the Firebase CLI.

## Prerequisites

1. **Firebase Project**: Your project must have Firebase configured
2. **EAS CLI**: Installed and authenticated (`npm install -g eas-cli`)
3. **Firebase CLI**: Installed (`npm install -g firebase-tools`)
4. **Google Account**: For Firebase authentication
5. **Apple Developer Account**: Required for iOS builds (with EAS)

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

### 4. Register iOS App in Firebase Console

If your iOS app isn't registered in Firebase yet:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon) > **Your apps** section
4. Click **Add app** > **iOS**
5. Enter bundle ID: `com.mc2tc.tallynative`
6. Register the app (you can skip downloading config files for App Distribution)
7. **Note the App ID** shown after registration (you'll need this later)

### 5. Get Your iOS App ID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find your iOS app and copy the **App ID** (format: `1:xxxxx:ios:xxxxx`)

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

## Building the iOS App

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

Build your iOS app using EAS:

```bash
eas build --platform ios --profile preview
```

**Note**: The `preview` profile is configured to build for device (not simulator) in `eas.json`, which is required for Firebase App Distribution.

The build process:
1. Uploads your code to EAS servers
2. Builds the iOS app (requires Apple Developer account)
3. Signs the app with your certificates/profiles
4. Provides a download link when complete

**Important**: First-time iOS builds may require setting up:
- Apple Developer account credentials in EAS
- Provisioning profiles and certificates (EAS can manage these automatically)
- Bundle identifier registration in Apple Developer Portal

### Download the Build

After the build completes:

1. Copy the build URL from the terminal output
2. Download the `.ipa` file to your local machine
3. Note the file path (e.g., `./builds/tallyNative-preview-1.0.0.ipa`)

Alternatively, download from the [EAS Build dashboard](https://expo.dev/accounts/mc2tc/projects/tallynative/builds).

## Distributing via Firebase CLI

### Basic Distribution Command

Once you have the downloaded `.ipa` file, distribute it using Firebase CLI:

```bash
firebase appdistribution:distribute path/to/your-app.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0 - Initial release"
```

**Replace**:
- `path/to/your-app.ipa` with the actual path to your downloaded IPA
- `YOUR_IOS_APP_ID` with your iOS App ID from Firebase Console
- `"trusted-testers"` with your tester group name
- The release notes with your version notes

### Example

```bash
firebase appdistribution:distribute ./builds/tallyNative-preview-1.0.0.ipa \
  --app 1:123456789:ios:abcdef123456 \
  --groups "trusted-testers" \
  --release-notes "Fixed login bug, added new dashboard features"
```

### Alternative: Distribute to Individual Testers

Instead of a group, you can distribute to specific email addresses:

```bash
firebase appdistribution:distribute path/to/your-app.ipa \
  --app YOUR_IOS_APP_ID \
  --testers "tester1@example.com,tester2@example.com" \
  --release-notes "Quick test build"
```

## Using the Distribution Script (Optional)

A helper script is available at `scripts/distribute-firebase.sh`:

```bash
./scripts/distribute-firebase.sh ios path/to/build.ipa "Release notes" "group-name"
```

Or set environment variables and use shorter syntax:

```bash
export FIREBASE_APP_ID_IOS="1:123456789:ios:abcdef123456"
./scripts/distribute-firebase.sh ios path/to/build.ipa "Version 1.0.0"
```

## Complete Workflow Example

Here's a complete example of building and distributing:

```bash
# 1. Update version in app.config.js (manually)

# 2. Build the app
eas build --platform ios --profile preview

# 3. Wait for build to complete, then download the IPA

# 4. Distribute to Firebase
firebase appdistribution:distribute ./downloads/tallyNative-preview.ipa \
  --app 1:123456789:ios:abcdef123456 \
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
2. **Firebase App Tester**: Free app from the App Store
3. **iOS Device**: Physical device (not simulator)
4. **iOS Version**: Must be compatible with the build's minimum iOS version

### Tester Installation Steps

1. Receive invitation email from Firebase
2. Click the link in the email
3. Install **Firebase App Tester** from the App Store (if not already installed)
4. Open Firebase App Tester and sign in with their Google account
5. Accept the invitation for your app
6. Download and install the app
7. On first install, may need to trust the developer certificate:
   - Go to Settings > General > VPN & Device Management
   - Tap on your developer certificate
   - Tap "Trust [Certificate Name]"
8. Receive automatic updates when new builds are distributed to their group

## Troubleshooting

### Build Distribution Fails

- **Check Firebase login**: Run `firebase login` to ensure you're authenticated
- **Verify App ID**: Double-check the App ID in Firebase Console matches what you're using
- **Check file path**: Ensure the IPA file path is correct and the file exists
- **Validate file**: Make sure the IPA file is not corrupted

### Authentication Errors

- **Regenerate token**: If using CI/CD, run `firebase login:ci` to get a new token
- **Check permissions**: Verify you have App Distribution permissions in Firebase Console
- **Re-login**: Run `firebase logout` then `firebase login` again

### Testers Can't Install

- **Verify invitation**: Check that testers received and accepted the email invitation
- **Firebase App Tester**: Ensure testers have the Firebase App Tester app installed from App Store
- **Correct account**: Verify testers are signed in with the Google account matching the email you added
- **Trust certificate**: On first install, testers must trust the developer certificate in Settings
- **Device compatibility**: Check that the build is compatible with their iOS version
- **Bundle identifier**: Verify the bundle ID matches exactly

### App ID Not Found

- **Create app**: If the iOS app doesn't exist in Firebase Console, create it first
- **Bundle identifier**: Verify the bundle identifier matches `com.mc2tc.tallynative` exactly
- **Project selection**: Ensure you're using the correct Firebase project

### Build File Issues

- **File format**: Ensure you're using `.ipa` (not `.app` or `.xcarchive`) for distribution
- **Download complete**: Verify the IPA downloaded completely from EAS
- **File permissions**: Check that the file is readable
- **Code signing**: Ensure the build was properly signed (EAS handles this automatically)

### iOS Build Issues

- **Apple Developer account**: Verify you have an active Apple Developer account configured in EAS
- **Certificates**: Check that EAS has access to your certificates/profiles
- **Bundle identifier**: Ensure `com.mc2tc.tallynative` is registered in your Apple Developer account
- **Provisioning**: Verify provisioning profiles are set up correctly (EAS can manage this)

## Quick Reference

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# List Firebase projects
firebase projects:list

# Build iOS app with EAS
eas build --platform ios --profile preview

# Distribute to Firebase App Distribution
firebase appdistribution:distribute path/to/app.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Your release notes here"

# Distribute to individual testers
firebase appdistribution:distribute path/to/app.ipa \
  --app YOUR_IOS_APP_ID \
  --testers "email1@example.com,email2@example.com" \
  --release-notes "Testing build"

# Using the helper script
export FIREBASE_APP_ID_IOS="your-app-id"
./scripts/distribute-firebase.sh ios path/to/app.ipa "Release notes"
```

## Environment Variables (Optional)

For automation, you can set these environment variables:

```bash
export FIREBASE_APP_ID_IOS="1:123456789:ios:abcdef123456"
export FIREBASE_TOKEN="your-firebase-ci-token"  # From firebase login:ci
```

These are used by the distribution script if set.

## iOS-Specific Considerations

### Code Signing

- EAS Build automatically manages code signing for iOS
- First build may prompt for Apple Developer account credentials
- EAS creates and manages certificates and provisioning profiles
- For device builds, EAS uses ad-hoc or development provisioning

### Device Compatibility

- Firebase App Distribution requires device builds (not simulator builds)
- The `preview` profile in `eas.json` is configured with `"simulator": false`
- Builds are signed for real devices, not simulators

### Developer Certificate Trust

- Testers installing via Firebase App Distribution must trust the developer certificate
- On first launch, iOS will prompt to trust the certificate in Settings
- This is a one-time process per certificate

### Bundle Identifier

- Must match exactly: `com.mc2tc.tallynative`
- Must be registered in your Apple Developer account
- Must match the Firebase iOS app registration

## Comparison: Firebase vs TestFlight

### Firebase App Distribution (This Guide)

- ✅ **Faster**: No Apple review process, instant distribution
- ✅ **Both platforms**: Works for iOS and Android the same way
- ✅ **Simple setup**: Easy tester management
- ✅ **Analytics**: Built-in crash reporting and analytics
- ❌ **Requires Google account**: Testers need Google accounts
- ❌ **Certificate trust**: Testers must trust developer certificate

### TestFlight (Alternative)

- ✅ **Official Apple process**: Preview of App Store experience
- ✅ **No account required**: Testers just need Apple ID
- ✅ **App Store integration**: Part of the official distribution flow
- ❌ **Slower**: Beta review for external testers (24-48 hours)
- ❌ **iOS only**: Need separate solution for Android

**Recommendation**: Use both - Firebase for rapid testing and TestFlight for final validation.

## Next Steps

1. Build your app: `eas build --platform ios --profile preview`
2. Download the IPA when build completes
3. Distribute: `firebase appdistribution:distribute ...`
4. Testers receive invitations and can install via Firebase App Tester
5. Testers trust the developer certificate on first install
6. Iterate and distribute new builds as needed!

