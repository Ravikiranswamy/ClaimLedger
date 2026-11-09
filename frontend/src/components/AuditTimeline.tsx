import { useQuery } from '@tanstack/react-query'
import { api } from '../api'
import type { ActionType } from '../types'

const LABEL: Record<ActionType, string> = {
  SUBMITTED: 'Submitted',
  ANALYZED: 'Checked by ClaimLedger',
  CREATOR_REVISED: 'Revised by creator',
  REVIEWER_APPROVED: 'Approved',
  REVIEWER_CHANGES_REQUESTED: 'Changes requested',
  REVIEWER_REJECTED: 'Rejected',
  KNOWLEDGE_UPLOADED: 'Knowledge uploaded',
  KNOWLEDGE_APPROVED: 'Knowledge approved',
  KNOWLEDGE_SUPERSEDED: 'Knowledge superseded',
  KNOWLEDGE_WITHDRAWN: 'Knowledge withdrawn',
  KNOWLEDGE_TIER_CHANGED: 'Authority tier changed',
  KNOWLEDGE_SCOPE_CHANGED: 'Scope updated',
  KNOWLEDGE_REPLACED: 'Version replaced',
}

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** Append-only history. Every decision stays visible; nothing is ever removed. */
export function AuditTimeline({ submissionId }: { submissionId: string }) {
  const q = useQuery({ queryKey: ['audit', submissionId], queryFn: () => api.getAudit(submissionId) })
  if (q.isLoading) return <p className="text-muted" role="status">Loading history…</p>
  if (q.isError) return <p role="alert" className="text-violation">We couldn’t load the history.</p>
  if (!q.data?.length) return <p className="text-muted">No history yet.</p>
  return (
    <ol className="space-y-4 border-l-2 border-line pl-5">
      {q.data.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[1.78rem] top-1.5 h-3 w-3 rounded-full bg-brand" aria-hidden />
          <p className="font-semibold">{LABEL[a.action] ?? a.action}</p>
          <p className="text-sm text-muted">{a.actorName}{a.actorRole && a.actorRole !== 'SYSTEM' ? ` · ${a.actorRole.replace('_', ' ').toLowerCase()}` : ''} · {formatWhen(a.createdAt)}</p>
          {a.comment && <p className="mt-1 text-base">{a.comment}</p>}
        </li>
      ))}
    </ol>
  )
}
