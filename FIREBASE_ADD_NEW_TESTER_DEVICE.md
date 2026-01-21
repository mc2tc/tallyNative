# Adding a New Tester Device for Firebase App Distribution (iOS)

This guide documents the step-by-step process for adding a new iOS device to your Firebase App Distribution setup.

## Problem

When Firebase App Distribution prompts you with:
> "To allow your tester to install com.mc2tc.tallynative, update your provisioning profile with the device UDID and then build and redistribute your app."

The new device needs to be:
1. Added to Apple Developer Console
2. Registered with EAS
3. Included in the provisioning profile
4. Built into a new app version
5. Redistributed via Firebase App Distribution

## Prerequisites

- Device UDID from the new tester
- EAS CLI installed and authenticated
- Apple Developer account access
- Firebase App Distribution already set up

## Step-by-Step Process

### Step 1: Add Device to Apple Developer Console (Already Done)

The tester should have provided their device UDID. If not already done:

1. Log into [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles** > **Devices**
3. Click the **+** button to add a new device
4. Enter device name and UDID
5. Save the device

**Note**: This step is typically done by you when the tester provides their UDID.

### Step 2: Register Device with EAS

**Critical**: EAS maintains its own device registry separate from Apple Developer Console. Even if the device is in Apple Developer Portal, you must register it with EAS.

```bash
eas device:create
```

When prompted:
1. Select your Expo account (`mc2tc`)
2. Log in to Apple Developer account (if needed)
3. Choose **"Input - allows you to type in UDIDs (advanced option)"**
4. Enter the device UDID (e.g., `00008150-001E4DA9368A401C`)
5. Enter device name (e.g., `Aaron iPhone 17`)
6. Select device class (iPhone/iPad)
7. Confirm registration

**Verify registration**:
```bash
eas device:list
```

This will show all registered devices including the new one.

### Step 3: Update Provisioning Profile with EAS

Update your EAS credentials to include the new device in the provisioning profile:

```bash
eas credentials -p ios
```

Then:
1. Select build profile: **`preview`** (for Firebase App Distribution)
2. Choose: **"Build Credentials: Manage everything needed to build your project"**
3. Select: **"All: Set up all the required credentials to build your project"**

EAS will detect that the provisioning profile is missing the new device and prompt:
```
The provisioning profile is missing the following devices:
- 00008150-001E4DA9368A401C (iPhone) (Aaron iPhone 17)
Would you like to choose the devices to provision again? › yes
```

4. **Select devices**: Use Space to select/deselect devices
   - **Important**: Select **BOTH** the existing devices AND the new device
   - Both should be checked (◉) before submitting
5. Press Enter to confirm

**Verify update**: The final screen should show:
```
Provisioned devices:
- iPad (UDID: 00008020-001D39823A22402E)
- Aaron iPhone 17 - iPhone (UDID: 00008150-001E4DA9368A401C)
```

### Step 4: Build New Version of the App

Build a new version with the updated provisioning profile:

```bash
eas build --platform ios --profile preview
```

When prompted:
- **iOS app only uses standard/exempt encryption?** → Answer `Y` (yes)

The build will:
- Use the updated provisioning profile with both devices
- Generate a new `.ipa` file signed for all registered devices
- Take 10-20 minutes to complete

### Step 5: Download the Build

After the build completes:

1. **Option 1**: Download from terminal output - EAS provides a download link
2. **Option 2**: Download from [EAS Build Dashboard](https://expo.dev/accounts/mc2tc/projects/tallynative/builds)
   - Find the latest build
   - Click to download the `.ipa` file

Save the `.ipa` file to a convenient location (e.g., `~/Downloads/tallyNative-preview.ipa`)

### Step 6: Distribute via Firebase App Distribution

Distribute the new build to your tester group:

```bash
firebase appdistribution:distribute path/to/your-app.ipa \
  --app YOUR_IOS_APP_ID \
  --groups "your-tester-group" \
  --release-notes "Added support for new tester device"
```

**Replace**:
- `path/to/your-app.ipa` with the actual path to your downloaded IPA
- `YOUR_IOS_APP_ID` with your iOS App ID from Firebase Console (format: `1:xxxxx:ios:xxxxx`)
- `"your-tester-group"` with your tester group name (e.g., `"trusted-testers"`)

**Alternative**: Using the helper script:
```bash
./scripts/distribute-firebase.sh ios path/to/your-app.ipa "Added new tester device"
```

### Step 7: Verify Distribution

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **App Distribution** > **Releases**
4. Verify the new build appears
5. Testers will receive email invitations automatically

## Quick Reference Checklist

- [ ] Device UDID obtained from tester
- [ ] Device added to Apple Developer Console (usually already done)
- [ ] Device registered with EAS: `eas device:create`
- [ ] Device verified in EAS: `eas device:list`
- [ ] Provisioning profile updated: `eas credentials -p ios`
- [ ] Both old and new devices selected in provisioning profile
- [ ] New build created: `eas build --platform ios --profile preview`
- [ ] Build downloaded from EAS dashboard
- [ ] Build distributed via Firebase: `firebase appdistribution:distribute ...`
- [ ] Distribution verified in Firebase Console

## Important Notes

1. **EAS Device Registry**: EAS maintains its own device database. Just adding a device to Apple Developer Console is not enough - you must register it with EAS using `eas device:create`.

2. **Select All Devices**: When updating the provisioning profile, make sure to select **all** devices you want to support, not just the new one. If you only select the new device, existing testers won't be able to install future builds.

3. **New Build Required**: You must build a new version of the app after updating the provisioning profile. The old build won't work for the new device because it was signed with the old profile.

4. **No Manual .mobileprovision Needed**: You don't need to manually handle the `.mobileprovision` file you might download from Apple Developer Portal. EAS handles provisioning profiles automatically when you update credentials.

5. **Device UDID Format**: Device UDIDs are typically formatted like: `00008150-001E4DA9368A401C` (36 characters with hyphens).

## Troubleshooting

### Device Not Showing in EAS Credentials

**Problem**: After registering with `eas device:create`, the device doesn't appear in `eas credentials`.

**Solution**: 
- Make sure you registered the device for the correct Apple Team ID
- Try running `eas credentials -p ios` again - EAS should sync devices automatically
- Verify with `eas device:list` that the device is registered

### Provisioning Profile Still Missing Device

**Problem**: After selecting devices in `eas credentials`, the profile still shows the old device list.

**Solution**:
- Make sure you selected **"All: Set up all the required credentials"** option
- When prompted to select devices, use Space to check both devices before pressing Enter
- Verify both devices show as selected (◉) before submitting

### Build Still Not Working for New Device

**Problem**: Testers still can't install after rebuilding.

**Solution**:
- Verify the provisioning profile includes the device: Check in `eas credentials -p ios`
- Make sure you downloaded the **new** build, not an old one
- Verify the build was created after updating the provisioning profile
- Check that the device UDID matches exactly (case-sensitive)

## Related Documentation

- [Firebase iOS Distribution Guide](./FIREBASE_IOS_DISTRIBUTION.md)
- [Firebase App Distribution Guide](./FIREBASE_APP_DISTRIBUTION_GUIDE.md)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

