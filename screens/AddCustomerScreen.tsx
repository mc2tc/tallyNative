import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Autocomplete from 'react-native-autocomplete-input'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppBarLayout } from '../components/AppBarLayout'
import { useAuth } from '../lib/auth/AuthContext'
import { customersApi, type Customer } from '../lib/api/customers'
import { ApiError } from '../lib/api/client'
import type { TransactionsStackParamList } from '../navigation/TransactionsNavigator'

const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'

type AddCustomerRouteProp = RouteProp<TransactionsStackParamList, 'AddCustomer'>

export default function AddCustomerScreen() {
  const navigation = useNavigation<NavigationProp<TransactionsStackParamList>>()
  const route = useRoute<AddCustomerRouteProp>()
  const { businessUser } = useAuth()
  const insets = useSafeAreaInsets()

  const [inputText, setInputText] = useState('')
  const [projectName, setProjectName] = useState('')
  const [estimatedProjectValue, setEstimatedProjectValue] = useState('')
  const [source, setSource] = useState('')
  const [selectedStage, setSelectedStage] = useState<'lead' | 'conversation' | 'proposal' | 'won' | 'lost'>('lead')
  const [showStagePicker, setShowStagePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customersLoaded, setCustomersLoaded] = useState(false)

  const SCREEN_HEIGHT = Dimensions.get('window').height
  const HALF_SHEET_OFFSET = SCREEN_HEIGHT * 0.4 // visible position (40% from bottom)
  const DISMISS_OFFSET = SCREEN_HEIGHT // pushed completely off-screen
  const slideAnim = useRef(new Animated.Value(DISMISS_OFFSET)).current
  const panY = useRef(0)
  const dragStartValue = useRef(HALF_SHEET_OFFSET)

  useEffect(() => {
    if (showStagePicker) {
      // Animate from off-screen to visible position
      slideAnim.setValue(DISMISS_OFFSET)
      Animated.spring(slideAnim, {
        toValue: HALF_SHEET_OFFSET,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      // Reset to off-screen when hidden
      slideAnim.setValue(DISMISS_OFFSET)
    }
  }, [showStagePicker, slideAnim, DISMISS_OFFSET, HALF_SHEET_OFFSET])

  // Load all customers when component mounts
  useEffect(() => {
    const loadAllCustomers = async () => {
      if (customersLoaded || loadingCustomers) {
        return
      }

      const businessId = businessUser?.businessId
      if (!businessId) {
        return
      }

      setLoadingCustomers(true)
      try {
        const response = await customersApi.getCustomers(businessId, {
          limit: 100, // Get up to 100 customers
        })
        setAllCustomers(response.customers)
        setCustomersLoaded(true)
      } catch (error) {
        // Silently fail - don't show error for autocomplete
        console.warn('Failed to fetch customers:', error)
        setAllCustomers([])
      } finally {
        setLoadingCustomers(false)
      }
    }

    loadAllCustomers()
  }, [businessUser?.businessId, customersLoaded, loadingCustomers])

  // Filter customers locally based on input text
  const filteredCustomers = useMemo(() => {
    const trimmedSearch = inputText.trim().toLowerCase()
    if (!trimmedSearch) {
      return []
    }
    return allCustomers
      .filter(customer => 
        customer.name.toLowerCase().includes(trimmedSearch)
      )
      .slice(0, 10) // Limit to 10 suggestions for display
  }, [inputText, allCustomers])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to vertical drags (up or down)
        return Math.abs(gestureState.dy) > 5
      },
      onPanResponderGrant: () => {
        panY.current = 0
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = typeof value === 'number' ? value : HALF_SHEET_OFFSET
        })
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow dragging down (dismiss)
        const newValue = Math.min(
          DISMISS_OFFSET,
          Math.max(HALF_SHEET_OFFSET, dragStartValue.current + gestureState.dy)
        )
        slideAnim.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80

        slideAnim.stopAnimation((value) => {
          const currentValue = typeof value === 'number' ? value : HALF_SHEET_OFFSET

          // Decide final position: dismiss or snap back
          const isSwipingDownFast = gestureState.vy > 0.8

          if (currentValue > HALF_SHEET_OFFSET + threshold || isSwipingDownFast) {
            // Dismiss modal - animate down and then hide
            Animated.timing(slideAnim, {
              toValue: DISMISS_OFFSET,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setShowStagePicker(false)
              slideAnim.setValue(DISMISS_OFFSET)
            })
          } else {
            // Snap back to visible position
            Animated.spring(slideAnim, {
              toValue: HALF_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start()
          }
        })
      },
    })
  ).current

  const handleSave = async () => {
    const trimmedName = inputText.trim()
    if (!trimmedName) {
      return
    }

    // Validate project name if required
    const trimmedProjectName = projectName.trim()
    const isProjectNameRequired = selectedStage !== 'lead' && selectedStage !== 'conversation'
    if (isProjectNameRequired && !trimmedProjectName) {
      Alert.alert('Validation Error', 'Project name is required for this stage.')
      return
    }

    // Validate estimated project value if required
    const trimmedEstimatedValue = estimatedProjectValue.trim()
    const isEstimatedValueRequired = selectedStage !== 'lead' && selectedStage !== 'conversation'
    if (isEstimatedValueRequired && !trimmedEstimatedValue) {
      Alert.alert('Validation Error', 'Estimated Project Value is required for this stage.')
      return
    }

    const businessId = businessUser?.businessId
    if (!businessId) {
      Alert.alert('Error', 'No business selected. Please select a business first.')
      return
    }

    setSaving(true)
    try {
      await customersApi.createCustomer(businessId, {
        name: trimmedName,
        stage: selectedStage,
        ...(trimmedProjectName && { projectName: trimmedProjectName }),
        ...(trimmedEstimatedValue && { estimatedProjectValue: trimmedEstimatedValue }),
        ...(source.trim() && { source: source.trim() }),
      })
      
      // Success - navigate back
      navigation.goBack()
      // TODO: Refresh the sales pipeline data to show the new customer
    } catch (error) {
      let errorMessage = 'Failed to create customer. Please try again.'
      
      if (error instanceof ApiError) {
        if (error.status === 400) {
          errorMessage = 'Invalid customer name. Please check and try again.'
        } else if (error.status === 401) {
          errorMessage = 'Please sign in to continue.'
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to create customers.'
        } else if (error.status === 404) {
          errorMessage = 'Business not found.'
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.'
        } else if (error.status >= 500) {
          errorMessage = 'Server error. Please try again later.'
        }
      }
      
      Alert.alert('Error', errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppBarLayout title="Add Lead" onBackPress={() => navigation.goBack()}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 24 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Stage Selector */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Stage</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowStagePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectInputText}>
              {selectedStage === 'lead' ? 'Lead' :
               selectedStage === 'conversation' ? 'In Conversation' :
               selectedStage === 'proposal' ? 'Proposal / Quote Sent' :
               selectedStage === 'won' ? 'Closed WON' :
               'Closed LOST'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={GRAYSCALE_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Customer Name Input with Autocomplete */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            Customer name
            <Text style={styles.requiredIndicator}> *</Text>
          </Text>
          {selectedStage === 'lead' ? (
            <TextInput
              style={styles.textInput}
              placeholder="Enter customer name"
              placeholderTextColor={GRAYSCALE_SECONDARY}
              value={inputText}
              onChangeText={setInputText}
            />
          ) : (
            <View style={styles.autocompleteContainer}>
              {loadingCustomers && (
                <View style={styles.loadingIndicator}>
                  <ActivityIndicator size="small" color={GRAYSCALE_SECONDARY} />
                </View>
              )}
              <Autocomplete
                data={filteredCustomers}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Enter customer name"
                placeholderTextColor={GRAYSCALE_SECONDARY}
                inputContainerStyle={styles.autocompleteInputContainer}
                containerStyle={styles.autocompleteWrapper}
                listContainerStyle={styles.autocompleteListContainer}
                renderTextInput={(props) => (
                  <TextInput
                    {...props}
                    style={styles.textInput}
                    placeholder="Enter customer name"
                    placeholderTextColor={GRAYSCALE_SECONDARY}
                  />
                )}
                flatListProps={{
                  keyExtractor: (item) => item.id,
                  renderItem: ({ item: customer, index }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        index === filteredCustomers.length - 1 && styles.suggestionItemLast,
                        pressed && styles.suggestionItemPressed,
                      ]}
                      onPress={() => {
                        setInputText(customer.name)
                      }}
                    >
                      <Text style={styles.suggestionText}>{customer.name}</Text>
                    </Pressable>
                  ),
                  keyboardShouldPersistTaps: 'handled',
                  scrollEnabled: filteredCustomers.length > 5,
                  ItemSeparatorComponent: () => null,
                  style: styles.autocompleteList,
                }}
              />
            </View>
          )}
        </View>

        {/* Project Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            Project name
            {selectedStage === 'lead' || selectedStage === 'conversation' ? (
              <Text style={styles.optionalIndicator}> (optional)</Text>
            ) : (
              <Text style={styles.requiredIndicator}> *</Text>
            )}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter project name"
            placeholderTextColor={GRAYSCALE_SECONDARY}
            value={projectName}
            onChangeText={setProjectName}
          />
        </View>

        {/* Estimated Project Value Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            Estimated Project Value
            {selectedStage === 'lead' || selectedStage === 'conversation' ? (
              <Text style={styles.optionalIndicator}> (optional)</Text>
            ) : (
              <Text style={styles.requiredIndicator}> *</Text>
            )}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter estimated project value"
            placeholderTextColor={GRAYSCALE_SECONDARY}
            value={estimatedProjectValue}
            onChangeText={setEstimatedProjectValue}
            keyboardType="numeric"
          />
        </View>

        {/* Source Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Source</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter source"
            placeholderTextColor={GRAYSCALE_SECONDARY}
            value={source}
            onChangeText={setSource}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!inputText.trim() || saving || 
             (selectedStage !== 'lead' && selectedStage !== 'conversation' && !projectName.trim()) ||
             (selectedStage !== 'lead' && selectedStage !== 'conversation' && !estimatedProjectValue.trim())) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={
            !inputText.trim() || saving || 
            (selectedStage !== 'lead' && selectedStage !== 'conversation' && !projectName.trim()) ||
            (selectedStage !== 'lead' && selectedStage !== 'conversation' && !estimatedProjectValue.trim())
          }
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>

        {/* Stage Picker Modal */}
        <Modal
          visible={showStagePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStagePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowStagePicker(false)}
            />
            <Animated.View
              style={[
                styles.pickerContentContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.pickerContent}>
                {/* Drag handle */}
                <View style={styles.pickerHandleContainer} {...panResponder.panHandlers}>
                  <View style={styles.pickerHandle} />
                </View>

                <View style={styles.pickerListContainer}>
                  <Text style={styles.pickerTitle}>Select Stage</Text>
                  {(['lead', 'conversation', 'proposal', 'won', 'lost'] as const).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.pickerOption,
                        selectedStage === stage && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedStage(stage)
                        setShowStagePicker(false)
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          selectedStage === stage && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {stage === 'lead' ? 'Lead' :
                         stage === 'conversation' ? 'In Conversation' :
                         stage === 'proposal' ? 'Proposal / Quote Sent' :
                         stage === 'won' ? 'Closed WON' :
                         'Closed LOST'}
                      </Text>
                      {selectedStage === stage && (
                        <MaterialIcons name="check" size={20} color={GRAYSCALE_PRIMARY} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </ScrollView>
    </AppBarLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 8,
  },
  requiredIndicator: {
    color: '#d32f2f',
  },
  optionalIndicator: {
    color: GRAYSCALE_SECONDARY,
    fontWeight: '400',
  },
  selectInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 1,
  },
  autocompleteWrapper: {
    flex: 1,
  },
  autocompleteInputContainer: {
    borderWidth: 0,
    padding: 0,
    margin: 0,
    paddingLeft: 4, // Add padding to the container
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 40, // Make room for loading indicator
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 44,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: 14,
    zIndex: 2,
  },
  autocompleteListContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  autocompleteList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    minHeight: 48,
    justifyContent: 'center',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionItemPressed: {
    backgroundColor: '#f5f5f5',
  },
  suggestionText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: GRAYSCALE_PRIMARY,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContentContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  pickerContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '60%',
  },
  pickerHandleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
  },
  pickerListContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: GRAYSCALE_PRIMARY,
    marginBottom: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionSelected: {
    backgroundColor: '#f5f5f5',
  },
  pickerOptionText: {
    fontSize: 14,
    color: GRAYSCALE_PRIMARY,
    flex: 1,
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
  },
})

