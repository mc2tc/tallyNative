# Android App Installation/Launch Troubleshooting

## App Installs But Won't Open

If your app installs but doesn't open when tapped, here are the most common causes and solutions.

## 1. Use Firebase App Tester (Recommended)

**Important**: For Firebase App Distribution, you should use the Firebase App Tester app, not install the APK directly.

### Steps:
1. Install **"Firebase App Tester"** from Google Play Store
2. Open the Firebase App Tester app
3. Sign in with the Google account that received the Firebase invitation
4. Your app should appear in the list
5. Tap "Install" or "Update" within Firebase App Tester
6. Launch from Firebase App Tester

**Why**: Firebase App Tester handles app updates, crash reporting, and proper installation management.

## 2. Direct APK Installation Issues

If you installed the APK directly (not via Firebase App Tester):

### Check Installation Source Permission
- Go to Settings > Apps > Special access > Install unknown apps
- Find your browser/file manager and enable "Allow from this source"

### Re-download the APK
- The download might be corrupted
- Delete the APK and download again from Firebase

## 3. App Crashes on Launch

If the app opens but immediately closes (crashes), check the logs:

### Using ADB (if you have Android SDK):
```bash
# Connect device via USB (enable USB debugging)
adb logcat | grep -i "tallynative\|ReactNative\|AndroidRuntime"
```

### Using Firebase Crashlytics:
- Check Firebase Console > Crashlytics for crash reports
- These appear automatically if the app has Crashlytics configured

### Common Crash Causes:
- **Missing Firebase configuration**: Check if Firebase is properly configured
- **API connection issues**: App might be trying to connect to API on launch
- **Permissions**: App might need runtime permissions
- **Missing dependencies**: Native modules not properly linked

## 4. Check Device Compatibility

Verify your device meets requirements:
- **Android version**: Check `android/app/build.gradle` for `minSdkVersion`
- **Architecture**: Ensure the APK supports your device's architecture (arm64-v8a, armeabi-v7a, x86, x86_64)

## 5. Clear App Data and Reinstall

1. Settings > Apps > TallyNative
2. Clear Data / Clear Cache
3. Uninstall the app
4. Reinstall via Firebase App Tester

## 6. Check Build Configuration

Verify your build was successful:
```bash
eas build:list --platform android --limit 1
```

Check build logs for any warnings or errors:
- Visit the build URL from `eas build:list`
- Look for any errors during the build process

## 7. Test with Development Build

If the preview build doesn't work, try a development build to get more detailed error messages:

```bash
eas build --platform android --profile development
```

## Quick Checklist

- [ ] Using Firebase App Tester app (not direct APK install)
- [ ] Signed in to Firebase App Tester with correct Google account
- [ ] App appears in Firebase App Tester
- [ ] Device meets Android version requirements
- [ ] Installation source permission enabled
- [ ] Cleared app data and reinstalled
- [ ] Checked crash logs (ADB or Firebase Crashlytics)

## Getting Help

If none of the above works:

1. **Check build logs**: Visit the build URL from `eas build:list`
2. **Check device logs**: Use ADB to see crash details
3. **Try development build**: More detailed error messages
4. **Check Firebase Console**: Look for crash reports in Firebase

