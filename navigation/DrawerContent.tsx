// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRouteName = props.state.routeNames[props.state.index]
  const activeRoute = props.state.routes[props.state.index]
  
  // Debug logging
  console.log('=== Drawer Debug ===')
  console.log('Active route name:', activeRouteName)
  console.log('State index:', props.state.index)
  console.log('Active route object:', activeRoute ? { name: activeRoute.name, key: activeRoute.key, state: activeRoute.state } : 'null')
  console.log('All route names:', props.state.routeNames)
  console.log('State routes:', props.state.routes.map(r => ({ name: r.name, key: r.key })))
  
  // Check each item's active state
  const itemStates = {
    Inventory: activeRouteName === 'InventoryManagement',
    Production: activeRouteName === 'ProductionManagement',
    CRM: activeRouteName === 'MainTabs',
    Employees: activeRouteName === 'EmployeeManagement',
    OnlineSales: activeRouteName === 'OnlineSales',
    OnlineBooking: activeRouteName === 'OnlineBooking',
    PointOfSale: activeRouteName === 'PointOfSale',
    TallyNetwork: activeRouteName === 'TallyNetwork',
    FinancialServices: activeRouteName === 'FinancialServices',
  }
  console.log('Item active states:', itemStates)

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Drawer.Section title="Premium Modules" showDivider={false}>
          <Drawer.Item
            label="Inventory"
            icon="package-variant"
            active={activeRouteName === 'InventoryManagement'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'InventoryManagement' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => {
              console.log('Inventory pressed, navigating to InventoryManagement')
              props.navigation.navigate('InventoryManagement')
            }}
          />
          <Drawer.Item
            label="Production"
            icon="chart-timeline-variant"
            active={activeRouteName === 'ProductionManagement'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'ProductionManagement' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => {
              console.log('Production pressed, navigating to ProductionManagement')
              props.navigation.navigate('ProductionManagement')
            }}
          />
          <Drawer.Item
            label="CRM"
            icon="account-group"
            active={activeRouteName === 'MainTabs'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'MainTabs' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => {
              props.navigation.navigate('MainTabs', {
                screen: 'Transactions',
                params: {
                  screen: 'SalesPipeline',
                },
              })
            }}
          />
          <Drawer.Item
            label="Employees"
            icon="account-supervisor"
            active={activeRouteName === 'EmployeeManagement'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'EmployeeManagement' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => props.navigation.navigate('EmployeeManagement')}
          />
          <Drawer.Item
            label="Online Sales"
            icon="cart"
            active={activeRouteName === 'OnlineSales'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'OnlineSales' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => props.navigation.navigate('OnlineSales')}
          />
          <Drawer.Item
            label="Online Booking"
            icon="calendar-clock"
            active={activeRouteName === 'OnlineBooking'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'OnlineBooking' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => props.navigation.navigate('OnlineBooking')}
          />
          <Drawer.Item
            label="Point of Sale"
            icon="cash-register"
            active={activeRouteName === 'PointOfSale'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'PointOfSale' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => props.navigation.navigate('PointOfSale')}
          />
          <Drawer.Item
            label="Tally Network"
            icon="account-network"
            active={activeRouteName === 'TallyNetwork'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'TallyNetwork' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => props.navigation.navigate('TallyNetwork')}
          />
          <Drawer.Item
            label="Financial Services"
            icon="bank"
            active={activeRouteName === 'FinancialServices'}
            rippleColor="#e0e0e0"
            style={activeRouteName === 'FinancialServices' ? { backgroundColor: 'transparent' } : undefined}
            onPress={() => {
              console.log('Financial Services pressed, navigating to FinancialServices')
              console.log('Active state before navigation:', activeRouteName === 'FinancialServices')
              props.navigation.navigate('FinancialServices')
            }}
          />
        </Drawer.Section>
      </View>
    </DrawerContentScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 20,
  },
})

