export type ClaimStatus = 'VERIFIED' | 'VIOLATION' | 'UNVERIFIED' | 'CONFLICT';
export type AuthorityTier = 'TIER_1' | 'TIER_2' | 'TIER_3';
export type DocumentStatus = 'DRAFT' | 'APPROVED' | 'SUPERSEDED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';
export type UserRole = 'ADMIN' | 'CREATOR' | 'DEPT_MANAGER' | 'REVIEWER';
export type SubmissionStatus = 
  | 'DRAFT' 
  | 'ANALYZING' 
  | 'FLAGGED' 
  | 'VERIFIED' 
  | 'IN_REVIEW' 
  | 'CHANGES_REQUESTED' 
  | 'APPROVED' 
  | 'REJECTED';
export type ClaimType = 'PRICE' | 'FEATURE' | 'PROMOTION' | 'TERMINOLOGY' | 'TONE' | 'FACTUAL' | 'OTHER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string;
  departmentName?: string;
  avatarUrl?: string;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  approvalStatus: DocumentStatus;
  authorityTier: AuthorityTier;
  version: string;
  effectiveDate: string;
  expiryDate: string;
  department: string;
  productScope: string;
  fileSize?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface Evidence {
  id: string;
  documentName: string;
  documentVersion: string;
  authorityTier: AuthorityTier;
  excerpt: string;
  pageNumber: number;
  isAuthoritative: boolean;
}

export interface Claim {
  id: string;
  claimText: string;
  claimType: ClaimType;
  verificationStatus: ClaimStatus;
  explanation: string;
  suggestedCorrection: string;
  evidence: Evidence[];
}

export interface Submission {
  id: string;
  title: string;
  content: string;
  status: SubmissionStatus;
  department: string;
  revisionNumber: number;
  claims: Claim[];
  createdAt: string;
  submittedBy: string;
  submittedByEmail?: string;
  updatedAt?: string;
  reviewComment?: string;
  contentType?: 'TEXT' | 'PDF';
  originalFileName?: string;
}

export interface AuditAction {
  id: string;
  submissionId?: string;
  action: string;
  actorName: string;
  actorRole?: UserRole;
  comment: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
