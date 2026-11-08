import { BadgeCheck, ShieldAlert } from 'lucide-react'
import { isAuthoritative, type Evidence } from '../types'

const TIER_META: Record<string, { label: string; badgeCls: string }> = {
  TIER_1: { label: '👑 Tier 1 — Master Authority', badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  TIER_2: { label: '📄 Tier 2 — Departmental Scope', badgeCls: 'bg-blue-100 text-blue-800 border-blue-200' },
  TIER_3: { label: '⚠️ Tier 3 — Subordinate / Superseded', badgeCls: 'bg-amber-100 text-amber-800 border-amber-200' },
}

export function EvidenceCard({ e }: { e: Evidence }) {
  const auth = isAuthoritative(e)
  const meta = e.authorityTier ? TIER_META[e.authorityTier] : null

  return (
    <li className={`rounded-xl border p-4 transition ${auth ? 'border-brand bg-brand-soft/70 shadow-2xs' : 'border-line bg-surface opacity-90'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="break-all font-semibold text-ink">{e.documentName}</p>
        {auth ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
            <BadgeCheck size={14} aria-hidden /> Authoritative Verdict
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold text-muted border border-line">
            <ShieldAlert size={12} aria-hidden /> Subordinate
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        {meta && (
          <span className={`inline-block rounded-md border px-2 py-0.5 font-bold ${meta.badgeCls}`}>
            {meta.label}
          </span>
        )}
        {e.pageNumber && (
          <span className="text-muted font-medium">Page {e.pageNumber}</span>
        )}
      </div>

      {e.excerpt && (
        <blockquote className="mt-2.5 rounded-lg border-l-4 border-brand bg-white/70 p-2.5 font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap">
          “{e.excerpt}”
        </blockquote>
      )}
    </li>
  )
}
