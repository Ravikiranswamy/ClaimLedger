import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { ROLE_LABEL } from '../types'

export function Home() {
  const { user } = useAuth()
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const documentsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })

  const submissions = submissionsQ.data ?? []
  const documents = documentsQ.data ?? []

  // Computed metrics
  const totalSubmissions = submissions.length
  const pendingReview = submissions.filter((s) => ['FLAGGED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(s.status)).length
  const totalViolations = submissions.reduce(
    (acc, s) => acc + s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length,
    0
  )
  const approvedDocs = documents.filter((d) => d.approvalStatus === 'APPROVED').length

  const myActionItems =
    user?.role === 'CREATOR'
      ? submissions.filter((s) => ['FLAGGED', 'CHANGES_REQUESTED'].includes(s.status))
      : submissions.filter((s) => ['FLAGGED', 'VERIFIED', 'IN_REVIEW'].includes(s.status))

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-xl md:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-navy-soft px-3.5 py-1 text-sm font-semibold text-[#5EEAD4]">
            <ShieldCheck size={16} aria-hidden />
            <span>{user ? ROLE_LABEL[user.role] : 'Member'} Console</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Welcome back, {user?.fullName?.split(' ')[0] ?? 'Governance Leader'}
          </h1>
          <p className="mt-2 text-base text-[#D6E3EF] md:text-lg">
            ClaimLedger guarantees organisational brand truth through deterministic authority hierarchies. Every claim is verified against your master knowledge sources.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user?.role === 'CREATOR' || user?.role === 'ADMIN' ? (
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-strong"
              >
                <PlusCircle size={18} aria-hidden /> Check New Content
              </Link>
            ) : null}
            {user?.role === 'REVIEWER' || user?.role === 'DEPT_MANAGER' || user?.role === 'ADMIN' ? (
              <Link
                to="/review"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <FileCheck2 size={18} aria-hidden /> Review Queue ({pendingReview})
              </Link>
            ) : null}
            <Link
              to="/knowledge-base"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10"
            >
              <BookOpen size={18} aria-hidden /> Master Catalogues
            </Link>
          </div>
        </div>

        {/* Ambient decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      </div>

      {/* 60-Second Judge Interactive Guide */}
      <section className="rounded-2xl border border-brand/30 bg-gradient-to-r from-brand-soft/40 via-white to-canvas p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">★</span>
            <h2 className="font-display font-bold text-base text-ink">Judge Quickstart — Test the Full Workflow in 60 Seconds</h2>
          </div>
          <span className="text-xs font-semibold text-brand bg-brand-soft px-2.5 py-1 rounded-full">Inkloom AI Challenge</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/submit" className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs">
            <span className="text-xs font-bold text-brand">STEP 1</span>
            <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">1-Click Submission</p>
            <p className="mt-0.5 text-xs text-muted">Use Scenario 1 to test an outdated ₹799 price claim.</p>
          </Link>

          <Link to="/review" className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs">
            <span className="text-xs font-bold text-brand">STEP 2</span>
            <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">Deterministic Engine</p>
            <p className="mt-0.5 text-xs text-muted">Watch pure Java engine flag a VIOLATION against Tier 1 catalogue.</p>
          </Link>

          <Link to="/review" className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs">
            <span className="text-xs font-bold text-brand">STEP 3</span>
            <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">1-Click Fix & Resubmit</p>
            <p className="mt-0.5 text-xs text-muted">Auto-correct to ₹999, bump revision, and approve the submission.</p>
          </Link>

          <Link to="/knowledge-base" className="group rounded-xl border border-line bg-surface p-3.5 transition hover:border-brand hover:shadow-xs">
            <span className="text-xs font-bold text-brand">STEP 4</span>
            <p className="mt-1 font-semibold text-sm text-ink group-hover:text-brand">Vector Chunk Inspector</p>
            <p className="mt-0.5 text-xs text-muted">Inspect real 768-dim embeddings in Neon pgvector.</p>
          </Link>
        </div>
      </section>

      {/* 4 KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Submissions Processed</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileText size={20} />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{totalSubmissions}</p>
          <p className="mt-1 text-xs text-muted">Full-lifecycle verified content</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Pending Decisions</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-unverified">
              <Clock size={20} />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold">{pendingReview}</p>
          <p className="mt-1 text-xs text-muted">Awaiting reviewer or creator revision</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Violations Intercepted</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violation-soft text-violation">
              <ShieldAlert size={20} />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-violation">{totalViolations}</p>
          <p className="mt-1 text-xs text-muted">Pre-publication discrepancies caught</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Authoritative Sources</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-verified-soft text-verified">
              <ShieldCheck size={20} />
            </span>
          </div>
          <p className="mt-3 font-display text-3xl font-bold text-verified">{approvedDocs}</p>
          <p className="mt-1 text-xs text-muted">Indexed across Tier 1, 2, and 3 pgvector</p>
        </div>
      </div>

      {/* Decision Station & Action Queue */}
      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        {/* Main Inbox */}
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-xl font-bold">
                {user?.role === 'CREATOR' ? 'Submissions Needing Your Revision' : 'Decision Inbox'}
              </h2>
              <p className="text-sm text-muted">
                {myActionItems.length === 0
                  ? 'All clear! No pending decisions require your immediate attention.'
                  : `${myActionItems.length} item(s) currently requiring attention.`}
              </p>
            </div>
            <Link
              to="/review"
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
              return (
                <Link
                  key={s.id}
                  to={`/review/${s.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 transition hover:border-brand hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink group-hover:text-brand">{s.title}</p>
                    <p className="text-sm text-muted">
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

        {/* Side Panel: Engine Core Differentiator & Quick Guides */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-soft/40 to-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles size={20} />
              <h3 className="font-display font-bold">Deterministic Authority Engine</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Unlike generic LLM wrappers, ClaimLedger implements a strict <strong>6-Step Pure Java Resolution Hierarchy</strong>.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-ink">
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand">1. Status Rule:</span> Non-approved sources immediately rejected.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand">2. Temporal Rule:</span> Expired documents are superseded.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand">3. Scope Rule:</span> Matching products and departmental jurisdictions.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand">4. Tier Hierarchy:</span> Tier 1 Master overrides Tier 2 & Tier 3.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-brand">5. Numeric Fact:</span> Explicit price/currency arithmetic matching.
              </li>
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <Link to="/knowledge-base" className="text-xs font-bold text-brand hover:underline">
                Explore Knowledge Base Tiers →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h3 className="font-display font-bold">Recent Submissions</h3>
            <ul className="mt-3 divide-y divide-line text-sm">
              {submissions.slice(0, 3).map((s) => (
                <li key={s.id} className="py-2.5">
                  <Link to={`/review/${s.id}`} className="block hover:text-brand">
                    <p className="truncate font-medium">{s.title}</p>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-muted">
                      <span>{s.submittedByName}</span>
                      <span>{formatWhen(s.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/history" className="mt-3 block text-xs font-semibold text-brand hover:underline">
              View Governance Audit Ledger →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
