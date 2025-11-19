# Server Sum Demo Integration

This doc explains how our React Native app can call the new Next.js `sum` endpoint (`/api/admin/sum`) we added in the Tally web project.

## 1. Endpoint Overview

- `POST /api/admin/sum`
- Request body: `{"a": number|string, "b": number|string}`
- Success response:
  ```json
  {
    "result": 5,
    "inputs": { "a": 2, "b": 3 }
  }
  ```
- Error response (HTTP 400):
  ```json
  { "error": "\"a\" must be a finite number" }
  ```

The route also supports `GET /api/admin/sum?a=2&b=3` for quick manual tests.

## 2. Local Testing

Make sure the Next.js dev server is running (`npm run dev`), then:

```bash
curl -X POST http://localhost:3000/api/admin/sum \
  -H "Content-Type: application/json" \
  -d '{"a":2,"b":3}'
```

You should receive:

```json
{ "result": 5, "inputs": { "a": 2, "b": 3 } }
```

## 3. React Native Screen Example

Create `src/screens/SumDemoScreen.tsx` (adjust the path to match your project). Update `BASE_URL` to match the environment the RN app is talking to.

```tsx
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type SumResult = {
  result: number;
  inputs: { a: number; b: number };
};

const BASE_URL = 'http://localhost:3000'; // Update per environment

export default function SumDemoScreen() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SumResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${BASE_URL}/api/admin/sum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a, b }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Request failed');
      }

      setResult(data as SumResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Server Sum Demo</Text>
        <Text style={styles.subtitle}>
          Enter two numbers and we’ll calculate the sum on the server.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>First number</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={a}
            onChangeText={setA}
            placeholder="e.g. 12"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Second number</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={b}
            onChangeText={setB}
            placeholder="e.g. 8"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Calculating…' : 'Calculate Sum'}</Text>
        </TouchableOpacity>

        {error ? <Alert title="Error" message={error} /> : null}

        {result ? (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Server result</Text>
            <Text style={styles.successText}>
              a = {result.inputs.a}, b = {result.inputs.b}
            </Text>
            <Text style={styles.successSum}>Sum: {result.result}</Text>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f8', padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: '#111' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4338ca',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#a5a3f1' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  success: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e7f8ec',
  },
  successTitle: { fontSize: 16, fontWeight: '600', color: '#0f5132' },
  successText: { fontSize: 14, color: '#0f5132', marginTop: 4 },
  successSum: { fontSize: 24, fontWeight: '700', color: '#0f5132', marginTop: 12 },
});
```

## 4. Environment Setup Notes

- Define `EXPO_PUBLIC_API_BASE_URL` in an `.env` file (picked up by Expo) or your CI environment; this feeds `app.config.js` and ends up in `Constants.expoConfig.extra.apiBaseUrl`.
- If the variable is missing, the app falls back to `http://localhost:3000` (good for iOS simulator). Override it for Android emulators (`http://10.0.2.2:3000`), physical devices (your LAN IP), and production (your deployed origin).

## 5. Optional Shared Types

To avoid duplication, consider extracting the request/response interfaces into a small shared package or git submodule that both projects can import. For now, copy the types above directly.

## 6. Testing Checklist

1. Start the Next.js server (`npm run dev`).
2. Launch the React Native app (Expo or bare).
3. Open `SumDemoScreen`.
4. Enter values like `5` and `7`, press **Calculate Sum**.
5. Confirm the success card renders `Sum: 12`.
6. Try invalid input (letters) to confirm errors surface correctly.

## 7. Next Steps

- Wrap the fetch call in your shared API client abstraction if you have one.
- Add client-side validation for better UX.
- Expand this pattern for other server-side calculations you want to expose to mobile.
