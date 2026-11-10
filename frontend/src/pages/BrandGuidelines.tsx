import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Calendar,
  FileText,
  Info,
  Shield,
  Tag,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import type { AuthorityTier, KnowledgeDoc } from '../types'

const TIER_META: Record<AuthorityTier, { label: string; badgeCls: string; desc: string }> = {
  TIER_1: {
    label: 'Tier 1 — Master Authority',
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Company-wide approved brand guidelines, official product facts, and master information.',
  },
  TIER_2: {
    label: 'Tier 2 — Departmental Scope',
    badgeCls: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Approved department-specific, sales, campaign, or other scoped information.',
  },
  TIER_3: {
    label: 'Tier 3 — Supporting Material',
    badgeCls: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'Reference documents, brochures, and supporting information subject to override.',
  },
}

export function BrandGuidelines() {
  const { user } = useAuth()

  // Applicability Filters
  const [scopeProductFilter, setScopeProductFilter] = useState<string>('ALL')
  const [scopeRegionFilter, setScopeRegionFilter] = useState<string>('ALL')
  const [scopeChannelFilter, setScopeChannelFilter] = useState<string>('ALL')
  const [selectedTier, setSelectedTier] = useState<string>('ALL')
  const [selectedGuideline, setSelectedGuideline] = useState<KnowledgeDoc | null>(null)

  const documentsQ = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(),
  })

  const rawDocs = documentsQ.data ?? []

  // Dynamic filter option discovery
  const availableProducts = useMemo(() => {
    const set = new Set<string>()
    for (const d of rawDocs) {
      if (d.productScope && d.productScope !== 'ALL' && d.productScope !== 'All Products') {
        set.add(d.productScope)
      }
    }
    return Array.from(set).sort()
  }, [rawDocs])

  const availableRegions = useMemo(() => {
    const set = new Set<string>()
    for (const d of rawDocs) {
      if (d.region && d.region !== 'GLOBAL' && d.region !== 'ALL') {
        set.add(d.region)
      }
    }
    return Array.from(set).sort()
  }, [rawDocs])

  const availableChannels = useMemo(() => {
    const set = new Set<string>()
    for (const d of rawDocs) {
      if (d.channel && d.channel !== 'ALL' && d.channel !== 'All Channels') {
        set.add(d.channel)
      }
    }
    return Array.from(set).sort()
  }, [rawDocs])

  // Display only approved, currently valid guidelines applicable to the Creator's department, product, region and channel.
  const applicableGuidelines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    return rawDocs.filter((doc) => {
      // 1. Must be APPROVED (drafts, expired, superseded, and rejected documents are strictly excluded for Creators)
      if (doc.approvalStatus !== 'APPROVED') return false

      // 2. Must be currently valid (effective date <= today, expiry date >= today)
      if (doc.effectiveDate && doc.effectiveDate > today) return false
      if (doc.expiryDate && doc.expiryDate < today) return false

      // 3. Department applicability:
      // Tier 1 documents are Master Authority (universal organisation-wide truth applicable to all departments)
      // Tier 2/3 documents must match the Creator's department (or be universal / unassigned)
      if (doc.authorityTier !== 'TIER_1') {
        if (doc.departmentId && user?.departmentId && doc.departmentId !== user.departmentId) {
          return false
        }
        if (doc.departmentName && user?.departmentName && doc.departmentName.toLowerCase() !== user.departmentName.toLowerCase()) {
          if (doc.departmentId) return false
        }
      }

      // 4. Product scope filter
      if (scopeProductFilter !== 'ALL') {
        const docProd = (doc.productScope ?? '').toLowerCase()
        const targetProd = scopeProductFilter.toLowerCase()
        if (docProd !== 'all' && docProd !== 'all products' && !docProd.includes(targetProd)) {
          return false
        }
      }

      // 5. Region scope filter
      if (scopeRegionFilter !== 'ALL') {
        const docReg = (doc.region ?? '').toLowerCase()
        const targetReg = scopeRegionFilter.toLowerCase()
        if (docReg !== 'global' && docReg !== 'all' && !docReg.includes(targetReg)) {
          return false
        }
      }

      // 6. Channel scope filter
      if (scopeChannelFilter !== 'ALL') {
        const docChan = (doc.channel ?? '').toLowerCase()
        const targetChan = scopeChannelFilter.toLowerCase()
        if (docChan !== 'all' && docChan !== 'all channels' && !docChan.includes(targetChan)) {
          return false
        }
      }

      // 7. Tier filter
      if (selectedTier !== 'ALL' && doc.authorityTier !== selectedTier) {
        return false
      }

      return true
    })
  }, [rawDocs, user, scopeProductFilter, scopeRegionFilter, scopeChannelFilter, selectedTier])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Brand Guidelines & Standards"
        subtitle="Approved, currently valid corporate guidelines, product facts, and messaging standards applicable to your content."
      />

      {/* Tier Explanation Strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['TIER_1', 'TIER_2', 'TIER_3'] as const).map((tier) => {
          const meta = TIER_META[tier]
          const isSelected = selectedTier === tier
          const tierCount = applicableGuidelines.filter((d) => d.authorityTier === tier).length

          return (
            <div
              key={tier}
              onClick={() => setSelectedTier(isSelected ? 'ALL' : tier)}
              className={`cursor-pointer rounded-2xl border p-4.5 transition shadow-xs ${
                isSelected ? 'ring-2 ring-brand bg-white shadow-md' : 'bg-surface hover:bg-canvas border-line'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${meta.badgeCls}`}>
                  {meta.label}
                </span>
                <span className="text-xs font-bold text-muted">
                  {tierCount} active
                </span>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                {meta.desc}
              </p>
            </div>
          )
        })}
      </div>

      {/* Scope Context & Applicability Toolbar */}
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Department indicator */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Shield size={16} />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Your Department Jurisdiction</span>
              <p className="font-semibold text-sm text-ink">
                {user?.departmentName ?? 'Marketing Department'}
              </p>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Product */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-prod" className="text-xs text-muted font-medium">Product:</label>
              <select
                id="filter-prod"
                value={scopeProductFilter}
                onChange={(e) => setScopeProductFilter(e.target.value)}
                className="rounded-xl border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="ALL">All Products</option>
                {availableProducts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-reg" className="text-xs text-muted font-medium">Region:</label>
              <select
                id="filter-reg"
                value={scopeRegionFilter}
                onChange={(e) => setScopeRegionFilter(e.target.value)}
                className="rounded-xl border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="ALL">All Regions</option>
                <option value="GLOBAL">GLOBAL</option>
                {availableRegions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Channel */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-chan" className="text-xs text-muted font-medium">Channel:</label>
              <select
                id="filter-chan"
                value={scopeChannelFilter}
                onChange={(e) => setScopeChannelFilter(e.target.value)}
                className="rounded-xl border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="ALL">All Channels</option>
                {availableChannels.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Reset Filter Button if active */}
            {(scopeProductFilter !== 'ALL' || scopeRegionFilter !== 'ALL' || scopeChannelFilter !== 'ALL' || selectedTier !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setScopeProductFilter('ALL')
                  setScopeRegionFilter('ALL')
                  setScopeChannelFilter('ALL')
                  setSelectedTier('ALL')
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guidelines Grid */}
      {documentsQ.isLoading && <p className="py-12 text-center text-muted">Loading brand guidelines…</p>}

      {documentsQ.isSuccess && applicableGuidelines.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
          <BookOpen size={44} className="mx-auto text-muted opacity-50" />
          <h3 className="mt-3 font-display font-bold text-lg text-ink">No applicable guidelines match your selection</h3>
          <p className="mt-1 text-xs text-muted max-w-md mx-auto">
            There are currently no approved and active guidelines for the selected combination of department, product, region, and channel.
          </p>
          <button
            type="button"
            onClick={() => {
              setScopeProductFilter('ALL')
              setScopeRegionFilter('ALL')
              setScopeChannelFilter('ALL')
              setSelectedTier('ALL')
            }}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
          >
            Clear applicability filters
          </button>
        </div>
      )}

      {documentsQ.isSuccess && applicableGuidelines.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {applicableGuidelines.map((doc) => {
            const meta = TIER_META[doc.authorityTier]

            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 shadow-xs transition hover:border-brand hover:shadow-sm"
              >
                <div>
                  {/* Card Header with Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      title={meta.desc}
                      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeCls}`}
                    >
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-0.5 text-[10px] font-bold text-verified uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-verified" />
                      Approved & Active
                    </span>
                  </div>

                  {/* Document Title */}
                  <h3 className="mt-4 font-display font-bold text-base text-ink leading-snug">
                    {doc.name}
                  </h3>

                  {/* Version & Category Info */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <span className="font-mono font-semibold text-slate-700">v{doc.version ?? '1.0'}</span>
                    <span>·</span>
                    <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-[11px] font-medium text-slate-700">
                      {doc.category ?? 'BRAND'}
                    </span>
                    <span>·</span>
                    <span>{doc.channel ?? 'All Channels'}</span>
                  </div>

                  {/* Metadata List */}
                  <div className="mt-4 space-y-2 rounded-2xl bg-canvas p-3.5 text-xs text-muted border border-line/60">
                    <p className="flex items-center gap-2">
                      <Tag size={13} className="text-muted shrink-0" />
                      <span className="truncate">
                        Scope: <strong className="text-slate-800">{doc.productScope ?? 'All Products'}</strong> · {doc.region ?? 'GLOBAL'}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar size={13} className="text-muted shrink-0" />
                      <span>
                        Valid: <strong className="text-slate-800">{doc.effectiveDate ?? 'Current'}</strong> to{' '}
                        <strong className="text-slate-800">{doc.expiryDate ?? 'Ongoing'}</strong>
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Shield size={13} className="text-muted shrink-0" />
                      <span className="truncate">
                        Jurisdiction: <strong className="text-slate-800">{doc.departmentName ?? 'Organisation-wide'}</strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Card Action */}
                <div className="mt-5 border-t border-line pt-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedGuideline(doc)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline cursor-pointer"
                  >
                    View Guideline Scope →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Read-Only Guideline Scope Modal */}
      {selectedGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl bg-surface shadow-2xl flex flex-col border border-line animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line px-6 py-5 bg-canvas shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <FileText size={20} />
                </span>
                <div>
                  <h2 className="font-display font-bold text-lg text-ink">{selectedGuideline.name}</h2>
                  <p className="text-xs text-muted">Authoritative Brand Guideline (Read-Only Scope)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuideline(null)}
                className="rounded-xl p-1.5 text-muted hover:bg-surface hover:text-ink transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1 text-sm">
              <div className="rounded-2xl border border-line bg-canvas p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Authority Tier</span>
                  <span className="text-xs font-bold text-brand">
                    {TIER_META[selectedGuideline.authorityTier].label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Version</span>
                  <span className="text-xs font-mono font-bold text-ink">v{selectedGuideline.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Department Scope</span>
                  <span className="text-xs font-bold text-ink">
                    {selectedGuideline.authorityTier === 'TIER_1'
                      ? 'Universal (All Departments)'
                      : selectedGuideline.departmentName ?? 'Department Specific'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Product Scope</span>
                  <span className="text-xs font-bold text-ink">{selectedGuideline.productScope ?? 'All Products'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Region</span>
                  <span className="text-xs font-bold text-ink">{selectedGuideline.region ?? 'GLOBAL'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Channel</span>
                  <span className="text-xs font-bold text-ink">{selectedGuideline.channel ?? 'All Channels'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Validity</span>
                  <span className="text-xs font-bold text-ink">
                    {selectedGuideline.effectiveDate ?? 'Current'} {selectedGuideline.expiryDate ? `to ${selectedGuideline.expiryDate}` : '(Ongoing)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Approval Status</span>
                  <span className="rounded-full bg-verified-soft px-2.5 py-0.5 text-xs font-bold text-verified">
                    Approved & Active
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-brand-soft/30 p-4 text-xs text-ink space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-brand">
                  <Info size={14} />
                  <span>Deterministic Authority Hierarchy</span>
                </div>
                <p className="text-muted leading-relaxed">
                  All claims in your content are deterministically verified against this approved document before publication. This reference view is read-only for Creators. Authorised Administrators manage tiers and scope in the Knowledge Base.
                </p>
              </div>
            </div>

            <div className="border-t border-line px-6 py-4 bg-canvas flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGuideline(null)}
                className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-soft transition cursor-pointer"
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
