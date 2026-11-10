import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Filter,
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

export function DepartmentSubmissions() {
  const { user } = useAuth()
  const rawDeptName =
    user?.departmentName ||
    DEPARTMENTS.find((d) => d.id === user?.departmentId)?.name ||
    'Marketing'
  const cleanDeptName = rawDeptName.replace(/\s+Department$/i, '').trim()
  const managerDeptDisplay = `${cleanDeptName} Department`

  const [searchParams] = useSearchParams()
  const urlStatus = searchParams.get('status') as StatusFilterType | null

  // Filters state
  const [search, setSearch] = useState('')
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

  // Query submissions (backend strictly filters to department for DEPT_MANAGER)
  const submissionsQ = useQuery({
    queryKey: ['department-submissions-list', user?.departmentId, cleanDeptName],
    queryFn: () => api.listSubmissions(),
  })

  const rawSubmissions = submissionsQ.data ?? []

  // Ensure department scoping on client as well
  const departmentSubmissions = useMemo(() => {
    return rawSubmissions.filter((s) => {
      if (user?.departmentId && s.departmentId === user.departmentId) return true
      if (s.departmentName && s.departmentName.toLowerCase() === cleanDeptName.toLowerCase()) return true
      return false
    })
  }, [rawSubmissions, user?.departmentId, cleanDeptName])

  // Overview metrics computed strictly within the assigned department
  const metrics = useMemo(() => {
    const total = departmentSubmissions.length
    const awaiting = departmentSubmissions.filter((s) => AWAITING_STATUSES.includes(s.status)).length
    const changesRequested = departmentSubmissions.filter((s) => s.status === 'CHANGES_REQUESTED').length
    const approved = departmentSubmissions.filter((s) => s.status === 'APPROVED').length
    const rejected = departmentSubmissions.filter((s) => s.status === 'REJECTED').length
    return { total, awaiting, changesRequested, approved, rejected }
  }, [departmentSubmissions])

  // Filtered and sorted department submissions
  const filteredSubmissions = useMemo(() => {
    return departmentSubmissions
      .filter((s) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase()
          const matchTitle = s.title.toLowerCase().includes(q)
          const matchAuthor = (s.submittedByName ?? '').toLowerCase().includes(q)
          const matchContent = (s.content ?? '').toLowerCase().includes(q)
          if (!matchTitle && !matchAuthor && !matchContent) {
            return false
          }
        }

        // Content type filter
        if (contentTypeFilter !== 'ALL') {
          if (s.contentType !== contentTypeFilter) {
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
          const aFlags = a.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
          const bFlags = b.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
          return bFlags - aFlags
        }
        return 0
      })
  }, [departmentSubmissions, search, contentTypeFilter, statusFilter, sortBy])

  // Helper for workflow status badge
  const getWorkflowBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      case 'CHANGES_REQUESTED':
        return { label: 'Changes Requested', cls: 'bg-orange-50 text-orange-800 border-orange-200' }
      case 'REJECTED':
        return { label: 'Rejected', cls: 'bg-rose-50 text-rose-800 border-rose-200' }
      case 'IN_REVIEW':
      case 'FLAGGED':
      case 'VERIFIED':
        return { label: 'In Review', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
      case 'ANALYZING':
        return { label: 'Analyzing', cls: 'bg-blue-50 text-blue-800 border-blue-200' }
      case 'DRAFT':
      default:
        return { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  // Helper for assigned reviewer
  const getReviewerInfo = (s: Submission) => {
    if (s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'CHANGES_REQUESTED') {
      return { name: 'Dev Sharma', role: 'Authorised Reviewer' }
    }
    if (AWAITING_STATUSES.includes(s.status)) {
      return { name: 'Review Queue', role: 'Awaiting Reviewer' }
    }
    return { name: 'Unassigned', role: 'Draft' }
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* 1. Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Department Oversight
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
              Department Submissions
            </h1>
            <p className="mt-1 text-sm text-muted max-w-3xl">
              Monitor submissions belonging to your assigned department. Track AI claim verification findings, reviewer evaluation statuses, and creator revisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-800">
              <ShieldCheck size={14} className="text-[#0F766E]" />
              {managerDeptDisplay} Scope
            </span>
          </div>
        </div>
      </div>

      {/* 2. Five Workflow Summary Cards (Within your assigned department) */}
      <section aria-labelledby="metrics-summary-heading">
        <h2 id="metrics-summary-heading" className="sr-only">
          Department Workflow Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Submissions */}
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              statusFilter === 'ALL'
                ? 'border-[#0F766E] bg-teal-50/40 ring-2 ring-[#0F766E]/20 shadow-xs'
                : 'border-line bg-surface hover:border-gray-300 hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Total Submissions</span>
              <FileCheck2 size={16} className="text-[#0F766E]" />
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-bold text-[#0A1F36]">{metrics.total}</span>
              <p className="mt-0.5 text-xs text-muted">Within your assigned department</p>
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
              <p className="mt-0.5 text-xs text-amber-700">Awaiting reviewer decision</p>
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
              <RotateCcw size={16} className="text-orange-600" />
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

      {/* 3. Search & Filter Bar */}
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
              placeholder="Search by title, creator name, or keywords…"
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-4 py-2 text-sm text-ink placeholder:text-muted focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Scope Badge (Fixed for Manager) */}
            <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-xs font-medium text-teal-900">
              <Filter size={14} className="text-[#0F766E]" />
              <span>Department: <strong className="text-[#0F766E] font-semibold">{cleanDeptName}</strong></span>
            </div>

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
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by workflow status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
              className="rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink focus:border-[#0F766E] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
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
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="MOST_FLAGS">Most Flagged Claims</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Submissions Table */}
      <section aria-labelledby="submissions-table-heading" className="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
        <h2 id="submissions-table-heading" className="sr-only">Department Submissions Table</h2>
        
        {submissionsQ.isLoading ? (
          <div className="p-12 text-center text-muted">
            <Clock size={24} className="mx-auto mb-2 animate-spin text-[#0F766E]" />
            <p className="text-sm">Loading department submissions…</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <FileText size={32} className="mx-auto mb-2 text-muted/60" />
            <p className="font-semibold text-ink">No department submissions found</p>
            <p className="text-xs mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas/75 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-3.5">Submission Title</th>
                  <th scope="col" className="px-4 py-3.5">Creator</th>
                  <th scope="col" className="px-3 py-3.5">Content Type</th>
                  <th scope="col" className="px-4 py-3.5">Submitted Date</th>
                  <th scope="col" className="px-4 py-3.5">Workflow Status</th>
                  <th scope="col" className="px-4 py-3.5">Compliance Findings</th>
                  <th scope="col" className="px-4 py-3.5">Assigned Reviewer</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm text-ink">
                {filteredSubmissions.map((s) => {
                  const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
                  const violationCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
                  const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
                  const conflictCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length
                  const totalClaims = s.claims.length

                  const workflowBadge = getWorkflowBadge(s.status)
                  const reviewerInfo = getReviewerInfo(s)

                  return (
                    <tr key={s.id} className="hover:bg-canvas/60 transition group">
                      {/* 1. Submission Title (First Column) */}
                      <td className="px-5 py-4">
                        <div className="max-w-xs md:max-w-sm">
                          <Link
                            to={`/department/submissions/${s.id}`}
                            className="font-semibold text-ink hover:text-[#0F766E] transition line-clamp-1"
                          >
                            {s.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                            {s.revisionNumber > 1 && (
                              <span className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.2 text-[10px] font-bold">
                                Rev {s.revisionNumber}
                              </span>
                            )}
                            <span className="line-clamp-1 text-[11px]">
                              {s.content ? s.content.slice(0, 70) : 'No excerpt available'}…
                            </span>
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

                      {/* 3. Content Type */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                          {s.contentType === 'PDF' ? (
                            <span className="font-mono text-[11px] font-bold text-rose-700">PDF</span>
                          ) : (
                            <span className="font-mono text-[11px] font-bold text-teal-700">TEXT</span>
                          )}
                        </span>
                      </td>

                      {/* 4. Submitted Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted/70" />
                          <span>{formatWhen(s.createdAt)}</span>
                        </div>
                      </td>

                      {/* 5. Workflow Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${workflowBadge.cls}`}>
                          {workflowBadge.label}
                        </span>
                      </td>

                      {/* 6. Compliance Findings */}
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

                      {/* 7. Assigned Reviewer */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs">
                        <span className="font-medium text-slate-800">{reviewerInfo.name}</span>
                        <p className="text-[11px] text-muted">{reviewerInfo.role}</p>
                      </td>

                      {/* 8. Action Button (Renamed to View Submission) */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/department/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-canvas border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-[#0F766E] hover:text-[#0F766E] hover:bg-teal-50/40 transition shadow-2xs cursor-pointer"
                        >
                          View Submission <ArrowRight size={13} />
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
