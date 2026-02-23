# SmartSecAssess - Product Requirements Document

## Overview
AI-powered security assessment platform for compliance auditing against ISO 27001, NIST CSF, OWASP, and other frameworks. Features a 3-stage analysis pipeline with background processing and real-time progress polling.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, jsPDF, jsPDF-AutoTable, html2canvas, Shadcn/UI
- **Backend:** FastAPI (with BackgroundTasks), Motor (MongoDB async), emergentintegrations (Gemini LLM)
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0 via Emergent Auth

## Architecture: Background 3-Stage Pipeline
1. `POST /api/analyze` returns immediately with `task_id`
2. Pipeline runs in FastAPI BackgroundTask:
   - **Stage 1:** Classification (scores + findings)
   - **Stage 2:** Per-finding LLM expansion (parallel, max 3 concurrent)
   - **Stage 3:** Consolidated executive report
3. Frontend polls `GET /api/analyze/status/{task_id}` every 3s
4. Progress shown in real-time (stage1 → stage2 → stage3 → done)
5. On completion, frontend loads messages and shows report

## Key Files
- `backend/analysis_pipeline.py` - 3-stage pipeline with DB progress updates
- `backend/server.py` - API endpoints, background task launcher
- `frontend/src/pages/ChatInterface.jsx` - Chat UI with polling + stage progress
- `frontend/src/pages/Dashboard.jsx` - Dashboard + expanded findings + PDF export
- `frontend/src/utils/api.js` - Axios config

## Key API Endpoints
- POST /api/analyze → returns {task_id, status: "processing"} immediately
- GET /api/analyze/status/{task_id} → returns {status, stage, progress, ...}
- GET /api/sessions/{id}/analysis → returns expanded_findings, pipeline_metadata
- POST/GET/PATCH/DELETE /api/sessions

## DB Collections
- `sessions`: user sessions
- `messages`: chat messages
- `analysis_results`: scores, gaps, expanded_findings, pipeline_metadata
- `analysis_tasks`: task tracking (task_id, status, stage, progress)

## Completed (Feb 2026)
- [x] Google OAuth 2.0 authentication
- [x] 3-Stage Analysis Pipeline (background task)
- [x] Real-time pipeline progress polling
- [x] Expanded findings display (CIA, risk, maturity)
- [x] Professional PDF audit report
- [x] Session management (create/rename/delete)
- [x] Template library
- [x] Onboarding tour
- [x] Navy-blue cybersecurity theme, mobile responsive

## Pending
- P1: Data retention scheduler
- P2: Security hardening (HSTS)
- P3: Backend/frontend refactoring
