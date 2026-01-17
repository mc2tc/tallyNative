# Debugging API 500 Error

## The Problem
App launches successfully but shows 500 error when calling API endpoints.

## Understanding the Error

A 500 error means **server-side error**, not a client configuration issue. This suggests:
- The API server is receiving the request
- But something is failing on the server side

## Possible Causes

### 1. API Server Issues
- Server might be down or experiencing issues
- Database connection problems
- Server-side code errors

### 2. Authentication Token Issues
- Firebase token might not be valid for your backend
- Backend might not be properly validating Firebase tokens
- Token format might be incorrect

### 3. Request Format Issues
- Backend might expect different headers
- Request body format might be incorrect
- Query parameters might be malformed

## Debugging Steps

### Step 1: Check What Error You're Seeing

Look for:
- **Exact error message** shown in the app
- **Which screen/action** triggers the error
- **Full URL** being called (check logs)

### Step 2: Test API Endpoint Directly

Test if the API is accessible:

```bash
# Test authentication endpoint (will likely return 401 without auth, which is expected)
curl -X GET https://www.tallyapp.ai/api/auth/claims/refresh

# Test with a Firebase token (you'll need to get one)
curl -X GET https://www.tallyapp.ai/api/auth/claims/refresh \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Step 3: Check Server Logs

Check your backend server logs (Next.js/API server) for:
- Error stack traces
- Database connection errors
- Authentication validation errors

### Step 4: Verify Backend is Running

Make sure your backend at `https://www.tallyapp.ai` is:
- Running and accessible
- Has the API routes deployed
- Database is connected and working

### Step 5: Check Authentication Flow

Verify:
1. User can sign in with Firebase
2. Firebase token is being generated
3. Token is being sent in Authorization header
4. Backend can validate Firebase tokens

### Step 6: Check Network Requests

In the app, check what's being sent:
- What URL is being called?
- What headers are included?
- Is the Authorization header present?

## Common Issues

### Issue: Backend Not Validating Firebase Tokens

**Symptom**: 500 error on authenticated endpoints

**Solution**: Backend needs to verify Firebase tokens. Ensure your Next.js API routes can validate Firebase ID tokens.

### Issue: Database Connection

**Symptom**: 500 error, server logs show database errors

**Solution**: Check database connection and credentials on your deployed backend.

### Issue: CORS/Network Configuration

**Symptom**: Network errors, not 500

**Solution**: Ensure backend allows requests from mobile app.

## Quick Tests

1. **Check if API is reachable**:
   ```bash
   curl https://www.tallyapp.ai/api/auth/claims/refresh
   ```

2. **Check server status**: Visit `https://www.tallyapp.ai` in browser - does it load?

3. **Test with authentication**: Sign in to the web app and see if API calls work there

## Next Steps

1. **Share the exact error message** you see in the app
2. **Check backend logs** for detailed error information
3. **Verify backend deployment** is working correctly
4. **Test API endpoints** directly to isolate the issue


