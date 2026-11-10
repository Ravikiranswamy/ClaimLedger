import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  History as HistoryIcon,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatWhen } from '../components/AuditTimeline'
import type { User } from '../types'

type DateRangeOption = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS'
type DecisionFilterOption = 'ALL' | 'REVIEWER_APPROVED' | 'REVIEWER_CHANGES_REQUESTED' | 'REVIEWER_REJECTED'

interface ReviewerHistoryProps {
  user: User | null
}

export function ReviewerHistory({ user }: ReviewerHistoryProps) {
  // Filters State
  const [search, setSearch] = useState('')
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilterOption>('ALL')
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL')

  // Queries
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const auditQ = useQuery({ queryKey: ['audit-all'], queryFn: api.listGlobalAudit })

  const submissions = submissionsQ.data ?? []
  const auditLogs = auditQ.data ?? []

  // Submissions map by ID for fast lookup of Creator, Department, and Title
  const subMap = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions])

  // Filter audit records strictly to review decisions performed by the logged-in Reviewer
  const reviewerDecisions = useMemo(() => {
    const reviewerEmail = user?.email?.trim().toLowerCase()
    const reviewerName = user?.fullName?.trim().toLowerCase()

    return auditLogs.filter((entry) => {
      // Must be one of the three completed review decisions
      if (!['REVIEWER_APPROVED', 'REVIEWER_CHANGES_REQUESTED', 'REVIEWER_REJECTED'].includes(entry.action)) {
        return false
      }

      // Must be performed by the logged-in Reviewer
      if (entry.actorEmail && reviewerEmail && entry.actorEmail.trim().toLowerCase() === reviewerEmail) {
        return true
      }
      if (entry.actorName && reviewerName && entry.actorName.trim().toLowerCase() === reviewerName) {
        return true
      }
      // Fallback for reviewer session without conflicting email
      if (!entry.actorEmail && entry.actorRole === 'REVIEWER') {
        return true
      }
      return false
    })
  }, [auditLogs, user])

  // 1. Personal Page Summary Metrics
  const metrics = useMemo(() => {
    const approvedByMe = reviewerDecisions.filter((a) => a.action === 'REVIEWER_APPROVED').length
    const changesRequestedByMe = reviewerDecisions.filter(
      (a) => a.action === 'REVIEWER_CHANGES_REQUESTED'
    ).length
    const rejectedByMe = reviewerDecisions.filter((a) => a.action === 'REVIEWER_REJECTED').length

    return {
      approvedByMe,
      changesRequestedByMe,
      rejectedByMe,
      totalDecisions: reviewerDecisions.length,
    }
  }, [reviewerDecisions])

  // Filtered decisions list based on search, decision type, and date range
  const filteredDecisions = useMemo(() => {
    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000
    const sevenDays = 7 * oneDay
    const thirtyDays = 30 * oneDay

    return reviewerDecisions.filter((entry) => {
      // Decision type filter
      if (decisionFilter !== 'ALL' && entry.action !== decisionFilter) {
        return false
      }

      // Date range filter
      if (dateRange !== 'ALL') {
        const entryTime = new Date(entry.createdAt).getTime()
        const diff = now - entryTime
        if (dateRange === 'TODAY' && diff > oneDay) return false
        if (dateRange === '7_DAYS' && diff > sevenDays) return false
        if (dateRange === '30_DAYS' && diff > thirtyDays) return false
      }

      // Search filter (by submission title or Creator name)
      if (search.trim()) {
        const q = search.toLowerCase()
        const sub = entry.submissionId ? subMap.get(entry.submissionId) : null
        const title = (sub?.title ?? entry.resourceName ?? '').toLowerCase()
        const creator = (sub?.submittedByName ?? '').toLowerCase()
        const comment = (entry.comment ?? '').toLowerCase()

        if (!title.includes(q) && !creator.includes(q) && !comment.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [reviewerDecisions, decisionFilter, dateRange, search, subMap])

  const hasActiveFilters = search.trim() !== '' || decisionFilter !== 'ALL' || dateRange !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setDecisionFilter('ALL')
    setDateRange('ALL')
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Page Header (Scoped to Reviewer, no admin export controls) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F766E] text-white text-xs font-bold font-mono">
                04
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Authorised Reviewer Workspace
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              Review History
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              Chronological log of completed brand compliance decisions, reviewer comments, and revision evaluations performed by you.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Personal Review Summary Metrics Ribbon (3 Cards) */}
      <section aria-labelledby="history-metrics-heading">
        <h2 id="history-metrics-heading" className="sr-only">
          Review Decision Summary Metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Approved by Me */}
          <button
            type="button"
            onClick={() =>
              setDecisionFilter(
                decisionFilter === 'REVIEWER_APPROVED' ? 'ALL' : 'REVIEWER_APPROVED'
              )
            }
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              decisionFilter === 'REVIEWER_APPROVED'
                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                Approved by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <div className="mt-3">
              <span className="font-display text-3xl font-bold text-emerald-950">
                {metrics.approvedByMe}
              </span>
              <p className="mt-1 text-xs text-emerald-800">
                Content verified & cleared for corporate publication
              </p>
            </div>
          </button>

          {/* Changes Requested by Me */}
          <button
            type="button"
            onClick={() =>
              setDecisionFilter(
                decisionFilter === 'REVIEWER_CHANGES_REQUESTED'
                  ? 'ALL'
                  : 'REVIEWER_CHANGES_REQUESTED'
              )
            }
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              decisionFilter === 'REVIEWER_CHANGES_REQUESTED'
                ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                Changes Requested by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <RotateCcw size={18} />
              </span>
            </div>
            <div className="mt-3">
              <span className="font-display text-3xl font-bold text-amber-950">
                {metrics.changesRequestedByMe}
              </span>
              <p className="mt-1 text-xs text-amber-800">
                Returned to Creator with revision instructions
              </p>
            </div>
          </button>

          {/* Rejected by Me */}
          <button
            type="button"
            onClick={() =>
              setDecisionFilter(
                decisionFilter === 'REVIEWER_REJECTED' ? 'ALL' : 'REVIEWER_REJECTED'
              )
            }
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
              decisionFilter === 'REVIEWER_REJECTED'
                ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-900">
                Rejected by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <XCircle size={18} />
              </span>
            </div>
            <div className="mt-3">
              <span className="font-display text-3xl font-bold text-rose-950">
                {metrics.rejectedByMe}
              </span>
              <p className="mt-1 text-xs text-rose-800">
                Denied due to unresolvable brand discrepancies
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Search and Simple Filters */}
      <section
        aria-labelledby="reviewer-history-filters"
        className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3"
      >
        <h2 id="reviewer-history-filters" className="sr-only">
          Review History Filters
        </h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search by submission title or Creator name */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by submission title or Creator name…"
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

          {/* Simple Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Decision Type Filter */}
            <select
              aria-label="Filter by Decision Type"
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value as DecisionFilterOption)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Decisions</option>
              <option value="REVIEWER_APPROVED">Content Approved</option>
              <option value="REVIEWER_CHANGES_REQUESTED">Changes Requested</option>
              <option value="REVIEWER_REJECTED">Content Rejected</option>
            </select>

            {/* Date Range Filter */}
            <select
              aria-label="Filter by Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7_DAYS">Past 7 Days</option>
              <option value="30_DAYS">Past 30 Days</option>
            </select>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:bg-canvas hover:text-ink cursor-pointer"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-muted">
          <span>
            Showing <strong className="text-ink">{filteredDecisions.length}</strong> of{' '}
            <strong className="text-ink">{reviewerDecisions.length}</strong> completed review decisions
          </span>
          {hasActiveFilters && (
            <span className="text-[#0F766E] font-medium">Filtered results active</span>
          )}
        </div>
      </section>

      {/* 4. Review History Table */}
      <section
        aria-labelledby="history-table-heading"
        className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs"
      >
        <h2 id="history-table-heading" className="sr-only">
          Completed Review Decisions Table
        </h2>

        {auditQ.isLoading || submissionsQ.isLoading ? (
          <div className="p-12 text-center text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-2" />
            <p className="text-sm font-medium">Loading review history…</p>
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="p-12 text-center">
            <HistoryIcon size={32} className="mx-auto mb-3 text-muted/60" />
            <p className="font-semibold text-ink">No review history records found</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting or clearing your filters to see more review records.'
                : 'You have not recorded any review decisions yet.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-soft cursor-pointer"
              >
                <RotateCcw size={14} /> Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-3.5">Submission Title</th>
                  <th scope="col" className="px-4 py-3.5">Creator Name</th>
                  <th scope="col" className="px-4 py-3.5">Department</th>
                  <th scope="col" className="px-4 py-3.5">Review Decision</th>
                  <th scope="col" className="px-4 py-3.5">Review Date</th>
                  <th scope="col" className="px-4 py-3.5">Reviewer Comments</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredDecisions.map((entry) => {
                  const sub = entry.submissionId ? subMap.get(entry.submissionId) : null
                  const title = sub?.title ?? entry.resourceName ?? `Submission #${entry.submissionId?.slice(0, 8)}`
                  const creator = sub?.submittedByName ?? 'Creator'
                  const department = sub?.departmentName ?? entry.departmentName ?? 'Marketing'

                  return (
                    <tr key={entry.id} className="hover:bg-canvas/60 transition-colors">
                      {/* 1. Submission Title */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/review/${entry.submissionId}?mode=readonly`}
                            className="font-semibold text-xs text-ink hover:text-[#0F766E] transition line-clamp-1"
                          >
                            {title}
                          </Link>
                          {sub?.revisionNumber && sub.revisionNumber > 1 && (
                            <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-[10px] font-mono text-muted shrink-0">
                              r{sub.revisionNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Creator Name */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-800 font-medium">
                        {creator}
                      </td>

                      {/* 3. Department */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <span className="inline-block rounded-md border border-line bg-canvas px-2 py-0.5 text-slate-700 font-medium">
                          {department}
                        </span>
                      </td>

                      {/* 4. Review Decision */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {entry.action === 'REVIEWER_APPROVED' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-900">
                            <CheckCircle2 size={13} /> Content Approved
                          </span>
                        )}
                        {entry.action === 'REVIEWER_CHANGES_REQUESTED' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                            <RotateCcw size={13} /> Changes Requested
                          </span>
                        )}
                        {entry.action === 'REVIEWER_REJECTED' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-900">
                            <XCircle size={13} /> Content Rejected
                          </span>
                        )}
                      </td>

                      {/* 5. Review Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <p className="font-medium text-slate-800">{formatWhen(entry.createdAt)}</p>
                        <p className="font-mono text-[10px] text-muted">
                          {new Date(entry.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </td>

                      {/* 6. Reviewer Comments */}
                      <td className="px-4 py-4 max-w-sm">
                        {entry.comment ? (
                          <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed italic">
                            “{entry.comment}”
                          </p>
                        ) : (
                          <span className="text-xs text-muted italic">No comment provided</span>
                        )}
                      </td>

                      {/* 7. Actions (Inspect) */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/review/${entry.submissionId}?mode=readonly`}
                          className="inline-flex items-center gap-1 rounded-lg bg-canvas border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] transition shadow-2xs cursor-pointer"
                        >
                          Inspect <ArrowRight size={12} />
                        </Link>
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
