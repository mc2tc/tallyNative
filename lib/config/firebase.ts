// Firebase configuration and initialization

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

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
  auth = getAuth(app)
} else {
  app = getApps()[0]
  auth = getAuth(app)
}

export { app, auth }

export function getFirebaseAuth() {
  return auth
}

