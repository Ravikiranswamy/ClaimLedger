import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  ExternalLink,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Maximize2,
  Palette,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AuditTimeline, formatWhen } from '../components/AuditTimeline'
import { EvidenceCard } from '../components/EvidenceCard'
import { StatusPill } from '../components/StatusPill'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { buildSegments } from '../lib/highlight'
import { useSecureMediaUrl } from '../lib/media'
import type { ClaimState } from '../types'

const MARK: Record<ClaimState, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-950 border-b-2 border-emerald-500 font-medium',
  VIOLATION: 'bg-rose-100 text-rose-950 border-b-2 border-rose-500 font-semibold',
  UNVERIFIED: 'bg-amber-100 text-amber-950 border-b-2 border-amber-500 font-medium',
  CONFLICT: 'bg-purple-100 text-purple-950 border-b-2 border-purple-500 font-medium',
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  PRICE: 'Pricing Claim',
  PROMOTION: 'Promotional Statement',
  FEATURE: 'Product Feature',
  FACTUAL: 'Factual Statement',
  TERMINOLOGY: 'Brand Terminology',
  TONE: 'Tone of Voice',
  VISUAL_BRAND: 'Visual Brand Asset',
  OTHER: 'General Claim',
}

export function AdminSubmissionDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isManager = user?.role === 'DEPT_MANAGER'
  const backUrl = isManager ? '/department/submissions' : '/admin/submissions'
  const backLabel = isManager ? 'Back to Department Submissions' : 'Back to Content & Submissions'

  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [findingsTab, setFindingsTab] = useState<'ALL' | 'TEXT' | 'VISUAL'>('ALL')

  // Query submission details
  const subQ = useQuery({
    queryKey: ['admin-submission-detail', id],
    queryFn: () => api.getSubmission(id),
  })

  // Query audit history for reviewer decisions
  const auditQ = useQuery({
    queryKey: ['admin-submission-audit', id],
    queryFn: () => api.getAudit(id),
  })

  const s = subQ.data
  const auditEntries = auditQ.data ?? []

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

  // Auto-select first flagged claim on load
  useEffect(() => {
    if (!s) return
    if (selectedClaimId && s.claims.some((c) => c.id === selectedClaimId)) return
    const firstFlagged = s.claims.find((c) => c.verificationStatus !== 'VERIFIED') ?? s.claims[0]
    setSelectedClaimId(firstFlagged?.id ?? null)
  }, [s, selectedClaimId])

  // Split text content into highlighted claim segments
  const { segments, unlocated } = useMemo(
    () => (s ? buildSegments(s.content, s.claims) : { segments: [], unlocated: [] as string[] }),
    [s]
  )

  if (subQ.isLoading) {
    return (
      <div className="p-12 text-center text-muted">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-2" />
        <p className="text-sm font-medium">Loading submission and verification analysis…</p>
      </div>
    )
  }

  if (subQ.isError || !s) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert size={20} className="text-rose-600" />
          <span>Could not load submission</span>
        </div>
        <p className="mt-1 text-sm text-rose-800">
          The requested submission does not exist or you do not have permission to view it.
        </p>
        <Link
          to="/admin/submissions"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-900 underline hover:text-black"
        >
          <ArrowLeft size={14} /> Back to Content & Submissions
        </Link>
      </div>
    )
  }

  // Selected claim
  const currentClaim = s.claims.find((c) => c.id === selectedClaimId) ?? s.claims[0] ?? null

  // Claim counts
  const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
  const violationCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
  const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
  const conflictCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length
  const totalClaims = s.claims.length

  // Find latest reviewer action from audit entries
  const latestReviewerAction = auditEntries
    .slice()
    .reverse()
    .find((a) =>
      ['REVIEWER_APPROVED', 'REVIEWER_CHANGES_REQUESTED', 'REVIEWER_REJECTED'].includes(a.action)
    )

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Back Navigation & Header */}
      <div>
        <Link
          to={backUrl}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition cursor-pointer"
        >
          <ArrowLeft size={14} /> {backLabel}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted mb-1.5">
              <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-800">
                {s.departmentName ?? 'General Department'}
              </span>
              <span>·</span>
              <span>By {s.submittedByName ?? 'Creator'}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {formatWhen(s.createdAt)}
              </span>
              {s.revisionNumber > 1 && (
                <span className="rounded bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                  Revision {s.revisionNumber}
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-[#0A1F36]">
              {s.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <SubmissionStatusChip status={s.status} />
          </div>
        </div>
      </div>

      {/* 2. Oversight Banner */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-[#0F766E] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#0F766E]">
              {isManager ? 'Department Oversight Mode · Read-Only Verification' : 'Admin Governance Oversight'}
            </p>
            <p className="mt-0.5 text-slate-700">
              {isManager
                ? 'You are viewing this departmental submission in read-only oversight mode. Automated claim extractions, grounded Tier 1 evidence, and revision trails are fully auditable. Review decisions are recorded by Authorised Reviewers.'
                : 'You are viewing this submission in read-only governance mode. AI claim extraction, authority resolution against Tier 1 catalogues, and revision histories are fully auditable. Review decisions are recorded by Authorised Reviewers.'}
            </p>
          </div>
        </div>
        {!isManager && (
          <Link
            to="/review"
            className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-white border border-teal-300 px-3 py-1.5 font-semibold text-[#0F766E] hover:bg-teal-50 transition"
          >
            View Reviewer Queue <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {/* 3. Overall Compliance Analysis Ribbon */}
      <section aria-labelledby="compliance-ribbon" className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
        <h2 id="compliance-ribbon" className="sr-only">Compliance Analysis Summary</h2>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Overall Compliance Verdict</p>
            <div className="mt-1 flex items-center gap-2">
              {violationCount > 0 ? (
                <>
                  <span className="flex h-3 w-3 rounded-full bg-rose-500" />
                  <span className="font-display text-lg font-bold text-rose-950">
                    {violationCount} Brand Truth Violation{violationCount > 1 ? 's' : ''} Intercepted
                  </span>
                </>
              ) : unverifiedCount > 0 ? (
                <>
                  <span className="flex h-3 w-3 rounded-full bg-amber-500" />
                  <span className="font-display text-lg font-bold text-amber-950">
                    {unverifiedCount} Unverified Claim{unverifiedCount > 1 ? 's' : ''} Require Substantiation
                  </span>
                </>
              ) : totalClaims > 0 ? (
                <>
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-display text-lg font-bold text-emerald-950">
                    100% Brand Truth Grounded ({verifiedCount} Verified)
                  </span>
                </>
              ) : (
                <span className="font-display text-lg font-bold text-slate-700">
                  No verifiable brand claims detected
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              Evaluated deterministically against approved Nexora Knowledge Base with Tier 1 override rules.
            </p>
          </div>

          {/* Counts Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-xl border border-line bg-canvas px-3 py-1.5 font-semibold text-slate-700">
              Total Claims: <strong>{totalClaims}</strong>
            </span>
            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">
              Verified: <strong>{verifiedCount}</strong>
            </span>
            {violationCount > 0 && (
              <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-800">
                Violations: <strong>{violationCount}</strong>
              </span>
            )}
            {unverifiedCount > 0 && (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">
                Unverified: <strong>{unverifiedCount}</strong>
              </span>
            )}
            {conflictCount > 0 && (
              <span className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 font-semibold text-purple-800">
                Conflicts: <strong>{conflictCount}</strong>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 4. Main Split Workspace: Submitted Content (Left) + Claims & Evidence Inspector (Right) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* LEFT COLUMN: Submitted Content & Highlighting */}
        <div className="space-y-4">
          <section aria-labelledby="content-heading" className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#0F766E]" />
                <h2 id="content-heading" className="font-display text-sm font-bold uppercase tracking-wider text-slate-800">
                  {s.contentType === 'IMAGE' ? 'Submitted Visual Asset' : 'Original Submitted Content'}
                </h2>
              </div>
              <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-xs font-mono font-semibold text-muted uppercase">
                {s.contentType ?? 'TEXT'}
              </span>
            </div>

            {/* If IMAGE submission, show image preview with zoom lightbox button */}
            {s.contentType === 'IMAGE' && (
              <div className="mb-4 space-y-3">
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

            {/* If PDF submission, show PDF metadata card */}
            {s.contentType === 'PDF' && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-rose-950">
                    <FileText size={16} className="text-rose-600" />
                    <span>Uploaded PDF Document</span>
                  </div>
                  <span className="text-muted font-mono">{s.filePath ? s.filePath.split('/').pop() : 'document.pdf'}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Content extracted and vectorized into Neon pgvector embeddings for semantic grounding.
                </p>
              </div>
            )}

            {/* In-Image OCR Header */}
            {s.contentType === 'IMAGE' && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  In-Image OCR Extracted Text:
                </span>
                <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-[11px] font-mono text-muted">
                  {s.content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            )}

            {/* Content text with interactive highlighted spans */}
            <div className="rounded-xl border border-line/80 bg-canvas p-5 text-base leading-relaxed text-ink whitespace-pre-wrap">
              {segments.map((seg, i) => {
                if (!seg.claimId) {
                  return <span key={i}>{seg.text}</span>
                }

                const claimObj = s.claims.find((c) => c.id === seg.claimId)
                const status = claimObj ? claimObj.verificationStatus : 'UNVERIFIED'
                const isSelected = seg.claimId === selectedClaimId

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedClaimId(seg.claimId!)}
                    aria-pressed={isSelected}
                    title={`Click to inspect claim: "${seg.text}" (${status})`}
                    className={`rounded px-1.5 py-0.5 transition-all text-left inline font-medium cursor-pointer ${
                      MARK[status]
                    } ${
                      isSelected
                        ? 'ring-2 ring-offset-1 ring-navy shadow-xs font-bold'
                        : 'hover:opacity-85'
                    }`}
                  >
                    {seg.text}
                  </button>
                )
              })}
            </div>

            {/* Unlocated claims notice */}
            {unlocated.length > 0 && (
              <p className="mt-3 text-xs text-muted flex items-center gap-1.5">
                <HelpCircle size={14} />
                <span>
                  {unlocated.length} claim{unlocated.length === 1 ? '' : 's'} could not be mapped to exact string offsets (likely paraphrased), but {unlocated.length === 1 ? 'is' : 'are'} listed in the inspector on the right.
                </span>
              </p>
            )}

            {/* Guidance on interactive highlighting */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-[11px] text-muted">
              <span className="font-semibold text-slate-700">Click any highlight to inspect:</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Verified
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Violation
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Unverified
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Conflict
              </span>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Selected Claim & Grounding Inspector */}
        <div className="space-y-4">
          <aside aria-label="Claims and Evidence Inspector" className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-[#0F766E]" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-800">
                  Deterministic Claim Inspector
                </h2>
              </div>
              <span className="text-xs font-bold text-muted">
                {totalClaims} Detected Claim{totalClaims === 1 ? '' : 's'}
              </span>
            </div>

            {/* Sub-filter tabs when visual claims exist or content is IMAGE */}
            {(visualClaims.length > 0 || s.contentType === 'IMAGE') && (
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-line pb-3">
                <button
                  type="button"
                  onClick={() => setFindingsTab('ALL')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    findingsTab === 'ALL'
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                  }`}
                >
                  <Layers size={13} />
                  <span>All ({s.claims.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFindingsTab('TEXT')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    findingsTab === 'TEXT'
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                  }`}
                >
                  <FileText size={13} />
                  <span>Factual ({textClaims.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFindingsTab('VISUAL')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    findingsTab === 'VISUAL'
                      ? 'bg-[#0F766E] text-white shadow-xs'
                      : 'bg-canvas text-slate-700 hover:bg-slate-100 border border-line'
                  }`}
                >
                  <Palette size={13} />
                  <span>Visual Brand ({visualClaims.length})</span>
                </button>
              </div>
            )}

            {/* Claim Navigation Tabs */}
            {displayedClaims.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {displayedClaims.map((c, idx) => {
                  const isSelected = c.id === selectedClaimId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClaimId(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-navy text-white shadow-2xs'
                          : 'bg-canvas text-slate-700 border border-line hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          c.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-400'
                            : c.verificationStatus === 'VIOLATION'
                            ? 'bg-rose-400'
                            : c.verificationStatus === 'CONFLICT'
                            ? 'bg-purple-400'
                            : 'bg-amber-400'
                        }`}
                      />
                      Claim {idx + 1}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Currently Selected Claim Card */}
            {currentClaim ? (
              <div className="space-y-4">
                {/* Claim Statement & Verdict */}
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    {currentClaim.claimType === 'VISUAL_BRAND' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-[#0F766E]">
                        <Palette size={12} />
                        VISUAL BRAND GOVERNANCE
                      </span>
                    ) : (
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-800 font-mono">
                        {CLAIM_TYPE_LABELS[currentClaim.claimType ?? 'OTHER'] ?? currentClaim.claimType}
                      </span>
                    )}
                    <StatusPill state={currentClaim.verificationStatus} />
                  </div>

                  <p className="font-display text-base font-bold text-ink">
                    “{currentClaim.claimText}”
                  </p>

                  {/* Detected Color Swatch Preview for Visual Brand claims */}
                  {currentClaim.claimType === 'VISUAL_BRAND' && (() => {
                    const hexMatch = (currentClaim.claimText + ' ' + (currentClaim.explanation ?? '')).match(/#([0-9a-fA-F]{6})/i)
                    if (!hexMatch) return null
                    return (
                      <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs">
                        <span
                          className="h-4 w-4 rounded border border-black/20 shadow-xs shrink-0"
                          style={{ backgroundColor: hexMatch[0] }}
                        />
                        <span className="font-mono font-bold text-slate-900">{hexMatch[0]}</span>
                        <span className="text-muted">Detected Palette Sample</span>
                      </div>
                    )
                  })()}

                  {currentClaim.aiConfidence != null && (
                    <p className="mt-1 text-xs text-muted">
                      AI Extraction Confidence: <strong>{Math.round(currentClaim.aiConfidence * 100)}%</strong>
                    </p>
                  )}
                </div>

                {/* Explanation of the Issue / Verdict */}
                {currentClaim.explanation && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Deterministic Engine Finding
                    </p>
                    <p className="text-sm leading-relaxed text-slate-800">
                      {currentClaim.explanation}
                    </p>
                  </div>
                )}

                {/* Suggested Correction (if Flagged) */}
                {currentClaim.suggestedCorrection && currentClaim.verificationStatus !== 'VERIFIED' && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F766E] mb-1">
                      <Lightbulb size={16} />
                      <span>Suggested Compliant Wording</span>
                    </div>
                    <p className="font-display text-base font-bold text-teal-950">
                      {currentClaim.suggestedCorrection}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Replaces outdated or superlative claim with exact grounded terminology from Tier 1 knowledge.
                    </p>
                  </div>
                )}

                {/* Supporting Approved Evidence Citations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Supporting Evidence Citations ({currentClaim.evidence.length})
                    </p>
                    <span className="text-[11px] font-semibold text-[#0F766E]">
                      Grounded in Approved Knowledge
                    </span>
                  </div>

                  {currentClaim.evidence.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <AlertTriangle size={15} className="text-amber-600" />
                        <span>No Authoritative Grounding Found</span>
                      </div>
                      <p>
                        No approved guideline, pricing catalogue, or policy document in the Nexora Knowledge Base mentions or substantiates this claim. It is flagged as unverified to prevent brand drift.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {currentClaim.evidence.map((e) => (
                        <EvidenceCard key={e.id} e={e} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No claims flagged in this submission.</p>
            )}
          </aside>
        </div>
      </div>

      {/* 5. Review & Revision Tracking (Audit Timeline and Reviewer Decisions) */}
      <section aria-labelledby="review-history-heading" className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          <div>
            <h2 id="review-history-heading" className="font-display text-lg font-bold text-[#0A1F36]">
              Review & Revision History
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Immutable audit trail recording creator revisions, AI analysis runs, and reviewer decisions.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Append-Only Audit Log
          </span>
        </div>

        {/* Latest Reviewer Decision Box (if available) */}
        {latestReviewerAction && (
          <div className="mb-6 rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Latest Reviewer Verdict
              </span>
              <span className="text-xs text-muted">{formatWhen(latestReviewerAction.createdAt)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold text-ink">{latestReviewerAction.actorName}</span>
              <span className="text-xs text-muted">({latestReviewerAction.actorRole ?? 'Reviewer'})</span>
            </div>
            {latestReviewerAction.comment && (
              <blockquote className="mt-2 border-l-3 border-[#0F766E] pl-3 text-sm text-slate-700 italic">
                “{latestReviewerAction.comment}”
              </blockquote>
            )}
          </div>
        )}

        {/* Chronological Audit Timeline */}
        <AuditTimeline submissionId={s.id} />
      </section>

      {/* ========================================================================= */}
      {/* 6. FULLSCREEN IMAGE LIGHTBOX MODAL                                        */}
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
