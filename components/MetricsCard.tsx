import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated, PanResponder, Dimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Svg, { Path } from 'react-native-svg'
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
  controlCompliance?: number // For large circles: control/compliance score to adjust the display
}

export function CircularMetric({ value, label, progress = 0, size = 'small', subtitle, onSubtitlePress, onPress, controlCompliance }: CircularMetricProps) {
  const isLarge = size === 'large'
  const circleSize = isLarge ? 160 : 70
  const strokeWidth = isLarge ? 12 : 6
  // For dual circles: outer (reduced score) and inner (performance score) with clear separation
  const outerRadius = isLarge && controlCompliance ? (circleSize - strokeWidth) / 2 : (circleSize - strokeWidth) / 2
  const innerRadius = isLarge && controlCompliance ? (circleSize - strokeWidth) / 2 - 14 : (circleSize - strokeWidth) / 2 // Separation: 14px difference
  const innerStrokeWidth = isLarge && controlCompliance ? 4 : 6
  const radius = (circleSize - strokeWidth) / 2
  const center = circleSize / 2
  
  // Calculate reduced score based on control/compliance (only for large circles)
  const performanceScore = typeof progress === 'number' ? progress : (typeof value === 'number' ? value : 0)
  const controlScore = controlCompliance ?? 100
  const reducedScore = isLarge && controlCompliance ? Math.round(performanceScore * (controlScore / 100)) : performanceScore

  // Arc spans from 7:30 (225°) to 4:30 (135°)
  // Total arc is 270° (going clockwise: 225° -> 360° -> 135°)
  const startAngle = 225 // 7:30 position (degrees from top, clockwise)
  const endAngle = 135 // 4:30 position
  const totalArcDegrees = 270 // Total span from 7:30 to 4:30
  const progressPercent = Math.min(100, Math.max(0, progress))
  const progressAngle = (progressPercent / 100) * totalArcDegrees
  const currentAngle = startAngle + progressAngle

  // Convert degrees to radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  // Calculate point on circle (kept for backward compatibility, but use getPointOnCircleForRadius)
  const getPointOnCircle = (angle: number) => {
    return getPointOnCircleForRadius(angle, radius)
  }

  // Create arc path for progress
  const createArcPath = (fromAngle: number, toAngle: number, useRadius: number) => {
    const start = getPointOnCircleForRadius(fromAngle, useRadius)
    const end = getPointOnCircleForRadius(toAngle, useRadius)
    // Calculate angle difference going clockwise
    let angleDiff = toAngle >= fromAngle ? toAngle - fromAngle : (360 - fromAngle) + toAngle
    // For the background arc (startAngle to endAngle), we know it's 270°
    if (fromAngle === startAngle && toAngle === endAngle) {
      angleDiff = totalArcDegrees
    }
    const largeArcFlag = angleDiff > 180 ? 1 : 0

    return `M ${start.x} ${start.y} A ${useRadius} ${useRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  }
  
  // Calculate point on circle with specific radius
  const getPointOnCircleForRadius = (angle: number, useRadius: number) => {
    const rad = toRadians(angle - 90) // Subtract 90 to start from top
    return {
      x: center + useRadius * Math.cos(rad),
      y: center + useRadius * Math.sin(rad),
    }
  }
  
  // Calculate angles for reduced score (outer arc)
  const reducedProgressPercent = Math.min(100, Math.max(0, reducedScore))
  const reducedProgressAngle = (reducedProgressPercent / 100) * totalArcDegrees
  const reducedCurrentAngle = startAngle + reducedProgressAngle

  // Background arc paths - each circle has its own 0-100 scale
  const outerBackgroundArcPath = isLarge && controlCompliance 
    ? createArcPath(startAngle, endAngle, outerRadius)
    : createArcPath(startAngle, endAngle, radius)
  const innerBackgroundArcPath = isLarge && controlCompliance
    ? createArcPath(startAngle, endAngle, innerRadius)
    : ''
  
  // Progress arc paths
  // Outer arc: reduced score (after control/compliance adjustment)
  const reducedArcPath = isLarge && controlCompliance && reducedScore > 0 
    ? createArcPath(startAngle, reducedCurrentAngle, outerRadius) 
    : ''
  // Inner arc: performance score (original)
  const performanceArcPath = isLarge && controlCompliance && performanceScore > 0
    ? createArcPath(startAngle, currentAngle, innerRadius)
    : progress > 0 
      ? createArcPath(startAngle, currentAngle, radius)
      : ''

  const content = (
    <View style={[styles.circleWrapper, { width: circleSize, height: circleSize }]}>
      {/* SVG for circular progress */}
      <Svg width={circleSize} height={circleSize} style={styles.svgContainer}>
        {/* For large circles with control/compliance: show two separate concentric circles */}
        {isLarge && controlCompliance ? (
          <>
            {/* Outer circle: Reduced score */}
            {/* Background arc - shows 0-100 scale for outer circle */}
            <Path
              d={outerBackgroundArcPath}
              stroke="#e0e0e0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="transparent"
            />
            {/* Progress arc - shows reduced score */}
            {reducedScore > 0 && (
              <Path
                d={reducedArcPath}
                stroke="#555555"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
            
            {/* Inner circle: Performance score - clearly separated */}
            {/* Background arc - shows 0-100 scale for inner circle */}
            <Path
              d={innerBackgroundArcPath}
              stroke="#e0e0e0"
              strokeWidth={innerStrokeWidth}
              strokeLinecap="round"
              fill="transparent"
            />
            {/* Progress arc - shows performance score */}
            {performanceScore > 0 && (
              <Path
                d={performanceArcPath}
                stroke="#666666"
                strokeWidth={innerStrokeWidth}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
          </>
        ) : (
          /* Regular single circle for small circles or large without control/compliance */
          <>
            <Path
              d={outerBackgroundArcPath}
              stroke="#e0e0e0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="transparent"
            />
            {progress > 0 && (
              <Path
                d={performanceArcPath}
                stroke="#555555"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
              />
            )}
          </>
        )}
      </Svg>
      {/* Center content */}
      <View style={styles.circleContent}>
        {/* For large circles with control/compliance: show both scores */}
        {isLarge && controlCompliance ? (
          <>
            <Text style={[styles.valueText, isLarge && styles.valueTextLarge]}>
              {reducedScore}
            </Text>
            <Text style={[styles.valueTextSecondary, isLarge && styles.valueTextSecondaryLarge]}>
              {performanceScore}
            </Text>
          </>
        ) : (
          /* Regular display for small circles or large without control/compliance */
          <Text style={[styles.valueText, isLarge && styles.valueTextLarge]}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
        )}
        {subtitle && isLarge && (
          <TouchableOpacity onPress={onSubtitlePress} activeOpacity={0.7}>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  // For small circles, wrap with label below
  if (size === 'small') {
    const smallCircleContent = (
      <View style={styles.smallMetricWrapper}>
        {content}
        <Text style={styles.smallMetricLabel}>{label}</Text>
      </View>
    )

    if (onPress) {
      return (
        <TouchableOpacity
          style={styles.metricContainer}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {smallCircleContent}
        </TouchableOpacity>
      )
    }

    return (
      <View style={styles.metricContainer}>
        {smallCircleContent}
      </View>
    )
  }

  // For large circles, wrap with label below
  if (size === 'large') {
    const largeCircleContent = (
      <View style={styles.largeMetricWrapper}>
        {content}
        <Text style={styles.largeMetricLabel}>{label}</Text>
      </View>
    )

    return (
      <View style={styles.metricContainer}>
        {largeCircleContent}
      </View>
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
  controlCompliance?: number // Score out of 100 for control/compliance
  healthScore?: HealthScoreResponse['data']['healthScore']
  timeframe?: 'week' | 'month' | 'quarter'
  onTimeframeChange?: (timeframe: 'week' | 'month' | 'quarter') => void
}

export function MetricsCard({ 
  largeMetric, 
  smallMetrics, 
  currentRatio = 60,
  controlCompliance,
  healthScore,
  timeframe = 'week',
  onTimeframeChange,
}: MetricsCardProps) {
  // Calculate controlCompliance from healthScore if available
  // controlCompliance represents the percentage that overall is of preUnreconciled
  // This shows the impact of unreconciled transactions on the score
  const calculatedControlCompliance = healthScore?.preUnreconciled && healthScore?.overall
    ? Math.round((healthScore.overall / healthScore.preUnreconciled) * 100)
    : controlCompliance
  const SCREEN_HEIGHT = Dimensions.get('window').height
  // TranslateY offsets relative to a full-height container (top: 0, bottom: 0)
  // Keep FULL_SHEET_OFFSET slightly below the very top so the drag handle stays reachable
  const FULL_SHEET_OFFSET = 40 // almost full-screen, avoids OS edge gestures at the very top
  const HALF_SHEET_OFFSET = SCREEN_HEIGHT * 0.5 // visible half-screen position
  const DISMISS_OFFSET = SCREEN_HEIGHT // pushed completely off-screen

  const insets = useSafeAreaInsets()
  const navigation = useNavigation<StackNavigationProp<HomeStackParamList>>()
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
    if (normalizedLabel.includes('current') && normalizedLabel.includes('ratio')) {
      return 'CurrentRatio'
    }
    return null
  }

  // Helper to render a metric with navigation
  const renderMetric = (metric: { value: number | string; label: string; progress?: number }, index: number) => {
    if (!metric) return null
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

  const timeframes: Array<'week' | 'month' | 'quarter'> = ['week', 'month', 'quarter']
  const timeframeLabels = {
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
  }

  return (
    <View style={styles.card}>
      {/* Timeframe selector */}
      {onTimeframeChange && (
        <View style={styles.timeframeContainer}>
          {timeframes.map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeButton,
                timeframe === tf && styles.timeframeButtonActive,
              ]}
              onPress={() => onTimeframeChange(tf)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeframeButtonText,
                  timeframe === tf && styles.timeframeButtonTextActive,
                ]}
              >
                {timeframeLabels[tf]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Layout: Business Health circle on top, KPI circles in a row below */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsLayout}>
          {/* Business Health circle */}
          <CircularMetric
            value={largeMetric.value}
            label={largeMetric.label}
            progress={largeMetric.progress}
            size="large"
            controlCompliance={calculatedControlCompliance}
          />
          
          {/* Row of KPI circles below */}
          <View style={styles.kpiRow}>
            {renderMetric(smallMetrics[0], 0)}
            {renderMetric(smallMetrics[1], 1)}
            {renderMetric(smallMetrics[2], 2)}
            <CircularMetric
              value={Math.round(currentRatio)}
              label="Current Ratio"
              progress={currentRatio}
              size="small"
              onPress={
                healthScore
                  ? () => {
                      navigation.navigate('CurrentRatio', { healthScore })
                    }
                  : undefined
              }
            />
          </View>
        </View>
      </View>
      
      {/* Learn more button */}
      <TouchableOpacity
        style={styles.learnMoreButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.learnMoreText}>Learn more</Text>
      </TouchableOpacity>
      
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
    position: 'relative',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 32,
    width: '100%',
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#555555',
  },
  timeframeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  timeframeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
  valueTextSecondary: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: -4,
  },
  valueTextSecondaryLarge: {
    fontSize: 20,
    fontWeight: '500',
    color: '#666666',
    marginTop: -6,
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
  metricsContainer: {
    width: '100%',
    paddingBottom: 40, // Add padding to prevent clash with Learn more button
  },
  metricsLayout: {
    alignItems: 'center',
    width: '100%',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  smallMetricWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallMetricLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  largeMetricWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeMetricLabel: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: -12,
    fontWeight: '500',
  },
  learnMoreButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  learnMoreText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
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
