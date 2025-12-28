// Main app navigator with drawer

import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { CustomDrawerContent } from './DrawerContent'
import TestScreen from '../screens/TestScreen'
import FirestoreTestScreen from '../screens/FirestoreTestScreen'
import InventoryManagementScreen from '../screens/InventoryManagementScreen'
import InventoryViewAllScreen from '../screens/InventoryViewAllScreen'
import InventoryItemDetailScreen from '../screens/InventoryItemDetailScreen'
import ManageStockScreen from '../screens/ManageStockScreen'
import EditPackagingScreen from '../screens/EditPackagingScreen'
import PointOfSaleScreen from '../screens/PointOfSaleScreen'
import type { PrimaryPackaging, SecondaryPackaging } from '../lib/api/packaging'
import POSManagementScreen from '../screens/POSManagementScreen'
import AddOneOffItemScreen from '../screens/AddOneOffItemScreen'
import FinancialServicesScreen from '../screens/FinancialServicesScreen'
import InvoiceFinancingScreen from '../screens/InvoiceFinancingScreen'
import OversightChatScreen from '../screens/OversightChatScreen'
import InsightChatScreen from '../screens/InsightChatScreen'
import ProductionManagementScreen from '../screens/ProductionManagementScreen'
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen'
import OnlineSalesScreen from '../screens/OnlineSalesScreen'
import OnlineBookingScreen from '../screens/OnlineBookingScreen'
import TallyNetworkScreen from '../screens/TallyNetworkScreen'
import YearEndReportingScreen from '../screens/YearEndReportingScreen'
import InvoicingScreen from '../screens/InvoicingScreen'
import PayrollScreen from '../screens/PayrollScreen'
import ExpensesScreen from '../screens/ExpensesScreen'
import TimeManagementScreen from '../screens/TimeManagementScreen'
import SuppliersScreen from '../screens/SuppliersScreen'
import TalentScreen from '../screens/TalentScreen'
import VATScreen from '../screens/VATScreen'
import { MainTabNavigator } from './MainTabNavigator'

export type AppDrawerParamList = {
  MainTabs: { screen?: string; params?: any }
  Test: undefined
  FirestoreTest: undefined
  InventoryManagement: undefined
  InventoryViewAll: {
    title: string
    items: Array<{
      id: string
      title: string
      amount: string
      transactionItem?: any
    }>
    section: 'Receiving' | 'Raw Materials' | 'Finished Goods'
    businessId: string
  }
  InventoryItemDetail: {
    item: {
      id: string
      title: string
      amount: string
      currency?: string
      transactionItem?: any
      inventoryItem?: any
      costPerPrimaryPackage?: number
      costPerPrimaryPackagingUnit?: number
      totalPrimaryPackages?: number
      primaryPackagingUnit?: string
      primaryPackagingDescription?: string
      primaryPackagingQuantity?: number
      thirdPartyName?: string
      transactionDate?: number
      reference?: string
    }
    section: 'Receiving' | 'Raw Materials' | 'Finished Goods'
    businessId: string
  }
  ManageStock: { 
    itemName: string
    itemText: string
    businessId: string
    inventoryItemId?: string
    transactionId?: string
    itemIndex?: number
    transactionItem?: any
  }
  EditPackaging: {
    packaging: PrimaryPackaging | SecondaryPackaging
    packagingType: 'primary' | 'secondary'
    onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => void
    manageStockParams?: { itemName: string; itemText: string; businessId: string; inventoryItemId?: string }
  }
  PointOfSale: undefined
  POSManagement: undefined
  AddOneOffItem: undefined
  FinancialServices: undefined
  InvoiceFinancing: undefined
  OversightChat: undefined
  InsightChat: undefined
  ProductionManagement: undefined
  EmployeeManagement: undefined
  OnlineSales: undefined
  OnlineBooking: undefined
  TallyNetwork: undefined
  YearEndReporting: undefined
  Invoicing: undefined
  Payroll: undefined
  Expenses: undefined
  TimeManagement: undefined
  Suppliers: undefined
  Talent: undefined
  VAT: undefined
}

const Drawer = createDrawerNavigator<AppDrawerParamList>()

export function AppNavigator() {
  console.log('AppNavigator: Setting drawer screenOptions')
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
        },
        drawerHideStatusBarOnOpen: false,
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        drawerActiveTintColor: '#333333',
        drawerInactiveTintColor: '#666666',
        drawerActiveBackgroundColor: 'transparent',
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabNavigator} />
      <Drawer.Screen name="Test" component={TestScreen} />
      <Drawer.Screen name="FirestoreTest" component={FirestoreTestScreen} />
      <Drawer.Screen name="InventoryManagement" component={InventoryManagementScreen} />
      <Drawer.Screen name="InventoryViewAll" component={InventoryViewAllScreen} />
      <Drawer.Screen name="InventoryItemDetail" component={InventoryItemDetailScreen} />
      <Drawer.Screen name="ManageStock" component={ManageStockScreen} />
      <Drawer.Screen name="EditPackaging" component={EditPackagingScreen} />
      <Drawer.Screen name="PointOfSale" component={PointOfSaleScreen} />
      <Drawer.Screen name="POSManagement" component={POSManagementScreen} />
      <Drawer.Screen name="AddOneOffItem" component={AddOneOffItemScreen} />
      <Drawer.Screen name="FinancialServices" component={FinancialServicesScreen} />
      <Drawer.Screen name="InvoiceFinancing" component={InvoiceFinancingScreen} />
      <Drawer.Screen name="OversightChat" component={OversightChatScreen} />
      <Drawer.Screen name="InsightChat" component={InsightChatScreen} />
      <Drawer.Screen name="ProductionManagement" component={ProductionManagementScreen} />
      <Drawer.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
      <Drawer.Screen name="OnlineSales" component={OnlineSalesScreen} />
      <Drawer.Screen name="OnlineBooking" component={OnlineBookingScreen} />
      <Drawer.Screen name="TallyNetwork" component={TallyNetworkScreen} />
      <Drawer.Screen name="YearEndReporting" component={YearEndReportingScreen} />
      <Drawer.Screen name="Invoicing" component={InvoicingScreen} />
      <Drawer.Screen name="Payroll" component={PayrollScreen} />
      <Drawer.Screen name="Expenses" component={ExpensesScreen} />
      <Drawer.Screen name="TimeManagement" component={TimeManagementScreen} />
      <Drawer.Screen name="Suppliers" component={SuppliersScreen} />
      <Drawer.Screen name="Talent" component={TalentScreen} />
      <Drawer.Screen name="VAT" component={VATScreen} />
    </Drawer.Navigator>
  )
}

