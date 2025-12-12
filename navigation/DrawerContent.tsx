// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRouteName = props.state.routeNames[props.state.index]

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Drawer.Section title="Premium Modules">
          <Drawer.Item
            label="Inventory"
            icon="package-variant"
            active={activeRouteName === 'InventoryManagement'}
            onPress={() => props.navigation.navigate('InventoryManagement')}
          />
          <Drawer.Item
            label="Production"
            icon="chart-timeline-variant"
            active={activeRouteName === 'ProductionManagement'}
            onPress={() => props.navigation.navigate('ProductionManagement')}
          />
          <Drawer.Item
            label="CRM"
            icon="account-group"
            active={activeRouteName === 'MainTabs'}
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
            onPress={() => props.navigation.navigate('EmployeeManagement')}
          />
          <Drawer.Item
            label="Online Sales"
            icon="cart"
            active={activeRouteName === 'OnlineSales'}
            onPress={() => props.navigation.navigate('OnlineSales')}
          />
          <Drawer.Item
            label="Online Booking"
            icon="calendar-clock"
            active={activeRouteName === 'OnlineBooking'}
            onPress={() => props.navigation.navigate('OnlineBooking')}
          />
          <Drawer.Item
            label="Point of Sale"
            icon="cash-register"
            active={activeRouteName === 'PointOfSale'}
            onPress={() => props.navigation.navigate('PointOfSale')}
          />
          <Drawer.Item
            label="Tally Network"
            icon="account-network"
            active={activeRouteName === 'TallyNetwork'}
            onPress={() => props.navigation.navigate('TallyNetwork')}
          />
          <Drawer.Item
            label="Financial Services"
            icon="bank"
            active={activeRouteName === 'FinancialServices'}
            onPress={() => props.navigation.navigate('FinancialServices')}
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

