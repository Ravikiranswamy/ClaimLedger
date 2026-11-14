import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  PlusCircle,
  ShieldAlert,
  Tag,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import type { Campaign, CampaignRequest } from '../types'

// ─── Status badge ─────────────────────────────────────────────────────────────
function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  if (campaign.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3.5 w-3.5" /> Expired
      </span>
    )
  }
  if (campaign.isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3.5 w-3.5" /> Upcoming
    </span>
  )
}

// ─── Register Campaign Modal ───────────────────────────────────────────────────
function RegisterCampaignModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<Partial<CampaignRequest>>({
    allowedProductScope: 'Nexora Pro',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: CampaignRequest) => api.registerCampaign(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.code || !form.name || !form.startDate || !form.endDate) {
      setError('Code, name, start date and end date are all required.')
      return
    }
    if (form.endDate <= form.startDate!) {
      setError('End date must be after start date.')
      return
    }
    mutation.mutate(form as CampaignRequest)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Register Campaign Exception</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Only admins and department managers may register campaign exceptions. Creators cannot
            self-declare pricing exceptions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Campaign Code *</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="DIWALI_SPECIAL"
                value={form.code ?? ''}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <p className="mt-1 text-xs text-slate-400">Uppercase, no spaces. This is the reference code creators can cite.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Campaign Name *</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Diwali Festive 2026"
                value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Briefly describe the campaign and its governance scope."
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Product Scope</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Nexora Pro"
                value={form.allowedProductScope ?? ''}
                onChange={(e) => setForm({ ...form, allowedProductScope: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Allowed Discount Price</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="₹799"
                value={form.allowedDiscountPrice ?? ''}
                onChange={(e) => setForm({ ...form, allowedDiscountPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={form.startDate ?? ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={form.endDate ?? ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {mutation.isPending ? 'Registering…' : 'Register Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-sky-100 p-1.5">
            <Tag className="h-4 w-4 text-sky-600" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-slate-900">{campaign.code}</span>
              <CampaignStatusBadge campaign={campaign} />
            </div>
            <p className="text-sm text-slate-600">{campaign.name}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {campaign.allowedDiscountPrice ?? '—'}
        </span>
      </div>

      {campaign.description && (
        <p className="mt-3 text-sm text-slate-500">{campaign.description}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {campaign.startDate} → {campaign.endDate}
        </span>
        {campaign.allowedProductScope && (
          <span className="flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            Scope: {campaign.allowedProductScope}
          </span>
        )}
      </div>

      {campaign.governanceNote && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            campaign.isExpired
              ? 'bg-red-50 text-red-700'
              : campaign.isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
          }`}
        >
          {campaign.governanceNote}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CampaignManager() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)

  const canRegister = user?.role === 'ADMIN' || user?.role === 'DEPT_MANAGER'

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.listCampaigns(),
  })

  const activeCampaigns = campaigns.filter((c) => c.isActive)
  const expiredCampaigns = campaigns.filter((c) => c.isExpired)
  const upcomingCampaigns = campaigns.filter((c) => !c.isActive && !c.isExpired)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Campaign Governance</h1>
          <p className="mt-2 text-base text-slate-500">
            Manage registered campaign pricing exceptions. Only approved campaigns may override master pricing rules.
          </p>
        </div>
        {canRegister ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
          >
            <PlusCircle className="h-4 w-4" />
            Register Campaign
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Admins/managers only
          </div>
        )}
      </div>

      {/* Governance notice */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        <p className="font-medium">Campaign Governance Rule</p>
        <p className="mt-1 text-sky-700">
          A campaign code on a submission is a <strong>reference</strong>, not proof of permission.
          The authority engine always validates that the code is registered, approved, and within its
          active date window. Expired or unregistered codes generate automatic VIOLATION findings.
          Creators cannot self-declare exceptions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading campaigns…</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          No campaigns registered yet.
        </div>
      ) : (
        <div className="space-y-8">
          {activeCampaigns.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-600">Active</h2>
              <div className="space-y-3">
                {activeCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </section>
          )}
          {upcomingCampaigns.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600">Upcoming</h2>
              <div className="space-y-3">
                {upcomingCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </section>
          )}
          {expiredCampaigns.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Expired</h2>
              <div className="space-y-3 opacity-70">
                {expiredCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {showModal && <RegisterCampaignModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
