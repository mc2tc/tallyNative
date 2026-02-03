/**
 * Logo color constants extracted from Asset 1.svg
 * 
 * To update these colors:
 * 1. Run: node scripts/extract-logo-colors.js
 * 2. Analyze the output or use an image editor to pick exact colors
 * 3. Update the values below
 */

export const logoColors = {
  // Primary brand color (dominant color from logo) - extracted from Asset 1.svg
  primary: '#f88808', // Orange - dominant color from logo
  
  // Secondary colors (if logo has multiple colors)
  secondary: '#db5484', // Pink/Magenta - average color from logo
  accent: '#f88808', // Orange accent
  
  // Gradient colors (if logo uses gradients)
  gradient: {
    start: '#f88808', // Orange
    end: '#db5484', // Pink/Magenta
  },
  
  // For gradients in React Native - multiple color stops for smoother gradient
  gradientArray: [
    '#ff9100ff', // Orange (start)
    '#ff6f3bff', // Orange-Coral
    '#ff4f73ff', // Coral-Pink
    '#ff339bff', // Pink
    '#df41baff', // Pink-Purple
    '#c24fd4ff', // Purple
    '#9b58f7ff', // Purple (end)
  ],
} as const;

/**
 * Get the primary logo color
 */
export const getLogoPrimaryColor = () => logoColors.primary;

/**
 * Get gradient colors array for use with LinearGradient
 */
export const getLogoGradient = () => logoColors.gradientArray;

