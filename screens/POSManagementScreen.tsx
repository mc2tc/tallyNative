// POS Management screen for adding products and SKUs
import React, { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { DrawerNavigationProp } from '@react-navigation/drawer'
import { MaterialIcons } from '@expo/vector-icons'
import { AppBarLayout } from '../components/AppBarLayout'
import type { AppDrawerParamList } from '../navigation/AppNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
const CARD_BACKGROUND = '#ffffff'
const SURFACE_BACKGROUND = '#f6f6f6'

type POSManagementScreenNavigationProp = DrawerNavigationProp<AppDrawerParamList, 'POSManagement'>

export default function POSManagementScreen() {
  const navigation = useNavigation<POSManagementScreenNavigationProp>()
  const [infoCardDismissed, setInfoCardDismissed] = useState(false)

  const handleProductManagementSystem = () => {
    // TODO: Navigate to Product Management System
    console.log('Product Management System pressed')
  }

  const handleCreateProduct = () => {
    // TODO: Navigate to Create Product screen (with SKU management)
    console.log('Create Product pressed')
  }

  const handleAddOneOffItem = () => {
    navigation.navigate('AddOneOffItem')
  }

  return (
    <AppBarLayout title="POS Management" onBackPress={() => navigation.goBack()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {!infoCardDismissed && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoCardTextContainer}>
                <Text style={styles.infoCardTitle}>Understanding your POS system</Text>
                <Text style={styles.infoCardBody}>
                  Your Point of Sale system helps you manage products, track inventory, and process sales. 
                  The Product Management System (above) is a complete inventory control mini-app that lets you 
                  mark purchase items as inventory, unpack purchases, assign units, and manage items for resale 
                  or production. Below the line, you can quickly add products to your POS: create a product with 
                  multiple SKUs for different variations, or add a one-off item for immediate sale.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.infoCardDismissButton}
                onPress={() => setInfoCardDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.infoCardDismissIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.buttonGrid}>
          <TouchableOpacity
            style={[styles.button, styles.bankConnectButton]}
            onPress={handleProductManagementSystem}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons name="inventory" size={18} color="#4a4a4a" />
              <Text style={styles.bankConnectText}>Product Management System</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.buttonSeparator} />

          <TouchableOpacity
            style={[styles.button, styles.buttonBelowDivider]}
            onPress={handleCreateProduct}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons name="add-box" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>Create Product</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleAddOneOffItem}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <MaterialIcons name="add-shopping-cart" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>Add One-off Item</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 24,
  },
  infoCard: {
    backgroundColor: SURFACE_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoCardTextContainer: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  infoCardBody: {
    fontSize: 13,
    color: GRAYSCALE_SECONDARY,
    lineHeight: 18,
  },
  infoCardDismissButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  infoCardDismissIcon: {
    fontSize: 22,
    color: GRAYSCALE_SECONDARY,
    fontWeight: '300',
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'column',
    marginTop: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: '#666666',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 56,
  },
  bankConnectButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#dcdcdc',
    marginBottom: 0,
  },
  buttonBelowDivider: {
    marginBottom: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'left',
    marginLeft: 8,
  },
  bankConnectText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4a4a4a',
    marginLeft: 8,
  },
  buttonSeparator: {
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d0d0d0',
    marginTop: 14,
    marginBottom: 14,
  },
})

