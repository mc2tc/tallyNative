/**
 * Gradient Sparkle Icon Component
 * 
 * Renders a sparkle icon with a gradient effect
 * Uses react-native-svg with gradient definition for the icon fill
 */

import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg'
import { getLogoGradient } from '../lib/utils/logoColors'

interface GradientSparkleIconProps {
  size?: number
}

export function GradientSparkleIcon({ size = 24 }: GradientSparkleIconProps) {
  const gradientColors = getLogoGradient()
  
  // Generate unique gradient ID for this instance
  const gradientId = useMemo(() => `sparkleGradient-${Math.random().toString(36).substr(2, 9)}`, [])
  
  // Calculate stop offsets for all colors (evenly distributed)
  const gradientStops = useMemo(() => {
    return gradientColors.map((color, index) => {
      const offset = (index / (gradientColors.length - 1)) * 100
      return { color, offset: `${offset}%` }
    })
  }, [gradientColors])

  // Sparkle icon path - creates a filled sparkle shape with 8 points
  // Based on typical sparkle icon design with central body and radiating points
  const centerX = size * 0.5
  const centerY = size * 0.5
  const outerRadius = size * 0.4
  const innerRadius = size * 0.15
  
  // Create an 8-pointed sparkle (star-like shape)
  const points: string[] = []
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2 // Start from top
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
  }
  const sparklePath = points.join(' ') + ' Z'

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.map((stop, index) => (
              <Stop key={index} offset={stop.offset} stopColor={stop.color} stopOpacity="1" />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Path
          d={sparklePath}
          fill={`url(#${gradientId})`}
          fillRule="evenodd"
        />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})

