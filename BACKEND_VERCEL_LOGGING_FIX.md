# Backend Vercel Logging Issue - Fix Required

## Issue Summary

The mobile app is receiving 500 errors when calling API endpoints. Backend logs show:

```
Error: ENOENT: no such file or directory, mkdir 'logs'
```

This error occurs in the `/authenticated/transactions3/api/kpis` endpoint (and likely other endpoints) when the code tries to create a `logs` directory at runtime.

## Root Cause

**Vercel serverless functions have a read-only filesystem** (except for `/tmp`). The code is attempting to create a `logs/` directory at runtime, which is not allowed in serverless environments.

This is a common issue when code that works locally (where you can create directories) is deployed to serverless platforms.

## Error Details

The error stack trace shows:
- Location: `/var/task/.next/server/chunks/7987.js:22:26251`
- Function: `_createLogDirIfNotExist`
- Affected endpoint: `/authenticated/transactions3/api/kpis`

The error occurs during route handler initialization, preventing the API endpoint from responding.

## Impact

- All API endpoints that use file-based logging fail with 500 errors
- Mobile app cannot load data (e.g., health scores, transactions)
- Authentication works (login succeeds), but data fetching fails

## Solutions

### Option 1: Disable File-Based Logging in Production (Recommended)

Modify your logging configuration to detect serverless environments and use console logging instead:

```javascript
// In your logging configuration file
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME

if (isServerless) {
  // Use console logging or cloud logging service
  // Vercel automatically captures console.log to their logs
  logger = console
} else {
  // Use file-based logging for local development
  logger = winston.createLogger({
    transports: [
      new winston.transports.File({ filename: 'logs/error.log' })
    ]
  })
}
```

### Option 2: Use `/tmp` Directory (Temporary Solution)

If you need file-based logging, use `/tmp` directory which is writable in serverless environments:

```javascript
const logDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? '/tmp/logs'
  : './logs'

// Create directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}
```

**Note**: `/tmp` is ephemeral and cleared between function invocations, so logs won't persist. Use this only if you need temporary file logging.

### Option 3: Use Cloud Logging Service (Best Practice)

For production, use a cloud logging service that doesn't require local file system:

- **Vercel Logs**: Already available - use `console.log`, `console.error`, etc.
- **Logtail / Better Stack**: Cloud logging service
- **Datadog**: APM and logging
- **CloudWatch**: If using AWS

Example:
```javascript
// Use structured logging that goes to Vercel logs
console.log({
  level: 'info',
  message: 'API request',
  endpoint: req.url,
  timestamp: new Date().toISOString()
})
```

## Finding the Problematic Code

The error occurs in code that calls `mkdir` or `mkdirSync` to create a `logs` directory. Look for:

1. **Logging library initialization** (Winston, Pino, etc.)
2. **Custom logging setup** that creates directories
3. **File-based logging configuration**

Search your codebase for:
- `mkdir('logs'`
- `mkdirSync('logs'`
- `createLogDir`
- Logging library initialization files

## Quick Fix Checklist

- [ ] Find where logs directory is being created
- [ ] Add environment detection (`process.env.VERCEL`)
- [ ] Disable file-based logging in serverless environments
- [ ] Use console logging or cloud logging service instead
- [ ] Test locally (should still work)
- [ ] Deploy to Vercel
- [ ] Verify API endpoints work (test `/authenticated/transactions3/api/kpis`)
- [ ] Check Vercel function logs to confirm no errors

## Testing After Fix

1. Test the endpoint that was failing:
   ```bash
   curl -X GET "https://www.tallyapp.ai/authenticated/transactions3/api/kpis?businessId=TEST&timeframe=week" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Check Vercel function logs in the Vercel dashboard

3. Verify mobile app can load data successfully

## Additional Notes

- **Vercel's filesystem**: Read-only except `/tmp`
- **Vercel logs**: Use `console.log` - it's automatically captured
- **Local development**: File-based logging should still work
- **Production**: Must use console logging or cloud services

## Priority

**HIGH** - This blocks all data loading in the mobile app. Users can authenticate but cannot see any data.

## Contact

If you need help locating the problematic code or implementing the fix, let me know!


