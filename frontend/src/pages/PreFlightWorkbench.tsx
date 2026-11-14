import { useMutation } from '@tanstack/react-query'
import {
  Clock,
  Code2,
  Copy,
  Gauge,
  Play,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { DEPARTMENTS, type PreFlightMode } from '../types'

const SAMPLE_SNIPPETS = [
  {
    label: '🚨 Outdated Price (₹799 vs ₹999)',
    mode: 'LIGHTWEIGHT' as PreFlightMode,
    campaignCode: '',
    text: 'Get Nexora Pro today for only ₹799 per month! Complete enterprise AI brand compliance and automated claim verification.',
  },
  {
    label: '🎉 Diwali Campaign Exception (₹799 + DIWALI_SPECIAL)',
    mode: 'LIGHTWEIGHT' as PreFlightMode,
    campaignCode: 'DIWALI_SPECIAL',
    text: 'Celebrate Diwali with Nexora Pro for just ₹799 monthly under our seasonal promotional celebration package.',
  },
  {
    label: '❌ Expired Campaign Attempt (₹699 + SUMMER_FLASH_2025)',
    mode: 'LIGHTWEIGHT' as PreFlightMode,
    campaignCode: 'SUMMER_FLASH_2025',
    text: 'Summer flash special: grab Nexora Pro for ₹699/user/month before the sale ends!',
  },
  {
    label: '✅ Authoritative Master Claims (₹999 + 99.99% SLA)',
    mode: 'FULL' as PreFlightMode,
    campaignCode: '',
    text: 'Nexora Pro is officially priced at ₹999 per user per month billed annually, with a guaranteed 99.99% enterprise uptime SLA.',
  },
]

export default function PreFlightWorkbench() {
  const [text, setText] = useState(SAMPLE_SNIPPETS[0].text)
  const [mode, setMode] = useState<PreFlightMode>('LIGHTWEIGHT')
  const [campaignCode, setCampaignCode] = useState('')
  const [departmentId, setDepartmentId] = useState<string>(DEPARTMENTS[0]?.id || '')
  const [copiedCurl, setCopiedCurl] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      api.preFlightCheck({
        text,
        mode,
        campaignCode: campaignCode.trim() || undefined,
        departmentId: departmentId || undefined,
      }),
  })

  const handleRunSample = (sample: typeof SAMPLE_SNIPPETS[0]) => {
    setText(sample.text)
    setMode(sample.mode)
    setCampaignCode(sample.campaignCode)
    mutation.reset()
  }

  const result = mutation.data

  const curlCommand = `curl -X POST https://api.claimledger.nexora.com/api/preflight/check \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "${text.replace(/"/g, '\\"')}",
    "mode": "${mode}"${campaignCode ? `,\n    "campaignCode": "${campaignCode}"` : ''}
  }'`

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2000)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            <Zap className="h-3.5 w-3.5 text-sky-600" />
            Developer & Pre-Flight API
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
            Pre-Flight Verification Workbench
          </h1>
          <p className="mt-1 text-base text-slate-600">
            Real-time content verification endpoint designed for CMS integrations, CI/CD pipelines, and browser preview tools.
          </p>
        </div>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          <Tag className="h-4 w-4" />
          View Active Campaigns
        </Link>
      </div>

      {/* Mode callout & latency explanation */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`rounded-xl border p-4 transition ${mode === 'LIGHTWEIGHT' ? 'border-sky-500 bg-sky-50/50 shadow-xs' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Zap className="h-4 w-4 text-amber-500" />
              Lightweight Pre-Flight Mode
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Sub-second SLA</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Uses fast deterministic regex/NLP heuristics + top-3 pgvector chunks. Skips heavy LLM latency to deliver immediate feedback in editing tools.
          </p>
        </div>

        <div className={`rounded-xl border p-4 transition ${mode === 'FULL' ? 'border-sky-500 bg-sky-50/50 shadow-xs' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Gauge className="h-4 w-4 text-indigo-500" />
              Full Verification Mode
            </div>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Deep Analysis</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Runs multimodal/LLM extraction, evaluates hierarchical authority rules, scoped departmental exceptions, and full evidence chains.
          </p>
        </div>
      </div>

      {/* Preset Scenario Quick-Pickers */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Try Quick Test Scenarios:
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_SNIPPETS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleRunSample(sample)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-left text-xs font-medium text-slate-700 shadow-2xs transition hover:border-sky-300 hover:bg-slate-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Workbench Form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input Form */}
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-slate-900">Draft Content Snippet</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode('LIGHTWEIGHT')}
                  className={`rounded-md px-2.5 py-1 ${mode === 'LIGHTWEIGHT' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Lightweight
                </button>
                <button
                  type="button"
                  onClick={() => setMode('FULL')}
                  className={`rounded-md px-2.5 py-1 ${mode === 'FULL' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Full Pipeline
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste social copy, ad headlines, or proposal text to verify..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Campaign Code Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. DIWALI_SPECIAL"
                  value={campaignCode}
                  onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs uppercase focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Target Scope / Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-400">
                {text.length} characters • {text.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                type="button"
                disabled={mutation.isPending || !text.trim()}
                onClick={() => mutation.mutate()}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Executing Check…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    Check with Pre-Flight
                  </>
                )}
              </button>
            </div>
          </div>

          {/* cURL snippet box */}
          <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono">
                <Code2 className="h-3.5 w-3.5 text-sky-400" />
                POST /api/preflight/check
              </span>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                <Copy className="h-3 w-3" />
                {copiedCurl ? 'Copied!' : 'Copy cURL'}
              </button>
            </div>
            <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-300">
              {curlCommand}
            </pre>
          </div>
        </div>

        {/* Right Column: Pre-Flight Response Results */}
        <div className="lg:col-span-6">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-semibold text-slate-900">Pre-Flight Findings</span>
              {result && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    <Clock className="h-3 w-3 text-slate-500" />
                    {result.latencyMs} ms
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      result.compliant
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.compliant ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        COMPLIANT
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        FLAGGED
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            {mutation.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Pre-Flight Check Failed</p>
                <p className="mt-1 text-xs">{(mutation.error as Error).message}</p>
              </div>
            )}

            {!result && !mutation.isPending && !mutation.isError && (
              <div className="flex h-72 flex-col items-center justify-center text-center text-slate-400">
                <Zap className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium">Click "Check with Pre-Flight" to test this text</p>
                <p className="mt-1 text-xs text-slate-400">
                  Results will display extracted claims, latency, and rule evaluations in real time.
                </p>
              </div>
            )}

            {mutation.isPending && (
              <div className="flex h-72 flex-col items-center justify-center space-y-3 text-center">
                <Clock className="h-8 w-8 animate-spin text-sky-600" />
                <p className="text-sm font-medium text-slate-700">Analyzing text against knowledge base…</p>
                <p className="text-xs text-slate-400">Evaluating deterministic authority hierarchy</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Metric Summary Strip */}
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{result.totalClaims}</div>
                    <div className="text-[11px] text-slate-500">Claims</div>
                  </div>
                  <div>
                    <div className={`font-bold ${result.violations > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {result.violations}
                    </div>
                    <div className="text-[11px] text-slate-500">Violations</div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-600">{result.verified}</div>
                    <div className="text-[11px] text-slate-500">Verified</div>
                  </div>
                  <div>
                    <div className="font-bold text-amber-600">{result.conflicts}</div>
                    <div className="text-[11px] text-slate-500">Conflicts</div>
                  </div>
                </div>

                {/* Summary banner */}
                <div
                  className={`rounded-xl p-3 text-xs font-medium ${
                    result.compliant ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {result.summary}
                </div>

                {/* Per-Claim Cards */}
                <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
                  {result.claims.map((claim, idx) => {
                    const isViolation = claim.status === 'VIOLATION'
                    const isVerified = claim.status === 'VERIFIED'

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3 text-xs transition ${
                          isViolation
                            ? 'border-red-200 bg-red-50/40'
                            : isVerified
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-amber-200 bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">"{claim.claimText}"</span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              isViolation
                                ? 'bg-red-100 text-red-700'
                                : isVerified
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {claim.status}
                          </span>
                        </div>

                        <p className="mt-1.5 text-slate-600">{claim.explanation}</p>

                        {claim.suggestedCorrection && (
                          <div className="mt-2 rounded bg-white/80 p-2 font-mono text-[11px] text-slate-800 border border-slate-200/60">
                            <span className="font-bold text-red-600">Correction: </span>
                            {claim.suggestedCorrection}
                          </div>
                        )}

                        {claim.authoritativeSource && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                            <span>Authoritative Source:</span>
                            <span className="font-medium text-slate-600">{claim.authoritativeSource}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
