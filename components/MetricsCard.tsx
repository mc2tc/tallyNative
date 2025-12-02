import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated, PanResponder, Dimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { MaterialIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { HomeStackParamList } from '../navigation/HomeNavigator'
import type { HealthScoreResponse } from '../lib/api/transactions2'

interface CircularMetricProps {
  value: number | string
  label: string
  progress?: number // 0-100 for progress percentage
  size?: 'large' | 'small'
  subtitle?: string
  onSubtitlePress?: () => void
  onPress?: () => void
}

function CircularMetric({ value, label, progress = 0, size = 'small', subtitle, onSubtitlePress, onPress }: CircularMetricProps) {
  const isLarge = size === 'large'
  const circleSize = isLarge ? 160 : 100
  const strokeWidth = isLarge ? 12 : 8
  const radius = (circleSize - strokeWidth) / 2
  const center = circleSize / 2

  // Arc spans from 8 o'clock (240°) to 4 o'clock (120°)
  // Total arc is 240° (going clockwise: 240° -> 360° -> 120°)
  const startAngle = 240 // 8 o'clock position (degrees from top, clockwise)
  const endAngle = 120 // 4 o'clock position
  const totalArcDegrees = 240 // Total span from 8 to 4 o'clock
  const progressPercent = Math.min(100, Math.max(0, progress))
  const progressAngle = (progressPercent / 100) * totalArcDegrees
  const currentAngle = startAngle + progressAngle

  // Convert degrees to radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  // Calculate point on circle
  const getPointOnCircle = (angle: number) => {
    const rad = toRadians(angle - 90) // Subtract 90 to start from top
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    }
  }

  // Create arc path
  const createArcPath = () => {
    if (progressAngle === 0) return ''

    const start = getPointOnCircle(startAngle)
    const end = getPointOnCircle(currentAngle)
    const largeArcFlag = progressAngle > 180 ? 1 : 0

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  }

  const content = (
    <View style={[styles.circleWrapper, { width: circleSize, height: circleSize }]}>
      {/* SVG for circular progress */}
      <Svg width={circleSize} height={circleSize} style={styles.svgContainer}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc */}
        {progress > 0 && (
          <Path
            d={createArcPath()}
            stroke="#333333"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
          />
        )}
      </Svg>
      {/* Center content */}
      <View style={styles.circleContent}>
        <Text style={[styles.valueText, isLarge && styles.valueTextLarge]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text style={[styles.labelText, isLarge && styles.labelTextLarge]}>{label}</Text>
        {subtitle && isLarge && (
          <TouchableOpacity onPress={onSubtitlePress} activeOpacity={0.7}>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  if (onPress && size === 'small') {
    return (
      <TouchableOpacity
        style={styles.metricContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.metricContainer}>
      {content}
    </View>
  )
}

interface MetricsCardProps {
  largeMetric: {
    value: number | string
    label: string
    progress?: number
  }
  smallMetrics: Array<{
    value: number | string
    label: string
    progress?: number
  }>
  currentRatio?: number
  healthScore?: HealthScoreResponse['data']['healthScore']
}

export function MetricsCard({ largeMetric, smallMetrics, currentRatio = 60, healthScore }: MetricsCardProps) {
  const SCREEN_HEIGHT = Dimensions.get('window').height
  // TranslateY offsets relative to a full-height container (top: 0, bottom: 0)
  // Keep FULL_SHEET_OFFSET slightly below the very top so the drag handle stays reachable
  const FULL_SHEET_OFFSET = 40 // almost full-screen, avoids OS edge gestures at the very top
  const HALF_SHEET_OFFSET = SCREEN_HEIGHT * 0.5 // visible half-screen position
  const DISMISS_OFFSET = SCREEN_HEIGHT // pushed completely off-screen

  const insets = useSafeAreaInsets()
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = previous week, etc.
  const [modalVisible, setModalVisible] = useState(false)
  const [isFullSheet, setIsFullSheet] = useState(false)
  const slideAnim = useRef(new Animated.Value(DISMISS_OFFSET)).current // Start off-screen below
  const panY = useRef(0)
  const dragStartValue = useRef(HALF_SHEET_OFFSET)

  // Map labels to screen names
  const getScreenName = (label: string): keyof HomeStackParamList | null => {
    const normalizedLabel = label.replace(/\n/g, ' ').toLowerCase()
    if (normalizedLabel.includes('rev') && normalizedLabel.includes('growth')) {
      return 'RevenueGrowth'
    }
    if (normalizedLabel.includes('cash') && normalizedLabel.includes('flow')) {
      return 'CashFlow'
    }
    if (normalizedLabel.includes('net') && normalizedLabel.includes('profit')) {
      return 'NetProfit'
    }
    return null
  }

  useEffect(() => {
    if (modalVisible) {
      // Animate from off-screen to half-screen position
      slideAnim.setValue(DISMISS_OFFSET)
      Animated.spring(slideAnim, {
        toValue: HALF_SHEET_OFFSET,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => {
        setIsFullSheet(false)
      })
    } else {
      // Reset to off-screen when hidden
      slideAnim.setValue(DISMISS_OFFSET)
      setIsFullSheet(false)
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
              setIsFullSheet(false)
            })
          } else if (currentValue < HALF_SHEET_OFFSET - threshold || isSwipingUpFast) {
            // Expand to full screen
            Animated.spring(slideAnim, {
              toValue: FULL_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start(() => {
              setIsFullSheet(true)
            })
          } else {
            // Snap back to half-screen position
            Animated.spring(slideAnim, {
              toValue: HALF_SHEET_OFFSET,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start(() => {
              setIsFullSheet(false)
            })
          }
        })
      },
    })
  ).current

  // Calculate the Monday and Sunday of the selected week
  const getWeekRange = (offset: number) => {
    // Get current date and normalize to midnight to avoid timezone issues
    const now = new Date()
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = currentDate.getDay()
    // Calculate days to subtract to get to Monday of current week
    // If today is Sunday (0), we want Monday of this week (subtract 6 days)
    // If today is Monday (1), we want Monday of this week (subtract 0 days)
    // etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    
    // Start from Monday of current week, then add offset weeks
    const monday = new Date(currentDate)
    monday.setDate(currentDate.getDate() - daysToMonday + offset * 7)
    monday.setHours(0, 0, 0, 0)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(0, 0, 0, 0)
    
    return { monday, sunday }
  }

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = date.getMonth() + 1 // Month is 0-indexed
    return `${dayName} ${day}/${month}`
  }

  const { monday, sunday } = getWeekRange(weekOffset)
  const isCurrentWeek = weekOffset === 0

  const handlePreviousWeek = () => {
    setWeekOffset(weekOffset - 1)
  }

  const handleNextWeek = () => {
    if (weekOffset < 0) {
      setWeekOffset(weekOffset + 1)
    }
  }

  return (
    <View style={styles.card}>
      {/* Header row with navigation */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handlePreviousWeek}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={24} color="#333333" />
        </TouchableOpacity>
        
        <View style={styles.weekContainer}>
          <Text style={styles.weekText}>{formatDate(monday)}</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#333333" style={styles.arrowIcon} />
          <Text style={styles.weekText}>{formatDate(sunday)}</Text>
        </View>
        
        {!isCurrentWeek ? (
          <TouchableOpacity
            onPress={handleNextWeek}
            style={styles.navButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chevron-right" size={24} color="#333333" />
          </TouchableOpacity>
        ) : (
          <View style={styles.navButton} />
        )}
      </View>

      <CircularMetric
        value={largeMetric.value}
        label={largeMetric.label}
        progress={largeMetric.progress}
        size="large"
        subtitle="Learn more"
        onSubtitlePress={() => setModalVisible(true)}
      />
      <View style={styles.smallMetricsRow}>
        {smallMetrics.map((metric, index) => {
          const screenName = getScreenName(metric.label)
          return (
            <CircularMetric
              key={index}
              value={metric.value}
              label={metric.label}
              progress={metric.progress}
              size="small"
              onPress={
                screenName && healthScore
                  ? () => {
                      if (screenName === 'RevenueGrowth') {
                        navigation.navigate('RevenueGrowth', { healthScore })
                      } else if (screenName === 'CashFlow') {
                        navigation.navigate('CashFlow', { healthScore })
                      } else if (screenName === 'NetProfit') {
                        navigation.navigate('NetProfit', { healthScore })
                      }
                    }
                  : undefined
              }
            />
          )
        })}
      </View>
      
      {/* Horizontal progress bar */}
      <HorizontalProgressBar
        progress={currentRatio}
        onPress={
          healthScore
            ? () => {
                navigation.navigate('CurrentRatio', { healthScore })
              }
            : undefined
        }
      />
      
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
            <View style={styles.modalContent}>
              {/* Drag handle */}
              <View style={styles.modalHandleContainer} {...panResponder.panHandlers}>
                <View style={styles.modalHandle} />
              </View>
              
              <ScrollView 
                style={styles.modalScrollView} 
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: 24 + insets.bottom }, // ensure space above system gesture bar
                ]}
                showsVerticalScrollIndicator={true}
                scrollEnabled={isFullSheet}
              >
                <Text style={styles.modalTitle}>Your Business Health Score</Text>

                <Text style={styles.modalText}>
                  Think of this as a “credit score” for your business. Instead of staring at lots of separate
                  numbers, you get one simple score out of 100 that tells you how healthy your business is right now.
                </Text>

                <Text style={styles.modalSectionTitle}>What the score measures</Text>
                <Text style={styles.modalText}>
                  We combine four key signals:
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Revenue Growth: Are your sales growing or shrinking?</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Profitability: Are you actually keeping money after expenses?</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Cash Flow: Is more cash coming in than going out?</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Liquidity: Could you comfortably pay your short‑term bills?</Text>
                </View>
                <Text style={styles.modalText}>
                  Each of these is converted onto the same 0–100 scale, then combined into a single score, with
                  extra weight on cash flow (because if you run out of cash, nothing else matters).
                </Text>

                <Text style={styles.modalSectionTitle}>How the score is calculated</Text>
                <Text style={styles.modalText}>
                  Score range:
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>80–100: Very healthy</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>60–79: Generally healthy, with a few pressure points</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>40–59: Warning zone – you should take a closer look</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>0–39: High risk – needs urgent attention</Text>
                </View>

                <Text style={styles.modalText}>
                  Timeframes (always rolling, always up to today):
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Week: last 7 days</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Month: last 30 days</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Quarter: last 90 days</Text>
                </View>

                <Text style={styles.modalText}>
                  We look at all “reporting ready” transactions in that window (i.e. those that have been fully
                  processed and are ready for your accounts) and calculate:
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>How fast revenue is growing</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Your profit margin</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Your cash coverage (cash in vs cash out)</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Your current ratio (assets vs liabilities)</Text>
                </View>

                <Text style={styles.modalSectionTitle}>How to use it</Text>
                <Text style={styles.modalText}>
                  Check the overall score first – it’s your quick “how are we doing?” answer. Then look at the
                  four sub‑scores:
                </Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Low cash flow score → focus on cash collections, payments and runway.</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Low profit score → review pricing, costs, and overheads.</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Low growth score → look at sales pipeline and repeat customers.</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletChar}>•</Text>
                  <Text style={styles.bulletText}>Low liquidity score → watch short‑term debts and buffers.</Text>
                </View>

                <Text style={styles.modalText}>
                  The goal isn’t a perfect 100. The goal is to spot trouble early, see trends over time, and know
                  where to act next without needing to be an accountant.
                </Text>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

// Horizontal progress bar component
function HorizontalProgressBar({ progress = 0, onPress }: { progress?: number; onPress?: () => void }) {
  const barWidth = 160 // Same as large circle size
  const strokeWidth = 12 // Same as large circle stroke width
  const progressPercent = Math.min(100, Math.max(0, progress))
  const progressWidth = (barWidth * progressPercent) / 100

  const content = (
    <>
      <Svg width={barWidth} height={strokeWidth}>
        {/* Background line */}
        <Rect
          x="0"
          y="0"
          width={barWidth}
          height={strokeWidth}
          rx={strokeWidth / 2}
          ry={strokeWidth / 2}
          fill="#e0e0e0"
        />
        {/* Progress line */}
        <Rect
          x="0"
          y="0"
          width={progressWidth}
          height={strokeWidth}
          rx={strokeWidth / 2}
          ry={strokeWidth / 2}
          fill="#333333"
        />
      </Svg>
      <Text style={styles.progressBarLabel}>Current Ratio ({Math.round(progressPercent)})</Text>
    </>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.progressBarContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.progressBarContainer}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  weekText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  metricContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
  },
  circleContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  valueTextLarge: {
    fontSize: 32,
    fontWeight: '700',
  },
  labelText: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 14,
  },
  labelTextLarge: {
    fontSize: 14,
  },
  subtitleText: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
    marginTop: 2,
  },
  smallMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  progressBarSvg: {
    width: '100%',
  },
  progressBarLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
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
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginTop: 8,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bulletChar: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    marginRight: 8,
    marginTop: 0,
  },
  bulletText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
    flex: 1,
  },
})
