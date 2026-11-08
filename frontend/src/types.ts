// Shared types. These mirror docs/api-contracts and must match the backend's JSON.

export type Role = 'ADMIN' | 'CREATOR' | 'MANAGER' | 'REVIEWER'
export type Department = 'MARKETING' | 'SALES' | 'HR'

/** Verification result for ONE claim. Never mix with SubmissionStatus. */
export type ClaimState = 'VERIFIED' | 'VIOLATION' | 'UNVERIFIED' | 'CONFLICT'

/** Workflow state of a whole submission. Never mix with ClaimState. */
export type SubmissionStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export type SourceStatus = 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | 'EXPIRED'
export type SourceOutcome = 'SUPERSEDED' | 'SCOPED' | 'AUTHORITATIVE' | 'TIE' | 'NOT_APPLICABLE'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department?: Department
}

export interface LoginResponse {
  token: string
  user: User
}

export interface Source {
  id: string
  name: string
  version: string
  status: SourceStatus
  effectiveFrom?: string // ISO date
  effectiveTo?: string // ISO date
}

export interface AuthorityConsideration {
  source: Source
  outcome: SourceOutcome
  value?: string
  reason: string
}

export interface Finding {
  id: string
  claimText: string
  span: [number, number] // character offsets in the submitted text
  state: ClaimState
  message: string // one-sentence plain-language reason
  authority?: {
    winner?: Source
    approvedValue?: string
    considered: AuthorityConsideration[]
  }
  suggestedFix?: string
}

export interface AnalysisProgress {
  stage: 'EXTRACTING_CLAIMS' | 'CHECKING_SOURCES' | 'PREPARING_FINDINGS' | 'DONE'
  claimsFound: number
  claimsChecked: number
  sourcesAvailable: number
}

export interface Submission {
  id: string
  title: string
  department: Department
  status: SubmissionStatus
  text?: string
  fileName?: string
  createdBy: string
  createdAt: string // ISO datetime
  progress?: AnalysisProgress
}

export interface CreateSubmissionInput {
  title: string
  department: Department
  text?: string
  file?: File
}

export const DEPARTMENT_LABEL: Record<Department, string> = {
  MARKETING: 'Marketing',
  SALES: 'Sales',
  HR: 'HR',
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  CREATOR: 'Content Creator',
  MANAGER: 'Manager',
  REVIEWER: 'Authorised Reviewer',
}
