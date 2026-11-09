import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  History as HistoryIcon,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  Users,
  Wand2,
  X,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatWhen } from '../components/AuditTimeline'
import { DEPARTMENTS, type ActionType, type AuditEntry } from '../types'

type ActivityCategory = 'ALL' | 'CONTENT_REVIEW' | 'KNOWLEDGE' | 'USER_MANAGEMENT'
type DateRangeOption = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS'

const ACTION_CONFIG: Record<
  ActionType,
  { label: string; category: ActivityCategory; cls: string; icon: any; desc: string }
> = {
  SUBMITTED: {
    label: 'Content Submitted',
    category: 'CONTENT_REVIEW',
    cls: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: FileText,
    desc: 'Creator submitted new content for brand truth verification.',
  },
  ANALYZED: {
    label: 'AI Analyzed',
    category: 'CONTENT_REVIEW',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: ShieldCheck,
    desc: 'Deterministic engine verified claims against Tier 1-3 knowledge.',
  },
  CREATOR_REVISED: {
    label: 'Creator Revised',
    category: 'CONTENT_REVIEW',
    cls: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: Wand2,
    desc: 'Creator submitted revision and bumped revision number.',
  },
  REVIEWER_APPROVED: {
    label: 'Reviewer Approved',
    category: 'CONTENT_REVIEW',
    cls: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    icon: CheckCircle2,
    desc: 'Authorised reviewer approved content for publication.',
  },
  REVIEWER_CHANGES_REQUESTED: {
    label: 'Changes Requested',
    category: 'CONTENT_REVIEW',
    cls: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: AlertTriangle,
    desc: 'Reviewer returned content with revision instructions.',
  },
  REVIEWER_REJECTED: {
    label: 'Content Rejected',
    category: 'CONTENT_REVIEW',
    cls: 'bg-rose-50 text-rose-900 border-rose-300',
    icon: XCircle,
    desc: 'Reviewer rejected content due to brand truth violations.',
  },
  KNOWLEDGE_UPLOADED: {
    label: 'Knowledge Uploaded',
    category: 'KNOWLEDGE',
    cls: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    icon: BookOpen,
    desc: 'New guideline, catalogue, or proposal PDF uploaded and chunked.',
  },
  KNOWLEDGE_APPROVED: {
    label: 'Knowledge Approved',
    category: 'KNOWLEDGE',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    desc: 'Document approved as active authoritative knowledge source.',
  },
  KNOWLEDGE_SUPERSEDED: {
    label: 'Knowledge Superseded',
    category: 'KNOWLEDGE',
    cls: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: Layers,
    desc: 'Document marked superseded by a newer version.',
  },
  KNOWLEDGE_WITHDRAWN: {
    label: 'Knowledge Rejected/Withdrawn',
    category: 'KNOWLEDGE',
    cls: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: ShieldAlert,
    desc: 'Document rejected or withdrawn from knowledge repository.',
  },
  KNOWLEDGE_TIER_CHANGED: {
    label: 'Authority Tier Updated',
    category: 'KNOWLEDGE',
    cls: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: Shield,
    desc: 'Authority tier, jurisdiction, or validity dates modified.',
  },
  KNOWLEDGE_SCOPE_CHANGED: {
    label: 'Scope Changed',
    category: 'KNOWLEDGE',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: Wand2,
    desc: 'Product scope or regional applicability updated.',
  },
  KNOWLEDGE_REPLACED: {
    label: 'Version Replaced',
    category: 'KNOWLEDGE',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: RefreshCw,
    desc: 'Document replaced with updated file version.',
  },
  USER_CREATED: {
    label: 'User Created',
    category: 'USER_MANAGEMENT',
    cls: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: UserIcon,
    desc: 'New user account created or invitation issued.',
  },
  USER_UPDATED: {
    label: 'User Permissions Updated',
    category: 'USER_MANAGEMENT',
    cls: 'bg-violet-50 text-violet-800 border-violet-200',
    icon: Users,
    desc: 'User role, department, or knowledge approval permission modified.',
  },
  USER_STATUS_TOGGLED: {
    label: 'Account Status Toggled',
    category: 'USER_MANAGEMENT',
    cls: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: Clock,
    desc: 'User account status set to active or suspended.',
  },
}

export function History() {
  // Filters State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory>('ALL')
  const [actionFilter, setActionFilter] = useState<string>('ALL')
  const [actorFilter, setActorFilter] = useState<string>('ALL')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL')

  // Selected Activity for Details Modal
  const [selectedActivity, setSelectedActivity] = useState<AuditEntry | null>(null)

  // Queries
  const auditQ = useQuery({ queryKey: ['audit-all'], queryFn: api.listGlobalAudit })
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const docsQ = useQuery({ queryKey: ['documents'], queryFn: () => api.listDocuments() })

  const auditLogs = auditQ.data ?? []
  const submissions = submissionsQ.data ?? []
  const documents = docsQ.data ?? []

  // Submissions map
  const subMap = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions])
  const docMap = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents])

  // Unique list of actors for filter dropdown
  const uniqueActors = useMemo(() => {
    const names = new Set<string>()
    auditLogs.forEach((a) => {
      if (a.actorName) names.add(a.actorName)
    })
    return Array.from(names).sort()
  }, [auditLogs])

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const total = auditLogs.length
    const contentActions = auditLogs.filter((a) => {
      const cfg = ACTION_CONFIG[a.action]
      return cfg?.category === 'CONTENT_REVIEW'
    }).length

    const knowledgeActions = auditLogs.filter((a) => {
      const cfg = ACTION_CONFIG[a.action]
      return cfg?.category === 'KNOWLEDGE'
    }).length

    const userActions = auditLogs.filter((a) => {
      const cfg = ACTION_CONFIG[a.action]
      return cfg?.category === 'USER_MANAGEMENT'
    }).length

    return { total, contentActions, knowledgeActions, userActions }
  }, [auditLogs])

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000
    const sevenDays = 7 * oneDay
    const thirtyDays = 30 * oneDay

    return auditLogs.filter((entry) => {
      const cfg = ACTION_CONFIG[entry.action]

      // Category filter
      if (categoryFilter !== 'ALL') {
        if (cfg?.category !== categoryFilter) return false
      }

      // Action type filter
      if (actionFilter !== 'ALL' && entry.action !== actionFilter) return false

      // Actor filter
      if (actorFilter !== 'ALL' && entry.actorName !== actorFilter) return false

      // Department filter
      if (deptFilter !== 'ALL') {
        const subDept = entry.submissionId ? subMap.get(entry.submissionId)?.departmentName : null
        const docDept = entry.documentId ? docMap.get(entry.documentId)?.departmentName : null
        const itemDept = entry.departmentName || subDept || docDept
        if (itemDept !== deptFilter) return false
      }

      // Date range filter
      if (dateRange !== 'ALL') {
        const entryTime = new Date(entry.createdAt).getTime()
        const diff = now - entryTime
        if (dateRange === 'TODAY' && diff > oneDay) return false
        if (dateRange === '7_DAYS' && diff > sevenDays) return false
        if (dateRange === '30_DAYS' && diff > thirtyDays) return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchActor = (entry.actorName || '').toLowerCase().includes(q)
        const matchEmail = (entry.actorEmail || '').toLowerCase().includes(q)
        const matchComment = (entry.comment || '').toLowerCase().includes(q)
        const matchResource = (entry.resourceName || '').toLowerCase().includes(q)
        const subTitle = entry.submissionId ? subMap.get(entry.submissionId)?.title.toLowerCase() ?? '' : ''
        const docTitle = entry.documentId ? docMap.get(entry.documentId)?.name.toLowerCase() ?? '' : ''
        if (
          !matchActor &&
          !matchEmail &&
          !matchComment &&
          !matchResource &&
          !subTitle.includes(q) &&
          !docTitle.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [auditLogs, categoryFilter, actionFilter, actorFilter, deptFilter, dateRange, search, subMap, docMap])

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    actionFilter !== 'ALL' ||
    actorFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    dateRange !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('ALL')
    setActionFilter('ALL')
    setActorFilter('ALL')
    setDeptFilter('ALL')
    setDateRange('ALL')
  }

  // Export CSV
  const exportCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = [
      'Activity ID',
      'Timestamp',
      'Action Type',
      'Category',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Resource / Target',
      'Department',
      'Details / Comment',
    ]
    const rows = filteredLogs.map((e) => {
      const cfg = ACTION_CONFIG[e.action]
      const sub = e.submissionId ? subMap.get(e.submissionId) : null
      const doc = e.documentId ? docMap.get(e.documentId) : null
      const resource = e.resourceName || sub?.title || doc?.name || 'N/A'
      const dept = e.departmentName || sub?.departmentName || doc?.departmentName || 'Organisation-wide'

      return [
        e.id,
        new Date(e.createdAt).toISOString(),
        e.action,
        cfg?.category || 'GENERAL',
        `"${(e.actorName || '').replace(/"/g, '""')}"`,
        `"${(e.actorEmail || '').replace(/"/g, '""')}"`,
        e.actorRole || '',
        `"${resource.replace(/"/g, '""')}"`,
        `"${dept.replace(/"/g, '""')}"`,
        `"${(e.comment || '').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `claimledger-governance-audit-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0F766E] text-white text-xs font-bold font-mono">
                06
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Accountability & Compliance
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              Audit & Activity
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              Append-only regulatory audit ledger. Every content submission, deterministic AI verification run, human reviewer decision, knowledge document change, and user permission modification is immutably recorded.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-canvas transition"
            >
              <Download size={14} /> Export Audit CSV
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheck size={14} className="text-[#0F766E]" />
              Immutable Ledger
            </span>
          </div>
        </div>
      </div>

      {/* 2. Audit Dashboard Metrics Ribbon (4 Cards with click-to-filter) */}
      <section aria-labelledby="audit-metrics-heading">
        <h2 id="audit-metrics-heading" className="sr-only">Activity Metrics Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total Activities */}
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('ALL')
              setActionFilter('ALL')
            }}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              categoryFilter === 'ALL'
                ? 'border-[#0F766E] bg-teal-50/50 ring-2 ring-[#0F766E]/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Activities</span>
              <HistoryIcon size={16} className="text-[#0F766E]" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-[#0A1F36]">{metrics.total}</span>
              <p className="mt-0.5 text-xs text-muted">All ledger records</p>
            </div>
          </button>

          {/* Content & Review Actions */}
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('CONTENT_REVIEW')
              setActionFilter('ALL')
            }}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              categoryFilter === 'CONTENT_REVIEW'
                ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
                Content & Reviews
              </span>
              <FileCheck2 size={16} className="text-blue-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-blue-950">{metrics.contentActions}</span>
              <p className="mt-0.5 text-xs text-blue-700">Submissions, AI runs & reviews</p>
            </div>
          </button>

          {/* Knowledge Document Changes */}
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('KNOWLEDGE')
              setActionFilter('ALL')
            }}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              categoryFilter === 'KNOWLEDGE'
                ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">
                Knowledge Changes
              </span>
              <BookOpen size={16} className="text-purple-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-purple-950">{metrics.knowledgeActions}</span>
              <p className="mt-0.5 text-xs text-purple-700">Uploads, tiers & supersessions</p>
            </div>
          </button>

          {/* User & Permission Changes */}
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('USER_MANAGEMENT')
              setActionFilter('ALL')
            }}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              categoryFilter === 'USER_MANAGEMENT'
                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                User & Permissions
              </span>
              <Users size={16} className="text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-emerald-950">{metrics.userActions}</span>
              <p className="mt-0.5 text-xs text-emerald-700">Roles, scopes & status</p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Search & Multi-Dimensional Filters */}
      <section aria-labelledby="activity-filters" className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3">
        <h2 id="activity-filters" className="sr-only">Activity Log Filters</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ledger by actor name, email, target resource, or comment…"
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
            {/* Category Filter */}
            <select
              aria-label="Filter by Activity Category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as ActivityCategory)
                setActionFilter('ALL')
              }}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="CONTENT_REVIEW">Content & Reviews</option>
              <option value="KNOWLEDGE">Knowledge Governance</option>
              <option value="USER_MANAGEMENT">User & Access Control</option>
            </select>

            {/* Action Type Filter */}
            <select
              aria-label="Filter by Action Type"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Action Types</option>
              {Object.entries(ACTION_CONFIG)
                .filter(([_, cfg]) => categoryFilter === 'ALL' || cfg.category === categoryFilter)
                .map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
            </select>

            {/* Department Filter */}
            <select
              aria-label="Filter by Department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Actor Filter */}
            <select
              aria-label="Filter by Performed By"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Actors</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>

            {/* Date Range Filter */}
            <select
              aria-label="Filter by Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="7_DAYS">Past 7 Days</option>
              <option value="30_DAYS">Past 30 Days</option>
            </select>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:bg-canvas hover:text-ink"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Indicator */}
        <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-muted">
          <span>
            Showing <strong className="text-ink">{filteredLogs.length}</strong> of{' '}
            <strong className="text-ink">{auditLogs.length}</strong> immutable ledger entries
          </span>
          {hasActiveFilters && (
            <span className="text-[#0F766E] font-medium">Filtered results active</span>
          )}
        </div>
      </section>

      {/* 4. Activity Log Table */}
      <section aria-labelledby="activity-table-heading" className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <h2 id="activity-table-heading" className="sr-only">Governance Activities Table</h2>

        {auditQ.isLoading ? (
          <div className="p-12 text-center text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-2" />
            <p className="text-sm font-medium">Loading governance ledger…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <HistoryIcon size={32} className="mx-auto mb-3 text-muted/60" />
            <p className="font-semibold text-ink">No audit entries matched your criteria</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting or clearing your filters to see more ledger events.'
                : 'No governance events recorded yet.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-soft"
              >
                <RotateCcw size={14} /> Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-3.5">Activity & Action</th>
                  <th scope="col" className="px-4 py-3.5">Performed By</th>
                  <th scope="col" className="px-4 py-3.5">Affected Target</th>
                  <th scope="col" className="px-3 py-3.5">Department</th>
                  <th scope="col" className="px-4 py-3.5">Timestamp</th>
                  <th scope="col" className="px-4 py-3.5">Details & Comment</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredLogs.map((entry) => {
                  const cfg = ACTION_CONFIG[entry.action] ?? {
                    label: entry.action,
                    category: 'CONTENT_REVIEW' as const,
                    cls: 'bg-slate-100 text-slate-800 border-slate-300',
                    icon: HistoryIcon,
                    desc: 'Governance action recorded.',
                  }
                  const Icon = cfg.icon

                  // Target resource
                  const sub = entry.submissionId ? subMap.get(entry.submissionId) : null
                  const doc = entry.documentId ? docMap.get(entry.documentId) : null
                  const resourceTitle = entry.resourceName || sub?.title || doc?.name || (entry.submissionId ? `Submission #${entry.submissionId.slice(0, 8)}` : 'System Entity')
                  const dept = entry.departmentName || sub?.departmentName || doc?.departmentName || 'General'

                  return (
                    <tr key={entry.id} className="hover:bg-canvas/60 transition-colors">
                      {/* 1. Activity & Action */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${cfg.cls}`}>
                            <Icon size={16} />
                          </span>
                          <div>
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${cfg.cls}`}>
                              {cfg.label}
                            </span>
                            <p className="text-[11px] text-muted font-mono mt-0.5">
                              {entry.action}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Performed By */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                            {(entry.actorName || 'User')
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink leading-tight">
                              {entry.actorName}
                            </p>
                            <p className="text-[11px] text-muted leading-tight">
                              {entry.actorRole || 'Actor'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Affected Target Resource */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          {entry.submissionId ? (
                            <FileText size={14} className="mt-0.5 shrink-0 text-blue-600" />
                          ) : entry.documentId ? (
                            <BookOpen size={14} className="mt-0.5 shrink-0 text-teal-600" />
                          ) : (
                            <UserIcon size={14} className="mt-0.5 shrink-0 text-purple-600" />
                          )}
                          <div className="min-w-0">
                            {entry.submissionId ? (
                              <Link
                                to={`/admin/submissions/${entry.submissionId}`}
                                className="font-semibold text-xs text-ink hover:text-[#0F766E] transition line-clamp-1"
                              >
                                {resourceTitle}
                              </Link>
                            ) : (
                              <span className="font-semibold text-xs text-ink line-clamp-1">
                                {resourceTitle}
                              </span>
                            )}
                            <span className="text-[11px] text-muted block">
                              {entry.submissionId ? 'Content Submission' : entry.documentId ? 'Knowledge Document' : 'User Record'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Department */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${getDeptBadge(dept)}`}>
                          {dept}
                        </span>
                      </td>

                      {/* 5. Timestamp */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted/70" />
                          <span>{formatWhen(entry.createdAt)}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted/80">
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </td>

                      {/* 6. Details & Comment */}
                      <td className="px-4 py-4 max-w-sm">
                        {entry.comment ? (
                          <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">
                            “{entry.comment}”
                          </p>
                        ) : (
                          <span className="text-xs text-muted italic">No comments recorded</span>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedActivity(entry)}
                          className="inline-flex items-center gap-1 rounded-lg bg-canvas border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] transition shadow-2xs cursor-pointer"
                        >
                          Inspect <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Problem Statement Alignment & Governance Architecture */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-slate-50 to-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-[#0F766E]" />
              <h3 className="font-display text-base font-bold text-[#0A1F36]">
                Immutable Audit Trails Guarantee Accountability
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              In enterprise brand governance, content drift and compliance lapses often go undetected when decisions happen in siloed email threads or informal chats. ClaimLedger provides <strong>100% decision traceability</strong>: every submission, AI verification score, reviewer rejection, knowledge base upload, and role permission modification is immutably written to the governance ledger.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                ✓ Non-repudiable Human Approvals
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-blue-800">
                ✓ Verifiable Change History
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-purple-800">
                ✓ Exportable for Regulatory Audits
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 text-xs shrink-0 md:w-72">
            <div className="flex items-center gap-2 font-bold text-ink mb-1.5">
              <Database size={16} className="text-[#0F766E]" />
              <span>Tamper-Resistant Storage</span>
            </div>
            <p className="text-muted leading-relaxed">
              Audit records are append-only. No application role (including Organisation Admin) is permitted to modify or delete historical records.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ACTIVITY DETAILS INSPECTION MODAL                                        */}
      {/* ========================================================================= */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          subMap={subMap}
          docMap={docMap}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  )
}

function getDeptBadge(name?: string | null) {
  if (!name) return 'bg-slate-100 text-slate-800 border-slate-200'
  const lower = name.toLowerCase()
  if (lower.includes('market')) return 'bg-teal-50 text-teal-800 border-teal-200'
  if (lower.includes('sales')) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (lower.includes('hr') || lower.includes('human')) return 'bg-purple-50 text-purple-800 border-purple-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

// =========================================================================
// ACTIVITY DETAILS MODAL COMPONENT
// =========================================================================
interface ActivityDetailModalProps {
  activity: AuditEntry
  subMap: Map<string, any>
  docMap: Map<string, any>
  onClose: () => void
}

function ActivityDetailModal({ activity, subMap, docMap, onClose }: ActivityDetailModalProps) {
  const cfg = ACTION_CONFIG[activity.action] ?? {
    label: activity.action,
    category: 'CONTENT_REVIEW' as const,
    cls: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: HistoryIcon,
    desc: 'Governance action recorded.',
  }
  const Icon = cfg.icon

  const sub = activity.submissionId ? subMap.get(activity.submissionId) : null
  const doc = activity.documentId ? docMap.get(activity.documentId) : null
  const resourceTitle = activity.resourceName || sub?.title || doc?.name || (activity.submissionId ? `Submission #${activity.submissionId.slice(0, 8)}` : 'System Entity')
  const dept = activity.departmentName || sub?.departmentName || doc?.departmentName || 'Organisation-wide'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line p-6 bg-canvas shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>
                <Icon size={14} />
                {cfg.label}
              </span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-mono font-bold text-slate-800">
                {cfg.category}
              </span>
              <span className="font-mono text-xs text-muted">ID: {activity.id}</span>
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight text-[#0A1F36]">
              {cfg.desc}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-slate-200/50 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
          {/* Actor Profile */}
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="font-display font-bold uppercase tracking-wider text-muted text-[11px] mb-2.5">
              Actor (Performed By)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted block">Full Name</span>
                <span className="font-bold text-ink text-sm">{activity.actorName}</span>
              </div>
              <div>
                <span className="text-muted block">Email Address</span>
                <span className="font-mono text-slate-700">{activity.actorEmail || 'system@claimledger.internal'}</span>
              </div>
              <div>
                <span className="text-muted block">Security Role</span>
                <span className="font-bold text-slate-800">{activity.actorRole || 'SYSTEM'}</span>
              </div>
              <div>
                <span className="text-muted block">Exact Timestamp</span>
                <span className="font-mono text-slate-700">
                  {new Date(activity.createdAt).toISOString()}
                </span>
              </div>
            </div>
          </div>

          {/* Affected Target Resource */}
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display font-bold uppercase tracking-wider text-muted text-[11px]">
                Affected Resource & Target
              </h3>
              <span className="text-muted font-medium">Department: {dept}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-canvas rounded-lg p-3 border border-line">
                <div>
                  <p className="font-bold text-sm text-ink">{resourceTitle}</p>
                  <p className="text-[11px] text-muted">
                    {activity.submissionId
                      ? `Submission ID: ${activity.submissionId}`
                      : activity.documentId
                      ? `Document ID: ${activity.documentId}`
                      : 'Organisation Configuration'}
                  </p>
                </div>

                {activity.submissionId && (
                  <Link
                    to={`/admin/submissions/${activity.submissionId}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-line px-2.5 py-1 font-semibold text-[#0F766E] hover:bg-teal-50 transition"
                  >
                    View Submission <ExternalLink size={12} />
                  </Link>
                )}
                {activity.documentId && (
                  <Link
                    to="/admin/approvals"
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-line px-2.5 py-1 font-semibold text-[#0F766E] hover:bg-teal-50 transition"
                  >
                    View Document <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Details & Comments */}
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="font-display font-bold uppercase tracking-wider text-muted text-[11px] mb-2">
              Action Details & Verbatim Justification
            </h3>
            {activity.comment ? (
              <blockquote className="rounded-lg border-l-3 border-[#0F766E] bg-canvas p-3 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                “{activity.comment}”
              </blockquote>
            ) : (
              <p className="text-muted italic">No comments or additional justification provided.</p>
            )}
          </div>

          {/* Tamper-Evident Ledger Integrity */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between text-emerald-950">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <div>
                <p className="font-bold">Cryptographically Grounded & Tamper-Resistant</p>
                <p className="text-[11px] text-slate-600">
                  This ledger entry is append-only and cannot be altered or purged by any user role.
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded">
              VERIFIED
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-line p-4 bg-canvas shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-soft transition"
          >
            Close Activity Details
          </button>
        </div>
      </div>
    </div>
  )
}
