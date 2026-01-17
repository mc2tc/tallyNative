// API client with automatic token injection

import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { getFirebaseAuth } from '../config/firebase'
import type { ApiError as ApiErrorType } from '../types/api'

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl
const BASE_URL =
  typeof configuredBaseUrl === 'string' && configuredBaseUrl.length > 0
    ? configuredBaseUrl
    : Platform.select({
        ios: 'http://localhost:3000',
        android: 'http://10.0.2.2:3000', // 10.0.2.2 is for Android emulator; use network IP for physical devices
        default: 'http://localhost:3000',
      })



export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: ApiErrorType,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthToken(forceRefresh: boolean = false): Promise<string | null> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) return null

  try {
    // Only force refresh if explicitly requested (e.g., after 401)
    // Otherwise use cached token to avoid excessive refresh calls
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  
  let token = await getAuthToken(false) // Use cached token first

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}` // Use full token for authentication
  } else {
    console.warn(`[API] No auth token available - request will be unauthenticated`)
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: headers as HeadersInit,
    })
    
    // If we get a 401, try refreshing the token once
    if (response.status === 401 && token) {
      token = await getAuthToken(true) // Force refresh on 401
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        // Retry the request with fresh token
        response = await fetch(url, {
          ...options,
          headers: headers as HeadersInit,
        })
      }
    }
  } catch (error) {
    console.error(`[API] Request failed for ${url}:`, error)
    console.error(`[API] Error type:`, error instanceof Error ? error.constructor.name : typeof error)
    console.error(`[API] Error name:`, error instanceof Error ? error.name : 'N/A')
    console.error(`[API] Error message:`, error instanceof Error ? error.message : String(error))
    console.error(`[API] Request details:`, {
      url,
      method: options.method || 'GET',
      headers: headers,
      hasToken: !!token,
    })
    
    // Check if it's a network error
    if (error instanceof TypeError) {
      console.warn(`[API] Network error detected:`, error.message)
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        throw new ApiError(
          `Cannot connect to server at ${BASE_URL}. Make sure the Next.js server is running and accessible. Network error: ${error.message}`,
          0, // 0 indicates network error
        )
      }
    }
    
    // Re-throw other errors (they might be ApiError instances from response parsing)
    throw error
  }

  let data: unknown
  let responseText: string = ''
  try {
    responseText = await response.text()
    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        // If JSON parsing fails, use the text as the error message
        if (response.ok) {
          console.error(`[API] Invalid JSON response from ${url}:`, responseText)
          throw new ApiError('Invalid JSON response from server', response.status)
        }
        // Log the actual response for debugging
        console.error(`[API] Error response from ${url} (${response.status}):`, responseText)
        throw new ApiError(
          responseText || `Request failed (${response.status}). Unable to parse error details.`,
          response.status,
        )
      }
    } else {
      // Empty response body
      console.error(`[API] Empty response body from ${url} (${response.status})`)
    }
  } catch (parseError) {
    if (response.ok) {
      console.error(`[API] Failed to parse response from ${url}:`, parseError)
      throw new ApiError('Invalid JSON response from server', response.status)
    }
    console.error(`[API] Error parsing response from ${url} (${response.status}):`, parseError, 'Response:', responseText)
    throw new ApiError(
      `Request failed (${response.status}). ${responseText || 'Unable to parse error details.'}`,
      response.status,
    )
  }

  if (!response.ok) {
    const errorData = data as ApiErrorType
    const message =
      typeof errorData?.error === 'string'
        ? errorData.error
        : `Request failed (${response.status})${responseText ? `: ${responseText.substring(0, 200)}` : ''}`
    console.error(`[API] Request failed for ${url}:`, message, errorData)
    throw new ApiError(message, response.status, errorData)
  }

  return data as T
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}

