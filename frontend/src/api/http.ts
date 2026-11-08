import type { CreateSubmissionInput, Finding, LoginResponse, Submission, User } from '../types'
import { ApiError, type Api } from './types'

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
  if (!res.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch { /* keep default */ }
    throw new ApiError(message, res.status)
  }
  return (await res.json()) as T
}

export const httpApi: Api = {
  login: (email, password) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/me'),
  createSubmission: (input: CreateSubmissionInput) => {
    const form = new FormData()
    form.append('title', input.title)
    form.append('department', input.department)
    if (input.text) form.append('text', input.text)
    if (input.file) form.append('file', input.file)
    return request<Submission>('/submissions', { method: 'POST', body: form })
  },
  getSubmission: (id) => request<Submission>(`/submissions/${id}`),
  getFindings: (id) => request<Finding[]>(`/submissions/${id}/findings`),
}
