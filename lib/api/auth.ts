// Auth-specific API calls

import { api } from './client'
import type {
  AuthClaimsResponse,
  InviteAcceptanceRequest,
  InviteAcceptanceResponse,
  InviteCreationRequest,
  InviteCreationResponse,
  OwnerBootstrapRequest,
  OwnerBootstrapResponse,
  BusinessCreationRequest,
  BusinessCreationResponse,
} from '../types/api'

export const authApi = {
  /**
   * Refresh auth claims and memberships
   */
  refreshClaims: async (): Promise<AuthClaimsResponse> => {
    return api.post<AuthClaimsResponse>('/api/auth/claims/refresh')
  },

  /**
   * Bootstrap owner account (sign up)
   */
  bootstrapOwner: async (
    request: OwnerBootstrapRequest,
  ): Promise<OwnerBootstrapResponse> => {
    return api.post<OwnerBootstrapResponse>('/api/auth/bootstrap-owner', request)
  },

  /**
   * Create a new business
   */
  createBusiness: async (
    request: BusinessCreationRequest,
  ): Promise<BusinessCreationResponse> => {
    return api.post<BusinessCreationResponse>('/api/auth/businesses', request)
  },

  /**
   * Create an invite
   */
  createInvite: async (request: InviteCreationRequest): Promise<InviteCreationResponse> => {
    return api.post<InviteCreationResponse>('/api/auth/invites', request)
  },

  /**
   * Accept an invite
   */
  acceptInvite: async (
    inviteId: string,
    request?: InviteAcceptanceRequest,
  ): Promise<InviteAcceptanceResponse> => {
    return api.post<InviteAcceptanceResponse>(
      `/api/auth/invites/${inviteId}/accept`,
      request,
    )
  },
}

