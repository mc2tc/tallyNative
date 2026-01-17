import 'react-native-gesture-handler'
import React from 'react'
import { PaperProvider } from 'react-native-paper'
import { MD3LightTheme } from 'react-native-paper'
import { DropProvider } from 'react-native-reanimated-dnd'
import { AuthProvider } from './lib/auth/AuthContext'
import { OversightAlertsProvider } from './lib/context/OversightAlertsContext'
import { DrawerCategoryProvider } from './lib/context/DrawerCategoryContext'
import { RootNavigator } from './navigation/RootNavigator'

const customTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#333333',
    secondary: '#666666',
    // Override any purple/violet colors with grayscale
    surfaceVariant: '#f5f5f5',
    onSurfaceVariant: '#666666',
  },
}

export default function App() {
  return (
    <PaperProvider theme={customTheme}>
      <DropProvider>
        <AuthProvider>
          <OversightAlertsProvider>
            <DrawerCategoryProvider>
              <RootNavigator />
            </DrawerCategoryProvider>
          </OversightAlertsProvider>
        </AuthProvider>
      </DropProvider>
    </PaperProvider>
  )
}

