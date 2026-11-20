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
    if (c.verificationStatus === 'VERIFIED') continue

    // 1. Check if explanation specifies a clean mismatch: "Claim states 'X' but authoritative document states 'Y'"
    const match = c.explanation?.match(/states\s+['"]([^'"]+)['"]\s+but\s+authoritative\s+document\s+states\s+['"]([^'"]+)['"]/i)
    if (match) {
      const badToken = match[1].trim()
      const goodToken = match[2].trim()

      // Normalize token variants (e.g. ₹799 vs 799 vs ₹799 per month)
      const variants = [
        badToken,
        badToken.startsWith('₹') ? badToken.slice(1).trim() : '₹' + badToken,
        badToken.replace(/\s*per\s+month/i, '').trim(),
        (badToken.startsWith('₹') ? badToken.slice(1) : '₹' + badToken).replace(/\s*per\s+month/i, '').trim(),
      ]

      let replaced = false
      for (const v of variants) {
        if (!v) continue
        const vIdx = out.toLowerCase().indexOf(v.toLowerCase())
        if (vIdx !== -1) {
          // If original token had "per month" or following text has it, ensure clean format
          const replacement = goodToken.toLowerCase().includes('month') || out.slice(vIdx, vIdx + v.length + 12).toLowerCase().includes('per month')
            ? goodToken
            : `${goodToken} per month`
          out = out.slice(0, vIdx) + replacement + out.slice(vIdx + v.length)
          applied++
          replaced = true
          break
        }
      }
      if (replaced) continue
    }

    if (!c.suggestedCorrection) continue

    // 2. If suggestedCorrection is "Change X to Y"
    const changeMatch = c.suggestedCorrection.match(/change\s+(.+?)\s+to\s+(.+?)(\.|$)/i)
    if (changeMatch) {
      const from = changeMatch[1].trim()
      const to = changeMatch[2].trim()
      const idx = out.toLowerCase().indexOf(from.toLowerCase())
      if (idx !== -1) {
        out = out.slice(0, idx) + to + out.slice(idx + from.length)
        applied++
        continue
      }
    }

    // 3. If suggestedCorrection contains backend meta-text ("Update to match ..."):
    if (c.suggestedCorrection.startsWith('Update to match') || c.suggestedCorrection.includes('Authoritative excerpt:')) {
      const priceMatch = c.suggestedCorrection.match(/₹\s*(\d+[\d,]*)/)
      if (priceMatch) {
        const correctPrice = priceMatch[0]
        const oldPriceMatch = c.claimText.match(/₹?\s*(\d+[\d,]*)/)
        if (oldPriceMatch) {
          const oldToken = oldPriceMatch[0]
          const idx = out.indexOf(oldToken)
          if (idx !== -1) {
            out = out.slice(0, idx) + correctPrice + out.slice(idx + oldToken.length)
            applied++
            continue
          }
        }
      }
      continue
    }

    // 4. Default: clean direct replacement of claimText if a concise suggestion exists
    const needle = c.claimText.trim().toLowerCase()
    const idx = out.toLowerCase().indexOf(needle)
    if (idx !== -1) {
      out = out.slice(0, idx) + c.suggestedCorrection + out.slice(idx + needle.length)
      applied++
    }
  }

  return { text: out, applied }
}

/**
 * Format suggested correction for human display in the UI.
 * Strips raw backend meta-instructions and presents clean, clear recommendations.
 */
export function formatSuggestedCorrection(claim: Claim): string {
  if (!claim.suggestedCorrection && !claim.explanation) return ''

  const raw = claim.suggestedCorrection || ''

  // Backend format: "Update to match Product_Master_Catalogue_v4.2.pdf (4.2). Authoritative excerpt: "..."
  if (raw.startsWith('Update to match') || raw.includes('Authoritative excerpt:')) {
    const match = claim.explanation?.match(/states\s+['"]([^'"]+)['"]\s+but\s+authoritative\s+document\s+states\s+['"]([^'"]+)['"]/i)
    if (match) {
      return `Update price from '${match[1]}' to '${match[2]}' (as specified in Master Product Catalogue)`
    }
    const priceMatch = raw.match(/₹\s*\d+[\d,]*(?:\s*per\s+user\s+per\s+month|\s*per\s+month)?/i)
    if (priceMatch) {
      return `Update pricing to authoritative rate of ${priceMatch[0]}`
    }
    return 'Update to align with Master Product Catalogue requirements'
  }

  return raw
}
