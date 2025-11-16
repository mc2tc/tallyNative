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

