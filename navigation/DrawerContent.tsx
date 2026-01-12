// Custom drawer content using React Native Paper

import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { Drawer } from 'react-native-paper'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { AntDesign, MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons'

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRouteName = props.state.routeNames[props.state.index]
  const activeRoute = props.state.routes[props.state.index]

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.drawerTitle}>Modules</Text>
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

        {/* Marketing Section */}
        <Text style={styles.sectionTitle}>Marketing</Text>
        <Drawer.Section showDivider={false} style={styles.drawerSection}>
          <Drawer.Item
            label="Web"
            icon={({ size, color }) => <MaterialCommunityIcons name="web" size={size} color={color} />}
            active={activeRouteName === 'OnlineSales'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'OnlineSales' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('OnlineSales')}
          />
          <Drawer.Item
            label="Email"
            icon={({ size, color }) => <MaterialIcons name="alternate-email" size={size} color={color} />}
            active={false}
            rippleColor="#e0e0e0"
            style={styles.drawerItem}
            onPress={() => {
              // TODO: Navigate to Email screen when implemented
            }}
          />
          <Drawer.Item
            label="Social"
            icon={({ size, color }) => <Ionicons name="share-social" size={size} color={color} />}
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
            label="Team"
            icon={({ size, color }) => <AntDesign name="team" size={size} color={color} />}
            active={activeRouteName === 'Team'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'Team' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('Team')}
          />
          <Drawer.Item
            label="Talent"
            icon={({ size, color }) => <MaterialCommunityIcons name="crowd" size={size} color={color} />}
            active={activeRouteName === 'Talent'}
            rippleColor="#e0e0e0"
            style={[styles.drawerItem, activeRouteName === 'Talent' ? { backgroundColor: 'transparent' } : undefined]}
            onPress={() => props.navigation.navigate('Talent')}
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

