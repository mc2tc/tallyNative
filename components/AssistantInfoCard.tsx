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
}: AssistantInfoCardProps) {
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Create a looping animation that fills from left to right
    const animate = () => {
      // Reset to 0
      progressAnim.setValue(0)
      // Animate to 1 (100%)
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 4000, // 4 seconds to fill
        useNativeDriver: false, // width animation requires layout props
      }).start(() => {
        // Wait 2 seconds before starting again
        setTimeout(() => {
          animate()
        }, 2000)
      })
    }
    animate()
  }, [progressAnim])

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

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
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth,
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
    backgroundColor: GRAYSCALE_PRIMARY,
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
