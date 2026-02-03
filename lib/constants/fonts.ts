/**
 * Font constants for Tiempos font family
 * Use these constants throughout the app for consistent typography
 */

export const Fonts = {
  // Regular weight
  regular: 'TiemposText-Regular',
  
  // Bold weight
  bold: 'TiemposText-Bold',
  
  // Italic
  italic: 'TiemposText-Italic',
  
  // Bold Italic
  boldItalic: 'TiemposText-BoldItalic',
} as const

/**
 * Typography styles for common text patterns
 * Use these in StyleSheet.create() for consistent styling
 */
export const Typography = {
  // Headings
  h1: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    lineHeight: 28,
  },
  h4: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  
  // Body text
  bodyLarge: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Labels and captions
  label: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Buttons
  button: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
  },
  buttonSmall: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 18,
  },
} as const

