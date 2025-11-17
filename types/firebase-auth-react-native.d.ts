declare module 'firebase/auth/react-native' {
  import type { FirebaseApp } from 'firebase/app'
  import type { Auth, Persistence } from 'firebase/auth'
  import type AsyncStorage from '@react-native-async-storage/async-storage'

  export function initializeAuth(
    app: FirebaseApp,
    options: { persistence: Persistence | Persistence[] },
  ): Auth

  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence
}


