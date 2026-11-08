# ClaimLedger – API contract expected by the frontend (v0.1)

Base path: `/api`. JSON everywhere except file upload (`multipart/form-data`).
Auth: `Authorization: Bearer <token>`. The backend enforces ALL permissions; the UI only hides what a role cannot use.
Errors: any non-2xx returns `{ "message": "<plain-language text safe to show a user>" }`.
Dates: ISO-8601 strings. Please also publish OpenAPI (springdoc) so the frontend can generate types.

## Two separate status enums (never mix)
- Claim state: `VERIFIED | VIOLATION | UNVERIFIED | CONFLICT`
- Submission status: `DRAFT | ANALYZING | IN_REVIEW | CHANGES_REQUESTED | APPROVED | REJECTED`
- Source status: `DRAFT | APPROVED | SUPERSEDED | EXPIRED`
- Roles: `ADMIN | CREATOR | MANAGER | REVIEWER`; Departments: `MARKETING | SALES | HR`

## Seeded demo accounts (password `demo`)
admin@nexora.test, creator@nexora.test, manager@nexora.test, reviewer@nexora.test

## Endpoints needed now (Phase 1-2: login + Submit)

### POST /auth/login
Request `{ "email": string, "password": string }`
Response `{ "token": string, "user": User }` · 401 on bad credentials.

### GET /me  →  `User`
`User = { id, name, email, role, department? }`

### POST /submissions   (multipart/form-data)
Fields: `title` (string), `department` (enum), `text` (string, optional), `file` (PDF ≤ 10 MB, optional). At least one of text/file.
Response `Submission` with `status = "ANALYZING"` (analysis runs asynchronously).

### GET /submissions/{id}  →  `Submission`
```
Submission = {
  id, title, department, status, text?, fileName?, createdBy, createdAt,
  progress?: { stage: "EXTRACTING_CLAIMS"|"CHECKING_SOURCES"|"PREPARING_FINDINGS"|"DONE",
               claimsFound: number, claimsChecked: number, sourcesAvailable: number }
}
```
The UI polls this every second while `status = ANALYZING` and shows `progress` (counts must be real).
When analysis finishes, status becomes `IN_REVIEW`.

### GET /submissions/{id}/findings  →  `Finding[]`
```
Finding = {
  id, claimText, span: [start, end],        // character offsets in the submitted text
  state: ClaimState,
  message: string,                          // ONE plain sentence, e.g. "Approved price is ₹999/month, not ₹799."
  authority?: {
    winner?: Source, approvedValue?: string,
    considered: [{ source: Source, outcome: "SUPERSEDED"|"SCOPED"|"AUTHORITATIVE"|"TIE"|"NOT_APPLICABLE",
                   value?: string, reason: string }]
  },
  suggestedFix?: string
}
Source = { id, name, version, status: SourceStatus, effectiveFrom?, effectiveTo? }
```

## Coming next (frontend will send exact shapes before building each screen)
- Reviews: `GET /reviews/queue`, `POST /reviews/{submissionId}/decision` `{decision: APPROVE|REJECT|REQUEST_CHANGES, comment}`; "Reopen" is a NEW recorded action, never a delete.
- Revisions: `POST /submissions/{id}/revisions`
- Knowledge Base: `GET/POST /sources`, `GET /claims`
- History: `GET /audit?submissionId=` (append-only)
- Home: `GET /home` (counts for the role's inbox; no hardcoded numbers)

## Environment
Frontend dev server proxies `/api` → `http://localhost:8080`. Allow CORS for the deployed frontend origin.
