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
  PenSquare,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  'admin-insights': { to: '/admin/insights', label: 'Insights & Guidelines Health', number: '07', Icon: BarChart3 },
  'admin-settings': { to: '/admin/settings', label: 'Organisation Settings', Icon: Settings, isSettings: true },
}

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Reset scroll to top on page transitions (except when navigating with anchor hash like #my-content)
  useEffect(() => {
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
    if (to === '/#my-content') {
      const el = document.getElementById('my-content')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      {/* Permanent Full-Height Left Navigation Sidebar */}
      <aside className="flex h-full w-64 shrink-0 flex-col bg-navy text-white select-none">
        {/* Pinned Top Section: Brand Logo */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0 border-b border-white/10">
          <ClaimLedgerLogo size={36} />
          <div>
            <p className="font-display text-lg font-bold leading-none text-white tracking-tight">ClaimLedger</p>
            <p className="mt-1 text-[11px] font-semibold text-[#5EEAD4] tracking-wide uppercase">
              {isAdmin ? 'Organisation Admin' : 'Brand Governance'}
            </p>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {isAdmin && (
            <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#A9BED2]/70">
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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#A9BED2]/70">
                      Settings
                    </p>
                  </div>
                )}
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => handleNavClick(to)}
                  className={() =>
                    `flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-navy-soft text-[#5EEAD4] font-semibold' : 'text-[#D6E3EF] hover:bg-navy-soft'
                    }`
                  }
                >
                  {isAdmin && number ? (
                    <span className="font-mono text-xs font-semibold text-[#5EEAD4]/75 w-5 shrink-0">
                      {number}
                    </span>
                  ) : (
                    <Icon size={18} className="shrink-0" aria-hidden />
                  )}
                  {isAdmin && number && <Icon size={17} className="shrink-0 opacity-80" aria-hidden />}
                  <span className="truncate">{label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        {/* System Architecture Health - Hidden for Content Creators */}
        {user.role !== 'CREATOR' && (
          <div className="mx-3 my-2 shrink-0 rounded-xl bg-navy-soft/60 border border-white/10 p-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#5EEAD4] uppercase tracking-wider text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Cloud System Live
            </div>
            <p className="mt-1 text-[11px] text-[#A9BED2] leading-relaxed">
              Neon pgvector (Singapore) · Pure Java Deterministic Hierarchy
            </p>
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
      <main ref={mainRef} className="min-w-0 flex-1 h-full overflow-y-auto px-5 py-8 md:px-12 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
