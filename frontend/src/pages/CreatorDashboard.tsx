import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileEdit,
  Lightbulb,
  MessageSquare,
  PenSquare,
  PlusCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Wand2,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { StatusPill } from '../components/StatusPill'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'

export function CreatorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Data queries
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const auditQ = useQuery({ queryKey: ['audit-global'], queryFn: api.listGlobalAudit })

  const rawSubmissions = submissionsQ.data ?? []
  const audits = auditQ.data ?? []

  // Creator's personal submissions
  const submissions = useMemo(() => {
    if (user?.role === 'CREATOR') {
      return rawSubmissions.filter((s) => !s.submittedBy || s.submittedBy === user.id)
    }
    return rawSubmissions
  }, [rawSubmissions, user])

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = user?.fullName?.split(' ')[0] ?? 'Creator'

  // Personal Content Metrics calculated strictly from authenticated Creator's submissions
  const draftsCount = useMemo(() => submissions.filter((s) => s.status === 'DRAFT').length, [submissions])
  const awaitingReviewCount = useMemo(
    () => submissions.filter((s) => ['IN_REVIEW', 'ANALYZING', 'FLAGGED', 'VERIFIED'].includes(s.status)).length,
    [submissions]
  )
  const changesRequestedCount = useMemo(
    () => submissions.filter((s) => s.status === 'CHANGES_REQUESTED').length,
    [submissions]
  )
  const approvedCount = useMemo(() => submissions.filter((s) => s.status === 'APPROVED').length, [submissions])

  // Needs Your Attention items (Changes Requested priority)
  const attentionItems = useMemo(
    () => submissions.filter((s) => s.status === 'CHANGES_REQUESTED'),
    [submissions]
  )

  // Map of latest reviewer comment per submission from personal audit log
  const reviewerCommentMap = useMemo(() => {
    const map = new Map<string, { comment: string; reviewer: string; date: string }>()
    for (const a of audits) {
      if (a.submissionId && a.action === 'REVIEWER_CHANGES_REQUESTED' && !map.has(a.submissionId)) {
        map.set(a.submissionId, {
          comment: a.comment || 'Reviewer requested changes to address flagged claim discrepancies.',
          reviewer: a.actorName || 'Authorised Reviewer',
          date: a.createdAt,
        })
      }
    }
    return map
  }, [audits])

  // Recent Activity Event Metadata Mapper
  const getActivityMeta = (a: { action: string; comment?: string | null }) => {
    switch (a.action) {
      case 'SUBMITTED':
        return {
          title: 'New Submission Created',
          badgeClass: 'bg-blue-50 text-blue-700',
          icon: Send,
        }
      case 'ANALYZED': {
        const lower = (a.comment || '').toLowerCase()
        if (lower.includes('claim verification') || (lower.includes('verified') && !lower.includes('analysis'))) {
          return {
            title: 'Claim Verification Completed',
            badgeClass: 'bg-teal-50 text-teal-700',
            icon: ShieldCheck,
          }
        }
        return {
          title: 'Compliance Analysis Completed',
          badgeClass: 'bg-indigo-50 text-indigo-700',
          icon: Sparkles,
        }
      }
      case 'CREATOR_REVISED':
        return {
          title: 'Submitted Revision',
          badgeClass: 'bg-purple-50 text-purple-700',
          icon: Wand2,
        }
      case 'REVIEWER_APPROVED':
        return {
          title: 'Reviewer Approved Content',
          badgeClass: 'bg-emerald-50 text-emerald-700',
          icon: CheckCircle2,
        }
      case 'REVIEWER_CHANGES_REQUESTED':
        return {
          title: 'Reviewer Requested Changes',
          badgeClass: 'bg-amber-50 text-amber-700',
          icon: AlertCircle,
        }
      case 'REVIEWER_REJECTED':
        return {
          title: 'Reviewer Rejected Content',
          badgeClass: 'bg-rose-50 text-rose-700',
          icon: XCircle,
        }
      case 'KNOWLEDGE_UPLOADED':
        return {
          title: 'Knowledge Document Uploaded',
          badgeClass: 'bg-slate-100 text-slate-700',
          icon: BookOpen,
        }
      case 'KNOWLEDGE_APPROVED':
        return {
          title: 'Knowledge Document Approved',
          badgeClass: 'bg-emerald-50 text-emerald-700',
          icon: CheckCircle2,
        }
      default:
        return {
          title: 'Activity Logged',
          badgeClass: 'bg-slate-100 text-slate-700',
          icon: Clock,
        }
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Welcome Banner */}
      <section
        aria-label="Creator Welcome"
        className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-xl md:p-10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-soft px-3.5 py-1 text-sm font-semibold text-[#5EEAD4]">
            <PenSquare size={16} aria-hidden />
            <span>Content Creator Workspace</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {greeting}, {firstName}.
          </h1>
          <p className="mt-2 text-xl font-medium text-[#5EEAD4]">
            Create with confidence. Publish with consistency.
          </p>
          <p className="mt-2 text-base text-[#D6E3EF] leading-relaxed">
            Check your content against approved brand guidelines and facts before publication.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Create Content shortcut */}
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-strong shadow-md"
            >
              <PlusCircle size={18} aria-hidden /> Create Content
            </Link>
            {/* Browse Guidelines shortcut */}
            <Link
              to="/guidelines"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10"
            >
              <BookOpen size={18} aria-hidden /> Browse Guidelines
            </Link>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#5EEAD4]/15 blur-3xl" />
      </section>

      {/* 2. Personal Submission Metrics */}
      <section aria-labelledby="metrics-h">
        <h2 id="metrics-h" className="sr-only">
          Personal Content Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Drafts */}
          <button
            type="button"
            onClick={() => navigate('/my-content?status=DRAFT')}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 text-left transition shadow-xs hover:border-brand hover:bg-brand-soft/10 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Drafts</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileEdit size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink">{draftsCount}</p>
            <p className="mt-1 text-xs text-muted">Unsubmitted or work-in-progress →</p>
          </button>

          {/* Awaiting Review */}
          <button
            type="button"
            onClick={() => navigate('/my-content?status=IN_REVIEW')}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 text-left transition shadow-xs hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Awaiting Review</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-unverified">
                <Clock size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-amber-900">{awaitingReviewCount}</p>
            <p className="mt-1 text-xs text-muted">In reviewer queue for verification →</p>
          </button>

          {/* Changes Requested */}
          <button
            type="button"
            onClick={() => navigate('/my-content?status=CHANGES_REQUESTED')}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 text-left transition shadow-xs hover:border-conflict hover:bg-conflict-soft/20 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Changes Requested</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-conflict-soft text-conflict">
                <AlertCircle size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-conflict">{changesRequestedCount}</p>
            <p className="mt-1 text-xs text-muted">Revisions requested before approval →</p>
          </button>

          {/* Approved */}
          <button
            type="button"
            onClick={() => navigate('/my-content?status=APPROVED')}
            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 text-left transition shadow-xs hover:border-verified hover:bg-verified-soft/20 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Approved</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-verified-soft text-verified">
                <CheckCircle2 size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-verified">{approvedCount}</p>
            <p className="mt-1 text-xs text-muted">Cleared for official publishing →</p>
          </button>
        </div>
      </section>

      {/* 3. Needs Your Attention Section */}
      <section aria-labelledby="attention-h" className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-conflict-soft text-conflict">
                <AlertCircle size={18} />
              </span>
              <h2 id="attention-h" className="font-display text-2xl font-bold text-ink">
                Needs Your Attention
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Submissions where reviewers have requested revisions before publishing can proceed.
            </p>
          </div>
          {attentionItems.length > 0 && (
            <span className="rounded-full bg-conflict-soft px-3 py-1 text-xs font-bold text-conflict">
              {attentionItems.length} action item{attentionItems.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {submissionsQ.isLoading && <p className="py-6 text-center text-muted">Loading attention items…</p>}

        {submissionsQ.isSuccess && attentionItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-verified" />
            <h3 className="mt-3 font-display font-bold text-lg text-ink">You’re completely caught up!</h3>
            <p className="mt-1 text-sm text-muted max-w-md mx-auto">
              None of your submissions currently require revision. You can create a new piece of content or browse your existing submissions.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                <PlusCircle size={16} /> Create Content
              </Link>
              <Link
                to="/my-content"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
              >
                View My Content
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {attentionItems.map((s) => {
            const auditComment = reviewerCommentMap.get(s.id)
            const flaggedClaims = s.claims.filter((c) => c.verificationStatus !== 'VERIFIED')

            return (
              <div
                key={s.id}
                className="rounded-2xl border-2 border-conflict/30 bg-conflict-soft/10 p-5 shadow-xs transition hover:border-conflict/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-lg text-ink">{s.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {s.departmentName ?? 'General'} · Revision {s.revisionNumber} · Updated {formatWhen(s.updatedAt ?? s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SubmissionStatusChip status={s.status} />
                  </div>
                </div>

                {/* Reviewer Comment */}
                <div className="mt-4 rounded-xl border border-conflict/20 bg-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-conflict">
                    <MessageSquare size={14} />
                    <span>Reviewer Feedback · {auditComment?.reviewer ?? 'Authorised Reviewer'}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink italic leading-relaxed">
                    “{auditComment?.comment ?? 'Please address the highlighted claims and resubmit for approval.'}”
                  </p>
                </div>

                {/* Flagged Claim Findings */}
                {flaggedClaims.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Relevant Claim Findings ({flaggedClaims.length})
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {flaggedClaims.slice(0, 2).map((c) => (
                        <div key={c.id} className="rounded-xl border border-line bg-surface p-3 text-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <StatusPill state={c.verificationStatus} />
                            {c.suggestedCorrection && (
                              <span className="flex items-center gap-1 font-semibold text-brand text-[11px]">
                                <Lightbulb size={12} /> Fix available
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-ink line-clamp-2">“{c.claimText}”</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Strip */}
                <div className="mt-5 flex items-center justify-between border-t border-conflict/20 pt-3">
                  <span className="text-xs text-muted">
                    Revision will be re-analyzed automatically by deterministic brand hierarchy.
                  </span>
                  <Link
                    to={`/submissions/${s.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-strong"
                  >
                    <Wand2 size={16} /> Open and Revise
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Recent Activity Section */}
      <section aria-labelledby="activity-h" className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-soft text-navy">
                <Clock size={18} />
              </span>
              <h2 id="activity-h" className="font-display text-2xl font-bold text-ink">
                Recent Activity
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Chronological log of your personal submissions, revisions, reviewer decisions, and comments.
            </p>
          </div>
          <Link to="/history" className="text-xs font-bold text-brand hover:underline">
            View full activity ledger →
          </Link>
        </div>

        {auditQ.isLoading && <p className="py-6 text-center text-muted">Loading your activity history…</p>}

        {auditQ.isSuccess && audits.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">No recent activity recorded yet.</p>
        )}

        <div className="space-y-3">
          {audits.slice(0, 5).map((a) => {
            const meta = getActivityMeta(a)
            const Icon = meta.icon

            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3.5 transition hover:bg-surface"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.badgeClass}`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {meta.title}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {a.comment ? `“${a.comment}” · ` : ''}By {a.actorName} ({a.actorRole ?? 'User'})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted whitespace-nowrap">{formatWhen(a.createdAt)}</span>
                  {a.submissionId && (
                    <Link
                      to={`/submissions/${a.submissionId}`}
                      className="text-xs font-bold text-brand hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
