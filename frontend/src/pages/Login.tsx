import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { USE_MOCK } from '../api'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABEL, type Role } from '../types'

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Form = z.infer<typeof schema>

// Demo convenience only. The backend must still enforce every permission.
const DEMO: { role: Role; email: string }[] = [
  { role: 'CREATOR', email: 'creator@nexora.test' },
  { role: 'MANAGER', email: 'manager@nexora.test' },
  { role: 'REVIEWER', email: 'reviewer@nexora.test' },
  { role: 'ADMIN', email: 'admin@nexora.test' },
]

export function Login() {
  const { user, login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  if (user) return <Navigate to="/" replace />

  const attempt = async (email: string, password: string) => {
    setError(null)
    try {
      await login(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.')
    }
  }

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
          <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
            {isSubmitting && <Loader2 size={18} className="animate-spin" aria-hidden />} Sign in
          </button>
        </form>

        {USE_MOCK && (
          <section className="mt-6 rounded-2xl border border-line bg-surface p-6" aria-labelledby="demo-h">
            <h2 id="demo-h" className="font-semibold">Demo accounts (Nexora Technologies)</h2>
            <p className="mt-1 text-muted">Synthetic data. Tap a role to sign in.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {DEMO.map((d) => (
                <button key={d.role} type="button" onClick={() => attempt(d.email, 'demo')}
                  className="rounded-xl border border-line px-3 py-3 text-base font-medium hover:border-brand hover:bg-brand-soft">
                  {ROLE_LABEL[d.role]}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
