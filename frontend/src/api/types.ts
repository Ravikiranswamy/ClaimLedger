import type { AuditEntry, KnowledgeChunk, KnowledgeDoc, LoginResponse, ReviewAction, Submission, User } from '../types'

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
  uploadDocument(formData: FormData): Promise<KnowledgeDoc>
  updateDocumentStatus(id: string, status: string): Promise<KnowledgeDoc>
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
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
