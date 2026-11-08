// Development-only mock backend that mirrors the REAL API shapes. All data is synthetic (Nexora).
// Delete this file and set VITE_USE_MOCK=false to use the live backend.
import type { AuditEntry, Claim, Evidence, LoginResponse, Submission, User, ActionType } from '../types'
import { DEPARTMENTS } from '../types'
import { ApiError, type Api } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const [MKT, SALES] = [DEPARTMENTS[0], DEPARTMENTS[1]]

const USERS: (User & { password: string })[] = [
  { id: 'u1', fullName: 'Asha Rao', email: 'admin@nexora.com', role: 'ADMIN', departmentId: null, password: 'Demo@1234' },
  { id: 'u2', fullName: 'Kiran Mehta', email: 'creator@nexora.com', role: 'CREATOR', departmentId: MKT.id, password: 'Demo@1234' },
  { id: 'u3', fullName: 'Priya Nair', email: 'manager@nexora.com', role: 'DEPT_MANAGER', departmentId: MKT.id, password: 'Demo@1234' },
  { id: 'u4', fullName: 'Dev Sharma', email: 'reviewer@nexora.com', role: 'REVIEWER', departmentId: null, password: 'Demo@1234' },
]

let currentUserId: string | null = null
let seq = 100
const subs = new Map<string, Submission>()
const audits = new Map<string, AuditEntry[]>()

const strip = ({ password, ...u }: User & { password: string }): User => { void password; return u }
const deptName = (id?: string | null) => DEPARTMENTS.find((d) => d.id === id)?.name ?? null

function log(id: string, actor: User, action: ActionType, comment?: string) {
  const list = audits.get(id) ?? []
  list.push({ id: `a${seq++}`, submissionId: id, actorName: actor.fullName, actorEmail: actor.email, actorRole: actor.role, action, comment, createdAt: new Date().toISOString() })
  audits.set(id, list)
}

function evidenceFor(claimId: string): Evidence[] {
  return [
    { id: `${claimId}-e1`, documentName: 'Product_Master_Catalog_v4.2.pdf', authorityTier: 'TIER_1', authoritative: true, pageNumber: 3,
      excerpt: 'Nexora Pro — ₹999 per user per month, billed annually. Effective 1 Jan 2026.' },
    { id: `${claimId}-e2`, documentName: 'Nexora_Sales_Proposal_v2.pdf', authorityTier: 'TIER_2', authoritative: false, pageNumber: 2,
      excerpt: 'Special proposal price for the Acme deal: ₹899 per user per month.' },
    { id: `${claimId}-e3`, documentName: 'Nexora_Old_Brochure_v1.pdf', authorityTier: 'TIER_3', authoritative: false, pageNumber: 1,
      excerpt: 'Nexora Pro starts at ₹799 per month. (Superseded)' },
  ]
}

function analyse(content: string): { claims: Claim[]; status: Submission['status'] } {
  const claims: Claim[] = []
  const price = /₹\s?(\d{3,4})(?:\s*(?:per|\/)\s*(?:user\s*)?(?:per\s*)?(?:month|mo))?/i.exec(content)
  if (price) {
    const ok = price[1] === '999'
    const id = `c${seq++}`
    claims.push({
      id, claimText: price[0], claimType: 'PRICE', verificationStatus: ok ? 'VERIFIED' : 'VIOLATION',
      explanation: ok ? 'Matches the current approved Nexora Pro price.' : `The approved Nexora Pro price is ₹999/month, not ₹${price[1]}.`,
      suggestedCorrection: ok ? null : '₹999 per month', aiConfidence: 0.97, evidence: evidenceFor(id),
    })
  }
  const fast = /\b(fastest|best|#1|number one|guaranteed)\b/i.exec(content)
  if (fast) {
    claims.push({
      id: `c${seq++}`, claimText: fast[0], claimType: 'PROMOTION', verificationStatus: 'UNVERIFIED',
      explanation: 'No approved source supports this superlative claim.', suggestedCorrection: null, aiConfidence: 0.71, evidence: [],
    })
  }
  const bad = claims.some((c) => c.verificationStatus !== 'VERIFIED')
  return { claims, status: bad ? 'FLAGGED' : 'VERIFIED' }
}

function me(): User {
  const stored = currentUserId ?? (() => { try { return localStorage.getItem('claimledger.token')?.replace('mock-', '') ?? null } catch { return null } })()
  const u = USERS.find((x) => x.id === stored)
  if (!u) throw new ApiError('Please sign in again.', 401)
  currentUserId = u.id
  return strip(u)
}

async function create(title: string, content: string, type: 'TEXT' | 'PDF', departmentId?: string): Promise<Submission> {
  const user = me()
  await wait(2400) // analysis is synchronous on the real backend, so creation takes a moment
  const id = `sub-${seq++}`
  const dep = departmentId ?? user.departmentId ?? SALES.id
  const { claims, status } = analyse(content)
  const s: Submission = {
    id, title, content, contentType: type, departmentId: dep, departmentName: deptName(dep), submittedBy: user.id,
    submittedByName: user.fullName, status, revisionNumber: 1, createdAt: new Date().toISOString(), claims,
  }
  subs.set(id, s)
  log(id, user, 'SUBMITTED', 'Initial submission created')
  log(id, { ...user, fullName: 'System', email: '', role: 'ADMIN' }, 'ANALYZED', `${claims.length} claim(s) checked`)
  return structuredClone(s)
}

export const mockApi: Api = {
  async login(email, password): Promise<LoginResponse> {
    await wait(350)
    const u = USERS.find((x) => x.email === email.trim().toLowerCase() && x.password === password)
    if (!u) throw new ApiError('Invalid email or password.', 401)
    currentUserId = u.id
    return { token: `mock-${u.id}`, tokenType: 'Bearer', user: strip(u) }
  },
  async me() { await wait(150); return me() },
  createTextSubmission: ({ title, content, departmentId }) => create(title, content, 'TEXT', departmentId),
  createPdfSubmission: ({ title, departmentId }) =>
    create(title, 'Great news! Nexora Pro is now available at ₹799 per month. It is the fastest platform around.', 'PDF', departmentId),
  async getSubmission(id) {
    await wait(150)
    const s = subs.get(id)
    if (!s) throw new ApiError('Submission not found', 404)
    return structuredClone(s)
  },
  async listSubmissions() {
    await wait(200)
    const user = me()
    const all = [...subs.values()].reverse()
    const visible = user.role === 'ADMIN' || user.role === 'REVIEWER' ? all : all.filter((s) => s.departmentId === user.departmentId)
    return structuredClone(visible)
  },
  async reviewSubmission(id, action, comment) {
    await wait(300)
    const user = me()
    if (user.role === 'CREATOR') throw new ApiError('You do not have permission to do that.', 403)
    const s = subs.get(id)
    if (!s) throw new ApiError('Submission not found', 404)
    s.status = action === 'REVIEWER_APPROVED' ? 'APPROVED' : action === 'REVIEWER_REJECTED' ? 'REJECTED' : 'CHANGES_REQUESTED'
    s.updatedAt = new Date().toISOString()
    log(id, user, action, comment)
    return structuredClone(s)
  },
  async reviseSubmission(id, content, comment) {
    await wait(1800)
    const user = me()
    const s = subs.get(id)
    if (!s) throw new ApiError('Submission not found', 404)
    const { claims, status } = analyse(content)
    Object.assign(s, { content, claims, status, revisionNumber: s.revisionNumber + 1, updatedAt: new Date().toISOString() })
    log(id, user, 'CREATOR_REVISED', comment || 'Content revised')
    log(id, { ...user, fullName: 'System', email: '', role: 'ADMIN' }, 'ANALYZED', `${claims.length} claim(s) checked`)
    return structuredClone(s)
  },
  async getAudit(id) {
    await wait(150)
    return structuredClone(audits.get(id) ?? [])
  },
}
