// Development-only mock backend. Delete this file (and set VITE_USE_MOCK=false)
// once the real Spring Boot API is connected. All data is synthetic (Nexora).
import type {
  AnalysisProgress,
  CreateSubmissionInput,
  Finding,
  LoginResponse,
  Source,
  Submission,
  User,
} from '../types'
import { ApiError, type Api } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const USERS: (User & { password: string })[] = [
  { id: 'u1', name: 'Asha Rao', email: 'admin@nexora.test', role: 'ADMIN', password: 'demo' },
  { id: 'u2', name: 'Kiran Mehta', email: 'creator@nexora.test', role: 'CREATOR', department: 'SALES', password: 'demo' },
  { id: 'u3', name: 'Priya Nair', email: 'manager@nexora.test', role: 'MANAGER', department: 'SALES', password: 'demo' },
  { id: 'u4', name: 'Dev Sharma', email: 'reviewer@nexora.test', role: 'REVIEWER', password: 'demo' },
]

const SOURCES: Record<string, Source> = {
  brochure: { id: 's1', name: 'Nexora_Brochure_2025.pdf', version: '1.0', status: 'SUPERSEDED', effectiveTo: '2025-12-31' },
  proposal: { id: 's2', name: 'Sales_Proposal_Template.docx', version: '2.1', status: 'APPROVED' },
  catalog: { id: 's3', name: 'Product_Master_Catalog_v4.2.pdf', version: '4.2', status: 'APPROVED', effectiveFrom: '2026-01-01' },
}

let currentUserId: string | null = null
let seq = 100
const submissions = new Map<string, Submission>()
const ANALYSIS_MS = 3600

function proposeProgress(createdAt: string): AnalysisProgress {
  const t = Date.now() - new Date(createdAt).getTime()
  const sourcesAvailable = Object.keys(SOURCES).length
  if (t < 1200) return { stage: 'EXTRACTING_CLAIMS', claimsFound: 0, claimsChecked: 0, sourcesAvailable }
  if (t < 2600) return { stage: 'CHECKING_SOURCES', claimsFound: 3, claimsChecked: 1, sourcesAvailable }
  if (t < ANALYSIS_MS) return { stage: 'PREPARING_FINDINGS', claimsFound: 3, claimsChecked: 3, sourcesAvailable }
  return { stage: 'DONE', claimsFound: 3, claimsChecked: 3, sourcesAvailable }
}

function view(s: Submission): Submission {
  if (s.status === 'ANALYZING') {
    const progress = proposeProgress(s.createdAt)
    if (progress.stage === 'DONE') {
      s.status = 'IN_REVIEW'
      s.progress = progress
    } else {
      s.progress = progress
    }
  }
  return { ...s }
}

function findingsFor(text: string): Finding[] {
  const price = /₹\s?(\d{3,4})/.exec(text)
  const out: Finding[] = []
  if (price) {
    const idx = price.index
    const submitted = price[1]
    const ok = submitted === '999'
    out.push({
      id: 'f1',
      claimText: price[0],
      span: [idx, idx + price[0].length],
      state: ok ? 'VERIFIED' : 'VIOLATION',
      message: ok
        ? 'Matches the approved Nexora Pro price.'
        : `Approved price is ₹999/month, not ₹${submitted}.`,
      authority: {
        winner: SOURCES.catalog,
        approvedValue: '₹999/month',
        considered: [
          { source: SOURCES.brochure, outcome: 'SUPERSEDED', value: '₹799', reason: 'Replaced by a newer approved catalogue.' },
          { source: SOURCES.proposal, outcome: 'SCOPED', value: '₹899', reason: 'Applies to one proposal only, not to general content.' },
          { source: SOURCES.catalog, outcome: 'AUTHORITATIVE', value: '₹999', reason: 'Current, approved and highest-ranked source.' },
        ],
      },
      suggestedFix: ok ? undefined : text.slice(idx, idx + price[0].length).replace(submitted, '999'),
    })
  }
  return out
}

export const mockApi: Api = {
  async login(email, password): Promise<LoginResponse> {
    await wait(350)
    const u = USERS.find((x) => x.email === email.trim().toLowerCase() && x.password === password)
    if (!u) throw new ApiError('Email or password is incorrect.', 401)
    currentUserId = u.id
    const { password: _pw, ...user } = u
    void _pw
    return { token: `mock-${u.id}`, user }
  },
  async me(): Promise<User> {
    await wait(150)
    const stored = currentUserId ?? (() => {
      try { return localStorage.getItem('claimledger.token')?.replace('mock-', '') ?? null } catch { return null }
    })()
    const u = USERS.find((x) => x.id === stored)
    if (!u) throw new ApiError('Please sign in again.', 401)
    currentUserId = u.id
    const { password: _pw, ...user } = u
    void _pw
    return user
  },
  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    await wait(400)
    const id = `sub-${seq++}`
    const sub: Submission = {
      id,
      title: input.title,
      department: input.department,
      status: 'ANALYZING',
      text: input.text ?? (input.file ? 'Nexora Pro is now available at ₹799 per month.' : ''),
      fileName: input.file?.name,
      createdBy: currentUserId ?? 'u2',
      createdAt: new Date().toISOString(),
      progress: { stage: 'EXTRACTING_CLAIMS', claimsFound: 0, claimsChecked: 0, sourcesAvailable: Object.keys(SOURCES).length },
    }
    submissions.set(id, sub)
    return { ...sub }
  },
  async getSubmission(id): Promise<Submission> {
    await wait(120)
    const s = submissions.get(id)
    if (!s) throw new ApiError('Submission not found.', 404)
    return view(s)
  },
  async getFindings(id): Promise<Finding[]> {
    await wait(150)
    const s = submissions.get(id)
    if (!s) throw new ApiError('Submission not found.', 404)
    return findingsFor(s.text ?? '')
  },
}
