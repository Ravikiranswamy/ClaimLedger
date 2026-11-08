import { Check, Loader2 } from 'lucide-react'
import type { AnalysisProgress as Progress } from '../types'

const STEPS: { key: Progress['stage']; label: string }[] = [
  { key: 'EXTRACTING_CLAIMS', label: 'Finding claims' },
  { key: 'CHECKING_SOURCES', label: 'Checking approved sources' },
  { key: 'PREPARING_FINDINGS', label: 'Preparing findings' },
]

/** Progress text comes only from backend data (no hardcoded numbers). */
export function AnalysisProgressView({ progress }: { progress?: Progress }) {
  const stageIdx = progress ? STEPS.findIndex((s) => s.key === progress.stage) : 0
  const done = progress?.stage === 'DONE'
  const headline = !progress
    ? 'Starting analysis…'
    : progress.claimsFound === 0
      ? 'Reading your content…'
      : `Checking ${progress.claimsFound} claim${progress.claimsFound === 1 ? '' : 's'} against ${progress.sourcesAvailable} approved source${progress.sourcesAvailable === 1 ? '' : 's'}…`

  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-surface p-8">
      <h2 className="font-display text-2xl font-semibold">{done ? 'Analysis complete' : headline}</h2>
      <ol className="mt-6 space-y-4">
        {STEPS.map((s, i) => {
          const complete = done || i < stageIdx
          const active = !done && i === stageIdx
          return (
            <li key={s.key} className="flex items-center gap-3 text-lg">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  complete ? 'bg-brand text-white' : active ? 'bg-brand-soft text-brand' : 'bg-canvas text-muted'
                }`}
              >
                {complete ? <Check size={18} aria-hidden /> : active ? <Loader2 size={18} className="animate-spin" aria-hidden /> : i + 1}
              </span>
              <span className={complete || active ? 'text-ink' : 'text-muted'}>{s.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
