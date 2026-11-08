import { ApiError, type Api } from './types'
import type { AuditEntry, LoginResponse, Submission, User } from '../types'

const TOKEN_KEY = 'claimledger.token'
export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t) } catch { /* ignore */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

/** Backend wraps every response as { success, message, data, timestamp }. */
interface Envelope<T> { success: boolean; message?: string; data: T }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0)
  }

  let body: Partial<Envelope<T>> | null = null
  try { body = await res.json() } catch { /* empty or non-JSON body */ }

  if (!res.ok || body?.success === false) {
    const fallback =
      res.status === 401 ? 'Email or password is incorrect, or your session expired.'
      : res.status === 403 ? 'You do not have permission to do that.'
      : 'Something went wrong. Please try again.'
    throw new ApiError(body?.message || fallback, res.status)
  }
  return body?.data as T
}

export const httpApi: Api = {
  login: (email, password) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'),
  createTextSubmission: ({ title, content, departmentId }) =>
    request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify({ title, content, contentType: 'TEXT', departmentId }),
    }),
  createPdfSubmission: ({ title, file, departmentId }) => {
    const form = new FormData()
    form.append('title', title)
    form.append('file', file)
    if (departmentId) form.append('departmentId', departmentId)
    return request<Submission>('/submissions/upload', { method: 'POST', body: form })
  },
  getSubmission: (id) => request<Submission>(`/submissions/${id}`),
  listSubmissions: () => request<Submission[]>('/submissions'),
  reviewSubmission: (id, action, comment) =>
    request<Submission>(`/submissions/${id}/review`, { method: 'POST', body: JSON.stringify({ action, comment }) }),
  reviseSubmission: (id, content, comment) =>
    request<Submission>(`/submissions/${id}/revise`, {
      method: 'PUT',
      body: JSON.stringify({ content, revisionComment: comment, contentType: 'TEXT' }),
    }),
  getAudit: (id) => request<AuditEntry[]>(`/submissions/${id}/audit`),
}
