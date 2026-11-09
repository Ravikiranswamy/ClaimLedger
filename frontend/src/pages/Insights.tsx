import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import { api } from '../api'
import { DEPARTMENTS, type GuidelineHealthIssue } from '../types'

export function Insights() {
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<string>('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'recommendations'>('overview')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [inspectingIssue, setInspectingIssue] = useState<GuidelineHealthIssue | null>(null)
  const [acknowledgedRecs, setAcknowledgedRecs] = useState<Record<string, boolean>>({})

  const { data: insights, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights', selectedDept, dateRange],
    queryFn: () =>
      api.getInsights({
        departmentId: selectedDept === 'ALL' ? undefined : selectedDept,
        dateRange,
      }),
  })

  const handleExportReport = () => {
    if (!insights) return
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      filters: { department: selectedDept, dateRange },
      overview: insights.overview,
      violationCategories: insights.violationCategories,
      departmentBreakdown: insights.departmentBreakdown,
      repeatedIssues: insights.repeatedIssues,
      guidelineHealthIssues: insights.guidelineHealthIssues,
      recommendations: insights.recommendations,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `claimledger-intelligence-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleAcknowledge = (recId: string) => {
    setAcknowledgedRecs((prev) => ({ ...prev, [recId]: !prev[recId] }))
  }

  const overview = insights?.overview
  const violationCategories = insights?.violationCategories ?? []
  const departmentBreakdown = insights?.departmentBreakdown ?? []
  const complianceTrends = insights?.complianceTrends ?? []
  const repeatedIssues = insights?.repeatedIssues ?? []
  const guidelineHealthIssues = insights?.guidelineHealthIssues ?? []
  const recommendations = (insights?.recommendations ?? []).filter((r) =>
    priorityFilter === 'ALL' ? true : r.priority === priorityFilter
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy via-[#0c2a47] to-navy p-6 text-white shadow-xl border border-white/10 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-3 py-1 text-xs font-semibold text-[#5EEAD4]">
              <Sparkles size={13} />
              Deterministic Intelligence Engine
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
              Insights & Guideline Health
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#D6E3EF] leading-relaxed">
              Identify recurring brand violations, detect cross-document knowledge conflicts, and maintain reliable
              organisational truth across Nexora Technologies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-medium text-white transition cursor-pointer border border-white/15"
              title="Refresh intelligence metrics"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Sync
            </button>
            <button
              onClick={handleExportReport}
              disabled={isLoading || !insights}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5EEAD4] px-4 py-2 text-xs font-semibold text-[#0A1F36] shadow-sm hover:bg-[#4ddac4] transition cursor-pointer disabled:opacity-50"
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-[#8EA5BC] flex items-center gap-1.5">
              <Filter size={13} /> Department Scope:
            </span>
            <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedDept('ALL')}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  selectedDept === 'ALL'
                    ? 'bg-[#5EEAD4] text-[#0A1F36] font-semibold shadow-sm'
                    : 'text-[#D6E3EF] hover:text-white'
                }`}
              >
                All Departments
              </button>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDept(dept.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
                    selectedDept === dept.id
                      ? 'bg-[#5EEAD4] text-[#0A1F36] font-semibold shadow-sm'
                      : 'text-[#D6E3EF] hover:text-white'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#8EA5BC] flex items-center gap-1.5">
              <Calendar size={13} /> Time Horizon:
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg bg-white/10 border border-white/15 px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#5EEAD4] cursor-pointer"
            >
              <option value="7d" className="bg-[#0A1F36] text-white">Last 7 Days</option>
              <option value="30d" className="bg-[#0A1F36] text-white">Last 30 Days</option>
              <option value="90d" className="bg-[#0A1F36] text-white">Last 90 Days</option>
              <option value="all" className="bg-[#0A1F36] text-white">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Tab Switcher */}
      <div className="border-b border-line flex items-center justify-between">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0A1F36] text-[#0A1F36]'
                : 'border-transparent text-muted hover:border-line hover:text-body'
            }`}
          >
            <BarChart3 size={16} />
            Overview & Trends
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'health'
                ? 'border-[#0A1F36] text-[#0A1F36]'
                : 'border-transparent text-muted hover:border-line hover:text-body'
            }`}
          >
            <ShieldAlert size={16} />
            Guideline Health & Conflicts
            {guidelineHealthIssues.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5">
                {guidelineHealthIssues.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-semibold transition cursor-pointer ${
              activeTab === 'recommendations'
                ? 'border-[#0A1F36] text-[#0A1F36]'
                : 'border-transparent text-muted hover:border-line hover:text-body'
            }`}
          >
            <Lightbulb size={16} />
            Actionable Recommendations
            {recommendations.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5">
                {recommendations.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm border border-line">
          <div className="text-center">
            <RefreshCw size={28} className="mx-auto animate-spin text-[#0A1F36]" />
            <p className="mt-3 text-sm font-medium text-muted">Aggregating organisation-wide governance telemetry…</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <AlertCircle size={24} className="mx-auto" />
          <p className="mt-2 text-sm font-semibold">Unable to load governance insights.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry Sync
          </button>
        </div>
      )}

      {!isLoading && !isError && overview && (
        <>
          {/* TAB 1: OVERVIEW & TRENDS */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* 1. Compliance Adherence Rate */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-line hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Brand Adherence</span>
                    <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-[#0A1F36]">
                      {overview.complianceRate}%
                    </span>
                    <span className="text-xs text-emerald-600 font-medium flex items-center">
                      <TrendingUp size={12} className="mr-0.5" /> High Precision
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(overview.complianceRate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {overview.verifiedClaims} of {overview.totalClaims} claims verified
                  </p>
                </div>

                {/* 2. Active Compliance Violations */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-line hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Active Violations</span>
                    <div className="rounded-xl bg-red-50 p-2 text-red-600">
                      <XCircle size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-red-600">
                      {overview.violationClaims}
                    </span>
                    <span className="text-xs text-muted">flagged claims</span>
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    Direct breaches of Tier 1 & Tier 2 master knowledge
                  </p>
                </div>

                {/* 3. Unverified Claims / Gaps */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-line hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Knowledge Gaps</span>
                    <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                      <HelpCircle size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-amber-600">
                      {overview.unverifiedClaims}
                    </span>
                    <span className="text-xs text-muted">unverified claims</span>
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    Missing benchmark or evidence chunks in Knowledge Base
                  </p>
                </div>

                {/* 4. Submissions Flagged */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-line hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Flagged Submissions</span>
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                      <FileCheck2 size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-[#0A1F36]">
                      {overview.flaggedSubmissions}
                    </span>
                    <span className="text-xs text-muted">of {overview.totalSubmissions} submissions</span>
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    Requiring reviewer revision or escalation
                  </p>
                </div>

                {/* 5. Document Lifecycle */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-line hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Document Freshness</span>
                    <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                      <BookOpen size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-[#0A1F36]">
                      {overview.activeDocuments}
                    </span>
                    <span className="text-xs text-emerald-600 font-medium">active</span>
                  </div>
                  <p className="mt-4 text-xs text-muted">
                    <span className="text-red-600 font-semibold">{overview.expiredDocuments} expired</span> ·{' '}
                    <span className="text-amber-600 font-semibold">{overview.expiringSoonDocuments} expiring</span>
                  </p>
                </div>
              </div>

              {/* Violation Categories & Frequency + Compliance Trends */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left: Violation Categories & Frequency */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-line space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#0A1F36]">Violation Categories & Frequency</h2>
                      <p className="text-xs text-muted">Breakdown of content mistakes intercepted across submissions</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-muted">
                      {violationCategories.reduce((acc, v) => acc + v.count, 0)} Total Issues
                    </span>
                  </div>

                  <div className="space-y-5">
                    {violationCategories.map((vc) => {
                      const severityColor =
                        vc.severity === 'HIGH'
                          ? 'bg-red-500'
                          : vc.severity === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      const severityBadge =
                        vc.severity === 'HIGH'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : vc.severity === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'

                      return (
                        <div key={vc.category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#0A1F36]">{vc.label}</span>
                              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${severityBadge}`}>
                                {vc.severity}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[#0A1F36]">
                              {vc.count} claims ({vc.percentage}%)
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${severityColor}`}
                              style={{ width: `${Math.max(vc.percentage, 4)}%` }}
                            />
                          </div>

                          <p className="text-xs text-muted">{vc.description}</p>
                          <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 text-[11px] text-[#475569]">
                            <span className="font-semibold text-[#0A1F36]">Sample intercepted claim:</span>{' '}
                            &ldquo;{vc.sampleClaim}&rdquo;
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right: Compliance Trends Over Time */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-line space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#0A1F36]">Compliance Trends Over Time</h2>
                      <p className="text-xs text-muted">Weekly verification outcomes showing governance adoption</p>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <TrendingUp size={14} /> +32% Clean Submissions
                    </span>
                  </div>

                  {/* Visual Chart */}
                  <div className="space-y-4 pt-2">
                    {complianceTrends.map((point) => {
                      const total = point.verified + point.flagged
                      const cleanPct = total > 0 ? Math.round((point.verified / total) * 100) : 100

                      return (
                        <div key={point.period} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0A1F36]">{point.period}</span>
                            <span className="text-muted">
                              <strong className="text-emerald-700">{point.verified} clean</strong> ·{' '}
                              <strong className="text-red-700">{point.flagged} flagged</strong> ({cleanPct}% clean)
                            </span>
                          </div>

                          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="bg-emerald-500 transition-all duration-500"
                              style={{ width: `${cleanPct}%` }}
                              title={`Verified: ${point.verified}`}
                            />
                            <div
                              className="bg-red-400 transition-all duration-500"
                              style={{ width: `${100 - cleanPct}%` }}
                              title={`Flagged: ${point.flagged}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 text-xs text-muted space-y-1">
                    <p className="font-semibold text-[#0A1F36] flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Deterministic Hierarchy Impact:
                    </p>
                    <p>
                      As creators utilize 1-Click Fix suggestions against Tier 1 documents, flagged submissions have
                      steadily declined from 60% in Week 1 to 25% in the current cycle.
                    </p>
                  </div>
                </div>
              </div>

              {/* Department Compliance Patterns */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-[#0A1F36]">Department-Wise Compliance Patterns</h2>
                    <p className="text-xs text-muted">Submissions and primary governance friction points by department</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {departmentBreakdown.map((dept) => {
                    const isHighRisk = dept.cleanRate < 70
                    return (
                      <div
                        key={dept.departmentId}
                        className={`rounded-xl p-5 border transition ${
                          isHighRisk
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0A1F36] text-base">{dept.departmentName}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              dept.cleanRate >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : dept.cleanRate >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {dept.cleanRate}% Clean Rate
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-white p-2 border border-slate-100">
                            <span className="block font-bold text-[#0A1F36]">{dept.totalSubmissions}</span>
                            <span className="text-[10px] text-muted">Total</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-100">
                            <span className="block font-bold text-red-600">{dept.flaggedSubmissions}</span>
                            <span className="text-[10px] text-muted">Flagged</span>
                          </div>
                          <div className="rounded-lg bg-white p-2 border border-slate-100">
                            <span className="block font-bold text-emerald-600">{dept.approvedSubmissions}</span>
                            <span className="text-[10px] text-muted">Approved</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs">
                          <span className="text-muted block text-[11px] font-medium">Primary Friction Point:</span>
                          <p className="mt-1 font-semibold text-[#0A1F36] leading-snug">{dept.primaryFrictionPoint}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Repeated Issues Across Submissions */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-line space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#0A1F36]">Frequently Repeated Issues Across Submissions</h2>
                  <p className="text-xs text-muted">Root-cause breakdown of recurrent compliance flags</p>
                </div>

                <div className="divide-y divide-line rounded-xl border border-line overflow-hidden">
                  {repeatedIssues.map((issue) => (
                    <div key={issue.id} className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0A1F36] text-sm">{issue.issueTitle}</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-muted uppercase">
                            {issue.category}
                          </span>
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {issue.affectedDepartment}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{issue.rootCause}</p>
                        <p className="text-[11px] text-[#475569] font-medium flex items-center gap-1">
                          <BookOpen size={12} className="text-[#0A1F36]" />
                          Governing Rule: <span className="font-semibold text-[#0A1F36]">{issue.ruleReference}</span>
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-sm font-bold text-red-600">{issue.occurrenceCount} Occurrences</span>
                          <span className="text-[10px] text-muted">in recorded submissions</span>
                        </div>
                        <Link
                          to="/submissions"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0A1F36] hover:bg-slate-50 transition"
                        >
                          View Content <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUIDELINE HEALTH & CONFLICTS */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-fade-in">
              {/* Notice Banner */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-5 text-amber-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-amber-600 shrink-0" size={20} />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-sm text-amber-950">Deterministic Knowledge Base Integrity Monitor</p>
                    <p className="text-amber-800 leading-relaxed">
                      ClaimLedger continuously analyzes approved documents for factual contradictions, expired validity
                      dates, and unverified claim clusters. Issues labeled as <strong>Confirmed Contradiction</strong> are
                      directly verified discrepancies between active documents. <strong>Potential Ambiguities</strong> indicate
                      guideline scope conflicts that require human admin clarification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Issues List */}
              <div className="space-y-4">
                {guidelineHealthIssues.map((issue) => {
                  const isConfirmed = issue.verificationNature === 'CONFIRMED_CONTRADICTION'
                  const isGap = issue.issueType === 'KNOWLEDGE_GAP'
                  const isExpiring = issue.issueType === 'EXPIRING_DOCUMENT'

                  return (
                    <div
                      key={issue.id}
                      className="rounded-2xl bg-white p-6 shadow-sm border border-line hover:border-slate-300 transition space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                                isConfirmed
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : isGap
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : isExpiring
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {issue.verificationNature.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                issue.severity === 'HIGH'
                                  ? 'bg-red-50 text-red-700'
                                  : issue.severity === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {issue.severity} Severity
                            </span>
                            <span className="text-xs text-muted">
                              Impacts {issue.affectedSubmissionsCount} submission(s)
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-[#0A1F36]">{issue.title}</h3>
                          <p className="text-xs text-[#475569] leading-relaxed">{issue.description}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setInspectingIssue(issue)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white px-3.5 py-2 text-xs font-semibold hover:bg-navy/90 transition cursor-pointer"
                          >
                            <Eye size={13} />
                            Compare Excerpts
                          </button>
                        </div>
                      </div>

                      {/* Documents Involved */}
                      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#0A1F36] flex items-center gap-1">
                          <Layers size={13} /> Referenced Documents:
                        </span>
                        {issue.documentNames.map((dname) => (
                          <Link
                            key={dname}
                            to="/knowledge"
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-[#0A1F36] border border-slate-200 hover:border-[#5EEAD4] transition"
                          >
                            <FileText size={12} className="text-muted" />
                            {dname}
                            <ArrowUpRight size={11} className="text-muted" />
                          </Link>
                        ))}
                      </div>

                      {/* Conflict Snippet Box */}
                      {issue.conflictingExcerpts && (
                        <div className="rounded-xl bg-amber-50/50 p-3.5 border border-amber-200/70 text-xs">
                          <span className="font-semibold text-amber-900 block text-[11px] uppercase tracking-wider">
                            Comparative Text Analysis:
                          </span>
                          <p className="mt-1 font-mono text-xs text-amber-950 bg-white/70 p-2.5 rounded-lg border border-amber-100">
                            {issue.conflictingExcerpts}
                          </p>
                        </div>
                      )}

                      {/* Recommended Administrative Action */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-line">
                        <div className="flex items-center gap-1.5 text-muted">
                          <Lightbulb size={14} className="text-amber-600" />
                          <span>
                            <strong>Recommended Resolution:</strong> {issue.recommendedAction}
                          </span>
                        </div>
                        <Link
                          to="/admin/approvals"
                          className="font-semibold text-navy hover:underline flex items-center gap-1 shrink-0"
                        >
                          Resolve in Approvals <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIONABLE RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6 animate-fade-in">
              {/* Priority Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Filter by Priority:</span>
                  {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                        priorityFilter === p
                          ? 'bg-navy text-white shadow-sm'
                          : 'bg-white text-muted hover:bg-slate-100 border border-line'
                      }`}
                    >
                      {p === 'ALL' ? 'All Priorities' : `${p} Priority`}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted">
                  Showing {recommendations.length} explainable recommendation(s)
                </span>
              </div>

              {/* Recommendations Cards */}
              <div className="space-y-4">
                {recommendations.map((rec) => {
                  const isAcked = acknowledgedRecs[rec.id]
                  const priorityBadge =
                    rec.priority === 'HIGH'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : rec.priority === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'

                  return (
                    <div
                      key={rec.id}
                      className={`rounded-2xl bg-white p-6 shadow-sm border transition space-y-5 ${
                        isAcked ? 'border-emerald-300 bg-emerald-50/20' : 'border-line hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${priorityBadge}`}>
                              {rec.priority} Priority
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-muted uppercase">
                              {rec.category}
                            </span>
                            {isAcked && (
                              <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Under Admin Review
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-[#0A1F36]">{rec.title}</h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleAcknowledge(rec.id)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
                              isAcked
                                ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                : 'bg-slate-50 border-slate-200 text-muted hover:bg-slate-100'
                            }`}
                          >
                            {isAcked ? 'Marked Investigated' : 'Mark as Investigated'}
                          </button>
                        </div>
                      </div>

                      {/* The Problem & Why It Matters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="rounded-xl bg-red-50/40 p-4 border border-red-100 space-y-1">
                          <span className="font-bold text-red-900 block flex items-center gap-1.5">
                            <ShieldAlert size={14} className="text-red-600" />
                            Identified Problem:
                          </span>
                          <p className="text-red-950 leading-relaxed">{rec.problem}</p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                          <span className="font-bold text-[#0A1F36] block flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-blue-600" />
                            Why It Matters (Impact):
                          </span>
                          <p className="text-[#475569] leading-relaxed">{rec.whyItMatters}</p>
                        </div>
                      </div>

                      {/* Supporting Records */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-muted">Supporting Evidence:</span>
                        {rec.supportingRecords.map((sr) => (
                          <span
                            key={sr}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#0A1F36]"
                          >
                            {sr}
                          </span>
                        ))}
                      </div>

                      {/* Recommended Action */}
                      <div className="rounded-xl bg-emerald-50/60 p-4 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Lightbulb size={14} className="text-emerald-700" />
                            Recommended Admin Action:
                          </span>
                          <p className="text-emerald-900">{rec.recommendedAction}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Link
                            to="/knowledge"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white px-3.5 py-2 text-xs font-semibold hover:bg-navy/90 transition shadow-sm"
                          >
                            Knowledge Base <ArrowRight size={13} />
                          </Link>
                          <Link
                            to="/admin/approvals"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 text-navy px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition"
                          >
                            Approvals Queue <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. Comparative Text Modal */}
      {inspectingIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold uppercase">
                  {inspectingIssue.issueType.replace(/_/g, ' ')}
                </span>
                <h3 className="mt-2 text-lg font-bold text-[#0A1F36]">{inspectingIssue.title}</h3>
                <p className="text-xs text-muted mt-1">{inspectingIssue.description}</p>
              </div>
              <button
                onClick={() => setInspectingIssue(null)}
                className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-body transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Side-by-side Comparative Excerpts */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0A1F36] block">
                Side-by-Side Excerpt Comparison
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-line p-4 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0A1F36]">Document A (Master / Baseline)</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                      Tier 1 Master
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#0A1F36]">{inspectingIssue.documentNames[0] ?? 'N/A'}</p>
                  <div className="rounded-lg bg-white p-3 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed">
                    &ldquo;Nexora Pro — ₹999 per user per month, billed annually. Effective 1 Jan 2026.&rdquo;
                  </div>
                </div>

                <div className="rounded-xl border border-line p-4 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950">Document B (Conflicting / Addendum)</span>
                    <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5">
                      Tier 2 / Scope
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-amber-950">
                    {inspectingIssue.documentNames[1] ?? inspectingIssue.documentNames[0]}
                  </p>
                  <div className="rounded-lg bg-white p-3 border border-amber-200 text-xs font-mono text-amber-950 leading-relaxed">
                    &ldquo;Special proposal price: ₹899 per user per month. (No customer qualification criteria defined).&rdquo;
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution Guidance */}
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-[#0A1F36] block">Deterministic Resolution Guidance:</span>
              <p className="text-[#475569] leading-relaxed">
                Under ClaimLedger&apos;s deterministic hierarchy rules, Tier 1 documents strictly supersede Tier 2
                proposals unless an explicit, authorized departmental exception applies. To prevent reviewer bottlenecks
                and pricing drift, the Admin should amend the metadata scope in Approval Management.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={() => setInspectingIssue(null)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-[#0A1F36] hover:bg-slate-50 transition cursor-pointer"
              >
                Close Inspector
              </button>
              <Link
                to="/admin/approvals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy text-white px-4 py-2 text-xs font-semibold hover:bg-navy/90 transition"
              >
                Go to Approval Management <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
