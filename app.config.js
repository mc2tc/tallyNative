module.exports = () => ({
  expo: {
    scheme: 'tallynative',
    name: 'tallyNative',
    slug: 'tallynative',
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      bundleIdentifier: 'com.mc2tc.tallynative',
      supportsTablet: true,
    },
    android: {
      package: 'com.mc2tc.tallynative',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
      eas: {
        projectId: '5e59ab19-8416-4ad7-ad83-1afdf6b4df8f',
      },
    },
    owner: 'mc2tc',
    plugins: [
      'expo-web-browser',
    ],
    fonts: [
      './assets/fonts/TiemposText-Regular.otf',
      './assets/fonts/TiemposText-Bold.otf',
      './assets/fonts/TiemposText-Italic.otf',
      './assets/fonts/TiemposText-BoldItalic.otf',
      // Add other Tiempos variants as needed (e.g., TiemposHeadline variants)
    ],
  },
})

