import React from 'react'
import { Text, TextProps, StyleSheet } from 'react-native'
import { Fonts } from '../lib/constants/fonts'

type TiemposVariant = 'regular' | 'bold' | 'italic' | 'boldItalic'

interface TiemposTextProps extends TextProps {
  variant?: TiemposVariant
  children: React.ReactNode
}

export const TiemposText: React.FC<TiemposTextProps> = ({
  variant = 'regular',
  style,
  children,
  ...props
}) => {
  const fontFamily = Fonts[variant]

  return (
    <Text
      style={[styles.base, { fontFamily }, style]}
      {...props}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    // Base styles - can be overridden via style prop
  },
})

