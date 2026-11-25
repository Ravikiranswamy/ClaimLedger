import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileCheck2,
  Layers,
  Lock,
  Palette,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ClaimLedgerLogo } from '../components/ClaimLedgerLogo'
import {
  TEXT_SANDBOX_SCENARIOS,
  VISUAL_PRESETS,
  evaluateSandboxText,
  type SandboxStatus,
} from '../lib/sandboxEngine'

interface PublicMeta {
  authorityTiers: number
  governanceRoles: number
  deltaEThreshold: number
  automatedTests: number
  modalities: string[]
  engineVersion: string
}

const FALLBACK_META: PublicMeta = {
  authorityTiers: 3,
  governanceRoles: 4,
  deltaEThreshold: 25.0,
  automatedTests: 29,
  modalities: ['TEXT', 'PDF', 'IMAGE'],
  engineVersion: 'v2.0',
}

const RAW_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'https://claimledger-backend-miox.onrender.com'
const API_BASE = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/$/, '')}/api`

const PIPELINE_GATES = [
  {
    step: '01',
    name: 'Multimodal Ingest',
    desc: 'Accepts raw campaign copy, multi-page PDFs (Apache PDFBox), or promotional images with optional campaign codes.',
    artifact: 'Normalized text + pixel matrix + metadata',
  },
  {
    step: '02',
    name: 'Precision & Injection Triage',
    desc: 'Quarantines embedded prompt-injection overrides and suppresses harmless brand slogans to prevent false positives.',
    artifact: 'Sanitized actionable claim candidates',
  },
  {
    step: '03',
    name: 'Claim Extraction',
    desc: 'Splits copy into typed assertions (PRICE, PROMOTION, FEATURE, TERMINOLOGY, TONE, FACTUAL) with structured attributes.',
    artifact: 'Typed JSON claim attributes',
  },
  {
    step: '04',
    name: 'Visual CIELAB ΔE & Logo Audit',
    desc: 'Samples image swatches in perceptually uniform CIELAB color space (ΔE76 <= 25.0) and screens out competitor brand marks.',
    artifact: 'Per-swatch ΔE telemetry + logo verdict',
  },
  {
    step: '05',
    name: 'Scoped RAG Retrieval',
    desc: 'Retrieves only active, approved Knowledge Base chunks matching the organisation—never unapproved drafts or retired policies.',
    artifact: 'Ranked evidence candidates with doc/page',
  },
  {
    step: '06',
    name: 'Authority Tier Resolution',
    desc: 'Applies deterministic precedence: Tier 1 Master Authority overrides Tier 2 Departmental Exceptions and blocks Tier 3 Outdated docs.',
    artifact: 'VERIFIED / CONFLICT / VIOLATION / UNVERIFIED',
  },
  {
    step: '07',
    name: 'Semantic Revision Diff',
    desc: 'Tracks token-level text diffs and structured attribute deltas across revisions (e.g., ₹799 -> ₹999) for rapid re-review.',
    artifact: 'Layer 1 text + Layer 2 attribute diff',
  },
  {
    step: '08',
    name: 'Human Sign-Off & Audit Trail',
    desc: 'Never auto-publishes. Routes findings to Authorised Reviewers / Dept Managers and logs every decision chronologically.',
    artifact: 'Immutable submission & audit ledger',
  },
]

const STATUS_STYLE: Record<SandboxStatus, { label: string; cls: string }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  VIOLATION: { label: 'Violation', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  CONFLICT: { label: 'Tier Conflict', cls: 'bg-purple-50 text-purple-800 border-purple-200' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  SECURITY_ALERT: { label: 'Injection Quarantined', cls: 'bg-rose-100 text-rose-900 border-rose-300' },
  ORDINARY_COPY: { label: 'Brand Copy (Suppressed)', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export function Landing() {
  const { user, enterDemoRole, switchingRole } = useAuth()
  const navigate = useNavigate()

  const [sandboxTab, setSandboxTab] = useState<'TEXT' | 'VISUAL'>('TEXT')
  const [scenarioId, setScenarioId] = useState<string>(TEXT_SANDBOX_SCENARIOS[0].id)
  const [draftText, setDraftText] = useState<string>(TEXT_SANDBOX_SCENARIOS[0].text)
  const [previewRewrite, setPreviewRewrite] = useState<boolean>(false)
  const [visualPresetId, setVisualPresetId] = useState<string>(VISUAL_PRESETS[1].id)
  const [activeGate, setActiveGate] = useState<number>(0)

  const metaQ = useQuery({
    queryKey: ['public-meta'],
    queryFn: async () => {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 3500)
      try {
        const res = await fetch(`${API_BASE}/public/meta`, { signal: controller.signal })
        if (!res.ok) return FALLBACK_META
        const json = await res.json()
        return (json?.data ?? json) as PublicMeta
      } catch {
        return FALLBACK_META
      } finally {
        clearTimeout(t)
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const meta = metaQ.data ?? FALLBACK_META
  const evaluation = useMemo(() => evaluateSandboxText(draftText), [draftText])
  const activeVisual = useMemo(
    () => VISUAL_PRESETS.find((v) => v.id === visualPresetId) ?? VISUAL_PRESETS[0],
    [visualPresetId]
  )
  const activeScenario = TEXT_SANDBOX_SCENARIOS.find((s) => s.id === scenarioId) ?? TEXT_SANDBOX_SCENARIOS[0]

  const handleSelectScenario = (id: string) => {
    const found = TEXT_SANDBOX_SCENARIOS.find((s) => s.id === id)
    if (!found) return
    setScenarioId(id)
    setDraftText(found.text)
    setPreviewRewrite(false)
  }

  const handleOpenDemoWorkspace = async (role: 'CREATOR' | 'REVIEWER' | 'ADMIN' = 'CREATOR') => {
    await enterDemoRole(role)
    navigate('/workspace')
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <ClaimLedgerLogo size={32} withWordmark />
            <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0F766E] sm:inline-block">
              Brand Governance
            </span>
          </Link>

          <nav aria-label="Public navigation" className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
            <a href="#sandbox" className="hover:text-ink transition">Live Sandbox</a>
            <a href="#how-it-works" className="hover:text-ink transition">8-Gate Pipeline</a>
            <a href="#limits" className="hover:text-ink transition">Guardrails</a>
            <Link to="/evaluation" className="hover:text-ink transition">Evaluation &amp; Benchmarks</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to="/workspace"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-strong transition"
              >
                Open Workspace <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-canvas transition"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleOpenDemoWorkspace('CREATOR')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy-soft disabled:opacity-60 transition cursor-pointer"
                >
                  {switchingRole ? 'Opening Workspace…' : 'Open Demo Workspace'} <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* 1. Hero + Verifiable Architecture Metrics */}
        <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-canvas px-4 pt-12 pb-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  <ShieldCheck size={14} />
                  <span>Pre-Publication Multimodal Claim &amp; Visual Governance</span>
                </div>

                <h1 className="font-display text-4xl font-bold tracking-tight text-[#0A1F36] sm:text-5xl lg:text-[54px] lg:leading-[1.08]">
                  Every claim verified against proof.{' '}
                  <span className="text-[#0F766E]">Before it ships.</span>
                </h1>

                <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                  ClaimLedger intercepts marketing copy, PDFs, and campaign graphics before publication. It resolves every
                  factual claim against your <strong>3-tier Authority Knowledge Base</strong>, audits visual assets with{' '}
                  <strong>CIELAB ΔE color science</strong>, and routes findings to human reviewers. Nothing publishes
                  without sign-off.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#sandbox"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-strong transition"
                  >
                    <Play size={15} /> Try Live Sandbox (No Login)
                  </a>
                  <button
                    type="button"
                    disabled={switchingRole}
                    onClick={() => handleOpenDemoWorkspace('CREATOR')}
                    className="inline-flex items-center gap-2 rounded-xl border border-navy/20 bg-surface px-5 py-3 text-sm font-bold text-[#0A1F36] shadow-xs hover:bg-canvas disabled:opacity-60 transition cursor-pointer"
                  >
                    {switchingRole ? 'Connecting Demo Workspace…' : 'Launch Full 4-Role Workspace'} <ArrowRight size={15} />
                  </button>
                  <Link
                    to="/evaluation"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#0F766E] hover:underline"
                  >
                    View Evaluation &amp; Benchmarks →
                  </Link>
                </div>
              </div>

              {/* Right Column: Live Engine Spec Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-line bg-navy p-6 text-white shadow-xl space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#5EEAD4]">
                        Deterministic + Grounded Engine
                      </p>
                      <h2 className="font-display text-lg font-bold">Architecture Snapshot</h2>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-[#5EEAD4]">
                      {meta.engineVersion}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <p className="font-display text-2xl font-bold text-white">{meta.authorityTiers} Tiers</p>
                      <p className="text-xs text-[#C7D7E8]">Master &gt; Dept &gt; Outdated</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <p className="font-display text-2xl font-bold text-[#5EEAD4]">ΔE &lt; {meta.deltaEThreshold}</p>
                      <p className="text-xs text-[#C7D7E8]">CIELAB perceptual color gate</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <p className="font-display text-2xl font-bold text-white">{meta.governanceRoles} Roles</p>
                      <p className="text-xs text-[#C7D7E8]">1-click demo switching</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                      <p className="font-display text-2xl font-bold text-white">{meta.automatedTests} Tests</p>
                      <p className="text-xs text-[#C7D7E8]">Automated JUnit 5 verification checks</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-[#D6E3EF] space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Lock size={13} className="text-[#5EEAD4]" />
                      <span>Strict Evidence &amp; Safety Guarantees</span>
                    </div>
                    <p>
                      Every finding quotes the exact source document, tier, and page—or reports{' '}
                      <span className="font-mono text-amber-300">UNVERIFIED</span>. Prompt-injection overrides are
                      quarantined before verdict synthesis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Why Unchecked Claims Cost Brands */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">The Problem</p>
              <h2 className="font-display text-2xl font-bold text-[#0A1F36] sm:text-3xl">
                One unchecked sentence or off-brand banner creates real liability.
              </h2>
            </div>
            <p className="text-xs text-muted">Illustrative regulatory &amp; brand governance failure modes</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-2">
              <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                FTC 16 CFR Part 255
              </span>
              <h3 className="font-display text-base font-bold text-[#0A1F36]">Unsupported Claims</h3>
              <p className="text-xs leading-relaxed text-muted">
                Unverified multiplier or health promises (*"2x faster"*, *"cures in 14 days"*) trigger FTC/FDA
                enforcement and multi-million-dollar judgments.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-2">
              <span className="inline-block rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                Pricing &amp; Promo Drift
              </span>
              <h3 className="font-display text-base font-bold text-[#0A1F36]">Stale Offer Copy</h3>
              <p className="text-xs leading-relaxed text-muted">
                Campaign teams reuse last quarter's ₹799 promo rate after Tier 1 Master Catalogues shift to ₹999,
                creating misleading advertising exposure.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-2">
              <span className="inline-block rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800">
                Tier 1 vs Tier 2 Scope
              </span>
              <h3 className="font-display text-base font-bold text-[#0A1F36]">Exception Leakage</h3>
              <p className="text-xs leading-relaxed text-muted">
                A negotiated Tier 2 sales discount (Acme Corp only) accidentally ships in public social collateral if not
                scoped by account, channel, and expiry date.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-2">
              <span className="inline-block rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-[#0F766E]">
                CIELAB ΔE Visual Gate
              </span>
              <h3 className="font-display text-base font-bold text-[#0A1F36]">Off-Brand Graphics</h3>
              <p className="text-xs leading-relaxed text-muted">
                Visual assets ship with off-palette colors (ΔE &gt; 25.0) or missing/competitor logos—undetected by
                text-only governance checkers.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Interactive Dual-Modality Sandbox */}
        <section id="sandbox" className="border-y border-line bg-surface px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Interactive Live Sandbox · 0ms Client Deterministic Preview
                </p>
                <h2 className="font-display text-2xl font-bold text-[#0A1F36] sm:text-3xl">
                  Test both Text Claims and Visual CIELAB ΔE right here.
                </h2>
              </div>

              <div className="inline-flex rounded-xl border border-line bg-canvas p-1">
                <button
                  type="button"
                  onClick={() => setSandboxTab('TEXT')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    sandboxTab === 'TEXT' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-ink'
                  }`}
                >
                  <FileCheck2 size={14} /> Text &amp; Regulatory Claims
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxTab('VISUAL')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    sandboxTab === 'VISUAL' ? 'bg-navy text-white shadow-xs' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Palette size={14} /> Visual Brand &amp; CIELAB ΔE
                </button>
              </div>
            </div>

            {sandboxTab === 'TEXT' ? (
              <div className="space-y-4">
                {/* Scenario Pills */}
                <div className="flex flex-wrap gap-2">
                  {TEXT_SANDBOX_SCENARIOS.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectScenario(sc.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                        scenarioId === sc.id
                          ? 'border-brand bg-brand-soft/60 text-[#0A1F36] shadow-2xs'
                          : 'border-line bg-canvas text-muted hover:text-ink'
                      }`}
                    >
                      <span>{sc.label}</span>
                      <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[#0F766E]">
                        {sc.badge}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Left: Editable Copy + Rewrite Preview Toggle */}
                  <div className="lg:col-span-5 rounded-2xl border border-line bg-canvas/60 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <p className="font-display text-sm font-bold text-[#0A1F36]">{activeScenario.title}</p>
                        <p className="text-[11px] text-muted">{activeScenario.channel}</p>
                      </div>
                      <span className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-[#0A1F36]">
                        Score: {evaluation.score}/100
                      </span>
                    </div>

                    <div>
                      <label htmlFor="sandbox-copy" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
                        {previewRewrite ? 'Previewing Compliant Rewrite (Not Applied)' : 'Draft Copy (Edit to test live)'}
                      </label>
                      {previewRewrite ? (
                        <div className="min-h-[140px] rounded-xl border-2 border-emerald-300 bg-emerald-50/70 p-3.5 text-sm leading-relaxed text-[#0A1F36]">
                          {evaluation.rewrittenText || 'Flagged override payload stripped. Human review required.'}
                        </div>
                      ) : (
                        <textarea
                          id="sandbox-copy"
                          rows={5}
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          className="w-full rounded-xl border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink focus:border-brand focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewRewrite((p) => !p)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                          previewRewrite
                            ? 'bg-emerald-700 text-white'
                            : 'border border-brand/30 bg-surface text-[#0F766E] hover:bg-brand-soft/40'
                        }`}
                      >
                        <Eye size={14} />
                        {previewRewrite ? 'Back to Original Draft' : 'Preview Compliant Rewrite'}
                      </button>
                      <span className="text-[11px] text-muted">Humans decide · Never auto-applied</span>
                    </div>
                  </div>

                  {/* Right: Findings Breakdown */}
                  <div className="lg:col-span-7 space-y-3">
                    {evaluation.findings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                        Enter copy on the left to run claim triage and authority resolution.
                      </div>
                    ) : (
                      evaluation.findings.map((f) => {
                        const style = STATUS_STYLE[f.status]
                        return (
                          <div key={f.id} className="rounded-2xl border border-line bg-surface p-4 shadow-2xs space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${style.cls}`}>
                                  {style.label}
                                </span>
                                <span className="text-xs font-bold text-[#0A1F36]">{f.category}</span>
                              </div>
                              <span className="font-mono text-[11px] text-muted">{f.ruleId} · {f.authorityTier}</span>
                            </div>

                            <p className="rounded-lg bg-canvas px-3 py-2 text-xs font-medium text-[#0A1F36]">
                              “{f.span}”
                            </p>
                            <p className="text-xs leading-relaxed text-muted">{f.rationale}</p>
                            <p className="text-[11px] font-semibold text-[#0F766E]">
                              Evidence Source: {f.sourceDoc}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Visual CIELAB Sandbox */
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {VISUAL_PRESETS.map((vp) => (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setVisualPresetId(vp.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                        visualPresetId === vp.id
                          ? 'border-brand bg-brand-soft/60 text-[#0A1F36] shadow-2xs'
                          : 'border-line bg-canvas text-muted hover:text-ink'
                      }`}
                    >
                      <span>{vp.label}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          vp.verdict === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {vp.verdict}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Simulated Banner Preview */}
                  <div className="lg:col-span-5 rounded-2xl border border-line bg-canvas/70 p-5 space-y-4">
                    <div
                      className="flex h-48 flex-col justify-between rounded-2xl p-5 text-white shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${activeVisual.primaryHex} 0%, ${activeVisual.secondaryHex} 100%)`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-black/25 px-2.5 py-1 font-mono text-[11px] font-bold">
                          {activeVisual.id === 'competitor-logo' ? 'amazon ➔' : activeVisual.id === 'approved-teal' ? 'CL · NEXORA' : 'PROMO BANNER'}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                          style={{ backgroundColor: activeVisual.accentHex, color: '#0A1F36' }}
                        >
                          {activeVisual.filename}
                        </span>
                      </div>
                      <div>
                        <p className="font-display text-xl font-bold">
                          {activeVisual.id === 'competitor-logo'
                            ? 'Third-Party Competitor Asset'
                            : 'Nexora Pro Enterprise Launch'}
                        </p>
                        <p className="text-xs opacity-90">{activeVisual.paletteLabel}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">
                        Sampled Dominant Swatches (Threshold: ΔE &lt; 25.0)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeVisual.swatches.map((sw) => (
                          <div
                            key={sw.hex}
                            className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                              sw.approved ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/60'
                            }`}
                          >
                            <span
                              className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <div className="min-w-0 text-xs">
                              <p className="font-mono font-bold text-[#0A1F36]">
                                {sw.hex} · ΔE {sw.deltaE.toFixed(1)}
                              </p>
                              <p className="truncate text-[11px] text-muted">Nearest: {sw.nearestApproved}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visual Findings */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="rounded-2xl border border-line bg-surface p-5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                          CIELAB ΔE Color Science Verdict
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            activeVisual.verdict === 'VERIFIED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800'
                          }`}
                        >
                          {activeVisual.verdict}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted">
                        {activeVisual.verdict === 'VERIFIED'
                          ? 'All sampled regions fall strictly within Nexora Master Palette tolerances (ΔE = 0.0 < 25.0).'
                          : `Off-brand color detected above ΔE=25.0 threshold (peak ΔE=${Math.max(...activeVisual.swatches.map((s) => s.deltaE)).toFixed(1)}).`}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-line bg-surface p-5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                          Brand Identity &amp; Competitor Mark Screen
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            activeVisual.logoStatus === 'VERIFIED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800'
                          }`}
                        >
                          {activeVisual.logoStatus}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#0A1F36]">{activeVisual.logoTitle}</p>
                      <p className="text-xs leading-relaxed text-muted">{activeVisual.logoExplanation}</p>
                      {activeVisual.summaryFix && (
                        <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs font-medium text-[#0A1F36]">
                          <strong>Suggested Fix:</strong> {activeVisual.summaryFix}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 4. Interactive 8-Gate Pipeline */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">How ClaimLedger Works</p>
            <h2 className="font-display text-2xl font-bold text-[#0A1F36] sm:text-3xl">
              Eight deterministic + grounded gates. One accountable human sign-off.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 grid gap-2.5 sm:grid-cols-2">
              {PIPELINE_GATES.map((g, idx) => (
                <button
                  key={g.step}
                  type="button"
                  onClick={() => setActiveGate(idx)}
                  className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                    activeGate === idx
                      ? 'border-brand bg-brand-soft/45 shadow-xs'
                      : 'border-line bg-surface hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0F766E]">GATE {g.step}</span>
                    <Layers size={14} className={activeGate === idx ? 'text-[#0F766E]' : 'text-muted'} />
                  </div>
                  <p className="mt-1 font-display text-sm font-bold text-[#0A1F36]">{g.name}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-20 rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-navy px-3 py-1 font-mono text-xs font-bold text-[#5EEAD4]">
                  ACTIVE GATE · {PIPELINE_GATES[activeGate].step}
                </div>
                <h3 className="font-display text-2xl font-bold text-[#0A1F36]">
                  {PIPELINE_GATES[activeGate].name}
                </h3>
                <p className="text-sm leading-relaxed text-muted">{PIPELINE_GATES[activeGate].desc}</p>
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Stage Output Artifact</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-[#0F766E]">
                    {PIPELINE_GATES[activeGate].artifact}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Limits & Responsible AI Charter */}
        <section id="limits" className="border-t border-line bg-surface px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">Limits &amp; Accountability</p>
              <h2 className="font-display text-2xl font-bold text-[#0A1F36] sm:text-3xl">
                What ClaimLedger enforces—and what it refuses to automate.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 space-y-3">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-emerald-950">
                  <CheckCircle2 size={18} className="text-emerald-700" />
                  <span>What It Always Guarantees</span>
                </h3>
                <ul className="space-y-2 text-sm text-emerald-950/90">
                  <li>• Quotes the exact flagged span, authority tier, document name, and page.</li>
                  <li>• Returns <span className="font-mono font-bold">UNVERIFIED</span> when no approved source exists—never fabricates citations.</li>
                  <li>• Applies CIELAB ΔE perceptual color math rather than naive RGB distance.</li>
                  <li>• Logs submissions, semantic revision diffs, and reviewer decisions chronologically.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 space-y-3">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold text-amber-950">
                  <ShieldAlert size={18} className="text-amber-700" />
                  <span>What It Will Never Do</span>
                </h3>
                <ul className="space-y-2 text-sm text-amber-950/90">
                  <li>• Never publishes, schedules, or distributes external marketing assets automatically.</li>
                  <li>• Never silently rewrites text or changes Knowledge Base rules without human sign-off.</li>
                  <li>• Never obeys instructions embedded inside untrusted marketing copy (prompt injection).</li>
                  <li>• Never replaces formal legal counsel—verdicts support accountable human decision-making.</li>
                </ul>
              </div>
            </div>

            {/* Final CTA Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-navy p-8 text-white shadow-lg">
              <div className="space-y-1.5 max-w-xl">
                <h3 className="font-display text-2xl font-bold">Ready to test the full 4-role governance lifecycle?</h3>
                <p className="text-sm text-[#D6E3EF]">
                  Submit copy or banners as Creator, switch to Authorised Reviewer in 1 click, compare Semantic Revision
                  Diffs, and inspect the Evaluation benchmark.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleOpenDemoWorkspace('CREATOR')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-bold text-[#0A1F36] hover:bg-[#5EEAD4] disabled:opacity-60 transition cursor-pointer"
                >
                  <Users size={16} /> {switchingRole ? 'Opening Workspace…' : 'Enter Demo Workspace'}
                </button>
                <Link
                  to="/evaluation"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20 transition"
                >
                  <Sparkles size={16} /> Evaluation Report
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas px-4 py-8 text-xs text-muted sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClaimLedgerLogo size={22} />
            <span className="font-semibold text-ink">ClaimLedger</span>
            <span>· Pre-Publication Brand &amp; Regulatory Governance</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/evaluation" className="hover:text-ink">Evaluation</Link>
            <Link to="/login" className="hover:text-ink">Sign In</Link>
            <a
              href="https://claimledger-backend-miox.onrender.com/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink"
            >
              API Docs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
