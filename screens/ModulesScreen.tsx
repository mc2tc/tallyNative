// Modules screen - displays available operating modules

import React, { useState, useMemo } from 'react'
import { StyleSheet, ScrollView, View, Text } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { Searchbar } from 'react-native-paper'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

type NavigationProp = DrawerNavigationProp<AppDrawerParamList, 'Modules'>

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'

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
      { label: 'POS Lite', iconLibrary: 'MaterialIcons', iconName: 'point-of-sale' },
      { label: 'Inventory Alert', iconLibrary: 'MaterialIcons', iconName: 'inventory' },
      { label: 'Order Fulfillment', iconLibrary: 'MaterialCommunityIcons', iconName: 'truck-delivery' },
      { label: 'Barcode/QR Scanner', iconLibrary: 'MaterialCommunityIcons', iconName: 'barcode-scan' },
    ],
  },
  {
    title: 'Service',
    items: [
      { label: 'Appointment Manager', iconLibrary: 'MaterialCommunityIcons', iconName: 'calendar-clock' },
      { label: 'Digital Intake Forms', iconLibrary: 'MaterialCommunityIcons', iconName: 'form-select' },
      { label: 'Billable Timekeeper', iconLibrary: 'MaterialIcons', iconName: 'timer' },
      { label: 'Client Portfolio', iconLibrary: 'MaterialCommunityIcons', iconName: 'folder-multiple-image' },
    ],
  },
  {
    title: 'Construction',
    items: [
      { label: 'Pocket Estimator', iconLibrary: 'MaterialIcons', iconName: 'request-quote' },
      { label: 'Change Order "Sign-Off"', iconLibrary: 'MaterialCommunityIcons', iconName: 'file-sign' },
      { label: 'Daily Site Log (Voice)', iconLibrary: 'MaterialIcons', iconName: 'record-voice-over' },
      { label: 'Snagging / Punch List', iconLibrary: 'MaterialCommunityIcons', iconName: 'clipboard-check-outline' },
    ],
  },
  {
    title: 'Medical',
    items: [
      { label: 'SOAP Note Templater', iconLibrary: 'MaterialCommunityIcons', iconName: 'clipboard-pulse' },
      { label: 'E-Prescribing (eRx)', iconLibrary: 'MaterialCommunityIcons', iconName: 'pill' },
      { label: 'Insurance Verifier', iconLibrary: 'MaterialCommunityIcons', iconName: 'shield-account' },
      { label: 'Secure Tele-Triage', iconLibrary: 'MaterialCommunityIcons', iconName: 'video-wireless' },
    ],
  },
]

export default function ModulesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return MODULE_CATEGORIES
    }
    const query = searchQuery.toLowerCase()
    return MODULE_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter((item) => 
        item.label.toLowerCase().includes(query) || 
        category.title.toLowerCase().includes(query)
      ),
    })).filter((category) => category.items.length > 0)
  }, [searchQuery])

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
        <View style={styles.searchBarContainer}>
          <Searchbar
            placeholder="Search modules..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchBarInput}
            iconColor={GRAYSCALE_SECONDARY}
          />
        </View>

        {filteredCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.rowContainer}>
            <Text style={styles.rowTitle}>{category.title}</Text>
            <View style={styles.grid}>
              {category.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.gridCell}>
                  {renderIcon(item)}
                  <Text style={styles.label}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
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
  searchBarContainer: {
    marginBottom: 24,
  },
  searchBar: {
    backgroundColor: CARD_BACKGROUND,
    elevation: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  searchBarInput: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontFamily: null,
  },
  rowContainer: {
    marginBottom: 32,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
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
    fontSize: 12,
    color: '#333333',
    marginTop: 8,
    textAlign: 'center',
  },
})

