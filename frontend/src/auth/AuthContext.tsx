import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import { tokenStore } from '../api/http'
import type { RegisterRequest } from '../api/types'
import type { Role, User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  switchingRole: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  enterDemoRole: (role: Role) => Promise<void>
  logout: () => void
}

const DEMO_EMAIL_BY_ROLE: Record<Role, string> = {
  CREATOR: 'creator@nexora.com',
  REVIEWER: 'reviewer@nexora.com',
  DEPT_MANAGER: 'manager@nexora.com',
  ADMIN: 'admin@nexora.com',
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [switchingRole, setSwitchingRole] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const asRole = params.get('as')
      if (asRole === 'creator') {
        tokenStore.set('mock-u2')
      } else if (asRole === 'reviewer') {
        tokenStore.set('mock-u4')
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
    qc.invalidateQueries()
  }, [qc])

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await api.register(data)
    tokenStore.set(res.token)
    setUser(res.user)
    qc.invalidateQueries()
  }, [qc])

  const enterDemoRole = useCallback(async (role: Role) => {
    setSwitchingRole(true)
    const email = DEMO_EMAIL_BY_ROLE[role]
    try {
      localStorage.removeItem('claimledger.force_mock')
      const res = await api.login(email, 'Demo@1234')
      tokenStore.set(res.token)
      setUser(res.user)
      qc.invalidateQueries()
    } catch {
      localStorage.setItem('claimledger.force_mock', 'true')
      const res = await api.login(email, 'Demo@1234')
      tokenStore.set(res.token)
      setUser(res.user)
      qc.invalidateQueries()
    } finally {
      setSwitchingRole(false)
    }
  }, [qc])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.clear()
  }, [qc])

  const value = useMemo(
    () => ({ user, loading, switchingRole, login, register, enterDemoRole, logout }),
    [user, loading, switchingRole, login, register, enterDemoRole, logout]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** UI convenience only. The backend is the real permission check. */
export const NAV_BY_ROLE: Record<Role, string[]> = {
  CREATOR: ['home', 'create', 'my-content', 'guidelines', 'draft-check', 'history', 'evaluation'],
  DEPT_MANAGER: ['dept-home', 'dept-submissions', 'dept-insights', 'dept-activity', 'campaigns', 'evaluation'],
  REVIEWER: ['home', 'review', 'history', 'evaluation'],
  ADMIN: [
    'admin-overview',
    'admin-knowledge',
    'admin-submissions',
    'admin-users',
    'admin-approvals',
    'admin-audit',
    'admin-insights',
    'campaigns',
    'evaluation',
    'admin-settings',
  ],
}
