// Navigation utility functions

import type { DrawerCategory } from '../context/DrawerCategoryContext'
import { CommonActions } from '@react-navigation/native'

/**
 * Get the first tab route name for a given drawer category
 */
export function getFirstTabForCategory(category: DrawerCategory): string {
  switch (category) {
    case 'Finance':
      return 'Health'
    case 'Operations':
      return 'OpsCentre'
    case 'Marketing':
      return 'Web'
    case 'People':
      return 'Payroll'
    case 'TallyNetwork':
      return 'Suppliers'
    case 'Settings':
      return 'SettingsPlan'
    default:
      return 'Health'
  }
}

/**
 * Create a tab press listener that resets nested stack to initial route
 * @param initialRouteName - The initial route name of the nested stack (e.g., 'TransactionsHome', 'ReportsHome')
 */
export function createTabResetListener(initialRouteName: string) {
  return ({ navigation, route }: { navigation: any; route: any }) => ({
    tabPress: (e: any) => {
      const state = navigation.getState()
      const routeName = route.name
      const tabRoute = state.routes.find((r: any) => r.name === routeName)
      
      if (tabRoute?.state) {
        const nestedState = tabRoute.state
        const currentRoute = nestedState.routes[nestedState.index || 0]
        
        if (currentRoute?.name !== initialRouteName) {
          e.preventDefault()
          const tabIndex = state.routes.findIndex((r: any) => r.name === routeName)
          const newRoutes = state.routes.map((r: any) => {
            if (r.name === routeName) {
              return {
                ...r,
                state: { routes: [{ name: initialRouteName }], index: 0 },
              }
            }
            return r
          })
          navigation.dispatch(
            CommonActions.reset({
              index: tabIndex >= 0 ? tabIndex : state.index,
              routes: newRoutes,
            } as any)
          )
        }
      }
    },
  })
}

