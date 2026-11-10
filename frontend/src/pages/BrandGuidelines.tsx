import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Layers,
  Shield,
  ShieldAlert,
  Sparkles,
  Tag,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import type { AuthorityTier, KnowledgeDoc } from '../types'

// =========================================================================
// 5 GOVERNANCE AREAS REQUIRED BY PROBLEM STATEMENT
// =========================================================================
export type GovernanceArea =
  | 'ALL'
  | 'PRODUCT_FACTS'
  | 'BRAND_TONE'
  | 'TERMINOLOGY'
  | 'APPROVED_CLAIMS'
  | 'VISUAL_ACCESSIBILITY'

const AREA_META: Record<
  GovernanceArea,
  { label: string; icon: string; desc: string; badgeCls: string }
> = {
  ALL: {
    label: 'All Areas',
    icon: '✨',
    desc: 'All approved corporate governance standards',
    badgeCls: 'bg-slate-100 text-slate-800 border-slate-200',
  },
  PRODUCT_FACTS: {
    label: 'Product Facts & Pricing',
    icon: '🏷️',
    desc: 'Official prices, billing conditions, product features, and availability',
    badgeCls: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  BRAND_TONE: {
    label: 'Brand Tone & Communication',
    icon: '🗣️',
    desc: 'Brand personality, preferred tone, writing style, and language rules',
    badgeCls: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  TERMINOLOGY: {
    label: 'Terminology & Messaging',
    icon: '📖',
    desc: 'Official product names, approved phrases, boilerplate, and messaging',
    badgeCls: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  APPROVED_CLAIMS: {
    label: 'Approved Claims & Promotions',
    icon: '🛡️',
    desc: 'Approved promotional claims, supporting evidence, and required qualifications',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  VISUAL_ACCESSIBILITY: {
    label: 'Visual & Accessibility Standards',
    icon: '🎨',
    desc: 'Approved logos, colour palette, typography, and WCAG accessibility requirements',
    badgeCls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
}

const TIER_META: Record<AuthorityTier, { label: string; badgeCls: string; desc: string }> = {
  TIER_1: {
    label: 'Tier 1 — Master Authority',
    badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Company-wide approved brand guidelines, official product facts, and master corporate information.',
  },
  TIER_2: {
    label: 'Tier 2 — Departmental Scope',
    badgeCls: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Approved department-specific, sales, campaign, or other scoped jurisdictional information.',
  },
  TIER_3: {
    label: 'Tier 3 — Supporting Material',
    badgeCls: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'Reference documents, brochures, and supporting information subject to override.',
  },
}

// Map document to its primary governance area
function getDocumentPrimaryArea(doc: KnowledgeDoc): GovernanceArea {
  const name = doc.name.toLowerCase()
  if (name.includes('product') || name.includes('catalogue') || name.includes('sales_proposal') || name.includes('compensation')) {
    return 'PRODUCT_FACTS'
  }
  if (name.includes('claims_register') || name.includes('discount')) {
    return 'APPROVED_CLAIMS'
  }
  if (name.includes('terminology') || name.includes('messaging')) {
    return 'TERMINOLOGY'
  }
  if (name.includes('social') || name.includes('brochure')) {
    return 'BRAND_TONE'
  }
  return 'BRAND_TONE' // Brand_Guidelines covers Tone, Visual, and Terminology
}

export function BrandGuidelines() {
  const { user } = useAuth()

  // Applicability Filters
  const [selectedArea, setSelectedArea] = useState<GovernanceArea>('ALL')
  const [selectedTier, setSelectedTier] = useState<string>('ALL')
  const [scopeProductFilter, setScopeProductFilter] = useState<string>('ALL')
  const [scopeRegionFilter, setScopeRegionFilter] = useState<string>('ALL')
  const [scopeChannelFilter, setScopeChannelFilter] = useState<string>('ALL')
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
        if (
          doc.departmentName &&
          user?.departmentName &&
          doc.departmentName.toLowerCase() !== user.departmentName.toLowerCase()
        ) {
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

      // 8. Governance Area filter
      if (selectedArea !== 'ALL') {
        const area = getDocumentPrimaryArea(doc)
        // Brand_Guidelines covers multiple areas (Tone, Visual, Terminology)
        const isBrandDoc = doc.name.toLowerCase().includes('brand_guidelines')
        if (selectedArea === 'VISUAL_ACCESSIBILITY' && isBrandDoc) {
          return true
        }
        if (selectedArea === 'TERMINOLOGY' && isBrandDoc) {
          return true
        }
        if (selectedArea === 'BRAND_TONE' && isBrandDoc) {
          return true
        }
        if (area !== selectedArea) {
          return false
        }
      }

      return true
    })
  }, [
    rawDocs,
    user,
    scopeProductFilter,
    scopeRegionFilter,
    scopeChannelFilter,
    selectedTier,
    selectedArea,
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Brand Guidelines & Standards"
        subtitle="Approved, currently valid corporate guidelines, product facts, and messaging standards applicable to your content."
      />

      {/* Area Quick-Filter Tabs */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Browse by Governance Area:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              'ALL',
              'PRODUCT_FACTS',
              'BRAND_TONE',
              'TERMINOLOGY',
              'APPROVED_CLAIMS',
              'VISUAL_ACCESSIBILITY',
            ] as const
          ).map((areaKey) => {
            const meta = AREA_META[areaKey]
            const active = selectedArea === areaKey

            return (
              <button
                key={areaKey}
                type="button"
                onClick={() => setSelectedArea(areaKey)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-xs'
                    : 'border-line bg-surface text-ink hover:bg-canvas'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

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
            {(scopeProductFilter !== 'ALL' ||
              scopeRegionFilter !== 'ALL' ||
              scopeChannelFilter !== 'ALL' ||
              selectedTier !== 'ALL' ||
              selectedArea !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setScopeProductFilter('ALL')
                  setScopeRegionFilter('ALL')
                  setScopeChannelFilter('ALL')
                  setSelectedTier('ALL')
                  setSelectedArea('ALL')
                }}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
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
              setSelectedArea('ALL')
            }}
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline cursor-pointer"
          >
            Clear applicability filters
          </button>
        </div>
      )}

      {documentsQ.isSuccess && applicableGuidelines.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {applicableGuidelines.map((doc) => {
            const meta = TIER_META[doc.authorityTier]
            const area = getDocumentPrimaryArea(doc)
            const areaMeta = AREA_META[area]

            return (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 shadow-xs transition hover:border-[#0F766E] hover:shadow-md"
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

                  {/* Primary Area Pill */}
                  <div className="mt-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${areaMeta.badgeCls}`}>
                      <span>{areaMeta.icon}</span>
                      <span>{areaMeta.label}</span>
                    </span>
                  </div>

                  {/* Document Title */}
                  <h3 className="mt-3 font-display font-bold text-base text-ink leading-snug">
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
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand/10 border border-brand/20 px-4 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white transition shadow-2xs cursor-pointer"
                  >
                    <Eye size={14} />
                    View Guidelines & Approved Rules →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED CREATOR GUIDELINE INSPECTION MODAL                               */}
      {/* ========================================================================= */}
      {selectedGuideline && (
        <CreatorGuidelineModal
          doc={selectedGuideline}
          onClose={() => setSelectedGuideline(null)}
        />
      )}
    </div>
  )
}

// =========================================================================
// STRUCTURED GOVERNANCE RULES PER DOCUMENT
// =========================================================================
interface GovernanceRuleDetail {
  productFacts?: {
    officialPrice?: string
    billingConditions?: string
    uptimeSla?: string
    securityCertifications?: string
    specifications?: Array<{ key: string; val: string }>
    notes?: string
    examples?: Array<{ unacceptable: string; approved: string; reason?: string }>
  }
  brandTone?: {
    personality: string
    toneAndVoice: string
    writingStyle: string
    prohibitedLanguage: string
    examples: Array<{ unacceptable: string; approved: string; note?: string }>
  }
  terminology?: {
    officialNames: string[]
    prohibitedNames: string[]
    approvedTerms: string[]
    prohibitedInformal: string[]
    boilerplate25: string
    boilerplate50: string
    officialSlogan?: string
    messagingPillars?: string[]
  }
  approvedClaims?: {
    claims: Array<{ claim: string; evidence: string; qualification?: string }>
    prohibitedGuarantees: string[]
    examples: Array<{ unacceptable: string; approved: string; reason?: string }>
  }
  visualStandards?: {
    logoClearSpace: string
    logoMinSize: string
    logoRestrictions: string
    palette: Array<{ name: string; hex: string; role: string; border?: string }>
    typography: Array<{ role: string; family: string; weight: string }>
    accessibility: string[]
  }
}

function getGuidelineDetail(doc: KnowledgeDoc): GovernanceRuleDetail {
  const name = doc.name.toLowerCase()

  // 1. Product Master Catalogue
  if (name.includes('product_master_catalogue')) {
    return {
      productFacts: {
        officialPrice: '₹999 per user per month (billed annually)',
        billingConditions: 'Enterprise subscription billed annually. Includes 24/7 dedicated enterprise support.',
        uptimeSla: 'Guaranteed 99.9% Uptime SLA backed by financially verified telemetry credits.',
        securityCertifications: 'Certified SOC 2 Type II, ISO 27001, and fully GDPR compliant. Military-grade AES-256 encryption at rest, TLS 1.3 in transit.',
        specifications: [
          { key: 'Product Scope', val: 'Nexora Pro (Flagship AI Brand Governance Platform)' },
          { key: 'Throughput Capacity', val: '50,000 document verifications per hour' },
          { key: 'Audit Trail Retention', val: '7 years immutable cryptographic ledger storage' },
          { key: 'Standard Price', val: '₹999 / user / month (billed annually)' },
          { key: 'Authoritative Level', val: 'Sole authoritative corporate source of truth for standard pricing' },
        ],
        notes: 'Departmental exceptions (e.g. Sales proposals) must cite active contract approval; otherwise Tier 1 Master price of ₹999 strictly governs.',
        examples: [
          {
            unacceptable: '“Nexora Pro starts at ₹799/month for all customers.”',
            approved: '“The authoritative enterprise subscription for Nexora Pro is ₹999 per user per month billed annually.”',
            reason: '₹799 was an introductory launch rate superseded on 30 June 2026 by Master Catalogue v4.2.',
          },
        ],
      },
      approvedClaims: {
        claims: [
          { claim: '99.9% guaranteed uptime SLA backed by 24/7 dedicated enterprise support', evidence: 'Master Catalogue v4.2 SLA specification' },
          { claim: 'Certified SOC 2 Type II, ISO 27001, and fully GDPR compliant', evidence: 'Q3 2026 independent third-party security audit' },
          { claim: 'Throughput capacity supports 50,000 document governance verifications per hour', evidence: 'Engineering certified load-test benchmark' },
          { claim: 'AES-256 encryption at rest and TLS 1.3 in transit', evidence: 'Security Architecture Specification' },
        ],
        prohibitedGuarantees: [
          'Absolute guarantees like "100% error-free" or "foolproof compliance"',
          'Unsupported comparative claims without third-party benchmark certification',
        ],
        examples: [
          {
            unacceptable: '“Nexora Pro is 100% foolproof and never fails.”',
            approved: '“Nexora Pro guarantees 99.9% uptime SLA with deterministic verification.”',
          },
        ],
      },
    }
  }

  // 2. Sales Proposal (Acme Exception)
  if (name.includes('sales_proposal')) {
    return {
      productFacts: {
        officialPrice: '₹899 per user per month billed annually (Acme Corp Exception)',
        billingConditions: 'Approved 10% volume discount from Tier 1 rate (₹999). Valid exclusively for Acme Corp account contracts with minimum 100 seats.',
        uptimeSla: '99.5% uptime commitment with priority support routing.',
        securityCertifications: 'Tenant-segregated AES-256 storage partition.',
        specifications: [
          { key: 'Customer Restriction', val: 'Exclusively valid for Acme Corp enterprise agreements' },
          { key: 'Minimum Volume', val: '100 licensed enterprise seats' },
          { key: 'Contract Term', val: '2026-01-01 to 2026-12-31 (Renewals require master review)' },
          { key: 'Department Authority', val: 'Tier 2 Sales Department Scoped Exception' },
        ],
        notes: 'Strictly restricted to Acme Corp enterprise contracts. General marketing copy or proposals to other clients quoting ₹899 violate Tier 1 pricing.',
        examples: [
          {
            unacceptable: '“Nexora Pro is offered to all new enterprise partners at ₹899/month.”',
            approved: '“Under the authorized Acme Corp enterprise renewal agreement, the approved volume price is ₹899 per user per month (min 100 seats).”',
            reason: '₹899 is an authorized Tier 2 departmental exception exclusively negotiated for Acme Corp.',
          },
        ],
      },
    }
  }

  // 3. Approved Claims Register
  if (name.includes('claims_register')) {
    return {
      approvedClaims: {
        claims: [
          {
            claim: '“99.9% guaranteed uptime SLA backed by 24/7 dedicated enterprise support”',
            evidence: 'Telemetric infrastructure logs & Section 1 SLA commitment in Product Master Catalogue v4.2.',
          },
          {
            claim: '“Certified SOC 2 Type II, ISO 27001, and fully GDPR compliant”',
            evidence: 'Independent third-party cybersecurity and compliance audit reports issued Q3 2026.',
          },
          {
            claim: '“System throughput supports 50,000 document governance verifications per hour”',
            evidence: 'Official enterprise load-testing benchmark report certified by engineering.',
          },
          {
            claim: '“Military-grade AES-256 encryption at rest and TLS 1.3 in transit”',
            evidence: 'Architecture Security Specification technical whitepaper.',
          },
          {
            claim: '“Up to 2x faster verification”',
            evidence: 'Certified internal productivity benchmark study.',
            qualification: 'MANDATORY QUALIFICATION REQUIRED: Must include “when compared to traditional manual review of 50+ page documents; certified by internal productivity benchmark study”.',
          },
        ],
        prohibitedGuarantees: [
          'Absolute guarantees promising "100% error-free", "foolproof compliance", "zero risk", or "flawless protection"',
          'Unsupported superlative claims asserting "the only real AI brand solution on Earth" or "infinitely superior to all competitors"',
          'Unsubstantiated competitor comparisons lacking independent lab validation',
        ],
        examples: [
          {
            unacceptable: '“ClaimLedger guarantees 100% error-free compliance with zero risk of mistakes.”',
            approved: '“ClaimLedger deterministically audits brand claims against multi-tier corporate truth to eliminate unverified statements.”',
            reason: 'Brand governance strictly prohibits absolute "100% error-free" guarantees.',
          },
          {
            unacceptable: '“Our AI is twice as fast as anything else on the market.”',
            approved: '“Delivers up to 2x faster verification when compared to traditional manual review of 50+ page documents (certified by productivity study).”',
            reason: 'Speed improvement assertions require explicit benchmark qualification.',
          },
        ],
      },
      productFacts: {
        specifications: [
          { key: 'Promotional Status', val: 'Registered & Certified Promotional Claims' },
          { key: 'Authority Tier', val: 'Tier 1 — Master Authority' },
          { key: 'Audit Frequency', val: 'Quarterly review by Compliance Committee' },
        ],
      },
    }
  }

  // 4. Terminology and Messaging Guide
  if (name.includes('terminology') || name.includes('messaging')) {
    return {
      terminology: {
        officialNames: ['Nexora Pro', 'Nexora Pro Elite'],
        prohibitedNames: [
          'Nexora Standard',
          'Nexora Lite',
          'Nexora Basic',
          'Nexora App',
          'The Nexora Tool',
        ],
        approvedTerms: [
          'Brand Governance Engine',
          'Deterministic Authority Hierarchy',
          'Evidence-Backed Verification',
          'Automated Compliance Audit',
          'Immutable Governance Ledger',
          'Authorised Human Reviewer',
        ],
        prohibitedInformal: [
          'AI Judge',
          'Grammar Cop',
          'Cheat Checker',
          'Fact Bot',
          'Robot Approver',
        ],
        officialSlogan: 'Create with confidence. Publish with consistency.',
        boilerplate25:
          'Nexora Technologies provides enterprise-grade AI brand governance platforms that deterministically audit content claims against authoritative multi-tier corporate guidelines before publication.',
        boilerplate50:
          'Founded to safeguard organisational reputation, Nexora Technologies builds deterministic brand-governance infrastructure. Its flagship platform, ClaimLedger, enables content creators and brand reviewers to verify marketing copy, sales proposals, and corporate communications against strict hierarchical standards in real time.',
        messagingPillars: [
          'Deterministic Authority: Multi-tier hierarchy ensures company-wide truth supersedes departmental variants.',
          'Seamless Workflow: Instant feedback empowers creators while preserving reviewer approval authority.',
          'Immutable Auditability: Cryptographic logs ensure regulatory compliance and verifiable accountability.',
        ],
      },
      brandTone: {
        personality: 'Professional, Trustworthy, Helpful, Approachable',
        toneAndVoice: 'Respectful, Confident, Clear, Customer-Focused',
        writingStyle: 'Formality, clarity, precision; avoid punitive phrasing.',
        prohibitedLanguage: 'Colloquial jargon, derogatory labels, aggressive imperatives.',
        examples: [
          {
            unacceptable: '“Our AI Judge will catch your mistakes.”',
            approved: '“ClaimLedger provides automated verification against approved brand guidelines.”',
            note: 'Use professional brand governance terms; never use "AI Judge" or punitive terminology.',
          },
        ],
      },
    }
  }

  // 5. Default: Brand Guidelines (v3.0 / v2.0)
  return {
    brandTone: {
      personality: 'Professional, Trustworthy, Helpful, and Approachable',
      toneAndVoice: 'Consistently Respectful, Confident, Clear, and Customer-Focused across all copy, sales documents, and public communications.',
      writingStyle: 'Communicate with formality, precision, and clarity. Avoid confusing technical jargon, ungrounded superlatives, and passive bureaucratic ambiguity.',
      prohibitedLanguage: 'Insults, offensive expressions, aggressive language, and disrespectful communication toward customers, partners, or competitors are strictly prohibited.',
      examples: [
        {
          unacceptable: '“Our competitor’s junk software is a scam and anyone using it is foolish.”',
          approved: '“Nexora Pro delivers 99.9% verified uptime with enterprise governance, helping teams transition from legacy spreadsheets with ease.”',
          note: 'Prohibits insults and derogatory competitor remarks; highlights positive factual differentiators.',
        },
        {
          unacceptable: '“Buy today or regret it immediately.”',
          approved: '“Explore how Nexora Pro streamlines brand assurance for your enterprise.”',
          note: 'Avoid high-pressure aggressive imperatives; use helpful and inviting communication.',
        },
      ],
    },
    visualStandards: {
      logoClearSpace: 'The Nexora monogram ("CL" monogram) requires clear space equal to 50% of its height on all sides. Never crowd typography or icons into this margin.',
      logoMinSize: 'Minimum reproduction height is 24px for digital screens and 12mm for print materials.',
      logoRestrictions: 'Never recolour, distort, stretch, rotate, add drop shadows, or place on busy unapproved photographic backgrounds.',
      palette: [
        { name: 'Deep Navy', hex: '#0A1F36', role: 'Primary Brand Colour / Text & Headers' },
        { name: 'Brand Teal', hex: '#0F766E', role: 'Secondary Brand Colour / Interactive Buttons' },
        { name: 'Light Teal', hex: '#5EEAD4', role: 'Accent / Badges & Glow Highlights' },
        { name: 'Canvas Slate', hex: '#F8FAFC', role: 'Neutral Canvas Background', border: 'border-slate-300' },
      ],
      typography: [
        { role: 'Headings & Titles', family: 'Plus Jakarta Sans', weight: 'Bold / 700' },
        { role: 'Body Copy & UI', family: 'Inter', weight: 'Regular 400 / Medium 500 / SemiBold 600' },
        { role: 'Monospace / Code & Dates', family: 'Fira Code / Roboto Mono', weight: 'Medium 500' },
      ],
      accessibility: [
        'WCAG 2.1 AA Contrast: Minimum 4.5:1 text-to-background contrast ratio for normal body copy (3:1 for large text $\\ge 18$pt).',
        'Descriptive Alt Text: All marketing graphics, illustrations, and UI screenshots require descriptive alternative text for screen readers.',
        'High-Contrast Focus Rings: Interactive buttons, links, and form inputs must display visible high-contrast focus rings for keyboard navigation.',
      ],
    },
    terminology: {
      officialNames: ['Nexora Pro', 'Nexora Pro Elite'],
      prohibitedNames: ['Nexora Standard', 'Nexora Lite', 'Nexora Basic'],
      approvedTerms: ['Brand Governance Engine', 'Deterministic Authority', 'Evidence-Backed Verification'],
      prohibitedInformal: ['AI Judge', 'Grammar Cop', 'Cheat Checker'],
      officialSlogan: 'Create with confidence. Publish with consistency.',
      boilerplate25: 'Nexora Technologies provides enterprise-grade AI brand governance platforms that deterministically audit content claims against authoritative multi-tier corporate guidelines before publication.',
      boilerplate50: 'Founded to safeguard organisational reputation, Nexora Technologies builds deterministic brand-governance infrastructure. Its flagship platform, ClaimLedger, enables content creators and brand reviewers to verify marketing copy against strict hierarchical standards in real time.',
      messagingPillars: [
        'Deterministic Authority: Multi-tier hierarchy ensures company-wide truth supersedes departmental variants.',
        'Seamless Workflow: Instant feedback empowers creators while preserving reviewer authority.',
        'Immutable Auditability: Cryptographic logs ensure regulatory compliance.',
      ],
    },
  }
}

// =========================================================================
// CREATOR GUIDELINE DETAIL MODAL COMPONENT
// =========================================================================
interface CreatorGuidelineModalProps {
  doc: KnowledgeDoc
  onClose: () => void
}

function CreatorGuidelineModal({ doc, onClose }: CreatorGuidelineModalProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'chunks' | 'pdf'>('rules')
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoomLevel, setZoomLevel] = useState<number>(100)

  // Document Chunks Query
  const chunksQ = useQuery({
    queryKey: ['document-chunks', doc.id],
    queryFn: () => api.getDocumentChunks(doc.id),
  })
  const chunks = chunksQ.data ?? []

  // Document URLs
  const fileUrl = api.getDocumentFileUrl(doc.id)
  const downloadUrl = api.getDocumentFileUrl(doc.id, true)
  const isPdf = !doc.name.toLowerCase().endsWith('.txt')

  // Calculated properties
  const tierMeta = TIER_META[doc.authorityTier]
  const details = useMemo(() => getGuidelineDetail(doc), [doc])

  const totalPages = useMemo(() => {
    if (chunks.length === 0) return 1
    const maxPage = Math.max(...chunks.map((c) => c.pageNumber ?? 1))
    return Math.max(1, maxPage)
  }, [chunks])

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopiedHex(hex)
    setTimeout(() => setCopiedHex(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-2xl flex flex-col border border-line animate-in fade-in zoom-in-95">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                             */}
        {/* ========================================================================= */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5 bg-canvas shrink-0">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand shrink-0">
              <BookOpen size={22} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${tierMeta.badgeCls}`}>
                  {tierMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-verified-soft px-2.5 py-0.5 text-[10px] font-bold text-verified uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-verified" />
                  Approved & Active
                </span>
                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-800">
                  v{doc.version ?? '1.0'}
                </span>
                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-800">
                  {doc.category ?? 'BRAND'}
                </span>
              </div>
              <h2 className="font-display font-bold text-xl text-[#0A1F36] tracking-tight">
                {doc.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted hover:bg-slate-200 hover:text-ink transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* COMPACT APPLICABILITY & VALIDITY RIBBON                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 gap-3 border-b border-line bg-surface px-6 py-3 text-xs sm:grid-cols-4 shrink-0">
          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase">Jurisdiction</span>
            <span className="font-bold text-slate-800 truncate block">
              {doc.authorityTier === 'TIER_1' ? 'Universal (All Departments)' : doc.departmentName ?? 'Department Specific'}
            </span>
          </div>

          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase">Product & Region</span>
            <span className="font-bold text-slate-800 truncate block">
              {doc.productScope ?? 'All Products'} · {doc.region ?? 'GLOBAL'}
            </span>
          </div>

          <div>
            <span className="text-muted block text-[11px] font-semibold uppercase">Date Validity</span>
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {doc.effectiveDate ?? 'Current'} to {doc.expiryDate ?? 'Ongoing'}
            </span>
          </div>

          <div className="flex items-center justify-end">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 hover:text-ink transition shadow-2xs"
            >
              <ExternalLink size={13} />
              Open Original PDF
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* THREE MODAL VIEW TABS                                                    */}
        {/* ========================================================================= */}
        <div className="flex border-b border-line px-6 gap-6 text-xs font-semibold bg-canvas shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 border-b-2 py-3 transition cursor-pointer ${
              activeTab === 'rules'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Sparkles size={14} />
            Approved Rules & Standards
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chunks')}
            className={`flex items-center gap-1.5 border-b-2 py-3 transition cursor-pointer ${
              activeTab === 'chunks'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Layers size={14} />
            Verbatim Chunks & Evidence ({chunks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 border-b-2 py-3 transition cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-[#0F766E] text-[#0F766E]'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <FileText size={14} />
            Original Document ({isPdf ? 'PDF' : 'Text'})
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY CONTENT                                                       */}
        {/* ========================================================================= */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-canvas">
          {/* ===================================================================== */}
          {/* TAB 1: APPROVED RULES & STANDARDS (ORGANIZED BY THE 5 GOVERNANCE AREAS) */}
          {/* ===================================================================== */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* AREA 1: PRODUCT FACTS & PRICING */}
              {details.productFacts && (
                <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏷️</span>
                      <h3 className="font-display font-bold text-base text-ink">
                        1. Product Facts & Pricing Rules
                      </h3>
                    </div>
                    <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">
                      Authoritative Specifications
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {details.productFacts.officialPrice && (
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <span className="text-xs font-semibold uppercase text-muted block mb-1">
                          Authoritative Pricing
                        </span>
                        <p className="font-display font-bold text-base text-brand">
                          {details.productFacts.officialPrice}
                        </p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {details.productFacts.billingConditions}
                        </p>
                      </div>
                    )}

                    {details.productFacts.uptimeSla && (
                      <div className="rounded-xl border border-line bg-canvas p-3.5">
                        <span className="text-xs font-semibold uppercase text-muted block mb-1">
                          Guaranteed Uptime & SLA
                        </span>
                        <p className="font-semibold text-sm text-slate-800">
                          {details.productFacts.uptimeSla}
                        </p>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {details.productFacts.securityCertifications}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Specifications List */}
                  {details.productFacts.specifications && (
                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-muted block mb-1">
                        Authoritative Technical Specifications
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {details.productFacts.specifications.map((spec) => (
                          <div key={spec.key} className="flex items-start justify-between gap-2 border-b border-line/40 pb-1">
                            <span className="text-muted font-medium">{spec.key}:</span>
                            <span className="font-bold text-slate-800 text-right">{spec.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examples for Product Facts */}
                  {details.productFacts.examples && details.productFacts.examples.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                        Approved vs Unacceptable Examples:
                      </span>
                      {details.productFacts.examples.map((ex, idx) => (
                        <div key={idx} className="grid gap-2.5 sm:grid-cols-2 text-xs">
                          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-rose-800">
                              <XCircle size={14} /> Unacceptable Phrasing:
                            </div>
                            <p className="text-slate-800 font-medium italic">{ex.unacceptable}</p>
                            {ex.reason && <p className="text-rose-700 text-[11px]">{ex.reason}</p>}
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-emerald-800">
                              <CheckCircle2 size={14} /> Approved Phrasing:
                            </div>
                            <p className="text-slate-800 font-medium">{ex.approved}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* AREA 2: BRAND TONE & COMMUNICATION */}
              {details.brandTone && (
                <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🗣️</span>
                      <h3 className="font-display font-bold text-base text-ink">
                        2. Brand Tone & Communication Standards
                      </h3>
                    </div>
                    <span className="rounded-md bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-bold text-teal-800">
                      Voice & Personality Rules
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                      <span className="font-semibold uppercase tracking-wider text-muted block">
                        Brand Personality
                      </span>
                      <p className="font-bold text-brand text-sm">{details.brandTone.personality}</p>
                      <p className="text-muted leading-relaxed">
                        Reflects our core identity across every customer touchpoint.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                      <span className="font-semibold uppercase tracking-wider text-muted block">
                        Tone & Voice
                      </span>
                      <p className="font-bold text-slate-800 text-sm">{details.brandTone.toneAndVoice}</p>
                      <p className="text-muted leading-relaxed">
                        Clear, confident, and focused on helping customers succeed.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                      <span className="font-semibold uppercase tracking-wider text-muted block">
                        Writing Style
                      </span>
                      <p className="font-bold text-slate-800 text-sm">Precision & Formality</p>
                      <p className="text-muted leading-relaxed">{details.brandTone.writingStyle}</p>
                    </div>
                  </div>

                  {/* Prohibited Language Alert */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-1">
                      <ShieldAlert size={15} />
                      <span>Strictly Prohibited Language & Expressions:</span>
                    </div>
                    <p className="text-rose-900 leading-relaxed font-medium">
                      {details.brandTone.prohibitedLanguage}
                    </p>
                  </div>

                  {/* Approved vs Unacceptable Communication Examples */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                      Approved vs Unacceptable Examples:
                    </span>
                    {details.brandTone.examples.map((ex, idx) => (
                      <div key={idx} className="grid gap-2.5 sm:grid-cols-2 text-xs">
                        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-1.5">
                          <div className="flex items-center gap-1 font-bold text-rose-800">
                            <XCircle size={14} /> Unacceptable Example:
                          </div>
                          <p className="text-slate-800 font-medium italic">“{ex.unacceptable}”</p>
                          {ex.note && <p className="text-rose-700 text-[11px]">{ex.note}</p>}
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-1.5">
                          <div className="flex items-center gap-1 font-bold text-emerald-800">
                            <CheckCircle2 size={14} /> Approved Example:
                          </div>
                          <p className="text-slate-800 font-medium">“{ex.approved}”</p>
                          <p className="text-emerald-700 text-[11px]">Consistent with customer-focused professional voice.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* AREA 3: TERMINOLOGY & MESSAGING */}
              {details.terminology && (
                <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📖</span>
                      <h3 className="font-display font-bold text-base text-ink">
                        3. Terminology & Official Messaging
                      </h3>
                    </div>
                    <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-bold text-purple-800">
                      Approved Nomenclature
                    </span>
                  </div>

                  {/* Slogan Banner */}
                  {details.terminology.officialSlogan && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 text-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 block mb-1">
                        Official Brand Slogan
                      </span>
                      <p className="font-display font-bold text-lg text-[#0A1F36]">
                        “{details.terminology.officialSlogan}”
                      </p>
                    </div>
                  )}

                  {/* Product Names: Approved vs Prohibited */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2">
                      <span className="font-bold text-emerald-900 block flex items-center gap-1">
                        <CheckCircle2 size={14} className="text-emerald-700" />
                        Approved Official Product Names
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details.terminology.officialNames.map((name) => (
                          <span key={name} className="rounded-md bg-white border border-emerald-300 px-2 py-1 font-bold text-emerald-900">
                            ✓ {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-2">
                      <span className="font-bold text-rose-900 block flex items-center gap-1">
                        <XCircle size={14} className="text-rose-700" />
                        Strictly Prohibited Alternative Names
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details.terminology.prohibitedNames.map((name) => (
                          <span key={name} className="rounded-md bg-white border border-rose-300 px-2 py-1 font-bold text-rose-900 line-through">
                            ✕ {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Core Terminology vs Informal Terms */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2">
                      <span className="font-semibold text-slate-800 block">
                        Approved Core Terminology:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details.terminology.approvedTerms.map((term) => (
                          <span key={term} className="rounded bg-surface border border-line px-2 py-0.5 font-medium text-slate-800">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-2">
                      <span className="font-semibold text-rose-800 block">
                        Prohibited Informal / Punitive Terms:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {details.terminology.prohibitedInformal.map((term) => (
                          <span key={term} className="rounded bg-surface border border-rose-200 px-2 py-0.5 font-medium text-rose-800 line-through">
                            {term}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted">
                        Do not use informal or punitive phrases; refer to "Automated Verification" or "Authorised Reviewer".
                      </p>
                    </div>
                  </div>

                  {/* Official Company Boilerplates */}
                  <div className="space-y-2 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-muted block">
                      Official Company Descriptions:
                    </span>
                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                      <span className="font-bold text-slate-800 block">25-Word Executive Description:</span>
                      <p className="text-slate-800 italic leading-relaxed">“{details.terminology.boilerplate25}”</p>
                    </div>
                    <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1">
                      <span className="font-bold text-slate-800 block">50-Word Corporate Boilerplate:</span>
                      <p className="text-slate-800 italic leading-relaxed">“{details.terminology.boilerplate50}”</p>
                    </div>
                  </div>

                  {/* Messaging Pillars */}
                  {details.terminology.messagingPillars && (
                    <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs space-y-2">
                      <span className="font-semibold uppercase tracking-wider text-muted block">
                        Core Messaging Pillars:
                      </span>
                      <div className="space-y-1.5">
                        {details.terminology.messagingPillars.map((pillar, i) => (
                          <p key={i} className="text-slate-800 leading-relaxed">
                            <strong className="text-brand">{i + 1}.</strong> {pillar}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* AREA 4: APPROVED CLAIMS & PROMOTIONS */}
              {details.approvedClaims && (
                <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛡️</span>
                      <h3 className="font-display font-bold text-base text-ink">
                        4. Approved Promotional Claims & Required Evidence
                      </h3>
                    </div>
                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                      Compliance Registry
                    </span>
                  </div>

                  {/* Certified Claims with Evidence */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                      Officially Approved Claims & Evidence:
                    </span>
                    {details.approvedClaims.claims.map((c, i) => (
                      <div key={i} className="rounded-xl border border-line bg-canvas p-3.5 text-xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900 text-sm">
                            {c.claim}
                          </p>
                          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold shrink-0">
                            VERIFIED EVIDENCE
                          </span>
                        </div>
                        <p className="text-muted">
                          <strong>Supporting Evidence:</strong> {c.evidence}
                        </p>
                        {c.qualification && (
                          <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900 font-medium">
                            ⚠️ {c.qualification}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Prohibited Guarantees */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <XCircle size={15} />
                      <span>Prohibited & Unsupported Claims:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-800 font-medium">
                      {details.approvedClaims.prohibitedGuarantees.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Examples */}
                  {details.approvedClaims.examples && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
                        Approved vs Unacceptable Examples:
                      </span>
                      {details.approvedClaims.examples.map((ex, idx) => (
                        <div key={idx} className="grid gap-2.5 sm:grid-cols-2 text-xs">
                          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-rose-800">
                              <XCircle size={14} /> Unacceptable Claim:
                            </div>
                            <p className="text-slate-800 font-medium italic">{ex.unacceptable}</p>
                            {ex.reason && <p className="text-rose-700 text-[11px]">{ex.reason}</p>}
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1">
                            <div className="flex items-center gap-1 font-bold text-emerald-800">
                              <CheckCircle2 size={14} /> Approved Claim:
                            </div>
                            <p className="text-slate-800 font-medium">{ex.approved}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* AREA 5: VISUAL & ACCESSIBILITY STANDARDS */}
              {details.visualStandards && (
                <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎨</span>
                      <h3 className="font-display font-bold text-base text-ink">
                        5. Visual & Digital Accessibility Standards
                      </h3>
                    </div>
                    <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-800">
                      WCAG 2.1 AA Compliant
                    </span>
                  </div>

                  {/* Logo Rules */}
                  <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs space-y-2">
                    <span className="font-semibold uppercase tracking-wider text-muted block">
                      Logo Usage & Clear Space Rules:
                    </span>
                    <div className="space-y-1 text-slate-800 leading-relaxed">
                      <p>• <strong>Clear Space:</strong> {details.visualStandards.logoClearSpace}</p>
                      <p>• <strong>Minimum Size:</strong> {details.visualStandards.logoMinSize}</p>
                      <p>• <strong>Restrictions:</strong> {details.visualStandards.logoRestrictions}</p>
                    </div>
                  </div>

                  {/* Brand Colour Swatches */}
                  <div className="space-y-2 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-muted block">
                      Approved Brand Colour Palette:
                    </span>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {details.visualStandards.palette.map((c) => (
                        <div
                          key={c.hex}
                          onClick={() => copyHex(c.hex)}
                          className="group relative cursor-pointer rounded-xl border border-line bg-canvas p-2.5 transition hover:border-brand hover:shadow-2xs"
                        >
                          <div
                            className={`h-12 w-full rounded-lg shadow-2xs mb-2 ${c.border ?? ''}`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <p className="font-bold text-ink truncate">{c.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-mono text-[11px] text-muted">{c.hex}</span>
                            <span className="text-[10px] text-brand opacity-0 group-hover:opacity-100 transition">
                              {copiedHex === c.hex ? 'Copied!' : 'Copy'}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted truncate mt-0.5">{c.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Typography Rules */}
                  <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs space-y-2">
                    <span className="font-semibold uppercase tracking-wider text-muted block">
                      Approved Typography Hierarchy:
                    </span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {details.visualStandards.typography.map((t) => (
                        <div key={t.role} className="border-b border-line/40 pb-1.5 sm:border-0 sm:pb-0">
                          <span className="text-muted block text-[11px]">{t.role}</span>
                          <span className="font-bold text-slate-800 text-sm block">{t.family}</span>
                          <span className="text-muted text-[11px]">{t.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accessibility Checklist */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs space-y-2">
                    <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      Digital Accessibility Standards (WCAG 2.1 AA):
                    </span>
                    <ul className="space-y-1 text-slate-800 leading-relaxed">
                      {details.visualStandards.accessibility.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-700 font-bold">✓</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: VERBATIM EXTRACTED CHUNKS & EVIDENCE                           */}
          {/* ===================================================================== */}
          {activeTab === 'chunks' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted leading-relaxed">
                <p>
                  These are the exact text chunks indexed into ClaimLedger's vector database for this document. When you submit content, the pure Java deterministic authority engine compares your statements verbatim and semantically against these chunks.
                </p>
              </div>

              {chunksQ.isLoading && <p className="py-8 text-center text-muted">Loading chunks…</p>}

              {chunks.length === 0 && !chunksQ.isLoading && (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-muted text-xs">
                  No extracted text chunks found for this document.
                </div>
              )}

              <div className="space-y-3">
                {chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="rounded-2xl border border-line bg-surface p-4.5 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 font-mono text-[11px] font-bold text-teal-800">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        <span className="text-xs text-muted">Page {chunk.pageNumber ?? 1}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check size={13} />
                        768-dim Vector Indexed
                      </span>
                    </div>
                    <p className="font-serif text-sm text-slate-800 leading-relaxed">
                      {chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: ORIGINAL DOCUMENT PDF VIEWER                                   */}
          {/* ===================================================================== */}
          {activeTab === 'pdf' && (
            <div className="space-y-3">
              {/* PDF Viewer Controls Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                    PDF
                  </span>
                  <span className="font-semibold text-slate-800 truncate max-w-[260px]">
                    {doc.name}
                  </span>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2 bg-canvas px-2.5 py-1 rounded-xl border border-line shadow-2xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer"
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
                    className="rounded p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Zoom Controls & Open Button */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-canvas px-2 py-1 rounded-xl border border-line">
                    <button
                      type="button"
                      disabled={zoomLevel <= 75}
                      onClick={() => setZoomLevel((z) => Math.max(75, z - 25))}
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="font-mono text-[11px] font-semibold px-1">{zoomLevel}%</span>
                    <button
                      type="button"
                      disabled={zoomLevel >= 175}
                      onClick={() => setZoomLevel((z) => Math.min(175, z + 25))}
                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                  </div>

                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 hover:text-ink transition shadow-2xs"
                  >
                    <ExternalLink size={13} />
                    Open in New Window
                  </a>
                </div>
              </div>

              {/* Embedded Document Frame */}
              <div className="rounded-2xl border border-line bg-slate-100 p-2 overflow-hidden shadow-inner">
                <iframe
                  src={`${fileUrl}#page=${currentPage}&zoom=${zoomLevel}`}
                  title={doc.name}
                  className="w-full h-[500px] rounded-xl border border-line bg-white shadow-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER                                                             */}
        {/* ========================================================================= */}
        <div className="border-t border-line px-6 py-4 bg-canvas flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Info size={14} className="text-[#0F766E]" />
            <span>Deterministic authority: All content claims are verified against this document before publishing.</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Download PDF
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#0A1F36] px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              Close Guidelines
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
