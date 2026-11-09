import type {
  AuditEntry,
  AuthorityEngineConfig,
  DepartmentItem,
  GovernanceInsights,
  KnowledgeChunk,
  KnowledgeDoc,
  LoginResponse,
  OrganisationProfile,
  ReviewAction,
  Submission,
  User,
} from '../types'

/** Everything the UI needs from the backend. One implementation is HTTP, one is mock. */
export interface Api {
  login(email: string, password: string): Promise<LoginResponse>
  me(): Promise<User>
  createTextSubmission(input: { title: string; content: string; departmentId?: string }): Promise<Submission>
  createPdfSubmission(input: { title: string; file: File; departmentId?: string }): Promise<Submission>
  getSubmission(id: string): Promise<Submission>
  listSubmissions(): Promise<Submission[]>
  reviewSubmission(id: string, action: ReviewAction, comment?: string): Promise<Submission>
  reviseSubmission(id: string, content: string, comment?: string): Promise<Submission>
  getAudit(id: string): Promise<AuditEntry[]>
  listGlobalAudit(): Promise<AuditEntry[]>
  listDocuments(filters?: { departmentId?: string; status?: string; tier?: string; category?: string }): Promise<KnowledgeDoc[]>
  getDocumentChunks(documentId: string): Promise<KnowledgeChunk[]>
  getDocumentAudit(documentId: string): Promise<AuditEntry[]>
  uploadDocument(formData: FormData): Promise<KnowledgeDoc>
  updateDocumentStatus(id: string, status: string, reason?: string): Promise<KnowledgeDoc>
  updateDocumentAuthority(
    id: string,
    request: {
      authorityTier?: string
      departmentId?: string | null
      productScope?: string
      category?: string
      version?: string
      effectiveDate?: string
      expiryDate?: string
      region?: string
      channel?: string
    }
  ): Promise<KnowledgeDoc>
  supersedeDocument(oldDocId: string, supersededByDocId: string): Promise<KnowledgeDoc>
  listUsers(): Promise<User[]>
  createUser(req: { email: string; fullName: string; role: string; departmentId?: string | null; canApproveKnowledge?: boolean }): Promise<User>
  updateUser(id: string, req: { role?: string; departmentId?: string | null; isActive?: boolean; canApproveKnowledge?: boolean }): Promise<User>
  toggleUserStatus(id: string): Promise<User>
  getInsights(filters?: { departmentId?: string; dateRange?: string }): Promise<GovernanceInsights>
  getOrganisation(): Promise<OrganisationProfile>
  updateOrganisation(req: Partial<OrganisationProfile>): Promise<OrganisationProfile>
  listDepartments(): Promise<DepartmentItem[]>
  createDepartment(req: { name: string; code?: string; description?: string }): Promise<DepartmentItem>
  updateDepartment(id: string, req: { name?: string; code?: string; description?: string; isActive?: boolean }): Promise<DepartmentItem>
  getAuthorityRules(): Promise<AuthorityEngineConfig>
  updateAuthorityRules(req: AuthorityEngineConfig): Promise<AuthorityEngineConfig>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
