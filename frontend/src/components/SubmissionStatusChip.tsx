import type { SubmissionStatus } from '../types'

const MAP: Record<SubmissionStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'border-slate-300 text-slate-700 bg-slate-50' },
  ANALYZING: { label: 'In Review', cls: 'border-blue-300 text-blue-800 bg-blue-50/60' },
  FLAGGED: { label: 'In Review', cls: 'border-blue-300 text-blue-800 bg-blue-50/60' },
  VERIFIED: { label: 'In Review', cls: 'border-blue-300 text-blue-800 bg-blue-50/60' },
  IN_REVIEW: { label: 'In Review', cls: 'border-blue-300 text-blue-800 bg-blue-50/60' },
  CHANGES_REQUESTED: { label: 'Changes Requested', cls: 'border-orange-300 text-orange-800 bg-orange-50/60' },
  APPROVED: { label: 'Approved', cls: 'border-emerald-300 text-emerald-800 bg-emerald-50/60' },
  REJECTED: { label: 'Rejected', cls: 'border-rose-300 text-rose-800 bg-rose-50/60' },
}

/** Workflow status of a whole submission. Deliberately a square-cornered outlined chip, visually distinct from claim pills. */
export function SubmissionStatusChip({ status }: { status: SubmissionStatus }) {
  const meta = MAP[status] ?? { label: status, cls: 'border-slate-300 text-slate-700 bg-slate-50' }
  return <span className={`inline-block rounded-md border-2 px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
}
