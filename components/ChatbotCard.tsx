import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Animated, PanResponder, Dimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

interface Message {
  id: string
  text: string
  isUser: boolean
  showButtons?: boolean
  learnMoreOnly?: boolean
}

export function ChatbotCard() {
  const SCREEN_HEIGHT = Dimensions.get('window').height
  // TranslateY offsets relative to a full-height container (top: 0, bottom: 0)
  const FULL_SHEET_OFFSET = 0 // full-screen, bottom fixed to device bottom
  const HALF_SHEET_OFFSET = SCREEN_HEIGHT * 0.5 // visible half-screen position
  const DISMISS_OFFSET = SCREEN_HEIGHT // pushed completely off-screen

  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const scrollViewRef = useRef<ScrollView>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi John. It looks like we're running low on flour and suet! We have two suppliers and Trethewy's Baking Supplies is the least expensive and they're in the Tally network. Cash is tight but their credit terms are good and cash flow is trending up. Would you like me to make an order?",
      isUser: false,
      showButtons: true,
    },
    {
      id: '2',
      text: "I noticed from the Production Management System that product output fell in the last batch - waste was up 3.2%. I suggest that you look into this in more detail particulalry as we had a new foreman on that shift! A 3.2% increase in waste on a batch of 1000 traditional pasties equates to £350 off the bottom line!",
      isUser: false,
      showButtons: true,
      learnMoreOnly: true,
    },
  ])
  const [inputText, setInputText] = useState('')
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'denied'>('pending')
  const [modalVisible, setModalVisible] = useState(false)
  const slideAnim = useRef(new Animated.Value(DISMISS_OFFSET)).current // Start off-screen below
  const panY = useRef(0)
  const dragStartValue = useRef(HALF_SHEET_OFFSET)

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false })
    }, 100)
  }, [messages])

  // Modal animation effect
  useEffect(() => {
    if (modalVisible) {
      // Animate from off-screen to half-screen position
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
  }, [modalVisible, slideAnim, DISMISS_OFFSET, HALF_SHEET_OFFSET])

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
        // Allow dragging up (expand) and down (collapse/dismiss)
        const newValue = Math.min(
          DISMISS_OFFSET,
          Math.max(FULL_SHEET_OFFSET, dragStartValue.current + gestureState.dy)
        )
        slideAnim.setValue(newValue)
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 80

        slideAnim.stopAnimation((value) => {
          const currentValue = typeof value === 'number' ? value : HALF_SHEET_OFFSET

          // Decide final position: full, half, or dismiss
          const isSwipingDownFast = gestureState.vy > 0.8
          const isSwipingUpFast = gestureState.vy < -0.8

          if (currentValue > HALF_SHEET_OFFSET + threshold || isSwipingDownFast) {
            // Dismiss modal - animate down and then hide
            Animated.timing(slideAnim, {
              toValue: DISMISS_OFFSET,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setModalVisible(false)
              slideAnim.setValue(DISMISS_OFFSET)
            })
          } else if (currentValue < HALF_SHEET_OFFSET - threshold || isSwipingUpFast) {
            // Expand to full screen
            Animated.spring(slideAnim, {
              toValue: FULL_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start()
          } else {
            // Snap back to half-screen position
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

  const handleSend = () => {
    if (inputText.trim() === '') return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])
    setInputText('')

    // Simulate AI response (simple echo for now)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `You said: "${inputText}". This is a placeholder response.`,
        isUser: false,
      }
      setMessages((prev) => [...prev, aiMessage])
    }, 500)
  }

  const PADDING = 12
  const cardStyle = [
    styles.card,
    {
      marginTop: PADDING,
      marginBottom: PADDING + tabBarHeight,
      paddingBottom: PADDING + insets.bottom,
    },
  ]

  return (
    <View style={cardStyle}>
      <Text style={styles.title}>Your Business Assistant</Text>
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={true}
      >
        {messages.map((message) => (
          <View key={message.id}>
            <View
              style={[styles.messageBubble, message.isUser ? styles.userMessage : styles.aiMessage]}
            >
              <Text style={[styles.messageText, message.isUser && styles.userMessageText]}>
                {message.text}
              </Text>
              {message.showButtons && (
                <View style={styles.buttonContainer}>
                  {!message.learnMoreOnly && (
                    <TouchableOpacity
                      onPress={() => {
                        // Hide buttons on this message
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === message.id ? { ...msg, showButtons: false } : msg
                          )
                        )
                        const yesMessage: Message = {
                          id: Date.now().toString(),
                          text: 'Great! I\'ll proceed with the order from Trethewy\'s Baking Supplies.',
                          isUser: false,
                        }
                        setMessages((prev) => [...prev, yesMessage])
                      }}
                      style={[styles.actionButton, styles.approveButton]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.approveButtonText}>Yes please</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      // Hide buttons on this message
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === message.id ? { ...msg, showButtons: false } : msg
                        )
                      )
                      const moreInfoMessage: Message = {
                        id: Date.now().toString(),
                        text: message.learnMoreOnly 
                          ? 'Here\'s more detailed analysis of the waste increase and recommendations for improvement...'
                          : 'Here\'s more information about the suppliers and pricing comparison...',
                        isUser: false,
                      }
                      setMessages((prev) => [...prev, moreInfoMessage])
                    }}
                    style={[styles.actionButton, styles.denyButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.denyButtonText}>Learn more</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor="#999999"
          multiline
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} activeOpacity={0.7}>
          <MaterialIcons name="send" size={24} color="#333333" />
        </TouchableOpacity>
      </View>

      {/* Learn More Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <Animated.View
            style={[
              styles.modalContentContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalContent} {...panResponder.panHandlers}>
              {/* Drag handle */}
              <View style={styles.modalHandleContainer}>
                <View style={styles.modalHandle} />
              </View>
              
              <ScrollView 
                style={styles.modalScrollView} 
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: 24 + insets.bottom }, // ensure space above system gesture bar
                ]}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.modalTitle}>About Data Monitoring</Text>
                <Text style={styles.modalText}>
                  Our intelligent monitoring system continuously analyzes your business data to provide
                  valuable insights and recommendations. This helps you make informed decisions and
                  identify opportunities for growth.
                </Text>
                <Text style={styles.modalText}>
                  The system tracks key performance indicators including revenue trends, expense patterns,
                  cash flow, and operational efficiency. When significant changes or opportunities are
                  detected, you'll receive timely alerts and actionable recommendations.
                </Text>
                <Text style={styles.modalText}>
                  All monitoring is done with your privacy and security in mind. You maintain full control
                  over your data and can adjust monitoring preferences at any time through the settings.
                </Text>
                <Text style={styles.modalText}>
                  By enabling monitoring, you'll gain access to predictive analytics, automated insights,
                  and personalized recommendations tailored to your business needs.
                </Text>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#cccccc',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  messagesContainer: {
    marginBottom: 12,
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#e0e0e0',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#333333',
  },
  userMessageText: {
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333333',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#333333',
    borderColor: '#333333',
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  denyButton: {
    backgroundColor: '#ffffff',
    borderColor: '#cccccc',
  },
  denyButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flex: 1,
  },
  modalHandleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cccccc',
    borderRadius: 2,
  },
  modalScrollView: {
    flexGrow: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40, // extra bottom padding so text doesn't touch device edge
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
})

