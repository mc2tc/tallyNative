// Context for managing the selected drawer category

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type DrawerCategory = 'Finance' | 'Operations' | 'Marketing' | 'People' | 'TallyNetwork' | 'Settings'

type DrawerCategoryContextValue = {
  selectedCategory: DrawerCategory
  setSelectedCategory: (category: DrawerCategory) => void
}

const DrawerCategoryContext = createContext<DrawerCategoryContextValue | undefined>(undefined)

export function DrawerCategoryProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategoryState] = useState<DrawerCategory>('Finance')

  const setSelectedCategory = useCallback((category: DrawerCategory) => {
    setSelectedCategoryState(category)
  }, [])

  const value: DrawerCategoryContextValue = {
    selectedCategory,
    setSelectedCategory,
  }

  return <DrawerCategoryContext.Provider value={value}>{children}</DrawerCategoryContext.Provider>
}

export function useDrawerCategory() {
  const context = useContext(DrawerCategoryContext)
  if (context === undefined) {
    throw new Error('useDrawerCategory must be used within a DrawerCategoryProvider')
  }
  return context
}

