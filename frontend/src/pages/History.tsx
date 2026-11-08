import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  History as HistoryIcon,
  MessageSquare,
  Search,
  Shield,
  Wand2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatWhen } from '../components/AuditTimeline'
import { PageHeader } from '../components/PageHeader'
import type { ActionType } from '../types'

const ACTION_CONFIG: Record<ActionType, { label: string; cls: string; icon: any }> = {
  SUBMITTED: { label: 'Submitted', cls: 'bg-blue-50 text-blue-800 border-blue-200', icon: FileText },
  ANALYZED: { label: 'AI Analyzed', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Shield },
  CREATOR_REVISED: { label: 'Revised by Creator', cls: 'bg-teal-50 text-teal-800 border-teal-200', icon: Wand2 },
  REVIEWER_APPROVED: { label: 'Approved', cls: 'bg-verified-soft text-verified border-emerald-300', icon: CheckCircle2 },
  REVIEWER_CHANGES_REQUESTED: { label: 'Changes Requested', cls: 'bg-amber-50 text-amber-800 border-amber-300', icon: AlertTriangle },
  REVIEWER_REJECTED: { label: 'Rejected', cls: 'bg-violation-soft text-violation border-rose-300', icon: XCircle },
}

export function History() {
  const [filterAction, setFilterAction] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const auditQ = useQuery({ queryKey: ['audit-all'], queryFn: api.listGlobalAudit })
  const submissionsQ = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })

  const auditLogs = auditQ.data ?? []
  const submissions = submissionsQ.data ?? []

  // Map submission title by submissionId
  const subMap = new Map(submissions.map((s) => [s.id, s]))

  const filtered = auditLogs.filter((entry) => {
    const matchesAction = filterAction === 'ALL' || entry.action === filterAction
    const subTitle = entry.submissionId ? subMap.get(entry.submissionId)?.title ?? '' : ''
    const matchesSearch =
      !search ||
      entry.actorName.toLowerCase().includes(search.toLowerCase()) ||
      (entry.comment && entry.comment.toLowerCase().includes(search.toLowerCase())) ||
      subTitle.toLowerCase().includes(search.toLowerCase())
    return matchesAction && matchesSearch
  })

  const approvals = auditLogs.filter((l) => l.action === 'REVIEWER_APPROVED').length
  const revisions = auditLogs.filter((l) => l.action === 'CREATOR_REVISED').length
  const changes = auditLogs.filter((l) => l.action === 'REVIEWER_CHANGES_REQUESTED').length

  const exportCSV = () => {
    if (filtered.length === 0) return
    const headers = ['ID', 'Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Actor Role', 'Submission Title', 'Comment']
    const rows = filtered.map((e) => {
      const sub = e.submissionId ? subMap.get(e.submissionId) : null
      return [
        e.id,
        new Date(e.createdAt).toISOString(),
        e.action,
        `"${(e.actorName || '').replace(/"/g, '""')}"`,
        `"${(e.actorEmail || '').replace(/"/g, '""')}"`,
        e.actorRole || '',
        `"${(sub?.title || '').replace(/"/g, '""')}"`,
        `"${(e.comment || '').replace(/"/g, '""')}"`,
      ].join(',')
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `claimledger-audit-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance Audit Ledger"
        subtitle="Append-only regulatory audit ledger. Every submission, verification run, revision, and reviewer decision is immutably recorded."
      />

      {/* Overview Stat Badges */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Ledger Entries</p>
          <p className="mt-1 font-display text-2xl font-bold">{auditLogs.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-verified uppercase tracking-wider">Approved Decisions</p>
          <p className="mt-1 font-display text-2xl font-bold text-verified">{approvals}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-conflict uppercase tracking-wider">Change Loops</p>
          <p className="mt-1 font-display text-2xl font-bold text-conflict">{changes}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <p className="text-xs font-semibold text-brand uppercase tracking-wider">Creator Revisions</p>
          <p className="mt-1 font-display text-2xl font-bold text-brand">{revisions}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-muted" />
          {(
            [
              ['ALL', 'All Actions'],
              ['REVIEWER_APPROVED', 'Approved'],
              ['REVIEWER_CHANGES_REQUESTED', 'Changes Requested'],
              ['REVIEWER_REJECTED', 'Rejected'],
              ['CREATOR_REVISED', 'Revisions'],
              ['SUBMITTED', 'Submissions'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterAction(key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterAction === key
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-canvas text-muted hover:bg-line/60 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search ledger by actor or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-line bg-canvas pl-9 pr-3 py-1.5 text-xs text-ink focus:bg-surface"
            />
          </div>
          <button
            onClick={exportCSV}
            title="Export filtered audit entries as CSV"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-canvas"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Ledger Feed */}
      {auditQ.isLoading && <p className="py-12 text-center text-muted">Loading audit ledger…</p>}
      {auditQ.isError && (
        <p className="rounded-2xl bg-violation-soft p-5 text-violation">
          Could not load audit ledger. Check backend connection.
        </p>
      )}

      {auditQ.isSuccess && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
          <HistoryIcon size={32} className="mx-auto text-muted/60 mb-2" />
          <p className="font-semibold text-ink">No audit entries found</p>
          <p className="text-sm">Try adjusting your action filter or search query.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((entry) => {
          const cfg = ACTION_CONFIG[entry.action] ?? {
            label: entry.action,
            cls: 'bg-slate-100 text-slate-800 border-slate-300',
            icon: HistoryIcon,
          }
          const Icon = cfg.icon
          const sub = entry.submissionId ? subMap.get(entry.submissionId) : null

          return (
            <div
              key={entry.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cfg.cls}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                    {sub ? (
                      <Link
                        to={`/review/${sub.id}`}
                        className="truncate font-semibold text-ink hover:text-brand"
                      >
                        {sub.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">Submission #{entry.submissionId?.slice(0, 8)}</span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted">
                    Actor: <strong className="text-ink">{entry.actorName}</strong>
                    {entry.actorRole ? ` (${entry.actorRole})` : ''} ·{' '}
                    <span title={entry.createdAt}>{formatWhen(entry.createdAt)}</span>
                  </p>

                  {entry.comment && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-canvas p-2.5 text-xs text-ink border border-line/70">
                      <MessageSquare size={14} className="mt-0.5 text-muted shrink-0" />
                      <p className="italic">“{entry.comment}”</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                <span className="inline-block rounded-md bg-canvas px-2.5 py-1 text-xs font-mono text-muted border border-line">
                  {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {sub && (
                  <div className="mt-2">
                    <Link
                      to={`/review/${sub.id}`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      View Findings →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
