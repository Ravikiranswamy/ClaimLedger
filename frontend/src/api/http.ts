import { ApiError, type Api } from './types'
import type { AuditEntry, KnowledgeChunk, KnowledgeDoc, LoginResponse, Submission, User } from '../types'

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

/** Helper token store for authenticated requests. */

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined) || ''
const API_BASE = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : RAW_API_URL
    ? `${RAW_API_URL.replace(/\/$/, '')}/api`
    : '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: init.signal || controller.signal,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Backend server is starting up (free-tier cold start) or unreachable. Try Instant Evaluation Mode.', 504)
    }
    throw new ApiError('Cannot reach the server. Check your connection or switch to Instant Evaluation Mode.', 0)
  } finally {
    clearTimeout(timeoutId)
  }

  let body: any = null
  try { body = await res.json() } catch { /* empty or non-JSON body */ }

  if (!res.ok || (body && typeof body === 'object' && body.success === false)) {
    const fallback =
      res.status === 401 ? 'Email or password is incorrect, or your session expired.'
      : res.status === 403 ? 'You do not have permission to do that.'
      : 'Something went wrong. Please try again.'
    throw new ApiError(body?.message || fallback, res.status)
  }
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data as T
  }
  return body as T
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
  listGlobalAudit: () => request<AuditEntry[]>('/submissions/audit'),
  listDocuments: (filters) => {
    const params = new URLSearchParams()
    if (filters?.departmentId) params.append('departmentId', filters.departmentId)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.tier) params.append('tier', filters.tier)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<KnowledgeDoc[]>(`/documents${qs}`)
  },
  getDocumentChunks: (docId) => request<KnowledgeChunk[]>(`/documents/${docId}/chunks`),
  uploadDocument: (formData) => request<KnowledgeDoc>('/documents/upload', { method: 'POST', body: formData }),
  updateDocumentStatus: (id, status) =>
    request<KnowledgeDoc>(`/documents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ approvalStatus: status }),
    }),
}
