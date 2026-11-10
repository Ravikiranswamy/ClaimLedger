import { useEffect, useState } from 'react'
import { tokenStore } from '../api/http'

const RAW_API_URL = (import.meta.env.VITE_API_URL as string | undefined) || ''
const API_BASE = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : RAW_API_URL
    ? `${RAW_API_URL.replace(/\/$/, '')}/api`
    : '/api'

/**
 * Returns a clean, token-free REST endpoint URL for submission files.
 * Sensitive tokens are NEVER embedded into this URL.
 */
export function getCleanSubmissionMediaUrl(s: { id: string; fileUrl?: string | null }): string {
  if (s.fileUrl) {
    if (
      s.fileUrl.startsWith('http://') ||
      s.fileUrl.startsWith('https://') ||
      s.fileUrl.startsWith('data:') ||
      s.fileUrl.startsWith('blob:')
    ) {
      return s.fileUrl
    }
    const cleanPath = s.fileUrl.startsWith('/api/') ? s.fileUrl.substring(4) : s.fileUrl
    return `${API_BASE}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`
  }

  return `${API_BASE}/submissions/${s.id}/file`
}

/**
 * Backwards-compatible alias for getCleanSubmissionMediaUrl.
 * No sensitive tokens are leaked into the query string.
 */
export const getSubmissionMediaUrl = getCleanSubmissionMediaUrl

/**
 * React hook that securely retrieves a submission media file (image/PDF)
 * by transmitting the JWT strictly via the encrypted 'Authorization: Bearer' HTTP header.
 * 
 * Returns a safe, in-memory browser Blob URL (e.g. 'blob:http://localhost:5173/...')
 * which prevents JWT token leakage in:
 *  - Browser history
 *  - Reverse proxy & server access logs (Cloudflare, Nginx, Render)
 *  - Referer headers
 */
export function useSecureMediaUrl(
  s: { id: string; fileUrl?: string | null } | null | undefined
): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!s) {
      setBlobUrl(undefined)
      return
    }

    // Direct in-memory blob or base64 data URI
    if (s.fileUrl?.startsWith('blob:') || s.fileUrl?.startsWith('data:')) {
      setBlobUrl(s.fileUrl)
      return
    }

    const cleanUrl = getCleanSubmissionMediaUrl(s)
    const token = tokenStore.get()
    let isCancelled = false
    let activeObjectUrl: string | null = null

    fetch(cleanUrl, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Media fetch returned status ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (!isCancelled) {
          activeObjectUrl = URL.createObjectURL(blob)
          setBlobUrl(activeObjectUrl)
        }
      })
      .catch(() => {
        // Fallback for mock/test environments
        if (!isCancelled) {
          setBlobUrl(cleanUrl)
        }
      })

    return () => {
      isCancelled = true
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl)
      }
    }
  }, [s?.id, s?.fileUrl])

  return blobUrl
}
