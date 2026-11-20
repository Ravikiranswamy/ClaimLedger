// UI types. These mirror the REAL Spring Boot DTOs (backend/.../dto/*), not the earlier draft contract.

export type Role = 'ADMIN' | 'CREATOR' | 'DEPT_MANAGER' | 'REVIEWER'

/** Verification result for ONE claim. Never mix with SubmissionStatus. */
export type ClaimState = 'VERIFIED' | 'VIOLATION' | 'UNVERIFIED' | 'CONFLICT'

/** Workflow state of a whole submission. Never mix with ClaimState. */
export type SubmissionStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'FLAGGED'
  | 'VERIFIED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export type AuthorityTier = 'TIER_1' | 'TIER_2' | 'TIER_3'
export type DocumentCategory = 'BRAND' | 'PRODUCTS' | 'TERMINOLOGY' | 'ASSETS' | 'DEPARTMENTAL'
export type ClaimType = 'PRICE' | 'FEATURE' | 'PROMOTION' | 'TERMINOLOGY' | 'TONE' | 'FACTUAL' | 'VISUAL_BRAND' | 'OTHER'
export type ActionType =
  | 'SUBMITTED'
  | 'ANALYZED'
  | 'CREATOR_REVISED'
  | 'REVIEWER_APPROVED'
  | 'REVIEWER_CHANGES_REQUESTED'
  | 'REVIEWER_REJECTED'
  | 'KNOWLEDGE_UPLOADED'
  | 'KNOWLEDGE_APPROVED'
  | 'KNOWLEDGE_SUPERSEDED'
  | 'KNOWLEDGE_WITHDRAWN'
  | 'KNOWLEDGE_TIER_CHANGED'
  | 'KNOWLEDGE_SCOPE_CHANGED'
  | 'KNOWLEDGE_REPLACED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_STATUS_TOGGLED'
export type ReviewAction = Extract<ActionType, 'REVIEWER_APPROVED' | 'REVIEWER_CHANGES_REQUESTED' | 'REVIEWER_REJECTED'>

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  departmentId?: string | null
  departmentName?: string | null
  organisationId?: string
  isActive?: boolean
  canApproveKnowledge?: boolean
  createdAt?: string
}

export interface LoginResponse {
  token: string
  tokenType?: string
  user: User
}

export interface Evidence {
  id: string
  claimId?: string
  documentId?: string
  documentName: string
  excerpt?: string
  pageNumber?: number | null
  relevanceScore?: number | null
  /** Jackson serialises the Java `isAuthoritative` boolean as "authoritative"; accept both. */
  authoritative?: boolean
  isAuthoritative?: boolean
  authorityTier?: AuthorityTier | null
}

export interface Claim {
  id: string
  submissionId?: string
  claimText: string
  claimType?: ClaimType | null
  verificationStatus: ClaimState
  explanation?: string | null
  suggestedCorrection?: string | null
  aiConfidence?: number | null
  revisionNumber?: number
  evidence: Evidence[]
}

export type ContentType = 'TEXT' | 'PDF' | 'IMAGE'

export interface DominantColorDetail {
  hex: string
  deltaE: number
  nearestApprovedHex: string
  nearestApprovedName: string
  isApproved: boolean
}

export interface Submission {
  id: string
  title: string
  content: string
  creatorNotes?: string | null
  filePath?: string | null
  fileUrl?: string | null
  contentType?: ContentType
  departmentId?: string | null
  departmentName?: string | null
  organisationId?: string
  submittedBy?: string
  submittedByName?: string
  status: SubmissionStatus
  revisionNumber: number
  parentSubmissionId?: string | null
  createdAt: string
  updatedAt?: string
  claims: Claim[]
  campaignCode?: string | null
  visualColorDetails?: DominantColorDetail[]
}

export interface SubmissionRevision {
  id: string
  submissionId: string
  revisionNumber: number
  content?: string | null
  creatorNotes?: string | null
  filePath?: string | null
  contentType: ContentType
  totalClaims?: number
  verifiedClaims?: number
  violationClaims?: number
  unverifiedClaims?: number
  conflictClaims?: number
  revisionComment?: string | null
  createdAt: string
}

export interface TextDiffChunk {
  type: 'UNCHANGED' | 'ADDED' | 'REMOVED'
  text: string
}

export interface ClaimAttributeDiff {
  product: string
  attributeType: string
  attributeName: string
  previousValue?: string | null
  newValue?: string | null
  unit?: string | null
  billingPeriod?: string | null
  changeType: 'MODIFIED' | 'ADDED' | 'REMOVED' | 'UNCHANGED'
  reverificationRequired: boolean
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  previousStatus?: string | null
  newStatus?: string | null
}

export interface SemanticDiffResponse {
  submissionId: string
  fromRevision: number
  toRevision: number
  fromContent: string
  toContent: string
  fromCreatorNotes?: string | null
  toCreatorNotes?: string | null
  textDiff: TextDiffChunk[]
  claimDiffs: ClaimAttributeDiff[]
  totalClaimsChanged: number
  reverificationRequired: boolean
  diffSummary: string
}

export interface AuditEntry {
  id: string
  submissionId?: string
  documentId?: string
  actorId?: string
  actorName: string
  actorEmail?: string
  actorRole?: string
  action: ActionType
  resourceName?: string
  departmentName?: string
  comment?: string | null
  createdAt: string
}

export type ApprovalStatus = 'APPROVED' | 'SUPERSEDED' | 'DRAFT' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN'

export interface KnowledgeChunk {
  id: string
  documentId: string
  chunkIndex: number
  content: string
  pageNumber: number
  hasEmbedding: boolean
}

export interface KnowledgeDoc {
  id: string
  name: string
  filePath?: string | null
  departmentId?: string | null
  departmentName?: string | null
  organisationId?: string
  approvalStatus: ApprovalStatus
  authorityTier: AuthorityTier
  version: string
  category?: DocumentCategory | string
  effectiveDate?: string | null
  expiryDate?: string | null
  productScope?: string | null
  region?: string
  channel?: string
  uploadedBy?: string
  createdAt: string
  chunkCount: number
}

export const isAuthoritative = (e: Evidence) => !!(e.authoritative ?? e.isAuthoritative)

/** Seed department ids from the backend migration. Replace with a GET /departments call when one exists. */
export const DEPARTMENTS = [
  { id: 'd0000001-0000-0000-0000-000000000001', name: 'Marketing' },
  { id: 'd0000002-0000-0000-0000-000000000002', name: 'Sales' },
  { id: 'd0000003-0000-0000-0000-000000000003', name: 'HR' },
] as const

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  CREATOR: 'Content Creator',
  DEPT_MANAGER: 'DEPARTMENT MANAGER',
  REVIEWER: 'Authorised Reviewer',
}

export interface GovernanceOverview {
  totalSubmissions: number
  flaggedSubmissions: number
  approvedSubmissions: number
  totalClaims: number
  verifiedClaims: number
  violationClaims: number
  unverifiedClaims: number
  conflictClaims: number
  complianceRate: number
  activeDocuments: number
  expiredDocuments: number
  expiringSoonDocuments: number
}

export interface ViolationCategory {
  category: string
  label: string
  count: number
  percentage: number
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  sampleClaim: string
}

export interface DepartmentCompliance {
  departmentId: string
  departmentName: string
  totalSubmissions: number
  flaggedSubmissions: number
  approvedSubmissions: number
  cleanRate: number
  primaryFrictionPoint: string
}

export interface TrendDataPoint {
  period: string
  verified: number
  flagged: number
  changesRequested: number
  approved: number
}

export interface RepeatedIssue {
  id: string
  issueTitle: string
  category: string
  occurrenceCount: number
  affectedDepartment: string
  rootCause: string
  ruleReference: string
}

export interface GuidelineHealthIssue {
  id: string
  title: string
  issueType: 'CONFIRMED_CONFLICT' | 'POTENTIAL_AMBIGUITY' | 'KNOWLEDGE_GAP' | 'EXPIRING_DOCUMENT' | 'OVERLAPPING_RULES'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  verificationNature: 'CONFIRMED_CONTRADICTION' | 'REQUIRES_HUMAN_REVIEW' | 'ACTION_REQUIRED'
  description: string
  documentNames: string[]
  documentIds?: string[]
  conflictingExcerpts?: string
  affectedSubmissionsCount: number
  recommendedAction: string
}

export interface ActionableRecommendation {
  id: string
  title: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  problem: string
  supportingRecords: string[]
  whyItMatters: string
  recommendedAction: string
  actionType: 'REVIEW_GUIDELINE' | 'UPDATE_DOCUMENT' | 'CLARIFY_RULE' | 'RENEW_DOCUMENT'
}

export interface GovernanceInsights {
  overview: GovernanceOverview
  violationCategories: ViolationCategory[]
  departmentBreakdown: DepartmentCompliance[]
  complianceTrends: TrendDataPoint[]
  repeatedIssues: RepeatedIssue[]
  guidelineHealthIssues: GuidelineHealthIssue[]
  recommendations: ActionableRecommendation[]
}

export interface OrganisationProfile {
  id: string
  name: string
  slug: string
  description?: string
  website?: string
  contactEmail?: string
  createdAt?: string
}

export interface DepartmentItem {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
  userCount: number
  documentCount: number
}

export interface AuthorityEngineConfig {
  requireExplicitApproval: boolean
  strictDateValidity: boolean
  allowScopedTier2Exceptions: boolean
  tier1OverridesSubordinate: boolean
  flagNumericContradictions: boolean
}

// ─── Campaign Governance ───────────────────────────────────────────────────
export interface Campaign {
  id: string
  code: string
  name: string
  description?: string
  organisationId: string
  departmentId?: string
  allowedProductScope?: string
  allowedDiscountPrice?: string
  startDate: string
  endDate: string
  isApproved: boolean
  createdBy: string
  createdAt: string
  isActive: boolean
  isExpired: boolean
  governanceNote?: string
}

export interface CampaignRequest {
  code: string
  name: string
  description?: string
  allowedProductScope?: string
  allowedDiscountPrice?: string
  departmentId?: string
  startDate: string
  endDate: string
}

export type CampaignValidationStatus = 'VALID' | 'INVALID' | 'EXPIRED' | 'NOT_REFERENCED'

export interface CampaignValidationResult {
  status: CampaignValidationStatus
  campaignCode?: string
  message?: string
  campaign?: Campaign
}

// ─── Pre-Flight API ────────────────────────────────────────────────────────
export type PreFlightMode = 'LIGHTWEIGHT' | 'FULL'

export interface PreFlightRequest {
  text: string
  mode?: PreFlightMode
  campaignCode?: string
  departmentId?: string
}

export interface PreFlightClaimResult {
  claimText: string
  claimType: ClaimType
  status: ClaimState
  explanation: string
  suggestedCorrection?: string
  authoritativeSource?: string
}

export interface PreFlightResponse {
  mode: PreFlightMode
  latencyMs: number
  totalClaims: number
  violations: number
  verified: number
  conflicts: number
  unverified: number
  compliant: boolean
  summary: string
  claims: PreFlightClaimResult[]
}



