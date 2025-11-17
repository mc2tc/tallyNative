// Firebase configuration and initialization

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth, initializeAuth, type Persistence } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

// firebase/auth v12 does not ship TypeScript types for getReactNativePersistence yet,
// so import it via require and cast the shape.
const { getReactNativePersistence } = require('firebase/auth/react-native') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence
}

// Firebase config - these should come from environment variables
// For now, using placeholder values that need to be configured
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
}

let app: FirebaseApp
let auth: Auth

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  })
} else {
  app = getApps()[0]
  try {
    auth = getAuth(app)
  } catch {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  }
}

export { app, auth }

export function getFirebaseAuth() {
  return auth
}

