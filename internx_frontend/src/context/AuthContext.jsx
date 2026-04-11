import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Boot: decode stored token and reload profile
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        // Check expiry
        if (decoded.exp * 1000 > Date.now()) {
          loadProfile()
          return
        }
      } catch {
        // malformed token
      }
    }
    setLoading(false)
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/profile/')
      setUser(data)
    } catch {
      setUser(null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    await loadProfile()
    return data
  }, [loadProfile])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [])

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register/', formData)
    return data
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, register, loadProfile }),
    [user, loading, login, logout, register, loadProfile]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
