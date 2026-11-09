// Development-only mock backend that mirrors the REAL API shapes. All data is synthetic (Nexora).
// Delete this file and set VITE_USE_MOCK=false to use the live backend.
import type { ActionType, AuditEntry, Claim, Evidence, GovernanceInsights, KnowledgeDoc, LoginResponse, Submission, User } from '../types'
import { DEPARTMENTS } from '../types'
import { ApiError, type Api } from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const [MKT, SALES] = [DEPARTMENTS[0], DEPARTMENTS[1]]

const USERS: (User & { password: string })[] = [
  { id: 'u1', fullName: 'Asha Rao', email: 'admin@nexora.com', role: 'ADMIN', departmentId: null, departmentName: null, isActive: true, canApproveKnowledge: true, createdAt: '2026-01-01T00:00:00Z', password: 'Demo@1234' },
  { id: 'u2', fullName: 'Kiran Mehta', email: 'creator@nexora.com', role: 'CREATOR', departmentId: MKT.id, departmentName: 'Marketing', isActive: true, canApproveKnowledge: false, createdAt: '2026-02-15T00:00:00Z', password: 'Demo@1234' },
  { id: 'u3', fullName: 'Priya Nair', email: 'manager@nexora.com', role: 'DEPT_MANAGER', departmentId: MKT.id, departmentName: 'Marketing', isActive: true, canApproveKnowledge: false, createdAt: '2026-01-20T00:00:00Z', password: 'Demo@1234' },
  { id: 'u4', fullName: 'Dev Sharma', email: 'reviewer@nexora.com', role: 'REVIEWER', departmentId: null, departmentName: null, isActive: true, canApproveKnowledge: true, createdAt: '2026-01-10T00:00:00Z', password: 'Demo@1234' },
  { id: 'u5', fullName: 'Ravikiran Swamy', email: 'ravikiranswamy550@gmail.com', role: 'ADMIN', departmentId: null, departmentName: null, isActive: true, canApproveKnowledge: true, createdAt: '2026-01-01T00:00:00Z', password: 'Demo@1234' },
]

let currentUserId: string | null = null
let seq = 100
const subs = new Map<string, Submission>()
const audits = new Map<string, AuditEntry[]>()

// Seed canonical Nexora submissions so Admin and Reviewers always have live data
const SEED_SUB_1_ID = '8a8c985f-f0a4-48d1-aab6-857df2933431'
const SEED_SUB_2_ID = '5cdb154d-26a7-4d37-af36-a742d37ac163'
const SEED_SUB_3_ID = 'a839d9ad-2758-4695-bd64-3ff3166953db'
const SEED_SUB_4_ID = 'b457e102-1234-4567-8901-abcdef123456'
const SEED_SUB_5_ID = 'c789f203-5678-4321-9876-fedcba654321'

subs.set(SEED_SUB_1_ID, {
  id: SEED_SUB_1_ID,
  title: 'Nexora Pro Q4 Promotional Campaign',
  content: 'Nexora Pro costs ₹999 per month and delivers 99.99% uptime with enterprise governance.',
  contentType: 'TEXT',
  departmentId: MKT.id,
  departmentName: 'Marketing',
  submittedBy: 'u2',
  submittedByName: 'Kiran Mehta',
  status: 'VERIFIED',
  revisionNumber: 1,
  createdAt: '2026-11-08T07:00:25Z',
  claims: [
    {
      id: 'c-seed-1',
      claimText: '₹999 per month',
      claimType: 'PRICE',
      verificationStatus: 'VERIFIED',
      explanation: 'Matches the current approved Nexora Pro price in Product Master Catalogue v4.2.',
      suggestedCorrection: null,
      aiConfidence: 0.98,
      evidence: evidenceFor('c-seed-1'),
    },
  ],
})

subs.set(SEED_SUB_2_ID, {
  id: SEED_SUB_2_ID,
  title: 'Nexora Pro Social Campaign Q4',
  content: 'Scale your organisation with Nexora Pro at ₹999 per month with full compliance.',
  contentType: 'TEXT',
  departmentId: MKT.id,
  departmentName: 'Marketing',
  submittedBy: 'u2',
  submittedByName: 'Kiran Mehta',
  status: 'APPROVED',
  revisionNumber: 2,
  createdAt: '2026-11-08T07:27:48Z',
  claims: [
    {
      id: 'c-seed-2',
      claimText: '₹999 per month',
      claimType: 'PRICE',
      verificationStatus: 'VERIFIED',
      explanation: 'Grounded in Tier 1 Product Master Catalogue.',
      suggestedCorrection: null,
      aiConfidence: 0.99,
      evidence: evidenceFor('c-seed-2'),
    },
  ],
})

subs.set(SEED_SUB_3_ID, {
  id: SEED_SUB_3_ID,
  title: 'Nexora Pro Q4 Price Validation Test',
  content: 'Great news! Nexora Pro starts at ₹799 per month. It is the fastest platform around.',
  contentType: 'TEXT',
  departmentId: MKT.id,
  departmentName: 'Marketing',
  submittedBy: 'u2',
  submittedByName: 'Kiran Mehta',
  status: 'FLAGGED',
  revisionNumber: 1,
  createdAt: '2026-11-08T07:03:56Z',
  claims: [
    {
      id: 'c-seed-3a',
      claimText: '₹799 per month',
      claimType: 'PRICE',
      verificationStatus: 'VIOLATION',
      explanation: 'The approved Nexora Pro price is ₹999/month in Product Master Catalogue v4.2 (Tier 1). The ₹799/month quote comes from an outdated superseded brochure (Tier 3).',
      suggestedCorrection: '₹999 per month',
      aiConfidence: 0.97,
      evidence: evidenceFor('c-seed-3a'),
    },
    {
      id: 'c-seed-3b',
      claimText: 'fastest',
      claimType: 'PROMOTION',
      verificationStatus: 'UNVERIFIED',
      explanation: 'No approved brand guideline or technical benchmark supports this superlative promotional statement.',
      suggestedCorrection: null,
      aiConfidence: 0.72,
      evidence: [],
    },
  ],
})

subs.set(SEED_SUB_4_ID, {
  id: SEED_SUB_4_ID,
  title: 'Nexora Enterprise Proposal – APAC Expansion',
  content: 'Nexora Enterprise is offered at ₹899 per user per month for regional sales teams.',
  contentType: 'TEXT',
  departmentId: SALES.id,
  departmentName: 'Sales',
  submittedBy: 'u2',
  submittedByName: 'Kiran Mehta',
  status: 'CHANGES_REQUESTED',
  revisionNumber: 1,
  createdAt: '2026-11-07T14:15:00Z',
  claims: [
    {
      id: 'c-seed-4',
      claimText: '₹899 per user per month',
      claimType: 'PRICE',
      verificationStatus: 'VIOLATION',
      explanation: 'Sales proposal Tier 2 reference does not override Master Tier 1 without executive exception approval.',
      suggestedCorrection: '₹999 per user per month',
      aiConfidence: 0.91,
      evidence: evidenceFor('c-seed-4'),
    },
  ],
})

subs.set(SEED_SUB_5_ID, {
  id: SEED_SUB_5_ID,
  title: 'Nexora Global Talent Acquisition Brochure',
  content: 'Nexora guarantees 100% remote compensation parity across all hiring regions worldwide.',
  contentType: 'TEXT',
  departmentId: DEPARTMENTS[2].id,
  departmentName: 'HR',
  submittedBy: 'u2',
  submittedByName: 'Kiran Mehta',
  status: 'REJECTED',
  revisionNumber: 1,
  createdAt: '2026-11-06T10:30:00Z',
  claims: [
    {
      id: 'c-seed-5',
      claimText: 'guarantees 100% remote compensation parity',
      claimType: 'FACTUAL',
      verificationStatus: 'VIOLATION',
      explanation: 'Directly violates Nexora Regional Compensation Policy v2.0 requiring cost-of-living adjustments.',
      suggestedCorrection: 'competitive, region-adjusted remote compensation',
      aiConfidence: 0.95,
      evidence: [],
    },
  ],
})

// Seed audit logs
audits.set(SEED_SUB_1_ID, [
  { id: 'a1', submissionId: SEED_SUB_1_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'SUBMITTED', comment: 'Initial campaign draft submitted for checking', createdAt: '2026-11-08T07:00:25Z' },
  { id: 'a2', submissionId: SEED_SUB_1_ID, actorName: 'ClaimLedger AI', actorEmail: 'system@claimledger.internal', actorRole: 'SYSTEM', action: 'ANALYZED', comment: '1 claim verified against Tier 1 Product Master Catalogue v4.2', createdAt: '2026-11-08T07:00:28Z' },
])

audits.set(SEED_SUB_2_ID, [
  { id: 'a3', submissionId: SEED_SUB_2_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'SUBMITTED', comment: 'Initial submission created', createdAt: '2026-11-08T06:30:00Z' },
  { id: 'a4', submissionId: SEED_SUB_2_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'CREATOR_REVISED', comment: 'Updated outdated price to ₹999 as recommended by evidence', createdAt: '2026-11-08T07:15:00Z' },
  { id: 'a5', submissionId: SEED_SUB_2_ID, actorName: 'Dev Sharma', actorEmail: 'reviewer@nexora.com', actorRole: 'REVIEWER', action: 'REVIEWER_APPROVED', comment: 'Verified against Master Catalogue v4.2. Approved for Q4 publication.', createdAt: '2026-11-08T07:27:48Z' },
])

audits.set(SEED_SUB_3_ID, [
  { id: 'a6', submissionId: SEED_SUB_3_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'SUBMITTED', comment: 'Test submission with outdated price', createdAt: '2026-11-08T07:03:56Z' },
  { id: 'a7', submissionId: SEED_SUB_3_ID, actorName: 'ClaimLedger AI', actorEmail: 'system@claimledger.internal', actorRole: 'SYSTEM', action: 'ANALYZED', comment: '2 claims checked: 1 VIOLATION, 1 UNVERIFIED', createdAt: '2026-11-08T07:04:00Z' },
])

audits.set(SEED_SUB_4_ID, [
  { id: 'a8', submissionId: SEED_SUB_4_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'SUBMITTED', comment: 'Enterprise proposal draft', createdAt: '2026-11-07T14:15:00Z' },
  { id: 'a9', submissionId: SEED_SUB_4_ID, actorName: 'Dev Sharma', actorEmail: 'reviewer@nexora.com', actorRole: 'REVIEWER', action: 'REVIEWER_CHANGES_REQUESTED', comment: 'Please attach executive exception approval for the ₹899 rate or revise to standard ₹999.', createdAt: '2026-11-07T15:00:00Z' },
])

audits.set(SEED_SUB_5_ID, [
  { id: 'a10', submissionId: SEED_SUB_5_ID, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'CREATOR', action: 'SUBMITTED', comment: 'Recruitment brochure copy', createdAt: '2026-11-06T10:30:00Z' },
  { id: 'a11', submissionId: SEED_SUB_5_ID, actorName: 'Dev Sharma', actorEmail: 'reviewer@nexora.com', actorRole: 'REVIEWER', action: 'REVIEWER_REJECTED', comment: 'Violates regional compensation policy. Cannot publish unapproved wage parity promises.', createdAt: '2026-11-06T11:20:00Z' },
])

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

const docAudits = new Map<string, AuditEntry[]>()

// Pre-seed document audit logs
docAudits.set('dc000005-0000-0000-0000-000000000005', [
  { id: 'da1', submissionId: undefined, actorName: 'Priya Menon', actorEmail: 'creator@nexora.com', actorRole: 'HR Specialist', action: 'KNOWLEDGE_UPLOADED', comment: 'Uploaded regional compensation addendum v1.2 for departmental review.', createdAt: '2026-11-07T11:00:00Z' },
])

docAudits.set('dc000006-0000-0000-0000-000000000006', [
  { id: 'da2', submissionId: undefined, actorName: 'Kiran Mehta', actorEmail: 'creator@nexora.com', actorRole: 'Marketing Copywriter', action: 'KNOWLEDGE_UPLOADED', comment: 'Uploaded Q4 social media copywriting guide for APAC campaigns.', createdAt: '2026-11-08T09:30:00Z' },
])

docAudits.set('dc000007-0000-0000-0000-000000000007', [
  { id: 'da3', submissionId: undefined, actorName: 'Rahul Verma', actorEmail: 'manager@nexora.com', actorRole: 'Sales Manager', action: 'KNOWLEDGE_UPLOADED', comment: 'Uploaded partner discount scheme copy.', createdAt: '2026-11-04T14:00:00Z' },
  { id: 'da4', submissionId: undefined, actorName: 'Arjun Sharma', actorEmail: 'admin@nexora.com', actorRole: 'ADMIN', action: 'KNOWLEDGE_WITHDRAWN', comment: 'Rejected by Admin: Contains outdated promotional discount rate conflicting with Tier 1 Master Catalogue pricing.', createdAt: '2026-11-06T16:20:00Z' },
])

const userAudits: AuditEntry[] = [
  {
    id: 'ua1',
    actorName: 'Asha Rao',
    actorEmail: 'admin@nexora.com',
    actorRole: 'ADMIN',
    action: 'USER_CREATED',
    resourceName: 'Priya Menon (creator@nexora.com)',
    departmentName: 'HR',
    comment: 'Invited new user Priya Menon with Content Creator role in HR department.',
    createdAt: '2026-11-06T09:15:00Z',
  },
  {
    id: 'ua2',
    actorName: 'Asha Rao',
    actorEmail: 'admin@nexora.com',
    actorRole: 'ADMIN',
    action: 'USER_UPDATED',
    resourceName: 'Dev Sharma (reviewer@nexora.com)',
    departmentName: 'Marketing',
    comment: 'Granted Knowledge Approver authority permission.',
    createdAt: '2026-11-07T10:00:00Z',
  },
  {
    id: 'ua3',
    actorName: 'Asha Rao',
    actorEmail: 'admin@nexora.com',
    actorRole: 'ADMIN',
    action: 'USER_STATUS_TOGGLED',
    resourceName: 'Rahul Verma (manager@nexora.com)',
    departmentName: 'Sales',
    comment: 'User account status set to ACTIVE.',
    createdAt: '2026-11-07T14:30:00Z',
  },
]

let MOCK_DOCS: KnowledgeDoc[] = [
  { id: 'dc000005-0000-0000-0000-000000000005', name: 'Nexora_Regional_Compensation_Addendum_2026.pdf', category: 'DEPARTMENTAL', approvalStatus: 'DRAFT' as const, authorityTier: 'TIER_2' as const, version: '1.2', productScope: 'HR & Compensation', region: 'GLOBAL', channel: 'INTERNAL', departmentId: DEPARTMENTS[2].id, departmentName: 'HR', effectiveDate: '2026-11-01', expiryDate: '2027-10-31', uploadedBy: 'Priya Menon', chunkCount: 2, createdAt: '2026-11-07T11:00:00Z' },
  { id: 'dc000006-0000-0000-0000-000000000006', name: 'Nexora_Q4_Social_Media_Copywriting_Kit.pdf', category: 'BRAND', approvalStatus: 'DRAFT' as const, authorityTier: 'TIER_3' as const, version: '1.0', productScope: 'Nexora Pro', region: 'APAC', channel: 'SOCIAL', departmentId: MKT.id, departmentName: 'Marketing', effectiveDate: '2026-11-01', expiryDate: '2027-03-31', uploadedBy: 'Kiran Mehta', chunkCount: 1, createdAt: '2026-11-08T09:30:00Z' },
  { id: 'dc000007-0000-0000-0000-000000000007', name: 'Nexora_APAC_Promotional_Discount_Scheme_Outdated.pdf', category: 'ASSETS', approvalStatus: 'REJECTED' as const, authorityTier: 'TIER_3' as const, version: '0.9', productScope: 'Nexora Pro', region: 'APAC', channel: 'PARTNER', departmentId: SALES.id, departmentName: 'Sales', effectiveDate: '2025-06-01', expiryDate: '2025-12-31', uploadedBy: 'Rahul Verma', chunkCount: 1, createdAt: '2026-11-04T14:00:00Z' },
  { id: 'dc000003-0000-0000-0000-000000000003', name: 'Product_Master_Catalogue_v4.2.pdf', category: 'PRODUCTS', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_1' as const, version: '4.2', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', departmentId: SALES.id, departmentName: 'Sales', effectiveDate: '2026-11-01', expiryDate: '2027-10-31', uploadedBy: 'Arjun Sharma', chunkCount: 3, createdAt: '2026-11-01T08:00:00Z' },
  { id: 'dc000004-0000-0000-0000-000000000004', name: 'Brand_Guidelines_v2.pdf', category: 'BRAND', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_1' as const, version: '2.0', productScope: 'ALL', region: 'GLOBAL', channel: 'ALL', departmentId: MKT.id, departmentName: 'Marketing', effectiveDate: '2026-06-01', expiryDate: '2027-06-30', uploadedBy: 'Arjun Sharma', chunkCount: 2, createdAt: '2026-06-01T10:00:00Z' },
  { id: 'dc000002-0000-0000-0000-000000000002', name: 'Nexora_Sales_Proposal_v2.pdf', category: 'DEPARTMENTAL', approvalStatus: 'APPROVED' as const, authorityTier: 'TIER_2' as const, version: '2.1', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', departmentId: SALES.id, departmentName: 'Sales', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', uploadedBy: 'Rahul Verma', chunkCount: 2, createdAt: '2026-01-15T12:00:00Z' },
  { id: 'dc000001-0000-0000-0000-000000000001', name: 'Nexora_Old_Brochure_v1.pdf', category: 'ASSETS', approvalStatus: 'SUPERSEDED' as const, authorityTier: 'TIER_3' as const, version: '1.0', productScope: 'Nexora Pro', region: 'GLOBAL', channel: 'ALL', departmentId: MKT.id, departmentName: 'Marketing', effectiveDate: '2025-01-01', expiryDate: '2026-06-30', uploadedBy: 'Kiran Mehta', chunkCount: 1, createdAt: '2025-01-01T09:00:00Z' },
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

    // 1. Content & Submissions audit actions
    audits.forEach((list, subId) => {
      const sub = subs.get(subId)
      if (user.role === 'CREATOR' && sub && sub.submittedBy !== user.id) {
        return
      }
      list.forEach((entry) => {
        all.push({
          ...entry,
          resourceName: sub?.title ?? 'Content Submission',
          departmentName: sub?.departmentName ?? 'Marketing',
        })
      })
    })

    // 2. Knowledge Document governance audit actions (for Admins, Reviewers, Managers)
    if (user.role !== 'CREATOR') {
      docAudits.forEach((list, docId) => {
        const doc = MOCK_DOCS.find((d) => d.id === docId)
        list.forEach((entry) => {
          all.push({
            ...entry,
            documentId: docId,
            resourceName: doc?.name ?? 'Knowledge Document',
            departmentName: doc?.departmentName ?? 'Organisation-wide',
          })
        })
      })

      // 3. User & Permission audit actions
      all.push(...userAudits)
    }

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
    if (id === 'dc000005-0000-0000-0000-000000000005') {
      return [
        { id: `${id}-c1`, documentId: id, chunkIndex: 0, content: 'Nexora Regional Remote Work and Compensation Addendum (2026): Base salaries are calibrated according to local economic tier indices. Remote employees in Tier A metro locations receive benchmark compensation, while satellite regional roles are subject to approved geographic parity factors.', pageNumber: 1, hasEmbedding: true },
        { id: `${id}-c2`, documentId: id, chunkIndex: 1, content: 'Mandatory Adjustment Clauses: Compensation bands must reflect documented cost-of-living differentials approved by the executive remuneration committee.', pageNumber: 2, hasEmbedding: true },
      ]
    }
    if (id === 'dc000006-0000-0000-0000-000000000006') {
      return [
        { id: `${id}-c1`, documentId: id, chunkIndex: 0, content: 'Nexora Q4 Social Media & APAC Influencer Copywriting Guide: For short-form social posts, refer to Nexora Pro as an enterprise AI governance engine. Any mention of price must state the official ₹999/month rate.', pageNumber: 1, hasEmbedding: true },
      ]
    }
    if (id === 'dc000007-0000-0000-0000-000000000007') {
      return [
        { id: `${id}-c1`, documentId: id, chunkIndex: 0, content: 'Nexora APAC Promotional Partner Discount Scheme (2025 - Outdated): Regional resellers may quote an introductory discounted tier of ₹699/user/month upon executive signoff.', pageNumber: 1, hasEmbedding: true },
      ]
    }
    return [
      { id: `${id}-c1`, documentId: id, chunkIndex: 0, content: 'Nexora Pro delivers 99.99% uptime with enterprise governance.', pageNumber: 1, hasEmbedding: true },
      { id: `${id}-c2`, documentId: id, chunkIndex: 1, content: 'Nexora Pro costs ₹999 per user per month billed annually as certified in Product Master Catalogue v4.2.', pageNumber: 2, hasEmbedding: true },
    ]
  },
  async getDocumentAudit(id) {
    await wait(150)
    return docAudits.get(id) ?? [
      {
        id: `aud-${id}`,
        actorName: 'Arjun Sharma',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: 'KNOWLEDGE_UPLOADED',
        comment: 'Initial document upload and indexing.',
        createdAt: new Date().toISOString(),
      },
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
  async updateDocumentStatus(id, status, reason) {
    await wait(200)
    const doc = MOCK_DOCS.find((d) => d.id === id)
    if (doc) {
      const prevStatus = doc.approvalStatus
      doc.approvalStatus = status as any

      // Record audit
      const list = docAudits.get(id) ?? []
      list.push({
        id: `aud-${Date.now()}`,
        actorName: 'Asha Rao',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: status === 'APPROVED' ? 'KNOWLEDGE_APPROVED' : status === 'SUPERSEDED' ? 'KNOWLEDGE_SUPERSEDED' : 'KNOWLEDGE_WITHDRAWN',
        comment: reason || `Document status changed from ${prevStatus} to ${status}.`,
        createdAt: new Date().toISOString(),
      })
      docAudits.set(id, list)

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

      const list = docAudits.get(id) ?? []
      list.push({
        id: `aud-${Date.now()}`,
        actorName: 'Asha Rao',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: 'KNOWLEDGE_TIER_CHANGED',
        comment: `Updated authority tier to ${req.authorityTier || doc.authorityTier} and scope parameters.`,
        createdAt: new Date().toISOString(),
      })
      docAudits.set(id, list)

      return structuredClone(doc)
    }
    return { id, name: 'Document.pdf', approvalStatus: 'APPROVED' as const, authorityTier: (req.authorityTier as any) || 'TIER_1', version: 'v1.0', chunkCount: 1, createdAt: new Date().toISOString() }
  },
  async supersedeDocument(oldDocId, supersededByDocId) {
    await wait(200)
    const oldDoc = MOCK_DOCS.find((d) => d.id === oldDocId)
    const newDoc = MOCK_DOCS.find((d) => d.id === supersededByDocId)
    if (oldDoc) {
      oldDoc.approvalStatus = 'SUPERSEDED'
      const list = docAudits.get(oldDocId) ?? []
      list.push({
        id: `aud-${Date.now()}`,
        actorName: 'Asha Rao',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: 'KNOWLEDGE_SUPERSEDED',
        comment: `Superseded by active version '${newDoc?.name ?? supersededByDocId}' (${newDoc?.version ?? 'new'}).`,
        createdAt: new Date().toISOString(),
      })
      docAudits.set(oldDocId, list)
      return structuredClone(oldDoc)
    }
    return { id: oldDocId, name: 'Document.pdf', approvalStatus: 'SUPERSEDED' as const, authorityTier: 'TIER_3' as const, version: 'v1.0', chunkCount: 1, createdAt: new Date().toISOString() }
  },
  async listUsers() {
    await wait(200)
    return USERS.map(strip)
  },
  async createUser(req) {
    await wait(350)
    const newUser: User & { password: string } = {
      id: `u-${seq++}`,
      email: req.email.trim().toLowerCase(),
      fullName: req.fullName,
      role: req.role as any,
      departmentId: req.departmentId ?? null,
      departmentName: deptName(req.departmentId),
      isActive: true,
      canApproveKnowledge: req.canApproveKnowledge ?? (req.role === 'ADMIN'),
      createdAt: new Date().toISOString(),
      password: 'Demo@1234',
    }
    USERS.push(newUser)
    userAudits.push({
      id: `ua-${Date.now()}`,
      actorName: 'Asha Rao',
      actorEmail: 'admin@nexora.com',
      actorRole: 'ADMIN',
      action: 'USER_CREATED',
      resourceName: `${newUser.fullName} (${newUser.email})`,
      departmentName: newUser.departmentName ?? 'Organisation-wide',
      comment: `Created user ${newUser.fullName} with ${newUser.role} role.`,
      createdAt: new Date().toISOString(),
    })
    return strip(newUser)
  },
  async updateUser(id, req) {
    await wait(250)
    const u = USERS.find((x) => x.id === id)
    if (u) {
      if (req.role) u.role = req.role as any
      if (req.departmentId !== undefined) {
        u.departmentId = req.departmentId
        u.departmentName = deptName(req.departmentId)
      }
      if (req.isActive !== undefined) u.isActive = req.isActive
      if (req.canApproveKnowledge !== undefined) u.canApproveKnowledge = req.canApproveKnowledge

      userAudits.push({
        id: `ua-${Date.now()}`,
        actorName: 'Asha Rao',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: 'USER_UPDATED',
        resourceName: `${u.fullName} (${u.email})`,
        departmentName: u.departmentName ?? 'Organisation-wide',
        comment: `Updated user permissions (Role: ${u.role}, Knowledge Approver: ${u.canApproveKnowledge}).`,
        createdAt: new Date().toISOString(),
      })

      return strip(u)
    }
    throw new ApiError('User not found', 404)
  },
  async toggleUserStatus(id) {
    await wait(200)
    const u = USERS.find((x) => x.id === id)
    if (u) {
      u.isActive = !u.isActive
      userAudits.push({
        id: `ua-${Date.now()}`,
        actorName: 'Asha Rao',
        actorEmail: 'admin@nexora.com',
        actorRole: 'ADMIN',
        action: 'USER_STATUS_TOGGLED',
        resourceName: `${u.fullName} (${u.email})`,
        departmentName: u.departmentName ?? 'Organisation-wide',
        comment: `User account status set to ${u.isActive ? 'ACTIVE' : 'SUSPENDED'}.`,
        createdAt: new Date().toISOString(),
      })
      return strip(u)
    }
    throw new ApiError('User not found', 404)
  },
  async getInsights(filters) {
    await wait(200)
    const allSubs = Array.from(subs.values())
    const filteredSubs = filters?.departmentId
      ? allSubs.filter((s) => s.departmentId === filters.departmentId)
      : allSubs

    const allClaims = filteredSubs.flatMap((s) => s.claims ?? [])
    const totalClaims = allClaims.length
    const verifiedClaims = allClaims.filter((c) => c.verificationStatus === 'VERIFIED').length
    const violationClaims = allClaims.filter((c) => c.verificationStatus === 'VIOLATION').length
    const unverifiedClaims = allClaims.filter((c) => c.verificationStatus === 'UNVERIFIED').length
    const conflictClaims = allClaims.filter((c) => c.verificationStatus === 'CONFLICT').length

    const flaggedSubmissions = filteredSubs.filter(
      (s) => s.status === 'FLAGGED' || s.status === 'CHANGES_REQUESTED' || s.status === 'REJECTED'
    ).length
    const approvedSubmissions = filteredSubs.filter((s) => s.status === 'APPROVED').length

    const now = new Date()
    const sixtyDaysLater = new Date(Date.now() + 60 * 86400000)

    const activeDocs = MOCK_DOCS.filter((d) => d.approvalStatus === 'APPROVED').length
    const expiredDocs = MOCK_DOCS.filter(
      (d) => d.approvalStatus === 'EXPIRED' || (d.expiryDate && new Date(d.expiryDate) < now)
    ).length
    const expiringSoonDocs = MOCK_DOCS.filter(
      (d) =>
        d.approvalStatus === 'APPROVED' &&
        d.expiryDate &&
        new Date(d.expiryDate) >= now &&
        new Date(d.expiryDate) <= sixtyDaysLater
    ).length

    const complianceRate = totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 1000) / 10 : 100.0

    const totalIssues = violationClaims + unverifiedClaims + conflictClaims

    const priceClaims = allClaims.filter((c) => c.claimType === 'PRICE' && c.verificationStatus !== 'VERIFIED')
    const promoClaims = allClaims.filter((c) => c.claimType === 'PROMOTION' && c.verificationStatus !== 'VERIFIED')
    const factClaims = allClaims.filter((c) => c.claimType === 'FACTUAL' && c.verificationStatus !== 'VERIFIED')
    const termClaims = allClaims.filter((c) => c.claimType === 'TERMINOLOGY' && c.verificationStatus !== 'VERIFIED')

    const violationCategories: GovernanceInsights['violationCategories'] = [
      {
        category: 'PRICE',
        label: 'Pricing Inconsistencies',
        count: priceClaims.length,
        percentage: totalIssues > 0 ? Math.round((priceClaims.length / totalIssues) * 1000) / 10 : 50.0,
        severity: 'HIGH',
        description: 'Discrepancies against Tier 1 Master Product Catalogue (₹799/₹899 cited instead of ₹999).',
        sampleClaim: priceClaims[0]?.claimText ?? '₹799 per month',
      },
      {
        category: 'PROMOTION',
        label: 'Unsubstantiated Superlatives',
        count: promoClaims.length,
        percentage: totalIssues > 0 ? Math.round((promoClaims.length / totalIssues) * 1000) / 10 : 25.0,
        severity: 'MEDIUM',
        description: 'Subjective superlatives ("fastest", "#1") lacking authoritative benchmark citations.',
        sampleClaim: promoClaims[0]?.claimText ?? 'fastest platform around',
      },
      {
        category: 'FACTUAL',
        label: 'Policy Misalignment',
        count: factClaims.length,
        percentage: totalIssues > 0 ? Math.round((factClaims.length / totalIssues) * 1000) / 10 : 25.0,
        severity: 'HIGH',
        description: 'Factual assertions conflicting with internal HR or operational compensation guidelines.',
        sampleClaim: factClaims[0]?.claimText ?? 'guarantees 100% remote compensation parity',
      },
      {
        category: 'TERMINOLOGY',
        label: 'Brand Terminology Drift',
        count: termClaims.length,
        percentage: totalIssues > 0 ? Math.round((termClaims.length / totalIssues) * 1000) / 10 : 0.0,
        severity: 'LOW',
        description: 'Use of non-standard branding nomenclature or obsolete product trademarks.',
        sampleClaim: 'No active terminology drift recorded',
      },
    ]

    const departmentBreakdown: GovernanceInsights['departmentBreakdown'] = DEPARTMENTS.map((dept) => {
      const deptSubs = allSubs.filter((s) => s.departmentId === dept.id)
      const total = deptSubs.length
      const flagged = deptSubs.filter(
        (s) => s.status === 'FLAGGED' || s.status === 'CHANGES_REQUESTED' || s.status === 'REJECTED'
      ).length
      const approved = deptSubs.filter((s) => s.status === 'APPROVED').length
      const cleanRate = total > 0 ? Math.round(((total - flagged) / total) * 1000) / 10 : 100.0

      let friction = 'Low friction'
      if (dept.name === 'Sales') friction = 'Tier 2 discount proposal conflicts vs Master Catalog'
      else if (dept.name === 'Marketing') friction = 'Outdated price mentions (₹799) & unverified superlatives'
      else if (dept.name === 'HR') friction = 'Regional wage parity claims vs cost-of-living policy'

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalSubmissions: total,
        flaggedSubmissions: flagged,
        approvedSubmissions: approved,
        cleanRate,
        primaryFrictionPoint: friction,
      }
    })

    const complianceTrends: GovernanceInsights['complianceTrends'] = [
      { period: '4 Weeks Ago', verified: 2, flagged: 3, changesRequested: 2, approved: 1 },
      { period: '3 Weeks Ago', verified: 4, flagged: 2, changesRequested: 1, approved: 3 },
      { period: '2 Weeks Ago', verified: 5, flagged: 2, changesRequested: 2, approved: 4 },
      { period: 'Last Week', verified: 6, flagged: 1, changesRequested: 1, approved: 5 },
      {
        period: 'Current Week',
        verified: Math.max(verifiedClaims, 3),
        flagged: Math.max(flaggedSubmissions, 2),
        changesRequested: 1,
        approved: Math.max(approvedSubmissions, 2),
      },
    ]

    const repeatedIssues: GovernanceInsights['repeatedIssues'] = [
      {
        id: 'iss-1',
        issueTitle: 'Quoting Legacy ₹799 Subscription Rate',
        category: 'PRICE',
        occurrenceCount: 2,
        affectedDepartment: 'Marketing',
        rootCause: 'Creators relying on superseded 2025 brochures instead of Product Master Catalogue v4.2.',
        ruleReference: 'Product Master Catalogue v4.2 (Tier 1)',
      },
      {
        id: 'iss-2',
        issueTitle: 'Unqualified APAC Enterprise ₹899 Quote',
        category: 'PRICE',
        occurrenceCount: 1,
        affectedDepartment: 'Sales',
        rootCause: 'Using deal-specific proposal rates in general customer-facing communications without executive approval.',
        ruleReference: 'Nexora Sales Proposal v2.1 (Tier 2)',
      },
      {
        id: 'iss-3',
        issueTitle: 'Unsubstantiated "Fastest Platform" Superlative',
        category: 'PROMOTION',
        occurrenceCount: 1,
        affectedDepartment: 'Marketing',
        rootCause: 'Promotional superlatives included without embedding official technical benchmark whitepapers into ClaimLedger.',
        ruleReference: 'Brand Guidelines v2.0 (Tier 1)',
      },
      {
        id: 'iss-4',
        issueTitle: 'Worldwide Remote Parity Guarantee',
        category: 'FACTUAL',
        occurrenceCount: 1,
        affectedDepartment: 'HR',
        rootCause: 'Promising uniform wage parity that contradicts regional cost-of-living index bands.',
        ruleReference: 'Regional Compensation Addendum 2026 (Tier 2)',
      },
    ]

    const guidelineHealthIssues: GovernanceInsights['guidelineHealthIssues'] = [
      {
        id: 'gh-1',
        title: 'Pricing Contradiction: Tier 1 Master Catalogue vs Tier 2 Sales Proposal',
        issueType: 'CONFIRMED_CONFLICT',
        severity: 'HIGH',
        verificationNature: 'CONFIRMED_CONTRADICTION',
        description:
          'Product Master Catalogue v4.2 establishes ₹999/month as the authoritative price. However, Nexora Sales Proposal v2.1 lists ₹899/month without customer or deal qualification criteria.',
        documentNames: ['Product_Master_Catalogue_v4.2.pdf', 'Nexora_Sales_Proposal_v2.pdf'],
        conflictingExcerpts:
          'Master: "Nexora Pro — ₹999 per user per month, billed annually." vs Proposal: "Special proposal price: ₹899 per user per month."',
        affectedSubmissionsCount: 2,
        recommendedAction:
          'Add explicit deal-eligibility constraints to Sales Proposal v2.1 or supersede it with standard pricing.',
      },
      {
        id: 'gh-2',
        title: 'Remote Compensation Scope Ambiguity',
        issueType: 'POTENTIAL_AMBIGUITY',
        severity: 'MEDIUM',
        verificationNature: 'REQUIRES_HUMAN_REVIEW',
        description:
          'General talent guidelines encourage messaging around competitive global parity, whereas Regional Compensation Addendum mandates geographic index bands.',
        documentNames: ['Brand_Guidelines_v2.pdf', 'Nexora_Regional_Compensation_Addendum_2026.pdf'],
        conflictingExcerpts:
          'Brand Guide: "We offer equal competitive opportunities worldwide." vs Addendum: "Salaries are strictly adjusted according to regional index tiers."',
        affectedSubmissionsCount: 1,
        recommendedAction:
          'Clarify HR copy rules in Brand Guidelines to instruct creators to use "region-adjusted competitive compensation".',
      },
      {
        id: 'gh-3',
        title: 'Missing Knowledge: Benchmark Whitepaper for Speed & Uptime Claims',
        issueType: 'KNOWLEDGE_GAP',
        severity: 'MEDIUM',
        verificationNature: 'ACTION_REQUIRED',
        description:
          'Marketing copywriters frequently submit claims claiming "fastest platform" and "99.99% uptime", but no technical benchmark document has been uploaded or approved in the Knowledge Base.',
        documentNames: ['Brand_Guidelines_v2.pdf'],
        conflictingExcerpts:
          'Zero approved documents in the Knowledge Base contain latency, performance, or benchmark verification chunks.',
        affectedSubmissionsCount: 2,
        recommendedAction:
          'Upload and approve the Nexora 2026 Engineering Performance Benchmark Report in the Knowledge Base.',
      },
      {
        id: 'gh-4',
        title: 'Document Expiry Alert: Nexora Sales Proposal v2.1 Expiring',
        issueType: 'EXPIRING_DOCUMENT',
        severity: 'LOW',
        verificationNature: 'ACTION_REQUIRED',
        description:
          'Nexora Sales Proposal v2.1 has an effective end date of 31 Dec 2026 and will expire in the next cycle.',
        documentNames: ['Nexora_Sales_Proposal_v2.pdf'],
        conflictingExcerpts:
          'Expiry Date: 2026-12-31. Document will cease to be authoritative after this date.',
        affectedSubmissionsCount: 1,
        recommendedAction:
          'Review and extend the validity or prepare Nexora Sales Proposal v3.0 for 2027.',
      },
    ]

    const recommendations: GovernanceInsights['recommendations'] = [
      {
        id: 'rec-1',
        title: 'Enforce Strict Scope Criteria on Sales Proposal v2.1',
        priority: 'HIGH',
        category: 'PRICE',
        problem:
          'Sales reps and creators cite ₹899 from the sales proposal as general pricing, violating the ₹999 Tier 1 Master price.',
        supportingRecords: ['Product_Master_Catalogue_v4.2.pdf', 'Nexora_Sales_Proposal_v2.pdf', 'Sub: APAC Expansion Proposal'],
        whyItMatters:
          'Inconsistent external pricing creates customer confusion, damages brand credibility, and leads to unauthorized discount commitments.',
        recommendedAction:
          'Authorize a scope amendment in Approval Management restricting the ₹899 rate exclusively to deals > 500 seats with executive sign-off.',
        actionType: 'CLARIFY_RULE',
      },
      {
        id: 'rec-2',
        title: 'Upload Official Performance Benchmark Whitepaper',
        priority: 'MEDIUM',
        category: 'PROMOTION',
        problem:
          'Claims citing "fastest platform" are repeatedly flagged as UNVERIFIED due to a missing knowledge source.',
        supportingRecords: ['Sub: Nexora Pro Q4 Price Validation Test', 'Sub: Nexora Pro Q4 Promotional Campaign'],
        whyItMatters:
          'Promotional claims without authoritative citations risk regulatory scrutiny under consumer protection and misleading advertising laws.',
        recommendedAction:
          'Ingest and vectorize the engineering benchmark whitepaper into the Products or Brand category.',
        actionType: 'UPDATE_DOCUMENT',
      },
      {
        id: 'rec-3',
        title: 'Update Recruitment Marketing Copy Guidelines',
        priority: 'MEDIUM',
        category: 'HR_POLICY',
        problem:
          'Global Talent brochures promise blanket wage parity, conflicting with local cost-of-living policies.',
        supportingRecords: ['Nexora_Regional_Compensation_Addendum_2026.pdf', 'Sub: Global Talent Acquisition Brochure'],
        whyItMatters:
          'Over-promising compensation terms during recruitment causes contractual discrepancies and employee dissatisfaction.',
        recommendedAction:
          'Publish an explicit phrasebook in Brand Guidelines v2.0 defining permitted phrases like "region-adjusted competitive packages".',
        actionType: 'REVIEW_GUIDELINE',
      },
      {
        id: 'rec-4',
        title: 'Retire Superseded 2025 Brochures Across Storage',
        priority: 'LOW',
        category: 'LIFECYCLE',
        problem:
          'Older documents like Nexora_Old_Brochure_v1.pdf remain referenced by creators accustomed to legacy materials.',
        supportingRecords: ['Nexora_Old_Brochure_v1.pdf'],
        whyItMatters:
          'Legacy collateral causes repeated submissions to fail deterministic checks, increasing reviewer workload.',
        recommendedAction:
          'Confirm supersession in Knowledge Base and notify creators that v1.0 is no longer valid.',
        actionType: 'RENEW_DOCUMENT',
      },
    ]

    return {
      overview: {
        totalSubmissions: filteredSubs.length,
        flaggedSubmissions,
        approvedSubmissions,
        totalClaims,
        verifiedClaims,
        violationClaims,
        unverifiedClaims,
        conflictClaims,
        complianceRate,
        activeDocuments: activeDocs,
        expiredDocuments: expiredDocs,
        expiringSoonDocuments: expiringSoonDocs,
      },
      violationCategories,
      departmentBreakdown,
      complianceTrends,
      repeatedIssues,
      guidelineHealthIssues,
      recommendations,
    }
  },
}
