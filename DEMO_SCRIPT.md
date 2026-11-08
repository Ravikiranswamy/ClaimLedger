# ClaimLedger — 3-Minute Hackathon Demo Script

> **Judge Pitch & Live Walkthrough**  
> **Challenge**: CodeTitans India 2026 — *Problem Statement: Inkloom AI – Brand Governance*  
> **Presenter**: Ravikiran Swamy (`ravikiranswamy550@gmail.com`)  
> **Application URL**: `https://claimledger-india.vercel.app` (or `http://localhost:5173`)

---

## ⏱️ Timeline Breakdown (180 Seconds)

```
00:00 - 00:35 ───► Hook & The Failure of Generic LLM Wrappers
00:35 - 01:15 ───► Knowledge Base & 3-Tier Hierarchy (Admin)
01:15 - 01:55 ───► Content Submission & Instant Violation Flagging (Creator)
01:55 - 02:30 ───► Reviewer Decision & 1-Click Suggestion Resubmission
02:30 - 03:00 ───► Immutable Audit Ledger, CSV Export & Conclusion
```

---

## 🎬 Step-by-Step Script & Actions

### Part 1: The Hook & The Problem (00:00 - 00:35)
- **On Screen**: Login page (`http://localhost:5173/login`).
- **What to Say**:
  > *"Judges, enterprise marketing and sales collateral are constantly at risk of out-of-date pricing, inaccurate performance claims, and non-compliant brand terminology. But generic AI wrappers cannot solve this problem — LLMs hallucinate and they have no concept of institutional hierarchy.*  
  > *Introducing **ClaimLedger** — 'Every claim, accounted for.' ClaimLedger combines pgvector semantic retrieval with an institutional **6-Step Pure Java Deterministic Authority Resolution Engine**. The LLM never decides compliance truth; our deterministic rules enforce it."*

---

### Part 2: Knowledge Base & Vector Inspector (00:35 - 01:15)
- **Action**: Click the **"Admin"** demo account button (logs in as `admin@nexora.com`).
- **Action**: Navigate to **"Knowledge Base"** in the sidebar.
- **On Screen**: Tier 1, Tier 2, and Tier 3 document cards with approval badges.
- **Action**: Click **"Inspect Chunks & Vectors"** on `Product_Master_Catalogue_v4.2.pdf`.
- **On Screen**: Modal showing the exact text chunks with `768-dim Vector Indexed` badges in Neon pgvector.
- **What to Say**:
  > *"Here in our Authoritative Knowledge Base, we enforce a strict 3-tier authority model:*  
  > *- **Tier 1 Master Authority**: Company-wide single source of truth, such as our Product Master Catalogue with the official ₹999/month price.*  
  > *- **Tier 2 Departmental Scope**: Scoped sales proposals.*  
  > *- **Tier 3 Supporting Material**: Outdated brochures with legacy ₹799 pricing marked SUPERSEDED.*  
  > *Every document is chunked and embedded into Neon Serverless PostgreSQL using pgvector with IVFFlat indexes."*

---

### Part 3: Creator Submission & Deterministic Violation (01:15 - 01:55)
- **Action**: Click **"Sign out"**, then 1-click login as **"Content Creator"** (`creator@nexora.com`).
- **Action**: Click **"Check New Content"** or go to `/submit`.
- **Action**: Enter:
  - **Title**: `Nexora Pro Q4 Social Campaign`
  - **Department**: `Marketing`
  - **Content**:
    ```text
    Get Nexora Pro today for ₹799 per month! Complete enterprise AI brand compliance.
    ```
- **Action**: Click **"Check my content"**.
- **On Screen**: The Two-Pane Finding Inspector loads automatically!
- **On Screen**: `₹799 per month` is highlighted in red underline as a **VIOLATION**!
- **Action**: Click on the red highlighted text or the claim card on the right.
- **What to Say**:
  > *"Watch what happens when a marketing creator submits copy claiming ₹799 per month. Within milliseconds, ClaimLedger's engine isolates the price claim and runs it through our 6-step Java resolution hierarchy.*  
  > *Even though the legacy brochure says ₹799, the engine deterministically overrules it using Tier 1 Master Authority. It highlights the exact character span in red, points directly to the master document evidence, and suggests the authoritative correction: '₹999 per month'."*

---

### Part 4: Reviewer Decision & Revision Loop (01:55 - 02:30)
- **Action**: Switch to **"Authorised Reviewer"** (`reviewer@nexora.com`).
- **Action**: Open the submission from the Review queue.
- **Action**: In the bottom decision bar, type comment:  
  `"Pricing must match Tier 1 Product Master Catalogue (₹999/month)."`
- **Action**: Click **"Request changes"**. Status changes to `CHANGES_REQUESTED`.
- **Action**: Switch back to **"Content Creator"**.
- **On Screen**: Creator sees the revision panel:  
  Click **"Fix with suggestions and resubmit"**.
- **On Screen**: The text is automatically corrected to `₹999 per month`! Click **"Resubmit for checking"**.
- **On Screen**: Revision 2 is generated, and the claim status instantly flips to green **VERIFIED**!
- **What to Say**:
  > *"The reviewer requests changes with a compliance comment. The creator receives the notification and with a single click — 'Fix with suggestions' — the copy is corrected to the authoritative rate, revision 2 is spawned, and the claim is immediately verified."*

---

### Part 5: The Regulatory Audit Ledger & Conclusion (02:30 - 03:00)
- **Action**: Navigate to **"History"** in the sidebar (`/history`).
- **On Screen**: The Governance Audit Ledger displaying the full chronological timeline:
  - `SUBMITTED` ➔ `ANALYZED` ➔ `REVIEWER_CHANGES_REQUESTED` ➔ `CREATOR_REVISED` ➔ `REVIEWER_APPROVED`.
- **Action**: Click **"Export CSV"** to demonstrate one-click compliance export.
- **What to Say**:
  > *"Finally, for enterprise compliance officers and regulatory audits, ClaimLedger maintains an immutable append-only ledger of every single submission, analysis run, revision, and reviewer decision — exportable directly to CSV for compliance archives.*  
  > *With pure Java deterministic authority, pgvector RAG, and an intuitive two-pane workflow, ClaimLedger ensures that for your organisation: **every claim is accounted for**. Thank you!"*

