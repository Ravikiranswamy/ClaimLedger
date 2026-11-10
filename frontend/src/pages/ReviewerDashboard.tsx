import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { AuditEntry } from '../types'

export function ReviewerDashboard() {
  const { user } = useAuth()

  // Queries for actual backend-driven data
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const auditQ = useQuery({ queryKey: ['global-audit'], queryFn: api.listGlobalAudit })

  const submissions = submissionsQ.data ?? []
  const audits = auditQ.data ?? []

  // Check if an audit action was performed by this reviewer
  const isReviewerAction = useMemo(() => {
    const reviewerEmail = user?.email?.trim().toLowerCase()
    const reviewerName = user?.fullName?.trim().toLowerCase()

    return (a: AuditEntry) => {
      if (a.actorEmail && reviewerEmail && a.actorEmail.trim().toLowerCase() === reviewerEmail) {
        return true
      }
      if (a.actorName && reviewerName && a.actorName.trim().toLowerCase() === reviewerName) {
        return true
      }
      // Fallback for reviewer persona where actorRole is REVIEWER and no conflicting actorEmail
      if (!a.actorEmail && a.actorRole === 'REVIEWER') {
        return true
      }
      return false
    }
  }, [user])

  // Reviewer Personal Summary Metrics (Actual backend-driven data)
  const metrics = useMemo(() => {
    // 1. Pending Reviews: Submissions awaiting reviewer evaluation
    const pendingReviews = submissions.filter((s) =>
      ['FLAGGED', 'VERIFIED', 'IN_REVIEW'].includes(s.status)
    ).length

    // 2. Approved by Me
    const approvedByMe = audits.filter(
      (a) => a.action === 'REVIEWER_APPROVED' && isReviewerAction(a)
    ).length

    // 3. Changes Requested by Me
    const changesRequestedByMe = audits.filter(
      (a) => a.action === 'REVIEWER_CHANGES_REQUESTED' && isReviewerAction(a)
    ).length

    // 4. Rejected by Me
    const rejectedByMe = audits.filter(
      (a) => a.action === 'REVIEWER_REJECTED' && isReviewerAction(a)
    ).length

    return {
      pendingReviews,
      approvedByMe,
      changesRequestedByMe,
      rejectedByMe,
    }
  }, [submissions, audits, isReviewerAction])

  const firstName = user?.fullName?.split(' ')[0] ?? 'Reviewer'

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Welcome Banner (Role-Tailored for Authorised Reviewer) */}
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-xl md:p-10 border border-white/10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-soft px-3.5 py-1 text-xs font-semibold text-[#5EEAD4] border border-white/10">
            <ShieldCheck size={14} aria-hidden />
            <span>Authorised Reviewer Console</span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl text-white">
            Welcome back, {firstName}
          </h1>

          <p className="mt-2 text-base text-[#D6E3EF] md:text-lg leading-relaxed">
            As an Authorised Reviewer, you uphold corporate brand integrity by evaluating automated compliance
            findings, verifying evidence across multi-tier authority guidelines, and issuing final binding decisions.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-xl bg-[#5EEAD4] px-5 py-2.5 font-semibold text-[#0A1F36] shadow-sm transition hover:bg-[#4ddac4] cursor-pointer text-sm"
            >
              <FileCheck2 size={17} aria-hidden /> Open Review Queue
            </Link>
          </div>
        </div>

        {/* Ambient decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      </div>

      {/* 2. Reviewer Personal Summary Metrics (4 Metrics using actual backend data) */}
      <section aria-labelledby="reviewer-metrics-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="reviewer-metrics-heading" className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#0A1F36]" />
            Reviewer Summary Metrics
          </h2>
          <span className="text-xs text-muted">Personal review decisions & active queue count</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Pending Reviews */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Pending Reviews
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-amber-600">
              {metrics.pendingReviews}
            </p>
            <p className="mt-1 text-xs text-muted">
              Submissions awaiting your evaluation in the review queue
            </p>
            <div className="mt-3 pt-3 border-t border-line/60">
              <Link
                to="/review"
                className="text-xs font-semibold text-amber-700 hover:underline flex items-center gap-1"
              >
                Go to Review Queue <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* 2. Approved by Me */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Approved by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-emerald-600">
              {metrics.approvedByMe}
            </p>
            <p className="mt-1 text-xs text-muted">
              Submissions verified and cleared for corporate publication
            </p>
            <div className="mt-3 pt-3 border-t border-line/60">
              <Link
                to="/history"
                className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                View in History <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* 3. Changes Requested by Me */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Changes Requested by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <RotateCcw size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-orange-600">
              {metrics.changesRequestedByMe}
            </p>
            <p className="mt-1 text-xs text-muted">
              Returned to creator with specific feedback and revision instructions
            </p>
            <div className="mt-3 pt-3 border-t border-line/60">
              <Link
                to="/history"
                className="text-xs font-semibold text-orange-700 hover:underline flex items-center gap-1"
              >
                View in History <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* 4. Rejected by Me */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Rejected by Me
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={18} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-rose-600">
              {metrics.rejectedByMe}
            </p>
            <p className="mt-1 text-xs text-muted">
              Submissions denied due to brand violations or unresolvable claims
            </p>
            <div className="mt-3 pt-3 border-t border-line/60">
              <Link
                to="/history"
                className="text-xs font-semibold text-rose-700 hover:underline flex items-center gap-1"
              >
                View in History <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Strict Section Separation: Navigation & Responsibilities Overview */}
      <section aria-labelledby="workflow-overview-heading" className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
        <div>
          <h2 id="workflow-overview-heading" className="font-display text-xl font-bold text-[#0A1F36]">
            Workspace Responsibilities & Navigation
          </h2>
          <p className="mt-1 text-sm text-muted">
            ClaimLedger maintains strict role boundaries. Dedicated sidebar sections contain specific review actions and historical audit logs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card 1: Review Queue */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-canvas p-5 transition hover:border-[#0F766E]/50">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200">
                  <FileCheck2 size={16} />
                </span>
                <h3 className="font-display font-bold text-base text-ink">
                  Review Queue
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Inspect pending content submissions, evaluate claims against Tier 1–3 master documents, review deterministic AI evidence findings, and record binding decisions (Approve, Request Changes, or Reject).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line">
              <Link
                to="/review"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
              >
                Open Review Queue ({metrics.pendingReviews} waiting) <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: History & Audit */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-canvas p-5 transition hover:border-[#0F766E]/50">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <History size={16} />
                </span>
                <h3 className="font-display font-bold text-base text-ink">
                  Activity & History Ledger
                </h3>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Access the immutable chronological log of all previously completed reviews, reviewer feedback comments, submission revisions, and governance decisions with complete audit trail integrity.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-line">
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
              >
                View Full Audit History →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
