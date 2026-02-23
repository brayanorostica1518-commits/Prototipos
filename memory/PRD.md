# SmartSecAssess - Product Requirements Document

## Overview
AI-powered security assessment platform for compliance auditing against ISO 27001, NIST CSF, OWASP, and other frameworks. Features a 3-stage analysis pipeline with background processing and professional DOCX report generation.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, jsPDF, jsPDF-AutoTable, html2canvas, Shadcn/UI
- **Backend:** FastAPI (BackgroundTasks), Motor (MongoDB async), emergentintegrations (Gemini LLM), python-docx
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0 via Emergent Auth

## Architecture
### 3-Stage Analysis Pipeline (Background)
1. `POST /api/analyze` returns immediately with `task_id`
2. Pipeline runs in background: Stage 1 (Classification) → Stage 2 (Per-finding expansion, parallel) → Stage 3 (Executive report)
3. Frontend polls `GET /api/analyze/status/{task_id}` every 3s with real-time stage indicators

### Professional Report Generator
- `POST /api/reports/generate` accepts client_info + session_id, returns DOCX
- Backend: `report_generator.py` renders Big4-style document with python-docx
- Cover page, TOC, headers/footers, styled tables, Calibri font, formal margins
- Each finding: normative context, non-conformity, technical analysis, CIA impact, risk evaluation, ISO 27002 recommendation, timeline, maturity level

## Key Files
- `backend/analysis_pipeline.py` - 3-stage pipeline
- `backend/report_generator.py` - DOCX report generator
- `backend/server.py` - Main API
- `frontend/src/pages/ReportGenerator.jsx` - Report generation UI
- `frontend/src/pages/ChatInterface.jsx` - Chat UI with polling
- `frontend/src/pages/Dashboard.jsx` - Dashboard + expanded findings

## Key API Endpoints
- POST /api/analyze → {task_id} (background pipeline)
- GET /api/analyze/status/{task_id} → {status, stage, progress}
- POST /api/reports/generate → DOCX file download
- POST/GET/PATCH/DELETE /api/sessions
- GET /api/sessions/{id}/analysis → expanded_findings, pipeline_metadata

## Completed (Feb 2026)
- [x] Google OAuth 2.0 authentication
- [x] 3-Stage Analysis Pipeline (background task + polling)
- [x] Professional DOCX Report Generator (Big4 style)
- [x] Expanded findings display on Dashboard
- [x] Session management (create/rename/delete)
- [x] Template library, onboarding tour
- [x] Navy-blue cybersecurity theme, mobile responsive

## Pending
- P1: Data retention scheduler
- P2: Security hardening (HSTS)
- P3: Backend/frontend refactoring
