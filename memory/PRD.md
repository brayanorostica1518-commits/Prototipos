# SmartSecAssess - Product Requirements Document

## Overview
AI-powered security assessment platform for compliance auditing against ISO 27001, NIST CSF, OWASP, and other frameworks. Features a 3-stage analysis pipeline for professional audit-grade report generation.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, jsPDF, jsPDF-AutoTable, html2canvas, Shadcn/UI
- **Backend:** FastAPI, Motor (MongoDB async), emergentintegrations (Gemini LLM)
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0 via Emergent Auth

## Core Architecture: 3-Stage Analysis Pipeline
1. **Stage 1 - Classification:** AI analyzes documents, extracts compliance scores and classifies findings (critical/major/minor)
2. **Stage 2 - Technical Expansion:** For EACH finding, a dedicated LLM call generates: normative context, non-conformity description, technical analysis, CIA impact (C/I/A with justification), severity justification, risk evaluation (probability x impact), ISO 27002 recommendation, timeline, maturity level (0-5 CMMI)
3. **Stage 3 - Consolidated Report:** All expanded findings assembled into professional executive audit report

## Core Features
1. Google OAuth authentication with user data isolation
2. Chat-based AI security analysis against multiple frameworks
3. File upload (PDF, Excel, Word, CSV) for document analysis
4. Dashboard with compliance charts (bar + radar) + expanded findings display
5. Professional PDF report (audit-grade: cover, TOC, findings with CIA/risk/maturity, risk matrix, recommendations)
6. Word export
7. Session management (create, rename, delete)
8. Template library for common assessments
9. Onboarding tour for new users
10. Pipeline metadata display (timing, counts)

## Completed (Feb 2026)
- [x] Full Google OAuth 2.0 authentication
- [x] Chat interface with AI analysis
- [x] File upload and processing
- [x] Dashboard with charts
- [x] Session management (create/rename/delete)
- [x] Template library
- [x] Onboarding tour
- [x] Navy-blue cybersecurity theme
- [x] Mobile responsive design
- [x] Legal pages (Terms, Privacy)
- [x] FIX: Duplicate session creation bug (useRef pattern)
- [x] FIX: CORS blocking DELETE/PATCH methods
- [x] FIX: PATCH endpoint JSON body parsing
- [x] **NEW: 3-Stage Analysis Pipeline** (analysis_pipeline.py)
- [x] **NEW: Expanded findings display** on Dashboard with CIA, risk, maturity
- [x] **NEW: Professional PDF with expanded findings** (structured data, not text parsing)
- [x] **NEW: Pipeline progress indicator** in ChatInterface (3-stage visual)
- [x] **NEW: Pipeline metadata banner** on Dashboard

## Key Files
- `backend/analysis_pipeline.py` - 3-stage pipeline (Stage 1, 2, 3)
- `backend/server.py` - Main API, uses pipeline for /api/analyze
- `frontend/src/pages/ChatInterface.jsx` - Chat UI with pipeline progress
- `frontend/src/pages/Dashboard.jsx` - Dashboard + expanded findings + PDF export
- `frontend/src/pages/Login.jsx` - Login page
- `frontend/src/utils/api.js` - Axios config (360s timeout)

## Key API Endpoints
- POST /api/sessions - Create session
- GET /api/sessions - List sessions
- PATCH /api/sessions/{id} - Rename session (JSON body)
- DELETE /api/sessions/{id} - Delete session
- POST /api/analyze - 3-stage pipeline analysis (returns expanded_findings + pipeline_metadata)
- GET /api/sessions/{id}/messages - Get messages
- GET /api/sessions/{id}/analysis - Get analysis with expanded_findings
- POST /api/export/word - Export to Word

## P1 Tasks (Pending)
- Data retention scheduler (apscheduler)
- Handle Cloudflare proxy timeout for long pipeline runs (background task pattern)

## P2 Tasks
- Security hardening (HSTS, forced HTTPS)
- README documentation review

## P3 Tasks (Backlog)
- Backend refactoring (server.py -> modules)
- Frontend refactoring (ChatInterface.jsx -> smaller components)

## DB Schema
- `sessions`: id, user_id, title, retention_policy, expires_at, created_at, updated_at
- `messages`: session_id, role, content, file_names, timestamp
- `analysis_results`: session_id, user_id, frameworks, analysis, compliance_scores, gaps, **expanded_findings**, **pipeline_metadata**, **stage1_analysis**, timestamp
