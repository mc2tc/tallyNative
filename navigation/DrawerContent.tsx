// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { AntDesign } from '@expo/vector-icons'

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
    PointOfSale: activeRouteName === 'PointOfSale',
    CRM_Invoicing: activeRouteName === 'MainTabs' || activeRouteName === 'Invoicing',
    OnlineSales: activeRouteName === 'OnlineSales',
    OnlineBooking: activeRouteName === 'OnlineBooking',
    Payroll: activeRouteName === 'Payroll',
    Expenses: activeRouteName === 'Expenses',
    TimeManagement: activeRouteName === 'TimeManagement',
    Suppliers: activeRouteName === 'Suppliers',
    FinancialServices: activeRouteName === 'FinancialServices',
    VAT: activeRouteName === 'VAT',
    YearEndReporting: activeRouteName === 'YearEndReporting',
  }
  console.log('Item active states:', itemStates)

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.drawerTitle}>Additional Modules</Text>
        {/* Operations Section */}
        <Text style={styles.sectionTitle}>Operations</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="Inventory"
            icon="package-variant"
            active={activeRouteName === 'InventoryManagement'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'InventoryManagement' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => {
              console.log('Inventory pressed, navigating to InventoryManagement')
              props.navigation.navigate('InventoryManagement')
            }}
          />
          <Drawer.Item
            label="Production"
            icon={({ size, color }) => <AntDesign name="product" size={size} color={color} />}
            active={activeRouteName === 'ProductionManagement'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'ProductionManagement' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => {
              console.log('Production pressed, navigating to ProductionManagement')
              props.navigation.navigate('ProductionManagement')
            }}
          />
          <Drawer.Item
            label="Point of Sale"
            icon="cash-register"
            active={activeRouteName === 'PointOfSale'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'PointOfSale' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('PointOfSale')}
          />
        </Drawer.Section>

        {/* Sales & Marketing Section */}
        <Text style={styles.sectionTitle}>Sales & Marketing</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="CRM & Invoicing"
            icon="account-group"
            active={activeRouteName === 'MainTabs' || activeRouteName === 'Invoicing'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, (activeRouteName === 'MainTabs' || activeRouteName === 'Invoicing') ? { backgroundColor: 'transparent' } : undefined]}
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
            label="Online Sales"
            icon="cart"
            active={activeRouteName === 'OnlineSales'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'OnlineSales' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('OnlineSales')}
          />
          <Drawer.Item
            label="Online Booking"
            icon="calendar-clock"
            active={activeRouteName === 'OnlineBooking'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'OnlineBooking' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('OnlineBooking')}
          />
        </Drawer.Section>

        {/* People Section */}
        <Text style={styles.sectionTitle}>People</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="Payroll"
            icon="cash-multiple"
            active={activeRouteName === 'Payroll'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'Payroll' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('Payroll')}
          />
          <Drawer.Item
            label="Expense Management"
            icon="wallet-outline"
            active={activeRouteName === 'Expenses'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'Expenses' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('Expenses')}
          />
          <Drawer.Item
            label="Time Management"
            icon="clock-outline"
            active={activeRouteName === 'TimeManagement'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'TimeManagement' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('TimeManagement')}
          />
        </Drawer.Section>

        {/* Tally Network Section */}
        <Text style={styles.sectionTitle}>Tally Network</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="Suppliers"
            icon="truck-delivery"
            active={activeRouteName === 'Suppliers'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'Suppliers' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('Suppliers')}
          />
          <Drawer.Item
            label="Financial Services"
            icon="bank"
            active={activeRouteName === 'FinancialServices'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'FinancialServices' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => {
              console.log('Financial Services pressed, navigating to FinancialServices')
              console.log('Active state before navigation:', activeRouteName === 'FinancialServices')
              props.navigation.navigate('FinancialServices')
            }}
          />
        </Drawer.Section>

        {/* Tax & Compliance Section */}
        <Text style={styles.sectionTitle}>Tax & Compliance</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="VAT"
            icon="receipt-text"
            active={activeRouteName === 'VAT'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'VAT' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => {
              console.log('VAT pressed, navigating to VAT')
              props.navigation.navigate('VAT')
            }}
          />
          <Drawer.Item
            label="Year End Reporting"
            icon="file-document-outline"
            active={activeRouteName === 'YearEndReporting'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'YearEndReporting' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => {
              console.log('Year End Reporting pressed, navigating to YearEndReporting')
              props.navigation.navigate('YearEndReporting')
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
    paddingTop: 12,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 4,
    paddingHorizontal: 16,
    color: '#999999',
  },
  drawerSection: {
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  drawerItem: {
    paddingVertical: 0,
    minHeight: 40,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    height: 40,
  },
})

