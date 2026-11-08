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
export type ClaimType = 'PRICE' | 'FEATURE' | 'PROMOTION' | 'TERMINOLOGY' | 'TONE' | 'FACTUAL' | 'OTHER'
export type ActionType =
  | 'SUBMITTED'
  | 'ANALYZED'
  | 'CREATOR_REVISED'
  | 'REVIEWER_APPROVED'
  | 'REVIEWER_CHANGES_REQUESTED'
  | 'REVIEWER_REJECTED'
export type ReviewAction = Extract<ActionType, 'REVIEWER_APPROVED' | 'REVIEWER_CHANGES_REQUESTED' | 'REVIEWER_REJECTED'>

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  departmentId?: string | null
  organisationId?: string
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
  evidence: Evidence[]
}

export interface Submission {
  id: string
  title: string
  content: string
  filePath?: string | null
  contentType?: 'TEXT' | 'PDF'
  departmentId?: string | null
  departmentName?: string | null
  submittedBy?: string
  submittedByName?: string
  status: SubmissionStatus
  revisionNumber: number
  parentSubmissionId?: string | null
  createdAt: string
  updatedAt?: string
  claims: Claim[]
}

export interface AuditEntry {
  id: string
  submissionId?: string
  actorName: string
  actorEmail?: string
  actorRole?: string
  action: ActionType
  comment?: string | null
  createdAt: string
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
  DEPT_MANAGER: 'Manager',
  REVIEWER: 'Authorised Reviewer',
}
