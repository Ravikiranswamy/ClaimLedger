import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  FileText,
  History,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  PenSquare,
  Settings,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api'
import { NAV_BY_ROLE, useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from './ClaimLedgerLogo'
import { ROLE_LABEL } from '../types'

interface NavItemConfig {
  to: string
  label: string
  Icon: LucideIcon
  number?: string
  isSettings?: boolean
}

const ITEMS: Record<string, NavItemConfig> = {
  home: { to: '/', label: 'Home', Icon: Home },
  submit: { to: '/submit', label: 'Submit', Icon: PenSquare },
  create: { to: '/submit', label: 'Create Content', Icon: PenSquare },
  'my-content': { to: '/#my-content', label: 'My Content', Icon: FileText },
  review: { to: '/review', label: 'Review', Icon: ShieldCheck },
  knowledge: { to: '/knowledge-base', label: 'Knowledge Base', Icon: LibraryBig },
  guidelines: { to: '/knowledge-base', label: 'Brand Guidelines', Icon: BookOpen },
  history: { to: '/history', label: 'Activity & History', Icon: History },

  // Admin Workspace: 7 core sections + Organisation Settings
  'admin-overview': { to: '/', label: 'Overview', number: '01', Icon: LayoutDashboard },
  'admin-knowledge': { to: '/knowledge-base', label: 'Knowledge Base', number: '02', Icon: BookOpen },
  'admin-submissions': { to: '/review', label: 'Content & Submissions', number: '03', Icon: FileText },
  'admin-users': { to: '/admin/users', label: 'User Management', number: '04', Icon: Users },
  'admin-approvals': { to: '/admin/approvals', label: 'Approval Management', number: '05', Icon: CheckSquare },
  'admin-audit': { to: '/history', label: 'Audit & Activity', number: '06', Icon: History },
  'admin-insights': { to: '/admin/insights', label: 'Insights & Guideline Health', number: '07', Icon: BarChart3 },
  'admin-settings': { to: '/admin/settings', label: 'Organisation Settings', Icon: Settings, isSettings: true },
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Query live document count for actual, non-fabricated Knowledge Base status
  const docsQ = useQuery({
    queryKey: ['documents-status-summary'],
    queryFn: () => api.listDocuments(),
    staleTime: 30000,
  })

  // Close mobile drawer on route changes and reset scroll position
  useEffect(() => {
    setMobileOpen(false)
    if (!location.hash && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname, location.hash])

  if (!user) return null

  const nav = NAV_BY_ROLE[user.role].map((k) => ({
    ...ITEMS[k],
    label: k === 'history' && user.role !== 'CREATOR' ? 'History' : ITEMS[k].label,
  }))

  const handleNavClick = (to: string) => {
    setMobileOpen(false)
    if (to === '/#my-content') {
      const el = document.getElementById('my-content')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const isAdmin = user.role === 'ADMIN'
  const approvedDocs = docsQ.data?.filter((d) => d.approvalStatus === 'APPROVED').length ?? 0
  const totalDocs = docsQ.data?.length ?? 0

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row overflow-hidden bg-canvas">
      {/* Mobile Top Navigation Header */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-navy hover:bg-canvas cursor-pointer transition shadow-2xs"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <ClaimLedgerLogo size={26} />
            <span className="font-display font-bold text-base text-[#0A1F36]">ClaimLedger</span>
          </div>
        </div>
        <span className="rounded-md bg-navy/5 px-2.5 py-1 text-xs font-semibold text-navy">
          {ROLE_LABEL[user.role]}
        </span>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Left Navigation Sidebar / Mobile Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-[280px] shrink-0 flex-col bg-navy text-white select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Pinned Top Section: Brand Logo & Role Identity */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <ClaimLedgerLogo size={36} />
            <div>
              <p className="font-display text-lg font-bold leading-none text-white tracking-tight">ClaimLedger</p>
              <p className="mt-1 text-[11px] font-semibold text-[#5EEAD4] tracking-wide uppercase">
                {isAdmin ? 'Organisation Admin' : 'Brand Governance'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[#D6E3EF] hover:bg-white/10 hover:text-white lg:hidden cursor-pointer transition"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3.5 py-3">
          {isAdmin && (
            <div className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#8EA5BC]">
              Governance Navigation
            </div>
          )}

          {nav.map(({ to, label, Icon, number, isSettings }) => {
            const isMyContent = to === '/#my-content'
            const isActive = isMyContent
              ? location.pathname === '/' && location.hash === '#my-content'
              : location.pathname === to

            return (
              <div key={to} className="contents">
                {isSettings && (
                  <div className="my-2 border-t border-white/10 px-3 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8EA5BC]">
                      Settings
                    </p>
                  </div>
                )}
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => handleNavClick(to)}
                  className={() =>
                    `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] ${
                      isActive
                        ? 'bg-[#133558] text-[#5EEAD4] font-semibold shadow-xs'
                        : 'text-[#D6E3EF] hover:bg-navy-soft/80 hover:text-white'
                    }`
                  }
                >
                  {isAdmin && number ? (
                    <span
                      className={`font-mono text-xs w-5 shrink-0 transition-colors ${
                        isActive ? 'text-[#5EEAD4] font-bold' : 'text-[#8EA5BC] group-hover:text-[#5EEAD4]'
                      }`}
                    >
                      {number}
                    </span>
                  ) : (
                    <Icon size={17} className="shrink-0 transition-colors" aria-hidden />
                  )}
                  {isAdmin && number && (
                    <Icon
                      size={16}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-[#5EEAD4]' : 'text-[#8EA5BC] group-hover:text-white'
                      }`}
                      aria-hidden
                    />
                  )}
                  <span className="whitespace-nowrap leading-tight">{label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        {/* Clean Organisation-Facing System Status Card (Hidden for Content Creators) */}
        {user.role !== 'CREATOR' && (
          <div className="mx-3.5 my-2 shrink-0 rounded-xl bg-navy-soft/50 border border-white/10 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-[#5EEAD4] uppercase tracking-wider text-[10px]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Governance System
              </div>
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                Operational
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#A9BED2]">
              <span>Knowledge Base</span>
              <span className="font-semibold text-white">
                {docsQ.isLoading ? 'Verifying…' : `${approvedDocs} of ${totalDocs} Active`}
              </span>
            </div>
          </div>
        )}

        {/* Pinned Bottom Section: User Profile, Role and Sign Out */}
        <div className="shrink-0 border-t border-navy-soft px-5 py-3.5 mt-auto">
          <p className="font-semibold text-sm truncate">{user.fullName}</p>
          <p className="text-xs text-[#A9BED2]">{ROLE_LABEL[user.role]}</p>
          <button
            onClick={logout}
            className="mt-2.5 inline-flex items-center gap-2 rounded-lg py-1 text-sm text-[#D6E3EF] hover:text-white cursor-pointer transition"
          >
            <LogOut size={16} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      {/* Independently Scrollable Main Content Area */}
      <main ref={mainRef} className="min-w-0 flex-1 h-full overflow-y-auto px-5 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
