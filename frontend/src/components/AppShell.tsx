import { FileText, History, Home, LibraryBig, LogOut, PenSquare, ShieldCheck, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <FileText size={22} aria-hidden />
          </span>
          <div>
            <p className="font-display text-xl font-semibold leading-none">ClaimLedger</p>
            <p className="mt-1 text-sm text-[#A9BED2]">Every claim, accounted for.</p>
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
