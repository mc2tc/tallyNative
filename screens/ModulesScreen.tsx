// Modules screen - displays available operating modules

import React, { useMemo } from 'react'
import { StyleSheet, ScrollView, View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList, 'Modules'>

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type GridItem = {
  label: string
  iconLibrary: 'MaterialIcons' | 'MaterialCommunityIcons'
  iconName: string
}

type ModuleCategory = {
  title: string
  items: GridItem[]
}

// Module categories with their items
const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    title: 'Retail',
    items: [
      { label: 'POS', iconLibrary: 'MaterialIcons', iconName: 'point-of-sale' },
      { label: 'Inventory', iconLibrary: 'MaterialIcons', iconName: 'inventory' },
      { label: 'Fulfillment', iconLibrary: 'MaterialCommunityIcons', iconName: 'truck-delivery' },
      { label: 'QR', iconLibrary: 'MaterialCommunityIcons', iconName: 'barcode-scan' },
    ],
  },
  {
    title: 'Service',
    items: [
      { label: 'Appointments', iconLibrary: 'MaterialCommunityIcons', iconName: 'calendar-clock' },
      { label: 'Digital Intake', iconLibrary: 'MaterialCommunityIcons', iconName: 'form-select' },
      { label: 'Billable Time', iconLibrary: 'MaterialIcons', iconName: 'timer' },
      { label: 'Client Portfolio', iconLibrary: 'MaterialCommunityIcons', iconName: 'folder-multiple-image' },
    ],
  },
  {
    title: 'Construction',
    items: [
      { label: 'Estimator', iconLibrary: 'MaterialIcons', iconName: 'request-quote' },
      { label: 'Change Order', iconLibrary: 'MaterialCommunityIcons', iconName: 'file-sign' },
      { label: 'Daily Site Log', iconLibrary: 'MaterialIcons', iconName: 'record-voice-over' },
      { label: 'Snagging List', iconLibrary: 'MaterialCommunityIcons', iconName: 'clipboard-check-outline' },
    ],
  },
  {
    title: 'Medical',
    items: [
      { label: 'SOAP Note', iconLibrary: 'MaterialCommunityIcons', iconName: 'clipboard-pulse' },
      { label: 'E-Prescribing', iconLibrary: 'MaterialCommunityIcons', iconName: 'pill' },
      { label: 'Insurance', iconLibrary: 'MaterialCommunityIcons', iconName: 'shield-account' },
      { label: 'Tele-Triage', iconLibrary: 'MaterialCommunityIcons', iconName: 'video-wireless' },
    ],
  },
]

export default function ModulesScreen() {
  const navigation = useNavigation<NavigationProp>()

  const filteredCategories = useMemo(() => {
    return MODULE_CATEGORIES
  }, [])

  const allFilteredItems = useMemo(
    () => filteredCategories.flatMap((category) => category.items),
    [filteredCategories]
  )

  const renderIcon = (item: GridItem) => {
    const iconProps = { size: 32, color: '#333333' }
    if (item.iconLibrary === 'MaterialIcons') {
      return <MaterialIcons name={item.iconName as any} {...iconProps} />
    } else {
      return <MaterialCommunityIcons name={item.iconName as any} {...iconProps} />
    }
  }

  return (
    <AppBarLayout title="Operating Modules" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.grid}>
          {allFilteredItems.map((item, index) => (
            <View key={`${item.label}-${index}`} style={styles.gridCell}>
              {renderIcon(item)}
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Don&apos;t see a module you need?</Text>
          <Text style={styles.infoBody}>
            Tell us about a workflow or tool your business relies on, and we&apos;ll explore adding a lightweight module
            to your workspace.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connect external services</Text>
          <Text style={styles.infoBody}>
            Soon you&apos;ll be able to link tools like Square, Shopify, and other services so Tally can pull in data
            and keep your modules in sync.
          </Text>
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCell: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
  },
  label: {
    fontSize: 9,
    color: '#333333',
    marginTop: 8,
    textAlign: 'center',
  },
})

