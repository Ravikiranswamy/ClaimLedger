import { ArrowLeft, BookOpen, Clock, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface ModuleInfo {
  num: string
  title: string
  subtitle: string
  description: string
  phase: string
  features: string[]
}

const MODULES: Record<string, ModuleInfo> = {
  '/admin/users': {
    num: '04',
    title: 'User Management',
    subtitle: 'Manage organisation employees, roles, and departmental permissions',
    description:
      'Control role-based access control (RBAC) across Nexora Technologies departments (Marketing, Sales, HR), assign content creator and authorised reviewer permissions, and enforce boundary security.',
    phase: 'Phase 2',
    features: [
      'Role assignment (Creator, Reviewer, Department Manager, Admin)',
      'Department scoping and reassignment',
      'Configurable knowledge document approval authorities',
      'Session tracking and credential security',
    ],
  },
  '/admin/approvals': {
    num: '05',
    title: 'Approval Management',
    subtitle: 'Review knowledge documents and governance decisions',
    description:
      'A dedicated governance portal separating content publication decisions from authoritative knowledge base approvals. Ensures documents meet compliance and accuracy criteria before becoming Tier 1/2 truth.',
    phase: 'Phase 4',
    features: [
      'Dual workflow: Content submission review vs. Knowledge document approval',
      'Pending document approvals queue with reviewer commentary',
      'Authority tier elevation and exception management',
      'Supersession and replacement sign-offs',
    ],
  },
  '/admin/insights': {
    num: '07',
    title: 'Insights & Guidelines Health',
    subtitle: 'Identify recurring violations, ambiguity trends, and guideline gaps',
    description:
      'Organisation-wide governance intelligence aggregating automated claim checks, recurring brand guideline breaches, and unverified claim clusters to help managers update company guidelines proactively.',
    phase: 'Phase 6',
    features: [
      'Top recurring brand violations and guideline friction points',
      'Department compliance comparison (Marketing vs Sales vs HR)',
      'Unverified claim cluster detection (missing knowledge alerts)',
      'Document freshness and upcoming expiry forecasts',
    ],
  },
  '/admin/settings': {
    num: 'Settings',
    title: 'Organisation Settings',
    subtitle: 'Nexora Technologies brand governance and system configuration',
    description:
      'Configure organisation-wide settings for ClaimLedger, including authority matrix conflict policies, pgvector indexing thresholds, automated analysis sensitivity, and audit retention policies.',
    phase: 'Phase 3',
    features: [
      'Organisation profile and department tree configuration',
      'Authority hierarchy configuration (Tier 1 vs Tier 2 exception rules)',
      'pgvector 768-dim similarity thresholds and chunking preferences',
      'Audit log immutability and retention policies',
    ],
  },
}

export function AdminModulePlaceholder() {
  const { pathname } = useLocation()
  const info = MODULES[pathname] ?? {
    num: 'Admin',
    title: 'Admin Module',
    subtitle: 'Organisation Brand Governance',
    description: 'This module is scheduled in the incremental implementation roadmap.',
    phase: 'Roadmap',
    features: [],
  }

  return (
    <div className="space-y-6">
      {/* Module Header Card */}
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-xs md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3.5 py-1 text-xs font-bold text-navy">
            <span className="font-mono text-brand font-bold">{info.num}</span>
            <span>Organisation Admin Console</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock size={13} />
            <span>Scheduled for {info.phase}</span>
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#0A1F36]">
          {info.title}
        </h1>
        <p className="mt-1 text-base text-muted">{info.subtitle}</p>

        <p className="mt-5 text-sm leading-relaxed text-[#2D3F50] max-w-2xl">
          {info.description}
        </p>

        {/* Feature Preview List */}
        {info.features.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[#DDE5EE] bg-white p-6">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A1F36]">
              <Sparkles size={15} className="text-brand" />
              Planned Capabilities
            </h2>
            <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {info.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-[#2D3F50]">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand font-bold text-[10px]">
                    ✓
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation Shortcut to Active Phase 1 Knowledge Base */}
        <div className="mt-8 flex flex-wrap items-center gap-3 pt-6 border-t border-line">
          <Link
            to="/knowledge-base"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-strong transition shadow-xs"
          >
            <BookOpen size={15} />
            Open Knowledge Base (Active Phase 1)
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-semibold text-[#0A1F36] hover:bg-canvas transition"
          >
            <ArrowLeft size={15} />
            Back to Overview
          </Link>
        </div>
      </div>
    </div>
  )
}
