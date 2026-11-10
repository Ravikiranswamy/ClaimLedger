import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Filter,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Tag,
  X,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import type { AuthorityTier, KnowledgeDoc } from '../types'
import { DEPARTMENTS } from '../types'

const TIER_BADGES: Record<AuthorityTier, { label: string; desc: string; cls: string }> = {
  TIER_1: {
    label: 'Tier 1 — Master Authority',
    desc: 'Primary company-wide authority, subject to applicable scope, validity and approved exceptions.',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  TIER_2: {
    label: 'Tier 2 — Departmental Scope',
    desc: 'Authoritative within specified department or campaign scope.',
    cls: 'bg-blue-50 text-blue-800 border-blue-300',
  },
  TIER_3: {
    label: 'Tier 3 — Supporting Material',
    desc: 'Reference brochures and legacy materials. Subject to obsolescence.',
    cls: 'bg-purple-50 text-purple-800 border-purple-300',
  },
}

function getDocumentStatusInfo(doc: KnowledgeDoc) {
  const isExpired = Boolean(doc.expiryDate && new Date(doc.expiryDate) < new Date())

  if (doc.approvalStatus === 'APPROVED') {
    if (isExpired) {
      return {
        badgeLabel: 'Expired',
        badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200',
        footerIcon: AlertCircle,
        footerLabel: 'Expired · Non-authoritative',
        footerCls: 'text-rose-600',
        isAuthoritative: false,
      }
    }
    return {
      badgeLabel: 'Approved & Active',
      badgeCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      footerIcon: CheckCircle2,
      footerLabel: 'Approved & Active Source',
      footerCls: 'text-emerald-700',
      isAuthoritative: true,
    }
  }

  if (doc.approvalStatus === 'DRAFT') {
    return {
      badgeLabel: 'Draft',
      badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200',
      footerIcon: Clock,
      footerLabel: 'Draft · Pending Approval',
      footerCls: 'text-amber-700',
      isAuthoritative: false,
    }
  }

  if (doc.approvalStatus === 'SUPERSEDED') {
    return {
      badgeLabel: 'Superseded',
      badgeCls: 'bg-slate-100 text-slate-700 border border-slate-300',
      footerIcon: RotateCcw,
      footerLabel: 'Superseded · Non-authoritative',
      footerCls: 'text-slate-600',
      isAuthoritative: false,
    }
  }

  if (doc.approvalStatus === 'REJECTED') {
    return {
      badgeLabel: isExpired ? 'Rejected & Expired' : 'Rejected',
      badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200',
      footerIcon: XCircle,
      footerLabel: 'Rejected · Non-authoritative',
      footerCls: 'text-rose-600',
      isAuthoritative: false,
    }
  }

  if (doc.approvalStatus === 'EXPIRED') {
    return {
      badgeLabel: 'Expired',
      badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200',
      footerIcon: AlertCircle,
      footerLabel: 'Expired · Non-authoritative',
      footerCls: 'text-rose-600',
      isAuthoritative: false,
    }
  }

  return {
    badgeLabel: doc.approvalStatus,
    badgeCls: 'bg-slate-100 text-slate-700 border border-slate-300',
    footerIcon: AlertCircle,
    footerLabel: `${doc.approvalStatus} · Non-authoritative`,
    footerCls: 'text-muted',
    isAuthoritative: false,
  }
}

export function KnowledgeBase() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEngineGuide, setShowEngineGuide] = useState(false)

  const isCreator = user?.role === 'CREATOR'
  const docsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments(), enabled: !isCreator })
  const docs = docsQ.data ?? []

  if (isCreator) {
    return <Navigate to="/guidelines" replace />
  }

  const baseDocs = docs
  const filtered = baseDocs.filter((d) => {
    const matchesTier = tierFilter === 'ALL' || d.authorityTier === tierFilter
    const matchesCategory = categoryFilter === 'ALL' || (d.category && d.category.toUpperCase() === categoryFilter.toUpperCase())
    return matchesTier && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={user?.role === 'CREATOR' ? 'Brand Guidelines & Product Truth' : 'Authoritative Knowledge Base'}
          subtitle={
            user?.role === 'CREATOR'
              ? 'Approved company brand guidelines, product facts, and authoritative terminology in read-only mode.'
              : 'Document repository backing ClaimLedger’s 6-step deterministic hierarchy and pgvector semantic retrieval.'
          }
        />
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-strong"
          >
            <Plus size={18} /> Upload Knowledge Doc
          </button>
        )}
      </div>

      {/* Tier Explanation Strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['TIER_1', 'TIER_2', 'TIER_3'] as const).map((tier) => {
          const badge = TIER_BADGES[tier]
          return (
            <div
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? 'ALL' : tier)}
              className={`cursor-pointer rounded-2xl border p-4 transition ${badge.cls} ${
                tierFilter === tier ? 'ring-2 ring-ink shadow-sm' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{badge.label}</span>
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {baseDocs.filter((d) => d.authorityTier === tier).length} doc(s)
                </span>
              </div>
              <p className="mt-1 text-xs opacity-90">{badge.desc}</p>
            </div>
          )
        })}
      </div>

      {/* 6-Step Deterministic Authority Engine Guide for Admins & Reviewers */}
      {user?.role !== 'CREATOR' && (
        <div className="rounded-2xl border border-line bg-gradient-to-br from-brand-soft/30 via-white to-canvas p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-brand">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Sparkles size={18} />
              </span>
              <div>
                <h3 className="font-display font-bold text-sm text-[#0A1F36]">
                  Deterministic Authority Engine — 6-Step Resolution Hierarchy
                </h3>
                <p className="text-xs text-muted">
                  How ClaimLedger evaluates document authority, scopes, and validity before rendering compliance verdicts.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEngineGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand shadow-xs hover:bg-canvas transition"
            >
              {showEngineGuide ? 'Hide Hierarchy Details' : 'View 6-Step Hierarchy Details'}
              <ChevronDown size={14} className={`transition-transform duration-200 ${showEngineGuide ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showEngineGuide && (
            <div className="mt-4 pt-4 border-t border-line/70">
              <p className="text-xs text-muted mb-3 leading-relaxed">
                ClaimLedger implements a strict <strong>6-Step Pure Java Authority Resolution Hierarchy</strong> before rendering compliance verdicts on extracted claims:
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">1</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Approval Status</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Only approved documents establish authoritative truth. Draft, superseded, and rejected sources are excluded from verdicts.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">2</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Temporal Validity</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Evaluates effective and expiry dates. Expired documents are strictly distinguished from superseded ones.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">3</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Scope Applicability</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Matches department, product, region, and channel before ranking. Authorised departmental exceptions apply within scope.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">4</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Authority Tier Ranking</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Ranks candidates (Tier 1 Master &gt; Tier 2 Departmental &gt; Tier 3 Collateral) for applicable scoped sources.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">5</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Version Resolution</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Among same-tier documents within the applicable scope, selects the highest applicable semantic version.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-xs">6</span>
                    <span className="font-bold text-xs text-[#0A1F36]">Contradiction Detection</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Performs explicit numeric/arithmetic matching; flags conflicting authoritative rules as CONFLICT.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Filter size={16} className="text-muted" />
        <span className="text-sm font-semibold text-muted">Filter Tier:</span>
        {(['ALL', 'TIER_1', 'TIER_2', 'TIER_3'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              tierFilter === t ? 'bg-navy text-white' : 'bg-surface border border-line text-muted hover:bg-canvas'
            }`}
          >
            {t === 'ALL' ? 'All Tiers' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Category Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">Category:</span>
        {[
          { id: 'ALL', label: 'All Knowledge', icon: Database },
          { id: 'ASSETS', label: 'Visual Brand Assets', icon: Palette },
          { id: 'BRAND', label: 'Brand & Voice', icon: Shield },
          { id: 'PRODUCTS', label: 'Product Truth', icon: Tag },
          { id: 'TERMINOLOGY', label: 'Terminology', icon: FileText },
          { id: 'DEPARTMENTAL', label: 'Departmental', icon: Building2 },
        ].map((cat) => {
          const Icon = cat.icon
          const count = cat.id === 'ALL'
            ? baseDocs.length
            : baseDocs.filter((d) => d.category && d.category.toUpperCase() === cat.id).length
          const isActive = categoryFilter === cat.id

          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface border border-line text-slate-700 hover:bg-canvas'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-muted'} />
              <span>{cat.label}</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-canvas text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Documents List */}
      {docsQ.isLoading && <p className="py-12 text-center text-muted">Loading knowledge documents…</p>}
      {docsQ.isError && (
        <p className="rounded-xl bg-violation-soft p-4 text-violation">
          Could not load knowledge documents. Ensure backend is running.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((doc) => {
          const tier = TIER_BADGES[doc.authorityTier]
          const statusInfo = getDocumentStatusInfo(doc)
          const StatusFooterIcon = statusInfo.footerIcon
          const isSuperseded = doc.approvalStatus === 'SUPERSEDED'
          const isDraft = doc.approvalStatus === 'DRAFT'
          const isRejectedOrExpired =
            doc.approvalStatus === 'REJECTED' ||
            doc.approvalStatus === 'EXPIRED' ||
            Boolean(doc.expiryDate && new Date(doc.expiryDate) < new Date())
          const isVisualAsset = doc.category?.toUpperCase() === 'ASSETS'

          const deptLabel =
            doc.name.includes('Compensation') || doc.departmentName?.includes('Compensation')
              ? 'HR & Compensation'
              : doc.departmentName ?? 'Cross-Departmental (All)'
          const hasValidProductScope = doc.productScope && doc.productScope !== 'HR & Compensation'

          return (
            <div
              key={doc.id}
              className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-sm transition hover:border-brand ${
                isSuperseded
                  ? 'border-amber-200 bg-amber-50/20'
                  : isDraft
                  ? 'border-amber-200 bg-amber-50/10'
                  : isRejectedOrExpired && doc.approvalStatus !== 'APPROVED'
                  ? 'border-rose-200 bg-rose-50/10'
                  : isVisualAsset
                  ? 'border-teal-200/80 bg-teal-50/10'
                  : 'border-line'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${isVisualAsset ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-canvas text-navy'}`}>
                      {isVisualAsset ? <Palette size={18} /> : <FileText size={18} />}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-ink leading-tight">{doc.name}</h3>
                        {isVisualAsset && (
                          <span className="rounded-md bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 text-[10px] font-bold uppercase">
                            Visual Asset
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">Version {doc.version} · {doc.channel ?? 'All Channels'}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusInfo.badgeCls}`}
                  >
                    {statusInfo.badgeLabel}
                  </span>
                </div>

                {/* Approved Palette Ribbon for Visual Assets */}
                {isVisualAsset && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-canvas p-2.5 border border-line/60">
                    <span className="text-[11px] font-bold text-muted uppercase">Palette:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-4 w-4 rounded-full bg-[#0A1F36] border border-line shadow-xs" title="Deep Navy (#0A1F36)" />
                      <span className="inline-block h-4 w-4 rounded-full bg-[#0F766E] border border-line shadow-xs" title="Primary Teal (#0F766E)" />
                      <span className="inline-block h-4 w-4 rounded-full bg-[#14B8A6] border border-line shadow-xs" title="Teal Accent (#14B8A6)" />
                      <span className="inline-block h-4 w-4 rounded-full bg-[#5EEAD4] border border-line shadow-xs" title="Vibrant Mint (#5EEAD4)" />
                    </div>
                    <span className="text-[10px] text-muted font-mono ml-auto">#0A1F36 · #0F766E · #5EEAD4</span>
                  </div>
                )}

                <div className="mt-4 space-y-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-brand shrink-0" />
                    <span className="font-semibold text-ink">{tier.label.split('—')[0]}</span>
                    <span>({tier.desc.split('.')[0]})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-muted shrink-0" />
                    <span>Department Scope: <strong className="text-ink">{deptLabel}</strong></span>
                  </div>
                  {hasValidProductScope && (
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-muted shrink-0" />
                      <span>Product Scope: <strong className="text-ink">{doc.productScope}</strong></span>
                    </div>
                  )}
                  {doc.effectiveDate && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted shrink-0" />
                      <span>Effective: {doc.effectiveDate} {doc.expiryDate ? `to ${doc.expiryDate}` : '(Ongoing)'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${statusInfo.footerCls}`}>
                  <StatusFooterIcon size={14} />
                  <span>{statusInfo.footerLabel}</span>
                </span>
                {user?.role !== 'CREATOR' ? (
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    Inspect Chunks & Vectors <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    View Guidelines <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chunk / Guideline Inspector Modal */}
      {selectedDoc && (
        user?.role === 'CREATOR' ? (
          <CreatorGuidelineModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        ) : (
          <ChunkInspectorModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )
      )}

      {/* Upload Modal - Only for ADMIN */}
      {showUploadModal && user?.role === 'ADMIN' && (
        <UploadDocModal onClose={() => setShowUploadModal(false)} onUploaded={() => qc.invalidateQueries({ queryKey: ['documents'] })} />
      )}
    </div>
  )
}

function CreatorGuidelineModal({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  const tier = TIER_BADGES[doc.authorityTier]
  const statusInfo = getDocumentStatusInfo(doc)
  const deptLabel =
    doc.name.includes('Compensation') || doc.departmentName?.includes('Compensation')
      ? 'HR & Compensation'
      : doc.departmentName ?? 'Cross-Departmental (All)'
  const hasValidProductScope = doc.productScope && doc.productScope !== 'HR & Compensation'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-3xl bg-surface shadow-2xl flex flex-col border border-line">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg">{doc.name}</h2>
              <p className="text-xs text-muted">Brand Guideline & Reference (Read-Only)</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted hover:bg-canvas hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1 text-sm">
          <div className="rounded-2xl border border-line bg-canvas p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Authority Tier</span>
              <span className="text-xs font-bold text-brand">{tier.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Document Version</span>
              <span className="text-xs font-bold text-ink">{doc.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Department Scope</span>
              <span className="text-xs font-bold text-ink">{deptLabel}</span>
            </div>
            {hasValidProductScope && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Product Scope</span>
                <span className="text-xs font-bold text-ink">{doc.productScope}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Validity</span>
              <span className="text-xs font-bold text-ink">
                {doc.effectiveDate ?? 'Current'} {doc.expiryDate ? `to ${doc.expiryDate}` : '(Ongoing)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Approval Status</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusInfo.badgeCls}`}>
                {statusInfo.badgeLabel}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-brand-soft/40 p-4 text-xs text-ink space-y-1">
            <p className="font-bold text-brand">Creator Notice</p>
            <p className="text-muted leading-relaxed">
              This document is part of the approved single source of truth. Any marketing or communication claims
              you write will be automatically verified against this standard before publication.
            </p>
          </div>
        </div>

        <div className="border-t border-line px-6 py-4 bg-canvas flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-soft">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ChunkInspectorModal({ doc, onClose }: { doc: KnowledgeDoc; onClose: () => void }) {
  const chunksQ = useQuery({
    queryKey: ['document-chunks', doc.id],
    queryFn: () => api.getDocumentChunks(doc.id),
  })

  const chunks = chunksQ.data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-surface shadow-2xl flex flex-col border border-line">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Database size={20} />
            </span>
            <div>
              <h2 className="font-display font-bold text-lg">{doc.name}</h2>
              <p className="text-xs text-muted">Neon PostgreSQL pgvector Chunks ({chunks.length})</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted hover:bg-canvas hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {chunksQ.isLoading && <p className="py-8 text-center text-muted">Retrieving vector chunks…</p>}
          {chunksQ.isSuccess && chunks.length === 0 && (
            <p className="py-8 text-center text-muted">No text chunks extracted for this document.</p>
          )}

          {chunks.map((chunk) => (
            <div key={chunk.id} className="rounded-xl border border-line bg-canvas p-4 text-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-semibold text-ink">Chunk #{chunk.chunkIndex + 1} (Page {chunk.pageNumber})</span>
                <span className="inline-flex items-center gap-1 rounded bg-verified-soft px-2 py-0.5 font-bold text-verified">
                  <CheckCircle2 size={12} /> 768-dim Vector Indexed
                </span>
              </div>
              <p className="font-mono text-xs text-ink bg-surface rounded-lg p-3 border border-line leading-relaxed whitespace-pre-wrap">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-6 py-4 bg-canvas flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-soft">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadDocModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [name, setName] = useState('')
  const [tier, setTier] = useState<AuthorityTier>('TIER_1')
  const [category, setCategory] = useState<string>('ASSETS')
  const [departmentId, setDepartmentId] = useState('')
  const [version, setVersion] = useState('v1.0')
  const [productScope, setProductScope] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const isVisualAsset = category === 'ASSETS'

  const uploadM = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(isVisualAsset ? 'Please select an image or PDF asset file' : 'Please select a PDF file')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name.trim() || file.name)
      fd.append('authorityTier', tier)
      fd.append('category', category)
      fd.append('version', version.trim())
      if (departmentId) fd.append('departmentId', departmentId)
      if (productScope.trim()) fd.append('productScope', productScope.trim())
      return api.uploadDocument(fd)
    },
    onSuccess: () => {
      onUploaded()
      onClose()
    },
    onError: (e) => setErr(e instanceof Error ? e.message : 'Upload failed'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-7 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="font-display font-bold text-xl">Upload Authoritative Asset or Document</h2>
            <p className="text-xs text-muted">Authorised Admin Knowledge Base Repository</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1 text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Knowledge Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium"
            >
              <option value="ASSETS">Visual Brand Assets (Logos, Color Palettes & Graphics)</option>
              <option value="BRAND">Brand Guidelines & Voice Standards</option>
              <option value="PRODUCTS">Product Truth & Master Specifications</option>
              <option value="TERMINOLOGY">Approved Terminology & Dictionaries</option>
              <option value="DEPARTMENTAL">Departmental Scoped Materials</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Document / Asset Name</label>
            <input
              type="text"
              placeholder={isVisualAsset ? 'e.g. Official_Brand_Logomark_v2.png' : 'e.g. Enterprise_Pricing_Matrix_2026.pdf'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Authority Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as AuthorityTier)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
              >
                <option value="TIER_1">Tier 1 — Master Authority</option>
                <option value="TIER_2">Tier 2 — Departmental Scope</option>
                <option value="TIER_3">Tier 3 — Supporting Material</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Version</label>
              <input
                type="text"
                placeholder="v1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Product Scope</label>
            <input
              type="text"
              placeholder="e.g. Nexora Pro, Nexora Enterprise, All"
              value={productScope}
              onChange={(e) => setProductScope(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              <option value="">Cross-Departmental (All)</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              {isVisualAsset ? 'Visual Asset File (PNG, JPG, or PDF)' : 'PDF File'}
            </label>
            <input
              type="file"
              accept={isVisualAsset ? '.pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf' : '.pdf,application/pdf'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-line bg-canvas p-2.5 text-sm"
            />
            {isVisualAsset && (
              <p className="mt-1 text-[11px] text-muted">Upload approved logo variations, promotional graphics, or brand colour references.</p>
            )}
          </div>

          {err && <p className="rounded-lg bg-violation-soft p-3 text-xs text-violation">{err}</p>}

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
            <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:text-ink">
              Cancel
            </button>
            <button
              disabled={!file || uploadM.isPending}
              onClick={() => uploadM.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-brand-strong"
            >
              {uploadM.isPending && <Loader2 size={16} className="animate-spin" />}
              Upload & Index Knowledge Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
