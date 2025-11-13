// Auth navigator for unauthenticated screens

import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import SignInScreen from '../screens/auth/SignInScreen'
import SignUpScreen from '../screens/auth/SignUpScreen'
import AcceptInviteScreen from '../screens/auth/AcceptInviteScreen'

export type AuthStackParamList = {
  SignIn: undefined
  SignUp: undefined
  AcceptInvite: { inviteToken: string }
}

const Stack = createStackNavigator<AuthStackParamList>()

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AcceptInvite" component={AcceptInviteScreen} />
    </Stack.Navigator>
  )
}

