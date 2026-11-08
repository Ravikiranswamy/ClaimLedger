import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Filter,
  Loader2,
  Plus,
  Shield,
  Tag,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import type { AuthorityTier, KnowledgeDoc } from '../types'
import { DEPARTMENTS } from '../types'

const TIER_BADGES: Record<AuthorityTier, { label: string; desc: string; cls: string }> = {
  TIER_1: {
    label: 'Tier 1 — Master Authority',
    desc: 'Company-wide single source of truth. Overrules all subordinate documents.',
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

export function KnowledgeBase() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const docsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })
  const docs = docsQ.data ?? []

  const filtered = docs.filter((d) => tierFilter === 'ALL' || d.authorityTier === tierFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Authoritative Knowledge Base"
          subtitle="Document repository backing ClaimLedger’s 6-step deterministic hierarchy and pgvector semantic retrieval."
        />
        {(user?.role === 'ADMIN' || true) && (
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
                  {docs.filter((d) => d.authorityTier === tier).length} doc(s)
                </span>
              </div>
              <p className="mt-1 text-xs opacity-90">{badge.desc}</p>
            </div>
          )
        })}
      </div>

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
          const isSuperseded = doc.approvalStatus === 'SUPERSEDED'
          return (
            <div
              key={doc.id}
              className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-sm transition hover:border-brand ${
                isSuperseded ? 'border-amber-200 bg-amber-50/20' : 'border-line'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-navy">
                      <FileText size={18} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink leading-tight">{doc.name}</h3>
                      <p className="text-xs text-muted">Version {doc.version} · {doc.channel ?? 'All Channels'}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      doc.approvalStatus === 'APPROVED'
                        ? 'bg-verified-soft text-verified'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {doc.approvalStatus}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-brand shrink-0" />
                    <span className="font-semibold text-ink">{tier.label.split('—')[0]}</span>
                    <span>({tier.desc.split('.')[0]})</span>
                  </div>
                  {doc.productScope && (
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
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Database size={14} />
                  <span>{doc.chunkCount ?? 0} indexed chunk(s)</span>
                </span>
                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  Inspect Chunks & Vectors <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chunk Inspector Modal */}
      {selectedDoc && <ChunkInspectorModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}

      {/* Upload Modal */}
      {showUploadModal && <UploadDocModal onClose={() => setShowUploadModal(false)} onUploaded={() => qc.invalidateQueries({ queryKey: ['documents'] })} />}
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
  const [departmentId, setDepartmentId] = useState('')
  const [version, setVersion] = useState('v1.0')
  const [productScope, setProductScope] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const uploadM = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a PDF file')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name.trim() || file.name)
      fd.append('authorityTier', tier)
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
          <h2 className="font-display font-bold text-xl">Upload Authoritative Document</h2>
          <button onClick={onClose} className="rounded-xl p-1 text-muted hover:text-ink"><X size={20} /></button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">Document Name</label>
            <input
              type="text"
              placeholder="e.g. Enterprise_Pricing_Matrix_2026.pdf"
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
              placeholder="e.g. Nexora Pro, Nexora Enterprise"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">PDF File</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-line bg-canvas p-2.5 text-sm"
            />
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
              Extract, Chunk & Embed
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
