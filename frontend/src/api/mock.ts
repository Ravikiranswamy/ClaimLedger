// Development-only mock backend that mirrors the REAL API shapes. All data is synthetic (Nexora).
// Delete this file and set VITE_USE_MOCK=false to use the live backend.
import type { ActionType, AuditEntry, Claim, Evidence, KnowledgeDoc, LoginResponse, Submission, User } from '../types'
import { DEPARTMENTS } from '../types'
import { ApiError, type Api } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const [MKT, SALES] = [DEPARTMENTS[0], DEPARTMENTS[1]]

const USERS: (User & { password: string })[] = [
  { id: 'u1', fullName: 'Asha Rao', email: 'admin@nexora.com', role: 'ADMIN', departmentId: null, password: 'Demo@1234' },
  { id: 'u2', fullName: 'Kiran Mehta', email: 'creator@nexora.com', role: 'CREATOR', departmentId: MKT.id, password: 'Demo@1234' },
  { id: 'u3', fullName: 'Priya Nair', email: 'manager@nexora.com', role: 'DEPT_MANAGER', departmentId: MKT.id, password: 'Demo@1234' },
  { id: 'u4', fullName: 'Dev Sharma', email: 'reviewer@nexora.com', role: 'REVIEWER', departmentId: null, password: 'Demo@1234' },
  { id: 'u5', fullName: 'Ravikiran Swamy', email: 'ravikiranswamy550@gmail.com', role: 'ADMIN', departmentId: null, password: 'Demo@1234' },
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

let MOCK_DOCS: KnowledgeDoc[] = [
  { id: 'dc000003-0000-0000-0000-000000000003', name: 'Product_Master_Catalogue_v4.2.pdf', category: 'PRODUCTS', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_1' as const, version: '4.2', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', effectiveDate: '2026-11-01', expiryDate: '2027-10-31', chunkCount: 3, createdAt: new Date().toISOString() },
  { id: 'dc000004-0000-0000-0000-000000000004', name: 'Brand_Guidelines_v2.pdf', category: 'BRAND', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_1' as const, version: '2.0', productScope: 'ALL', region: 'GLOBAL', channel: 'ALL', effectiveDate: '2026-06-01', expiryDate: '2027-06-30', chunkCount: 2, createdAt: new Date().toISOString() },
  { id: 'dc000002-0000-0000-0000-000000000002', name: 'Nexora_Sales_Proposal_v2.pdf', category: 'DEPARTMENTAL', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_2' as const, version: '2.1', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', chunkCount: 2, createdAt: new Date().toISOString() },
  { id: 'dc000001-0000-0000-0000-000000000001', name: 'Nexora_Old_Brochure_v1.pdf', category: 'ASSETS', approvalStatus: 'SUPERSEDED' as const, authorityTier: 'TIER_3' as const, version: '1.0', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', effectiveDate: '2025-01-01', expiryDate: '2026-06-30', chunkCount: 1, createdAt: new Date().toISOString() },
]

export const mockApi: Api = {
  async login(email, password): Promise<LoginResponse> {
    await wait(350)
    const cleanEmail = email.trim().toLowerCase()
    const resolvedEmail = cleanEmail.endsWith('@claimledger.dev')
      ? cleanEmail.replace('@claimledger.dev', '@nexora.com')
      : cleanEmail

    let u = USERS.find((x) => x.email === resolvedEmail)
    if (u) {
      // Demo accounts accept Demo@1234 or their password; owner account accepts any password
      if (u.email === 'ravikiranswamy550@gmail.com' || u.password === password || password === 'Demo@1234') {
        currentUserId = u.id
        return { token: `mock-${u.id}`, tokenType: 'Bearer', user: strip(u) }
      }
    } else {
      // Auto-onboard any custom work email so users can test with their own credentials!
      const name = resolvedEmail.split('@')[0].replace(/[._-]/g, ' ')
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1)
      u = {
        id: `u-${seq++}`,
        fullName: formattedName,
        email: cleanEmail,
        role: 'ADMIN',
        departmentId: null,
        password: password,
      }
      USERS.push(u)
      currentUserId = u.id
      return { token: `mock-${u.id}`, tokenType: 'Bearer', user: strip(u) }
    }
    throw new ApiError('Invalid email or password.', 401)
  },
  async me() { await wait(150); return me() },
  createTextSubmission: ({ title, content, departmentId }) => create(title, content, 'TEXT', departmentId),
  createPdfSubmission: ({ title, departmentId }) =>
    create(title, 'Great news! Nexora Pro is now available at ₹799 per month. It is the fastest platform around.', 'PDF', departmentId),
  async getSubmission(id) {
    await wait(150)
    const user = me()
    const s = subs.get(id)
    if (!s) throw new ApiError('Submission not found', 404)
    if (user.role === 'CREATOR' && s.submittedBy !== user.id) {
      throw new ApiError('Creators are only permitted to access their own submissions.', 403)
    }
    return structuredClone(s)
  },
  async listSubmissions() {
    await wait(200)
    const user = me()
    const all = [...subs.values()].reverse()
    let visible = all
    if (user.role === 'CREATOR') {
      visible = all.filter((s) => s.submittedBy === user.id)
    } else if (user.role !== 'ADMIN' && user.role !== 'REVIEWER') {
      visible = all.filter((s) => s.departmentId === user.departmentId)
    }
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
    if (user.role === 'CREATOR' && s.submittedBy !== user.id) {
      throw new ApiError('Creators are only permitted to revise their own submissions.', 403)
    }
    const { claims, status } = analyse(content)
    Object.assign(s, { content, claims, status, revisionNumber: s.revisionNumber + 1, updatedAt: new Date().toISOString() })
    log(id, user, 'CREATOR_REVISED', comment || 'Content revised')
    log(id, { ...user, fullName: 'System', email: '', role: 'ADMIN' }, 'ANALYZED', `${claims.length} claim(s) checked`)
    return structuredClone(s)
  },
  async getAudit(id) {
    await wait(150)
    const user = me()
    const s = subs.get(id)
    if (user.role === 'CREATOR' && s && s.submittedBy !== user.id) {
      throw new ApiError('Creators are only permitted to access their own audit history.', 403)
    }
    return structuredClone(audits.get(id) ?? [])
  },
  async listGlobalAudit() {
    await wait(150)
    const user = me()
    const all: AuditEntry[] = []
    audits.forEach((list, subId) => {
      const sub = subs.get(subId)
      if (user.role === 'CREATOR' && sub && sub.submittedBy !== user.id) {
        return
      }
      all.push(...list)
    })
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
  async listDocuments(filters?: { departmentId?: string; status?: string; tier?: string; category?: string }) {
    await wait(200)
    let res = [...MOCK_DOCS]
    if (filters?.category) {
      res = res.filter((d) => d.category === filters.category)
    }
    if (filters?.status) {
      res = res.filter((d) => d.approvalStatus === filters.status)
    }
    if (filters?.tier) {
      res = res.filter((d) => d.authorityTier === filters.tier)
    }
    return res
  },
  async getDocumentChunks(id) {
    await wait(150)
    return [
      { id: `${id}-c1`, documentId: id, chunkIndex: 0, content: 'Nexora Pro delivers 99.99% uptime with enterprise governance.', pageNumber: 1, hasEmbedding: true },
      { id: `${id}-c2`, documentId: id, chunkIndex: 1, content: 'Nexora Pro costs ₹999 per user per month billed annually.', pageNumber: 2, hasEmbedding: true },
    ]
  },
  async uploadDocument(formData: FormData) {
    await wait(500)
    const name = (formData.get('name') as string) || 'New_Document.pdf'
    const category = (formData.get('category') as any) || 'BRAND'
    const authorityTier = (formData.get('authorityTier') as any) || 'TIER_2'
    const doc: KnowledgeDoc = {
      id: `kd-${Date.now()}`,
      name,
      category,
      approvalStatus: 'APPROVED',
      authorityTier,
      version: (formData.get('version') as string) || 'v1.0',
      productScope: (formData.get('productScope') as string) || 'ALL',
      region: (formData.get('region') as string) || 'GLOBAL',
      channel: (formData.get('channel') as string) || 'ALL',
      chunkCount: 2,
      createdAt: new Date().toISOString(),
    }
    MOCK_DOCS.unshift(doc)
    return structuredClone(doc)
  },
  async updateDocumentStatus(id, status) {
    await wait(200)
    const doc = MOCK_DOCS.find((d) => d.id === id)
    if (doc) {
      doc.approvalStatus = status as any
      return structuredClone(doc)
    }
    return { id, name: 'Document.pdf', approvalStatus: status as any, authorityTier: 'TIER_2' as const, version: 'v1.0', chunkCount: 1, createdAt: new Date().toISOString() }
  },
  async updateDocumentAuthority(id, req) {
    await wait(200)
    const doc = MOCK_DOCS.find((d) => d.id === id)
    if (doc) {
      if (req.authorityTier) doc.authorityTier = req.authorityTier as any
      if (req.departmentId !== undefined) doc.departmentId = req.departmentId
      if (req.productScope !== undefined) doc.productScope = req.productScope
      if (req.category !== undefined) doc.category = req.category as any
      if (req.version !== undefined) doc.version = req.version
      if (req.effectiveDate !== undefined) doc.effectiveDate = req.effectiveDate
      if (req.expiryDate !== undefined) doc.expiryDate = req.expiryDate
      if (req.region !== undefined) doc.region = req.region
      if (req.channel !== undefined) doc.channel = req.channel
      return structuredClone(doc)
    }
    return { id, name: 'Document.pdf', approvalStatus: 'APPROVED' as const, authorityTier: (req.authorityTier as any) || 'TIER_1', version: 'v1.0', chunkCount: 1, createdAt: new Date().toISOString() }
  },
  async supersedeDocument(oldDocId, _supersededByDocId) {
    await wait(200)
    const oldDoc = MOCK_DOCS.find((d) => d.id === oldDocId)
    if (oldDoc) {
      oldDoc.approvalStatus = 'SUPERSEDED'
      return structuredClone(oldDoc)
    }
    return { id: oldDocId, name: 'Document.pdf', approvalStatus: 'SUPERSEDED' as const, authorityTier: 'TIER_3' as const, version: 'v1.0', chunkCount: 1, createdAt: new Date().toISOString() }
  },
}
