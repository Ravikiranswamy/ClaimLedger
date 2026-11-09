import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck,
  Layers,
  Loader2,
  Lock,
  Mail,
  Scale,
  Settings,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABEL, type Role } from '../types'

const DEMO_PASSWORD = 'Demo@1234'

const schema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your work email')
    .email('Please enter a valid work email address'),
  password: z.string().min(1, 'Please enter your password'),
})
type Form = z.infer<typeof schema>

interface DemoRoleConfig {
  role: Role
  email: string
  label: string
  subtitle: string
  icon: typeof User
  iconBg: string
  iconColor: string
}

const DEMO_ROLES: DemoRoleConfig[] = [
  {
    role: 'CREATOR',
    email: 'creator@claimledger.dev',
    label: ROLE_LABEL.CREATOR,
    subtitle: 'Create and submit claims',
    icon: User,
    iconBg: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]',
  },
  {
    role: 'REVIEWER',
    email: 'reviewer@claimledger.dev',
    label: ROLE_LABEL.REVIEWER,
    subtitle: 'Review, verify and resolve claims',
    icon: ShieldCheck,
    iconBg: 'bg-[#DCFCE7]',
    iconColor: 'text-[#15803D]',
  },
  {
    role: 'DEPT_MANAGER',
    email: 'manager@claimledger.dev',
    label: ROLE_LABEL.DEPT_MANAGER,
    subtitle: 'Monitor workflows and team activity',
    icon: Users,
    iconBg: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]',
  },
  {
    role: 'ADMIN',
    email: 'admin@claimledger.dev',
    label: ROLE_LABEL.ADMIN,
    subtitle: 'Manage users, roles and system settings',
    icon: Settings,
    iconBg: 'bg-[#F1F5F9]',
    iconColor: 'text-[#475569]',
  },
]

export function Login() {
  const { user, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [activeRoleLoading, setActiveRoleLoading] = useState<Role | 'form' | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  })

  if (user) return <Navigate to="/" replace />

  const attempt = async (email: string, password: string, role?: Role) => {
    setError(null)
    setActiveRoleLoading(role || 'form')
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })

    try {
      await login(email, password)
    } catch (e) {
      if (e instanceof Error) {
        if (
          e.message.toLowerCase().includes('401') ||
          e.message.toLowerCase().includes('invalid') ||
          e.message.toLowerCase().includes('incorrect')
        ) {
          setError('Incorrect email or password. Try again or reset your password.')
        } else {
          setError(e.message)
        }
      } else {
        setError('Incorrect email or password. Try again or reset your password.')
      }
    } finally {
      setActiveRoleLoading(null)
    }
  }

  const isBusy = activeRoleLoading !== null

  return (
    <div className="min-h-screen w-full bg-white text-[#0A1F36] lg:grid lg:grid-cols-2">
      {/* ========================================================= */}
      {/* Left Column — Interactive Login & Demo Accounts Form      */}
      {/* ========================================================= */}
      <div className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 md:px-14 lg:px-16 xl:px-20">
        {/* Brand Header */}
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-xs">
            <ShieldCheck size={22} strokeWidth={2.2} aria-hidden />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-[#0A1F36]">
            ClaimLedger
          </span>
        </header>

        {/* Form Body */}
        <main className="my-auto w-full max-w-md py-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#0A1F36] sm:text-4xl">
            Welcome back to ClaimLedger
          </h1>
          <p className="mt-2 text-sm text-[#55677A] sm:text-base leading-relaxed">
            Verify claims, cross-check with authoritative sources, and track resolution — all in one place.
          </p>

          <form
            onSubmit={handleSubmit((data) => attempt(data.email, data.password))}
            className="mt-7 space-y-4"
            noValidate
          >
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2] px-3.5 py-3 text-sm text-[#B91C1C]"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            {/* Work email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#0A1F36]">
                Work email
              </label>
              <div
                className={`mt-1.5 flex items-center rounded-lg border bg-white px-3.5 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-[#0F766E] focus-within:border-[#0F766E] ${
                  errors.email ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]' : 'border-[#DDE5EE]'
                }`}
              >
                <Mail size={17} className="mr-2.5 shrink-0 text-[#94A3B8]" aria-hidden />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  className="w-full bg-transparent text-sm text-[#0A1F36] placeholder:text-[#94A3B8] focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#B91C1C]" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#0A1F36]">
                Password
              </label>
              <div
                className={`mt-1.5 flex items-center rounded-lg border bg-white px-3.5 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-[#0F766E] focus-within:border-[#0F766E] ${
                  errors.password ? 'border-[#B91C1C] ring-1 ring-[#B91C1C]' : 'border-[#DDE5EE]'
                }`}
              >
                <Lock size={17} className="mr-2.5 shrink-0 text-[#94A3B8]" aria-hidden />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  className="w-full bg-transparent text-sm text-[#0A1F36] placeholder:text-[#94A3B8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="ml-2 shrink-0 text-[#94A3B8] hover:text-[#0A1F36] focus:outline-none"
                >
                  {showPassword ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#B91C1C]" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#0B5F58] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {activeRoleLoading === 'form' && (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              )}
              Sign in
            </button>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#55677A]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#0F766E] focus:ring-[#0F766E]"
                />
                <span>Remember me</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault()
                  setError('Password resets are managed by your workspace administrator.')
                }}
                className="font-medium text-[#0F766E] hover:underline"
              >
                Forgot your password?
              </a>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <span className="relative bg-white px-3 text-xs font-medium text-[#64748B]">
              Or try a demo account
            </span>
          </div>

          {/* Interactive Demo Accounts Container (Matching User Reference) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white divide-y divide-[#F1F5F9] shadow-xs overflow-hidden">
            {DEMO_ROLES.map(({ role, email, label, subtitle, icon: Icon, iconBg, iconColor }) => {
              const isLoading = activeRoleLoading === role
              return (
                <button
                  key={role}
                  type="button"
                  disabled={isBusy}
                  onClick={() => attempt(email, DEMO_PASSWORD, role)}
                  className="group flex w-full items-center justify-between p-3.5 text-left transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}
                    >
                      <Icon size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0A1F36]">{label}</p>
                      <p className="text-xs text-[#64748B]">{subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-mono text-[#475569] transition group-hover:bg-[#E2E8F0]">
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin text-[#0F766E]" />
                    ) : (
                      <>
                        <span className="hidden sm:inline">{email}</span>
                        <span className="sm:hidden">{email.split('@')[0]}</span>
                        <ChevronRight
                          size={13}
                          className="text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#0A1F36]"
                        />
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </main>

        {/* Footer */}
        <footer className="flex items-center justify-between pt-6 text-xs text-[#94A3B8]">
          <p>© {new Date().getFullYear()} ClaimLedger. All rights reserved.</p>
          <div className="flex items-center gap-3 text-[#64748B]">
            <a href="#help" className="hover:text-[#0A1F36] hover:underline">
              Help
            </a>
            <span>·</span>
            <a href="#privacy" className="hover:text-[#0A1F36] hover:underline">
              Privacy
            </a>
            <span>·</span>
            <a href="#terms" className="hover:text-[#0A1F36] hover:underline">
              Terms
            </a>
          </div>
        </footer>
      </div>

      {/* ========================================================= */}
      {/* Right Column — Editorial About ClaimLedger (Pure Text)    */}
      {/* ========================================================= */}
      <aside className="hidden min-h-screen flex-col justify-between bg-[#0A1F36] p-10 text-white lg:flex lg:p-14 xl:p-18">
        {/* Top Tag */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#112E4D] px-3.5 py-1 text-xs font-medium text-[#5EEAD4] ring-1 ring-white/10">
            Enterprise Brand Governance Platform
          </span>
        </div>

        {/* Center Editorial Content */}
        <div className="my-auto max-w-lg py-8">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-white sm:text-4xl">
            Deterministic truth for every claim your brand publishes.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#A9BED2] sm:text-base">
            ClaimLedger replaces subjective review cycles with deterministic authority resolution.
            Every marketing sentence, pricing claim, and legal assertion is automatically verified
            against authoritative ground-truth documents before release.
          </p>

          {/* Three Clean Structure Cards (Pure Typography) */}
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#112E4D]/60 p-4 transition hover:border-white/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0F766E] text-white">
                  <Scale size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    6-Step Deterministic Authority Resolution
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                    Tier 1 Legal Master Catalogs automatically supersede sales collateral and
                    marketing drafts through mathematical rule precedence, eliminating LLM
                    hallucinations.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#112E4D]/60 p-4 transition hover:border-white/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0284C7] text-white">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    pgvector High-Precision Semantic Cross-Referencing
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                    Sub-second chunk retrieval and cosine similarity indexing against verified
                    enterprise knowledge repositories for real-time claim substantiation.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#112E4D]/60 p-4 transition hover:border-white/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#15803D] text-white">
                  <FileCheck size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Immutable Cryptographic Audit Trail
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                    Every automated verdict, human reviewer override, and revision history is
                    permanently recorded in the compliance ledger with full actor accountability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Principle Note */}
        <div className="border-t border-white/10 pt-4 text-xs text-[#64748B]">
          <p className="italic text-[#94A3B8]">
            “In regulated industries, brand integrity is legal compliance. No claim reaches the
            market without ground-truth evidence.”
          </p>
        </div>
      </aside>
    </div>
  )
}
