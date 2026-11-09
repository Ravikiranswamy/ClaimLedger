import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  FileText,
  Filter,
  Lightbulb,
  MessageSquare,
  PenSquare,
  PlusCircle,
  Search,
  Send,
  Tag,
  Wand2,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { StatusPill } from '../components/StatusPill'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import type { KnowledgeDoc } from '../types'

export function CreatorDashboard() {
  const { user } = useAuth()
  const location = useLocation()

  // Data queries
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const documentsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })
  const auditQ = useQuery({ queryKey: ['audit-global'], queryFn: api.listGlobalAudit })

  const submissions = submissionsQ.data ?? []
  const documents = (documentsQ.data ?? []).filter((d) => d.approvalStatus === 'APPROVED')
  const audits = auditQ.data ?? []

  // Handle hash scrolling to #my-content
  useEffect(() => {
    if (location.hash === '#my-content') {
      const el = document.getElementById('my-content')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [location.hash])

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = user?.fullName?.split(' ')[0] ?? 'Creator'

  // Section B: Personal Content Metrics calculated strictly from authenticated Creator's submissions
  const draftsCount = useMemo(() => submissions.filter((s) => s.status === 'DRAFT').length, [submissions])
  const awaitingReviewCount = useMemo(
    () => submissions.filter((s) => ['IN_REVIEW', 'ANALYZING', 'FLAGGED', 'VERIFIED'].includes(s.status)).length,
    [submissions]
  )
  const needsRevisionCount = useMemo(
    () => submissions.filter((s) => s.status === 'CHANGES_REQUESTED').length,
    [submissions]
  )
  const approvedCount = useMemo(() => submissions.filter((s) => s.status === 'APPROVED').length, [submissions])

  // Section C: Needs Your Attention items (Changes Requested priority)
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

  // Section D: Search and filter state for My Content
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHANGES_REQUESTED' | 'IN_REVIEW' | 'APPROVED' | 'DRAFT' | 'REJECTED'>('ALL')
  const [selectedGuideline, setSelectedGuideline] = useState<KnowledgeDoc | null>(null)

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Status filtering
      if (statusFilter === 'CHANGES_REQUESTED' && s.status !== 'CHANGES_REQUESTED') return false
      if (statusFilter === 'IN_REVIEW' && !['IN_REVIEW', 'ANALYZING', 'FLAGGED', 'VERIFIED'].includes(s.status)) return false
      if (statusFilter === 'APPROVED' && s.status !== 'APPROVED') return false
      if (statusFilter === 'DRAFT' && s.status !== 'DRAFT') return false
      if (statusFilter === 'REJECTED' && s.status !== 'REJECTED') return false

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = s.title.toLowerCase().includes(q)
        const deptMatch = s.departmentName?.toLowerCase().includes(q) ?? false
        if (!titleMatch && !deptMatch) return false
      }
      return true
    })
  }, [submissions, statusFilter, searchQuery])

  return (
    <div className="space-y-10">
      {/* SECTION A: Personal Welcome Banner */}
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
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-strong shadow-md"
            >
              <PlusCircle size={18} aria-hidden /> Create Content
            </Link>
            <Link
              to="/knowledge-base"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 font-semibold text-white transition hover:bg-white/10"
            >
              <BookOpen size={18} aria-hidden /> Browse Guidelines
            </Link>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#5EEAD4]/15 blur-3xl" />
      </section>

      {/* SECTION B: Personal Content Metrics */}
      <section aria-labelledby="metrics-h">
        <h2 id="metrics-h" className="sr-only">
          Personal Content Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Drafts */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('DRAFT')
              document.getElementById('my-content')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition shadow-xs hover:border-brand ${
              statusFilter === 'DRAFT' ? 'border-brand bg-brand-soft/20' : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Drafts</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileEdit size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink">{draftsCount}</p>
            <p className="mt-1 text-xs text-muted">Unsubmitted or work-in-progress</p>
          </button>

          {/* Awaiting Review */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('IN_REVIEW')
              document.getElementById('my-content')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition shadow-xs hover:border-amber-400 ${
              statusFilter === 'IN_REVIEW' ? 'border-amber-400 bg-amber-50/40' : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Awaiting Review</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-unverified">
                <Clock size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-amber-900">{awaitingReviewCount}</p>
            <p className="mt-1 text-xs text-muted">In reviewer queue for verification</p>
          </button>

          {/* Needs Revision */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('CHANGES_REQUESTED')
              document.getElementById('my-content')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition shadow-xs hover:border-conflict ${
              statusFilter === 'CHANGES_REQUESTED' ? 'border-conflict bg-conflict-soft/40' : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Needs Revision</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-conflict-soft text-conflict">
                <AlertCircle size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-conflict">{needsRevisionCount}</p>
            <p className="mt-1 text-xs text-muted">Changes requested by reviewer</p>
          </button>

          {/* Approved */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('APPROVED')
              document.getElementById('my-content')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition shadow-xs hover:border-verified ${
              statusFilter === 'APPROVED' ? 'border-verified bg-verified-soft/40' : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-medium text-muted">Approved</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-verified-soft text-verified">
                <CheckCircle2 size={20} />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-verified">{approvedCount}</p>
            <p className="mt-1 text-xs text-muted">Cleared for official publishing</p>
          </button>
        </div>
      </section>

      {/* SECTION C: Needs Your Attention */}
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
              <button
                type="button"
                onClick={() => document.getElementById('my-content')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
              >
                <FileText size={16} /> View My Content
              </button>
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

      {/* SECTION D: My Content */}
      <section id="my-content" aria-labelledby="my-content-h" className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <FileText size={18} />
              </span>
              <h2 id="my-content-h" className="font-display text-2xl font-bold text-ink">
                My Content
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Search, inspect, and track your submitted organisational content and verification results.
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong shadow-xs"
          >
            <PlusCircle size={16} /> Create Content
          </Link>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search content by title or department…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-muted mr-1 flex items-center gap-1">
              <Filter size={14} /> Status:
            </span>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'CHANGES_REQUESTED', label: 'Needs Revision' },
                { id: 'IN_REVIEW', label: 'In Review' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'DRAFT', label: 'Drafts' },
                { id: 'REJECTED', label: 'Rejected' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  statusFilter === f.id
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-canvas text-muted hover:bg-surface border border-line hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Table / Cards */}
        {submissionsQ.isLoading && <p className="py-8 text-center text-muted">Loading your content…</p>}

        {submissionsQ.isSuccess && filteredSubmissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-canvas p-8 text-center">
            <FileText size={36} className="mx-auto text-muted opacity-60" />
            <p className="mt-2 font-semibold text-ink">No content matches your filters</p>
            <p className="text-xs text-muted mt-1">Try resetting the status filter or clearing your search term.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
              }}
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-3 px-3">Content Title</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Format</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-3">Workflow Status</th>
                <th className="py-3 px-3">Findings</th>
                <th className="py-3 px-3 text-right">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSubmissions.map((s) => {
                const totalClaims = s.claims.length
                const nonVerified = s.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length

                return (
                  <tr key={s.id} className="transition hover:bg-canvas">
                    <td className="py-3 px-3 font-semibold text-ink">
                      <Link to={`/submissions/${s.id}`} className="hover:text-brand transition flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{s.title}</span>
                        {s.revisionNumber > 1 && (
                          <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-[10px] text-muted">
                            r{s.revisionNumber}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-muted">{s.departmentName ?? 'General'}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-xs font-medium text-ink">
                        {s.contentType ?? 'TEXT'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted whitespace-nowrap">
                      {formatWhen(s.updatedAt ?? s.createdAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <SubmissionStatusChip status={s.status} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {totalClaims === 0 ? (
                        <span className="text-xs text-muted">0 claims</span>
                      ) : nonVerified === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-verified">
                          <CheckCircle2 size={13} /> {totalClaims} verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-conflict">
                          <AlertCircle size={13} /> {nonVerified} issue{nonVerified === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {s.status === 'CHANGES_REQUESTED' ? (
                        <Link
                          to={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-conflict px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-600 transition"
                        >
                          <Wand2 size={13} /> Revise
                        </Link>
                      ) : s.status === 'DRAFT' ? (
                        <Link
                          to={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-strong transition"
                        >
                          <FileEdit size={13} /> Edit Draft
                        </Link>
                      ) : (
                        <Link
                          to={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                        >
                          View Details <ArrowRight size={13} />
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION E: Brand Guidelines (Read-Only) */}
      <section aria-labelledby="guidelines-h" className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <BookOpen size={18} />
              </span>
              <h2 id="guidelines-h" className="font-display text-2xl font-bold text-ink">
                Brand Guidelines & Standards
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              Read-only single source of truth for approved brand claims, product facts, and corporate terminology.
            </p>
          </div>
          <Link
            to="/knowledge-base"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
          >
            Explore all guidelines <ExternalLink size={14} />
          </Link>
        </div>

        {documentsQ.isLoading && <p className="py-6 text-center text-muted">Loading brand guidelines…</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.slice(0, 3).map((doc) => {
            const isTier1 = doc.authorityTier === 'TIER_1'
            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-canvas p-5 shadow-xs transition hover:border-brand"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        isTier1 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isTier1 ? 'Tier 1 — Master Authority' : 'Tier 2 — Departmental'}
                    </span>
                    <span className="rounded-full bg-verified-soft px-2 py-0.5 text-[10px] font-bold text-verified uppercase">
                      {doc.approvalStatus}
                    </span>
                  </div>

                  <h3 className="mt-3 font-semibold text-ink text-sm leading-snug">{doc.name}</h3>
                  <p className="mt-1 text-xs text-muted">Version {doc.version} · {doc.channel ?? 'All Channels'}</p>

                  <div className="mt-3 space-y-1 text-xs text-muted">
                    {doc.productScope && (
                      <p className="flex items-center gap-1.5">
                        <Tag size={13} className="text-muted shrink-0" />
                        <span className="truncate">{doc.productScope}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted shrink-0" />
                      <span>Valid: {doc.effectiveDate ?? 'Current'} {doc.expiryDate ? `to ${doc.expiryDate}` : '(Ongoing)'}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGuideline(doc)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    View Guideline Scope →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION F: Recent Activity */}
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
          {audits.slice(0, 6).map((a) => {
            const isApproved = a.action === 'REVIEWER_APPROVED'
            const isChangesRequested = a.action === 'REVIEWER_CHANGES_REQUESTED'
            const isRevised = a.action === 'CREATOR_REVISED'
            const isRejected = a.action === 'REVIEWER_REJECTED'

            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3.5 transition hover:bg-surface"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isApproved
                        ? 'bg-verified-soft text-verified'
                        : isChangesRequested
                          ? 'bg-conflict-soft text-conflict'
                          : isRevised
                            ? 'bg-brand-soft text-brand'
                            : isRejected
                              ? 'bg-violation-soft text-violation'
                              : 'bg-navy-soft text-navy'
                    }`}
                  >
                    {isApproved ? (
                      <CheckCircle2 size={16} />
                    ) : isChangesRequested ? (
                      <AlertCircle size={16} />
                    ) : isRevised ? (
                      <Wand2 size={16} />
                    ) : isRejected ? (
                      <XCircle size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {isApproved
                        ? 'Reviewer Approved Content'
                        : isChangesRequested
                          ? 'Reviewer Requested Changes'
                          : isRevised
                            ? 'Submitted Revision'
                            : isRejected
                              ? 'Reviewer Rejected Content'
                              : 'New Submission Created'}
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

      {/* Guideline Read-Only Modal */}
      {selectedGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl bg-surface shadow-2xl flex flex-col border border-line">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <FileText size={20} />
                </span>
                <div>
                  <h2 className="font-display font-bold text-lg">{selectedGuideline.name}</h2>
                  <p className="text-xs text-muted">Authoritative Brand Guideline (Read-Only)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuideline(null)}
                className="rounded-xl p-1.5 text-muted hover:bg-canvas hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1 text-sm">
              <div className="rounded-2xl border border-line bg-canvas p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Authority Tier</span>
                  <span className="text-xs font-bold text-brand">{selectedGuideline.authorityTier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Version</span>
                  <span className="text-xs font-bold text-ink">{selectedGuideline.version}</span>
                </div>
                {selectedGuideline.productScope && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Product Scope</span>
                    <span className="text-xs font-bold text-ink">{selectedGuideline.productScope}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Validity</span>
                  <span className="text-xs font-bold text-ink">
                    {selectedGuideline.effectiveDate ?? 'Current'} {selectedGuideline.expiryDate ? `to ${selectedGuideline.expiryDate}` : '(Ongoing)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Approval Status</span>
                  <span className="rounded-full bg-verified-soft px-2.5 py-0.5 text-xs font-bold text-verified">
                    {selectedGuideline.approvalStatus}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-brand-soft/40 p-4 text-xs text-ink space-y-1">
                <p className="font-bold text-brand">Authoritative Standard</p>
                <p className="text-muted leading-relaxed">
                  All claims in your content are deterministically compared against this approved document before publication.
                </p>
              </div>
            </div>

            <div className="border-t border-line px-6 py-4 bg-canvas flex justify-end">
              <button
                onClick={() => setSelectedGuideline(null)}
                className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-soft"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
