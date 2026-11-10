import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from '../components/ClaimLedgerLogo'

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().min(1, 'Enter your work email').email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().trim().min(2, 'Enter your organisation name'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function Register() {
  const { user, register: authRegister } = useAuth()
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdCompanyName, setCreatedCompanyName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      companyName: '',
    },
  })

  // If already logged in, redirect to home
  useEffect(() => {
    if (user && !isSuccess) {
      navigate('/', { replace: true })
    }
  }, [user, isSuccess, navigate])

  // Handle successful registration: brief welcome screen before redirecting to /admin
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/admin', { replace: true })
      }, 2200)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, navigate])

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null)
    setIsSubmitting(true)

    try {
      setCreatedCompanyName(values.companyName)
      await authRegister({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        companyName: values.companyName,
      })
      setIsSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create your organisation workspace. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // =========================================================================
  // STEP 3: WORKSPACE CREATED WELCOME MESSAGE
  // =========================================================================
  if (isSuccess) {
    return (
      <div className="flex min-h-full items-center justify-center px-5 py-12 animate-fade-in">
        <div className="w-full max-w-md text-center">
          <div className="rounded-3xl border border-line bg-surface p-8 sm:p-10 shadow-xl space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                Workspace Created
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#0A1F36]">
                Your organisation workspace is ready!
              </h1>
              <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto">
                Welcome to ClaimLedger. Your brand-governance workspace for{' '}
                <strong className="text-slate-800">{createdCompanyName}</strong> has been created successfully.
              </p>
            </div>

            <div className="rounded-xl border border-line/80 bg-canvas p-4 text-xs text-muted text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Role:</span>
                <span className="font-bold text-[#0F766E]">Organisation Admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Default Departments:</span>
                <span className="font-semibold text-slate-800">Marketing, Sales, HR</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Knowledge Base:</span>
                <span className="font-semibold text-slate-800">Initialised (0 documents)</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/admin"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3 text-sm font-bold text-white hover:bg-[#0D6D65] transition shadow-xs cursor-pointer"
              >
                Go to Admin Dashboard <ArrowRight size={16} />
              </Link>
              <p className="mt-2 text-[11px] text-muted">
                Redirecting automatically in a moment…
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // STEP 1: CLEAN REGISTRATION FORM
  // =========================================================================
  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5">
          <ClaimLedgerLogo size={44} />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              ClaimLedger
            </h1>
            <p className="mt-0.5 text-xs text-muted">Every claim, accounted for.</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mt-6 mb-2">
          <h2 className="text-xl font-bold text-[#0A1F36]">Create your ClaimLedger account</h2>
          <p className="mt-0.5 text-xs text-muted">
            Set up your organisation's brand-governance workspace.
          </p>
        </div>

        {/* Registration Card Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-3 space-y-4 rounded-2xl border border-line bg-surface p-7 shadow-xs"
          noValidate
        >
          {/* 1. Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#0A1F36]"
            >
              <span>Full Name</span>
            </label>
            <div className="relative">
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                {...register('fullName')}
                placeholder="Enter your full name"
                aria-invalid={!!errors.fullName}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>
            )}
          </div>

          {/* 2. Work Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#0A1F36]"
            >
              <span>Work Email</span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="Enter your work email"
                aria-invalid={!!errors.email}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
            )}
          </div>

          {/* 3. Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#0A1F36]"
            >
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                placeholder="Create a password"
                aria-invalid={!!errors.password}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
            )}
          </div>

          {/* 4. Company Name */}
          <div>
            <label
              htmlFor="companyName"
              className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#0A1F36]"
            >
              <span>Company Name</span>
            </label>
            <div className="relative">
              <input
                id="companyName"
                type="text"
                autoComplete="organization"
                {...register('companyName')}
                placeholder="Enter your organisation name"
                aria-invalid={!!errors.companyName}
                className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-[#0A1F36] placeholder:text-[#94A3B8] transition-colors focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
              />
            </div>
            {errors.companyName && (
              <p className="mt-1 text-xs text-rose-600">{errors.companyName.message}</p>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0D6D65] disabled:opacity-60 cursor-pointer transition shadow-xs"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
            Create Account
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-muted">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-[#0F766E] hover:text-[#0D9488] hover:underline cursor-pointer"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
