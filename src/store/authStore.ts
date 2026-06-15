import { useState, useEffect } from 'react'
import type { AuthUser } from '@/api/auth'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)
  const [token, setToken] = useState<string | null>(getStoredToken)

  useEffect(() => {
    const onStorage = () => {
      setUser(getStoredUser())
      setToken(getStoredToken())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = (tok: string, usr: AuthUser) => {
    saveAuth(tok, usr)
    setToken(tok)
    setUser(usr)
  }

  const logout = () => {
    clearAuth()
    setToken(null)
    setUser(null)
  }

  return { user, token, isAuthenticated: !!token, login, logout }
}
