// Root layout with AuthProvider

import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth/AuthContext'
import { PaperProvider } from 'react-native-paper'

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" />
          <Stack.Screen name="test" />
          <Stack.Screen name="firestoreTest" />
        </Stack>
      </AuthProvider>
    </PaperProvider>
  )
}

