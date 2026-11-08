import type { SubmissionStatus } from '../types'

const MAP: Record<SubmissionStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'border-line text-muted' },
  ANALYZING: { label: 'Checking…', cls: 'border-line text-muted' },
  FLAGGED: { label: 'Needs attention', cls: 'border-unverified text-unverified' },
  VERIFIED: { label: 'All claims verified', cls: 'border-verified text-verified' },
  IN_REVIEW: { label: 'In review', cls: 'border-brand text-brand' },
  CHANGES_REQUESTED: { label: 'Changes requested', cls: 'border-conflict text-conflict' },
  APPROVED: { label: 'Approved', cls: 'border-verified bg-verified-soft text-verified' },
  REJECTED: { label: 'Rejected', cls: 'border-violation bg-violation-soft text-violation' },
}

/** Workflow status of a whole submission. Deliberately a square-cornered outlined chip, visually distinct from claim pills. */
export function SubmissionStatusChip({ status }: { status: SubmissionStatus }) {
  const { label, cls } = MAP[status]
  return <span className={`inline-block rounded-md border-2 px-2.5 py-0.5 text-sm font-semibold ${cls}`}>{label}</span>
}
