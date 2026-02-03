// Talent screen (Tally Network)

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Text, Modal, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Image as SvgImage } from 'react-native-svg'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { PeopleBottomNav } from '../components/PeopleBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { MaterialIcons } from '@expo/vector-icons'
import { getLogoGradient } from '../lib/utils/logoColors'
import { getRatingScale } from '../lib/utils/semanticColors'

type Props = NativeStackScreenProps<AppDrawerParamList, 'Talent'>

const GRAYSCALE_PRIMARY = '#333333'

export default function TalentScreen({ navigation }: Props) {
  useModuleTracking('talent')
  useModuleGroupTracking('tally_network')
  const [showActionModal, setShowActionModal] = useState(false)

  const handleAddClick = () => {
    setShowActionModal(true)
  }

  const handleCloseModal = () => {
    setShowActionModal(false)
  }

  const handleAction = (action: string) => {
    // Handle action - placeholder for now
    console.log(`Action selected: ${action}`)
    setShowActionModal(false)
    // TODO: Navigate to appropriate screen or perform action
  }

  const actions = [
    { id: 'add-contractor', label: 'Add Contractor' },
    { id: 'add-employee', label: 'Add Employee' },
    { id: 'check-team-member', label: 'Check Team Member' },
    { id: 'search-talent', label: 'Search for Talent' },
  ]

  // Semantic color cards for temporary color adjustment
  const semanticCards = getRatingScale()

  return (
    <View style={styles.wrapper}>
      <AppBarLayout
        rightIconName="add-circle-sharp"
        onRightIconPress={handleAddClick}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.gradientCard}>
            <LinearGradient
              colors={getLogoGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Talent Management</Text>
                <Text style={styles.cardSubtitle}>Manage your team and contractors</Text>
              </View>
            </LinearGradient>
          </View>
          
          {/* Semantic color cards - temporary for color adjustment */}
          <View style={styles.semanticCardsContainer}>
            {semanticCards.map((card, index) => (
              <View key={index} style={[styles.semanticCard, { backgroundColor: card.color }]}>
                <Text style={styles.semanticCardLabel}>{card.label}</Text>
                <Text style={styles.semanticCardColor}>{card.color}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.wipText}>Work in progress 1</Text>
        </ScrollView>
        <PeopleBottomNav />
      </AppBarLayout>

      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create New</Text>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    style={styles.closeButton}
                  >
                    <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionsList}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={styles.actionButton}
                      onPress={() => handleAction(action.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionButtonText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding for bottom nav
    flexGrow: 1,
  },
  gradientCard: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  wipText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  semanticCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    marginHorizontal: -6,
  },
  semanticCard: {
    flex: 1,
    minWidth: '45%',
    height: 120,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  semanticCardLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  semanticCardColor: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
})

