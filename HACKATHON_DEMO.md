# ClaimLedger — CodeTitans India 2026 · Hackathon Demo Guide

> **Team**: ClaimLedger  
> **Track**: Enterprise AI / Brand Governance  
> **Stack**: Spring Boot 3 · React 18 · TypeScript · PostgreSQL (Neon) · Google Gemini

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Demo Credentials](#2-demo-credentials)
3. [Architecture Overview](#3-architecture-overview)
4. [Scenario 1 — Price Violation Detection](#4-scenario-1--price-violation-detection)
5. [Scenario 2 — Semantic Revision Diff](#5-scenario-2--semantic-revision-diff)
6. [Scenario 3 — Campaign Governance · Diwali Exception](#6-scenario-3--campaign-governance--diwali-exception)
7. [Scenario 4 — Expired Campaign · VIOLATION](#7-scenario-4--expired-campaign--violation)
8. [Scenario 5 — Visual Brand Intelligence (CIELAB)](#8-scenario-5--visual-brand-intelligence-cielab)
9. [Scenario 6 — Pre-Flight API Workbench](#9-scenario-6--pre-flight-api-workbench)
10. [Chrome Extension Roadmap](#10-chrome-extension-roadmap)
11. [Verification Checklist](#11-verification-checklist)
12. [API Reference](#12-api-reference)

---

## 1. Quick Start

### Prerequisites
- Java 21+, Maven 3.9+
- Node.js 20+, npm 10+
- Access to the Neon DB (connection string in `backend/src/main/resources/application.properties`)

### Start Backend
```bash
cd backend
./mvnw spring-boot:run
# → Listening on http://localhost:8080
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Seed Demo Data (optional — for pre-populated results)
```sql
-- Run in Neon SQL editor:
-- backend/src/main/resources/db/demo/seed_demo_submissions.sql
```

---

## 2. Demo Credentials

| Role | Email | Password | Capabilities |
|------|-------|----------|-------------|
| **Admin** | `admin@nexora.com` | `Demo@1234` | Full access — campaigns, users, all submissions |
| **Creator** | `creator@nexora.com` | `Demo@1234` | Submit content, view own submissions |
| **Reviewer** | `reviewer@nexora.com` | `Demo@1234` | Review queue, approve/reject, semantic diff |
| **Dept Manager** | `deptmanager@nexora.com` | `Demo@1234` | Department submissions, campaign validation |

> **Tip for judges**: Log in as **Admin** first to see the full navigation and all features.

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        React Frontend                          │
│  Submit → ReviewDetail → RevisionDiffModal → PreFlightWorkbench│
└───────────────────────────┬────────────────────────────────────┘
                            │ REST / JWT
┌───────────────────────────▼────────────────────────────────────┐
│                     Spring Boot Backend                        │
│                                                                │
│  SubmissionWorkflow → ClaimVerification → AuthorityResolution  │
│       ↓                    ↓                   ↓               │
│  ClaimExtraction    VisualAnalysis(CIELAB)  CampaignService    │
│       ↓                    ↓                   ↓               │
│  SemanticDiff        RAG Retrieval         PreFlightService    │
└───────────────────────────┬────────────────────────────────────┘
                            │ SQL
┌───────────────────────────▼────────────────────────────────────┐
│              PostgreSQL on Neon (Serverless)                   │
│  submissions · claims · campaigns · evidences · kb_documents   │
└────────────────────────────────────────────────────────────────┘
```

**Key Design Principles**:
- Authority resolution is **deterministic Java logic** — never raw LLM output
- CIELAB ΔE76 color science (threshold 25.0) — not Euclidean RGB distance
- Campaign governance: Creators cannot self-declare exceptions; all codes validated against DB

---

## 4. Scenario 1 — Price Violation Detection

**What it proves**: The core RAG-powered claim verification catches outdated/wrong pricing instantly.

### Steps
1. Log in as **Creator** (`creator@nexora.com`)
2. Navigate to **Submit** (`/submit`)
3. Click **🚨 Test Scenario 1: Outdated Price in Text (₹799 vs ₹999)**
4. Click **Submit for Review**
5. Wait ~3–5 seconds for AI processing
6. Navigate to **Submissions** → open the new submission
7. In **ReviewDetail**, observe the **Claims** section

### Expected Result
| Claim | Type | Status | Detail |
|-------|------|--------|--------|
| "₹799 per month" | PRICING | 🔴 **VIOLATION** | Contradicts master price ₹999 · Authority Tier: MASTER_RECORD |

### Why It Matters
The system retrieved the authoritative ₹999 price from the Knowledge Base (RAG), matched it against the submission's claim, and surfaced a clear VIOLATION — no human pre-screening needed.

---

## 5. Scenario 2 — Semantic Revision Diff

**What it proves**: When a creator revises their submission, the system semantically diffs old vs new claims and highlights exactly what changed — not just a text diff, but a structured attribute-level diff.

### Steps
1. Submit **Scenario 1** (₹799 violation — see above)
2. As **Creator**, go to the submission's ReviewDetail
3. Click **Edit / Revise** — change ₹799 to ₹999 in the text
4. Submit revision
5. As **Reviewer**, open the same submission
6. Click **Semantic Diff** button in the ReviewDetail header
7. In the **Revision Diff Modal**, select **Revision 1 → Revision 2**

### Expected Result
- **Changed attribute**: `price` → `₹799` changed to `₹999`
- **Claim status**: VIOLATION → VERIFIED
- **Revision badge** on the submission card shows `v2`

### Why It Matters
Reviewers instantly understand what changed between revisions without reading walls of text.

---

## 6. Scenario 3 — Campaign Governance · Diwali Exception

**What it proves**: The campaign governance engine recognizes active campaign codes and correctly allows price exceptions that would otherwise be violations.

### Steps
1. Log in as **Creator**
2. Navigate to **Submit**
3. Click **🎉 Test Scenario 5: Diwali Campaign Exception (DIWALI_SPECIAL + ₹799)**
4. Note the **Campaign Code** field is pre-filled with `DIWALI_SPECIAL`
5. Click **Submit for Review**
6. Open the resulting submission in ReviewDetail

### Expected Result
| Claim | Type | Status | Detail |
|-------|------|--------|--------|
| "₹799 per user per month" | PRICING | ✅ **VERIFIED** | Approved under DIWALI_SPECIAL campaign |
| "DIWALI_SPECIAL campaign reference" | CAMPAIGN_GOVERNANCE | ✅ **VERIFIED** | Active 2026-10-01 → 2026-12-31 |

### Verify Campaign Registry
1. Navigate to **Campaigns** (`/campaigns`) as **Admin**
2. Confirm `DIWALI_SPECIAL` shows status **ACTIVE** with dates Oct–Dec 2026
3. Click **Validate** → enter `DIWALI_SPECIAL` → see **VALID** response

### Why It Matters
The same price (₹799) that caused a VIOLATION in Scenario 1 is VERIFIED here — because the campaign exception is registered and active. This demonstrates scoped authority resolution.

---

## 7. Scenario 4 — Expired Campaign · VIOLATION

**What it proves**: Referencing an expired campaign is immediately flagged as a governance violation — not silently ignored.

### Steps
1. Log in as **Creator**
2. Navigate to **Submit**
3. Click **🚫 Test Scenario 6: Expired Campaign Reference (SUMMER_FLASH_2025)**
4. Submit → open ReviewDetail

### Expected Result
| Claim | Type | Status | Detail |
|-------|------|--------|--------|
| "₹699 per user per month" | PRICING | 🔴 **VIOLATION** | No active campaign covers ₹699 |
| "SUMMER_FLASH_2025 campaign reference" | CAMPAIGN_GOVERNANCE | 🔴 **VIOLATION** | Campaign expired 2025-08-31 |

### Why It Matters
Expired campaigns are not accepted as valid exceptions — the governance engine has temporal awareness.

---

## 8. Scenario 5 — Visual Brand Intelligence (CIELAB)

**What it proves**: Image submissions are analyzed with perceptual color science (CIELAB ΔE76), not just basic RGB comparison. The system detects off-brand colors that would pass a simple hex check.

### Steps
1. Log in as **Creator**
2. Navigate to **Submit**
3. Click **🖼️ Test Scenario 4: Visual Campaign Banner**
4. Upload any PNG/JPG image (ideally one with a non-brand color like red `#C0392B`)
5. Submit → open ReviewDetail

### Expected Result in ReviewDetail
- **Visual Brand & Color Science Inspector** card visible
- **Dominant Color Swatches** shown with CIELAB ΔE76 values
- If ΔE76 > 25.0: 🔴 **OFF-BRAND** badge
- If ΔE76 ≤ 25.0: ✅ **ON-BRAND** badge
- **Logo Clearance** banner indicating detection status

### CIELAB vs RGB
| Method | Metric | Perceptually Accurate? |
|--------|--------|----------------------|
| Euclidean RGB | Euclidean distance | ❌ No |
| CIELAB ΔE76 | Perceptual color difference | ✅ Yes |

The system uses **CIELAB ΔE76** exclusively. Threshold: **25.0**.

---

## 9. Scenario 6 — Pre-Flight API Workbench

**What it proves**: Developers can check content against ClaimLedger's full rule engine *before* submitting — getting structured JSON feedback in milliseconds with no content stored.

### Steps (UI)
1. Navigate to **Pre-Flight** (`/preflight`)
2. Select mode: **Lightweight** or **Full Pipeline**
3. Click any of the 4 quick-pick scenarios (or paste custom text)
4. Click **Run Pre-Flight Check**
5. Observe:
   - **Latency badge** (ms)
   - **Summary bar** (Violations / Verified / Conflicts / Unverified)
   - **Per-claim cards** with status badges

### Steps (cURL)
The workbench generates a live cURL command. Example:

```bash
curl -X POST http://localhost:8080/api/preflight/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "text": "Get Nexora Pro for ₹799 per month",
    "mode": "LIGHTWEIGHT",
    "campaignCode": null,
    "departmentId": "d0000001-0000-0000-0000-000000000001"
  }'
```

### Expected Response Shape
```json
{
  "mode": "LIGHTWEIGHT",
  "latencyMs": 142,
  "totalClaims": 1,
  "violations": 1,
  "verified": 0,
  "conflicts": 0,
  "unverified": 0,
  "compliant": false,
  "summary": "1 violation(s) detected: price claim contradicts master record",
  "claims": [
    {
      "claimText": "₹799 per month",
      "status": "VIOLATION",
      "reason": "Contradicts authoritative price ₹999",
      "authoritySource": "MASTER_RECORD",
      "confidence": 0.97
    }
  ]
}
```

### Mode Comparison
| Feature | LIGHTWEIGHT | FULL PIPELINE |
|---------|------------|---------------|
| Extraction | Heuristic regex | Gemini LLM |
| RAG chunks | Top-3 | Top-5 |
| Campaign check | ✅ | ✅ |
| Latency | Lower | Higher |
| Use case | Dev iteration | Pre-submit gate |

---

## 10. Chrome Extension (Live & Functional)

The Chrome Extension is **fully implemented** under the `extension/` directory as a zero-dependency Manifest V3 browser extension.

### Concept & Features
Allows copywriters, marketers, and sales reps to highlight claims on **any external webpage** (CMS, Google Docs, Notion, Social Media) and perform instant pre-flight checks against ClaimLedger's knowledge base.

- **Manifest V3 Architecture**: Ultra-fast, lightweight, compliant with latest Chrome Web Store standards.
- **Context Menu Integration**: Right-click highlighted text on any page → select *"Verify with ClaimLedger"* to automatically transfer text into the pre-flight verification pipeline.
- **Selection Capture**: One-click *"✂️ Capture Selection"* pulls text directly from active browser tabs via Chrome scripting API.
- **One-Click Demo Authentication**: Instant switch between `Demo Creator` and `Demo Admin`, or custom backend endpoint configuration.
- **Real-Time Governance Display**:
  - Millisecond latency badge
  - Overall compliance banner (Compliant vs Violations)
  - Color-coded claim pills (`VIOLATION`, `VERIFIED`, `CONFLICT`)
  - Ground truth authoritative source citations and suggested corrections

### How to Load and Test
1. In Chrome, navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"** and select:
   ```
   c:\Users\Ravikiran Swamy\Downloads\Documents\Projects\ClaimLedger\extension
   ```
4. Click the ClaimLedger icon in the toolbar, pick a scenario (or capture text from any webpage), and click **Verify Content**.

### Extension Structure
```
extension/
├── manifest.json        # Manifest V3 configuration with activeTab & contextMenus
├── background.js        # Service worker managing context menus and badge alerts
├── popup.html           # Modern enterprise popup UI matching ClaimLedger design
├── popup.css            # Scoped design tokens and responsive typography
├── popup.js             # Pre-flight API integration, auth state & selection capture
├── content.js           # Content script for in-page interaction
├── icons/               # 16x16, 48x48, 128x128 icons
└── README.md            # Quick-start installation instructions
```

---

## 11. Verification Checklist

Run these commands to confirm everything passes before the judge's demo:

### Backend Tests
```bash
cd c:\Users\Ravikiran Swamy\Downloads\Documents\Projects\ClaimLedger
& .\backend\mvnw.cmd test -f .\backend\pom.xml
```
**Expected**: `Tests run: 25, Failures: 0, Errors: 0`

Test breakdown:
- ✅ 5 × AuthorityResolutionService tests
- ✅ 2 × KnowledgeBaseService tests  
- ✅ 5 × CampaignService tests
- ✅ 2 × PreFlightService tests
- ✅ 3 × SemanticDiffService tests
- ✅ 3 × SubmissionRevisionService tests
- ✅ 5 × VisualAnalysisService tests

### Frontend Build
```bash
npm --prefix frontend run build
```
**Expected**: `✓ built in X.XXs` with 0 TypeScript errors

### Feature Checklist

| Phase | Feature | Test Command / UI Path | Expected |
|-------|---------|----------------------|----------|
| 1 | Revision History | Submit → Revise → ReviewDetail | v2 badge + revision history tab |
| 2 | CIELAB Color Analysis | Submit IMAGE → ReviewDetail | Color Inspector card with ΔE76 values |
| 3 | Semantic Diff | Submit → Revise → "Semantic Diff" button | Modal showing attribute-level changes |
| 4 | Campaign Governance | Submit with DIWALI_SPECIAL | VERIFIED claim with campaign note |
| 4 | Expired Campaign | Submit with SUMMER_FLASH_2025 | VIOLATION claim on campaign |
| 5 | Pre-Flight API | `/preflight` → Run Check | JSON findings with latency badge |
| 5 | Pre-Flight cURL | `/preflight` → Copy cURL | Valid curl command with Bearer token |

### DB Validation
```sql
-- Run in Neon SQL editor to confirm schema:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Expected: campaigns, claims, evidences, flyway_schema_history, 
--           knowledge_documents, submissions, submission_revisions, users, ...
```

---

## 12. API Reference

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | None | Get JWT token |
| `GET` | `/api/submissions` | JWT | List all submissions |
| `POST` | `/api/submissions` | JWT (CREATOR+) | Submit new content |
| `GET` | `/api/submissions/{id}` | JWT | Submission + claims detail |
| `GET` | `/api/submissions/{id}/diff` | JWT | Semantic diff (`?from=1&to=2`) |
| `GET` | `/api/campaigns` | JWT | List campaigns |
| `POST` | `/api/campaigns` | JWT (ADMIN/MGR) | Register campaign |
| `GET` | `/api/campaigns/validate/{code}` | JWT | Validate campaign code |
| `POST` | `/api/preflight/check` | JWT | Pre-flight content check |

### Pre-Flight Request Schema
```typescript
{
  text: string;           // Content to analyze
  mode: "LIGHTWEIGHT" | "FULL";
  campaignCode?: string;  // Optional campaign context
  departmentId?: string;  // Optional department context
}
```

### Campaign Validation Response
```typescript
{
  code: string;
  result: "VALID" | "INVALID" | "EXPIRED" | "NOT_REFERENCED";
  campaign?: {
    id: string;
    name: string;
    validFrom: string;  // ISO date
    validTo: string;
    isActive: boolean;
  }
}
```

---

*ClaimLedger · CodeTitans India 2026 · Built with ❤️ and CIELAB color science*

