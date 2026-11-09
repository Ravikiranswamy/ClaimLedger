import { History, Home, LibraryBig, LogOut, PenSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import markImg from '../assets/claimledger-mark.png'
import { NAV_BY_ROLE, useAuth } from '../auth/AuthContext'
import { ROLE_LABEL } from '../types'

const ITEMS: Record<string, { to: string; label: string; Icon: LucideIcon }> = {
  home: { to: '/', label: 'Home', Icon: Home },
  submit: { to: '/submit', label: 'Submit', Icon: PenSquare },
  review: { to: '/review', label: 'Review', Icon: ShieldCheck },
  knowledge: { to: '/knowledge-base', label: 'Knowledge Base', Icon: LibraryBig },
  history: { to: '/history', label: 'History', Icon: History },
}

export function AppShell() {
  const { user, logout } = useAuth()
  if (!user) return null
  const nav = NAV_BY_ROLE[user.role].map((k) => ITEMS[k])

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-navy text-white md:w-64">
        <div className="flex items-center gap-3 px-6 py-5">
          <img
            src={markImg}
            alt="ClaimLedger"
            className="h-10 w-10 object-contain rounded-xl p-0.5 bg-white/10"
          />
          <div>
            <p className="font-display text-xl font-semibold leading-none text-white">ClaimLedger</p>
            <p className="mt-1 text-xs text-[#A9BED2]">Brand Governance</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                  isActive ? 'bg-navy-soft text-[#5EEAD4]' : 'text-[#D6E3EF] hover:bg-navy-soft'
                }`
              }
            >
              <Icon size={20} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        {/* System Architecture Health */}
        <div className="mx-3 my-2 rounded-xl bg-navy-soft/60 border border-white/10 p-3 text-xs hidden md:block">
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
        <div className="border-t border-navy-soft px-6 py-4">
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
      <main className="min-w-0 flex-1 px-5 py-8 md:px-12 md:py-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
