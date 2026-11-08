import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lightbulb, Loader2, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AuditTimeline } from '../components/AuditTimeline'
import { CheckingView } from '../components/CheckingView'
import { EvidenceCard } from '../components/EvidenceCard'
import { StatusPill } from '../components/StatusPill'
import { SubmissionStatusChip } from '../components/SubmissionStatusChip'
import { applySuggestions, buildSegments } from '../lib/highlight'
import type { Claim, ClaimState, ReviewAction, Submission } from '../types'

const MARK: Record<ClaimState, string> = {
  VERIFIED: 'bg-verified-soft decoration-verified',
  VIOLATION: 'bg-violation-soft decoration-violation',
  UNVERIFIED: 'bg-unverified-soft decoration-unverified',
  CONFLICT: 'bg-conflict-soft decoration-conflict',
}
const REVIEWER_ROLES = ['REVIEWER', 'ADMIN', 'DEPT_MANAGER']
const CLOSED = ['APPROVED', 'REJECTED']

export function ReviewDetail() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['submission', id], queryFn: () => api.getSubmission(id) })
  const s = q.data
  const [selected, setSelected] = useState<string | null>(null)

  // Select the first claim that needs attention once data arrives (or after a revision).
  useEffect(() => {
    if (!s) return
    if (selected && s.claims.some((c) => c.id === selected)) return
    setSelected((s.claims.find((c) => c.verificationStatus !== 'VERIFIED') ?? s.claims[0])?.id ?? null)
  }, [s, selected])

  const { segments, unlocated } = useMemo(() => (s ? buildSegments(s.content, s.claims) : { segments: [], unlocated: [] as string[] }), [s])

  const store = (next: Submission) => {
    qc.setQueryData(['submission', id], next)
    qc.invalidateQueries({ queryKey: ['audit', id] })
    qc.invalidateQueries({ queryKey: ['submissions'] })
  }

  if (q.isLoading) return <p className="text-lg text-muted" role="status">Loading…</p>
  if (q.isError || !s) {
    return (
      <div role="alert" className="rounded-2xl bg-violation-soft p-6 text-violation">
        {q.error instanceof Error ? q.error.message : 'We couldn’t load this submission.'}{' '}
        <Link to="/review" className="font-semibold underline">Back to Review</Link>
      </div>
    )
  }

  const claim = s.claims.find((c) => c.id === selected) ?? null
  const unresolved = s.claims.filter((c) => c.verificationStatus !== 'VERIFIED').length
  const canDecide = !!user && REVIEWER_ROLES.includes(user.role) && !CLOSED.includes(s.status)
  const canRevise = user?.role === 'CREATOR' && ['FLAGGED', 'CHANGES_REQUESTED'].includes(s.status)

  return (
    <>
      <Link to={user?.role === 'CREATOR' ? '/submit' : '/review'} className="mb-4 inline-flex items-center gap-1.5 text-muted hover:text-ink">
        <ArrowLeft size={18} aria-hidden /> {user?.role === 'CREATOR' ? 'Check something else' : 'All submissions'}
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{s.title}</h1>
          <p className="mt-1 text-muted">
            {s.departmentName ?? 'No department'} · {s.submittedByName}{s.revisionNumber > 1 ? ` · revision ${s.revisionNumber}` : ''}
          </p>
        </div>
        <SubmissionStatusChip status={s.status} />
      </header>

      <p className="mb-5 text-lg" aria-live="polite">
        {s.claims.length === 0
          ? 'No claims needed checking.'
          : unresolved === 0
            ? `All ${s.claims.length} claims match approved sources.`
            : `${unresolved} of ${s.claims.length} claim${s.claims.length === 1 ? '' : 's'} need${unresolved === 1 ? 's' : ''} attention.`}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        {/* LEFT: content with highlighted claims */}
        <section aria-labelledby="content-h" className="rounded-2xl border border-line bg-surface p-6">
          <h2 id="content-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Submitted content</h2>
          <p className="whitespace-pre-wrap text-lg leading-8">
            {segments.map((seg, i) =>
              seg.claimId ? (
                <button key={i} type="button" onClick={() => setSelected(seg.claimId!)}
                  aria-pressed={selected === seg.claimId}
                  className={`rounded px-1 underline decoration-2 underline-offset-4 ${MARK[s.claims.find((c) => c.id === seg.claimId)!.verificationStatus]} ${selected === seg.claimId ? 'outline-2 outline-offset-2 outline-ink' : ''}`}>
                  {seg.text}
                </button>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
          {unlocated.length > 0 && (
            <p className="mt-4 text-sm text-muted">{unlocated.length} claim{unlocated.length === 1 ? '' : 's'} could not be located word-for-word in the text. {unlocated.length === 1 ? 'It is' : 'They are'} still listed on the right.</p>
          )}
          {canRevise && <RevisePanel s={s} onDone={store} />}
        </section>

        {/* RIGHT: claims + decision card */}
        <aside aria-label="Claims" className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          {s.claims.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-muted">Nothing in this content needed verification.</p>}
          {s.claims.map((c, i) => (
            <ClaimCard key={c.id} c={c} n={i + 1} open={c.id === claim?.id} onSelect={() => setSelected(c.id)} located={!unlocated.includes(c.id)} />
          ))}
        </aside>
      </div>

      {canDecide && <DecisionBar s={s} unresolved={unresolved} onDone={store} />}
      {CLOSED.includes(s.status) && (
        <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-lg">
          Decision recorded: <strong>{s.status === 'APPROVED' ? 'approved' : 'rejected'}</strong>. It stays in the history below.
        </p>
      )}

      <section aria-labelledby="hist-h" className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <h2 id="hist-h" className="mb-4 font-display text-xl font-semibold">History</h2>
        <AuditTimeline submissionId={s.id} />
      </section>
    </>
  )
}

function ClaimCard({ c, n, open, onSelect, located }: { c: Claim; n: number; open: boolean; onSelect: () => void; located: boolean }) {
  const evidence = [...c.evidence].sort((a, b) => Number(!!(b.authoritative ?? b.isAuthoritative)) - Number(!!(a.authoritative ?? a.isAuthoritative)))
  return (
    <div className={`rounded-2xl border bg-surface ${open ? 'border-ink' : 'border-line'}`}>
      <button type="button" onClick={onSelect} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 block"><StatusPill state={c.verificationStatus} /></span>
          <span className="block font-semibold">“{c.claimText}”</span>
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line p-4">
          {c.explanation && <p className="text-lg leading-relaxed">{c.explanation}</p>}
          {c.suggestedCorrection && c.verificationStatus !== 'VERIFIED' && (
            <div className="rounded-xl bg-brand-soft p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand"><Lightbulb size={16} aria-hidden /> Suggested wording</p>
              <p className="mt-1 text-lg font-semibold">{c.suggestedCorrection}</p>
            </div>
          )}
          {evidence.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Evidence</p>
              <ul className="space-y-2">{evidence.map((e) => <EvidenceCard key={e.id} e={e} />)}</ul>
            </div>
          ) : (
            <p className="text-muted">No approved source mentions this claim.</p>
          )}
          {!located && <p className="text-sm text-muted">Not found word-for-word in the text above.</p>}
          {c.aiConfidence != null && <p className="text-sm text-muted">AI confidence: {Math.round(Number(c.aiConfidence) * 100)}%. A person makes the final decision.</p>}
        </div>
      )}
    </div>
  )
}

function DecisionBar({ s, unresolved, onDone }: { s: Submission; unresolved: number; onDone: (s: Submission) => void }) {
  const [comment, setComment] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)
  const m = useMutation({
    mutationFn: (a: ReviewAction) => api.reviewSubmission(s.id, a, comment.trim() || undefined),
    onSuccess: onDone,
    onError: (e) => setErr(e instanceof Error ? e.message : 'Could not record your decision.'),
  })

  const decide = (a: ReviewAction) => {
    setErr(null)
    if (a !== 'REVIEWER_APPROVED' && comment.trim().length < 3) {
      setErr('Add a short comment so the creator knows what to do.')
      return
    }
    if (a === 'REVIEWER_APPROVED' && unresolved > 0 && !confirmApprove) {
      setConfirmApprove(true)
      return
    }
    m.mutate(a)
  }

  return (
    <section aria-labelledby="decide-h" className="sticky bottom-0 mt-6 rounded-2xl border-2 border-ink bg-surface p-5 shadow-lg">
      <h2 id="decide-h" className="mb-2 font-display text-xl font-semibold">Your decision</h2>
      <label htmlFor="comment" className="sr-only">Comment</label>
      <textarea id="comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (required if you request changes or reject)"
        className="w-full rounded-xl border border-line px-4 py-3 text-base" />
      {confirmApprove && (
        <p role="alert" className="mt-3 rounded-lg bg-unverified-soft px-4 py-3 text-unverified">
          {unresolved} claim{unresolved === 1 ? ' is' : 's are'} still flagged. Approve anyway?
        </p>
      )}
      {err && <p role="alert" className="mt-3 rounded-lg bg-violation-soft px-4 py-3 text-violation">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button disabled={m.isPending} onClick={() => decide('REVIEWER_APPROVED')} className="inline-flex items-center gap-2 rounded-xl bg-verified px-5 py-3 font-semibold text-white disabled:opacity-60">
          {m.isPending && <Loader2 size={18} className="animate-spin" aria-hidden />}{confirmApprove ? 'Yes, approve anyway' : 'Approve'}
        </button>
        <button disabled={m.isPending} onClick={() => decide('REVIEWER_CHANGES_REQUESTED')} className="rounded-xl border-2 border-conflict px-5 py-3 font-semibold text-conflict disabled:opacity-60">Request changes</button>
        <button disabled={m.isPending} onClick={() => decide('REVIEWER_REJECTED')} className="rounded-xl border-2 border-violation px-5 py-3 font-semibold text-violation disabled:opacity-60">Reject</button>
        {confirmApprove && <button onClick={() => setConfirmApprove(false)} className="rounded-xl px-4 py-3 font-semibold text-muted">Cancel</button>}
      </div>
    </section>
  )
}

function RevisePanel({ s, onDone }: { s: Submission; onDone: (s: Submission) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [applied, setApplied] = useState(0)
  const m = useMutation({ mutationFn: () => api.reviseSubmission(s.id, text.trim()), onSuccess: (n) => { onDone(n); setOpen(false) } })

  if (m.isPending) return <div className="mt-6"><CheckingView title="Checking your revision" /></div>
  if (!open) {
    return (
      <button onClick={() => { const r = applySuggestions(s.content, s.claims); setText(r.text); setApplied(r.applied); setOpen(true) }}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong">
        <Wand2 size={18} aria-hidden /> Fix with suggestions and resubmit
      </button>
    )
  }
  return (
    <div className="mt-6 space-y-3 rounded-xl border border-line bg-canvas p-4">
      <p className="font-semibold">{applied > 0 ? `${applied} suggested fix${applied === 1 ? '' : 'es'} applied. Edit anything you like.` : 'No automatic fixes were available. Edit the text, then resubmit.'}</p>
      <label htmlFor="revised" className="sr-only">Revised content</label>
      <textarea id="revised" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-line px-4 py-3 text-base leading-relaxed" />
      {m.isError && <p role="alert" className="rounded-lg bg-violation-soft px-4 py-3 text-violation">{m.error instanceof Error ? m.error.message : 'Could not resubmit.'}</p>}
      <div className="flex gap-3">
        <button disabled={text.trim().length < 3} onClick={() => m.mutate()} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60">Resubmit for checking</button>
        <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-semibold text-muted">Cancel</button>
      </div>
    </div>
  )
}
