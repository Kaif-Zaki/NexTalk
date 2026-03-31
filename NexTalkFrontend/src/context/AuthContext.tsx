/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../lib/constants'

type User = {
  id: number
  username: string
  email: string
  mobileNumber: string | null
  avatarUrl: string | null
}

type AuthContextValue = {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (
    username: string,
    email: string,
    mobileNumber: string,
    password: string,
  ) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
  apiRequest: <T>(path: string, options?: RequestInit) => Promise<T>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseJwt(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded) as { sub: number; email: string; username: string }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('nextalk_token'),
  )
  const [user, setUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('nextalk_token')
    if (!savedToken) return null
    const payload = parseJwt(savedToken)
    if (!payload) return null
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      mobileNumber: null,
      avatarUrl: null,
    }
  })

  useEffect(() => {
    if (!token) return

    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session invalid')
        }
        return response.json() as Promise<{ user: User }>
      })
      .then((data) => {
        setUser(data.user)
      })
      .catch(() => {
        localStorage.removeItem('nextalk_token')
        setToken(null)
        setUser(null)
      })
  }, [token])

  const apiRequest = useCallback(async function <T>(
    path: string,
    options: RequestInit = {},
  ) {
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    const data = await response.json()
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('nextalk_token')
        setToken(null)
        setUser(null)
      }
      throw new Error(data.error ?? 'Request failed')
    }

    return data as T
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    localStorage.setItem('nextalk_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [apiRequest])

  const register = useCallback(async (
    username: string,
    email: string,
    mobileNumber: string,
    password: string,
  ) => {
    const data = await apiRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, mobileNumber, password }),
    })

    localStorage.setItem('nextalk_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [apiRequest])

  const logout = useCallback(() => {
    localStorage.removeItem('nextalk_token')
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    const data = await apiRequest<{ user: User }>('/api/auth/me')
    setUser(data.user)
  }, [token, apiRequest])

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, login, register, logout, refreshUser, apiRequest }),
    [token, user, login, register, logout, refreshUser, apiRequest],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
