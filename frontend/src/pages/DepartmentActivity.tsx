import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Send,
  ShieldCheck,
  Wand2,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { DEPARTMENTS, type ActionType } from '../types'

type DateRangeOption = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS'

interface ActivityMeta {
  label: string
  badgeClass: string
  Icon: any
  desc: string
}

const DEPARTMENT_ACTION_META: Partial<Record<ActionType, ActivityMeta>> = {
  SUBMITTED: {
    label: 'Content Submitted',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    Icon: Send,
    desc: 'New departmental content submitted for verification.',
  },
  ANALYZED: {
    label: 'AI Analysis Completed',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    Icon: Bot,
    desc: 'Deterministic engine verified claims against Tier 1-3 knowledge.',
  },
  CREATOR_REVISED: {
    label: 'Revision Submitted',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    Icon: Wand2,
    desc: 'Creator submitted a revised version addressing flagged claims.',
  },
  REVIEWER_CHANGES_REQUESTED: {
    label: 'Changes Requested',
    badgeClass: 'bg-orange-50 text-orange-900 border-orange-200',
    Icon: AlertTriangle,
    desc: 'Reviewer returned content with revision instructions.',
  },
  REVIEWER_APPROVED: {
    label: 'Content Approved',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    Icon: CheckCircle2,
    desc: 'Authorised reviewer approved content for publication.',
  },
  REVIEWER_REJECTED: {
    label: 'Content Rejected',
    badgeClass: 'bg-rose-50 text-rose-900 border-rose-300',
    Icon: XCircle,
    desc: 'Reviewer rejected content due to brand truth violations.',
  },
}

export function DepartmentActivity() {
  const { user } = useAuth()
  const rawDeptName =
    user?.departmentName ||
    DEPARTMENTS.find((d) => d.id === user?.departmentId)?.name ||
    'Marketing'
  const cleanDeptName = rawDeptName.replace(/\s+Department$/i, '').trim()
  const managerDeptDisplay = `${cleanDeptName} Department`

  // Filters State
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [actorFilter, setActorFilter] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL')

  // Queries (AuditController and mockApi filter strictly to department for DEPT_MANAGER)
  const auditQ = useQuery({ queryKey: ['department-audit', user?.departmentId, cleanDeptName], queryFn: api.listGlobalAudit })
  const submissionsQ = useQuery({ queryKey: ['department-submissions-for-activity', user?.departmentId, cleanDeptName], queryFn: api.listSubmissions })

  const auditLogs = auditQ.data ?? []
  const submissions = submissionsQ.data ?? []

  // Submissions map
  const subMap = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions])

  // Filter audit logs strictly to the manager's assigned department
  const departmentLogs = useMemo(() => {
    return auditLogs.filter((entry) => {
      // Must belong to department submissions
      if (entry.submissionId) {
        const sub = subMap.get(entry.submissionId)
        if (sub) {
          if (user?.departmentId && sub.departmentId === user.departmentId) return true
          if (sub.departmentName && sub.departmentName.toLowerCase() === cleanDeptName.toLowerCase()) return true
          return false
        }
      }
      if (entry.departmentName && entry.departmentName.toLowerCase() === cleanDeptName.toLowerCase()) {
        return true
      }
      return false
    })
  }, [auditLogs, subMap, user?.departmentId, cleanDeptName])

  // Summary Metrics (3 Department-Specific Metrics)
  const totalDepartmentActivities = departmentLogs.length
  const contentSubmissionEvents = departmentLogs.filter((a) =>
    ['SUBMITTED', 'CREATOR_REVISED'].includes(a.action)
  ).length
  const reviewDecisions = departmentLogs.filter((a) =>
    ['REVIEWER_APPROVED', 'REVIEWER_CHANGES_REQUESTED', 'REVIEWER_REJECTED'].includes(a.action)
  ).length

  // Unique list of actors for filter dropdown
  const uniqueActors = useMemo(() => {
    const names = new Set<string>()
    departmentLogs.forEach((a) => {
      if (a.action === 'ANALYZED') {
        names.add('ClaimLedger AI')
      } else if (a.actorName) {
        names.add(a.actorName)
      }
    })
    return Array.from(names).sort()
  }, [departmentLogs])

  // Filtered department logs
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000
    const sevenDays = 7 * oneDay
    const thirtyDays = 30 * oneDay

    return departmentLogs.filter((entry) => {
      // Action type filter
      if (actionFilter !== 'ALL' && entry.action !== actionFilter) {
        return false
      }

      // Actor filter
      if (actorFilter !== 'ALL') {
        const effectiveActor = entry.action === 'ANALYZED' ? 'ClaimLedger AI' : entry.actorName
        if (effectiveActor !== actorFilter) return false
      }

      // Date range filter
      if (dateRange !== 'ALL') {
        const entryTime = new Date(entry.createdAt).getTime()
        const diff = now - entryTime
        if (dateRange === 'TODAY' && diff > oneDay) return false
        if (dateRange === '7_DAYS' && diff > sevenDays) return false
        if (dateRange === '30_DAYS' && diff > thirtyDays) return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const effectiveActor = (entry.action === 'ANALYZED' ? 'ClaimLedger AI' : entry.actorName || '').toLowerCase()
        const sub = entry.submissionId ? subMap.get(entry.submissionId) : null
        const subTitle = (sub?.title || entry.resourceName || '').toLowerCase()
        const comment = (entry.comment || '').toLowerCase()

        if (!effectiveActor.includes(q) && !subTitle.includes(q) && !comment.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [departmentLogs, actionFilter, actorFilter, dateRange, search, subMap])

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Department Oversight
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              Department Activity
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              Track departmental content submissions, deterministic AI analysis runs, and authorised reviewer decisions for the {managerDeptDisplay}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-800">
              <ShieldCheck size={14} className="text-[#0F766E]" />
              {managerDeptDisplay} Scope
            </span>
          </div>
        </div>
      </div>

      {/* 2. Three Department-Specific Summary Metrics */}
      <section aria-labelledby="department-activity-metrics-heading">
        <h2 id="department-activity-metrics-heading" className="sr-only">
          Department Activity Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Department Activities */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Department Activities
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-[#0A1F36]">
              {auditQ.isLoading ? '–' : totalDepartmentActivities}
            </p>
            <p className="mt-1 text-xs text-muted">All submission and review events in {cleanDeptName}</p>
          </div>

          {/* Content Submission Events */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Content Submission Events
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Send size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-teal-700">
              {auditQ.isLoading ? '–' : contentSubmissionEvents}
            </p>
            <p className="mt-1 text-xs text-muted">Initial submissions and creator revisions</p>
          </div>

          {/* Review Decisions */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Review Decisions
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <ShieldCheck size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-purple-700">
              {auditQ.isLoading ? '–' : reviewDecisions}
            </p>
            <p className="mt-1 text-xs text-muted">Decisions by Authorised Reviewers</p>
          </div>
        </div>
      </section>

      {/* 3. Search and Filters (No Department Filter) */}
      <section aria-labelledby="activity-filters-heading" className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <h2 id="activity-filters-heading" className="sr-only">Activity Filters</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by submission title, actor name, or comment…"
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Scope Badge */}
            <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-xs font-medium text-teal-900">
              <span>Department: <strong className="text-[#0F766E] font-semibold">{cleanDeptName}</strong></span>
            </div>

            {/* Activity Type Filter */}
            <select
              aria-label="Filter by activity type"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Activity Types</option>
              <option value="SUBMITTED">Content Submitted</option>
              <option value="ANALYZED">AI Analysis Completed</option>
              <option value="CREATOR_REVISED">Revision Submitted</option>
              <option value="REVIEWER_CHANGES_REQUESTED">Changes Requested</option>
              <option value="REVIEWER_APPROVED">Content Approved</option>
              <option value="REVIEWER_REJECTED">Content Rejected</option>
            </select>

            {/* Actor Filter */}
            <select
              aria-label="Filter by actor"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Actors</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>

            {/* Time Period Filter */}
            <select
              aria-label="Filter by time period"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Activity Table */}
      <section aria-labelledby="activity-table-heading" className="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
        <h2 id="activity-table-heading" className="sr-only">Department Activity Table</h2>

        {auditQ.isLoading ? (
          <div className="p-12 text-center text-muted">
            <Clock size={24} className="mx-auto mb-2 animate-spin text-[#0F766E]" />
            <p className="text-sm">Loading department activity events…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Clock size={32} className="mx-auto mb-2 text-muted/60" />
            <p className="font-semibold text-ink">No department activity found</p>
            <p className="text-xs mt-1">No events match the selected criteria in {cleanDeptName}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas/75 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-3.5">Activity</th>
                  <th scope="col" className="px-4 py-3.5">Performed By</th>
                  <th scope="col" className="px-5 py-3.5">Submission</th>
                  <th scope="col" className="px-4 py-3.5">Details or Comment</th>
                  <th scope="col" className="px-4 py-3.5">Timestamp</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm text-ink">
                {filteredLogs.map((entry) => {
                  const meta = DEPARTMENT_ACTION_META[entry.action] ?? {
                    label: entry.action.replace(/_/g, ' '),
                    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
                    Icon: Clock,
                    desc: '',
                  }
                  const ActionIcon = meta.Icon

                  // Identify system actor as ClaimLedger AI
                  const isAiAnalysis = entry.action === 'ANALYZED'
                  const actorDisplay = isAiAnalysis ? 'ClaimLedger AI' : entry.actorName || 'System'
                  const actorRoleDisplay = isAiAnalysis
                    ? 'Automated Engine'
                    : entry.actorRole ?? (entry.action.startsWith('REVIEWER_') ? 'Authorised Reviewer' : 'Creator')

                  const sub = entry.submissionId ? subMap.get(entry.submissionId) : null
                  const submissionTitle = sub?.title || entry.resourceName || 'Department Submission'
                  const submissionId = entry.submissionId || sub?.id

                  return (
                    <tr key={entry.id} className="hover:bg-canvas/60 transition group">
                      {/* 1. Activity */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.badgeClass}`}>
                            <ActionIcon size={15} />
                          </span>
                          <div>
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold border ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            <p className="text-[11px] text-muted mt-0.5">{meta.desc}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Performed By */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isAiAnalysis
                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                : 'bg-slate-100 border border-slate-200 text-slate-700'
                            }`}
                          >
                            {isAiAnalysis ? <Bot size={14} /> : actorDisplay.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink leading-tight">{actorDisplay}</p>
                            <p className="text-[11px] text-muted leading-tight">{actorRoleDisplay}</p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Submission */}
                      <td className="px-5 py-4">
                        <div className="max-w-xs">
                          {submissionId ? (
                            <Link
                              to={`/department/submissions/${submissionId}`}
                              className="font-semibold text-xs text-ink hover:text-[#0F766E] transition line-clamp-1"
                            >
                              {submissionTitle}
                            </Link>
                          ) : (
                            <span className="font-semibold text-xs text-ink line-clamp-1">{submissionTitle}</span>
                          )}
                          <span className="text-[11px] text-muted font-mono">{managerDeptDisplay}</span>
                        </div>
                      </td>

                      {/* 4. Details or Comment */}
                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-700 max-w-sm line-clamp-2 leading-relaxed">
                          {entry.comment || meta.desc || 'No additional comment recorded.'}
                        </p>
                      </td>

                      {/* 5. Timestamp */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted/70" />
                          <span>{formatWhen(entry.createdAt)}</span>
                        </div>
                      </td>

                      {/* 6. Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {submissionId ? (
                          <Link
                            to={`/department/submissions/${submissionId}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-canvas border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] hover:bg-teal-50/40 transition shadow-2xs cursor-pointer"
                          >
                            View Submission <ArrowRight size={13} />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted italic">–</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
