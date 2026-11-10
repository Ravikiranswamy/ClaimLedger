import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Filter,
  Image as ImageIcon,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { DEPARTMENTS, type Submission, type SubmissionStatus } from '../types'

type StatusFilterType = 'ALL' | 'AWAITING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'DRAFT'
type SortOrder = 'NEWEST' | 'OLDEST' | 'MOST_FLAGS'

const AWAITING_STATUSES: SubmissionStatus[] = ['FLAGGED', 'IN_REVIEW', 'VERIFIED', 'ANALYZING']

export function AdminSubmissions() {
  const { user } = useAuth()
  const isManager = user?.role === 'DEPT_MANAGER'
  const managerDeptName =
    user?.departmentName ||
    DEPARTMENTS.find((d) => d.id === user?.departmentId)?.name ||
    'Marketing'

  const [searchParams] = useSearchParams()
  const urlStatus = searchParams.get('status') as StatusFilterType | null

  // Filters state
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('ALL')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>(
    urlStatus && ['ALL', 'AWAITING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'DRAFT'].includes(urlStatus)
      ? urlStatus
      : 'ALL'
  )
  const [sortBy, setSortBy] = useState<SortOrder>('NEWEST')

  useEffect(() => {
    if (urlStatus && ['ALL', 'AWAITING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'DRAFT'].includes(urlStatus)) {
      setStatusFilter(urlStatus)
    }
  }, [urlStatus])

  // Query submissions across the entire organisation
  const submissionsQ = useQuery({
    queryKey: ['admin-submissions-list'],
    queryFn: () => api.listSubmissions(),
  })

  const submissions = submissionsQ.data ?? []

  // Visible submissions for this user (if manager, strictly scoped to their department)
  const scopedSubmissions = useMemo(() => {
    if (!isManager) return submissions
    return submissions.filter(
      (s) =>
        s.departmentId === user?.departmentId ||
        (s.departmentName && s.departmentName.toLowerCase() === managerDeptName.toLowerCase())
    )
  }, [submissions, isManager, user?.departmentId, managerDeptName])

  // Overview metrics computed from actual backend data
  const metrics = useMemo(() => {
    const total = scopedSubmissions.length
    const awaiting = scopedSubmissions.filter((s) => AWAITING_STATUSES.includes(s.status)).length
    const changesRequested = scopedSubmissions.filter((s) => s.status === 'CHANGES_REQUESTED').length
    const approved = scopedSubmissions.filter((s) => s.status === 'APPROVED').length
    const rejected = scopedSubmissions.filter((s) => s.status === 'REJECTED').length
    const totalViolations = scopedSubmissions.reduce(
      (acc, s) => acc + s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length,
      0
    )
    return { total, awaiting, changesRequested, approved, rejected, totalViolations }
  }, [scopedSubmissions])

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    return scopedSubmissions
      .filter((s) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase()
          const matchTitle = s.title.toLowerCase().includes(q)
          const matchAuthor = (s.submittedByName ?? '').toLowerCase().includes(q)
          const matchDept = (s.departmentName ?? '').toLowerCase().includes(q)
          const matchContent = (s.content ?? '').toLowerCase().includes(q)
          if (!matchTitle && !matchAuthor && !matchDept && !matchContent) {
            return false
          }
        }

        // Department filter
        if (deptFilter !== 'ALL') {
          if (s.departmentId !== deptFilter && s.departmentName !== deptFilter) {
            return false
          }
        }

        // Content type filter
        if (contentTypeFilter !== 'ALL') {
          const cType = s.contentType ?? 'TEXT'
          if (cType !== contentTypeFilter) {
            return false
          }
        }

        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'AWAITING_REVIEW') {
            if (!AWAITING_STATUSES.includes(s.status)) return false
          } else if (s.status !== statusFilter) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        if (sortBy === 'MOST_FLAGS') {
          const flagsA = a.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
          const flagsB = b.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
          return flagsB - flagsA
        }
        return 0
      })
  }, [submissions, search, deptFilter, contentTypeFilter, statusFilter, sortBy])

  const hasActiveFilters = search.trim() !== '' || deptFilter !== 'ALL' || contentTypeFilter !== 'ALL' || statusFilter !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setDeptFilter('ALL')
    setContentTypeFilter('ALL')
    setStatusFilter('ALL')
    setSortBy('NEWEST')
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                {isManager ? 'Department Oversight' : 'Organisation Governance'}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              {isManager ? 'Department Submissions' : 'Content & Submissions'}
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              {isManager
                ? `Real-time oversight of all submissions, truth verifications, and reviews for the ${managerDeptName} department.`
                : 'Real-time oversight of all marketing, sales, and HR submissions across the organisation. Monitor deterministic AI claim extraction, authority resolution against Tier 1 catalogues, and reviewer decision history.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck size={14} className="text-emerald-600" />
              {isManager ? 'Department Oversight' : 'Admin Oversight Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Organisation-wide Submission Overview (KPI Metric Cards) */}
      <section aria-labelledby="overview-metrics-heading">
        <h2 id="overview-metrics-heading" className="sr-only">Submission Metrics Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Total Submissions */}
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'ALL'
                ? 'border-[#0F766E] bg-teal-50/50 ring-2 ring-[#0F766E]/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Submissions</span>
              <FileText size={16} className="text-[#0F766E]" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-[#0A1F36]">{metrics.total}</span>
              <p className="mt-0.5 text-xs text-muted">Across all departments</p>
            </div>
          </button>

          {/* Awaiting Review */}
          <button
            type="button"
            onClick={() => setStatusFilter('AWAITING_REVIEW')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'AWAITING_REVIEW'
                ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Awaiting Review</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-amber-900">{metrics.awaiting}</span>
              <p className="mt-0.5 text-xs text-amber-700">Pending reviewer decisions</p>
            </div>
          </button>

          {/* Changes Requested */}
          <button
            type="button"
            onClick={() => setStatusFilter('CHANGES_REQUESTED')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'CHANGES_REQUESTED'
                ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">Changes Requested</span>
              <AlertCircle size={16} className="text-orange-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-orange-900">{metrics.changesRequested}</span>
              <p className="mt-0.5 text-xs text-orange-700">Creator revisions pending</p>
            </div>
          </button>

          {/* Approved */}
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'APPROVED'
                ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Approved</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-emerald-900">{metrics.approved}</span>
              <p className="mt-0.5 text-xs text-emerald-700">Passed governance review</p>
            </div>
          </button>

          {/* Rejected */}
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'REJECTED'
                ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Rejected</span>
              <ShieldAlert size={16} className="text-rose-600" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-rose-900">{metrics.rejected}</span>
              <p className="mt-0.5 text-xs text-rose-700">Rejected after review</p>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Submissions Search & Filter Bar */}
      <section aria-labelledby="filter-section-heading" className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <h2 id="filter-section-heading" className="sr-only">Submissions Filters</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, creator name, excerpt, or keywords…"
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            {isManager ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-xs font-medium text-teal-900">
                <Filter size={14} className="text-[#0F766E]" />
                <span>Department: <strong className="text-[#0F766E] font-semibold">{managerDeptName}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Filter size={14} />
                <select
                  aria-label="Filter by department"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Content Type Filter */}
            <select
              aria-label="Filter by content type"
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Content Types</option>
              <option value="TEXT">Text Content</option>
              <option value="PDF">PDF Document</option>
              <option value="IMAGE">Image Asset</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by workflow status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Workflow Statuses</option>
              <option value="AWAITING_REVIEW">Awaiting Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>

            {/* Sort Order */}
            <select
              aria-label="Sort submissions"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOrder)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="NEWEST">Sort: Newest First</option>
              <option value="OLDEST">Sort: Oldest First</option>
              <option value="MOST_FLAGS">Sort: Most Flagged Claims</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-ink transition"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results indicator */}
        <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
          <span>
            Showing <strong className="text-ink">{filteredSubmissions.length}</strong> of{' '}
            <strong className="text-ink">{submissions.length}</strong> submissions across organisation
          </span>
          {hasActiveFilters && (
            <span className="text-[#0F766E] font-medium">Filtered results active</span>
          )}
        </div>
      </section>

      {/* 4. Submissions Table */}
      <section aria-labelledby="submissions-table-heading" className="rounded-2xl border border-line bg-surface overflow-hidden shadow-xs">
        <h2 id="submissions-table-heading" className="sr-only">All Submissions List</h2>

        {submissionsQ.isLoading ? (
          <div className="p-12 text-center text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent mb-2" />
            <p className="text-sm font-medium">Loading organisational submissions…</p>
          </div>
        ) : submissionsQ.isError ? (
          <div className="p-8 text-center text-violation">
            <ShieldAlert size={28} className="mx-auto mb-2 text-rose-500" />
            <p className="font-semibold">Failed to load submissions from server.</p>
            <p className="text-xs text-muted mt-1">Please refresh or verify your connection.</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto mb-3 text-muted/60" />
            <p className="font-semibold text-ink">No submissions matched your criteria</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try clearing your search query or loosening your department and status filters.'
                : 'No content has been submitted yet across the organisation.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-soft transition"
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
                  <th scope="col" className="px-5 py-3.5">Submission Title</th>
                  <th scope="col" className="px-4 py-3.5">Creator</th>
                  <th scope="col" className="px-4 py-3.5">Department</th>
                  <th scope="col" className="px-3 py-3.5">Type</th>
                  <th scope="col" className="px-4 py-3.5">Submitted</th>
                  <th scope="col" className="px-4 py-3.5">Workflow Status</th>
                  <th scope="col" className="px-4 py-3.5">Compliance Findings</th>
                  <th scope="col" className="px-4 py-3.5">Assigned Reviewer</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredSubmissions.map((s) => {
                  const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
                  const violationCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
                  const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
                  const conflictCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length
                  const totalClaims = s.claims.length

                  // Assigned reviewer determination (simulated or from audit)
                  const reviewerLabel = getAssignedReviewer(s)
                  const workflowBadge = getWorkflowStatusBadge(s.status)

                  return (
                    <tr key={s.id} className="hover:bg-canvas/60 transition-colors">
                      {/* 1. Title & Excerpt */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {s.contentType === 'PDF' ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                <FileText size={14} />
                              </span>
                            ) : s.contentType === 'IMAGE' ? (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                                <ImageIcon size={14} />
                              </span>
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                                <FileCheck2 size={14} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/submissions/${s.id}`}
                              className="font-semibold text-ink hover:text-[#0F766E] transition line-clamp-1"
                            >
                              {s.title}
                            </Link>
                            <p className="text-xs text-muted line-clamp-1 mt-0.5">
                              {s.content}
                            </p>
                            {s.revisionNumber > 1 && (
                              <span className="mt-1 inline-block rounded bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                                Revision {s.revisionNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Creator */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                            {(s.submittedByName ?? 'User')
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-ink leading-tight">
                              {s.submittedByName ?? 'Unknown Creator'}
                            </p>
                            <p className="text-[11px] text-muted leading-tight">Creator</p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Department */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${getDeptBadge(
                            s.departmentName
                          )}`}
                        >
                          {s.departmentName ?? 'General'}
                        </span>
                      </td>

                      {/* 4. Content Type */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                          {s.contentType === 'PDF' ? (
                            <span className="font-mono text-[11px] font-bold text-rose-700">PDF</span>
                          ) : s.contentType === 'IMAGE' ? (
                            <span className="font-mono text-[11px] font-bold text-purple-700">IMAGE</span>
                          ) : (
                            <span className="font-mono text-[11px] font-bold text-teal-700">TEXT</span>
                          )}
                        </span>
                      </td>

                      {/* 5. Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted/70" />
                          <span>{formatWhen(s.createdAt)}</span>
                        </div>
                      </td>

                      {/* 6. Workflow Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowBadge.cls}`}
                        >
                          {workflowBadge.label}
                        </span>
                      </td>

                      {/* 7. Compliance Findings Summary */}
                      <td className="px-4 py-4">
                        {totalClaims === 0 ? (
                          <span className="text-xs text-muted italic">No claims extracted</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {verifiedCount > 0 && (
                              <span
                                title={`${verifiedCount} verified against Tier 1/2 authority`}
                                className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {verifiedCount} Verified
                              </span>
                            )}
                            {violationCount > 0 && (
                              <span
                                title={`${violationCount} brand truth violations`}
                                className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[11px] font-bold text-rose-800"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {violationCount} Violation{violationCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {unverifiedCount > 0 && (
                              <span
                                title={`${unverifiedCount} unverified claims`}
                                className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-bold text-amber-800"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {unverifiedCount} Unverified
                              </span>
                            )}
                            {conflictCount > 0 && (
                              <span
                                title={`${conflictCount} conflicting source claims`}
                                className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[11px] font-bold text-purple-800"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                {conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Assigned Reviewer */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        <span className="font-medium text-slate-800">{reviewerLabel.name}</span>
                        <p className="text-[11px] text-muted">{reviewerLabel.role}</p>
                      </td>

                      {/* 9. Action Button */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/admin/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-canvas border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] hover:bg-teal-50/40 transition shadow-2xs"
                        >
                          Inspect & Audit <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function getWorkflowStatusBadge(status: SubmissionStatus): { label: string; cls: string } {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      }
    case 'REJECTED':
      return {
        label: 'Rejected',
        cls: 'bg-rose-50 text-rose-800 border-rose-200',
      }
    case 'CHANGES_REQUESTED':
      return {
        label: 'Changes Requested',
        cls: 'bg-orange-50 text-orange-800 border-orange-200',
      }
    case 'IN_REVIEW':
      return {
        label: 'In Review',
        cls: 'bg-blue-50 text-blue-800 border-blue-200',
      }
    case 'FLAGGED':
    case 'VERIFIED':
    case 'ANALYZING':
      return {
        label: 'Awaiting Review',
        cls: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    case 'DRAFT':
    default:
      return {
        label: 'Draft',
        cls: 'bg-slate-100 text-slate-700 border-slate-200',
      }
  }
}

function getDeptBadge(name?: string | null) {
  if (!name) return 'bg-slate-100 text-slate-800 border-slate-200'
  const lower = name.toLowerCase()
  if (lower.includes('market')) return 'bg-teal-50 text-teal-800 border-teal-200'
  if (lower.includes('sales')) return 'bg-blue-50 text-blue-800 border-blue-200'
  if (lower.includes('hr') || lower.includes('human')) return 'bg-purple-50 text-purple-800 border-purple-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

function getAssignedReviewer(s: Submission): { name: string; role: string } {
  if (s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'CHANGES_REQUESTED') {
    return { name: 'Dev Sharma', role: 'Authorised Reviewer' }
  }
  if (s.status === 'IN_REVIEW' || s.status === 'FLAGGED' || s.status === 'VERIFIED') {
    return { name: 'Dev Sharma', role: 'Assigned Reviewer' }
  }
  return { name: 'Unassigned', role: 'In Queue' }
}
