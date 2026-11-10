import { zodResolver } from '@hookform/resolvers/zod'
import {
  Layers,
  Loader2,
  Server,
  Settings,
  ShieldCheck,
  UserPen,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from '../components/ClaimLedgerLogo'
import type { Role } from '../types'

const DEMO_PASSWORD = 'Demo@1234'

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Form = z.infer<typeof schema>

interface DemoAccount {
  role: Role
  label: string
  email: string
  Icon: LucideIcon
}

const DEMO: DemoAccount[] = [
  { role: 'CREATOR', label: 'Content Creator', email: 'creator@nexora.com', Icon: UserPen },
  { role: 'REVIEWER', label: 'Authorised Reviewer', email: 'reviewer@nexora.com', Icon: ShieldCheck },
  { role: 'DEPT_MANAGER', label: 'Manager', email: 'manager@nexora.com', Icon: Users },
  { role: 'ADMIN', label: 'Admin', email: 'admin@nexora.com', Icon: Settings },
]

// Messages shown while server is waking up
const WAKEUP_MESSAGES = [
  'Connecting to backend…',
  'Server is starting up (free tier)…',
  'Almost there — loading Java runtime…',
  'Warming up the database connection…',
  'Nearly ready — hang tight!',
]

function WakeupBanner({ elapsed, onSwitchMock }: { elapsed: number; onSwitchMock?: () => void }) {
  const msgIndex = Math.min(Math.floor(elapsed / 7), WAKEUP_MESSAGES.length - 1)
  const progress = Math.min((elapsed / 45) * 100, 95)

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-2 text-amber-800">
        <Server size={15} className="shrink-0 animate-pulse" />
        <span className="text-sm font-medium">{WAKEUP_MESSAGES[msgIndex]}</span>
        <span className="ml-auto text-xs tabular-nums text-amber-600">{elapsed}s</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-amber-700">
        <span>Free tier wakes up in ~30s.</span>
        {onSwitchMock && (
          <button
            type="button"
            onClick={onSwitchMock}
            className="font-semibold underline hover:text-amber-900 cursor-pointer"
          >
            ⚡ Switch to Instant Mode →
          </button>
        )}
      </div>
    </div>
  )
}

export function Login() {
  const { user, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [submittingRole, setSubmittingRole] = useState<Role | 'form' | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  // Start/stop the elapsed-seconds ticker
  useEffect(() => {
    if (isWakingUp) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isWakingUp])

  if (user) return <Navigate to="/" replace />

  const attempt = async (email: string, password: string, role?: Role) => {
    setError(null)
    setIsWakingUp(false)
    setSubmittingRole(role || 'form')

    setValue('email', email)
    setValue('password', password)

    // Show wake-up banner after 3 s of waiting
    const wakeTimer = setTimeout(() => setIsWakingUp(true), 3000)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.')
    } finally {
      clearTimeout(wakeTimer)
      setIsWakingUp(false)
      setSubmittingRole(null)
    }
  }

  const handleInstantBypass = () => {
    localStorage.setItem('claimledger.force_mock', 'true')
    attempt('admin@nexora.com', DEMO_PASSWORD, 'ADMIN')
  }

  const isLoading = submittingRole !== null

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5">
          <ClaimLedgerLogo size={44} />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">ClaimLedger</h1>
            <p className="mt-0.5 text-xs text-muted">Every claim, accounted for.</p>
          </div>
        </div>

        {/* Welcome Back Heading */}
        <div className="mt-6 mb-1">
          <h2 className="text-xl font-semibold text-[#0A1F36]">Welcome back</h2>
          <p className="mt-0.5 text-xs text-muted">Sign in to your brand governance workspace.</p>
        </div>

        {/* Primary Sign-In Form */}
        <form
          onSubmit={handleSubmit((v) => attempt(v.email, v.password))}
          className="mt-3 space-y-4 rounded-2xl border border-line bg-surface p-7 shadow-xs"
          noValidate
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#0A1F36]">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              {...register('email')}
              placeholder="e.g. admin@nexora.com"
              aria-invalid={!!errors.email}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
            {errors.email && <p className="mt-1 text-xs text-violation">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-[#0A1F36]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
            {errors.password && <p className="mt-1 text-xs text-violation">{errors.password.message}</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-violation-soft px-4 py-2.5 text-xs text-violation">
              {error}
            </p>
          )}

          <button
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 cursor-pointer transition shadow-xs"
          >
            {submittingRole === 'form' && <Loader2 size={16} className="animate-spin" aria-hidden />}
            Sign in
          </button>

          {/* Create New Account Option */}
          <div className="pt-2 text-center border-t border-line/60">
            <p className="text-xs text-muted">
              Don't have an account?{' '}
              <button
                type="button"
                className="font-bold text-[#0F766E] hover:text-[#0D9488] hover:underline cursor-pointer transition"
              >
                Create new account
              </button>
            </p>
          </div>

          {isWakingUp && <WakeupBanner elapsed={elapsed} onSwitchMock={handleInstantBypass} />}
        </form>

        {/* Centered 'or' Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E2E8F0]" />
          </div>
          <span className="relative rounded-full border border-[#E2E8F0] bg-white px-3 py-0.5 text-xs font-medium text-slate-400 shadow-2xs">
            or
          </span>
        </div>

        {/* Explore demo workspace Banner */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#C5EDE3] bg-[#EAF7F4] p-3.5 sm:p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#A7F3D0]/60 bg-[#D4F4ED] text-[#0D9488] shadow-2xs">
            <Layers size={22} className="text-[#0D9488]" />
          </div>
          <div className="h-8 w-px shrink-0 bg-[#A7F3D0]/80" />
          <div>
            <h2 className="text-[15px] font-bold text-[#0F172A] leading-tight">
              Explore demo workspace
            </h2>
            <p className="mt-0.5 text-xs text-[#55677A]">
              Nexora Technologies · Sample organisation
            </p>
          </div>
        </div>

        {/* 2x2 Interactive Roles Grid (Matching Reference Screenshot) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {DEMO.map((d) => (
            <button
              key={d.role}
              type="button"
              disabled={isLoading}
              onClick={() => attempt(d.email, DEMO_PASSWORD, d.role)}
              className="group flex items-center justify-start gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3.5 text-left text-xs sm:text-[13px] font-semibold text-[#0F172A] hover:border-[#0D9488] hover:bg-[#F0FDF9] disabled:opacity-50 cursor-pointer transition shadow-2xs"
            >
              {submittingRole === d.role ? (
                <Loader2 size={18} className="animate-spin text-[#0D9488] shrink-0" />
              ) : (
                <d.Icon size={18} className="text-[#0D9488] shrink-0 transition-transform group-hover:scale-110" />
              )}
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
