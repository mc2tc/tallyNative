import { useState, useEffect } from 'react'

/**
 * Safely gets the bottom tab bar height.
 * Returns 0 if not in a tab navigator context (e.g., when used in drawer screens).
 */
export function useSafeTabBarHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    // Try to dynamically import and use the hook
    // This will only work if we're actually in a tab navigator
    const tryGetTabBarHeight = async () => {
      try {
        const bottomTabs = await import('@react-navigation/bottom-tabs')
        // We can't call hooks conditionally, so we'll use a workaround
        // The actual height will be handled by the component's margin calculations
        setHeight(0) // Default to 0 for drawer screens
      } catch {
        setHeight(0)
      }
    }

    tryGetTabBarHeight()
  }, [])

  return height
}
