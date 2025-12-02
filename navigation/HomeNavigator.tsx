import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import HomeScreen from '../screens/HomeScreen'
import RevenueGrowthScreen from '../screens/RevenueGrowthScreen'
import CashFlowScreen from '../screens/CashFlowScreen'
import NetProfitScreen from '../screens/NetProfitScreen'
import CurrentRatioScreen from '../screens/CurrentRatioScreen'

import type { HealthScoreResponse } from '../lib/api/transactions2'

export type HomeStackParamList = {
  HomeMain: undefined
  RevenueGrowth: {
    healthScore: HealthScoreResponse['data']['healthScore']
  }
  CashFlow: {
    healthScore: HealthScoreResponse['data']['healthScore']
  }
  NetProfit: {
    healthScore: HealthScoreResponse['data']['healthScore']
  }
  CurrentRatio: {
    healthScore: HealthScoreResponse['data']['healthScore']
  }
}

const Stack = createStackNavigator<HomeStackParamList>()

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="RevenueGrowth" component={RevenueGrowthScreen} />
      <Stack.Screen name="CashFlow" component={CashFlowScreen} />
      <Stack.Screen name="NetProfit" component={NetProfitScreen} />
      <Stack.Screen name="CurrentRatio" component={CurrentRatioScreen} />
    </Stack.Navigator>
  )
}

