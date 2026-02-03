import 'react-native-gesture-handler'
import React, { useMemo } from 'react'
import { PaperProvider } from 'react-native-paper'
import { MD3LightTheme } from 'react-native-paper'
import { useFonts } from 'expo-font'
import { View, ActivityIndicator } from 'react-native'
import { DropProvider } from 'react-native-reanimated-dnd'
import { AuthProvider } from './lib/auth/AuthContext'
import { OversightAlertsProvider } from './lib/context/OversightAlertsContext'
import { DrawerCategoryProvider } from './lib/context/DrawerCategoryContext'
import { RootNavigator } from './navigation/RootNavigator'

// Helper function to safely load fonts
function getFontConfig() {
  try {
    return {
      'TiemposText-Regular': require('./assets/fonts/TestTiemposText-Regular-BF66457a50cd521.otf'),
      'TiemposText-Bold': require('./assets/fonts/TestTiemposText-Bold-BF66457a4f03c40.otf'),
      'TiemposText-Italic': require('./assets/fonts/TestTiemposText-RegularItalic-BF66457a50421c2.otf'),
      'TiemposText-BoldItalic': require('./assets/fonts/TestTiemposText-BoldItalic-BF66457a50155b4.otf'),
    }
  } catch (error) {
    // Fonts not found, return empty object
    console.warn('Tiempos fonts not found. Using system fonts. Add font files to assets/fonts/ to enable Tiempos.')
    return {}
  }
}

// Create theme with optional Tiempos fonts
function createTheme(useTiempos: boolean) {
  const baseTheme = {
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

  if (!useTiempos) {
    return baseTheme
  }

  return {
    ...baseTheme,
    fonts: {
      ...MD3LightTheme.fonts,
      // Set Tiempos as the default font family
      default: {
        ...MD3LightTheme.fonts.default,
        fontFamily: 'TiemposText-Regular',
      },
      headlineLarge: {
        ...MD3LightTheme.fonts.headlineLarge,
        fontFamily: 'TiemposText-Regular',
      },
      headlineMedium: {
        ...MD3LightTheme.fonts.headlineMedium,
        fontFamily: 'TiemposText-Regular',
      },
      headlineSmall: {
        ...MD3LightTheme.fonts.headlineSmall,
        fontFamily: 'TiemposText-Regular',
      },
      titleLarge: {
        ...MD3LightTheme.fonts.titleLarge,
        fontFamily: 'TiemposText-Bold',
      },
      titleMedium: {
        ...MD3LightTheme.fonts.titleMedium,
        fontFamily: 'TiemposText-Bold',
      },
      titleSmall: {
        ...MD3LightTheme.fonts.titleSmall,
        fontFamily: 'TiemposText-Bold',
      },
      bodyLarge: {
        ...MD3LightTheme.fonts.bodyLarge,
        fontFamily: 'TiemposText-Regular',
      },
      bodyMedium: {
        ...MD3LightTheme.fonts.bodyMedium,
        fontFamily: 'TiemposText-Regular',
      },
      bodySmall: {
        ...MD3LightTheme.fonts.bodySmall,
        fontFamily: 'TiemposText-Regular',
      },
      labelLarge: {
        ...MD3LightTheme.fonts.labelLarge,
        fontFamily: 'TiemposText-Regular',
      },
      labelMedium: {
        ...MD3LightTheme.fonts.labelMedium,
        fontFamily: 'TiemposText-Regular',
      },
      labelSmall: {
        ...MD3LightTheme.fonts.labelSmall,
        fontFamily: 'TiemposText-Regular',
      },
    },
  }
}

export default function App() {
  const fontConfig = getFontConfig()
  const hasFonts = Object.keys(fontConfig).length > 0
  
  const [fontsLoaded] = useFonts(fontConfig)

  // Create theme based on whether fonts are available and loaded
  const customTheme = useMemo(() => {
    return createTheme(hasFonts && fontsLoaded)
  }, [hasFonts, fontsLoaded])

  // Only show loading indicator if we're actually loading fonts
  if (hasFonts && !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

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

