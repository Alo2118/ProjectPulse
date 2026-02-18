/**
 * useAuthInit - Hook for token validation and proactive refresh
 * Validates token on app mount and schedules refresh before expiration
 */

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@stores/authStore'
import { useThemeStore } from '@stores/themeStore'
import api from '@services/api'
import axios from 'axios'

const REFRESH_BEFORE_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes before expiration

interface JwtPayload {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1]
    const payload = atob(base64Payload)
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function getTimeUntilExpiry(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded) return 0
  const expiryTime = decoded.exp * 1000
  return expiryTime - Date.now()
}

// Flag to prevent multiple simultaneous refreshes from this hook
let isHookRefreshing = false

export function useAuthInit() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const token = useAuthStore((s) => s.token)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const initializeFromUser = useThemeStore((s) => s.initializeFromUser)

  // Clear any existing refresh timer
  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  // Perform token refresh using CURRENT store values
  const performTokenRefresh = async () => {
    // Get fresh values from store at execution time
    const currentRefreshToken = useAuthStore.getState().refreshToken
    const currentUser = useAuthStore.getState().user
    const currentToken = useAuthStore.getState().token

    if (!currentRefreshToken || !currentUser || isHookRefreshing) {
      return
    }

    // Check if token actually needs refresh (might have been refreshed by interceptor)
    if (currentToken) {
      const timeUntilExpiry = getTimeUntilExpiry(currentToken)
      if (timeUntilExpiry > REFRESH_BEFORE_EXPIRY_MS) {
        // Token was already refreshed, just reschedule
        scheduleTokenRefresh()
        return
      }
    }

    isHookRefreshing = true

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
        { refreshToken: currentRefreshToken }
      )

      const { token: newToken, refreshToken: newRefreshToken } = response.data
      login(currentUser, newToken, newRefreshToken)
      // Don't schedule here - the useEffect will do it when token changes
    } catch {
      // Don't logout - let the interceptor handle it on next API call
    } finally {
      isHookRefreshing = false
    }
  }

  // Schedule proactive token refresh based on CURRENT token
  const scheduleTokenRefresh = () => {
    clearRefreshTimer()

    const currentToken = useAuthStore.getState().token
    if (!currentToken) return

    const timeUntilExpiry = getTimeUntilExpiry(currentToken)
    const refreshTime = timeUntilExpiry - REFRESH_BEFORE_EXPIRY_MS

    if (refreshTime <= 0) {
      // Token expires soon or already expired, refresh immediately
      performTokenRefresh()
      return
    }

    refreshTimerRef.current = setTimeout(performTokenRefresh, refreshTime)
  }

  // Validate token on mount
  useEffect(() => {
    const validateAuth = async () => {
      setIsValidating(true)

      // No token stored, nothing to validate
      if (!token || !user) {
        setIsValidating(false)
        setIsInitialized(true)
        return
      }

      // Check if token is expired
      const timeUntilExpiry = getTimeUntilExpiry(token)

      if (timeUntilExpiry <= 0) {
        // Token expired, try to refresh
        if (refreshToken) {
          try {
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
              { refreshToken }
            )

            const { token: newToken, refreshToken: newRefreshToken } = response.data
            login(user, newToken, newRefreshToken)
            // useEffect below will schedule refresh when token changes
          } catch {
            // Refresh failed, logout user
            logout()
          }
        } else {
          logout()
        }
      } else {
        // Token still valid, verify with backend
        try {
          const response = await api.get('/auth/me')
          // Update user data in case it changed
          const userData = response.data.user || response.data
          login(userData, token, refreshToken!)
          // Initialize theme from user preference
          initializeFromUser(userData.theme)
          // useEffect below will schedule refresh
        } catch (error) {
          // If 401, the interceptor will handle refresh
          // If other error, keep user logged in (might be network issue)
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Interceptor already tried to refresh and failed
            // User is already logged out by interceptor
          }
          // For network errors, keep user logged in
        }
      }

      setIsValidating(false)
      setIsInitialized(true)
    }

    validateAuth()

    return () => {
      clearRefreshTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Schedule refresh when token changes (e.g., after login or interceptor refresh)
  useEffect(() => {
    if (isInitialized && token && refreshToken) {
      scheduleTokenRefresh()
    }

    return () => {
      clearRefreshTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isInitialized])

  return { isInitialized, isValidating }
}
