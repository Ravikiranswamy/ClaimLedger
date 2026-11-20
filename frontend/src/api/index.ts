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
  return import.meta.env.VITE_USE_MOCK === 'true'
}

async function withFallback<T>(httpFn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
  if (isEvaluationMode()) {
    return mockFn()
  }
  try {
    return await httpFn()
  } catch (err) {
    console.warn('Backend unavailable or suspended, activating client evaluation fallback:', err)
    return mockFn()
  }
}

// Resilient API: Uses Spring Boot when reachable, and seamlessly falls back
// to the client-side evaluation engine if the backend is suspended or cold.
const directApi: Api = {
  login: async (email, password) => withFallback(() => httpApi.login(email, password), () => mockApi.login(email, password)),
  register: async (data) => withFallback(() => httpApi.register(data), () => mockApi.register(data)),
  me: async () => withFallback(() => httpApi.me(), () => mockApi.me()),
  createTextSubmission: (args) => withFallback(() => httpApi.createTextSubmission(args), () => mockApi.createTextSubmission(args)),
  createPdfSubmission: (args) => withFallback(() => httpApi.createPdfSubmission(args), () => mockApi.createPdfSubmission(args)),
  createImageSubmission: (args) => withFallback(() => httpApi.createImageSubmission(args), () => mockApi.createImageSubmission(args)),
  getSubmission: (id) => withFallback(() => httpApi.getSubmission(id), () => mockApi.getSubmission(id)),
  listSubmissions: () => withFallback(() => httpApi.listSubmissions(), () => mockApi.listSubmissions()),
  reviewSubmission: (id, action, comment) => withFallback(() => httpApi.reviewSubmission(id, action, comment), () => mockApi.reviewSubmission(id, action, comment)),
  reviseSubmission: (id, content, comment, file, creatorNotes) =>
    withFallback(() => httpApi.reviseSubmission(id, content, comment, file, creatorNotes), () => mockApi.reviseSubmission(id, content, comment, file, creatorNotes)),
  getSubmissionRevisions: (id) =>
    withFallback(() => httpApi.getSubmissionRevisions(id), () => mockApi.getSubmissionRevisions(id)),
  getSubmissionDiff: (id, fromRev, toRev) =>
    withFallback(() => httpApi.getSubmissionDiff(id, fromRev, toRev), () => mockApi.getSubmissionDiff(id, fromRev, toRev)),
  getAudit: (id) => withFallback(() => httpApi.getAudit(id), () => mockApi.getAudit(id)),
  listGlobalAudit: () => withFallback(() => httpApi.listGlobalAudit(), () => mockApi.listGlobalAudit()),
  listDocuments: (filters) => withFallback(() => httpApi.listDocuments(filters), () => mockApi.listDocuments(filters)),
  getDocumentChunks: (docId) => withFallback(() => httpApi.getDocumentChunks(docId), () => mockApi.getDocumentChunks(docId)),
  getDocumentAudit: (docId) => withFallback(() => httpApi.getDocumentAudit(docId), () => mockApi.getDocumentAudit(docId)),
  getDocumentFileUrl: (docId, download) => httpApi.getDocumentFileUrl(docId, download),
  uploadDocument: (formData) => withFallback(() => httpApi.uploadDocument(formData), () => mockApi.uploadDocument(formData)),
  updateDocumentStatus: (id, status, reason) => withFallback(() => httpApi.updateDocumentStatus(id, status, reason), () => mockApi.updateDocumentStatus(id, status, reason)),
  updateDocumentAuthority: (id, req) => withFallback(() => httpApi.updateDocumentAuthority(id, req), () => mockApi.updateDocumentAuthority(id, req)),
  supersedeDocument: (oldDocId, supersededByDocId) => withFallback(() => httpApi.supersedeDocument(oldDocId, supersededByDocId), () => mockApi.supersedeDocument(oldDocId, supersededByDocId)),
  listUsers: () => withFallback(() => httpApi.listUsers(), () => mockApi.listUsers()),
  createUser: (req) => withFallback(() => httpApi.createUser(req), () => mockApi.createUser(req)),
  updateUser: (id, req) => withFallback(() => httpApi.updateUser(id, req), () => mockApi.updateUser(id, req)),
  toggleUserStatus: (id) => withFallback(() => httpApi.toggleUserStatus(id), () => mockApi.toggleUserStatus(id)),
  getInsights: (filters) => withFallback(() => httpApi.getInsights(filters), () => mockApi.getInsights(filters)),
  getOrganisation: () => withFallback(() => httpApi.getOrganisation(), () => mockApi.getOrganisation()),
  updateOrganisation: (req) => withFallback(() => httpApi.updateOrganisation(req), () => mockApi.updateOrganisation(req)),
  listDepartments: () => withFallback(() => httpApi.listDepartments(), () => mockApi.listDepartments()),
  createDepartment: (req) => withFallback(() => httpApi.createDepartment(req), () => mockApi.createDepartment(req)),
  updateDepartment: (id, req) => withFallback(() => httpApi.updateDepartment(id, req), () => mockApi.updateDepartment(id, req)),
  getAuthorityRules: () => withFallback(() => httpApi.getAuthorityRules(), () => mockApi.getAuthorityRules()),
  updateAuthorityRules: (req) => withFallback(() => httpApi.updateAuthorityRules(req), () => mockApi.updateAuthorityRules(req)),
  listCampaigns: () => withFallback(() => httpApi.listCampaigns(), () => mockApi.listCampaigns()),
  registerCampaign: (req) => withFallback(() => httpApi.registerCampaign(req), () => mockApi.registerCampaign(req)),
  validateCampaign: (code) => withFallback(() => httpApi.validateCampaign(code), () => mockApi.validateCampaign(code)),
  preFlightCheck: (req) => withFallback(() => httpApi.preFlightCheck(req), () => mockApi.preFlightCheck(req)),
}

export const api: Api = directApi
export { ApiError } from './types'
