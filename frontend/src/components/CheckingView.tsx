import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const STEPS = ['Reading your content', 'Finding the claims in it', 'Checking each claim against approved sources', 'Preparing your findings']

/**
 * The backend analyses synchronously, so it reports no live progress. This stepper only shows
 * that work is happening; it never invents numbers. Real counts appear on the findings screen.
 */
export function CheckingView({ title = 'Checking your content' }: { title?: string }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-line bg-surface p-8">
      <h2 className="font-display text-2xl font-semibold">{title}…</h2>
      <p className="mt-1 text-muted">This usually takes a few seconds.</p>
      <ol className="mt-6 space-y-4">
        {STEPS.map((label, i) => {
          const complete = i < step
          const active = i === step
          return (
            <li key={label} className="flex items-center gap-3 text-lg">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${complete ? 'bg-brand text-white' : active ? 'bg-brand-soft text-brand' : 'bg-canvas text-muted'}`}>
                {complete ? <Check size={18} aria-hidden /> : active ? <Loader2 size={18} className="animate-spin" aria-hidden /> : i + 1}
              </span>
              <span className={complete || active ? 'text-ink' : 'text-muted'}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
