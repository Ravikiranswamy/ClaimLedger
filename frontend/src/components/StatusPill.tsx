import { AlertTriangle, CheckCircle2, GitMerge, HelpCircle, type LucideIcon } from 'lucide-react'
import type { ClaimState } from '../types'

const STYLE: Record<ClaimState, { label: string; cls: string; Icon: LucideIcon }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-verified-soft text-verified', Icon: CheckCircle2 },
  VIOLATION: { label: 'Violation', cls: 'bg-violation-soft text-violation', Icon: AlertTriangle },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-unverified-soft text-unverified', Icon: HelpCircle },
  CONFLICT: { label: 'Needs your decision', cls: 'bg-conflict-soft text-conflict', Icon: GitMerge },
}

/** Claim-level state. Colour is never the only signal: icon + label always shown. */
export function StatusPill({ state }: { state: ClaimState }) {
  const { label, cls, Icon } = STYLE[state]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>
      <Icon size={16} aria-hidden />
      {label}
    </span>
  )
}
