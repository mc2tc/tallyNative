# API URL Configuration Guide

This guide explains how to configure your API base URL for different environments (development, preview/testing, production).

## The Problem

Your app currently defaults to `http://localhost:3000` for API calls. This works fine for:
- ✅ Local development (iOS Simulator)
- ✅ Android emulator (using `10.0.2.2:3000`)

But it **won't work** for:
- ❌ Testers' physical devices
- ❌ Preview/production builds
- ❌ Any device not on your local network

## Solution: Environment Variables

Your app is already set up to use the `EXPO_PUBLIC_API_BASE_URL` environment variable. We just need to configure it for different build profiles.

## Configuration Overview

Your `app.config.js` already has this setup:

```javascript
extra: {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
}
```

And `lib/api/client.ts` reads from it:

```typescript
const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl
```

## Setup Steps

### Step 1: Identify Your API URLs

You need to know:
- **Production/Staging API URL**: Where your backend is deployed (e.g., `https://api.yourdomain.com`)
- **Development URL**: `http://localhost:3000` (default, already working)

### Step 2: Set Environment Variables in EAS

For preview builds (testers), set the API URL:

```bash
eas env:create EXPO_PUBLIC_API_BASE_URL preview
```

When prompted:
- **Value**: Enter your production/staging API URL (e.g., `https://api.yourdomain.com`)
- **Visibility**: Choose "Plain text" (API URLs are not sensitive)

For production builds:

```bash
eas env:create EXPO_PUBLIC_API_BASE_URL production
```

Enter your production API URL.

### Step 3: Verify Configuration

List your environment variables:

```bash
eas env:list
```

You should see `EXPO_PUBLIC_API_BASE_URL` for preview and production profiles.

### Step 4: Rebuild

After setting environment variables, rebuild your app:

```bash
eas build --platform android --profile preview
```

The build will now use your configured API URL instead of localhost.

## Alternative: Configure in eas.json

You can also configure environment variables directly in `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com"
      }
    }
  }
}
```

**Note**: Using `eas env:create` is recommended as it keeps secrets out of your repository.

## Testing Different URLs

### For Local Development

No changes needed - the default `localhost:3000` works for simulators/emulators.

If you want to test with a physical device on your network:

1. Find your local IP address:
   ```bash
   # macOS/Linux
   ipconfig getifaddr en0  # or en1, etc.
   
   # Or check System Preferences > Network
   ```

2. Set environment variable locally:
   ```bash
   export EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3000
   expo start
   ```

### For Preview/Testing Builds

Use your staging or production API URL via EAS environment variables (as shown above).

### For Production Builds

Use your production API URL via EAS environment variables.

## Security Considerations

1. **API URLs are not secrets**: They're public endpoints, so "Plain text" visibility is fine
2. **Don't commit API URLs**: Use EAS environment variables, not hardcoded values in `eas.json`
3. **Use HTTPS**: Always use `https://` URLs for production/staging APIs

## Common Issues

### Issue: App still uses localhost after setting env var

**Solution**: 
- Make sure you set the env var for the correct profile (preview/production)
- Rebuild the app after setting the env var
- Check that the env var name is exactly `EXPO_PUBLIC_API_BASE_URL` (case-sensitive)

### Issue: CORS errors

**Solution**: 
- Ensure your backend API allows requests from your app
- For React Native, CORS is less strict, but ensure your backend accepts the requests
- Check that your API URL is correct and accessible

### Issue: Network errors on testers' devices

**Solution**:
- Verify the API URL is publicly accessible (test in a browser)
- Ensure the API uses HTTPS (required for production)
- Check that your backend is deployed and running

## Quick Reference

```bash
# Set API URL for preview builds
eas env:create EXPO_PUBLIC_API_BASE_URL preview

# Set API URL for production builds  
eas env:create EXPO_PUBLIC_API_BASE_URL production

# List all environment variables
eas env:list

# Update an existing env var
eas env:update EXPO_PUBLIC_API_BASE_URL preview

# Delete an env var
eas env:delete EXPO_PUBLIC_API_BASE_URL preview
```

## Next Steps

1. **Determine your API URL**: Where is your backend deployed?
2. **Set the environment variable**: Use `eas env:create` for preview profile
3. **Rebuild**: Create a new preview build
4. **Test**: Verify the app connects to your API
5. **Distribute**: Send to testers via Firebase App Distribution

