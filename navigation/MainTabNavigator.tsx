// Bottom tab navigator with dynamic tabs based on drawer category

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialIcons, Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons'
import { HomeNavigator } from './HomeNavigator'
import { TransactionsNavigator } from './TransactionsNavigator'
import { ReportsNavigator } from './ReportsNavigator'
import ProfileScreen from '../screens/ProfileScreen'
import HelpScreen from '../screens/HelpScreen'
import { useAssistant } from '../lib/context/OversightAlertsContext'
import { useDrawerCategory } from '../lib/context/DrawerCategoryContext'
import { getFirstTabForCategory, createTabResetListener } from '../lib/utils/navigation'
import InventoryManagementScreen from '../screens/InventoryManagementScreen'
import ProductionManagementScreen from '../screens/ProductionManagementScreen'
import PointOfSaleScreen from '../screens/PointOfSaleScreen'
import OnlineSalesScreen from '../screens/OnlineSalesScreen'
import EmailScreen from '../screens/EmailScreen'
import OnlineBookingScreen from '../screens/OnlineBookingScreen'
import PayrollScreen from '../screens/PayrollScreen'
import TeamScreen from '../screens/TeamScreen'
import TalentScreen from '../screens/TalentScreen'
import SuppliersScreen from '../screens/SuppliersScreen'
import FinancialServicesScreen from '../screens/FinancialServicesScreen'
import CommerceGraphScreen from '../screens/CommerceGraphScreen'
import TaxesComplianceScreen from '../screens/TaxesComplianceScreen'
import SettingsPlanScreen from '../screens/SettingsPlanScreen'
import SettingsAccountsScreen from '../screens/SettingsAccountsScreen'
import SettingsVATStatusScreen from '../screens/SettingsVATStatusScreen'
import SettingsUnitsScreen from '../screens/SettingsUnitsScreen'
import SettingsUsersScreen from '../screens/SettingsUsersScreen'
import ReportingReadyScreen from '../screens/ReportingReadyScreen'

export type MainTabParamList = {
  Home: undefined
  Health: undefined
  Transactions: undefined
  Reports: undefined
  TaxesCompliance: undefined
  Inventory: undefined
  Production: undefined
  PointOfSale: undefined
  OpsCentre: undefined
  Web: undefined
  Email: undefined
  Social: undefined
  Payroll: undefined
  Team: undefined
  Talent: undefined
  Suppliers: undefined
  FinancialServices: undefined
  CommerceGraph: undefined
  SettingsPlan: undefined
  SettingsAccounts: undefined
  SettingsVATStatus: undefined
  SettingsUnits: undefined
  SettingsUsers: undefined
  Profile: undefined
  Security: undefined
  Compliance: undefined
  Operations: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const getTabIcon = (routeName: string, color: string, size: number) => {
  switch (routeName) {
    case 'Health':
      return <MaterialIcons name="monitor-heart" size={size} color={color} />
    case 'Transactions':
      return <MaterialCommunityIcons name="invoice-list" size={size} color={color} />
    case 'Reports':
      return <MaterialCommunityIcons name="file-chart-outline" size={size} color={color} />
    case 'TaxesCompliance':
      return <AntDesign name="audit" size={size} color={color} />
    case 'Inventory':
      return <MaterialIcons name="inventory" size={size} color={color} />
    case 'Production':
      return <MaterialCommunityIcons name="factory" size={size} color={color} />
    case 'PointOfSale':
      return <MaterialIcons name="point-of-sale" size={size} color={color} />
    case 'OpsCentre':
      return <MaterialIcons name="monitor" size={size} color={color} />
    case 'Web':
      return <MaterialCommunityIcons name="web" size={size} color={color} />
    case 'Email':
      return <MaterialIcons name="alternate-email" size={size} color={color} />
    case 'Social':
      return <Ionicons name="share-social" size={size} color={color} />
    case 'Payroll':
      return <MaterialCommunityIcons name="cash-multiple" size={size} color={color} />
    case 'Team':
      return <MaterialIcons name="people" size={size} color={color} />
    case 'Talent':
      return <MaterialCommunityIcons name="crowd" size={size} color={color} />
    case 'Suppliers':
      return <MaterialCommunityIcons name="truck-delivery" size={size} color={color} />
    case 'FinancialServices':
      return <MaterialIcons name="account-balance" size={size} color={color} />
    case 'CommerceGraph':
      return <MaterialCommunityIcons name="map-marker" size={size} color={color} />
    case 'SettingsPlan':
      return <MaterialIcons name="credit-card" size={size} color={color} />
    case 'SettingsAccounts':
      return <MaterialIcons name="account-balance-wallet" size={size} color={color} />
    case 'SettingsVATStatus':
      return <MaterialIcons name="description" size={size} color={color} />
    case 'SettingsUnits':
      return <MaterialIcons name="straighten" size={size} color={color} />
    case 'SettingsUsers':
      return <MaterialIcons name="people" size={size} color={color} />
    case 'Security':
      return <MaterialIcons name="shield" size={size} color={color} />
    case 'Compliance':
      return <MaterialIcons name="gavel" size={size} color={color} />
    case 'Operations':
      return <MaterialIcons name="trending-up" size={size} color={color} />
    default:
      return <MaterialIcons name="radio-button-unchecked" size={size} color={color} />
  }
}

const createTabScreen = (
  name: keyof MainTabParamList,
  component: React.ComponentType<any>,
  options: any,
  listenersConfig?: (params: { navigation: any; route: any }) => any,
) => {
  if (listenersConfig) {
    return (
      <Tab.Screen
        key={name}
        name={name}
        component={component}
        options={options}
        listeners={listenersConfig}
      />
    )
  }
  return <Tab.Screen key={name} name={name} component={component} options={options} />
}

export function MainTabNavigator() {
  const { oversightUnreadCount, insightUnreadCount } = useAssistant()
  const { selectedCategory } = useDrawerCategory()
  const totalUnreadCount = oversightUnreadCount + insightUnreadCount

  // Define tab configurations for each category
  const getTabsForCategory = () => {
    switch (selectedCategory) {
      case 'Finance':
        return [
          createTabScreen('Health', HomeNavigator, { title: 'Health' }),
          createTabScreen(
            'Transactions',
            ReportingReadyScreen,
            { title: 'Journal' },
          ),
          createTabScreen(
            'Reports',
            ReportsNavigator,
            { title: 'Reports' },
            createTabResetListener('ReportsHome')
          ),
          createTabScreen('TaxesCompliance', TaxesComplianceScreen, { title: 'MTD' }),
        ]

      case 'Operations':
        return [
          createTabScreen('Inventory', InventoryManagementScreen, { title: 'Inventory' }),
          createTabScreen('Production', ProductionManagementScreen, { title: 'Production' }),
          createTabScreen('PointOfSale', PointOfSaleScreen, { title: 'Point of Sale' }),
        ]

      case 'Marketing':
        return [
          createTabScreen('Web', OnlineSalesScreen, { title: 'Web' }),
          createTabScreen('Email', EmailScreen, { title: 'Email' }),
          createTabScreen('Social', OnlineBookingScreen, { title: 'Social' }),
        ]

      case 'People':
        return [
          createTabScreen('Payroll', PayrollScreen, { title: 'Payroll' }),
          createTabScreen('Team', TeamScreen, { title: 'Team' }),
          createTabScreen('Talent', TalentScreen, { title: 'Talent' }),
        ]

      case 'TallyNetwork':
        return [
          createTabScreen('Suppliers', SuppliersScreen, { title: 'Suppliers' }),
          createTabScreen('FinancialServices', FinancialServicesScreen, { title: 'Financial Services' }),
          createTabScreen('CommerceGraph', CommerceGraphScreen, { title: 'Commerce Graph' }),
        ]

      case 'Settings':
        return [
          createTabScreen('SettingsPlan', SettingsPlanScreen, { title: 'Plan' }),
          createTabScreen('SettingsAccounts', SettingsAccountsScreen, { title: 'Accounts' }),
          createTabScreen('SettingsVATStatus', SettingsVATStatusScreen, { title: 'VAT Status' }),
          createTabScreen('SettingsUnits', SettingsUnitsScreen, { title: 'Units' }),
          createTabScreen('SettingsUsers', SettingsUsersScreen, { title: 'Users' }),
        ]

      default:
        return []
    }
  }

  const getInitialRouteName = (): keyof MainTabParamList => {
    return getFirstTabForCategory(selectedCategory) as keyof MainTabParamList
  }

  return (
    <Tab.Navigator
      key={selectedCategory}
      initialRouteName={getInitialRouteName()}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopColor: '#e0e0e0',
        },
        tabBarIcon: ({ color, size }) => getTabIcon(route.name, color, size),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="OpsCentre"
        component={HelpScreen}
        options={{
          title: 'Control Room',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' },
        }}
      />
      {getTabsForCategory()}
    </Tab.Navigator>
  )
}
