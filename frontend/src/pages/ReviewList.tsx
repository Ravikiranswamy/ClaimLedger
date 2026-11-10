import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { PageHeader } from '../components/PageHeader'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'

// Submissions awaiting this Reviewer's human decision:
// FLAGGED: Has AI-flagged violations, unverified claims, or conflicts needing reviewer resolution.
// VERIFIED: All claims passed automated checks, but still strictly requires binding human approval.
// IN_REVIEW: Active review workflow in progress.
// (Excludes CHANGES_REQUESTED which is waiting for Creator revisions; returns once resubmitted).
const PENDING_DECISION_STATUSES = ['FLAGGED', 'VERIFIED', 'IN_REVIEW']

export function ReviewList() {
  const [tab, setTab] = useState<'attention' | 'all'>('attention')
  const { user } = useAuth()

  const q = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const allSubmissions = q.data ?? []

  // Scope submissions to logged-in Reviewer's authorised scope
  const assignedSubmissions = useMemo(() => {
    if (user?.role === 'REVIEWER' && user.departmentId) {
      return allSubmissions.filter((s) => !s.departmentId || s.departmentId === user.departmentId)
    }
    return allSubmissions
  }, [allSubmissions, user])

  // Needs Your Decision queue (strictly pending reviewer decision)
  const pendingDecisionSubmissions = useMemo(() => {
    return assignedSubmissions.filter((s) => PENDING_DECISION_STATUSES.includes(s.status))
  }, [assignedSubmissions])

  const rows = tab === 'attention' ? pendingDecisionSubmissions : assignedSubmissions

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Open an item to see each claim, its evidence, and decide."
      />

      {/* Primary Tabs */}
      <div role="tablist" aria-label="Review Queue Filter" className="mb-5 flex flex-wrap gap-2">
        <button
          key="attention"
          role="tab"
          aria-selected={tab === 'attention'}
          onClick={() => setTab('attention')}
          className={`rounded-xl px-4 py-2 font-semibold text-sm transition cursor-pointer flex items-center gap-2 ${
            tab === 'attention'
              ? 'bg-navy text-white shadow-xs'
              : 'border border-line bg-surface text-ink hover:bg-canvas'
          }`}
        >
          <span>Needs Your Decision</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              tab === 'attention'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            {pendingDecisionSubmissions.length}
          </span>
        </button>

        <button
          key="all"
          role="tab"
          aria-selected={tab === 'all'}
          onClick={() => setTab('all')}
          className={`rounded-xl px-4 py-2 font-semibold text-sm transition cursor-pointer flex items-center gap-2 ${
            tab === 'all'
              ? 'bg-navy text-white shadow-xs'
              : 'border border-line bg-surface text-ink hover:bg-canvas'
          }`}
        >
          <span>All Assigned Reviews</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              tab === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {assignedSubmissions.length}
          </span>
        </button>
      </div>

      {q.isLoading && <p className="text-lg text-muted py-6" role="status">Loading submissions…</p>}

      {q.isError && (
        <p role="alert" className="rounded-2xl bg-violation-soft p-5 text-violation mb-4">
          We couldn’t load submissions. Please refresh and try again.
        </p>
      )}

      {q.isSuccess && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center space-y-1">
          {tab === 'attention' ? (
            <>
              <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-ink text-base">Nothing waiting. You’re all caught up.</p>
              <p className="text-xs text-muted max-w-md mx-auto">
                All submissions have been reviewed or are awaiting Creator revision.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-ink text-base">No assigned submissions found</p>
              <p className="text-xs text-muted max-w-md mx-auto">
                There are no submissions within your authorised review scope.
              </p>
            </>
          )}
        </div>
      )}

      {/* Submissions List */}
      <ul className="space-y-3 pb-12">
        {rows.map((s) => {
          const totalClaims = s.claims.length
          const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
          const violationCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
          const conflictCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length
          const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
          const openFindings = totalClaims - verifiedCount

          return (
            <li
              key={s.id}
              className="rounded-2xl border border-line bg-surface p-5 hover:border-brand transition shadow-xs"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  {/* Title & Revision */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/review/${s.id}`}
                      className="font-display text-lg font-bold text-ink hover:text-brand transition truncate"
                    >
                      {s.title}
                    </Link>
                    {s.revisionNumber > 1 && (
                      <span className="rounded bg-canvas border border-line px-1.5 py-0.5 text-[11px] font-mono text-muted shrink-0">
                        r{s.revisionNumber}
                      </span>
                    )}
                  </div>

                  {/* Creator, Department, Submission Date */}
                  <p className="text-xs text-muted flex flex-wrap items-center gap-2">
                    <span>
                      Creator: <strong className="text-slate-800">{s.submittedByName ?? 'Creator'}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Department: <strong className="text-slate-800">{s.departmentName ?? 'Marketing'}</strong>
                    </span>
                    <span>·</span>
                    <span>{formatWhen(s.createdAt)}</span>
                  </p>

                  {/* Claim Findings Summary */}
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                    {totalClaims === 0 ? (
                      <span className="text-muted italic">No extracted claims</span>
                    ) : (
                      <>
                        <span className="text-xs text-muted font-medium">Claim Findings:</span>
                        {verifiedCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 text-[11px]">
                            <CheckCircle2 size={12} /> {verifiedCount} Verified
                          </span>
                        )}
                        {violationCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 font-bold text-rose-800 text-[11px]">
                            <AlertCircle size={12} /> {violationCount} Violation{violationCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {conflictCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 font-bold text-purple-800 text-[11px]">
                            <AlertCircle size={12} /> {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {unverifiedCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 text-[11px]">
                            <Clock size={12} /> {unverifiedCount} Unverified
                          </span>
                        )}
                        {openFindings === 0 && totalClaims > 0 && (
                          <span className="text-emerald-700 font-medium text-xs">
                            (All claims verified · awaiting human approval)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Workflow Status & Open Review Action */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <SubmissionStatusChip status={s.status} />
                  <Link
                    to={`/review/${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-strong transition cursor-pointer"
                  >
                    Open Review <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
