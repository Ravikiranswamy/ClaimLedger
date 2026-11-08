import { BadgeCheck } from 'lucide-react'
import { isAuthoritative, type Evidence } from '../types'

const TIER: Record<string, string> = { TIER_1: 'Highest authority', TIER_2: 'Supporting', TIER_3: 'Lowest authority' }

export function EvidenceCard({ e }: { e: Evidence }) {
  const auth = isAuthoritative(e)
  return (
    <li className={`rounded-xl border p-4 ${auth ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="break-all font-semibold">{e.documentName}</p>
        {auth && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
            <BadgeCheck size={16} aria-hidden /> Authoritative source
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {e.authorityTier ? TIER[e.authorityTier] : 'Source'}
        {e.pageNumber ? ` · page ${e.pageNumber}` : ''}
      </p>
      {e.excerpt && <blockquote className="mt-2 border-l-4 border-line pl-3 text-base leading-relaxed">“{e.excerpt}”</blockquote>}
    </li>
  )
}
