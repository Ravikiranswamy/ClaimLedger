import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp, Loader2, X } from 'lucide-react'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { CheckingView } from '../components/CheckingView'
import { PageHeader } from '../components/PageHeader'
import { DEPARTMENTS } from '../types'

const MAX_MB = 10
const schema = z
  .object({
    title: z.string().trim().min(3, 'Give your content a short title'),
    departmentId: z.string().min(1, 'Choose a department'),
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
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', departmentId: user?.departmentId ?? '', text: '' },
  })
  const file = watch('file')

  const create = useMutation({
    mutationFn: (v: Form) =>
      v.file
        ? api.createPdfSubmission({ title: v.title.trim(), file: v.file, departmentId: v.departmentId })
        : api.createTextSubmission({ title: v.title.trim(), content: (v.text ?? '').trim(), departmentId: v.departmentId }),
    onSuccess: (s) => {
      qc.setQueryData(['submission', s.id], s)
      qc.invalidateQueries({ queryKey: ['submissions'] })
      navigate(`/review/${s.id}`)
    },
  })

  if (create.isPending) {
    return (
      <>
        <PageHeader title="Checking your content" subtitle={create.variables?.title} />
        <CheckingView />
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
            <select id="department" {...register('departmentId')} aria-invalid={!!errors.departmentId}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base">
              <option value="">Choose…</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.departmentId && <p className="mt-1.5 text-sm text-violation">{errors.departmentId.message}</p>}
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
          <p className="mb-1.5 font-medium">Or upload a PDF <span className="font-normal text-muted">(if you add one, we check the PDF)</span></p>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Upload a PDF"
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
        <button className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white hover:bg-brand-strong">
          {create.isPending && <Loader2 size={18} className="animate-spin" aria-hidden />} Check my content
        </button>
      </form>
    </>
  )
}
