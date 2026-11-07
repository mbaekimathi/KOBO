import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { SESSION_NOTICE_KEY } from '../api/client'

const AuthContext = createContext(null)

function getStoredUser() {
  try {
    const raw = localStorage.getItem('kobo_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [loading, setLoading] = useState(!!localStorage.getItem('kobo_access'))

  const persistSession = useCallback((nextUser, tokens) => {
    if (tokens?.access) localStorage.setItem('kobo_access', tokens.access)
    if (tokens?.refresh) localStorage.setItem('kobo_refresh', tokens.refresh)
    if (nextUser) localStorage.setItem('kobo_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('kobo_access')
    localStorage.removeItem('kobo_refresh')
    localStorage.removeItem('kobo_user')
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get('/auth/me/')
    persistSession(data.user)
    return data
  }, [persistSession])

  useEffect(() => {
    const token = localStorage.getItem('kobo_access')
    if (!token) {
      setLoading(false)
      return
    }

    refreshProfile()
      .catch((err) => {
        const detail = err.response?.data?.detail
        if (
          typeof detail === 'string' &&
          detail.toLowerCase().includes('another device')
        ) {
          sessionStorage.setItem(SESSION_NOTICE_KEY, 'signed_in_elsewhere')
        }
        clearSession()
      })
      .finally(() => setLoading(false))
  }, [clearSession, refreshProfile])

  const login = useCallback(
    async (loginCode, password) => {
      const { data } = await api.post('/auth/login/', {
        login_code: loginCode,
        password,
      })
      sessionStorage.removeItem(SESSION_NOTICE_KEY)
      persistSession(data.user, data.tokens)
      return data
    },
    [persistSession],
  )

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register/', payload)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Local clear still required even if the token was already invalidated.
    }
    clearSession()
  }, [clearSession])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      isAuthenticated: !!user,
    }),
    [user, loading, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
