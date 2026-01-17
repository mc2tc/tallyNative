// Manage Stock screen - displays packaging extraction results
import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import type { AppDrawerParamList } from '../navigation/AppNavigator'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'
import type { ScaffoldStackParamList } from '../navigation/ScaffoldNavigator'
import { packagingApi, type PackagingExtractionResponse, type PackagingExtractionSuccessResponse, isPackagingExtractionSuccess, type PrimaryPackaging, type SecondaryPackaging, type UnitConfirmation } from '../lib/api/packaging'
import { inventoryApi } from '../lib/api/inventory'
import { transactions2Api, type Transaction } from '../lib/api/transactions2'
import { ApiError } from '../lib/api/client'
import { AppBarLayout } from '../components/AppBarLayout'
import { formatAmount } from '../lib/utils/currency'

const GRAYSCALE_PRIMARY = '#4a4a4a'

type ManageStockRouteProp =
  | RouteProp<AppDrawerParamList, 'ManageStock'>
  | RouteProp<TransactionsStackParamList, 'ManageStock'>
  | RouteProp<ScaffoldStackParamList, 'ManageStock'>

type DebitAccountType = 'Raw Materials' | 'Finished Goods'

export default function ManageStockScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<ManageStockRouteProp>()
  const { itemName, itemText, businessId, inventoryItemId, transactionId, itemIndex, transactionItem } = route.params || {}
  const insets = useSafeAreaInsets()
  const [selectedDebitAccount, setSelectedDebitAccount] = useState<DebitAccountType | null>(null)

  // Safety check: if params are missing, navigate back
  useEffect(() => {
    if (!route.params || !itemName || !itemText || !businessId) {
      Alert.alert('Error', 'Missing required information', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('InventoryManagement' as never)
          },
        },
      ])
    }
  }, [route.params, itemName, itemText, businessId, navigation])

  const [loading, setLoading] = useState(true)
  const [packagingData, setPackagingData] = useState<PackagingExtractionSuccessResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [itemAmount, setItemAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<string>('GBP')
  // Local edits that persist until "Confirm and Save" is clicked
  const [localPrimaryPackaging, setLocalPrimaryPackaging] = useState<PrimaryPackaging | null>(null)
  const [localSecondaryPackaging, setLocalSecondaryPackaging] = useState<SecondaryPackaging | null | undefined>(undefined)
  const [localOrderQuantity, setLocalOrderQuantity] = useState<number | null>(null)
  // Unit confirmation state
  const [unitConfirmation, setUnitConfirmation] = useState<UnitConfirmation | null>(null)
  const [confirmedUnit, setConfirmedUnit] = useState<string>('')
  const [showUnitConfirmationModal, setShowUnitConfirmationModal] = useState(false)
  const [pendingPackagingResponse, setPendingPackagingResponse] = useState<PackagingExtractionSuccessResponse | null>(null)
  // Invoice display state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceType, setInvoiceType] = useState<'image' | 'pdf' | null>(null)

  // Retry logic with exponential backoff for rate limit errors
  const extractPackagingWithRetry = useCallback(async (
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<PackagingExtractionResponse | null> => {
    let lastError: PackagingExtractionResponse | null = null
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await packagingApi.extractPackaging(businessId!, itemText!)
        
        if (isPackagingExtractionSuccess(response)) {
          return response
        }
        
        // Check if it's a rate limit error (429) and we should retry
        const errorResponse = response
        const isRateLimit = errorResponse.error?.includes('temporarily busy') || 
                           errorResponse.error?.includes('try again') ||
                           (errorResponse as any).rateLimit === true
        
        if (isRateLimit && attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = initialDelay * Math.pow(2, attempt)
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          lastError = errorResponse
          continue
        }
        
        // Non-retryable error or max retries reached
        return errorResponse
        
      } catch (error) {
        // Network errors - only retry on first attempt
        if (attempt === 0 && error instanceof Error) {
          console.warn('Network error, retrying once:', error.message)
          await new Promise(resolve => setTimeout(resolve, initialDelay))
          continue
        }
        
        // Give up after network error retry
        console.error('Packaging extraction failed after retries:', error)
        return null
      }
    }
    
    return lastError
  }, [businessId, itemText])

  const extractPackaging = useCallback(async () => {
    if (!businessId || !itemText) {
      setError('Missing required information')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch transaction to get item amount and currency if we have transactionId
      if (transactionId && businessId) {
        try {
          const transaction = await transactions2Api.getTransaction(transactionId, businessId)
          const details = transaction.details as {
            itemList?: Array<{
              amount: number
            }>
          } | undefined
          const itemList = details?.itemList || []
          const item = itemList[itemIndex ?? -1]
          
          if (item) {
            setItemAmount(item.amount)
          }
          
          // Get currency from transaction summary
          if (transaction.summary?.currency) {
            setCurrency(transaction.summary.currency)
          }
        } catch (err) {
          console.error('Failed to fetch transaction for amount:', err)
          // Continue with packaging extraction even if transaction fetch fails
        }
      } else if (transactionItem?.amount) {
        // Use transactionItem from route params if available
        setItemAmount(transactionItem.amount)
        if (transactionItem.currency) {
          setCurrency(transactionItem.currency)
        }
      }

      // Use retry logic for packaging extraction
      const response = await extractPackagingWithRetry()
      
      // If extraction failed completely (null response), show graceful error
      if (!response) {
        const errorMsg = 'Packaging extraction unavailable. Please try again.'
        console.warn('Packaging extraction unavailable')
        setError(errorMsg)
        // Don't block - allow user to continue
        return
      }
      
      // Check if response is successful using type guard
      if (!isPackagingExtractionSuccess(response)) {
        // Graceful error handling - show user-friendly message but don't block
        const errorMsg = response.error || response.message || 'Packaging extraction unavailable. You can continue without it.'
        console.warn('Packaging extraction failed:', {
          error: errorMsg,
          requestId: response.requestId,
          currentUsage: (response as any).currentUsage,
          limit: (response as any).limit,
        })
        setError(errorMsg)
        // Don't block - allow user to continue without packaging data
        return
      }
      
      // Handle unit confirmation requirement
      if (response.requiresConfirmation && response.unitConfirmation) {
        setPendingPackagingResponse(response)
        setUnitConfirmation(response.unitConfirmation)
        setConfirmedUnit(response.unitConfirmation.normalizedUnit || response.unitConfirmation.extractedUnit)
        setShowUnitConfirmationModal(true)
        // Don't set packaging data yet - wait for user confirmation
        setLoading(false)
        return
      }
      
      // Merge API response with local edits if they exist
      const effectiveOrderQuantity = localOrderQuantity !== null ? localOrderQuantity : response.packaging.orderQuantity
      const mergedResponse = {
        ...response,
        packaging: {
          ...response.packaging,
          orderQuantity: effectiveOrderQuantity,
          primaryPackaging: localPrimaryPackaging || response.packaging.primaryPackaging,
          // If localSecondaryPackaging is null, it means deleted (use undefined)
          // If it's undefined, use API response
          // Otherwise, use the local edit
          secondaryPackaging: localSecondaryPackaging !== undefined 
            ? (localSecondaryPackaging === null ? undefined : localSecondaryPackaging)
            : response.packaging.secondaryPackaging,
          // Recalculate totalPrimaryPackages if we have local edits
          totalPrimaryPackages: (() => {
            const primary = localPrimaryPackaging || response.packaging.primaryPackaging
            const secondary = localSecondaryPackaging !== undefined 
              ? (localSecondaryPackaging === null ? undefined : localSecondaryPackaging)
              : response.packaging.secondaryPackaging
            
            if (response.packaging.orderPackagingLevel === 'primary') {
              return effectiveOrderQuantity
            } else if (secondary) {
              return secondary.quantity * secondary.primaryPackagesPerSecondary
            } else if (primary) {
              return effectiveOrderQuantity
            }
            return response.packaging.totalPrimaryPackages
          })(),
          // Update orderPackagingLevel if secondary was deleted
          orderPackagingLevel: (localSecondaryPackaging === null ? 'primary' : response.packaging.orderPackagingLevel) as 'primary' | 'secondary',
        },
      }
      
      setPackagingData(mergedResponse)
      // Clear error on successful extraction
      setError(null)
    } catch (err) {
      // Unexpected errors - log but don't block
      console.error('Unexpected packaging extraction error:', err)
      console.error('Error details:', {
        error: err,
        businessId,
        itemText,
        errorType: err instanceof ApiError ? 'ApiError' : err instanceof Error ? 'Error' : 'Unknown',
        status: err instanceof ApiError ? err.status : undefined,
        data: err instanceof ApiError ? err.data : undefined,
      })
      
      // Show user-friendly error message but allow continuation
      const errorMessage = 'Packaging extraction unavailable. Please try again.'
      setError(errorMessage)
      // Don't show blocking alert - allow user to proceed
    } finally {
      setLoading(false)
    }
  }, [businessId, itemText, transactionId, itemIndex, transactionItem, localOrderQuantity, localPrimaryPackaging, localSecondaryPackaging, extractPackagingWithRetry])

  // Initial load
  useEffect(() => {
    extractPackaging()
  }, [extractPackaging])

  // Refresh on screen focus - but preserve local edits
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we don't have local edits to preserve
      // If we have local edits, we'll merge them in extractPackaging
      extractPackaging()
    }, [extractPackaging])
  )

  // Get effective packaging data (API data merged with local edits)
  const getEffectivePackagingData = useCallback((): PackagingExtractionSuccessResponse | null => {
    if (!packagingData) return null

    // If localSecondaryPackaging is null, it means deleted (use undefined)
    // If it's undefined, use API response
    // Otherwise, use the local edit
    const effectiveSecondaryPackaging = localSecondaryPackaging !== undefined 
      ? (localSecondaryPackaging === null ? undefined : localSecondaryPackaging)
      : packagingData.packaging.secondaryPackaging

    // Use local order quantity if it exists, otherwise use API response
    const effectiveOrderQuantity = localOrderQuantity !== null ? localOrderQuantity : packagingData.packaging.orderQuantity

    return {
      ...packagingData,
      packaging: {
        ...packagingData.packaging,
        orderQuantity: effectiveOrderQuantity,
        primaryPackaging: localPrimaryPackaging || packagingData.packaging.primaryPackaging,
        secondaryPackaging: effectiveSecondaryPackaging,
        totalPrimaryPackages: (() => {
          const primary = localPrimaryPackaging || packagingData.packaging.primaryPackaging
          const secondary = effectiveSecondaryPackaging
          
          if (packagingData.packaging.orderPackagingLevel === 'primary') {
            return effectiveOrderQuantity
          } else if (secondary) {
            return secondary.quantity * secondary.primaryPackagesPerSecondary
          } else if (primary) {
            return effectiveOrderQuantity
          }
          return packagingData.packaging.totalPrimaryPackages
        })(),
        orderPackagingLevel: (localSecondaryPackaging === null ? 'primary' : packagingData.packaging.orderPackagingLevel) as 'primary' | 'secondary',
      },
    }
  }, [packagingData, localPrimaryPackaging, localSecondaryPackaging, localOrderQuantity])

  const handleConfirmAndSave = async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing')
      return
    }

    // If we have transactionId and itemIndex, this is a new item from "Receiving" section
    // User must select Raw Materials or Finished Goods
    if (transactionId && itemIndex !== undefined) {
      if (!selectedDebitAccount) {
        Alert.alert('Error', 'Please select whether this is Raw Materials or Finished Goods')
        return
      }

      setUpdatingStatus(true)
      try {
        // 1. Get the current transaction to access the item data
        const currentTransaction = await transactions2Api.getTransaction(transactionId, businessId)
        
        const details = currentTransaction.details as {
          itemList?: Array<{
            name: string
            amount: number
            amountExcluding?: number
            vatAmount?: number
            debitAccount?: string
            debitAccountConfirmed?: boolean
            isBusinessExpense?: boolean
            category?: string
            quantity?: number
            unit?: string
            unitCost?: number
          }>
        } | undefined

        const currentItemList = details?.itemList || []
        const itemToUpdate = currentItemList[itemIndex]
        
        if (!itemToUpdate) {
          throw new Error('Item not found in transaction')
        }

        // 2. Check if transaction is verified
        const metadata = currentTransaction.metadata as {
          verification?: { status?: string }
        } | undefined
        const isUnverified = metadata?.verification?.status === 'unverified'

        // 3. Update the transaction item's debitAccount from "Inventory" to selected type
        // Build updated itemList with the changed debitAccount
        const updatedItemList = currentItemList.map((item, index) => {
          if (index === itemIndex) {
            return {
              name: item.name,
              amount: item.amount,
              amountExcluding: item.amountExcluding,
              vatAmount: item.vatAmount,
              debitAccount: selectedDebitAccount,
              debitAccountConfirmed: true,
              isBusinessExpense: item.isBusinessExpense,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit,
              unitCost: item.unitCost,
            }
          }
          return {
            name: item.name,
            amount: item.amount,
            amountExcluding: item.amountExcluding,
            vatAmount: item.vatAmount,
            debitAccount: item.debitAccount,
            debitAccountConfirmed: item.debitAccountConfirmed,
            isBusinessExpense: item.isBusinessExpense,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.unitCost,
          }
        })

        // Update the transaction - use verify endpoint for unverified, updateVerifiedPurchase for verified
        let updatedTransaction: Transaction
        if (isUnverified) {
          // For unverified transactions, use verify endpoint
          updatedTransaction = await transactions2Api.verifyTransaction(
            transactionId,
            businessId,
            {
              itemList: updatedItemList,
            },
          )
        } else {
          // For verified transactions, use updateTransactions3VerifiedPurchase
          const updateResponse = await transactions2Api.updateTransactions3VerifiedPurchase(
            transactionId,
            businessId,
            {
              itemList: updatedItemList,
            },
          )
          updatedTransaction = updateResponse.transaction
        }

        // 4. Create inventoryItem record using the updated item and packaging data
        const updatedItem = updatedItemList[itemIndex]
        
        // Get transaction summary and metadata fields
        const thirdPartyName = updatedTransaction.summary?.thirdPartyName
        const transactionDate = updatedTransaction.summary?.transactionDate
        const reference = (updatedTransaction.metadata as { reference?: string } | undefined)?.reference
        
        // Get effective packaging data (with local edits)
        const effectiveData = getEffectivePackagingData()
        
        // Calculate cost per primary package and cost per primary packaging unit
        let costPerPrimaryPackage: number | undefined
        let costPerPrimaryPackagingUnit: number | undefined
        
        if (effectiveData && effectiveData.packaging.totalPrimaryPackages > 0) {
          costPerPrimaryPackage = updatedItem.amount / effectiveData.packaging.totalPrimaryPackages
          
          if (effectiveData.packaging.primaryPackaging && effectiveData.packaging.primaryPackaging.quantity > 0) {
            const totalPrimaryPackagingUnits = effectiveData.packaging.totalPrimaryPackages * effectiveData.packaging.primaryPackaging.quantity
            costPerPrimaryPackagingUnit = updatedItem.amount / totalPrimaryPackagingUnits
          }
        }
        
        const itemsToSave = [{
          name: updatedItem.name,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          unitCost: updatedItem.unitCost,
          amount: updatedItem.amount,
          amountExcluding: updatedItem.amountExcluding,
          vatAmount: updatedItem.vatAmount,
          debitAccount: selectedDebitAccount,
          debitAccountConfirmed: true,
          isBusinessExpense: updatedItem.isBusinessExpense,
          category: updatedItem.category,
          packaging: effectiveData ? {
            primaryPackaging: effectiveData.packaging.primaryPackaging,
            secondaryPackaging: effectiveData.packaging.secondaryPackaging,
            totalPrimaryPackages: effectiveData.packaging.totalPrimaryPackages,
            orderQuantity: effectiveData.packaging.orderQuantity,
            orderPackagingLevel: effectiveData.packaging.orderPackagingLevel,
            confidence: effectiveData.packaging.confidence,
            notes: effectiveData.packaging.notes,
          } : undefined,
          costPerPrimaryPackage,
          costPerPrimaryPackagingUnit,
          thirdPartyName,
          transactionDate,
          reference,
        }]

        await transactions2Api.saveInventoryItems(
          businessId,
          transactionId,
          itemsToSave,
        )

        // Clear local edits after successful save
        setLocalPrimaryPackaging(null)
        setLocalSecondaryPackaging(undefined)
        setLocalOrderQuantity(null)

        setUpdatingStatus(false)
        Alert.alert('Success', 'Item saved successfully', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('InventoryManagement' as never)
            },
          },
        ])
      } catch (error) {
        console.error('Failed to save inventory item:', error)
        let errorMessage = 'Failed to save inventory item. Please try again.'
        if (error instanceof ApiError) {
          errorMessage = error.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        Alert.alert('Error', errorMessage)
        setUpdatingStatus(false)
      }
    } else if (inventoryItemId && businessId) {
      // Existing inventory item - just update status to "received"
      setUpdatingStatus(true)
      try {
        await inventoryApi.updateInventoryItemStatus(inventoryItemId, businessId, 'received')
        setUpdatingStatus(false)
        navigation.navigate('InventoryManagement' as never)
      } catch (error) {
        console.error('Failed to update inventory item status:', error)
        let errorMessage = 'Failed to update inventory status. Please try again.'
        if (error instanceof ApiError) {
          errorMessage = error.message || errorMessage
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        Alert.alert('Error', errorMessage)
        setUpdatingStatus(false)
      }
    } else {
      // No transactionId or inventoryItemId, just navigate back
      navigation.navigate('InventoryManagement' as never)
    }
  }

  const handleGoBack = () => {
    // Navigate explicitly back to InventoryManagement screen
    // Since ManageStock is only accessed from InventoryManagement, we navigate directly to it
    navigation.navigate('InventoryManagement' as never)
  }

  const handleConfirmUnit = async () => {
    if (!pendingPackagingResponse || !unitConfirmation || !confirmedUnit.trim()) {
      Alert.alert('Error', 'Please enter a valid unit')
      return
    }

    try {
      setLoading(true)
      // Update the primary packaging unit with the confirmed unit
      const updatedPrimaryPackaging: PrimaryPackaging = {
        ...pendingPackagingResponse.packaging.primaryPackaging!,
        unit: confirmedUnit.trim(),
      }
      
      // Merge API response with local edits if they exist
      const mergedResponse = {
        ...pendingPackagingResponse,
        packaging: {
          ...pendingPackagingResponse.packaging,
          primaryPackaging: updatedPrimaryPackaging,
        },
        requiresConfirmation: false,
        unitConfirmation: undefined,
      }
      
      setPackagingData(mergedResponse)
      setLocalPrimaryPackaging(updatedPrimaryPackaging)
      setShowUnitConfirmationModal(false)
      setUnitConfirmation(null)
      setConfirmedUnit('')
      setPendingPackagingResponse(null)
    } catch (error) {
      console.error('Failed to confirm unit:', error)
      Alert.alert('Error', 'Failed to confirm unit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelUnitConfirmation = () => {
    setShowUnitConfirmationModal(false)
    setUnitConfirmation(null)
    setConfirmedUnit('')
    setPendingPackagingResponse(null)
    // Navigate back since we can't proceed without unit confirmation
    navigation.navigate('InventoryManagement' as never)
  }

  const handleViewInvoice = useCallback(async () => {
    if (!transactionId || !businessId) {
      Alert.alert('Error', 'Transaction information is not available')
      return
    }

    setInvoiceLoading(true)
    try {
      // First, try to get the transaction to check for imageUrl
      const transaction = await transactions2Api.getTransaction(transactionId, businessId)
      const imageUrl = (transaction.metadata as { imageUrl?: string } | undefined)?.imageUrl

      if (imageUrl) {
        // If there's an image URL, display it in modal
        setInvoiceUrl(imageUrl)
        setInvoiceType('image')
        setShowInvoiceModal(true)
      } else {
        // Otherwise, generate PDF and open in browser
        const pdfResponse = await transactions2Api.generateInvoicePDF(transactionId, businessId)
        if (pdfResponse.success && pdfResponse.pdfUrl) {
          // Open PDF in in-app browser (closest to modal experience in Expo)
          await WebBrowser.openBrowserAsync(pdfResponse.pdfUrl, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            controlsColor: GRAYSCALE_PRIMARY,
          })
        } else {
          throw new Error('Failed to generate invoice PDF')
        }
      }
    } catch (error) {
      console.error('Failed to load invoice:', error)
      let errorMessage = 'Failed to load invoice. Please try again.'
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      Alert.alert('Error', errorMessage)
    } finally {
      setInvoiceLoading(false)
    }
  }, [transactionId, businessId])

  const handleEditPrimaryPackaging = () => {
    const effectiveData = getEffectivePackagingData()
    if (!effectiveData?.packaging.primaryPackaging) return

    navigation.navigate('EditPackaging' as never, {
      packaging: effectiveData.packaging.primaryPackaging,
      packagingType: 'primary',
      manageStockParams: { itemName, itemText, businessId, inventoryItemId, transactionId, itemIndex, transactionItem },
      onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => {
        const updatedPrimary = updatedPackaging as PrimaryPackaging
        // Store in local state to persist across refreshes
        setLocalPrimaryPackaging(updatedPrimary)
      },
    } as any)
  }

  const handleEditSecondaryPackaging = () => {
    const effectiveData = getEffectivePackagingData()
    if (!effectiveData?.packaging.secondaryPackaging) return

    navigation.navigate('EditPackaging' as never, {
      packaging: effectiveData.packaging.secondaryPackaging,
      packagingType: 'secondary',
      manageStockParams: { itemName, itemText, businessId, inventoryItemId, transactionId, itemIndex, transactionItem },
      onSave: (updatedPackaging: PrimaryPackaging | SecondaryPackaging) => {
        const updatedSecondary = updatedPackaging as SecondaryPackaging
        // Store in local state to persist across refreshes
        setLocalSecondaryPackaging(updatedSecondary)
      },
      onDelete: () => {
        // Store null in local state to indicate deletion
        setLocalSecondaryPackaging(null)
      },
    } as any)
  }

  if (loading) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GRAYSCALE_PRIMARY} />
          <Text style={styles.loadingText}>Extracting packaging information...</Text>
        </View>
      </AppBarLayout>
    )
  }

  // Show error state but allow user to continue
  if (error && !packagingData) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.errorCard}>
            <MaterialIcons name="info-outline" size={32} color="#888888" />
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={extractPackaging}
                activeOpacity={0.7}
              >
                <MaterialIcons name="refresh" size={18} color={GRAYSCALE_PRIMARY} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Text style={styles.continueButtonText}>Continue Without Packaging</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </AppBarLayout>
    )
  }

  // Show loading state if unit confirmation is required but modal is not yet visible
  // (this should not happen, but handle it gracefully)
  if (!packagingData && !showUnitConfirmationModal) {
    return (
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No packaging data available</Text>
        </View>
      </AppBarLayout>
    )
  }

  // Get effective packaging data (merged with local edits) if available
  const effectivePackagingData = packagingData ? getEffectivePackagingData() : null
  
  // Render modal component helper
  const renderUnitConfirmationModal = () => (
    <Modal
      visible={showUnitConfirmationModal}
      transparent
      animationType="fade"
      onRequestClose={handleCancelUnitConfirmation}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleCancelUnitConfirmation}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Unit</Text>
                <TouchableOpacity
                  onPress={handleCancelUnitConfirmation}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color={GRAYSCALE_PRIMARY} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalForm}>
                <Text style={styles.modalQuestionText}>
                  {unitConfirmation?.question || 'The extracted unit was not recognized. Please confirm the correct unit of measurement.'}
                </Text>

                <Text style={styles.modalLabel}>Unit:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., lb, kg, L, mL"
                  value={confirmedUnit}
                  onChangeText={setConfirmedUnit}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {unitConfirmation?.extractedUnit && (
                  <Text style={styles.modalHintText}>
                    Extracted: "{unitConfirmation.extractedUnit}"
                    {unitConfirmation.normalizedUnit && ` (normalized: "${unitConfirmation.normalizedUnit}")`}
                  </Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={handleCancelUnitConfirmation}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmButton,
                      !confirmedUnit.trim() && styles.modalConfirmButtonDisabled,
                    ]}
                    onPress={handleConfirmUnit}
                    disabled={!confirmedUnit.trim()}
                  >
                    <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  )

  if (!packagingData && !showUnitConfirmationModal) {
    return (
      <>
        <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No packaging data available</Text>
          </View>
        </AppBarLayout>
        {renderUnitConfirmationModal()}
      </>
    )
  }

  // If unit confirmation is required but no packaging data yet, show minimal UI
  if (showUnitConfirmationModal && !packagingData) {
    return (
      <>
        <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Please confirm the unit...</Text>
          </View>
        </AppBarLayout>
        {renderUnitConfirmationModal()}
      </>
    )
  }

  if (!effectivePackagingData) {
    return (
      <>
        <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No packaging data available</Text>
          </View>
        </AppBarLayout>
        {renderUnitConfirmationModal()}
      </>
    )
  }

  const { packaging } = effectivePackagingData

  return (
    <>
      <AppBarLayout title="Manage Stock" onBackPress={handleGoBack}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Show non-blocking error banner if there's an error */}
        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="info-outline" size={20} color="#888888" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity
              style={styles.errorBannerRetry}
              onPress={extractPackaging}
              activeOpacity={0.7}
            >
              <MaterialIcons name="refresh" size={18} color={GRAYSCALE_PRIMARY} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.headerCard}>
          <Text style={styles.itemName}>{itemName}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Quantity:</Text>
            <TextInput
              style={styles.orderQuantityInput}
              value={localOrderQuantity !== null ? localOrderQuantity.toString() : packaging.orderQuantity.toString()}
              onChangeText={(text) => {
                if (text === '') {
                  setLocalOrderQuantity(0)
                  return
                }
                const numValue = parseFloat(text)
                if (!isNaN(numValue) && numValue >= 0) {
                  setLocalOrderQuantity(numValue)
                }
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Packaging Level:</Text>
            <Text style={styles.infoValue}>
              {packaging.orderPackagingLevel.charAt(0).toUpperCase() +
                packaging.orderPackagingLevel.slice(1)}
            </Text>
          </View>
          {packaging.confidence !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Confidence:</Text>
              <Text style={styles.infoValue}>
                {(packaging.confidence * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Primary Packaging */}
        {packaging.primaryPackaging && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Primary Packaging</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPrimaryPackaging}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={GRAYSCALE_PRIMARY} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.packagingItem}>
              <Text style={styles.packagingDescription}>{packaging.primaryPackaging.description}</Text>
              {packaging.primaryPackaging.material && (
                <Text style={styles.packagingDetail}>Material: {packaging.primaryPackaging.material}</Text>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity:</Text>
                <Text style={styles.infoValue}>{packaging.primaryPackaging.quantity}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unit:</Text>
                <Text style={styles.infoValue}>{packaging.primaryPackaging.unit}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Secondary Packaging */}
        {packaging.secondaryPackaging && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Secondary Packaging</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditSecondaryPackaging}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={18} color={GRAYSCALE_PRIMARY} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.packagingItem}>
              <Text style={styles.packagingDescription}>{packaging.secondaryPackaging.description}</Text>
              {packaging.secondaryPackaging.material && (
                <Text style={styles.packagingDetail}>Material: {packaging.secondaryPackaging.material}</Text>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity:</Text>
                <Text style={styles.infoValue}>{packaging.secondaryPackaging.quantity}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Primary units per {packaging.secondaryPackaging.description}:</Text>
                <Text style={styles.infoValue}>{packaging.secondaryPackaging.primaryPackagesPerSecondary}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Total Primary Packages - Prominently Displayed */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Total Primary Packages: {packaging.totalPrimaryPackages.toLocaleString()}
          </Text>
          {packaging.primaryPackaging && (
            <>
            <Text style={styles.totalAmount}>
              {(packaging.totalPrimaryPackages * packaging.primaryPackaging.quantity).toLocaleString()}
              {packaging.primaryPackaging.unit && ` ${packaging.primaryPackaging.unit}`}
            </Text>
              {itemAmount !== null && packaging.totalPrimaryPackages > 0 && (
                <View style={styles.costPerUnitContainer}>
                  <Text style={styles.costPerUnitLabel}>Cost per primary package:</Text>
                  <Text style={styles.costPerUnitAmount}>
                    {formatAmount(itemAmount / packaging.totalPrimaryPackages, currency, true)}
                  </Text>
                </View>
              )}
              {itemAmount !== null && packaging.totalPrimaryPackages > 0 && packaging.primaryPackaging.quantity > 0 && (
                <View style={styles.costPerUnitContainer}>
                  <Text style={styles.costPerUnitLabel}>Cost per {packaging.primaryPackaging.unit || 'unit'}:</Text>
                  <Text style={styles.costPerUnitAmount}>
                    {new Intl.NumberFormat('en-GB', {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    }).format(itemAmount / (packaging.totalPrimaryPackages * packaging.primaryPackaging.quantity))}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Simple Grid */}
        {packaging.primaryPackaging && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Packaging Hierarchy</Text>
            <Text style={styles.primaryPackagingLabel}>
              {(() => {
                const primary = packaging.primaryPackaging!
                const description = primary.description || 'Primary Packaging'
                
                if (packaging.orderPackagingLevel === 'primary') {
                  // For primary level: show order quantity x primary quantity unit
                  const orderQuantity = packaging.orderQuantity || 0
                  const primaryQuantity = primary.quantity || 0
                  const unit = primary.unit || ''
                  return `${orderQuantity} x ${primaryQuantity}${unit ? ` ${unit}` : ''}`
                } else {
                  // For secondary level: show description x primaryPackagesPerSecondary x quantity unit
                  const primaryPackagesPerSecondary = packaging.secondaryPackaging?.primaryPackagesPerSecondary || 12
                  const quantity = primary.quantity || 0
                  const unit = primary.unit || ''
                  return `${description} x ${primaryPackagesPerSecondary} x ${quantity}${unit ? ` ${unit}` : ''}`
                }
              })()}
            </Text>
            <View style={styles.gridWithLabel}>
              <View style={styles.secondaryPackagingLabel}>
                <Text style={styles.secondaryPackagingLabelText}>
                  {(() => {
                    if (packaging.orderPackagingLevel === 'primary') {
                      // Show just the primary packaging type
                      const primary = packaging.primaryPackaging!
                      return primary.description || 'Primary Packaging'
                    } else {
                      // Show secondary packaging label
                      if (!packaging.secondaryPackaging) return ''
                      const secondary = packaging.secondaryPackaging
                      const quantity = secondary.quantity || 1
                      const description = secondary.description || 'case'
                      return `${quantity} ${description}`
                    }
                  })()}
                </Text>
              </View>
              <View style={styles.simpleGrid}>
                {(() => {
                  // Determine number of columns based on packaging level
                  const numCols = packaging.orderPackagingLevel === 'primary'
                    ? packaging.orderQuantity
                    : (packaging.secondaryPackaging?.primaryPackagesPerSecondary || 12)
                  
                  // Determine number of rows
                  if (packaging.orderPackagingLevel === 'primary') {
                    // If primary level, show just one row with orderQuantity columns
                    return (
                      <View style={styles.gridRow}>
                        {Array.from({ length: numCols }, (_, colIdx) => (
                          <View key={colIdx} style={styles.gridCell}>
                            <View style={styles.miniCard} />
                          </View>
                        ))}
                      </View>
                    )
                  } else {
                    // Otherwise, create rows based on secondary packaging quantity
                    if (!packaging.secondaryPackaging) return null
                    
                    const rows: React.ReactNode[] = []
                    const quantity = packaging.secondaryPackaging.quantity || 1
                    for (let i = 0; i < quantity; i++) {
                      rows.push(
                        <View key={`row-${i}`} style={styles.gridRow}>
                          {Array.from({ length: numCols }, (_, colIdx) => (
                            <View key={colIdx} style={styles.gridCell}>
                              <View style={styles.miniCard} />
                            </View>
                          ))}
                        </View>
                      )
                    }
                    
                    return rows
                  }
                })()}
              </View>
            </View>
            {/* Report missing or damaged button */}
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => {
                // No action for now
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={18} color="#4a4a4a" style={styles.reportButtonIcon} />
              <Text style={styles.reportButtonText}>Report missing or damaged</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Invoice Card - Only show if we have a transactionId */}
        {transactionId && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Invoice</Text>
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={handleViewInvoice}
              activeOpacity={0.7}
              disabled={invoiceLoading}
            >
              {invoiceLoading ? (
                <ActivityIndicator size="small" color={GRAYSCALE_PRIMARY} />
              ) : (
                <MaterialIcons name="description" size={20} color={GRAYSCALE_PRIMARY} />
              )}
              <Text style={styles.invoiceButtonText}>
                {invoiceLoading ? 'Loading...' : 'View Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        {packaging.notes && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{packaging.notes}</Text>
          </View>
        )}

        {/* Debit Account Selection - Only show for new items from "Receiving" section */}
        {transactionId && itemIndex !== undefined && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Item Type</Text>
            <Text style={styles.selectionSubtext}>Select whether this is Raw Materials or Finished Goods</Text>
            <View style={styles.segmentedButtonsWrapper}>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  selectedDebitAccount === 'Raw Materials' && styles.segmentedButtonActive,
                  { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderRightWidth: 0.5 },
                ]}
                onPress={() => setSelectedDebitAccount('Raw Materials')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    selectedDebitAccount === 'Raw Materials' && styles.segmentedButtonTextActive,
                  ]}
                >
                  Raw Materials
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentedButton,
                  selectedDebitAccount === 'Finished Goods' && styles.segmentedButtonActive,
                  { borderTopRightRadius: 8, borderBottomRightRadius: 8, borderLeftWidth: 0.5 },
                ]}
                onPress={() => setSelectedDebitAccount('Finished Goods')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    selectedDebitAccount === 'Finished Goods' && styles.segmentedButtonTextActive,
                  ]}
                >
                  Finished Goods
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (updatingStatus || (transactionId && itemIndex !== undefined && !selectedDebitAccount)) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmAndSave}
          activeOpacity={0.8}
          disabled={updatingStatus || !!(transactionId && itemIndex !== undefined && !selectedDebitAccount)}
        >
          {updatingStatus ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
          <Text style={styles.confirmButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </AppBarLayout>
      {renderUnitConfirmationModal()}
      {/* Invoice Modal */}
      <Modal
        visible={showInvoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <TouchableOpacity
          style={styles.invoiceModalOverlay}
          activeOpacity={1}
          onPress={() => setShowInvoiceModal(false)}
        >
          <View style={styles.invoiceModalContainer} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              style={[styles.invoiceModalCloseButton, { top: insets.top + 16 }]}
              onPress={() => setShowInvoiceModal(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            {invoiceUrl && invoiceType === 'image' && (
              <Image
                source={{ uri: invoiceUrl }}
                style={styles.invoiceImage}
                resizeMode="contain"
              />
            )}
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
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: GRAYSCALE_PRIMARY,
  },
  costPerUnitContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  costPerUnitLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 4,
  },
  costPerUnitAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888888',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  orderQuantityInput: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    textAlign: 'right',
    backgroundColor: '#ffffff',
  },
  packagingItem: {
    marginBottom: 0,
  },
  packagingDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 6,
  },
  packagingDetail: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryPackagingLabel: {
    fontSize: 14,
    color: '#4a4a4a',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '500',
  },
  gridWithLabel: {
    flexDirection: 'row',
    marginTop: 8,
  },
  secondaryPackagingLabel: {
    justifyContent: 'center',
    paddingRight: 12,
    minWidth: 60,
  },
  secondaryPackagingLabelText: {
    fontSize: 14,
    color: '#4a4a4a',
    fontWeight: '500',
    textAlign: 'right',
  },
  simpleGrid: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  gridCell: {
    flex: 1,
    height: 60,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  reportButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
  },
  reportButtonIcon: {
    marginRight: 8,
  },
  reportButtonText: {
    color: '#4a4a4a',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionSubtext: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 12,
    marginTop: 4,
  },
  segmentedButtonsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    marginTop: 8,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#e0e0e0',
  },
  segmentedButtonActive: {
    backgroundColor: GRAYSCALE_PRIMARY,
  },
  segmentedButtonText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    fontWeight: '500',
    textAlign: 'center',
  },
  segmentedButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    gap: 16,
  },
  modalQuestionText: {
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: GRAYSCALE_PRIMARY,
    backgroundColor: '#ffffff',
  },
  modalHintText: {
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999999',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: GRAYSCALE_PRIMARY,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  invoiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceModalContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  invoiceModalCloseButton: {
    position: 'absolute',
    right: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceImage: {
    width: '100%',
    height: '100%',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorBanner: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  errorBannerRetry: {
    padding: 4,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f6f6f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
})

