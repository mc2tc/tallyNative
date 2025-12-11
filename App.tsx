import 'react-native-gesture-handler'
import React from 'react'
import { PaperProvider } from 'react-native-paper'
import { AuthProvider } from './lib/auth/AuthContext'
import { OversightAlertsProvider } from './lib/context/OversightAlertsContext'
import { RootNavigator } from './navigation/RootNavigator'

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <OversightAlertsProvider>
          <RootNavigator />
        </OversightAlertsProvider>
      </AuthProvider>
    </PaperProvider>
  )
}

