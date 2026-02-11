import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if refresh is in progress to avoid multiple simultaneous refreshes
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback)
}

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

const onRefreshFailed = (error: unknown) => {
  // Clear waiting subscribers - they will timeout or be handled by the caller
  refreshSubscribers = []
  console.error('[Auth] Token refresh failed:', error)
}

// Request interceptor - add auth token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // For FormData, remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // Network error - don't logout, let user retry
    if (!error.response) {
      return Promise.reject(error)
    }

    // Not a 401 error - pass through
    if (error.response.status !== 401) {
      return Promise.reject(error)
    }

    console.warn('[Auth] 401 received for:', originalRequest?.url)

    // Already retried - don't retry again
    if (originalRequest?._retry) {
      return Promise.reject(error)
    }

    const refreshToken = useAuthStore.getState().refreshToken

    // No refresh token - logout
    if (!refreshToken) {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }

    // If already refreshing, wait for refresh to complete
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          } else {
            reject(error)
          }
        })
      })
    }

    originalRequest!._retry = true
    isRefreshing = true

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
        { refreshToken }
      )

      const { token, refreshToken: newRefreshToken } = response.data
      const user = useAuthStore.getState().user

      if (user) {
        useAuthStore.getState().login(user, token, newRefreshToken)
      }

      isRefreshing = false
      onTokenRefreshed(token)

      originalRequest!.headers.Authorization = `Bearer ${token}`
      return api(originalRequest!)
    } catch (refreshError) {
      isRefreshing = false
      onRefreshFailed(refreshError)

      // Only logout if refresh explicitly failed with 401/403 (token invalid)
      if (axios.isAxiosError(refreshError) && refreshError.response) {
        const status = refreshError.response.status
        if (status === 401 || status === 403) {
          console.warn('[Auth] Refresh token rejected by server, logging out')
          useAuthStore.getState().logout()
        }
        // For other server errors (500, etc.), don't logout - might be temporary
      }
      // For network errors during refresh, don't logout - user can retry

      return Promise.reject(refreshError)
    }
  }
)

export default api
