import type { AuditEntry, LoginResponse, ReviewAction, Submission, User } from '../types'

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
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
