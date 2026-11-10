import { httpApi } from './http'
import { mockApi } from './mock'
import type { Api } from './types'

const storedMode = typeof window !== 'undefined' ? localStorage.getItem('claimledger.force_mock') : null
export const USE_MOCK = storedMode === 'true' || (storedMode === null && import.meta.env.VITE_USE_MOCK === 'true')

export function setEvaluationMode(active: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('claimledger.force_mock', active ? 'true' : 'false')
    window.location.reload()
  }
}

export function isEvaluationMode(): boolean {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem('claimledger.force_mock')
    if (val !== null) return val === 'true'
  }
  return USE_MOCK
}

// Direct API: All normal registration and login requests use the Spring Boot backend and PostgreSQL.
// Only explicitly activated Evaluation Mode (Nexora Demo Workspace) uses mockApi.
const directApi: Api = {
  login: async (email, password) => {
    if (isEvaluationMode()) {
      return mockApi.login(email, password)
    }
    return httpApi.login(email, password)
  },
  register: async (data) => {
    // Normal account registration ALWAYS uses the live Spring Boot backend & PostgreSQL.
    // No silent fallback to mock mode; failures produce clear server error messages.
    return httpApi.register(data)
  },
  me: async () => (isEvaluationMode() ? mockApi.me() : httpApi.me()),
  createTextSubmission: (args) => (isEvaluationMode() ? mockApi.createTextSubmission(args) : httpApi.createTextSubmission(args)),
  createPdfSubmission: (args) => (isEvaluationMode() ? mockApi.createPdfSubmission(args) : httpApi.createPdfSubmission(args)),
  createImageSubmission: (args) => (isEvaluationMode() ? mockApi.createImageSubmission(args) : httpApi.createImageSubmission(args)),
  getSubmission: (id) => (isEvaluationMode() ? mockApi.getSubmission(id) : httpApi.getSubmission(id)),
  listSubmissions: () => (isEvaluationMode() ? mockApi.listSubmissions() : httpApi.listSubmissions()),
  reviewSubmission: (id, action, comment) => (isEvaluationMode() ? mockApi.reviewSubmission(id, action, comment) : httpApi.reviewSubmission(id, action, comment)),
  reviseSubmission: (id, content, comment) => (isEvaluationMode() ? mockApi.reviseSubmission(id, content, comment) : httpApi.reviseSubmission(id, content, comment)),
  getAudit: (id) => (isEvaluationMode() ? mockApi.getAudit(id) : httpApi.getAudit(id)),
  listGlobalAudit: () => (isEvaluationMode() ? mockApi.listGlobalAudit() : httpApi.listGlobalAudit()),
  listDocuments: (filters) => (isEvaluationMode() ? mockApi.listDocuments(filters) : httpApi.listDocuments(filters)),
  getDocumentChunks: (docId) => (isEvaluationMode() ? mockApi.getDocumentChunks(docId) : httpApi.getDocumentChunks(docId)),
  getDocumentAudit: (docId) => (isEvaluationMode() ? mockApi.getDocumentAudit(docId) : httpApi.getDocumentAudit(docId)),
  getDocumentFileUrl: (docId, download) => httpApi.getDocumentFileUrl(docId, download),
  uploadDocument: (formData) => (isEvaluationMode() ? mockApi.uploadDocument(formData) : httpApi.uploadDocument(formData)),
  updateDocumentStatus: (id, status, reason) => (isEvaluationMode() ? mockApi.updateDocumentStatus(id, status, reason) : httpApi.updateDocumentStatus(id, status, reason)),
  updateDocumentAuthority: (id, req) => (isEvaluationMode() ? mockApi.updateDocumentAuthority(id, req) : httpApi.updateDocumentAuthority(id, req)),
  supersedeDocument: (oldDocId, supersededByDocId) => (isEvaluationMode() ? mockApi.supersedeDocument(oldDocId, supersededByDocId) : httpApi.supersedeDocument(oldDocId, supersededByDocId)),
  listUsers: () => (isEvaluationMode() ? mockApi.listUsers() : httpApi.listUsers()),
  createUser: (req) => (isEvaluationMode() ? mockApi.createUser(req) : httpApi.createUser(req)),
  updateUser: (id, req) => (isEvaluationMode() ? mockApi.updateUser(id, req) : httpApi.updateUser(id, req)),
  toggleUserStatus: (id) => (isEvaluationMode() ? mockApi.toggleUserStatus(id) : httpApi.toggleUserStatus(id)),
  getInsights: (filters) => (isEvaluationMode() ? mockApi.getInsights(filters) : httpApi.getInsights(filters)),
  getOrganisation: () => (isEvaluationMode() ? mockApi.getOrganisation() : httpApi.getOrganisation()),
  updateOrganisation: (req) => (isEvaluationMode() ? mockApi.updateOrganisation(req) : httpApi.updateOrganisation(req)),
  listDepartments: () => (isEvaluationMode() ? mockApi.listDepartments() : httpApi.listDepartments()),
  createDepartment: (req) => (isEvaluationMode() ? mockApi.createDepartment(req) : httpApi.createDepartment(req)),
  updateDepartment: (id, req) => (isEvaluationMode() ? mockApi.updateDepartment(id, req) : httpApi.updateDepartment(id, req)),
  getAuthorityRules: () => (isEvaluationMode() ? mockApi.getAuthorityRules() : httpApi.getAuthorityRules()),
  updateAuthorityRules: (req) => (isEvaluationMode() ? mockApi.updateAuthorityRules(req) : httpApi.updateAuthorityRules(req)),
}

export const api: Api = directApi
export { ApiError } from './types'
