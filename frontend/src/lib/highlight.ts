import type { Claim } from '../types'

export type Segment = { text: string; claimId?: string }

/**
 * The backend does not return character offsets, so we locate each claim's text inside the content.
 * Claims that cannot be found are returned in `unlocated` and still appear in the claim list.
 */
export function buildSegments(content: string, claims: Claim[]) {
  const lower = content.toLowerCase()
  const found: { start: number; end: number; id: string }[] = []
  const unlocated: string[] = []
  for (const c of claims) {
    const needle = c.claimText.trim().toLowerCase()
    let at = needle ? lower.indexOf(needle) : -1
    while (at !== -1 && found.some((f) => at < f.end && at + needle.length > f.start)) {
      at = lower.indexOf(needle, at + 1)
    }
    if (at === -1) unlocated.push(c.id)
    else found.push({ start: at, end: at + needle.length, id: c.id })
  }
  found.sort((a, b) => a.start - b.start)
  const segments: Segment[] = []
  let pos = 0
  for (const f of found) {
    if (f.start > pos) segments.push({ text: content.slice(pos, f.start) })
    segments.push({ text: content.slice(f.start, f.end), claimId: f.id })
    pos = f.end
  }
  if (pos < content.length) segments.push({ text: content.slice(pos) })
  return { segments, unlocated }
}

/** Replace each flagged claim with its suggested correction (when the backend offered one). */
export function applySuggestions(content: string, claims: Claim[]) {
  let out = content
  let applied = 0
  for (const c of claims) {
    if (c.verificationStatus === 'VERIFIED' || !c.suggestedCorrection) continue
    const idx = out.toLowerCase().indexOf(c.claimText.trim().toLowerCase())
    if (idx === -1) continue
    out = out.slice(0, idx) + c.suggestedCorrection + out.slice(idx + c.claimText.trim().length)
    applied++
  }
  return { text: out, applied }
}
