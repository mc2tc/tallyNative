// Landing screen with arrow button that routes to authenticated or unauthenticated flow

import React from 'react'
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import { useAuth } from '../lib/auth/AuthContext'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { TiemposText } from '../components/TiemposText'

type Props = StackScreenProps<RootStackParamList, 'Landing'>

export default function LandingScreen({ navigation }: Props) {
  const { user, businessUser } = useAuth()

  const handleArrowPress = () => {
    // Navigate based on auth state
    if (user && businessUser) {
      // User is authenticated, go to app
      navigation.replace('App')
    } else {
      // User is not authenticated, go to auth flow
      navigation.replace('Auth')
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/Logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <TiemposText variant="regular" style={styles.tagline}>
        Run smarter.
      </TiemposText>
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={handleArrowPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-forward" size={48} color="#ffffff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  logo: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    width: 266 * 1.3,
    height: 106 * 1.3,
    transform: [{ translateY: -53 }], // Center vertically on the 1/4 mark
  },
  tagline: {
    position: 'absolute',
    top: '47%',
    alignSelf: 'center',
    fontSize: 40,
    color: '#A0A0A0',
    textAlign: 'center',
    transform: [{ translateY: -24 }], // Center vertically on the 1/2 mark
  },
  arrowButton: {
    position: 'absolute',
    top: '75%',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    width: 128 * .75,
    height: 128 * .75,
    borderRadius: 64,
    backgroundColor: '#ECECE7', // Slightly darker than #F5F5F0
    transform: [{ translateY: -64 }], // Center vertically on the 3/4 mark
  },
})

