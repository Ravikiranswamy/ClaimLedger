import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatWhen } from '../components/AuditTimeline'
import { PageHeader } from '../components/PageHeader'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { useState } from 'react'

const NEEDS_ATTENTION = ['FLAGGED', 'VERIFIED', 'IN_REVIEW']

export function ReviewList() {
  const [tab, setTab] = useState<'attention' | 'all'>('attention')
  const q = useQuery({ queryKey: ['submissions'], queryFn: api.listSubmissions })
  const rows = (q.data ?? []).filter((s) => tab === 'all' || NEEDS_ATTENTION.includes(s.status))

  return (
    <>
      <PageHeader title="Review" subtitle="Open an item to see each claim, its evidence, and decide." />
      <div role="tablist" aria-label="Filter" className="mb-5 flex gap-2">
        {([['attention', 'Needs your decision'], ['all', 'All submissions']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-xl px-4 py-2 font-semibold ${tab === k ? 'bg-navy text-white' : 'border border-line bg-surface hover:bg-canvas'}`}>
            {label}
          </button>
        ))}
      </div>

      {q.isLoading && <p className="text-lg text-muted" role="status">Loading…</p>}
      {q.isError && <p role="alert" className="rounded-2xl bg-violation-soft p-5 text-violation">We couldn’t load submissions. Please refresh and try again.</p>}
      {q.isSuccess && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-lg text-muted">
          {tab === 'attention' ? 'Nothing waiting. You’re all caught up.' : 'No submissions yet.'}
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((s) => {
          const open = s.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
          return (
            <li key={s.id}>
              <Link to={`/review/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-brand">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{s.title}</p>
                  <p className="text-muted">
                    {s.departmentName ?? 'No department'} · {s.submittedByName} · {formatWhen(s.createdAt)}
                    {s.revisionNumber > 1 ? ` · revision ${s.revisionNumber}` : ''}
                  </p>
                  <p className="mt-1 text-base">
                    {s.claims.length === 0 ? 'No claims found' : open === 0 ? `${s.claims.length} claims, all verified` : `${open} of ${s.claims.length} claims need attention`}
                  </p>
                </div>
                <SubmissionStatusChip status={s.status} />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
