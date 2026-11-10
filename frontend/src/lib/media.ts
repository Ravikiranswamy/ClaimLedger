import { tokenStore } from '../api/http'

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined) || ''
const API_BASE = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : RAW_API_URL
    ? `${RAW_API_URL.replace(/\/$/, '')}/api`
    : '/api'

/**
 * Returns a secure, authenticated URL for streaming submission files (images, PDFs)
 * with the bearer token query parameter attached if available.
 */
export function getSubmissionMediaUrl(s: { id: string; fileUrl?: string | null }): string {
  const token = tokenStore.get()
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''

  if (s.fileUrl) {
    if (
      s.fileUrl.startsWith('http://') ||
      s.fileUrl.startsWith('https://') ||
      s.fileUrl.startsWith('data:') ||
      s.fileUrl.startsWith('blob:')
    ) {
      if (!token) return s.fileUrl
      const separator = s.fileUrl.includes('?') ? '&' : '?'
      return `${s.fileUrl}${separator}token=${encodeURIComponent(token)}`
    }
    const cleanPath = s.fileUrl.startsWith('/api/') ? s.fileUrl.substring(4) : s.fileUrl
    return `${API_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}${tokenParam}`
  }

  return `${API_BASE}/submissions/${s.id}/file${tokenParam}`
}
