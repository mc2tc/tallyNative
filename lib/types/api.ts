// API contract types matching Next.js backend

export type BusinessMembership = {
  role: 'owner' | 'super' | 'other'
  permissions: string[] | 'all'
}

export type AuthClaimsResponse = {
  claims: {
    businessMemberships: Record<string, BusinessMembership>
  }
  memberships: Record<string, BusinessMembership>
}

export type OwnerBootstrapRequest = {
  owner: {
    firstName: string
    lastName: string
    email: string
  }
  businesses?: Array<{
    businessName: string
    location?: Record<string, unknown>
    category?: Record<string, unknown>
    settings?: Record<string, unknown>
    bankAccounts?: unknown[]
    creditCards?: unknown[]
    isVatRegistered?: boolean
    vatRegistrationNumber?: string | null
    businessStage?: string
    businessEntity?: string
    softwareTypes?: Record<string, unknown>
  }>
  createPersonalBusiness?: boolean
}

export type OwnerBootstrapResponse = {
  ownerId: string
  businesses: Array<{
    id: string
    name: string
  }>
}

export type BusinessCreationRequest = {
  business: {
    name: string
    location?: Record<string, unknown>
    category?: Record<string, unknown>
    settings?: Record<string, unknown>
    bankAccounts?: unknown[]
    creditCards?: unknown[]
    isVatRegistered?: boolean
    vatRegistrationNumber?: string | null
    businessStage?: string
    businessEntity?: string
    softwareTypes?: Record<string, unknown>
  }
}

export type BusinessCreationResponse = {
  businessId: string
}

export type InviteCreationRequest = {
  businessId: string
  email: string
  firstName: string
  lastName: string
  role: 'super' | 'other'
  permissions?: string[] // Optional for super, required for other
}

export type InviteCreationResponse = {
  inviteId: string
}

export type InviteAcceptanceRequest = {
  firstName?: string
  lastName?: string
}

export type InviteAcceptanceResponse = {
  businessId: string
  role: 'super' | 'other'
}

export type ApiError = {
  error: string
}

export type BusinessContextPayload = {
  businessId: string
  createdBy: string
  context: {
    isVatRegistered?: boolean
    vatRegistrationNumber?: string | null
    vatRegistrationDate?: string | null
    vatScheme?: 'standard' | 'flat_rate' | 'cash_accounting' | 'retail' | 'margin' | 'other' | null
    taxableTurnoverLast12Months?: number | null
    expectedTurnoverNext12Months?: number | null
    wantsThresholdMonitoring?: boolean
    supplyTypes: string[]
    partiallyExempt?: boolean
    sellsToEU?: boolean
    sellsOutsideEU?: boolean
    importsGoods?: boolean
    exportsGoods?: boolean
    primaryCurrency: string
    secondaryCurrencies?: string[]
    keepReceiptsForVatReclaim?: boolean
    plansToRegister?: boolean
    registrationTimeline?: 'next_3_months' | 'next_6_months' | 'next_12_months' | 'unknown'
    mainCategory?: string
    subCategory?: string
    businessType?: string
    unitTypes?: {
      volume?: 'metric' | 'imperial'
      weight?: 'metric' | 'imperial'
    }
  }
}

export type BusinessContextResponse = {
  success: boolean
  context: BusinessContextPayload['context'] & {
    businessId: string
    createdAt: number
    updatedAt: number
    createdBy: string
  }
}

export type VatStatus = {
  isVatRegistered: boolean
  vatRegistrationNumber: string | null
  vatRegistrationDate: string | null
  vatScheme: 'standard' | 'flat_rate' | 'cash_accounting' | 'retail' | 'margin' | 'other' | null
  vatFlatRateBusinessType: string | null
  vatFlatRateLimitedCostBusiness: boolean | null
  vatFlatRatePercentageOverride: number | null
  taxableTurnoverLast12Months: number | null
  expectedTurnoverNext12Months: number | null
  wantsThresholdMonitoring: boolean | null
  supplyTypes: string[]
  partiallyExempt: boolean | null
  sellsToEU: boolean | null
  sellsOutsideEU: boolean | null
  importsGoods: boolean | null
  exportsGoods: boolean | null
  keepReceiptsForVatReclaim: boolean | null
  plansToRegister: boolean | null
  registrationTimeline: 'next_3_months' | 'next_6_months' | 'next_12_months' | 'unknown' | null
  updatedAt: number
}

export type VatStatusResponse = {
  success: boolean
  vatStatus: VatStatus | null
  message?: string
}

// Oversight System Types

export type OversightCheckRequest = {
  businessId: string
  transactionId?: string
  forceRefresh?: boolean
}

export type OversightCheckResponse = {
  businessId: string
  checkDate: string
  rulesChecked: number
  alertsGenerated: number
  alerts: string[] // Array of alert IDs
  processingTime: number // milliseconds
  message: string // User-friendly status message
}

export type OversightAlert = {
  id: string
  businessId: string
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  evidence?: Record<string, unknown>
  confidence?: number
  requiresReview: boolean
  read: boolean
  status?: 'active' | 'dismissed'
  resolvedAt?: string
  resolvedBy?: string
  detectedAt?: string // ISO date string when alert was detected
  createdAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date } // Legacy field, use detectedAt
  updatedAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  // Additional fields from backend
  category?: string
  title?: string
  readBy?: string[]
  readAt?: string[]
  actionRequired?: boolean
  relatedTransactionIds?: string[]
  relatedAlertIds?: string[]
  recommendations?: string[]
}

export type OversightAlertsResponse = {
  alerts: OversightAlert[]
  total: number
  unreadCount: number
  message?: string // User-friendly status message (e.g., "No alerts found. Your transactions appear normal.")
}

export type OversightAlertDetailsResponse = {
  alert: OversightAlert
  relatedTransactions?: Array<{
    id: string
    date: string
    amount: number
    description?: string
  }>
  evidence?: Record<string, unknown>
  recommendations?: string[]
}

export type OversightAlertDismissResponse = {
  success: boolean
  alertId: string
  message?: string
}

// Compliance System Types (similar to Oversight but for compliance/audit concerns)

export type ComplianceCheckRequest = {
  businessId: string
  transactionId?: string
  forceRefresh?: boolean
}

export type ComplianceCheckResponse = {
  businessId: string
  checkDate: string
  rulesChecked: number
  alertsGenerated: number
  alerts: string[] // Array of alert IDs
  processingTime: number // milliseconds
  message: string // User-friendly status message
}

export type ComplianceAlert = {
  id: string
  businessId: string
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  evidence?: Record<string, unknown>
  confidence?: number
  requiresReview: boolean
  read: boolean
  status?: 'active' | 'dismissed'
  resolvedAt?: string
  resolvedBy?: string
  detectedAt?: string // ISO date string when alert was detected
  createdAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date } // Legacy field, use detectedAt
  updatedAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  // Additional fields from backend
  category?: string
  title?: string
  readBy?: string[]
  readAt?: string[]
  actionRequired?: boolean
  relatedTransactionIds?: string[]
  relatedAlertIds?: string[]
  recommendations?: string[]
}

export type ComplianceAlertsResponse = {
  alerts: ComplianceAlert[]
  total: number
  unreadCount: number
  message?: string // User-friendly status message
}

export type ComplianceAlertDetailsResponse = {
  alert: ComplianceAlert
  relatedTransactions?: Array<{
    id: string
    date: string
    amount: number
    description?: string
  }>
  evidence?: Record<string, unknown>
  recommendations?: string[]
}

export type ComplianceAlertDismissResponse = {
  success: boolean
  alertId: string
  message?: string
}

// Operational System Types (similar to Compliance but for operational/optimization concerns)

export type OperationalCheckRequest = {
  businessId: string
  itemId?: string
  forceRefresh?: boolean
}

export type OperationalCheckResponse = {
  businessId: string
  checkDate: string
  rulesChecked: number
  alertsGenerated: number
  alerts: string[] // Array of alert IDs
  processingTime: number // milliseconds
  message: string // User-friendly status message
}

export type OperationalAlert = {
  id: string
  businessId: string
  ruleId: string
  ruleName: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  evidence?: Record<string, unknown>
  confidence?: number
  requiresReview: boolean
  read: boolean
  status?: 'active' | 'dismissed'
  resolvedAt?: string
  resolvedBy?: string
  detectedAt?: string // ISO date string when alert was detected
  createdAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date } // Legacy field, use detectedAt
  updatedAt?: string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  // Additional fields from backend
  category?: string
  title?: string
  readBy?: string[]
  readAt?: string[]
  actionRequired?: boolean
  relatedItemIds?: string[]
  relatedAlertIds?: string[]
  recommendations?: string[]
}

export type OperationalAlertsResponse = {
  alerts: OperationalAlert[]
  total: number
  unreadCount: number
  message?: string // User-friendly status message
}

export type OperationalAlertDetailsResponse = {
  alert: OperationalAlert
  relatedItems?: Array<{
    id: string
    name: string
    cost?: number
    description?: string
  }>
  evidence?: Record<string, unknown>
  recommendations?: string[]
}

export type OperationalAlertDismissResponse = {
  success: boolean
  alertId: string
  message?: string
}

