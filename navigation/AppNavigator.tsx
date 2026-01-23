// Main app navigator with drawer

import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { CustomDrawerContent } from './DrawerContent'
import TestScreen from '../screens/TestScreen'
import FirestoreTestScreen from '../screens/FirestoreTestScreen'
import InventoryManagementScreen from '../screens/InventoryManagementScreen'
import InventoryViewAllScreen from '../screens/InventoryViewAllScreen'
import InventoryItemDetailScreen from '../screens/InventoryItemDetailScreen'
import PendingOrdersScreen from '../screens/PendingOrdersScreen'
import PrepareOrdersScreen from '../screens/PrepareOrdersScreen'
import StockTakeScreen from '../screens/StockTakeScreen'
import ManageStockScreen from '../screens/ManageStockScreen'
import EditPackagingScreen from '../screens/EditPackagingScreen'
import CreateProductScreen from '../screens/CreateProductScreen'
import PointOfSaleScreen from '../screens/PointOfSaleScreen'
import type { PrimaryPackaging, SecondaryPackaging } from '../lib/api/packaging'
import POSManagementScreen from '../screens/POSManagementScreen'
import POSEditItemsScreen from '../screens/POSEditItemsScreen'
import POSEditItemScreen from '../screens/POSEditItemScreen'
import AddOneOffItemScreen from '../screens/AddOneOffItemScreen'
import FinancialServicesScreen from '../screens/FinancialServicesScreen'
import InvoiceFinancingScreen from '../screens/InvoiceFinancingScreen'
import OversightChatScreen from '../screens/OversightChatScreen'
import InsightChatScreen from '../screens/InsightChatScreen'
import ProductionManagementScreen from '../screens/ProductionManagementScreen'
import ProductDetailScreen from '../screens/ProductDetailScreen'
import ManufactureScreen from '../screens/ManufactureScreen'
import SkusScreen from '../screens/SkusScreen'
import CreateSkuScreen from '../screens/CreateSkuScreen'
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen'
import TeamScreen from '../screens/TeamScreen'
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
import CommerceGraphScreen from '../screens/CommerceGraphScreen'
import VATScreen from '../screens/VATScreen'
import TaxesComplianceScreen from '../screens/TaxesComplianceScreen'
import EmailScreen from '../screens/EmailScreen'
import PlansSelectionScreen from '../screens/PlansSelectionScreen'
import PaymentScreen from '../screens/PaymentScreen'
import { TransactionsNavigator } from './TransactionsNavigator'
import { MainTabNavigator } from './MainTabNavigator'

export type AppDrawerParamList = {
  MainTabs: { screen?: string; params?: any }
  Transactions: undefined
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
      groupedItemIds?: string[]
    }
    section: 'Receiving' | 'Raw Materials' | 'Finished Goods'
    businessId: string
    viewAllTitle?: string
    viewAllItems?: any[]
  }
  PendingOrders: {
    businessId: string
  }
  PrepareOrders: {
    businessId: string
  }
  StockTake: {
    inventoryItemId: string
    item: {
      id: string
      title: string
      amount: string
      currency?: string
      inventoryItem?: any
      totalPrimaryPackages?: number
      primaryPackagingUnit?: string
      primaryPackagingDescription?: string
      primaryPackagingQuantity?: number
    }
    businessId: string
    section: 'Raw Materials' | 'Finished Goods'
    viewAllTitle?: string
    viewAllItems?: any[]
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
    onDelete?: () => void
    manageStockParams?: { itemName: string; itemText: string; businessId: string; inventoryItemId?: string }
  }
  CreateProduct: {
    businessId: string
  }
  ProductDetail: {
    product: {
      id: string
      name: string
      businessId: string
      ingredients: Array<{
        inventoryItemId: string
        quantity: number
        unit?: string
        skus?: {
          [skuId: string]: {
            name: string
            quantity: number
            unit: string
            ancillaryItems?: Array<{
              name: string
              quantity: number
              unit: string
              stock?: number
            }>
          }
        }
      }>
      stock?: number
      createdAt: number
      updatedAt: number
    }
  }
  Manufacture: {
    product: {
      id: string
      name: string
      businessId: string
      ingredients: Array<{
        inventoryItemId: string
        quantity: number
        unit?: string
        skus?: {
          [skuId: string]: {
            name: string
            quantity: number
            unit: string
            ancillaryItems?: Array<{
              name: string
              quantity: number
              unit: string
              stock?: number
            }>
          }
        }
      }>
      stock?: number
      createdAt: number
      updatedAt: number
    }
  }
  Skus: {
    product: {
      id: string
      name: string
      businessId: string
      ingredients: Array<{
        inventoryItemId: string
        quantity: number
        unit?: string
        skus?: {
          [skuId: string]: {
            name: string
            quantity: number
            unit: string
            ancillaryItems?: Array<{
              name: string
              quantity: number
              unit: string
              stock?: number
            }>
          }
        }
      }>
      stock?: number
      createdAt: number
      updatedAt: number
    }
  }
  CreateSku: {
    product: {
      id: string
      name: string
      businessId: string
      ingredients: Array<{
        inventoryItemId: string
        quantity: number
        unit?: string
        skus?: {
          [skuId: string]: {
            name: string
            quantity: number
            unit: string
            ancillaryItems?: Array<{
              name: string
              quantity: number
              unit: string
              stock?: number
            }>
          }
        }
      }>
      stock?: number
      createdAt: number
      updatedAt: number
    }
  }
  PointOfSale: undefined
  POSManagement: undefined
  POSEditItems: undefined
  POSEditItem: {
    product: {
      id: string
      name: string
      price: number
      packSize?: string
      description?: string
      isInventoryItem?: boolean
      packagingQuantity?: number
      packagingUnit?: string
    }
  }
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
  Team: undefined
  Suppliers: undefined
  Talent: undefined
  CommerceGraph: undefined
  VAT: undefined
  TaxesCompliance: undefined
  Email: undefined
  PlansSelection: undefined
  Payment: { planId: string; planName: string; price: number }
}

const Drawer = createDrawerNavigator<AppDrawerParamList>()

export function AppNavigator() {
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
      <Drawer.Screen name="Transactions" component={TransactionsNavigator} />
      <Drawer.Screen name="Test" component={TestScreen} />
      <Drawer.Screen name="FirestoreTest" component={FirestoreTestScreen} />
      <Drawer.Screen name="InventoryManagement" component={InventoryManagementScreen} />
      <Drawer.Screen name="InventoryViewAll" component={InventoryViewAllScreen} />
      <Drawer.Screen name="InventoryItemDetail" component={InventoryItemDetailScreen} />
      <Drawer.Screen name="PendingOrders" component={PendingOrdersScreen} />
      <Drawer.Screen name="PrepareOrders" component={PrepareOrdersScreen} />
      <Drawer.Screen name="StockTake" component={StockTakeScreen} />
      <Drawer.Screen name="ManageStock" component={ManageStockScreen} />
      <Drawer.Screen name="EditPackaging" component={EditPackagingScreen} />
      <Drawer.Screen name="CreateProduct" component={CreateProductScreen} />
      <Drawer.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Drawer.Screen name="Manufacture" component={ManufactureScreen} />
      <Drawer.Screen name="Skus" component={SkusScreen} />
      <Drawer.Screen name="CreateSku" component={CreateSkuScreen} />
      <Drawer.Screen name="PointOfSale" component={PointOfSaleScreen} />
      <Drawer.Screen name="POSManagement" component={POSManagementScreen} />
      <Drawer.Screen name="POSEditItems" component={POSEditItemsScreen} />
      <Drawer.Screen name="POSEditItem" component={POSEditItemScreen} />
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
      <Drawer.Screen name="Team" component={TeamScreen} />
      <Drawer.Screen name="Suppliers" component={SuppliersScreen} />
      <Drawer.Screen name="Talent" component={TalentScreen} />
      <Drawer.Screen name="CommerceGraph" component={CommerceGraphScreen} />
      <Drawer.Screen name="VAT" component={VATScreen} />
      <Drawer.Screen name="TaxesCompliance" component={TaxesComplianceScreen} />
      <Drawer.Screen name="Email" component={EmailScreen} />
      <Drawer.Screen name="PlansSelection" component={PlansSelectionScreen} />
      <Drawer.Screen name="Payment" component={PaymentScreen} />
    </Drawer.Navigator>
  )
}

