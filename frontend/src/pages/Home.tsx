import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  FileText,
  History,
  Layers,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { ROLE_LABEL } from '../types'
import { CreatorDashboard } from './CreatorDashboard'

export function Home() {
  const { user } = useAuth()
  const [demoGuideOpen, setDemoGuideOpen] = useState(false)

  // Content Creator Dashboard is strictly scoped to the creator persona
  if (user?.role === 'CREATOR') {
    return <CreatorDashboard />
  }

  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const documentsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })
  const auditQ = useQuery({ queryKey: ['global-audit'], queryFn: api.listGlobalAudit })

  const submissions = submissionsQ.data ?? []
  const documents = documentsQ.data ?? []
  const audits = auditQ.data ?? []

  // Group 1: Content Governance Metrics
  const totalSubmissions = submissions.length
  const awaitingReview = submissions.filter((s) => ['FLAGGED', 'IN_REVIEW'].includes(s.status)).length
  const changesRequested = submissions.filter((s) => s.status === 'CHANGES_REQUESTED').length
  const approvedContent = submissions.filter((s) => s.status === 'APPROVED').length

  // Group 2: Knowledge Governance Metrics
  const now = new Date()
  const approvedSources = documents.filter(
    (d) => d.approvalStatus === 'APPROVED' && (!d.expiryDate || new Date(d.expiryDate) >= now)
  ).length
  const pendingDocApprovals = documents.filter((d) => d.approvalStatus === 'DRAFT').length

  const myActionItems = submissions.filter((s) => ['FLAGGED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(s.status))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-xl md:p-10 border border-white/10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-soft px-3.5 py-1 text-xs font-semibold text-[#5EEAD4] border border-white/10">
            <ShieldCheck size={14} aria-hidden />
            <span>{user ? ROLE_LABEL[user.role] : 'Member'} Console</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Welcome back, {user?.fullName?.split(' ')[0] ?? 'Governance Leader'}
          </h1>
          <p className="mt-2 text-base text-[#D6E3EF] md:text-lg leading-relaxed">
            ClaimLedger enforces organisational brand consistency through deterministic authority hierarchies. Every
            claim is verified against approved master knowledge sources to eliminate brand drift.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={user?.role === 'ADMIN' ? '/admin/submissions' : '/review'}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5EEAD4] px-5 py-2.5 font-semibold text-[#0A1F36] shadow-sm transition hover:bg-[#4ddac4] cursor-pointer text-sm"
            >
              <FileCheck2 size={17} aria-hidden /> View Submissions
            </Link>

            <Link
              to="/knowledge-base"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/20 border border-white/15 text-sm"
            >
              <BookOpen size={17} aria-hidden /> Knowledge Base
            </Link>

            {user?.role === 'ADMIN' && (
              <Link
                to="/admin/approvals"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10 text-sm"
              >
                <Layers size={17} aria-hidden /> Document Approvals ({pendingDocApprovals})
              </Link>
            )}
          </div>
        </div>

        {/* Ambient decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      </div>

      {/* 2. Compact Collapsible Demo Guide (formerly Judge Quickstart) */}
      <section className="rounded-2xl border border-brand/25 bg-gradient-to-r from-brand-soft/30 via-white to-canvas p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">
              ★
            </span>
            <div>
              <h2 className="font-display font-bold text-sm text-ink">
                Quickstart Demo Guide — Test the Full Workflow in 60 Seconds
              </h2>
              <p className="text-xs text-muted">
                Step-by-step walkthrough of automated ingestion, deterministic checks, and human sign-off
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex text-[11px] font-semibold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full">
              Inkloom AI Challenge
            </span>
            <button
              type="button"
              onClick={() => setDemoGuideOpen(!demoGuideOpen)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold text-ink hover:bg-canvas transition cursor-pointer"
              aria-expanded={demoGuideOpen}
            >
              {demoGuideOpen ? 'Collapse' : 'Expand Guide'}
              {demoGuideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {demoGuideOpen && (
          <div className="mt-4 pt-4 border-t border-brand/15 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <Link
              to="/submit"
              className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs"
            >
              <span className="text-xs font-bold text-brand">STEP 1</span>
              <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">1-Click Submission</p>
              <p className="mt-0.5 text-xs text-muted">
                Use Scenario 1 to test an outdated ₹799 price claim against master documents.
              </p>
            </Link>

            <Link
              to="/review"
              className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs"
            >
              <span className="text-xs font-bold text-brand">STEP 2</span>
              <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">Deterministic Engine</p>
              <p className="mt-0.5 text-xs text-muted">
                Watch the pure Java engine flag a VIOLATION against the Tier 1 catalogue.
              </p>
            </Link>

            <Link
              to="/review"
              className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs"
            >
              <span className="text-xs font-bold text-brand">STEP 3</span>
              <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">Creator Fix & Resubmit</p>
              <p className="mt-0.5 text-xs text-muted">
                Creators revise and resubmit content, while final approval remains with an authorised reviewer.
              </p>
            </Link>

            <Link
              to="/knowledge-base"
              className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs"
            >
              <span className="text-xs font-bold text-brand">STEP 4</span>
              <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">Vector Chunk Inspector</p>
              <p className="mt-0.5 text-xs text-muted">Inspect real 768-dim embeddings in Neon pgvector.</p>
            </Link>
          </div>
        )}
      </section>

      {/* 3. Governance Metrics (Organised into 2 Groups) */}
      <div className="space-y-6">
        {/* Group A: Content Governance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <FileText size={14} className="text-[#0A1F36]" />
              Content Governance Metrics
            </h2>
            <span className="text-xs text-muted">Live organisational submission pipeline</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Submissions</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={18} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-[#0A1F36]">{totalSubmissions}</p>
              <p className="mt-1 text-xs text-muted">All active submissions across departments</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Awaiting Review</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock size={18} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-amber-600">{awaitingReview}</p>
              <p className="mt-1 text-xs text-muted">In review queue or flagged for check</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Changes Requested</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <RotateCcw size={18} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-orange-600">{changesRequested}</p>
              <p className="mt-1 text-xs text-muted">Returned to creator with reviewer notes</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Approved Content</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-emerald-600">{approvedContent}</p>
              <p className="mt-1 text-xs text-muted">Validated and cleared for publication</p>
            </div>
          </div>
        </div>

        {/* Group B: Knowledge Governance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#0A1F36]" />
              Knowledge Governance Metrics
            </h2>
            <span className="text-xs text-muted">Approved master catalogues & authority lifecycle</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Approved & Current Sources
                  </span>
                  <p className="mt-1 text-xs text-muted">Active Tier 1, 2, and 3 master documents within validity</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <ShieldCheck size={20} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-emerald-600">{approvedSources}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Grounding deterministic verification in Neon pgvector</span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Pending Document Approvals
                  </span>
                  <p className="mt-1 text-xs text-muted">Knowledge uploads awaiting Admin or Approver decision</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <Layers size={20} />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-purple-600">{pendingDocApprovals}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Link
                  to="/admin/approvals"
                  className="font-semibold text-navy hover:underline flex items-center gap-1"
                >
                  Open Approval Queue <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Decision Inbox & Engine Core */}
      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        {/* Main Inbox */}
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0A1F36]">Decision Inbox</h2>
              <p className="text-sm text-muted">
                {myActionItems.length === 0
                  ? 'All clear! No pending decisions require immediate attention.'
                  : `${myActionItems.length} submission(s) currently requiring attention.`}
              </p>
            </div>
            <Link
              to={user?.role === 'ADMIN' ? '/admin/submissions' : '/review'}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>

          {submissionsQ.isLoading && <p className="py-6 text-center text-muted">Loading inbox…</p>}

          {submissionsQ.isSuccess && myActionItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-line bg-canvas p-8 text-center">
              <CheckCircle2 size={36} className="mx-auto text-verified" />
              <p className="mt-2 font-semibold">You’re completely caught up</p>
              <p className="text-sm text-muted">No unresolved claims or actions are pending right now.</p>
            </div>
          )}

          <div className="space-y-3">
            {myActionItems.slice(0, 5).map((s) => {
              const violations = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
              const detailUrl = user?.role === 'ADMIN' ? `/admin/submissions/${s.id}` : `/review/${s.id}`

              return (
                <Link
                  key={s.id}
                  to={detailUrl}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 transition hover:border-brand hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink group-hover:text-brand">{s.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {s.departmentName ?? 'General'} · Submitted by {s.submittedByName} · {formatWhen(s.createdAt)}
                    </p>
                    {violations > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-violation">
                        <AlertCircle size={14} /> {violations} claim violation(s) detected against Tier 1 catalogue
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <SubmissionStatusChip status={s.status} />
                    <ArrowRight size={18} className="text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Side Panel: Engine Core & Activity */}
        <div className="space-y-6">
          {/* 6. Deterministic Authority Engine (Refined with accurate 6-step Java resolution) */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-soft/40 to-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles size={20} />
              <h3 className="font-display font-bold text-[#0A1F36]">Deterministic Authority Engine</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              ClaimLedger implements a strict <strong>6-Step Pure Java Authority Resolution Hierarchy</strong> before
              rendering compliance verdicts:
            </p>

            <ul className="mt-3 space-y-2.5 text-xs text-ink">
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">1. Approval Status:</span>
                <span>Only approved documents establish authoritative truth (drafts & rejected sources excluded).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">2. Temporal Validity:</span>
                <span>Evaluates effective and expiry dates. Expired documents are strictly distinguished from superseded ones.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">3. Scope Applicability:</span>
                <span>Matches department, product, region, and channel before ranking. Authorised departmental exceptions apply within scope.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">4. Authority Tier Hierarchy:</span>
                <span>Ranks candidates (Tier 1 Master &gt; Tier 2 Departmental &gt; Tier 3 Collateral).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">5. Version Resolution:</span>
                <span>Among same-tier documents, selects the highest applicable semantic version.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand shrink-0">6. Contradiction Detection:</span>
                <span>Performs explicit numeric/arithmetic matching; flags conflicting authoritative rules as CONFLICT.</span>
              </li>
            </ul>

            <div className="mt-4 border-t border-line pt-3">
              <Link to="/knowledge-base" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                Explore Knowledge Base Tiers <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Recent Submissions */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-[#0A1F36]">Recent Submissions</h3>
              <Link
                to={user?.role === 'ADMIN' ? '/admin/submissions' : '/review'}
                className="text-xs font-semibold text-brand hover:underline"
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-line text-xs">
              {submissions.slice(0, 3).map((s) => (
                <li key={s.id} className="py-2.5">
                  <Link
                    to={user?.role === 'ADMIN' ? `/admin/submissions/${s.id}` : `/review/${s.id}`}
                    className="block group"
                  >
                    <p className="truncate font-medium text-ink group-hover:text-brand">{s.title}</p>
                    <div className="mt-0.5 flex items-center justify-between text-muted">
                      <span>{s.submittedByName} ({s.departmentName ?? 'General'})</span>
                      <span>{formatWhen(s.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 5. Recent Governance Activity (Audit records) */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-[#0A1F36] flex items-center gap-1.5">
                <History size={15} className="text-brand" />
                Recent Governance Activity
              </h3>
              <Link to="/history" className="text-xs font-semibold text-brand hover:underline">
                Audit Ledger
              </Link>
            </div>

            {auditQ.isLoading && <p className="text-xs text-muted py-2">Loading audit trail…</p>}

            {audits.length > 0 ? (
              <ul className="divide-y divide-line text-xs">
                {audits.slice(0, 3).map((a) => (
                  <li key={a.id} className="py-2.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0A1F36]">{a.actorName}</span>
                      <span className="text-[10px] text-muted">{formatWhen(a.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-[#475569] truncate">
                      {a.comment ?? a.action.replace(/_/g, ' ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted py-2">No recent governance events recorded.</p>
            )}

            <Link
              to="/history"
              className="block pt-2 text-xs font-bold text-brand hover:underline text-center border-t border-line"
            >
              View Full Audit Ledger →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
