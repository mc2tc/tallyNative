import React, { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface AssistantInfoCardProps {
  title: string
  description: string
  icon: keyof typeof MaterialIcons.glyphMap
  unreadCount: number
  onPress: () => void
  actionText?: string // Optional custom action text
  progressBarColor?: string // Color for the moving bit
  animationDelay?: number // Delay in ms before starting animation
}

// Match the style from "Understanding your Purchases pipeline" info card
const SURFACE_BACKGROUND = '#f6f6f6'
const GRAYSCALE_PRIMARY = '#4a4a4a'
const GRAYSCALE_SECONDARY = '#6d6d6d'
// Darker grayscale for bottom cards
const CARD_BACKGROUND = '#e8e8e8'
const CARD_TEXT_PRIMARY = '#333333'
const CARD_TEXT_SECONDARY = '#555555'

export function AssistantInfoCard({
  title,
  description,
  icon,
  unreadCount,
  onPress,
  actionText,
  progressBarColor = GRAYSCALE_PRIMARY,
  animationDelay = 0,
}: AssistantInfoCardProps) {
  const progressAnim = useRef(new Animated.Value(-50)).current
  const containerWidth = useRef(0)
  const animationLoopRef = useRef<(() => void) | null>(null)

  // Create the animation loop function
  const startAnimation = () => {
    if (containerWidth.current <= 0) return

    const animate = () => {
      // Reset to left (negative to start off-screen)
      progressAnim.setValue(-50) // Start off-screen to the left
      // Animate to right (container width + bit width to end off-screen)
      Animated.timing(progressAnim, {
        toValue: containerWidth.current + 50, // End off-screen to the right
        duration: 4000, // 4 seconds to cross
        useNativeDriver: true, // translateX can use native driver
      }).start(() => {
        // Wait 2 seconds before starting again
        setTimeout(() => {
          animate()
        }, 2000)
      })
    }
    animationLoopRef.current = animate
    
    // Apply delay before starting animation
    if (animationDelay > 0) {
      setTimeout(() => {
        animate()
      }, animationDelay)
    } else {
      animate()
    }
  }

  const progressTranslateX = progressAnim

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View
            style={styles.progressBarContainer}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width
              if (width > 0 && containerWidth.current !== width) {
                containerWidth.current = width
                // Start animation if not already running
                if (!animationLoopRef.current) {
                  startAnimation()
                }
              }
            }}
          >
            <Animated.View
              style={[
                styles.progressBar,
                {
                  transform: [{ translateX: progressTranslateX }],
                  backgroundColor: progressBarColor,
                },
              ]}
            />
          </View>
          <Text style={styles.body}>{description}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>{actionText || 'Open'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: CARD_TEXT_PRIMARY,
    flex: 1,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: '#d0d0d0',
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: 50, // Fixed width for the moving bit
  },
  body: {
    fontSize: 13,
    color: CARD_TEXT_SECONDARY,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  viewDetailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewDetailsText: {
    fontSize: 13,
    color: CARD_TEXT_PRIMARY,
    fontWeight: '500',
  },
})
