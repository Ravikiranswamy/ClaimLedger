import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileUp, Loader2, X } from 'lucide-react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AnalysisProgressView } from '../components/AnalysisProgress'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import { DEPARTMENT_LABEL, type ClaimState, type Department } from '../types'

const MAX_MB = 10
const schema = z
  .object({
    title: z.string().trim().min(3, 'Give your content a short title'),
    department: z.enum(['MARKETING', 'SALES', 'HR'], { message: 'Choose a department' }),
    text: z.string().optional(),
    file: z.custom<File | undefined>().optional(),
  })
  .superRefine((v, ctx) => {
    const hasText = (v.text ?? '').trim().length >= 20
    if (!hasText && !v.file) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'Paste at least a sentence or two (20+ characters), or upload a PDF.' })
    }
    if (v.file) {
      if (v.file.type !== 'application/pdf' && !v.file.name.toLowerCase().endsWith('.pdf')) {
        ctx.addIssue({ code: 'custom', path: ['file'], message: 'Only PDF files are supported right now.' })
      } else if (v.file.size > MAX_MB * 1024 * 1024) {
        ctx.addIssue({ code: 'custom', path: ['file'], message: `This file is larger than ${MAX_MB} MB.` })
      }
    }
  })
type Form = z.infer<typeof schema>

export function Submit() {
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', department: (user?.department ?? '') as Department, text: '' },
  })
  const file = watch('file')

  const create = useMutation({
    mutationFn: (v: Form) =>
      api.createSubmission({ title: v.title.trim(), department: v.department, text: v.text?.trim() || undefined, file: v.file }),
  })
  const submissionId = create.data?.id

  const sub = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => api.getSubmission(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (q) => (q.state.data?.status === 'ANALYZING' ? 1000 : false),
  })
  const analysed = sub.data && sub.data.status !== 'ANALYZING'
  const findings = useQuery({
    queryKey: ['findings', submissionId],
    queryFn: () => api.getFindings(submissionId!),
    enabled: !!analysed,
  })

  // ---- After submit: progress, then summary ----
  if (submissionId) {
    const counts: Partial<Record<ClaimState, number>> = {}
    findings.data?.forEach((f) => { counts[f.state] = (counts[f.state] ?? 0) + 1 })
    return (
      <>
        <PageHeader title="Checking your content" subtitle={create.data?.title} />
        {sub.isError ? (
          <p role="alert" className="rounded-2xl bg-violation-soft p-6 text-violation">We couldn’t load the analysis. Please refresh and try again.</p>
        ) : !analysed ? (
          <AnalysisProgressView progress={sub.data?.progress} />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-8">
            <h2 className="font-display text-2xl font-semibold">
              {findings.data
                ? findings.data.length === 0
                  ? 'No claims needed checking'
                  : `${findings.data.length} claim${findings.data.length === 1 ? '' : 's'} checked`
                : 'Loading results…'}
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {(Object.keys(counts) as ClaimState[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-2">
                  <StatusPill state={s} /> <span className="font-semibold">{counts[s]}</span>
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/review/${submissionId}`} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong">
                See findings
              </Link>
              <button onClick={() => { create.reset(); }} className="rounded-xl border border-line px-5 py-3 font-semibold hover:bg-canvas">
                Check something else
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Check your content" subtitle="Paste text or upload a PDF. We check every claim against your approved company sources." />
      <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="space-y-6 rounded-2xl border border-line bg-surface p-7">
        <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
          <div>
            <label htmlFor="title" className="mb-1.5 block font-medium">Title</label>
            <input id="title" {...register('title')} aria-invalid={!!errors.title} placeholder="e.g. Nexora Pro launch email"
              className="w-full rounded-xl border border-line px-4 py-3 text-base" />
            {errors.title && <p className="mt-1.5 text-sm text-violation">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="department" className="mb-1.5 block font-medium">Department</label>
            <select id="department" {...register('department')} aria-invalid={!!errors.department}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base">
              <option value="">Choose…</option>
              {(Object.keys(DEPARTMENT_LABEL) as Department[]).map((d) => (
                <option key={d} value={d}>{DEPARTMENT_LABEL[d]}</option>
              ))}
            </select>
            {errors.department && <p className="mt-1.5 text-sm text-violation">{errors.department.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="text" className="mb-1.5 block font-medium">Your content</label>
          <textarea id="text" rows={9} {...register('text')} aria-invalid={!!errors.text}
            placeholder="Paste your email, post or proposal text here…"
            className="w-full rounded-xl border border-line px-4 py-3 text-base leading-relaxed" />
          {errors.text && <p className="mt-1.5 text-sm text-violation">{errors.text.message}</p>}
        </div>

        <div>
          <p className="mb-1.5 font-medium">Or upload a PDF</p>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" id="file" aria-label="Upload a PDF"
            onChange={(e) => setValue('file', e.target.files?.[0], { shouldValidate: true })} />
          {file ? (
            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3">
              <span className="truncate font-medium">{file.name}</span>
              <button type="button" aria-label="Remove file" onClick={() => { setValue('file', undefined, { shouldValidate: true }); if (fileInput.current) fileInput.current.value = '' }}
                className="rounded-lg p-1 text-muted hover:text-ink"><X size={20} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInput.current?.click()}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line px-4 py-6 text-lg text-muted hover:border-brand hover:bg-brand-soft hover:text-brand">
              <FileUp size={22} aria-hidden /> Choose a PDF (up to {MAX_MB} MB)
            </button>
          )}
          {errors.file && <p className="mt-1.5 text-sm text-violation">{errors.file.message as string}</p>}
        </div>

        {create.isError && (
          <p role="alert" className="rounded-lg bg-violation-soft px-4 py-3 text-violation">
            {create.error instanceof Error ? create.error.message : 'Could not submit. Please try again.'}
          </p>
        )}
        <button disabled={create.isPending} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white hover:bg-brand-strong disabled:opacity-60">
          {create.isPending && <Loader2 size={18} className="animate-spin" aria-hidden />} Check my content
        </button>
      </form>
    </>
  )
}
