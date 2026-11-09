import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Server } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABEL, type Role } from '../types'

const DEMO_PASSWORD = 'Demo@1234'

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Form = z.infer<typeof schema>

// Demo convenience only. The backend must still enforce every permission.
const DEMO: { role: Role; email: string }[] = [
  { role: 'CREATOR', email: 'creator@nexora.com' },
  { role: 'DEPT_MANAGER', email: 'manager@nexora.com' },
  { role: 'REVIEWER', email: 'reviewer@nexora.com' },
  { role: 'ADMIN', email: 'admin@nexora.com' },
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
            className="font-semibold underline hover:text-amber-900"
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
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
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
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">ClaimLedger</h1>
          <p className="mt-1 text-base text-muted">Every claim, accounted for.</p>
        </div>

        <form onSubmit={handleSubmit((v) => attempt(v.email, v.password))} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-7" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block font-medium">Work email</label>
            <input id="email" type="email" autoComplete="username" {...register('email')}
              placeholder="e.g. admin@nexora.com"
              aria-invalid={!!errors.email}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base" />
            {errors.email && <p className="mt-1.5 text-sm text-violation">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-medium">Password</label>
            <input id="password" type="password" autoComplete="current-password" {...register('password')}
              placeholder="Demo@1234"
              aria-invalid={!!errors.password}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base" />
            {errors.password && <p className="mt-1.5 text-sm text-violation">{errors.password.message}</p>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-violation-soft px-4 py-3 text-sm text-violation">{error}</p>}
          <button disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60 cursor-pointer">
            {submittingRole === 'form' && <Loader2 size={18} className="animate-spin" aria-hidden />} Sign in
          </button>
          {isWakingUp && <WakeupBanner elapsed={elapsed} onSwitchMock={handleInstantBypass} />}
        </form>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6" aria-labelledby="demo-h">
          <div>
            <h2 id="demo-h" className="font-semibold text-base text-[#0A1F36]">
              Evaluation workspace <span className="font-normal text-muted text-sm">(Demo: Nexora Technologies)</span>
            </h2>
            <p className="mt-1 text-muted text-xs leading-relaxed">
              Pre-configured sample enterprise for testing governance workflows across roles. Tap any profile to sign in.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {DEMO.map((d) => (
              <button key={d.role} type="button"
                disabled={isLoading}
                onClick={() => attempt(d.email, DEMO_PASSWORD, d.role)}
                className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium hover:border-brand hover:bg-brand-soft disabled:opacity-50 cursor-pointer transition">
                {submittingRole === d.role && <Loader2 size={14} className="animate-spin text-brand" />}
                {ROLE_LABEL[d.role]}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
