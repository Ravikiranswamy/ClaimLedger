import { BookOpen, FileText, History, Home, LibraryBig, LogOut, PenSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { NAV_BY_ROLE, useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from './ClaimLedgerLogo'
import { ROLE_LABEL } from '../types'

const ITEMS: Record<string, { to: string; label: string; Icon: LucideIcon }> = {
  home: { to: '/', label: 'Home', Icon: Home },
  submit: { to: '/submit', label: 'Submit', Icon: PenSquare },
  create: { to: '/submit', label: 'Create Content', Icon: PenSquare },
  'my-content': { to: '/#my-content', label: 'My Content', Icon: FileText },
  review: { to: '/review', label: 'Review', Icon: ShieldCheck },
  knowledge: { to: '/knowledge-base', label: 'Knowledge Base', Icon: LibraryBig },
  guidelines: { to: '/knowledge-base', label: 'Brand Guidelines', Icon: BookOpen },
  history: { to: '/history', label: 'Activity & History', Icon: History },
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      {/* Permanent Full-Height Left Navigation Sidebar */}
      <aside className="flex h-full w-64 shrink-0 flex-col bg-navy text-white select-none">
        {/* Pinned Top Section: Brand Logo */}
        <div className="flex items-center gap-3 px-6 py-5 shrink-0">
          <ClaimLedgerLogo size={38} />
          <div>
            <p className="font-display text-xl font-semibold leading-none">ClaimLedger</p>
            <p className="mt-1 text-sm text-[#A9BED2]">Every claim, accounted for.</p>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {nav.map(({ to, label, Icon }) => {
            const isMyContent = to === '/#my-content'
            const isActive = isMyContent
              ? location.pathname === '/' && location.hash === '#my-content'
              : location.pathname === to

            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => handleNavClick(to)}
                className={() =>
                  `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    isActive ? 'bg-navy-soft text-[#5EEAD4]' : 'text-[#D6E3EF] hover:bg-navy-soft'
                  }`
                }
              >
                <Icon size={20} aria-hidden />
                {label}
              </NavLink>
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
        <div className="shrink-0 border-t border-navy-soft px-6 py-4 mt-auto">
          <p className="font-semibold">{user.fullName}</p>
          <p className="text-sm text-[#A9BED2]">{ROLE_LABEL[user.role]}</p>
          <button
            onClick={logout}
            className="mt-3 inline-flex items-center gap-2 rounded-lg py-1 text-base text-[#D6E3EF] hover:text-white"
          >
            <LogOut size={18} aria-hidden /> Sign out
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
