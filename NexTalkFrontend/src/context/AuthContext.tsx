import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { API_BASE } from '../lib/constants'

type User = {
  id: number
  username: string
  email: string
  avatarUrl: string | null
}

type AuthContextValue = {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (username: string, email: string, password: string) => Promise<User>
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
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('nextalk_token'),
  )
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    const payload = parseJwt(token)
    if (payload) {
      setUser({
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        avatarUrl: null,
      })
    }

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

  async function apiRequest<T>(path: string, options: RequestInit = {}) {
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
  }

  async function login(email: string, password: string) {
    const data = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    localStorage.setItem('nextalk_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  async function register(username: string, email: string, password: string) {
    const data = await apiRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })

    localStorage.setItem('nextalk_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  function logout() {
    localStorage.removeItem('nextalk_token')
    setToken(null)
    setUser(null)
  }

  async function refreshUser() {
    if (!token) return
    const data = await apiRequest<{ user: User }>('/api/auth/me')
    setUser(data.user)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, login, register, logout, refreshUser, apiRequest }),
    [token, user],
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
