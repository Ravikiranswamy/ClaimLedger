import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileEdit,
  FileText,
  Filter,
  PlusCircle,
  Search,
  Wand2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { formatWhen } from '../components/AuditTimeline'
import { PageHeader } from '../components/PageHeader'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'

type StatusFilter = 'ALL' | 'DRAFT' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'

export function MyContent() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialStatus = (searchParams.get('status') as StatusFilter) || 'ALL'
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [searchQuery, setSearchQuery] = useState('')

  const submissionsQ = useQuery({
    queryKey: ['submissions'],
    queryFn: api.listSubmissions,
  })

  const rawSubmissions = submissionsQ.data ?? []

  // Display only the logged-in Creator's submissions
  const submissions = useMemo(() => {
    if (user?.role === 'CREATOR') {
      return rawSubmissions.filter((s) => !s.submittedBy || s.submittedBy === user.id)
    }
    return rawSubmissions
  }, [rawSubmissions, user])

  // Update status filter and URL search params
  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    if (filter === 'ALL') {
      searchParams.delete('status')
    } else {
      searchParams.set('status', filter)
    }
    setSearchParams(searchParams, { replace: true })
  }

  // Filtered submissions based on search query and status filter
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      // Status filtering with actual workflow statuses
      if (statusFilter === 'DRAFT' && s.status !== 'DRAFT') return false
      if (statusFilter === 'IN_REVIEW' && !['IN_REVIEW', 'ANALYZING', 'FLAGGED', 'VERIFIED'].includes(s.status)) return false
      if (statusFilter === 'CHANGES_REQUESTED' && s.status !== 'CHANGES_REQUESTED') return false
      if (statusFilter === 'APPROVED' && s.status !== 'APPROVED') return false
      if (statusFilter === 'REJECTED' && s.status !== 'REJECTED') return false

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = s.title.toLowerCase().includes(q)
        const deptMatch = s.departmentName?.toLowerCase().includes(q) ?? false
        const typeMatch = s.contentType?.toLowerCase().includes(q) ?? false
        if (!titleMatch && !deptMatch && !typeMatch) return false
      }
      return true
    })
  }, [submissions, statusFilter, searchQuery])

  // Summary counts
  const totalCount = submissions.length
  const draftsCount = submissions.filter((s) => s.status === 'DRAFT').length
  const inReviewCount = submissions.filter((s) => ['IN_REVIEW', 'ANALYZING', 'FLAGGED', 'VERIFIED'].includes(s.status)).length
  const changesRequestedCount = submissions.filter((s) => s.status === 'CHANGES_REQUESTED').length
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="My Content"
          subtitle="Search, inspect, and track your submitted organisational content and verification results."
        />
        <Link
          to="/submit"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-brand-strong"
        >
          <PlusCircle size={18} /> Create Content
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => handleStatusFilterChange('ALL')}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            statusFilter === 'ALL' ? 'border-brand bg-brand-soft/30 ring-1 ring-brand' : 'border-line bg-surface hover:bg-canvas'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">All Content</span>
          <span className="mt-2 font-display text-2xl font-bold text-ink">{totalCount}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('DRAFT')}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            statusFilter === 'DRAFT' ? 'border-slate-500 bg-slate-100 ring-1 ring-slate-500' : 'border-line bg-surface hover:bg-canvas'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Drafts</span>
            <FileEdit size={14} className="text-slate-600" />
          </div>
          <span className="mt-2 font-display text-2xl font-bold text-slate-800">{draftsCount}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('IN_REVIEW')}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            statusFilter === 'IN_REVIEW' ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400' : 'border-line bg-surface hover:bg-canvas'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">In Review</span>
            <Clock size={14} className="text-amber-600" />
          </div>
          <span className="mt-2 font-display text-2xl font-bold text-amber-900">{inReviewCount}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('CHANGES_REQUESTED')}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            statusFilter === 'CHANGES_REQUESTED' ? 'border-conflict bg-conflict-soft/40 ring-1 ring-conflict' : 'border-line bg-surface hover:bg-canvas'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-conflict">Changes Req.</span>
            <AlertCircle size={14} className="text-conflict" />
          </div>
          <span className="mt-2 font-display text-2xl font-bold text-conflict">{changesRequestedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('APPROVED')}
          className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
            statusFilter === 'APPROVED' ? 'border-verified bg-verified-soft/40 ring-1 ring-verified' : 'border-line bg-surface hover:bg-canvas'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-verified">Approved</span>
            <CheckCircle2 size={14} className="text-verified" />
          </div>
          <span className="mt-2 font-display text-2xl font-bold text-verified">{approvedCount}</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-xs md:p-8">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search content by title, format, or department…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-8 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-muted mr-1 flex items-center gap-1">
              <Filter size={14} /> Status:
            </span>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'DRAFT', label: 'Draft' },
                { id: 'IN_REVIEW', label: 'In Review' },
                { id: 'CHANGES_REQUESTED', label: 'Changes Requested' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => handleStatusFilterChange(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  statusFilter === f.id
                    ? 'bg-navy text-white shadow-xs'
                    : 'bg-canvas text-muted hover:bg-surface border border-line hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {submissionsQ.isLoading && <p className="py-12 text-center text-muted">Loading your content…</p>}

        {/* Empty Filter State */}
        {submissionsQ.isSuccess && filteredSubmissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-canvas p-10 text-center">
            <FileText size={40} className="mx-auto text-muted opacity-50" />
            <p className="mt-3 font-display font-bold text-lg text-ink">No matching content found</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try resetting the status filter or clearing your search term.'
                : 'You have not submitted any content yet. Create your first piece of content to run deterministic brand verification.'}
            </p>
            {searchQuery || statusFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  handleStatusFilterChange('ALL')
                }}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
              >
                Reset all filters
              </button>
            ) : (
              <Link
                to="/submit"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-strong"
              >
                <PlusCircle size={15} /> Create Content
              </Link>
            )}
          </div>
        )}

        {/* Submissions Table */}
        {submissionsQ.isSuccess && filteredSubmissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 px-3">Content Title</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 px-3">Workflow Status</th>
                  <th className="py-3 px-3">Compliance Findings</th>
                  <th className="py-3 px-3 text-right">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredSubmissions.map((s) => {
                  const totalClaims = s.claims.length
                  const verifiedCount = s.claims.filter((c) => c.verificationStatus === 'VERIFIED').length
                  const violationCount = s.claims.filter((c) => c.verificationStatus === 'VIOLATION').length
                  const unverifiedCount = s.claims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
                  const conflictCount = s.claims.filter((c) => c.verificationStatus === 'CONFLICT').length

                  return (
                    <tr key={s.id} className="transition hover:bg-canvas">
                      {/* 1. Title & Revision */}
                      <td className="py-3.5 px-3 font-semibold text-ink">
                        <Link to={`/submissions/${s.id}`} className="hover:text-brand transition flex items-center gap-1.5">
                          <span className="truncate max-w-xs">{s.title}</span>
                          {s.revisionNumber > 1 && (
                            <span className="rounded bg-canvas border border-line px-1.5 py-0.2 text-[10px] text-muted">
                              r{s.revisionNumber}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* 2. Department */}
                      <td className="py-3.5 px-3 text-muted text-xs">{s.departmentName ?? 'General'}</td>

                      {/* 3. Format */}
                      <td className="py-3.5 px-3">
                        <span className="rounded-md bg-canvas border border-line px-2 py-0.5 text-xs font-medium text-ink">
                          {s.contentType ?? 'TEXT'}
                        </span>
                      </td>

                      {/* 4. Last Updated */}
                      <td className="py-3.5 px-3 text-xs text-muted whitespace-nowrap">
                        {formatWhen(s.updatedAt ?? s.createdAt)}
                      </td>

                      {/* 5. Workflow Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <SubmissionStatusChip status={s.status} />
                      </td>

                      {/* 6. Compliance Findings */}
                      <td className="py-3.5 px-3">
                        {totalClaims === 0 ? (
                          <span className="text-xs text-muted italic">0 claims</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                            {verifiedCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {verifiedCount} Verified
                              </span>
                            )}
                            {violationCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[11px] font-bold text-rose-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {violationCount} {violationCount === 1 ? 'Violation' : 'Violations'}
                              </span>
                            )}
                            {unverifiedCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {unverifiedCount} Unverified
                              </span>
                            )}
                            {conflictCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[11px] font-bold text-purple-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                {conflictCount} {conflictCount === 1 ? 'Conflict' : 'Conflicts'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Next Action */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {s.status === 'CHANGES_REQUESTED' ? (
                          <Link
                            to={`/submissions/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-conflict px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-600 transition"
                          >
                            <Wand2 size={13} /> Revise
                          </Link>
                        ) : s.status === 'DRAFT' ? (
                          <Link
                            to={`/submissions/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-strong transition"
                          >
                            <FileEdit size={13} /> Edit Draft
                          </Link>
                        ) : (
                          <Link
                            to={`/submissions/${s.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                          >
                            View Details <ArrowRight size={13} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
