// Email marketing screen - placeholder

import React, { useState } from 'react'
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native'
import { AppBarLayout } from '../components/AppBarLayout'
import { MaterialIcons } from '@expo/vector-icons'

const GRAYSCALE_PRIMARY = '#333333'

export default function EmailScreen() {
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
    { id: 'marketing-page', label: 'Create Marketing Page' },
    { id: 'ecommerce-page', label: 'Create E-Commerce Page' },
    { id: 'booking-engine', label: 'Create Booking Engine' },
    { id: 'email-campaign', label: 'Create E-Mail Campaign' },
    { id: 'social-campaign', label: 'Create Social Campaign' },
  ]

  return (
    <>
      <AppBarLayout
        rightIconName="add-circle-sharp"
        onRightIconPress={handleAddClick}
      >
        <View style={styles.container}>
          <Text style={styles.text}>Email marketing features coming soon</Text>
        </View>
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
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
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

