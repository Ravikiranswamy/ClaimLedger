import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
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

const DEMO_ROLES: { role: Role; email: string; label: string }[] = [
  { role: 'CREATOR', email: 'creator@nexora.com', label: ROLE_LABEL.CREATOR },
  { role: 'REVIEWER', email: 'reviewer@nexora.com', label: ROLE_LABEL.REVIEWER },
  { role: 'DEPT_MANAGER', email: 'manager@nexora.com', label: ROLE_LABEL.DEPT_MANAGER },
  { role: 'ADMIN', email: 'admin@nexora.com', label: ROLE_LABEL.ADMIN },
]

export function Login() {
  const { user, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
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
        if (e.message.toLowerCase().includes('401') || e.message.toLowerCase().includes('invalid') || e.message.toLowerCase().includes('incorrect')) {
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
      {/* Left Column — Form */}
      <div className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 md:px-16 lg:px-20 xl:px-24">
        {/* Brand Header */}
        <header className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F766E] text-white shadow-xs">
            <ShieldCheck size={20} strokeWidth={2.2} aria-hidden />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-[#0A1F36]">
            ClaimLedger
          </span>
        </header>

        {/* Main Sign-in Section */}
        <main className="my-auto w-full max-w-sm py-8 sm:max-w-md">
          <h1 className="font-serif text-3xl font-normal tracking-tight text-[#0A1F36] sm:text-4xl">
            Welcome back.
          </h1>

          <form
            onSubmit={handleSubmit((data) => attempt(data.email, data.password))}
            className="mt-8 space-y-5"
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

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#0A1F36]"
              >
                Work email
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] ${
                    errors.email
                      ? 'border-[#B91C1C] focus:ring-[#B91C1C]'
                      : 'border-[#DDE5EE]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#B91C1C]" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#0A1F36]"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-10 text-base text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] ${
                    errors.password
                      ? 'border-[#B91C1C] focus:ring-[#B91C1C]'
                      : 'border-[#DDE5EE]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#55677A] hover:text-[#0A1F36] focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden />
                  ) : (
                    <Eye size={18} aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#B91C1C]" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-base font-medium text-white shadow-xs transition hover:bg-[#0B5F58] focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeRoleLoading === 'form' && (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              )}
              Sign in
            </button>

            {/* Secondary Visual Links */}
            <div className="flex items-center justify-between pt-1 text-xs text-[#55677A]">
              <a
                href="#lost-password"
                onClick={(e) => {
                  e.preventDefault()
                  setError('Password resets are managed by your workspace administrator.')
                }}
                className="underline underline-offset-2 hover:text-[#0A1F36] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                Lost your password?
              </a>
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault()
                  setError('For access assistance, please contact support@nexora.com.')
                }}
                className="underline underline-offset-2 hover:text-[#0A1F36] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                Help
              </a>
            </div>
          </form>

          {/* Discreet Demo Accounts — evaluation only */}
          <section
            aria-labelledby="demo-accounts-heading"
            className="mt-10 border-t border-[#DDE5EE]/70 pt-6"
          >
            <p
              id="demo-accounts-heading"
              className="text-xs font-medium text-[#55677A]"
            >
              Demo accounts
            </p>
            <div className="mt-2.5 space-y-1">
              {DEMO_ROLES.map(({ role, email, label }) => {
                const isRoleLoading = activeRoleLoading === role
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={isBusy}
                    onClick={() => attempt(email, DEMO_PASSWORD, role)}
                    className="group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-[#55677A] transition hover:bg-[#F6F8FB] hover:text-[#0A1F36] focus:outline-none focus:ring-1 focus:ring-[#0F766E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="font-medium text-[#0A1F36]">{label}</span>
                    <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#94A3B8] group-hover:text-[#55677A]">
                      {isRoleLoading ? (
                        <Loader2 size={12} className="animate-spin text-[#0F766E]" />
                      ) : (
                        <>
                          <span>{email}</span>
                          <ChevronRight
                            size={12}
                            className="text-[#CBD5E1] transition group-hover:translate-x-0.5 group-hover:text-[#55677A]"
                          />
                        </>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-4 text-xs text-[#94A3B8]">
          © {new Date().getFullYear()} ClaimLedger. All rights reserved.
        </footer>
      </div>

      {/* Right Column — Calm Brand Collage Panel (Desktop only) */}
      <aside
        aria-hidden="true"
        className="relative hidden min-h-screen select-none items-center justify-center overflow-hidden bg-[#0A1F36] p-10 lg:flex xl:p-14"
      >
        {/* Subtle architectural background textures */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(15,118,110,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(109,40,217,0.12),transparent_50%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* The Collage Composition */}
        <div className="animate-fade-in relative w-full max-w-md">
          {/* 1. Underlying Source Document Card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#112E4D]/80 p-6 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                  <FileText size={17} />
                </div>
                <div>
                  <p className="font-mono text-xs font-medium text-slate-200">
                    Product_Master_Catalog_v4.2.pdf
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Tier 1 · Primary Legal Authority
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                Authoritative
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p className="font-serif italic text-slate-200">
                “Nexora Pro — ₹999 per user per month, billed annually. Supersedes all legacy marketing collaterals.”
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
                <span>Effective 1 Jan 2026</span>
                <span>•</span>
                <span>Sec 4.2</span>
              </div>
            </div>
          </div>

          {/* 2. Overlapping Verified Pill */}
          <div className="absolute -top-3.5 -right-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#15803D] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl">
            <Check size={13} strokeWidth={2.8} />
            <span>Verified</span>
          </div>

          {/* 3. Overlapping Evidence & Verification Card */}
          <div className="relative -mt-6 ml-6 rounded-2xl border border-[#DDE5EE] bg-white p-5 text-[#0A1F36] shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-[#0F766E]" />
                <span className="text-xs font-semibold text-[#0A1F36]">
                  Authority Resolution
                </span>
              </div>
              <span className="rounded-md bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-medium text-[#6D28D9]">
                Rule 1: Tier Hierarchy
              </span>
            </div>

            <div className="mt-3 rounded-lg bg-[#F6F8FB] p-3 text-xs">
              <div className="flex items-center justify-between text-[11px] text-[#55677A]">
                <span>Claimed Price</span>
                <span className="font-mono line-through text-[#B91C1C]">₹799/mo</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-semibold text-[#0A1F36]">
                <span>Approved Truth</span>
                <span className="font-mono text-[#15803D]">₹999/mo</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-[#55677A]">
              <div className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[#15803D]" />
                <span>Deterministic Verdict</span>
              </div>
              <span className="font-mono text-[#94A3B8]">0 ms latency</span>
            </div>
          </div>

          {/* 4. Overlapping Violation Pill */}
          <div className="absolute -bottom-3 left-2 z-10 flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-[#B91C1C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl">
            <ShieldAlert size={13} strokeWidth={2.4} />
            <span>Violation flagged</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
