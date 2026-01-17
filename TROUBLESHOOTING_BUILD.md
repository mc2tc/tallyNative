# Troubleshooting Android Build Failure

## Current Issue
Build failed during "Install dependencies" phase.

## Steps to Diagnose

### 1. View Detailed Build Logs

The build logs contain the specific error. View them at:
- **Web**: https://expo.dev/accounts/mc2tc/projects/tallynative/builds/88a66d71-a98b-4e5b-8d4c-9dd6aafef12d
- **CLI**: `eas build:view 88a66d71-a98b-4e5b-8d4c-9dd6aafef12d`

Look for the "Install dependencies" section to see the actual error message.

### 2. Common Issues and Fixes

#### Issue: React Version Compatibility

You're using **React 19.1.0**, but Expo SDK 54 typically uses **React 18.x**. This may cause compatibility issues.

**Fix**: Check if React 19 is compatible, or downgrade to React 18:
- Check Expo SDK 54 documentation for React version requirements
- If needed, update `package.json` to use React 18.x

#### Issue: Package Lock File Issues

**Fix**: Regenerate package-lock.json:
```bash
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json"
```

Then rebuild:
```bash
eas build --platform android --profile preview
```

#### Issue: Dependency Resolution Conflicts

**Fix**: Clear npm cache and reinstall:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Node Version Mismatch

EAS Build uses Node 18.x or 20.x. Check your local Node version:
```bash
node --version
```

If you're using a very new Node version locally, it might work locally but fail on EAS.

### 3. Check Build Logs for Specific Errors

Common error patterns in logs:
- `peer dependency` warnings/errors
- `ENOENT` (file not found) errors
- `network` or `timeout` errors
- Version conflict errors
- Memory/resource errors

### 4. Next Steps

1. **View the build logs** to identify the specific error
2. **Check React version compatibility** with Expo SDK 54
3. **Try the fixes above** based on the error message
4. **Rebuild** after making changes

## Quick Fix Attempts

### Option 1: Regenerate package-lock.json
```bash
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json"
eas build --platform android --profile preview
```

### Option 2: Check React Version
If React 19 is the issue, you may need to use React 18. Check Expo SDK 54 requirements first.

### Option 3: Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
eas build --platform android --profile preview
```

