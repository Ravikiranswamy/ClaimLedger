import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  Maximize2,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../api'
import { formatWhen } from '../components/AuditTimeline'
import { DEPARTMENTS, type ApprovalStatus, type AuthorityTier, type KnowledgeDoc } from '../types'

const TIER_META: Record<AuthorityTier, { label: string; badgeCls: string; description: string }> = {
  TIER_1: {
    label: '👑 Tier 1 — Master Authority',
    badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    description: 'Organisation-wide single source of truth. Overrules all subordinate documents.',
  },
  TIER_2: {
    label: '📄 Tier 2 — Departmental Scope',
    badgeCls: 'bg-blue-50 text-blue-800 border-blue-300',
    description: 'Authoritative within specified department or campaign scope.',
  },
  TIER_3: {
    label: '⚠️ Tier 3 — Supporting Material',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-300',
    description: 'Reference brochures and legacy materials. Subject to obsolescence.',
  },
}

const STATUS_META: Record<ApprovalStatus, { label: string; badgeCls: string; dot: string }> = {
  DRAFT: { label: 'Pending Approval', badgeCls: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved & Active', badgeCls: 'bg-emerald-50 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', badgeCls: 'bg-rose-50 text-rose-900 border-rose-300', dot: 'bg-rose-500' },
  SUPERSEDED: { label: 'Superseded', badgeCls: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-400' },
  EXPIRED: { label: 'Expired', badgeCls: 'bg-orange-50 text-orange-900 border-orange-300', dot: 'bg-orange-500' },
  WITHDRAWN: { label: 'Withdrawn', badgeCls: 'bg-red-50 text-red-900 border-red-300', dot: 'bg-red-500' },
}

export function ApprovalManagement() {
  const qc = useQueryClient()

  // State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [tierFilter, setTierFilter] = useState<string>('ALL')

  // Selected document for inspection modal
  const [inspectDoc, setInspectDoc] = useState<KnowledgeDoc | null>(null)

  // Action Modals State
  const [rejectModalDoc, setRejectModalDoc] = useState<KnowledgeDoc | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [changesModalDoc, setChangesModalDoc] = useState<KnowledgeDoc | null>(null)
  const [changesComment, setChangesComment] = useState('')
  const [supersedeModalDoc, setSupersedeModalDoc] = useState<KnowledgeDoc | null>(null)
  const [replacementDocId, setReplacementDocId] = useState('')
  const [authorityModalDoc, setAuthorityModalDoc] = useState<KnowledgeDoc | null>(null)
  const [authorityTierEdit, setAuthorityTierEdit] = useState<AuthorityTier>('TIER_2')
  const [departmentEdit, setDepartmentEdit] = useState<string>('')
  const [productScopeEdit, setProductScopeEdit] = useState<string>('')
  const [versionEdit, setVersionEdit] = useState<string>('')
  const [effectiveDateEdit, setEffectiveDateEdit] = useState<string>('')
  const [expiryDateEdit, setExpiryDateEdit] = useState<string>('')

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4500)
  }

  // Fetch all documents
  const docsQ = useQuery({
    queryKey: ['documents-approval-list'],
    queryFn: () => api.listDocuments(),
  })
  const docs = docsQ.data ?? []

  // Computed dashboard counts
  const metrics = useMemo(() => {
    const pending = docs.filter((d) => d.approvalStatus === 'DRAFT').length
    const approved = docs.filter((d) => d.approvalStatus === 'APPROVED').length
    const rejected = docs.filter((d) => d.approvalStatus === 'REJECTED').length
    const superseded = docs.filter((d) => d.approvalStatus === 'SUPERSEDED').length
    return { pending, approved, rejected, superseded, total: docs.length }
  }, [docs])

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ApprovalStatus; reason?: string }) =>
      api.updateDocumentStatus(id, status, reason),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ['documents-approval-list'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['document-audit', vars.id] })
      qc.invalidateQueries({ queryKey: ['global-audit-ledger'] })
      setRejectModalDoc(null)
      setRejectReason('')
      setChangesModalDoc(null)
      setChangesComment('')
      if (inspectDoc && inspectDoc.id === vars.id) {
        setInspectDoc(updated)
      }
      showNotification(`Document '${updated.name}' marked as ${updated.approvalStatus}.`)
    },
    onError: (err: any) => {
      showNotification(err?.message || 'Failed to update document status.', 'error')
    },
  })

  const supersedeMutation = useMutation({
    mutationFn: ({ oldId, newId }: { oldId: string; newId: string }) =>
      api.supersedeDocument(oldId, newId),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['documents-approval-list'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['global-audit-ledger'] })
      setSupersedeModalDoc(null)
      setReplacementDocId('')
      if (inspectDoc && inspectDoc.id === updated.id) {
        setInspectDoc(updated)
      }
      showNotification(`Document '${updated.name}' superseded successfully.`)
    },
    onError: (err: any) => {
      showNotification(err?.message || 'Failed to supersede document.', 'error')
    },
  })

  const updateAuthorityMutation = useMutation({
    mutationFn: ({
      id,
      req,
    }: {
      id: string
      req: {
        authorityTier?: AuthorityTier
        departmentId?: string | null
        productScope?: string
        version?: string
        effectiveDate?: string
        expiryDate?: string
      }
    }) => api.updateDocumentAuthority(id, req),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['documents-approval-list'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['global-audit-ledger'] })
      setAuthorityModalDoc(null)
      if (inspectDoc && inspectDoc.id === updated.id) {
        setInspectDoc(updated)
      }
      showNotification(`Authority tier & scope updated for '${updated.name}'.`)
    },
    onError: (err: any) => {
      showNotification(err?.message || 'Failed to update document authority.', 'error')
    },
  })

  // Filtered documents list for Pending Approval Queue
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      // Pending Approval Queue only shows documents awaiting approval (DRAFT)
      if (d.approvalStatus !== 'DRAFT') {
        return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = d.name.toLowerCase().includes(q)
        const matchCat = (d.category ?? '').toLowerCase().includes(q)
        const matchScope = (d.productScope ?? '').toLowerCase().includes(q)
        const matchDept = (d.departmentName ?? '').toLowerCase().includes(q)
        if (!matchName && !matchCat && !matchScope && !matchDept) return false
      }

      // Category filter
      if (categoryFilter !== 'ALL' && d.category !== categoryFilter) return false

      // Tier filter
      if (tierFilter !== 'ALL' && d.authorityTier !== tierFilter) return false

      return true
    })
  }, [docs, search, categoryFilter, tierFilter])

  // Open authority edit modal
  const openAuthorityEdit = (doc: KnowledgeDoc) => {
    setAuthorityModalDoc(doc)
    setAuthorityTierEdit(doc.authorityTier)
    setDepartmentEdit(doc.departmentId ?? '')
    setProductScopeEdit(doc.productScope ?? '')
    setVersionEdit(doc.version ?? 'v1.0')
    setEffectiveDateEdit(doc.effectiveDate ? doc.effectiveDate.split('T')[0] : '')
    setExpiryDateEdit(doc.expiryDate ? doc.expiryDate.split('T')[0] : '')
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Knowledge Governance
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              Approval Management
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              Manage the approval lifecycle of brand guidelines and product truth documents before they become active authoritative sources in ClaimLedger's deterministic verification engine.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck size={14} className="text-emerald-600" />
              Knowledge Approver Authority
            </span>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl p-4 text-sm font-semibold shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Approval Dashboard (4 Summary Metric Cards) */}
      <section aria-labelledby="approval-metrics-heading">
        <h2 id="approval-metrics-heading" className="sr-only">Approval Status Metrics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Pending Approvals */}
          <div className="flex flex-col justify-between rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                Pending Approvals
              </span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-amber-950">{metrics.pending}</span>
              <p className="mt-0.5 text-xs text-amber-700">Awaiting admin review</p>
            </div>
          </div>

          {/* Approved Documents */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                Approved Documents
              </span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-emerald-950">{metrics.approved}</span>
              <p className="mt-0.5 text-xs text-emerald-700">Active authoritative sources</p>
            </div>
          </div>

          {/* Rejected Documents */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-900">
                Rejected Documents
              </span>
              <ShieldAlert size={16} className="text-rose-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-rose-950">{metrics.rejected}</span>
              <p className="mt-0.5 text-xs text-rose-700">Documents not approved</p>
            </div>
          </div>

          {/* Superseded Documents */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                Superseded Documents
              </span>
              <Layers size={16} className="text-slate-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-slate-900">{metrics.superseded}</span>
              <p className="mt-0.5 text-xs text-muted">Replaced by newer versions</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar */}
      <section aria-labelledby="approval-filters" className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <h2 id="approval-filters" className="sr-only">Document Approval Filters</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pending documents by name, category, or scope…"
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category */}
            <select
              aria-label="Filter by Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="BRAND">Brand Guidelines</option>
              <option value="PRODUCTS">Products</option>
              <option value="DEPARTMENTAL">Departmental</option>
              <option value="TERMINOLOGY">Terminology</option>
              <option value="ASSETS">Assets</option>
            </select>

            {/* Authority Tier */}
            <select
              aria-label="Filter by Tier"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Authority Tiers</option>
              <option value="TIER_1">Tier 1 — Master Authority</option>
              <option value="TIER_2">Tier 2 — Departmental Scope</option>
              <option value="TIER_3">Tier 3 — Supporting Material</option>
            </select>

            {(search || categoryFilter !== 'ALL' || tierFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setCategoryFilter('ALL')
                  setTierFilter('ALL')
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:bg-canvas hover:text-ink transition"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Pending Approval Queue */}
      <section aria-labelledby="approval-table-heading" className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <h2 id="approval-table-heading" className="font-display text-sm font-bold text-[#0A1F36]">
              Pending Approval Queue
            </h2>
            <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.2 text-xs font-bold">
              {filteredDocs.length} awaiting decision
            </span>
          </div>
          <span className="text-xs text-muted hidden sm:inline">
            Knowledge documents awaiting review before entering authoritative engine
          </span>
        </div>

          {docsQ.isLoading ? (
            <div className="p-12 text-center text-muted">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-2" />
              <p className="text-sm font-medium">Loading knowledge documents…</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="mx-auto mb-3 text-muted/60" />
              <p className="font-semibold text-ink">
                No documents currently awaiting approval
              </p>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                All uploaded guidelines, catalogues, and proposals have been evaluated and resolved.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wider text-muted">
                    <th scope="col" className="px-5 py-3.5">Document Name</th>
                    <th scope="col" className="px-4 py-3.5">Category</th>
                    <th scope="col" className="px-4 py-3.5">Authority Tier</th>
                    <th scope="col" className="px-4 py-3.5">Scope & Dept</th>
                    <th scope="col" className="px-3 py-3.5">Version</th>
                    <th scope="col" className="px-4 py-3.5">Uploaded</th>
                    <th scope="col" className="px-4 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {filteredDocs.map((doc) => {
                    const statusMeta = STATUS_META[doc.approvalStatus] ?? STATUS_META.DRAFT
                    const tierMeta = TIER_META[doc.authorityTier] ?? TIER_META.TIER_2

                    return (
                      <tr key={doc.id} className="hover:bg-canvas/60 transition-colors">
                        {/* 1. Document Name & Chunks */}
                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                              <FileText size={14} />
                            </span>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setInspectDoc(doc)}
                                className="font-semibold text-ink hover:text-[#0F766E] transition text-left line-clamp-1 cursor-pointer"
                              >
                                {doc.name}
                              </button>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                                <span>{doc.chunkCount ?? 1} vector chunk{(doc.chunkCount ?? 1) === 1 ? '' : 's'}</span>
                                {doc.uploadedBy && <span>· By {doc.uploadedBy}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800 font-mono">
                            {doc.category ?? 'BRAND'}
                          </span>
                        </td>

                        {/* 3. Authority Tier */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            title={tierMeta.description}
                            className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${tierMeta.badgeCls}`}
                          >
                            {tierMeta.label}
                          </span>
                        </td>

                        {/* 4. Scope & Department */}
                        <td className="px-4 py-4 whitespace-nowrap text-xs">
                          <div className="font-medium text-slate-800">
                            {doc.departmentName ?? 'Organisation-wide'}
                          </div>
                          <div className="text-[11px] text-muted">
                            Scope: {doc.productScope ?? 'All Products'} · {doc.region ?? 'GLOBAL'}
                          </div>
                        </td>

                        {/* 5. Version */}
                        <td className="px-3 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                          {doc.version ?? 'v1.0'}
                        </td>

                        {/* 6. Upload Date */}
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-muted/70" />
                            <span>{formatWhen(doc.createdAt)}</span>
                          </div>
                        </td>

                        {/* 7. Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeCls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* 8. Approval Actions */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect Button */}
                            <button
                              type="button"
                              onClick={() => setInspectDoc(doc)}
                              className="inline-flex items-center gap-1 rounded-lg bg-canvas border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] transition shadow-2xs"
                            >
                              Inspect <ChevronRight size={13} />
                            </button>

                            {/* Quick approve/reject */}
                            {doc.approvalStatus === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: doc.id,
                                      status: 'APPROVED',
                                      reason: 'Approved by Administrator after inspecting authority tier and validity.',
                                    })
                                  }
                                  title="Approve as authoritative knowledge"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-2xs"
                                >
                                  <Check size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectModalDoc(doc)}
                                  title="Reject document"
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition shadow-2xs"
                                >
                                  <X size={12} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      {/* 7. Problem Statement Alignment & Governance Architecture */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-slate-50 to-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-[#0F766E]" />
              <h3 className="font-display text-base font-bold text-[#0A1F36]">
                Authoritative Knowledge Resolution Architecture
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              ClaimLedger's pure Java deterministic verification engine uses only <strong>active APPROVED</strong> documents with current validity dates. Documents with status <code>DRAFT</code>, <code>REJECTED</code>, <code>SUPERSEDED</code>, or <code>EXPIRED</code> are strictly excluded from evidence selection, ensuring that brand claims are never verified against obsolete or unapproved facts.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                ✓ Temporal Validity Checked (Today within Effective/Expiry)
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-800">
                ✓ Tier 1 Master Overrules Subordinate Brochures
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-purple-800">
                ✓ Departmental Exceptions Evaluated Deterministically
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 text-xs shrink-0 md:w-72">
            <div className="flex items-center gap-2 font-bold text-ink mb-1.5">
              <Sparkles size={16} className="text-[#0F766E]" />
              <span>Traceable Human Approvals</span>
            </div>
            <p className="text-muted leading-relaxed">
              Every approve, reject, supersession, or authority tier modification records the acting administrator, timestamp, and decision reason in the audit ledger.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INSPECT & DOCUMENT REVIEW MODAL                                          */}
      {/* ========================================================================= */}
      {inspectDoc && (
        <DocumentInspectModal
          doc={inspectDoc}
          onClose={() => setInspectDoc(null)}
          onApprove={(reason) =>
            updateStatusMutation.mutate({ id: inspectDoc.id, status: 'APPROVED', reason })
          }
          onRequestChanges={() => {
            setChangesModalDoc(inspectDoc)
          }}
          onReject={() => {
            setRejectModalDoc(inspectDoc)
          }}
          onSupersede={() => {
            setSupersedeModalDoc(inspectDoc)
          }}
          onEditAuthority={() => {
            openAuthorityEdit(inspectDoc)
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* REJECT MODAL (Mandatory Reason)                                          */}
      {/* ========================================================================= */}
      {rejectModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <ShieldAlert size={20} />
                <span>Reject Knowledge Document</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalDoc(null)}
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted">
                Rejecting <strong className="text-ink">{rejectModalDoc.name}</strong> will exclude it from brand verification analysis. A mandatory reason is required for governance accountability.
              </p>

              <div>
                <label htmlFor="reject-reason" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Contains outdated price claims (₹799) conflicting with Tier 1 Master Catalogue (₹999)."
                  className="w-full rounded-xl border border-line p-3 text-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalDoc(null)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: rejectModalDoc.id,
                      status: 'REJECTED',
                      reason: rejectReason.trim(),
                    })
                  }
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUEST CHANGES MODAL                                                    */}
      {/* ========================================================================= */}
      {changesModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <AlertCircle size={20} />
                <span>Return for Correction</span>
              </div>
              <button
                type="button"
                onClick={() => setChangesModalDoc(null)}
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted">
                Return <strong className="text-ink">{changesModalDoc.name}</strong> to the uploader with specific revision requests.
              </p>

              <div>
                <label htmlFor="changes-comment" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Revision Instructions *
                </label>
                <textarea
                  id="changes-comment"
                  rows={3}
                  value={changesComment}
                  onChange={(e) => setChangesComment(e.target.value)}
                  placeholder="e.g. Please update the pricing table on page 2 to reflect the Q4 revised catalogue rate."
                  className="w-full rounded-xl border border-line p-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangesModalDoc(null)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!changesComment.trim() || updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: changesModalDoc.id,
                      status: 'DRAFT',
                      reason: `Changes Requested: ${changesComment.trim()}`,
                    })
                  }
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Send Revision Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPERSEDE MODAL                                                          */}
      {/* ========================================================================= */}
      {supersedeModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Layers size={20} className="text-[#0F766E]" />
                <span>Supersede Knowledge Document</span>
              </div>
              <button
                type="button"
                onClick={() => setSupersedeModalDoc(null)}
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted">
                Mark <strong className="text-ink">{supersedeModalDoc.name}</strong> as superseded by a newer approved document. Superseded documents are kept in history for auditing but excluded from active brand verification.
              </p>

              <div>
                <label htmlFor="replacement-doc" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Select Replacement Version *
                </label>
                <select
                  id="replacement-doc"
                  aria-label="Select Replacement Version"
                  value={replacementDocId}
                  onChange={(e) => setReplacementDocId(e.target.value)}
                  className="w-full rounded-xl border border-line p-2.5 text-xs focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="">-- Choose active document --</option>
                  {docs
                    .filter((d) => d.id !== supersedeModalDoc.id && d.approvalStatus === 'APPROVED')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.version ?? 'v1.0'} - {d.authorityTier})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupersedeModalDoc(null)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!replacementDocId || supersedeMutation.isPending}
                  onClick={() =>
                    supersedeMutation.mutate({
                      oldId: supersedeModalDoc.id,
                      newId: replacementDocId,
                    })
                  }
                  className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] disabled:opacity-50"
                >
                  Mark as Superseded
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT AUTHORITY & SCOPE MODAL                                             */}
      {/* ========================================================================= */}
      {authorityModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Shield size={20} className="text-[#0F766E]" />
                <span>Manage Version & Authority Tier</span>
              </div>
              <button
                type="button"
                onClick={() => setAuthorityModalDoc(null)}
                className="text-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <p className="text-xs text-muted">
                Configure authority ranking, jurisdiction, and validity dates for <strong className="text-ink">{authorityModalDoc.name}</strong>.
              </p>

              {/* Authority Tier */}
              <div>
                <label htmlFor="edit-tier" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Authority Tier Hierarchy *
                </label>
                <select
                  id="edit-tier"
                  aria-label="Authority Tier Hierarchy"
                  value={authorityTierEdit}
                  onChange={(e) => setAuthorityTierEdit(e.target.value as AuthorityTier)}
                  className="w-full rounded-xl border border-line p-2.5 text-xs font-semibold text-ink focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="TIER_1">👑 Tier 1 — Master Authority (Company-wide truth)</option>
                  <option value="TIER_2">📄 Tier 2 — Departmental Scope (Jurisdictional)</option>
                  <option value="TIER_3">⚠️ Tier 3 — Supporting Material (Subject to override)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted">
                  {TIER_META[authorityTierEdit].description}
                </p>
              </div>

              {/* Department Jurisdiction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-dept" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    id="edit-dept"
                    aria-label="Department"
                    value={departmentEdit}
                    onChange={(e) => setDepartmentEdit(e.target.value)}
                    className="w-full rounded-xl border border-line p-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="">Organisation-wide</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-version" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Version
                  </label>
                  <input
                    id="edit-version"
                    type="text"
                    value={versionEdit}
                    onChange={(e) => setVersionEdit(e.target.value)}
                    placeholder="e.g. v2.0"
                    className="w-full rounded-xl border border-line p-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Scope */}
              <div>
                <label htmlFor="edit-product-scope" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Product / Service Scope
                </label>
                <input
                  id="edit-product-scope"
                  type="text"
                  value={productScopeEdit}
                  onChange={(e) => setProductScopeEdit(e.target.value)}
                  placeholder="e.g. Nexora Pro, Enterprise, All Products"
                  className="w-full rounded-xl border border-line p-2 text-xs focus:border-[#0F766E] focus:outline-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-effective-date" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    id="edit-effective-date"
                    type="date"
                    value={effectiveDateEdit}
                    onChange={(e) => setEffectiveDateEdit(e.target.value)}
                    className="w-full rounded-xl border border-line p-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="edit-expiry-date" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    id="edit-expiry-date"
                    type="date"
                    value={expiryDateEdit}
                    onChange={(e) => setExpiryDateEdit(e.target.value)}
                    className="w-full rounded-xl border border-line p-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAuthorityModalDoc(null)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateAuthorityMutation.isPending}
                  onClick={() =>
                    updateAuthorityMutation.mutate({
                      id: authorityModalDoc.id,
                      req: {
                        authorityTier: authorityTierEdit,
                        departmentId: departmentEdit || null,
                        productScope: productScopeEdit || undefined,
                        version: versionEdit || undefined,
                        effectiveDate: effectiveDateEdit || undefined,
                        expiryDate: expiryDateEdit || undefined,
                      },
                    })
                  }
                  className="rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D655E] disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// DOCUMENT INSPECT & REVIEW MODAL COMPONENT
// =========================================================================
interface DocumentInspectModalProps {
  doc: KnowledgeDoc
  onClose: () => void
  onApprove: (reason?: string) => void
  onRequestChanges: () => void
  onReject: () => void
  onSupersede: () => void
  onEditAuthority: () => void
}

function DocumentInspectModal({
  doc,
  onClose,
  onApprove,
  onRequestChanges,
  onReject,
  onSupersede,
  onEditAuthority,
}: DocumentInspectModalProps) {
  // Tabs: 'original' | 'chunks' | 'audit'
  const [activeTab, setActiveTab] = useState<'original' | 'chunks' | 'audit'>('original')
  const [approveComment, setApproveComment] = useState('')
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)

  // Tab 1 state: Viewer Mode, Zoom, Current Page, Copied feedback
  const [viewerMode, setViewerMode] = useState<'embedded' | 'reader'>('embedded')
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [copiedText, setCopiedText] = useState(false)
  const [chunkFilter, setChunkFilter] = useState('')

  // Query chunks for this document
  const chunksQ = useQuery({
    queryKey: ['document-chunks', doc.id],
    queryFn: () => api.getDocumentChunks(doc.id),
  })
  const chunks = chunksQ.data ?? []

  // Query audit history for this document
  const auditQ = useQuery({
    queryKey: ['document-audit', doc.id],
    queryFn: () => api.getDocumentAudit(doc.id),
  })
  const audits = auditQ.data ?? []

  const statusMeta = STATUS_META[doc.approvalStatus] ?? STATUS_META.DRAFT
  const tierMeta = TIER_META[doc.authorityTier] ?? TIER_META.TIER_2

  // Check temporal validity
  const now = new Date().toISOString().split('T')[0]
  const isEffective = !doc.effectiveDate || doc.effectiveDate <= now
  const isNotExpired = !doc.expiryDate || doc.expiryDate >= now
  const isCurrentlyValid = isEffective && isNotExpired

  // File URLs
  const fileUrl = api.getDocumentFileUrl(doc.id)
  const downloadUrl = api.getDocumentFileUrl(doc.id, true)
  const isPdf = !doc.name.toLowerCase().endsWith('.txt')

  // Calculate total pages from chunks or default to 1
  const totalPages = useMemo(() => {
    if (chunks.length === 0) return 1
    const maxPage = Math.max(...chunks.map((c) => c.pageNumber ?? 1))
    return Math.max(1, maxPage)
  }, [chunks])

  // Get chunks for current page in reader mode
  const currentPageChunks = useMemo(() => {
    return chunks.filter((c) => (c.pageNumber ?? 1) === currentPage)
  }, [chunks, currentPage])

  // Complete text aggregated across chunks for text viewer
  const fullText = useMemo(() => {
    return chunks.map((c) => c.content).join('\n\n')
  }, [chunks])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2500)
  }

  // Filtered chunks for Tab 2
  const filteredChunks = useMemo(() => {
    if (!chunkFilter.trim()) return chunks
    const q = chunkFilter.toLowerCase()
    return chunks.filter(
      (c) =>
        c.content.toLowerCase().includes(q) ||
        String(c.pageNumber).includes(q) ||
        String(c.chunkIndex).includes(q)
    )
  }, [chunks, chunkFilter])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line p-5 bg-canvas shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeCls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${tierMeta.badgeCls}`}>
                {tierMeta.label}
              </span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-800">
                {doc.category ?? 'BRAND'}
              </span>
              <span className="font-mono text-xs text-muted">Version {doc.version ?? 'v1.0'}</span>
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[#0A1F36]">
              {doc.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Metadata & Jurisdiction Parameters Card */}
          <div className="rounded-xl border border-line bg-surface p-4 text-xs">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
              <span>Document Scope & Jurisdiction Parameters</span>
              <span className="font-mono text-[11px] text-muted normal-case font-normal">
                Ref: {doc.id}
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-muted block">Department</span>
                <span className="font-bold text-ink">{doc.departmentName ?? 'Organisation-wide'}</span>
              </div>
              <div>
                <span className="text-muted block">Product Scope</span>
                <span className="font-bold text-ink">{doc.productScope ?? 'All Products'}</span>
              </div>
              <div>
                <span className="text-muted block">Region & Channel</span>
                <span className="font-bold text-ink">{doc.region ?? 'GLOBAL'} · {doc.channel ?? 'ALL'}</span>
              </div>
              <div>
                <span className="text-muted block">Date Validity</span>
                <span className={`font-bold inline-flex items-center gap-1 ${isCurrentlyValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isCurrentlyValid ? '✓ Currently Active' : '⚠️ Past Expiry / Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-line/60 flex flex-wrap items-center justify-between text-muted text-[11px]">
              <span>
                Effective: <strong>{doc.effectiveDate ?? 'Immediate'}</strong> · Expiry: <strong>{doc.expiryDate ?? 'No expiry set'}</strong>
              </span>
              <span>
                Submitted By: <strong>{doc.uploadedBy ?? 'Arjun Sharma'}</strong> ({formatWhen(doc.createdAt)})
              </span>
              <span className="font-mono">
                Storage: <strong>{doc.filePath ?? `uploads/documents/${doc.name}`}</strong>
              </span>
            </div>
          </div>

          {/* Three Inspection Tabs */}
          <div className="flex border-b border-line gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-1.5 border-b-2 pb-2 transition cursor-pointer ${
                activeTab === 'original'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <FileText size={14} />
              Original Document ({isPdf ? 'PDF' : 'Text'})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chunks')}
              className={`flex items-center gap-1.5 border-b-2 pb-2 transition cursor-pointer ${
                activeTab === 'chunks'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Layers size={14} />
              Extracted Content & Chunks ({chunks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 border-b-2 pb-2 transition cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-[#0F766E] text-[#0F766E]'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Clock size={14} />
              Approval History ({audits.length})
            </button>
          </div>

          {/* TAB 1: ORIGINAL DOCUMENT VIEWER */}
          {activeTab === 'original' && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-2.5 text-xs">
                {/* Left: Document Info */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                    {isPdf ? 'PDF' : 'TXT'}
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[220px]" title={doc.name}>
                    {doc.name}
                  </span>
                </div>

                {/* Center: Page Navigation & Zoom (for PDF) */}
                {isPdf && (
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-line shadow-2xs">
                    {/* Page navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="font-mono text-xs font-semibold px-1">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={zoomLevel <= 50}
                        onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                        className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="font-mono text-xs font-semibold w-11 text-center">
                        {zoomLevel}%
                      </span>
                      <button
                        type="button"
                        disabled={zoomLevel >= 200}
                        onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                        className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoomLevel(100)}
                        className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-[11px] font-semibold"
                        title="Reset 100%"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {isPdf && (
                    <button
                      type="button"
                      onClick={() => setViewerMode((m) => (m === 'embedded' ? 'reader' : 'embedded'))}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      title="Switch viewer presentation style"
                    >
                      <Eye size={13} className="text-[#0F766E]" />
                      {viewerMode === 'embedded' ? 'Clean Reader' : 'Browser Viewer'}
                    </button>
                  )}
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    title="Open original file in new browser window"
                  >
                    <ExternalLink size={13} />
                    Open in Tab
                  </a>
                  <a
                    href={downloadUrl}
                    download={doc.name}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0F766E] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0D625B] transition cursor-pointer shadow-2xs"
                    title="Download original uploaded document"
                  >
                    <Download size={13} />
                    Download
                  </a>
                </div>
              </div>

              {/* Viewer Window */}
              {isPdf ? (
                viewerMode === 'embedded' ? (
                  /* Mode 1: Native Embedded Browser PDF Viewer */
                  <div className="rounded-xl border border-line bg-slate-900/5 p-1 shadow-inner">
                    <iframe
                      key={`${fileUrl}-${currentPage}-${zoomLevel}`}
                      src={`${fileUrl}#page=${currentPage}&zoom=${zoomLevel}`}
                      className="w-full h-[520px] rounded-lg border border-slate-300 bg-white"
                      title={doc.name}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted px-2 pt-1.5">
                      <span>
                        Viewing via embedded PDF viewer. Page navigation and zoom controls are active above and inside the frame.
                      </span>
                      <span>
                        Storage Reference: <code className="font-mono text-slate-700">{doc.filePath ?? doc.name}</code>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Clean High-Precision Page Reader */
                  <div className="rounded-xl border border-line bg-slate-100 p-6 overflow-x-auto min-h-[520px] flex justify-center">
                    <div
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden transition-transform duration-150 flex flex-col"
                    >
                      {/* Document Page Header */}
                      <div className="bg-[#0A1F36] text-white p-6 border-b border-slate-700">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-teal-300 font-bold mb-1">
                          <span>{tierMeta.label}</span>
                          <span>{doc.approvalStatus}</span>
                        </div>
                        <h1 className="text-xl font-bold font-display text-white">{doc.name}</h1>
                        <p className="text-xs text-slate-300 mt-1 font-mono">
                          Version: {doc.version} · Scope: {doc.productScope ?? 'Universal'} · Region: {doc.region ?? 'GLOBAL'}
                        </p>
                      </div>

                      {/* Document Page Body */}
                      <div className="p-8 space-y-5 text-slate-800 leading-relaxed font-sans text-sm flex-1">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <span>Page {currentPage} of {totalPages}</span>
                          <span>Verified Original Document Content</span>
                        </div>

                        {currentPageChunks.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 text-xs italic">
                            No extracted text registered on this page number.
                          </div>
                        ) : (
                          currentPageChunks.map((chunk, idx) => (
                            <div key={chunk.id} className="space-y-2">
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                                Section {idx + 1} · Vector Source #{chunk.chunkIndex + 1}
                              </span>
                              <p className="text-slate-800 font-serif text-sm leading-relaxed whitespace-pre-wrap">
                                {chunk.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Document Page Footer */}
                      <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>ClaimLedger Knowledge Repository · Document #{doc.id.substring(0, 8)}</span>
                        <span>Page {currentPage}</span>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Plain Text Viewer */
                <div className="rounded-xl border border-line bg-canvas p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Complete Submitted Text Content
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(fullText)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
                    >
                      {copiedText ? <Check size={13} /> : <Copy size={13} />}
                      {copiedText ? 'Copied' : 'Copy All Text'}
                    </button>
                  </div>
                  <pre className="p-4 bg-white rounded-lg border border-line text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                    {fullText || 'No text content available for this document.'}
                  </pre>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>Total length: {fullText.length} characters · {fullText.split(/\s+/).filter(Boolean).length} words</span>
                    <span>Storage Reference: {doc.filePath ?? doc.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRACTED CONTENT & CHUNKS */}
          {activeTab === 'chunks' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  These authoritative text chunks represent the exact specifications indexed in Neon pgvector (768-dimensional embeddings) for deterministic authority resolution.
                </p>
                {chunks.length > 0 && (
                  <div className="relative shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={chunkFilter}
                      onChange={(e) => setChunkFilter(e.target.value)}
                      placeholder="Filter chunks..."
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-line bg-canvas focus:outline-none focus:border-[#0F766E] w-48"
                    />
                  </div>
                )}
              </div>

              {chunksQ.isLoading ? (
                <div className="p-8 text-center text-muted">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-1" />
                  <p className="text-xs">Loading chunks…</p>
                </div>
              ) : chunks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
                  No text chunks available for this document.
                </p>
              ) : filteredChunks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
                  No chunks matching &quot;{chunkFilter}&quot;.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {filteredChunks.map((ch, idx) => (
                    <div key={ch.id} className="rounded-xl border border-line bg-canvas p-3.5 text-xs">
                      <div className="flex items-center justify-between text-muted mb-1.5 font-mono text-[11px]">
                        <span className="font-semibold text-slate-900">
                          Chunk #{ch.chunkIndex !== undefined ? ch.chunkIndex + 1 : idx + 1} (Page {ch.pageNumber})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                            Vector Indexed (Neon pgvector 768-dim)
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ch.content)}
                            className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                            title="Copy chunk excerpt"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-mono whitespace-pre-wrap bg-white rounded-lg p-2.5 border border-line/60">
                        “{ch.content}”
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted font-mono">
                        <span>Chunk ID: {ch.id.substring(0, 16)}...</span>
                        <span>Length: {ch.content.length} chars · ~{Math.round(ch.content.length / 4)} tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: APPROVAL HISTORY & AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Uploader Profile Card */}
              <div className="rounded-xl border border-line bg-canvas p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 font-bold">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted uppercase font-bold tracking-wider block">Submitted By</span>
                    <h4 className="font-bold text-slate-900 text-sm">{doc.uploadedBy ?? 'Arjun Sharma'}</h4>
                    <p className="text-xs text-slate-500">
                      Organisation Admin · {doc.departmentName ?? 'Company-wide Governance'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="text-muted block">Uploaded On</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-[11px] text-muted block">({formatWhen(doc.createdAt)})</span>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  Chronological audit ledger recording upload, peer reviews, human approvals, authority alterations, and supersession records.
                </p>

                {audits.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
                    No governance actions recorded for this document yet.
                  </p>
                ) : (
                  <ol className="space-y-3 border-l-2 border-line pl-4 pt-1">
                    {audits.map((a) => (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[1.53rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0F766E]" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-xs">{a.actorName}</span>
                          <span className="text-[11px] text-muted">({a.actorRole ?? 'Admin'})</span>
                          <span className="text-[11px] text-muted">· {formatWhen(a.createdAt)}</span>
                        </div>
                        <span className="inline-block rounded bg-teal-50 border border-teal-200 px-1.5 py-0.2 text-[10px] font-bold text-teal-800 font-mono mt-0.5">
                          {a.action}
                        </span>
                        {a.comment && (
                          <p className="mt-1 text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded border border-line/60">
                            {a.comment}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}

          {/* Inline Approve Confirmation Box */}
          {showApproveConfirm && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 size={16} />
                <span>Confirm Knowledge Document Approval</span>
              </div>
              <p className="text-xs text-slate-700">
                Approving will immediately register this document as an authoritative source in the deterministic verification engine for its declared authority tier.
              </p>
              <div>
                <label htmlFor="approve-comment" className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Optional Approval Note
                </label>
                <input
                  id="approve-comment"
                  type="text"
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  placeholder="e.g. Verified brand tone and technical specifications against master guidelines."
                  className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(false)}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApprove(approveComment.trim() || undefined)
                    setShowApproveConfirm(false)
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  Confirm & Make Authoritative
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Action Bar) */}
        <div className="flex flex-wrap items-center justify-between border-t border-line p-4 bg-canvas gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditAuthority}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Edit3 size={14} /> Manage Tier & Scope
            </button>
            <button
              type="button"
              onClick={onSupersede}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Layers size={14} /> Supersede
            </button>
          </div>

          <div className="flex items-center gap-2">
            {doc.approvalStatus === 'DRAFT' ? (
              <>
                <button
                  type="button"
                  onClick={onRequestChanges}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                >
                  <AlertCircle size={14} /> Request Changes
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition cursor-pointer"
                >
                  <ShieldAlert size={14} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => setShowApproveConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={14} /> Approve Document
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Inspector
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
