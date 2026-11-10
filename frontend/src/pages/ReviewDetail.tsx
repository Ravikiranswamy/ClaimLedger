import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  GitMerge,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Loader2,
  Maximize2,
  Palette,
  Quote,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User as UserIcon,
  Wand2,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AuditTimeline } from '../components/AuditTimeline'
import { CheckingView } from '../components/CheckingView'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { applySuggestions, buildSegments } from '../lib/highlight'
import { useSecureMediaUrl } from '../lib/media'
import type { AuthorityTier, Claim, ClaimState, Evidence, KnowledgeDoc, ReviewAction, Submission } from '../types'
import { isAuthoritative } from '../types'

// Inline text highlight classes per verification status
const HIGHLIGHT_STYLES: Record<ClaimState, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-950 border-b-2 border-emerald-500 hover:bg-emerald-200/80',
  VIOLATION: 'bg-rose-100 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-200/80',
  CONFLICT: 'bg-amber-100 text-amber-950 border-b-2 border-amber-500 hover:bg-amber-200/80',
  UNVERIFIED: 'bg-yellow-100 text-yellow-950 border-b-2 border-yellow-500 hover:bg-yellow-200/80',
}

const CLAIM_STATUS_CONFIG: Record<
  ClaimState,
  { label: string; badgeCls: string; icon: any; borderCls: string }
> = {
  VERIFIED: {
    label: 'Verified',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
    borderCls: 'border-emerald-300',
  },
  VIOLATION: {
    label: 'Violation',
    badgeCls: 'bg-rose-50 text-rose-800 border-rose-300',
    icon: AlertTriangle,
    borderCls: 'border-rose-300',
  },
  UNVERIFIED: {
    label: 'Unverified',
    badgeCls: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    icon: HelpCircle,
    borderCls: 'border-yellow-300',
  },
  CONFLICT: {
    label: 'Conflict',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: GitMerge,
    borderCls: 'border-amber-300',
  },
}

const TIER_META: Record<AuthorityTier, { label: string; badgeCls: string }> = {
  TIER_1: {
    label: 'Tier 1 — Master Authority',
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  TIER_2: {
    label: 'Tier 2 — Departmental Scope',
    badgeCls: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  TIER_3: {
    label: 'Tier 3 — Supporting Material',
    badgeCls: 'bg-purple-100 text-purple-800 border-purple-300',
  },
}

const REVIEWER_ROLES = ['REVIEWER', 'ADMIN', 'DEPT_MANAGER']
const CLOSED = ['APPROVED', 'REJECTED']

/** Determines source scope and applicability based on authority tier, status and jurisdictional scope */
function getSourceScopeInfo(e: Evidence, doc?: KnowledgeDoc, submissionDept?: string | null) {
  const isAuth = isAuthoritative(e)
  const name = e.documentName.toLowerCase()
  const excerpt = (e.excerpt ?? '').toLowerCase()

  const isSuperseded =
    doc?.approvalStatus === 'SUPERSEDED' ||
    name.includes('old_brochure') ||
    name.includes('outdated') ||
    excerpt.includes('superseded')

  const isOutsideScope =
    !isAuth &&
    !isSuperseded &&
    (name.includes('sales_proposal') ||
      name.includes('compensation') ||
      name.includes('regional') ||
      (doc?.departmentName &&
        submissionDept &&
        doc.departmentName !== submissionDept &&
        doc.departmentName !== 'Universal' &&
        !doc.departmentName.includes('All')))

  if (isAuth) {
    return {
      status: 'APPLICABLE_AUTHORITATIVE',
      label: 'Applicable Authoritative Grounding',
      badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      iconCls: 'text-emerald-700',
    }
  }

  if (isSuperseded) {
    return {
      status: 'SUPERSEDED',
      label: 'Superseded Document (Outdated)',
      badgeCls: 'bg-rose-50 text-rose-800 border-rose-300',
      iconCls: 'text-rose-700',
    }
  }

  if (isOutsideScope) {
    return {
      status: 'OUTSIDE_SCOPE',
      label: 'Outside Authorised Scope / Scoped Exception',
      badgeCls: 'bg-amber-50 text-amber-800 border-amber-300',
      iconCls: 'text-amber-700',
    }
  }

  return {
    status: 'SUPPORTING_REFERENCE',
    label: 'Supporting Reference (Subordinate)',
    badgeCls: 'bg-slate-100 text-slate-800 border-slate-300',
    iconCls: 'text-slate-600',
  }
}

/** Helper to extract version from KnowledgeDoc or document name */
function getDocumentVersion(e: Evidence, doc?: KnowledgeDoc) {
  if (doc?.version) return `v${doc.version.replace(/^v/i, '')}`
  const vMatch = e.documentName.match(/_v(\d+(?:\.\d+)?)/i)
  if (vMatch) return `v${vMatch[1]}`
  return 'v1.0'
}

export function ReviewDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const qc = useQueryClient()

  // Queries
  const q = useQuery({ queryKey: ['submission', id], queryFn: () => api.getSubmission(id) })
  const docsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })

  const s = q.data
  const docs = docsQ.data ?? []

  // Document map for rich metadata lookup
  const docMap = useMemo(() => {
    const map = new Map<string, KnowledgeDoc>()
    for (const d of docs) {
      map.set(d.name.toLowerCase().trim(), d)
    }
    return map
  }, [docs])

  const [selected, setSelected] = useState<string | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [findingsTab, setFindingsTab] = useState<'ALL' | 'TEXT' | 'VISUAL'>('ALL')

  const textClaims = useMemo(
    () => s?.claims.filter((c) => c.claimType !== 'VISUAL_BRAND') ?? [],
    [s]
  )
  const visualClaims = useMemo(
    () => s?.claims.filter((c) => c.claimType === 'VISUAL_BRAND') ?? [],
    [s]
  )
  const displayedClaims = useMemo(() => {
    if (!s) return []
    if (findingsTab === 'TEXT') return textClaims
    if (findingsTab === 'VISUAL') return visualClaims
    return s.claims
  }, [s, findingsTab, textClaims, visualClaims])

  const mediaUrl = useSecureMediaUrl(s)

  // Select the first claim that needs attention once data arrives
  useEffect(() => {
    if (!s || s.claims.length === 0) return
    if (selected && s.claims.some((c) => c.id === selected)) return
    setSelected(
      (s.claims.find((c) => c.verificationStatus !== 'VERIFIED') ?? s.claims[0])?.id ?? null
    )
  }, [s, selected])

  const { segments, unlocated } = useMemo(
    () => (s ? buildSegments(s.content, s.claims) : { segments: [], unlocated: [] as string[] }),
    [s]
  )

  const store = (next: Submission) => {
    qc.setQueryData(['submission', id], next)
    qc.invalidateQueries({ queryKey: ['audit', id] })
    qc.invalidateQueries({ queryKey: ['submissions'] })
    qc.invalidateQueries({ queryKey: ['audit-all'] })
  }

  // Smooth scroll to claim finding card when clicked from submitted content
  const handleSelectClaim = (claimId: string) => {
    setSelected(claimId)
    const element = document.getElementById(`claim-card-${claimId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  if (q.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <Loader2 size={32} className="animate-spin text-[#0F766E] mb-3" />
        <p className="text-base font-medium text-ink">Loading submission details…</p>
      </div>
    )
  }

  if (q.isError || !s) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <p className="font-bold text-base mb-1">Unable to load submission</p>
        <p className="text-sm mb-4">
          {q.error instanceof Error ? q.error.message : 'We could not find or load this submission.'}
        </p>
        <Link
          to={user?.role === 'CREATOR' ? '/my-content' : '/review'}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-soft"
        >
          <ArrowLeft size={14} />
          {user?.role === 'CREATOR' ? 'Back to My Content' : 'Back to Review Queue'}
        </Link>
      </div>
    )
  }

  // Computed claim counts
  const totalClaims = s.claims.length
  const violationsCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
  const conflictsCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length
  const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
  const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
  const unresolved = totalClaims - verifiedCount

  const isReadOnlyMode =
    new URLSearchParams(location.search).get('mode') === 'readonly' || CLOSED.includes(s.status)
  const canDecide =
    !isReadOnlyMode &&
    !!user &&
    REVIEWER_ROLES.includes(user.role) &&
    !CLOSED.includes(s.status) &&
    s.status !== 'CHANGES_REQUESTED'
  const canRevise =
    !isReadOnlyMode &&
    user?.role === 'CREATOR' &&
    ['FLAGGED', 'CHANGES_REQUESTED', 'DRAFT'].includes(s.status)

  const backLink = isReadOnlyMode
    ? '/history'
    : user?.role === 'CREATOR'
      ? '/my-content'
      : '/review'
  const backLabel = isReadOnlyMode
    ? 'Back to Review History'
    : user?.role === 'CREATOR'
      ? 'Back to My Content'
      : 'Back to Review Queue'

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* ========================================================================= */}
      {/* 1. SUBMISSION HEADER                                                      */}
      {/* ========================================================================= */}
      <header className="space-y-4">
        {/* Back navigation */}
        <div>
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-[#0F766E] transition cursor-pointer"
          >
            <ArrowLeft size={14} /> {backLabel}
          </Link>
        </div>

        {/* Title, Creator, Department, Date and Status */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-1.5 max-w-4xl">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0F766E] text-white text-[10px] font-bold font-mono">
                02
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Authorised Reviewer Workspace · Compliance Inspection
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              {s.title}
            </h1>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted pt-1">
              <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <UserIcon size={14} className="text-muted shrink-0" />
                {s.submittedByName ?? 'Creator'}
              </span>

              <span className="flex items-center gap-1.5">
                <Shield size={14} className="text-muted shrink-0" />
                <span className="rounded bg-canvas border border-line px-2 py-0.5 text-slate-700 font-medium">
                  {s.departmentName ?? 'Marketing'}
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-muted shrink-0" />
                <span>
                  Submitted{' '}
                  <strong className="text-slate-800">
                    {new Date(s.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </strong>{' '}
                  at{' '}
                  {new Date(s.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>

              {s.revisionNumber > 1 && (
                <span className="rounded bg-slate-200 border border-slate-300 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                  Revision {s.revisionNumber}
                </span>
              )}
            </div>
          </div>

          {/* Workflow Status Chip */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-1">
              Workflow Status:
            </span>
            <SubmissionStatusChip status={s.status} />
          </div>
        </div>

        {/* Read-Only Historical Mode Banner */}
        {isReadOnlyMode && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold shrink-0">
                <ShieldCheck size={20} />
              </span>
              <div>
                <p className="font-bold text-sm text-blue-950">Historical Review Record (Read-Only Mode)</p>
                <p className="text-blue-800">
                  This completed review decision is committed to the governance ledger. Approval controls are deactivated.
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-white border border-blue-200 px-3 py-1 font-bold text-blue-900">
              Recorded Decision: {s.status.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. REVIEW SUMMARY                                                         */}
      {/* ========================================================================= */}
      <section aria-labelledby="review-summary-heading" className="space-y-3">
        <h2 id="review-summary-heading" className="sr-only">
          Review Summary of Detected Claims
        </h2>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Status counts ribbon */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">
                Detected Claims ({totalClaims}):
              </span>

              {/* Violations */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  violationsCount > 0
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-line bg-canvas text-muted opacity-75'
                }`}
              >
                <AlertTriangle size={14} className={violationsCount > 0 ? 'text-rose-600' : 'text-muted'} />
                <span>{violationsCount} {violationsCount === 1 ? 'Violation' : 'Violations'}</span>
              </div>

              {/* Conflicts */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  conflictsCount > 0
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-line bg-canvas text-muted opacity-75'
                }`}
              >
                <GitMerge size={14} className={conflictsCount > 0 ? 'text-amber-600' : 'text-muted'} />
                <span>{conflictsCount} {conflictsCount === 1 ? 'Conflict' : 'Conflicts'}</span>
              </div>

              {/* Unverified */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  unverifiedCount > 0
                    ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                    : 'border-line bg-canvas text-muted opacity-75'
                }`}
              >
                <HelpCircle size={14} className={unverifiedCount > 0 ? 'text-yellow-600' : 'text-muted'} />
                <span>{unverifiedCount} Unverified</span>
              </div>

              {/* Verified */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  verifiedCount > 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-line bg-canvas text-muted opacity-75'
                }`}
              >
                <CheckCircle2 size={14} className={verifiedCount > 0 ? 'text-emerald-600' : 'text-muted'} />
                <span>{verifiedCount} Verified</span>
              </div>
            </div>

            {/* Overall Verdict Banner */}
            <div className="text-xs">
              {totalClaims === 0 ? (
                <span className="text-muted font-medium">No factual claims detected in content.</span>
              ) : unresolved === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-800">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  All claims verified against authoritative guidelines — awaiting human approval
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 font-bold text-amber-900">
                  <AlertCircle size={14} className="text-amber-600" />
                  {unresolved} claim{unresolved === 1 ? '' : 's'} require reviewer decision before clearance
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BALANCED DESKTOP LAYOUT: 3. SUBMITTED CONTENT & 4. CLAIM FINDINGS         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* ======================================================================= */}
        {/* 3. SUBMITTED CONTENT (LEFT COLUMN)                                      */}
        {/* ======================================================================= */}
        <section
          aria-labelledby="submitted-content-heading"
          className="lg:col-span-5 rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4 lg:sticky lg:top-6"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 id="submitted-content-heading" className="font-display text-lg font-bold text-[#0A1F36]">
                {s.contentType === 'IMAGE' ? 'Submitted Visual Asset' : 'Original Submitted Content'}
              </h2>
              <p className="text-xs text-muted">
                {s.contentType === 'IMAGE'
                  ? 'Visual asset inspection, color analysis, and in-image claim verification.'
                  : 'Interactive highlights correspond to verified claims and flagged discrepancies.'}
              </p>
            </div>
            <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-[11px] font-mono text-muted uppercase">
              {s.contentType ?? 'TEXT'}
            </span>
          </div>

          {/* If IMAGE submission, render prominent image preview with Lightbox zoom button */}
          {s.contentType === 'IMAGE' && (
            <div className="space-y-3">
              <div className="relative group rounded-xl border border-line overflow-hidden bg-slate-950/5 flex items-center justify-center min-h-[220px]">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt={s.title}
                    onClick={() => setIsLightboxOpen(true)}
                    className="w-full max-h-[360px] object-contain cursor-pointer transition group-hover:scale-[1.01]"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                      const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback-card') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className={`image-fallback-card ${mediaUrl ? 'hidden' : 'flex'} flex-col items-center justify-center p-8 text-center text-muted`}
                >
                  <ImageIcon size={44} className="text-[#0F766E]/60 mb-2" />
                  <p className="font-semibold text-sm text-ink">{s.filePath?.split('/').pop() || s.title}</p>
                  <p className="text-xs text-muted mt-0.5">Submitted Visual Graphic Asset</p>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-navy/85 hover:bg-navy text-white px-3 py-1.5 text-xs font-semibold backdrop-blur-xs shadow-md transition cursor-pointer"
                    title="Open full size in Lightbox"
                  >
                    <Maximize2 size={13} />
                    <span>Expand</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted px-1">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <ImageIcon size={14} className="text-[#0F766E]" />
                  <span>Visual Reference Asset</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-[#0F766E] hover:underline font-semibold cursor-pointer"
                >
                  Inspect Full Resolution
                </button>
              </div>
            </div>
          )}

          {/* Submitted content paragraph / OCR extracted text with highlighted spans */}
          <div className="space-y-2">
            {s.contentType === 'IMAGE' && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  In-Image OCR Extracted Text:
                </span>
                <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-[11px] font-mono text-muted">
                  {s.content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            )}
            <div className="rounded-xl border border-line/80 bg-canvas/60 p-4 min-h-[140px]">
              <p className="whitespace-pre-wrap text-base leading-8 text-slate-800 font-normal">
                {segments.map((seg, i) => {
                  if (seg.claimId) {
                    const matchingClaim = s.claims.find((c) => c.id === seg.claimId)
                    const status = matchingClaim?.verificationStatus ?? 'UNVERIFIED'
                    const isSelected = selected === seg.claimId

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectClaim(seg.claimId!)}
                        aria-pressed={isSelected}
                        title={`Click to inspect Claim: ${matchingClaim?.claimText}`}
                        className={`rounded px-1.5 py-0.5 mx-0.5 transition-all cursor-pointer ${
                          HIGHLIGHT_STYLES[status]
                        } ${
                          isSelected
                            ? 'ring-2 ring-slate-900 ring-offset-1 font-semibold shadow-xs'
                            : ''
                        }`}
                      >
                        {seg.text}
                      </button>
                    )
                  }
                  return <span key={i}>{seg.text}</span>
                })}
              </p>
            </div>
          </div>

          {/* Unlocated claims notice if any */}
          {unlocated.length > 0 && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
              Note: {unlocated.length} claim{unlocated.length === 1 ? '' : 's'} could not be located word-for-word in the text, but {unlocated.length === 1 ? 'is' : 'are'} listed in the findings.
            </p>
          )}

          {/* Color Legend */}
          <div className="border-t border-line pt-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
              Highlight Legend:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-rose-800">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Violation (Contradicts truth)</span>
              </span>
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Conflict (Tier discrepancy)</span>
              </span>
              <span className="flex items-center gap-1.5 text-yellow-800">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Unverified (No evidence)</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Verified (Matches guideline)</span>
              </span>
            </div>
          </div>

          {/* Creator Revision Panel (only for Creator role when revision is permitted) */}
          {canRevise && <RevisePanel s={s} onDone={store} />}
        </section>

        {/* ======================================================================= */}
        {/* 4. CLAIM FINDINGS & EVIDENCE (RIGHT COLUMN)                             */}
        {/* ======================================================================= */}
        <section
          aria-labelledby="claim-findings-heading"
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 id="claim-findings-heading" className="font-display text-lg font-bold text-[#0A1F36]">
                Claim Findings & Evidence
              </h2>
              <p className="text-xs text-muted">
                Deterministic claim verification, explanation, suggested corrections, and authority sources.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted">
              {totalClaims} {totalClaims === 1 ? 'claim' : 'claims'} evaluated
            </span>
          </div>

          {/* Sub-filter tabs when visual claims exist or content is IMAGE */}
          {(visualClaims.length > 0 || s.contentType === 'IMAGE') && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
              <button
                type="button"
                onClick={() => setFindingsTab('ALL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  findingsTab === 'ALL'
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                }`}
              >
                <Layers size={13} />
                <span>All Findings ({s.claims.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFindingsTab('TEXT')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  findingsTab === 'TEXT'
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                }`}
              >
                <FileText size={13} />
                <span>Text & In-Image Claims ({textClaims.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFindingsTab('VISUAL')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  findingsTab === 'VISUAL'
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                }`}
              >
                <Palette size={13} />
                <span>Visual Brand Governance ({visualClaims.length})</span>
              </button>
            </div>
          )}

          {displayedClaims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted">
              <FileCheck2 size={32} className="mx-auto mb-2 text-muted/60" />
              <p className="font-semibold text-ink">No claims in this category</p>
              <p className="text-xs text-muted mt-1">
                Select another findings tab or choose "All Findings" to inspect all verified statements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedClaims.map((claim: Claim, idx) => {
                const isSelected = selected === claim.id
                const statusConfig = CLAIM_STATUS_CONFIG[claim.verificationStatus]
                const StatusIcon = statusConfig.icon
                const sortedEvidence = [...claim.evidence].sort(
                  (a, b) => Number(isAuthoritative(b)) - Number(isAuthoritative(a))
                )

                return (
                  <article
                    key={claim.id}
                    id={`claim-card-${claim.id}`}
                    className={`rounded-2xl border bg-surface p-5 transition-all shadow-xs space-y-4 ${
                      isSelected
                        ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20 bg-teal-50/10'
                        : 'border-line hover:border-slate-300'
                    }`}
                  >
                    {/* Claim Card Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                            {idx + 1}
                          </span>
                          {claim.claimType === 'VISUAL_BRAND' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-[#0F766E]">
                              <Palette size={11} />
                              VISUAL BRAND GOVERNANCE
                            </span>
                          ) : (
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Extracted Claim
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-[#0A1F36]">
                          “{claim.claimText}”
                        </h3>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusConfig.badgeCls}`}
                      >
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Color Swatch Preview for Visual Brand findings if hex code exists */}
                    {claim.claimType === 'VISUAL_BRAND' && (() => {
                      const hexMatch = (claim.claimText + ' ' + (claim.explanation ?? '')).match(/#([0-9a-fA-F]{6})/i)
                      if (!hexMatch) return null
                      return (
                        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas/80 px-3 py-2 text-xs">
                          <span
                            className="h-5 w-5 rounded-md border border-black/20 shadow-xs shrink-0"
                            style={{ backgroundColor: hexMatch[0] }}
                          />
                          <span className="font-mono font-bold text-slate-900">{hexMatch[0]}</span>
                          <span className="text-muted">Detected Palette Sample</span>
                        </div>
                      )
                    })()}

                    {/* Clear Explanation */}
                    <div className="space-y-1 text-xs">
                      <span className="font-bold uppercase tracking-wider text-muted block text-[11px]">
                        Verification Rationale:
                      </span>
                      <p className="text-slate-800 leading-relaxed text-sm bg-canvas/70 border border-line rounded-xl p-3">
                        {claim.explanation ?? 'No specific rationale provided by the verification engine.'}
                      </p>
                    </div>

                    {/* Suggested Correction (where available) */}
                    {claim.suggestedCorrection && claim.verificationStatus !== 'VERIFIED' && (
                      <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#0F766E]">
                          <Lightbulb size={15} />
                          <span>Suggested Compliant Wording</span>
                        </div>
                        <p className="text-sm font-semibold text-[#0A1F36] pl-5">
                          “{claim.suggestedCorrection}”
                        </p>
                      </div>
                    )}

                    {/* Supporting Evidence Documents */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                          Supporting Evidence & Guidelines ({sortedEvidence.length}):
                        </span>
                        {claim.aiConfidence != null && (
                          <span className="text-[11px] text-muted">
                            Confidence: <strong>{Math.round(Number(claim.aiConfidence) * 100)}%</strong>
                          </span>
                        )}
                      </div>

                      {sortedEvidence.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-line bg-canvas p-4 text-xs text-muted">
                          <p className="font-semibold text-slate-700">No supporting evidence in Knowledge Base</p>
                          <p className="mt-0.5">
                            No approved company brand guideline, price catalogue, or policy document mentions or authorizes this statement.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {sortedEvidence.map((ev) => {
                            const matchingDoc = docMap.get(ev.documentName.toLowerCase().trim())
                            const scopeInfo = getSourceScopeInfo(ev, matchingDoc, s.departmentName)
                            const version = getDocumentVersion(ev, matchingDoc)
                            const tier = ev.authorityTier ?? matchingDoc?.authorityTier ?? 'TIER_1'
                            const tierMeta = TIER_META[tier] ?? TIER_META.TIER_1

                            return (
                              <div
                                key={ev.id}
                                className={`rounded-xl border p-3.5 text-xs transition space-y-2.5 ${
                                  scopeInfo.status === 'APPLICABLE_AUTHORITATIVE'
                                    ? 'border-emerald-300 bg-emerald-50/40'
                                    : scopeInfo.status === 'SUPERSEDED'
                                      ? 'border-rose-200 bg-rose-50/30'
                                      : scopeInfo.status === 'OUTSIDE_SCOPE'
                                        ? 'border-amber-200 bg-amber-50/30'
                                        : 'border-line bg-canvas'
                                }`}
                              >
                                {/* Document title and Scope Badge */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <FileText size={15} className={scopeInfo.iconCls} />
                                    <span className="font-bold text-slate-900 break-all">
                                      {ev.documentName}
                                    </span>
                                  </div>

                                  {/* Scope & Applicability Badge */}
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${scopeInfo.badgeCls}`}
                                  >
                                    {scopeInfo.status === 'APPLICABLE_AUTHORITATIVE' && (
                                      <Check size={11} className="text-emerald-700" />
                                    )}
                                    {scopeInfo.status === 'SUPERSEDED' && (
                                      <RotateCcw size={11} className="text-rose-700" />
                                    )}
                                    {scopeInfo.status === 'OUTSIDE_SCOPE' && (
                                      <ShieldAlert size={11} className="text-amber-700" />
                                    )}
                                    {scopeInfo.label}
                                  </span>
                                </div>

                                {/* Metadata row: Tier, Version, Page Reference */}
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                  <span
                                    className={`inline-block rounded border px-2 py-0.5 font-bold ${tierMeta.badgeCls}`}
                                  >
                                    {tierMeta.label}
                                  </span>

                                  <span className="rounded bg-slate-200/80 border border-slate-300 px-1.5 py-0.5 font-mono font-bold text-slate-800">
                                    {version}
                                  </span>

                                  {ev.pageNumber && (
                                    <span className="rounded bg-canvas border border-line px-2 py-0.5 text-slate-700 font-medium">
                                      Page {ev.pageNumber}
                                    </span>
                                  )}
                                </div>

                                {/* Relevant Excerpt */}
                                {ev.excerpt && (
                                  <div className="rounded-lg border-l-4 border-[#0F766E] bg-white/90 p-2.5 text-xs text-slate-800 font-mono leading-relaxed space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                                      <Quote size={11} className="text-[#0F766E]" />
                                      <span>Authoritative Excerpt:</span>
                                    </div>
                                    <p className="whitespace-pre-wrap italic">“{ev.excerpt}”</p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 5. REVIEWER DECISION SECTION (PLACED BELOW CONTENT & FINDINGS)             */}
      {/* ========================================================================= */}
      {canDecide ? (
        <DecisionSection s={s} unresolved={unresolved} onDone={store} />
      ) : (
        (isReadOnlyMode || CLOSED.includes(s.status) || s.status === 'CHANGES_REQUESTED') && (
          <section
            aria-labelledby="recorded-decision-heading"
            className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-3"
          >
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <ShieldCheck size={18} className="text-[#0F766E]" />
              <h2 id="recorded-decision-heading" className="font-display text-lg font-bold text-[#0A1F36]">
                Recorded Review Decision
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Decision Status:
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                  s.status === 'APPROVED'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : s.status === 'REJECTED'
                      ? 'border-rose-300 bg-rose-50 text-rose-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}
              >
                {s.status === 'APPROVED' && <CheckCircle2 size={14} />}
                {s.status === 'REJECTED' && <XCircle size={14} />}
                {s.status === 'CHANGES_REQUESTED' && <RotateCcw size={14} />}
                {s.status.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              This review decision has been recorded and committed to the tamper-resistant governance ledger with full reviewer audit trails.
            </p>
          </section>
        )
      )}

      {/* ========================================================================= */}
      {/* 6. GOVERNANCE AUDIT TIMELINE                                              */}
      {/* ========================================================================= */}
      <section
        aria-labelledby="audit-history-heading"
        className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 id="audit-history-heading" className="font-display text-lg font-bold text-[#0A1F36]">
              Governance Audit Trail & Revision History
            </h2>
            <p className="text-xs text-muted">
              Chronological log of submissions, compliance scans, reviewer decisions, and revisions.
            </p>
          </div>
        </div>

        <AuditTimeline submissionId={s.id} />
      </section>

      {/* ========================================================================= */}
      {/* 7. FULLSCREEN IMAGE LIGHTBOX MODAL                                        */}
      {/* ========================================================================= */}
      {isLightboxOpen && s.contentType === 'IMAGE' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] bg-surface rounded-2xl overflow-hidden border border-line shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-canvas">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-[#0F766E]" />
                <h3 className="font-bold text-sm text-ink truncate max-w-lg">{s.title}</h3>
                <span className="rounded bg-navy-soft text-navy px-2 py-0.5 text-[10px] font-mono font-bold">
                  IMAGE ASSET
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted hover:text-[#0F766E] font-medium"
                >
                  <span>Open Full Size</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-slate-200 transition cursor-pointer"
                  aria-label="Close lightbox"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950/20 max-h-[calc(92vh-60px)]">
              <img
                src={mediaUrl}
                alt={s.title}
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// REVIEWER DECISION SECTION
// =============================================================================
interface DecisionSectionProps {
  s: Submission
  unresolved: number
  onDone: (s: Submission) => void
}

function DecisionSection({ s, unresolved, onDone }: DecisionSectionProps) {
  const [comment, setComment] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)

  const m = useMutation({
    mutationFn: (a: ReviewAction) => api.reviewSubmission(s.id, a, comment.trim() || undefined),
    onSuccess: onDone,
    onError: (e) =>
      setErr(e instanceof Error ? e.message : 'Could not record your decision in the ledger.'),
  })

  const handleDecision = (a: ReviewAction) => {
    setErr(null)

    // Requirement: Require a comment for Request Changes and Reject
    if (a !== 'REVIEWER_APPROVED' && comment.trim().length < 3) {
      setErr(
        a === 'REVIEWER_CHANGES_REQUESTED'
          ? 'Reviewer comment is mandatory when requesting revisions so the creator knows what to correct.'
          : 'Reviewer comment is mandatory when rejecting content to document governance reasons.'
      )
      return
    }

    // Require confirmation if approving with unresolved discrepancies
    if (a === 'REVIEWER_APPROVED' && unresolved > 0 && !confirmApprove) {
      setConfirmApprove(true)
      return
    }

    m.mutate(a)
  }

  return (
    <section
      aria-labelledby="reviewer-decision-heading"
      className="rounded-2xl border-2 border-[#0F766E]/40 bg-surface p-6 shadow-xs space-y-4"
    >
      <div className="flex items-start justify-between border-b border-line pb-3">
        <div>
          <h2 id="reviewer-decision-heading" className="font-display text-xl font-bold text-[#0A1F36]">
            Reviewer Decision & Governance Sign-off
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Record your binding review decision on this submission. Your evaluation, comments, and timestamp will be permanently logged.
          </p>
        </div>
      </div>

      {/* Reviewer Comment Field */}
      <div className="space-y-1.5">
        <label htmlFor="reviewer-decision-comment" className="block text-xs font-bold uppercase tracking-wider text-slate-800">
          Reviewer Comments & Feedback
        </label>
        <textarea
          id="reviewer-decision-comment"
          rows={3}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            if (err) setErr(null)
          }}
          placeholder="Enter review comments, guidance for creator revisions, or approval rationale… (Required when requesting changes or rejecting)"
          className="w-full rounded-xl border border-line bg-canvas p-3.5 text-sm text-ink placeholder:text-muted focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
        />
        <p className="text-[11px] text-muted">
          Mandatory for <strong>Request Changes</strong> and <strong>Reject</strong>. Optional for <strong>Approve</strong>.
        </p>
      </div>

      {/* Unresolved claims approval confirmation banner */}
      {confirmApprove && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>Warning:</strong> {unresolved} claim{unresolved === 1 ? '' : 's'} flagged with violations or unverified status. Approving will override automated verification checks.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={m.isPending}
              onClick={() => handleDecision('REVIEWER_APPROVED')}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800 cursor-pointer text-xs"
            >
              Confirm Approval
            </button>
            <button
              type="button"
              onClick={() => setConfirmApprove(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {err && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2"
        >
          <XCircle size={16} className="text-rose-600 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Decision Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {/* Approve Button */}
        <button
          type="button"
          disabled={m.isPending}
          onClick={() => handleDecision('REVIEWER_APPROVED')}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow-2xs cursor-pointer"
        >
          {m.isPending && <Loader2 size={16} className="animate-spin" />}
          <CheckCircle2 size={16} />
          {confirmApprove ? 'Yes, Approve Content' : 'Approve Content'}
        </button>

        {/* Request Changes Button */}
        <button
          type="button"
          disabled={m.isPending}
          onClick={() => handleDecision('REVIEWER_CHANGES_REQUESTED')}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60 transition shadow-2xs cursor-pointer"
        >
          {m.isPending && <Loader2 size={16} className="animate-spin" />}
          <RotateCcw size={16} />
          Request Changes
        </button>

        {/* Reject Button */}
        <button
          type="button"
          disabled={m.isPending}
          onClick={() => handleDecision('REVIEWER_REJECTED')}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-100 disabled:opacity-60 transition shadow-2xs cursor-pointer"
        >
          {m.isPending && <Loader2 size={16} className="animate-spin" />}
          <XCircle size={16} />
          Reject Content
        </button>

        {confirmApprove && (
          <button
            type="button"
            onClick={() => setConfirmApprove(false)}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  )
}

// =============================================================================
// REVISE PANEL (FOR CREATOR ROLE)
// =============================================================================
function RevisePanel({ s, onDone }: { s: Submission; onDone: (s: Submission) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [applied, setApplied] = useState(0)
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [replacementPreview, setReplacementPreview] = useState<string | null>(null)

  const hasVisualViolations =
    s.contentType === 'IMAGE' &&
    s.claims.some((c) => c.claimType === 'VISUAL_BRAND' && c.verificationStatus !== 'VERIFIED')

  const m = useMutation({
    mutationFn: () => api.reviseSubmission(s.id, text.trim(), undefined, replacementFile || undefined),
    onSuccess: (n) => {
      onDone(n)
      setOpen(false)
      setReplacementFile(null)
      setReplacementPreview(null)
    },
  })

  if (m.isPending) {
    return (
      <div className="mt-4">
        <CheckingView title="Re-analyzing your revision against brand guidelines…" />
      </div>
    )
  }

  if (!open) {
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            const r = applySuggestions(s.content, s.claims)
            setText(r.text)
            setApplied(r.applied)
            setOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-strong transition shadow-2xs cursor-pointer"
        >
          <Wand2 size={14} />
          {s.contentType === 'IMAGE' ? 'Fix Visual Governance & Resubmit' : 'Apply Suggested Corrections & Resubmit'}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-line bg-canvas p-4 text-xs">
      {/* If Image submission with visual violations, show clear governance alert */}
      {s.contentType === 'IMAGE' && (
        <div
          className={`rounded-xl border p-3.5 space-y-1.5 ${
            hasVisualViolations
              ? 'border-amber-300 bg-amber-50/90 text-amber-950'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={15} className={hasVisualViolations ? 'text-amber-600' : 'text-slate-500'} />
            <span>Visual Brand Governance Notice</span>
          </div>
          <p className="text-xs leading-relaxed">
            {hasVisualViolations
              ? 'Visual brand violations (such as unapproved third-party logos or off-brand colors) cannot be resolved by editing text copy alone. To achieve compliance clearance, you must replace the submitted image file with an official approved company mark.'
              : 'You can update the image copy or upload a replacement visual asset before resubmitting for verification.'}
          </p>
        </div>
      )}

      {/* Image Replacement Controls for IMAGE submissions */}
      {s.contentType === 'IMAGE' && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3.5">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Replace Visual Asset (Required to clear visual violations)
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-2 rounded-xl border border-line bg-canvas hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer transition shadow-2xs">
              <UploadCloud size={14} className="text-[#0F766E]" />
              <span>{replacementFile ? `Selected: ${replacementFile.name}` : 'Choose replacement image…'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setReplacementFile(f)
                    setReplacementPreview(URL.createObjectURL(f))
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                // Generate official Nexora approved emblem asset
                const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" rx="16" fill="#0A1F36"/><path d="M 60 140 L 100 60 L 140 140 Z" fill="#0F766E"/><circle cx="100" cy="100" r="15" fill="#5EEAD4"/><text x="170" y="115" font-family="system-ui, sans-serif" font-weight="bold" font-size="34" fill="#FFFFFF">NEXORA</text><text x="172" y="145" font-family="system-ui, sans-serif" font-weight="600" font-size="14" fill="#5EEAD4" letter-spacing="3">OFFICIAL EMBLEM</text></svg>`
                const blob = new Blob([svgContent], { type: 'image/svg+xml' })
                const file = new File([blob], 'Nexora_Official_Brand_Emblem.png', { type: 'image/png' })
                setReplacementFile(file)
                setReplacementPreview(`data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
            >
              <Sparkles size={14} className="text-emerald-600" />
              <span>Use Official Nexora Emblem & Palette</span>
            </button>

            {replacementFile && (
              <button
                type="button"
                onClick={() => {
                  setReplacementFile(null)
                  setReplacementPreview(null)
                }}
                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Clear replacement
              </button>
            )}
          </div>

          {replacementPreview && (
            <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-canvas border border-line">
              <img
                src={replacementPreview}
                alt="Replacement preview"
                className="w-14 h-14 object-contain rounded border border-line bg-white"
              />
              <div className="text-xs">
                <p className="font-bold text-ink">{replacementFile?.name}</p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Replacement image queued — will replace unapproved visual asset upon resubmission
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Copy Area */}
      <div className="space-y-1.5">
        <label htmlFor="revised-text" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          {s.contentType === 'IMAGE' ? 'In-Image OCR Extracted Text & Copy' : 'Revised Content Copy'}
        </label>
        <textarea
          id="revised-text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink leading-relaxed focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
        />
        {applied > 0 && s.contentType !== 'IMAGE' && (
          <p className="text-[11px] text-muted">
            {applied} suggested correction{applied === 1 ? '' : 's'} applied automatically. Edit as needed, then resubmit.
          </p>
        )}
      </div>

      {hasVisualViolations && !replacementFile && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <span>
            <strong>Warning:</strong> You have not selected a replacement image. ClaimLedger will re-verify the unapproved image and maintain the visual violation.
          </span>
        </div>
      )}

      {m.isError && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">
          {m.error instanceof Error ? m.error.message : 'Could not resubmit revision.'}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={text.trim().length < 3 || m.isPending}
          onClick={() => m.mutate()}
          className="rounded-xl bg-brand px-4 py-2 font-bold text-white hover:bg-brand-strong disabled:opacity-60 cursor-pointer shadow-2xs"
        >
          {m.isPending ? 'Verifying Revision…' : 'Resubmit Revision'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReplacementFile(null)
            setReplacementPreview(null)
          }}
          className="rounded-xl border border-line px-4 py-2 font-semibold text-muted hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
