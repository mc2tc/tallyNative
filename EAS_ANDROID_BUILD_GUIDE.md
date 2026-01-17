# EAS Android Build Guide

This guide walks you through building your Android app with EAS Build.

## Prerequisites

- ✅ EAS CLI installed (`npm install -g eas-cli`)
- ✅ Logged into EAS (`eas login`)
- ✅ Project configured with `eas.json`

## Initial Setup (First Time Only)

### Step 1: Configure Android Credentials

When building Android apps, EAS needs a keystore to sign your app. On the first build, you'll need to set this up.

Run this command in your terminal:

```bash
eas credentials
```

When prompted:
1. Select **Android** (use arrow keys, Enter to select)
2. Choose **"Set up a new keystore"** or **"Generate a new Android Keystore"**
3. EAS will automatically generate and store the keystore securely

**Recommended**: Let EAS manage the keystore automatically. EAS will:
- Generate a secure keystore
- Store it securely on Expo's servers
- Use it automatically for all future builds
- You don't need to download or manage it locally

### Alternative: Configure via Build Command

You can also let the build command prompt you. Just run the build and answer the prompts:

```bash
eas build --platform android --profile preview
```

When it asks about the keystore, choose to generate a new one.

## Building Your App

### Step 1: Start the Build

Run this command:

```bash
eas build --platform android --profile preview
```

### Step 2: What Happens

1. **EAS checks your project** - Validates configuration
2. **Uploads your code** - Sends your project to EAS servers
3. **Builds in the cloud** - Compiles your Android app (takes 10-20 minutes)
4. **Signs the app** - Uses your keystore to sign the build
5. **Provides download link** - Build completes with a download URL

### Step 3: Monitor Build Progress

While building, you can:

- **Watch the logs**: The build output shows real-time progress
- **Check online**: Visit [expo.dev](https://expo.dev) and go to your project's builds
- **List builds**: Run `eas build:list` to see all builds

### Step 4: After Build Completes

When the build finishes, you'll get:

1. **Build URL**: A link to download your `.aab` (Android App Bundle) file
2. **Build ID**: Unique identifier for this build
3. **QR Code**: Option to scan and install directly on device (if configured)

## Build Output

Android builds produce an **`.aab` file** (Android App Bundle), which is:
- The modern Android distribution format
- Required for Google Play Store
- Can be converted to `.apk` if needed for direct installation

## Common Build Scenarios

### Preview Build (Testing)

```bash
eas build --platform android --profile preview
```

- For testing with testers
- Can install directly on devices
- Not for Play Store submission

### Production Build (Play Store)

```bash
eas build --platform android --profile production
```

- Optimized for Play Store
- Requires production credentials
- Ready for submission

## Next Steps After Build

### Option 1: Distribute via Firebase App Distribution

After your build completes:

1. Download the `.aab` file from the build URL
2. Distribute to testers:

```bash
npm run distribute:firebase android ./path/to/build.aab "Release notes"
```

Or directly:

```bash
firebase appdistribution:distribute ./build.aab \
  --app YOUR_ANDROID_APP_ID \
  --groups "trusted-testers" \
  --release-notes "Version 1.0.0"
```

### Option 2: Install Directly on Device

If you have the build URL, you can:
- Download the `.aab` file
- Convert to `.apk` if needed (using `bundletool`)
- Install via ADB: `adb install app.apk`

### Option 3: Submit to Google Play Store

```bash
eas submit --platform android --latest
```

## Troubleshooting

### Build Fails with Credentials Error

**Solution**: Configure credentials first:
```bash
eas credentials
# Select Android, then generate new keystore
```

### Build Takes Too Long

- Normal build time: 10-20 minutes
- First build is usually slower (sets up environment)
- Check [expo.dev status page](https://status.expo.dev) if unusually slow

### Can't Find Build

List all builds:
```bash
eas build:list
```

View specific build:
```bash
eas build:view [BUILD_ID]
```

### Build Fails with Code Errors

- Check build logs: `eas build:view [BUILD_ID]`
- Review error messages in the output
- Fix code issues and rebuild

### Want to Cancel a Build

Visit [expo.dev](https://expo.dev) > Your Project > Builds > Cancel

## Build Configuration

Your `eas.json` preview profile:

```json
{
  "preview": {
    "distribution": "internal",
    "ios": {
      "simulator": false
    }
  }
}
```

For Android, this means:
- Internal distribution (for testing)
- Real device builds (not emulator)
- Can be installed directly or distributed via Firebase

## Quick Reference

```bash
# Configure credentials (first time)
eas credentials

# Build for Android preview
eas build --platform android --profile preview

# List all builds
eas build:list

# View specific build
eas build:view [BUILD_ID]

# Submit to Play Store (production)
eas submit --platform android --latest

# Distribute via Firebase
firebase appdistribution:distribute build.aab \
  --app APP_ID \
  --groups "trusted-testers" \
  --release-notes "Notes"
```

## Tips

1. **First build is slower**: EAS sets up the build environment
2. **Subsequent builds are faster**: Environment is cached
3. **Monitor builds online**: Easier to track progress
4. **Save build URLs**: Keep track of your builds
5. **Use preview for testing**: Save production builds for store submission

