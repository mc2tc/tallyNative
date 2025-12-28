import { api } from './client'

export type PackagingExtractionRequest = {
  businessId: string
  text: string
}

export type PrimaryPackaging = {
  description: string
  quantity: number
  unit: string
  material?: string
}

export type SecondaryPackaging = {
  description: string
  quantity: number
  primaryPackagesPerSecondary: number
  material?: string
}

export type PackagingData = {
  primaryPackaging?: PrimaryPackaging
  secondaryPackaging?: SecondaryPackaging
  totalPrimaryPackages: number
  orderQuantity: number
  orderPackagingLevel: 'primary' | 'secondary'
  confidence?: number
  notes?: string
}

export type PackagingExtractionSuccessResponse = {
  success: true
  packaging: PackagingData
  metadata: {
    requestId: string
    duration: number
    timestamp: string
  }
}

export type PackagingExtractionErrorResponse = {
  success: false
  error: string
  message?: string
  requestId: string
  currentUsage?: number
  limit?: number
}

export type PackagingExtractionResponse = PackagingExtractionSuccessResponse | PackagingExtractionErrorResponse

// Type guard to check if response is successful
export function isPackagingExtractionSuccess(
  response: PackagingExtractionResponse
): response is PackagingExtractionSuccessResponse {
  return response.success === true && 'packaging' in response
}

export const packagingApi = {
  extractPackaging: async (
    businessId: string,
    text: string,
  ): Promise<PackagingExtractionResponse> => {
    console.log('Packaging API request:', { businessId, text })
    const response = await api.post<PackagingExtractionResponse>(
      `/authenticated/transactions3/api/packaging/extract`,
      {
        businessId,
        text,
      },
    )
    console.log('Packaging API response:', response)
    return response
  },
}

