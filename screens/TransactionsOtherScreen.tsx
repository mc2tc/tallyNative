// Other screen - has horizontal nav with Tab 1, Tab 2, Tab 3 (placeholders)

import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type OtherTab = 'tab1' | 'tab2' | 'tab3'

export default function TransactionsOtherScreen() {
  const [activeTab, setActiveTab] = useState<OtherTab>('tab1')

  return (
    <AppBarLayout title="Transactions">
      <View style={styles.container}>
        <View style={styles.sectionNavWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionNav}
          >
            {(['tab1', 'tab2', 'tab3'] as OtherTab[]).map((tab) => {
              const isActive = tab === activeTab
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.navButton, isActive && styles.navButtonActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                    {tab === 'tab1' ? 'Tab 1' : tab === 'tab2' ? 'Tab 2' : 'Tab 3'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>
              {activeTab === 'tab1' ? 'Tab 1 content coming soon' : activeTab === 'tab2' ? 'Tab 2 content coming soon' : 'Tab 3 content coming soon'}
            </Text>
          </View>
        </View>
      </View>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionNavWrapper: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: '#ffffff',
  },
  navButtonActive: {
    borderColor: GRAYSCALE_PRIMARY,
    backgroundColor: '#f0f0f0',
  },
  navButtonText: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: GRAYSCALE_PRIMARY,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  placeholderCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: GRAYSCALE_SECONDARY,
  },
})

