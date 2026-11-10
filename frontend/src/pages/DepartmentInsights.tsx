import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Filter,
  Lightbulb,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { DEPARTMENTS } from '../types'

export function DepartmentInsights() {
  const { user } = useAuth()
  const rawDeptName =
    user?.departmentName ||
    DEPARTMENTS.find((d) => d.id === user?.departmentId)?.name ||
    'Marketing'
  const cleanDeptName = rawDeptName.replace(/\s+Department$/i, '').trim()
  const managerDeptDisplay = `${cleanDeptName} Department`
  const managerDeptId =
    user?.departmentId ||
    DEPARTMENTS.find((d) => d.name.toLowerCase() === cleanDeptName.toLowerCase())?.id ||
    'd0000001-0000-0000-0000-000000000001'

  const [dateRange, setDateRange] = useState<string>('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'recommendations'>('overview')

  // Fetch department-scoped insights from backend
  const { data: insights, isLoading } = useQuery({
    queryKey: ['department-insights', managerDeptId, dateRange],
    queryFn: () =>
      api.getInsights({
        departmentId: managerDeptId,
        dateRange,
      }),
  })

  // Fetch department submissions to compute genuine flagged submissions count
  const { data: submissions = [] } = useQuery({
    queryKey: ['department-submissions-for-insights', user?.departmentId, cleanDeptName],
    queryFn: () => api.listSubmissions(),
  })

  const departmentSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (user?.departmentId && s.departmentId === user.departmentId) return true
      if (s.departmentName && s.departmentName.toLowerCase() === cleanDeptName.toLowerCase()) return true
      return false
    })
  }, [submissions, user?.departmentId, cleanDeptName])

  // Overview metrics (all strictly restricted to the manager's assigned department)
  const overview = insights?.overview

  const totalClaims = overview?.totalClaims ?? 0
  const verifiedClaims = overview?.verifiedClaims ?? 0
  const activeViolations = overview?.violationClaims ?? 0
  const unverifiedClaims = overview?.unverifiedClaims ?? 0

  // Flagged submissions: submissions belonging to this department that have at least one compliance finding
  const flaggedSubmissionsCount = useMemo(() => {
    return departmentSubmissions.filter((s) =>
      s.claims.some((c) => c.verificationStatus !== 'VERIFIED')
    ).length
  }, [departmentSubmissions])

  const verifiedPercent = totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 100) : 100

  // Filter department-relevant repeated issues and recommendations
  const repeatedIssues = useMemo(() => {
    const list = insights?.repeatedIssues ?? []
    return list.filter((issue) => {
      if (!issue.affectedDepartment) return true
      return (
        issue.affectedDepartment.toLowerCase().includes(cleanDeptName.toLowerCase()) ||
        issue.affectedDepartment.toLowerCase().includes('all')
      )
    })
  }, [insights?.repeatedIssues, cleanDeptName])

  const violationCategories = insights?.violationCategories ?? []
  const guidelineHealthIssues = insights?.guidelineHealthIssues ?? []
  const recommendations = insights?.recommendations ?? []

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* 1. Header and Filters */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-[#0c2a47] to-navy p-6 text-white shadow-xl border border-white/10 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5EEAD4]">
                Department Governance
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
              Compliance Insights
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#D6E3EF] leading-relaxed">
              View departmental compliance patterns, recurring claim issues, and guideline conflicts within the {managerDeptDisplay}.
            </p>
          </div>

          {/* Department Scope & Time Horizon Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Scope Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#5EEAD4]/20 border border-[#5EEAD4]/40 px-3 py-1.5 text-xs font-semibold text-[#5EEAD4]">
              <Filter size={13} />
              <span>{managerDeptDisplay}</span>
            </div>

            {/* Time Horizon Filter */}
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-[#8EA5BC]" />
              <select
                aria-label="Select time period"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                <option value="7d" className="bg-navy text-white">Last 7 Days</option>
                <option value="30d" className="bg-navy text-white">Last 30 Days</option>
                <option value="90d" className="bg-navy text-white">Last 90 Days</option>
                <option value="all" className="bg-navy text-white">All Historical</option>
              </select>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#5EEAD4] text-[#0A1F36] shadow-sm'
                : 'text-[#D6E3EF] hover:bg-white/10 hover:text-white'
            }`}
          >
            Compliance Overview & Issues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'health'
                ? 'bg-[#5EEAD4] text-[#0A1F36] shadow-sm'
                : 'text-[#D6E3EF] hover:bg-white/10 hover:text-white'
            }`}
          >
            Guideline Health & Conflicts ({guidelineHealthIssues.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-[#5EEAD4] text-[#0A1F36] shadow-sm'
                : 'text-[#D6E3EF] hover:bg-white/10 hover:text-white'
            }`}
          >
            Actionable Recommendations ({recommendations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & RECURRING ISSUES */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Concise 4-Card Overview (No document freshness metrics, no AI precision claims) */}
          <section aria-labelledby="department-overview-heading" className="space-y-3">
            <h2 id="department-overview-heading" className="text-xs font-bold uppercase tracking-wider text-muted">
              Departmental Compliance Overview
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Claims Verified (Count + Rate) */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Claims Verified</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 size={18} />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-emerald-600">
                    {isLoading ? '–' : `${verifiedPercent}%`}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    ({verifiedClaims} of {totalClaims} claims)
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">Verified against approved master knowledge</p>
              </div>

              {/* 2. Active Violations */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Active Violations</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <XCircle size={18} />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-display text-3xl font-bold text-rose-600">
                    {isLoading ? '–' : activeViolations}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">Direct contradictions with approved guidelines</p>
              </div>

              {/* 3. Unverified Claims */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Unverified Claims</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <AlertTriangle size={18} />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-display text-3xl font-bold text-amber-600">
                    {isLoading ? '–' : unverifiedClaims}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">Insufficient approved evidence in knowledge base</p>
              </div>

              {/* 4. Flagged Submissions */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">Flagged Submissions</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <FileText size={18} />
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-display text-3xl font-bold text-purple-600">
                    {isLoading ? '–' : flaggedSubmissionsCount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">Department submissions with compliance findings</p>
              </div>
            </div>
          </section>

          {/* Recurring Compliance Issues Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Violation Categories & Frequency */}
            <section aria-labelledby="violation-categories-heading" className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
                <div>
                  <h3 id="violation-categories-heading" className="font-display text-base font-bold text-[#0A1F36]">
                    Violation Categories & Frequency
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Distribution of claim findings detected in {cleanDeptName}</p>
                </div>
                <span className="text-xs font-bold text-[#0F766E] bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  {violationCategories.length} Categories
                </span>
              </div>

              {violationCategories.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-ink">No active violation categories</p>
                  <p className="text-xs text-muted mt-0.5">Submissions in this department adhere to approved guidelines.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {violationCategories.map((cat) => (
                    <div key={cat.category} className="rounded-xl border border-line bg-canvas p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink">{cat.label}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              cat.severity === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : cat.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {cat.severity}
                          </span>
                        </div>
                        <span className="font-display font-bold text-base text-ink">
                          {cat.count} occurrence{cat.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{cat.description}</p>
                      {cat.sampleClaim && (
                        <div className="rounded-lg bg-surface border border-line/80 px-3 py-2 text-xs italic text-slate-700">
                          “{cat.sampleClaim}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Right: Frequently Repeated Issues */}
            <section aria-labelledby="repeated-issues-heading" className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
                <div>
                  <h3 id="repeated-issues-heading" className="font-display text-base font-bold text-[#0A1F36]">
                    Frequently Repeated Issues
                  </h3>
                  <p className="text-xs text-muted mt-0.5">Specific patterns and guideline friction points</p>
                </div>
                <Link
                  to="/department/submissions"
                  className="text-xs font-semibold text-[#0F766E] hover:underline inline-flex items-center gap-1"
                >
                  View Submissions <ArrowRight size={13} />
                </Link>
              </div>

              {repeatedIssues.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-ink">No repeated issues detected</p>
                  <p className="text-xs text-muted mt-0.5">No recurring compliance failures recorded in this department.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {repeatedIssues.map((issue) => (
                    <div key={issue.id} className="rounded-xl border border-line bg-canvas p-4 hover:border-brand/40 transition">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <span className="font-semibold text-sm text-ink">{issue.issueTitle}</span>
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800 shrink-0">
                          {issue.occurrenceCount} occurrences
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">{issue.rootCause}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-2 text-[11px] text-muted">
                        <span className="flex items-center gap-1 text-[#0F766E] font-semibold">
                          <BookOpen size={12} /> {issue.ruleReference}
                        </span>
                        <Link
                          to="/department/submissions"
                          className="font-medium text-brand hover:underline inline-flex items-center gap-0.5"
                        >
                          Affected submissions →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: GUIDELINE HEALTH & CONFLICTS */}
      {activeTab === 'health' && (
        <section aria-labelledby="guideline-conflicts-heading" className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="guideline-conflicts-heading" className="font-display text-lg font-bold text-[#0A1F36]">
                Guideline Health & Conflicts
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Genuine missing evidence, unclear guidelines, and conflicting approved sources affecting {cleanDeptName}.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
              {guidelineHealthIssues.length} Diagnostic Findings
            </span>
          </div>

          {guidelineHealthIssues.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-10 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-ink">All Department Knowledge Sources Sound</p>
              <p className="text-xs text-muted mt-1">No cross-document conflicts or ungrounded guideline rules detected.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {guidelineHealthIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                            issue.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : issue.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-xs font-mono text-muted">{issue.issueType}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        Affects {issue.affectedSubmissionsCount} submission{issue.affectedSubmissionsCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-ink mb-1">{issue.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{issue.description}</p>

                    {issue.conflictingExcerpts && (
                      <div className="rounded-xl bg-canvas border border-line p-3 text-xs italic text-slate-700 mb-3">
                        {issue.conflictingExcerpts}
                      </div>
                    )}

                    {issue.documentNames && issue.documentNames.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span className="text-[11px] text-muted font-medium">Sources:</span>
                        {issue.documentNames.map((d, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-800"
                          >
                            <FileText size={11} /> {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-line pt-3 mt-2 flex items-center justify-between text-xs">
                    <span className="text-[#0F766E] font-medium flex items-center gap-1">
                      <Lightbulb size={13} /> {issue.recommendedAction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ACTIONABLE RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <section aria-labelledby="recommendations-heading" className="space-y-4 animate-fade-in">
          <div>
            <h2 id="recommendations-heading" className="font-display text-lg font-bold text-[#0A1F36]">
              Actionable Recommendations
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Evidence-based governance recommendations arising from actual repeated departmental issues. Guidelines are not automatically rewritten.
            </p>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-10 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-semibold text-ink">No Actionable Interventions Required</p>
              <p className="text-xs text-muted mt-1">Department compliance health is operating within approved governance thresholds.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          rec.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.priority} Priority
                      </span>
                      <span className="text-xs font-mono text-muted">{rec.category}</span>
                    </div>

                    <h3 className="font-display text-base font-bold text-ink mb-1.5">{rec.title}</h3>

                    <div className="space-y-2 mb-3 text-xs">
                      <div className="rounded-lg bg-canvas border border-line/80 p-2.5">
                        <strong className="text-slate-800 block mb-0.5">Identified Friction:</strong>
                        <span className="text-slate-600">{rec.problem}</span>
                      </div>
                      <div className="rounded-lg bg-teal-50/50 border border-teal-200/60 p-2.5">
                        <strong className="text-[#0F766E] block mb-0.5">Governance Impact:</strong>
                        <span className="text-teal-950">{rec.whyItMatters}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-line pt-3 text-xs">
                    <span className="font-semibold text-slate-800 block mb-1">Recommended Manager Action:</span>
                    <p className="text-slate-600 leading-relaxed">{rec.recommendedAction}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
