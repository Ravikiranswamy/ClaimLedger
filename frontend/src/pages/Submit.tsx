import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, FileUp, Image as ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { CheckingView } from '../components/CheckingView'
import { PageHeader } from '../components/PageHeader'
import { DEPARTMENTS } from '../types'

type InputMode = 'TEXT' | 'IMAGE' | 'PDF'

const MAX_MB = 10

const TEST_SCENARIOS = [
  {
    badge: '🚨 Test Scenario 1: Outdated Price in Text (₹799 vs ₹999)',
    mode: 'TEXT' as InputMode,
    title: 'Nexora Pro Launch — Social Media Campaign',
    departmentId: 'd0000001-0000-0000-0000-000000000001',
    text: 'Get Nexora Pro today for ₹799 per month! Complete enterprise AI brand compliance and automated claim verification across all digital channels.',
  },
  {
    badge: '⚖️ Test Scenario 2: Scoped Deal Proposal (₹899)',
    mode: 'TEXT' as InputMode,
    title: 'Enterprise Q4 Sales Proposal — Acme Corp',
    departmentId: 'd0000002-0000-0000-0000-000000000002',
    text: 'Nexora Pro special deal: ₹899 per user per month billed annually under the approved enterprise volume agreement.',
  },
  {
    badge: '✅ Test Scenario 3: Authoritative Master Price (₹999)',
    mode: 'TEXT' as InputMode,
    title: 'Nexora Pro Product Launch Email',
    departmentId: 'd0000001-0000-0000-0000-000000000001',
    text: 'Nexora Pro is officially priced at ₹999 per user per month billed annually, backed by enterprise-grade brand governance.',
  },
  {
    badge: '🖼️ Test Scenario 4: Visual Campaign Banner (Off-Brand Color & Pricing Check)',
    mode: 'IMAGE' as InputMode,
    title: 'Nexora Pro Social Campaign — Banner Graphic',
    departmentId: 'd0000001-0000-0000-0000-000000000001',
    text: 'Nexora Pro Official Promotional Graphic — Digital Ad Banner',
  },
]

const schema = z
  .object({
    title: z.string().trim().min(3, 'Give your content a short title'),
    departmentId: z.string().min(1, 'Choose a department'),
    mode: z.enum(['TEXT', 'IMAGE', 'PDF']),
    text: z.string().optional(),
    imageFile: z.custom<File | undefined>().optional(),
    pdfFile: z.custom<File | undefined>().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'TEXT') {
      const hasText = (v.text ?? '').trim().length >= 20
      if (!hasText) {
        ctx.addIssue({ code: 'custom', path: ['text'], message: 'Paste at least a sentence or two (20+ characters).' })
      }
    } else if (v.mode === 'IMAGE') {
      if (!v.imageFile) {
        ctx.addIssue({ code: 'custom', path: ['imageFile'], message: 'Please upload a PNG, JPG, or JPEG image.' })
      } else {
        const nameLower = v.imageFile.name.toLowerCase()
        const isImage = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || v.imageFile.type.startsWith('image/')
        if (!isImage) {
          ctx.addIssue({ code: 'custom', path: ['imageFile'], message: 'Only PNG, JPG, and JPEG images are supported.' })
        } else if (v.imageFile.size > MAX_MB * 1024 * 1024) {
          ctx.addIssue({ code: 'custom', path: ['imageFile'], message: `Image file exceeds maximum size of ${MAX_MB} MB.` })
        }
      }
    } else if (v.mode === 'PDF') {
      if (!v.pdfFile) {
        ctx.addIssue({ code: 'custom', path: ['pdfFile'], message: 'Please upload a PDF document.' })
      } else {
        const nameLower = v.pdfFile.name.toLowerCase()
        const isPdf = nameLower.endsWith('.pdf') || v.pdfFile.type === 'application/pdf'
        if (!isPdf) {
          ctx.addIssue({ code: 'custom', path: ['pdfFile'], message: 'Only PDF documents are supported.' })
        } else if (v.pdfFile.size > MAX_MB * 1024 * 1024) {
          ctx.addIssue({ code: 'custom', path: ['pdfFile'], message: `PDF exceeds maximum size of ${MAX_MB} MB.` })
        }
      }
    }
  })

type Form = z.infer<typeof schema>

export function Submit() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const imageInput = useRef<HTMLInputElement>(null)
  const pdfInput = useRef<HTMLInputElement>(null)

  const [activeMode, setActiveMode] = useState<InputMode>('TEXT')
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      departmentId: user?.departmentId ?? '',
      mode: 'TEXT',
      text: '',
    },
  })

  const imageFile = watch('imageFile')
  const pdfFile = watch('pdfFile')

  // Generate object preview URL for uploaded image
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImagePreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setImagePreviewUrl(null)
    }
  }, [imageFile])

  const handleModeChange = (newMode: InputMode) => {
    setActiveMode(newMode)
    setValue('mode', newMode, { shouldValidate: true })
  }

  const create = useMutation({
    mutationFn: (v: Form) => {
      if (v.mode === 'IMAGE') {
        return api.createImageSubmission({
          title: v.title.trim(),
          file: v.imageFile!,
          departmentId: v.departmentId,
          text: (v.text ?? '').trim(),
        })
      }
      if (v.mode === 'PDF') {
        return api.createPdfSubmission({
          title: v.title.trim(),
          file: v.pdfFile!,
          departmentId: v.departmentId,
        })
      }
      return api.createTextSubmission({
        title: v.title.trim(),
        content: (v.text ?? '').trim(),
        departmentId: v.departmentId,
      })
    },
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
    <div className="space-y-6">
      <PageHeader
        title="Check your content"
        subtitle="Submit text copy, visual marketing graphics (PNG/JPG), or PDF proposals. ClaimLedger verifies every claim against authoritative brand knowledge."
      />

      {/* 1-Click Quick Scenarios for Evaluation */}
      <section className="rounded-2xl border border-line bg-gradient-to-r from-brand-soft/50 via-white to-canvas p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-brand">
          <Sparkles size={16} /> Quick Test Scenarios (1-Click for Judges)
        </div>
        <div className="flex flex-wrap gap-2.5">
          {TEST_SCENARIOS.map((sc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setValue('title', sc.title, { shouldValidate: true })
                setValue('departmentId', sc.departmentId, { shouldValidate: true })
                setValue('text', sc.text, { shouldValidate: true })
                handleModeChange(sc.mode)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-2xs transition hover:border-brand hover:bg-brand-soft hover:text-brand cursor-pointer"
            >
              <span>{sc.badge}</span>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="space-y-6 rounded-3xl border border-line bg-surface p-7 shadow-xs">
        {/* Title and Department */}
        <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-ink">Content Title</label>
            <input
              id="title"
              {...register('title')}
              aria-invalid={!!errors.title}
              placeholder="e.g. Nexora Pro Q4 Promotional Campaign"
              className="w-full rounded-xl border border-line px-4 py-3 text-base shadow-xs focus:border-brand focus:ring-1 focus:ring-brand"
            />
            {errors.title && <p className="mt-1.5 text-xs font-medium text-violation">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="department" className="mb-1.5 block text-sm font-semibold text-ink">Department</label>
            <select
              id="department"
              {...register('departmentId')}
              aria-invalid={!!errors.departmentId}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-base shadow-xs focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">Choose department…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.departmentId && <p className="mt-1.5 text-xs font-medium text-violation">{errors.departmentId.message}</p>}
          </div>
        </div>

        {/* Multi-Format Input Mode Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted">
            Choose Content Submission Format:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Mode 1: Text */}
            <button
              type="button"
              onClick={() => handleModeChange('TEXT')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                activeMode === 'TEXT'
                  ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30 shadow-xs'
                  : 'border-line bg-surface hover:bg-canvas/80'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeMode === 'TEXT' ? 'bg-brand text-white' : 'bg-canvas text-navy'}`}>
                <FileText size={20} />
              </span>
              <div>
                <p className="font-bold text-sm text-ink">Paste Text</p>
                <p className="text-xs text-muted">Copywriting, emails, ads, social posts, or press releases.</p>
              </div>
            </button>

            {/* Mode 2: Image */}
            <button
              type="button"
              onClick={() => handleModeChange('IMAGE')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                activeMode === 'IMAGE'
                  ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30 shadow-xs'
                  : 'border-line bg-surface hover:bg-canvas/80'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeMode === 'IMAGE' ? 'bg-brand text-white' : 'bg-canvas text-navy'}`}>
                <ImageIcon size={20} />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-ink">Upload Image</p>
                  <span className="rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.2">Visual AI</span>
                </div>
                <p className="text-xs text-muted">PNG, JPG/JPEG graphics, banners, and promotional artwork.</p>
              </div>
            </button>

            {/* Mode 3: PDF */}
            <button
              type="button"
              onClick={() => handleModeChange('PDF')}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                activeMode === 'PDF'
                  ? 'border-brand bg-brand-soft/40 ring-2 ring-brand/30 shadow-xs'
                  : 'border-line bg-surface hover:bg-canvas/80'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeMode === 'PDF' ? 'bg-brand text-white' : 'bg-canvas text-navy'}`}>
                <FileUp size={20} />
              </span>
              <div>
                <p className="font-bold text-sm text-ink">Upload PDF</p>
                <p className="text-xs text-muted">Formal sales decks, partner proposals, and whitepapers.</p>
              </div>
            </button>
          </div>
        </div>

        {/* INPUT MODE 1: TEXT AREA */}
        {activeMode === 'TEXT' && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <label htmlFor="text" className="block text-sm font-semibold text-ink">Marketing Content & Claims</label>
              <span className="text-xs text-muted">Minimum 20 characters</span>
            </div>
            <textarea
              id="text"
              rows={8}
              {...register('text')}
              aria-invalid={!!errors.text}
              placeholder="Paste your marketing post, newsletter, email, or campaign announcement here…"
              className="w-full rounded-2xl border border-line px-4 py-3 text-base leading-relaxed focus:border-brand focus:ring-1 focus:ring-brand shadow-xs"
            />
            {errors.text && <p className="mt-1.5 text-xs font-medium text-violation">{errors.text.message}</p>}
          </div>
        )}

        {/* INPUT MODE 2: IMAGE UPLOAD */}
        {activeMode === 'IMAGE' && (
          <div className="space-y-4 animate-fade-in">
            <label className="block text-sm font-semibold text-ink">Promotional Campaign Graphic (PNG, JPG, or JPEG)</label>

            <input
              ref={imageInput}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => setValue('imageFile', e.target.files?.[0], { shouldValidate: true })}
            />

            {imageFile && imagePreviewUrl ? (
              <div className="rounded-2xl border border-line bg-canvas p-4 flex flex-col md:flex-row items-center gap-5">
                <div className="relative group max-h-56 max-w-xs shrink-0 overflow-hidden rounded-xl border border-line bg-white shadow-xs">
                  <img src={imagePreviewUrl} alt="Uploaded Graphic Preview" className="h-44 w-auto object-contain mx-auto" />
                </div>
                <div className="flex-1 space-y-2 w-full text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-base text-ink truncate max-w-md">{imageFile.name}</p>
                      <p className="text-xs text-muted">{(imageFile.size / 1024).toFixed(1)} KB · {imageFile.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('imageFile', undefined, { shouldValidate: true })
                        if (imageInput.current) imageInput.current.value = ''
                      }}
                      className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink hover:bg-canvas cursor-pointer"
                      title="Remove image"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-900">
                    <p className="font-bold flex items-center gap-1.5 mb-0.5">
                      <Sparkles size={14} className="text-teal-700" />
                      Visual Brand Governance Checks Active:
                    </p>
                    <p className="text-teal-800">
                      ClaimLedger will automatically extract in-image text claims, verify prices against Master Catalogues, evaluate corporate color palette adherence, and verify official logo presence.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => imageInput.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-canvas/50 p-8 text-center cursor-pointer transition hover:border-brand hover:bg-brand-soft/20"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-xs">
                  <Upload size={24} />
                </span>
                <div>
                  <p className="font-bold text-base text-ink">Choose or drag an image here</p>
                  <p className="text-xs text-muted mt-0.5">Supports PNG, JPG, or JPEG up to {MAX_MB} MB</p>
                </div>
              </div>
            )}
            {errors.imageFile && <p className="text-xs font-medium text-violation">{errors.imageFile.message as string}</p>}

            {/* Optional companion caption / context text */}
            <div className="space-y-1.5 pt-2">
              <label htmlFor="caption" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Accompanying Post Text or Headline (Optional)
              </label>
              <input
                id="caption"
                {...register('text')}
                placeholder="e.g. Social media copy or campaign headline accompanying this banner graphic…"
                className="w-full rounded-xl border border-line px-4 py-2.5 text-sm"
              />
            </div>
          </div>
        )}

        {/* INPUT MODE 3: PDF UPLOAD */}
        {activeMode === 'PDF' && (
          <div className="space-y-3 animate-fade-in">
            <label className="block text-sm font-semibold text-ink">Official PDF Document</label>

            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => setValue('pdfFile', e.target.files?.[0], { shouldValidate: true })}
            />

            {pdfFile ? (
              <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-soft text-navy">
                    <FileUp size={20} />
                  </span>
                  <div>
                    <p className="font-bold text-sm text-ink truncate max-w-md">{pdfFile.name}</p>
                    <p className="text-xs text-muted">{(pdfFile.size / 1024).toFixed(1)} KB · PDF Document</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('pdfFile', undefined, { shouldValidate: true })
                    if (pdfInput.current) pdfInput.current.value = ''
                  }}
                  className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink cursor-pointer"
                  title="Remove PDF"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => pdfInput.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-canvas/50 p-8 text-center cursor-pointer transition hover:border-brand hover:bg-brand-soft/20"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand shadow-xs">
                  <FileUp size={24} />
                </span>
                <div>
                  <p className="font-bold text-base text-ink">Choose a PDF file</p>
                  <p className="text-xs text-muted mt-0.5">Supports PDF documents up to {MAX_MB} MB</p>
                </div>
              </div>
            )}
            {errors.pdfFile && <p className="text-xs font-medium text-violation">{errors.pdfFile.message as string}</p>}
          </div>
        )}

        {create.isError && (
          <p role="alert" className="rounded-xl bg-violation-soft px-4 py-3 text-sm text-violation">
            {create.error instanceof Error ? create.error.message : 'Could not submit content for analysis. Please try again.'}
          </p>
        )}

        <div className="pt-2 border-t border-line flex items-center justify-between">
          <p className="text-xs text-muted">
            Selected format: <strong className="text-ink">{activeMode}</strong>
          </p>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-xs transition hover:bg-brand-strong cursor-pointer disabled:opacity-60"
          >
            {create.isPending && <Loader2 size={18} className="animate-spin" aria-hidden />}
            Verify Claims & Governance
          </button>
        </div>
      </form>
    </div>
  )
}
