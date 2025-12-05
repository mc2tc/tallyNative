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

// Validate Firebase config
function validateFirebaseConfig() {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId']
  const missingFields = requiredFields.filter((field) => !firebaseConfig[field as keyof typeof firebaseConfig])
  
  if (missingFields.length > 0) {
    console.warn('Firebase configuration is missing required fields:', missingFields)
    console.warn('Please set the following environment variables:')
    missingFields.forEach((field) => {
      console.warn(`  - EXPO_PUBLIC_FIREBASE_${field.toUpperCase().replace(/([A-Z])/g, '_$1')}`)
    })
  }
}

validateFirebaseConfig()

let app: FirebaseApp
let auth: Auth

try {
  if (getApps().length === 0) {
    console.log('Initializing Firebase app...')
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    console.log('Firebase initialized successfully')
  } else {
    app = getApps()[0]
    auth = getAuth(app)
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error)
  throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

export { app, auth }

export function getFirebaseAuth() {
  if (!auth) {
    throw new Error('Firebase auth is not initialized. Please check your Firebase configuration.')
  }
  return auth
}

