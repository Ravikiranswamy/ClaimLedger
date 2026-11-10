import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import { tokenStore } from '../api/http'
import type { Role, User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const asRole = params.get('as')
      if (asRole === 'creator') {
        tokenStore.set('mock-u2')
      } else if (asRole === 'admin') {
        tokenStore.set('mock-u5')
      }
    } catch {
      // ignore
    }

    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    api.me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** UI convenience only. The backend is the real permission check. */
export const NAV_BY_ROLE: Record<Role, string[]> = {
  CREATOR: ['home', 'create', 'my-content', 'guidelines', 'history'],
  DEPT_MANAGER: ['home', 'review', 'history'],
  REVIEWER: ['home', 'review', 'history'],
  ADMIN: [
    'admin-overview',
    'admin-knowledge',
    'admin-submissions',
    'admin-users',
    'admin-approvals',
    'admin-audit',
    'admin-insights',
    'admin-settings',
  ],
}
