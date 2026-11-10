import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { DEPARTMENTS, type SubmissionStatus } from '../types'

const AWAITING_STATUSES: SubmissionStatus[] = ['FLAGGED', 'IN_REVIEW', 'VERIFIED', 'ANALYZING']

export function ManagerDashboard() {
  const { user } = useAuth()

  const rawDeptName =
    user?.departmentName ||
    DEPARTMENTS.find((d) => d.id === user?.departmentId)?.name ||
    'Marketing'
  const cleanDeptName = rawDeptName.replace(/\s+Department$/i, '').trim()
  const departmentHeading = `${cleanDeptName} Department Overview`
  const managerDeptDisplay = `${cleanDeptName} Department`

  // Fetch submissions from backend
  const submissionsQ = useQuery({
    queryKey: ['manager-department-submissions', user?.departmentId, cleanDeptName],
    queryFn: () => api.listSubmissions(),
  })

  const rawSubmissions = submissionsQ.data ?? []

  // Restrict submissions strictly to the logged-in Manager's assigned department
  const departmentSubmissions = useMemo(() => {
    return rawSubmissions.filter((s) => {
      if (user?.departmentId && s.departmentId === user.departmentId) return true
      if (s.departmentName && s.departmentName.toLowerCase() === cleanDeptName.toLowerCase()) return true
      return false
    })
  }, [rawSubmissions, user, cleanDeptName])

  // Summary Metrics (Strictly Department-Scoped)
  const totalDepartmentSubmissions = departmentSubmissions.length
  const awaitingReviewCount = departmentSubmissions.filter((s) =>
    AWAITING_STATUSES.includes(s.status)
  ).length
  const changesRequestedCount = departmentSubmissions.filter(
    (s) => s.status === 'CHANGES_REQUESTED'
  ).length
  const approvedCount = departmentSubmissions.filter((s) => s.status === 'APPROVED').length

  const isLoading = submissionsQ.isLoading

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-xl md:p-10 border border-white/10">
        <div className="relative z-10 max-w-2xl">
          {/* Manager's name and assigned department badge */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-soft px-3.5 py-1 text-xs font-semibold text-[#5EEAD4] border border-white/10">
            <ShieldCheck size={14} aria-hidden />
            <span>DEPARTMENT MANAGER · {user?.fullName} · {managerDeptDisplay}</span>
          </div>

          {/* Department Name Heading */}
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl text-white">
            {departmentHeading}
          </h1>

          {/* Department Description */}
          <p className="mt-2 text-base text-[#D6E3EF] md:text-lg leading-relaxed">
            Monitor your department's content submissions and brand compliance.
          </p>

          {/* Action button: View Department Submissions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/department/submissions"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5EEAD4] px-5 py-2.5 font-semibold text-[#0A1F36] shadow-sm transition hover:bg-[#4ddac4] cursor-pointer text-sm"
            >
              <FileCheck2 size={17} aria-hidden /> View Department Submissions
            </Link>
          </div>
        </div>

        {/* Ambient decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      </div>

      {/* 2. Department Summary */}
      <section aria-labelledby="department-summary-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#0F766E]" />
            <h2 id="department-summary-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
              Department Summary
            </h2>
          </div>
          <span className="text-xs font-medium text-muted">
            Scoped to {managerDeptDisplay}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Department Submissions */}
          <div
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Department Submissions
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-[#0A1F36]">
              {isLoading ? '–' : totalDepartmentSubmissions}
            </p>
            <div className="mt-2 text-xs text-muted">
              <span>Total departmental submissions</span>
            </div>
          </div>

          {/* 2. Awaiting Review */}
          <Link
            to="/department/submissions?status=AWAITING_REVIEW"
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Awaiting Review
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
                <Clock size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-amber-600">
              {isLoading ? '–' : awaitingReviewCount}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>Awaiting reviewer decision</span>
              <span className="text-amber-700 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                View <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          {/* 3. Changes Requested */}
          <Link
            to="/department/submissions?status=CHANGES_REQUESTED"
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-orange-400 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Changes Requested
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:scale-105">
                <RotateCcw size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-orange-600">
              {isLoading ? '–' : changesRequestedCount}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>Returned to creators</span>
              <span className="text-orange-700 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                View <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          {/* 4. Approved */}
          <Link
            to="/department/submissions?status=APPROVED"
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Approved
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-emerald-600">
              {isLoading ? '–' : approvedCount}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted">
              <span>Approved for publication</span>
              <span className="text-emerald-700 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                View <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}
