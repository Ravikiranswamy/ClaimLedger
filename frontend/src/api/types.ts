import type {
  CreateSubmissionInput,
  Finding,
  LoginResponse,
  Submission,
  User,
} from '../types'

/** Everything the UI needs from the backend. One implementation is HTTP, one is mock. */
export interface Api {
  login(email: string, password: string): Promise<LoginResponse>
  me(): Promise<User>
  createSubmission(input: CreateSubmissionInput): Promise<Submission>
  getSubmission(id: string): Promise<Submission>
  getFindings(id: string): Promise<Finding[]>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
