import { ApiError, type Api } from './types'
import type {
  AuditEntry,
  AuthorityEngineConfig,
  DepartmentItem,
  GovernanceInsights,
  KnowledgeChunk,
  KnowledgeDoc,
  LoginResponse,
  OrganisationProfile,
  Submission,
  User,
} from '../types'

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
      throw new ApiError('Backend server request timed out. The server may be warming up. Please try again.', 504)
    }
    throw new ApiError('Service unavailable: Unable to reach the ClaimLedger backend server. Please verify your connection or ensure the Spring Boot server is active.', 0)
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
  register: (data) =>
    request<LoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
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
    if (filters?.category) params.append('category', filters.category)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<KnowledgeDoc[]>(`/documents${qs}`)
  },
  getDocumentChunks: (docId) => request<KnowledgeChunk[]>(`/documents/${docId}/chunks`),
  getDocumentAudit: (docId) => request<AuditEntry[]>(`/documents/${docId}/audit`),
  getDocumentFileUrl: (docId, download = false) => `${API_BASE}/documents/${docId}/file${download ? '?download=true' : ''}`,
  uploadDocument: (formData) => request<KnowledgeDoc>('/documents/upload', { method: 'POST', body: formData }),
  updateDocumentStatus: (id, status, reason) =>
    request<KnowledgeDoc>(`/documents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ approvalStatus: status, reason }),
    }),
  updateDocumentAuthority: (id, req) =>
    request<KnowledgeDoc>(`/documents/${id}/authority`, {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  supersedeDocument: (oldDocId, supersededByDocId) =>
    request<KnowledgeDoc>(`/documents/${oldDocId}/supersede?supersededByDocId=${supersededByDocId}`, {
      method: 'POST',
    }),
  listUsers: () => request<User[]>('/users'),
  createUser: (req) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateUser: (id, req) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  toggleUserStatus: (id) =>
    request<User>(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    }),
  getInsights: (filters) => {
    const params = new URLSearchParams()
    if (filters?.departmentId) params.set('departmentId', filters.departmentId)
    if (filters?.dateRange) params.set('dateRange', filters.dateRange)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<GovernanceInsights>(`/insights${qs}`)
  },
  getOrganisation: () => request<OrganisationProfile>('/organisation'),
  updateOrganisation: (req) =>
    request<OrganisationProfile>('/organisation', {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  listDepartments: () => request<DepartmentItem[]>('/departments'),
  createDepartment: (req) =>
    request<DepartmentItem>('/departments', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  updateDepartment: (id, req) =>
    request<DepartmentItem>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
  getAuthorityRules: () => request<AuthorityEngineConfig>('/organisation/authority-rules'),
  updateAuthorityRules: (req) =>
    request<AuthorityEngineConfig>('/organisation/authority-rules', {
      method: 'PUT',
      body: JSON.stringify(req),
    }),
}
