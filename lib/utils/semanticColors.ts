/**
 * Semantic color constants for rating/quality indicators
 * 
 * These colors represent a scale from very poor to very good
 * Used throughout the app for status indicators, ratings, and quality metrics
 */

import { getLogoGradient as getLogoGradientFromLogoColors } from './logoColors'

export const semanticColors = {
  // Rating scale colors
  veryPoor: '#d32f2f', // Dark red
  poor: '#f57c00', // Orange
  average: '#fbc02d', // Yellow
  good: '#689f38', // Light green
  veryGood: '#388e3c', // Green
  
  // Array format for easy iteration
  ratingScale: [
    { label: 'Very Poor', color: '#d32f2f' },
    { label: 'Poor', color: '#f57c00' },
    { label: 'Average', color: '#fbc02d' },
    { label: 'Good', color: '#689f38' },
    { label: 'Very Good', color: '#388e3c' },
  ] as const,
} as const;

/**
 * Get color for a specific rating level
 */
export const getSemanticColor = (level: 'veryPoor' | 'poor' | 'average' | 'good' | 'veryGood') => {
  return semanticColors[level];
};

/**
 * Get all rating scale colors as an array
 */
export const getRatingScale = () => semanticColors.ratingScale;

/**
 * Get color by numeric index (0 = very poor, 4 = very good)
 */
export const getSemanticColorByIndex = (index: number) => {
  if (index < 0 || index >= semanticColors.ratingScale.length) {
    return semanticColors.average; // Default to average if out of bounds
  }
  return semanticColors.ratingScale[index].color;
};

/**
 * Get logo gradient colors array for use with LinearGradient
 * Returns the 7-color gradient (orange to purple) from the logo
 */
export const getLogoGradient = () => getLogoGradientFromLogoColors();

/**
 * Get semantic color based on health score (0-100)
 * Maps score ranges to semantic colors:
 * - 0-19: Very Poor (dark red)
 * - 20-39: Poor (orange)
 * - 40-59: Average (yellow)
 * - 60-79: Good (light green)
 * - 80-100: Very Good (green)
 */
export const getHealthScoreColor = (score: number): string => {
  const clampedScore = Math.min(100, Math.max(0, score));
  
  if (clampedScore < 20) {
    return semanticColors.veryPoor;
  } else if (clampedScore < 40) {
    return semanticColors.poor;
  } else if (clampedScore < 60) {
    return semanticColors.average;
  } else if (clampedScore < 80) {
    return semanticColors.good;
  } else {
    return semanticColors.veryGood;
  }
};

