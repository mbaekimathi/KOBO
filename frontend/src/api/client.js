import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SESSION_NOTICE_KEY = 'kobo_session_notice'

const api = axios.create({
  baseURL: API_BASE,
})

/** Single-flight refresh so concurrent 401s share one token refresh. */
let refreshPromise = null

function isSignedInElsewhere(detail) {
  return typeof detail === 'string' && detail.toLowerCase().includes('another device')
}

function markSignedInElsewhere() {
  sessionStorage.setItem(SESSION_NOTICE_KEY, 'signed_in_elsewhere')
}

function clearLocalAuth() {
  localStorage.removeItem('kobo_access')
  localStorage.removeItem('kobo_refresh')
  localStorage.removeItem('kobo_user')
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = localStorage.getItem('kobo_refresh')
      if (!refresh) {
        throw new Error('No refresh token')
      }
      const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, {
        refresh,
      })
      localStorage.setItem('kobo_access', data.access)
      return data.access
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kobo_access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const detail = error.response?.data?.detail
    const signedInElsewhere = isSignedInElsewhere(detail)

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        const access = await refreshAccessToken()
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch (refreshError) {
        const refreshDetail = refreshError.response?.data?.detail
        if (signedInElsewhere || isSignedInElsewhere(refreshDetail)) {
          markSignedInElsewhere()
        }
        clearLocalAuth()
      }
    } else if (error.response?.status === 401 && signedInElsewhere) {
      markSignedInElsewhere()
      clearLocalAuth()
    }
    return Promise.reject(error)
  },
)

export { SESSION_NOTICE_KEY }
export default api
