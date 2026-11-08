# ClaimLedger — Pitch Deck (CodeTitans India 2026)

> **Problem Statement**: Inkloom AI – Brand Governance  
> **Product**: ClaimLedger — *"Every claim, accounted for."*  
> **Author**: Ravikiran Swamy (`ravikiranswamy550@gmail.com`)  
> **Repository**: [https://github.com/Ravikiranswamy/ClaimLedger](https://github.com/Ravikiranswamy/ClaimLedger)  
> **Live Demo**: [https://claimledger.vercel.app](https://claimledger.vercel.app)  
> **Live Backend API**: [https://claimledger-backend.onrender.com](https://claimledger-backend.onrender.com)

---

## 📑 Slide 1: Title & Vision
### ClaimLedger
**"Every claim, accounted for."**  
*AI-Powered Organisational Brand Governance with Deterministic Authority Resolution.*

- **The Big Idea**: Transforming enterprise brand compliance from subjective, error-prone manual reviews into an automated, mathematically provable governance pipeline.
- **Presenter**: Ravikiran Swamy

---

## ⚠️ Slide 2: The Enterprise Problem
### The High Cost of Unchecked Claims
- **Marketing Reality**: Thousands of assets (social posts, pitch decks, proposals, ad copy) are created across multiple departments every week.
- **The Failure Mode**:
  - Outdated pricing published to prospects (e.g. legacy ₹799/mo instead of official ₹999/mo).
  - Unverified technical performance claims ("100% automated uptime", "unlimited cloud storage").
  - Departmental contradictions (Sales quoting different prices than Marketing).
- **Why Generic LLM Wrappers Fail**:
  - LLMs hallucinate facts.
  - LLMs suffer from non-deterministic variance (answering differently each run).
  - LLMs have no concept of institutional authority hierarchies or document expiration.

---

## 💡 Slide 3: The Breakthrough Solution
### Deterministic Authority Resolution (Pure Java)
ClaimLedger decouples language understanding from compliance truth:
1. **Gemini AI**: Extracts factual assertions and contextual spans from submitted text and PDFs.
2. **Neon pgvector**: Executes sub-5ms semantic similarity search across embedded knowledge chunks.
3. **🎯 Pure Java Resolution Engine (The Differentiator)**:
   - Does **NOT** ask the LLM *"Is this compliant?"*
   - Applies an institutional **6-Step Deterministic Rule Hierarchy** in pure compiled code.
   - Ensures that **Tier 1 Master Catalogues** unconditionally overrule **Tier 2 Scoped Proposals** and **Tier 3 Legacy Materials**.

---

## ⚙️ Slide 4: The 6-Step Rule Hierarchy
### How ClaimLedger Resolves Institutional Truth

```
[1. Status Rule]    ──► Discard non-approved or draft documents immediately.
[2. Temporal Rule]  ──► Enforce effective dates; detect expired or superseded catalogues.
[3. Scope Rule]     ──► Match product line, department jurisdiction, and region.
[4. Tier Hierarchy] ──► Tier 1 (Company Master) > Tier 2 (Departmental) > Tier 3 (Supporting).
[5. Numeric Fact]   ──► Strict arithmetic comparator for pricing, currencies (₹, $, €), and units.
[6. Escapement]     ──► Deterministic escalation to Authorised Reviewers with full audit trace.
```

---

## 🖥️ Slide 5: Product Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, TanStack Query, React Router v7.
- **Backend**: Java 17, Spring Boot 3.3.5, Spring Security + Stateless JWT, Apache PDFBox, Hibernate 6.
- **Data & AI Layer**: Neon Serverless PostgreSQL with `pgvector` (`aws-ap-southeast-1`), Google Gemini API (`gemini-3.8-flash` & `gemini-embedding-001`).
- **Cloud Infrastructure**: Vercel (Global Edge CDN), Render (Dockerized Java Web Service), Neon Cloud Database.

---

## 🎬 Slide 6: The Live Demo (Nexora Technologies)

1. **Knowledge Base (Admin)**: 4 master documents indexed across 3 tiers with 768-dim vectors in Neon pgvector.
2. **Creator Submission**: Marketing submits copy with outdated `₹799/mo` price.
3. **Instant Detection**: Two-pane finding inspector highlights the exact span in red and flags a `VIOLATION` against Tier 1 catalogue.
4. **Reviewer Loop**: Reviewer requests changes; Creator 1-clicks *"Fix with suggestions"*, auto-updating to `₹999/mo`.
5. **Auto-Verification**: Engine verifies revision 2 in milliseconds; Reviewer formally approves.
6. **Immutable Ledger**: Append-only audit trail records all 6 steps, exportable to CSV for compliance archives.

---

## 📈 Slide 7: Business Impact & Roadmap

- **90% Reduction** in manual legal/brand review turnaround time.
- **Zero Hallucination Risk** in compliance decisions through deterministic logic.
- **Multi-Jurisdiction Ready**: Ready for global brand teams across EMEA, APAC, and Americas.
- **Next Horizon**:
  - Figma & Canva live plugins (pre-flight checks before export).
  - Chrome Extension for Google Docs & Slack sales proposals.
  - Automated regulatory audit bundle generation (SOC2 / ISO 27001 Brand Integrity).

