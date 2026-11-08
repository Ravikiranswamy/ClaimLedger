import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Server, Zap } from 'lucide-react'
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

function WakeupBanner({ elapsed }: { elapsed: number }) {
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
      <p className="mt-1.5 text-xs text-amber-600">
        Free-tier servers sleep after inactivity. First sign-in takes ~30–45 s.
      </p>
    </div>
  )
}

export function Login() {
  const { user, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
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

  const attempt = async (email: string, password: string) => {
    setError(null)
    setIsWakingUp(false)

    // Show wake-up banner after 4 s of waiting
    const wakeTimer = setTimeout(() => setIsWakingUp(true), 4000)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.')
    } finally {
      clearTimeout(wakeTimer)
      setIsWakingUp(false)
    }
  }

  const isLoading = isSubmitting

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <h1 className="font-display text-4xl font-semibold tracking-tight">ClaimLedger</h1>
        <p className="mt-2 text-lg text-muted">Every claim, accounted for.</p>

        <form onSubmit={handleSubmit((v) => attempt(v.email, v.password))} className="mt-8 space-y-5 rounded-2xl border border-line bg-surface p-7" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block font-medium">Work email</label>
            <input id="email" type="email" autoComplete="username" {...register('email')}
              aria-invalid={!!errors.email}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base" />
            {errors.email && <p className="mt-1.5 text-sm text-violation">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-medium">Password</label>
            <input id="password" type="password" autoComplete="current-password" {...register('password')}
              aria-invalid={!!errors.password}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base" />
            {errors.password && <p className="mt-1.5 text-sm text-violation">{errors.password.message}</p>}
          </div>
          {error && <p role="alert" className="rounded-lg bg-violation-soft px-4 py-3 text-violation">{error}</p>}
          <button disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {isLoading && <Loader2 size={18} className="animate-spin" aria-hidden />} Sign in
          </button>
          {isWakingUp && <WakeupBanner elapsed={elapsed} />}
        </form>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6" aria-labelledby="demo-h">
          <div className="flex items-center gap-2">
            <h2 id="demo-h" className="font-semibold">Demo accounts (Nexora Technologies)</h2>
            <Zap size={14} className="text-amber-500" />
          </div>
          <p className="mt-1 text-muted text-sm">Synthetic data. Tap a role to sign in instantly.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {DEMO.map((d) => (
              <button key={d.role} type="button"
                disabled={isLoading}
                onClick={() => attempt(d.email, DEMO_PASSWORD)}
                className="rounded-xl border border-line px-3 py-3 text-base font-medium hover:border-brand hover:bg-brand-soft disabled:opacity-50">
                {ROLE_LABEL[d.role]}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
