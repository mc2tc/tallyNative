// Payroll screen

import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Text, Modal, TouchableOpacity } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppBarLayout } from '../components/AppBarLayout'
import { PeopleBottomNav } from '../components/PeopleBottomNav'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import { useModuleTracking } from '../lib/hooks/useModuleTracking'
import { useModuleGroupTracking } from '../lib/hooks/useModuleGroupTracking'
import { MaterialIcons } from '@expo/vector-icons'

type Props = NativeStackScreenProps<AppDrawerParamList, 'Payroll'>

const GRAYSCALE_PRIMARY = '#333333'

export default function PayrollScreen({ navigation }: Props) {
  useModuleTracking('payroll')
  useModuleGroupTracking('people')
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

  return (
    <View style={styles.wrapper}>
      <AppBarLayout
        rightIconName="add-circle-sharp"
        onRightIconPress={handleAddClick}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.wipText}>Work in progress</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  wipText: {
    fontSize: 16,
    color: '#666666',
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

