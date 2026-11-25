import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Code2,
  ExternalLink,
  FileText,
  FlaskConical,
  History,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  PenSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { NAV_BY_ROLE, useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from './ClaimLedgerLogo'
import { DEPARTMENTS, ROLE_LABEL, type Role } from '../types'

interface NavItemConfig {
  to: string
  label: string
  Icon: LucideIcon
  isSettings?: boolean
}

const ITEMS: Record<string, NavItemConfig> = {
  home: { to: '/', label: 'Home', Icon: Home },
  submit: { to: '/submit', label: 'Submit', Icon: PenSquare },
  create: { to: '/submit', label: 'Create Content', Icon: PenSquare },
  'my-content': { to: '/my-content', label: 'My Content', Icon: FileText },
  review: { to: '/review', label: 'Review', Icon: ShieldCheck },
  knowledge: { to: '/knowledge-base', label: 'Knowledge Base', Icon: LibraryBig },
  guidelines: { to: '/guidelines', label: 'Brand Guidelines', Icon: BookOpen },
  history: { to: '/history', label: 'Activity & History', Icon: History },

  // Department Manager: 4 sections for departmental oversight
  'dept-home': { to: '/', label: 'Home', Icon: Home },
  'dept-submissions': { to: '/department/submissions', label: 'Department Submissions', Icon: FileText },
  'dept-insights': { to: '/department/insights', label: 'Compliance Insights', Icon: BarChart3 },
  'dept-activity': { to: '/department/activity', label: 'Department Activity', Icon: History },

  // Admin Workspace: 7 core sections + Organisation Settings
  'admin-overview': { to: '/', label: 'Overview', Icon: LayoutDashboard },
  'admin-knowledge': { to: '/knowledge-base', label: 'Knowledge Base', Icon: BookOpen },
  'admin-submissions': { to: '/admin/submissions', label: 'Content & Submissions', Icon: FileText },
  'admin-users': { to: '/admin/users', label: 'User Management', Icon: Users },
  'admin-approvals': { to: '/admin/approvals', label: 'Approval Management', Icon: CheckSquare },
  'admin-audit': { to: '/history', label: 'Audit & Activity', Icon: History },
  'admin-insights': { to: '/admin/insights', label: 'Insights & Guideline Health', Icon: BarChart3 },
  'admin-settings': { to: '/admin/settings', label: 'Organisation Settings', Icon: Settings, isSettings: true },
  campaigns: { to: '/campaigns', label: 'Campaign Governance', Icon: Tag },
  evaluation: { to: '/evaluation', label: 'Evaluation & Proof', Icon: FlaskConical },
  'draft-check': { to: '/draft-checker', label: 'Quick Draft Checker', Icon: Sparkles },
  'developer-workbench': { to: '/developer', label: 'Developer & API Workbench', Icon: Code2 },
  preflight: { to: '/developer', label: 'Developer & API Workbench', Icon: Code2 },
}

export function AppShell() {
  const { user, logout, enterDemoRole, switchingRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDemoAccount = Boolean(
    user?.email?.toLowerCase().endsWith('@nexora.com') || user?.email?.toLowerCase().endsWith('@claimledger.dev')
  )

  const handleQuickRoleSwitch = async (role: Role) => {
    if (!user || user.role === role || switchingRole) return
    await enterDemoRole(role)
    // Stay on submission detail inspection when switching between Creator/Reviewer/Admin; otherwise return to role home
    const keepRoute = location.pathname.startsWith('/submissions/') || location.pathname === '/evaluation'
    if (!keepRoute) {
      navigate('/')
    }
  }

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

  const handleNavClick = () => {
    setMobileOpen(false)
  }

  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'DEPT_MANAGER'

  const managerDeptName =
    user.departmentName ||
    DEPARTMENTS.find((d) => d.id === user.departmentId)?.name ||
    'Marketing'
  const managerDeptDisplay = managerDeptName.toLowerCase().includes('department')
    ? managerDeptName
    : `${managerDeptName} Department`

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
          {isManager ? 'DEPARTMENT MANAGER' : ROLE_LABEL[user.role]}
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
                {isAdmin ? 'Organisation Admin' : isManager ? 'DEPARTMENT MANAGER' : 'Brand Governance'}
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
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3.5 py-4">
          {isAdmin && (
            <div className="px-3.5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-[#8EA5BC]">
              Governance Navigation
            </div>
          )}
          {isManager && (
            <div className="px-3.5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-[#8EA5BC]">
              Department Oversight
            </div>
          )}

          {nav.map(({ to, label, Icon, isSettings }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

            return (
              <div key={to} className="contents">
                {isSettings && (
                  <div className="my-2.5 border-t border-white/10 px-3.5 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#8EA5BC]">
                      Settings
                    </p>
                  </div>
                )}
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={handleNavClick}
                  className={() =>
                    `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] ${
                      isActive
                        ? 'bg-[#133558] text-[#5EEAD4] font-semibold shadow-xs'
                        : 'text-[#D6E3EF] hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-[#5EEAD4]' : 'text-[#8EA5BC] group-hover:text-white'
                    }`}
                    aria-hidden
                  />
                  <span className="whitespace-nowrap leading-tight tracking-normal">{label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        {/* Pinned Bottom Section: 1-Click Demo Role Switcher, User Profile & Sign Out */}
        <div className="shrink-0 border-t border-white/10 px-5 py-4 mt-auto space-y-3">
          {isDemoAccount && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5EEAD4]">
                Demo Role Switcher
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { role: 'CREATOR', label: 'Creator' },
                    { role: 'REVIEWER', label: 'Reviewer' },
                    { role: 'DEPT_MANAGER', label: 'Manager' },
                    { role: 'ADMIN', label: 'Admin' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    disabled={switchingRole}
                    onClick={() => handleQuickRoleSwitch(item.role)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      user.role === item.role
                        ? 'bg-[#14B8A6] text-[#0A1F36] font-bold'
                        : 'bg-white/5 text-[#D6E3EF] hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <p className="font-semibold text-sm text-white truncate tracking-tight">{user.fullName}</p>
            {isManager ? (
              <div className="mt-1 flex flex-col gap-0.5">
                <p className="text-[11px] font-bold tracking-wider text-[#5EEAD4] uppercase">
                  DEPARTMENT MANAGER
                </p>
                <p className="text-xs text-[#8EA5BC] font-medium truncate">
                  {managerDeptDisplay}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#8EA5BC] mt-0.5 font-medium">{ROLE_LABEL[user.role]}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-lg py-1 text-xs font-medium text-[#D6E3EF] hover:text-[#5EEAD4] cursor-pointer transition w-fit"
              >
                <LogOut size={14} aria-hidden /> Sign out
              </button>
              <NavLink
                to="/showcase"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8EA5BC] hover:text-[#5EEAD4] transition"
              >
                Showcase <ExternalLink size={11} />
              </NavLink>
            </div>
          </div>
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
