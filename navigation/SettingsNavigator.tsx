import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import SettingsScreen from '../screens/SettingsScreen'
import PlansSelectionScreen from '../screens/PlansSelectionScreen'
import PaymentScreen from '../screens/PaymentScreen'

export type SettingsStackParamList = {
  SettingsMain: undefined
  PlansSelection: undefined
  Payment: { planId: string; planName: string; price: number }
}

const Stack = createStackNavigator<SettingsStackParamList>()

export function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="PlansSelection" component={PlansSelectionScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  )
}
