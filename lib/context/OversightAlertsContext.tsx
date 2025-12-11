import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AssistantContextValue {
  oversightUnreadCount: number
  setOversightUnreadCount: (count: number) => void
  insightUnreadCount: number
  setInsightUnreadCount: (count: number) => void
  // Legacy support - maps to oversightUnreadCount
  unreadCount: number
  setUnreadCount: (count: number) => void
}

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined)

export function OversightAlertsProvider({ children }: { children: ReactNode }) {
  const [oversightUnreadCount, setOversightUnreadCount] = useState(0)
  const [insightUnreadCount, setInsightUnreadCount] = useState(0)

  return (
    <AssistantContext.Provider
      value={{
        oversightUnreadCount,
        setOversightUnreadCount,
        insightUnreadCount,
        setInsightUnreadCount,
        // Legacy support
        unreadCount: oversightUnreadCount,
        setUnreadCount: setOversightUnreadCount,
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export function useOversightAlerts() {
  const context = useContext(AssistantContext)
  if (context === undefined) {
    throw new Error('useOversightAlerts must be used within an OversightAlertsProvider')
  }
  return context
}

// New hook for accessing both counts
export function useAssistant() {
  const context = useContext(AssistantContext)
  if (context === undefined) {
    throw new Error('useAssistant must be used within an OversightAlertsProvider')
  }
  return context
}
