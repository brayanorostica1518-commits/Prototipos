# SmartSecAssess - Product Requirements Document

## Overview
AI-powered security assessment platform for compliance auditing. Features 3-stage analysis pipeline, professional DOCX report generation with template management, and real-time progress tracking.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, jsPDF, Shadcn/UI
- **Backend:** FastAPI (BackgroundTasks), Motor (MongoDB), emergentintegrations (Gemini), python-docx, docxtpl
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0 via Emergent Auth

## Architecture

### 3-Stage Analysis Pipeline (Background)
POST /api/analyze → task_id → polls /api/analyze/status/{id} → Stage1→2→3→done

### Template-Based Report Generation
1. User uploads DOCX/DOTX templates with Jinja2 placeholders
2. On generate: if active template → docxtpl render; else → base template render
3. Returns professional DOCX with cover, TOC, headers, styled tables, expanded findings

## Key API Endpoints
- POST /api/analyze → {task_id} (background)
- GET /api/analyze/status/{task_id} → progress
- POST /api/reports/generate → DOCX download
- POST /api/report-templates/upload → upload template
- GET /api/report-templates → list templates
- POST /api/report-templates/{id}/activate
- DELETE /api/report-templates/{id}
- GET /api/report-templates/{id}/download
- CRUD /api/sessions

## Key Files
- `backend/analysis_pipeline.py` - 3-stage pipeline
- `backend/template_manager.py` - Template CRUD + docxtpl rendering
- `backend/report_generator.py` - Programmatic DOCX fallback
- `backend/server.py` - All API endpoints
- `frontend/src/pages/ReportGenerator.jsx` - Templates tab + Generate tab
- `frontend/src/pages/ChatInterface.jsx` - Chat + polling
- `frontend/src/pages/Dashboard.jsx` - Dashboard + expanded findings

## Completed (Feb 2026)
- [x] Google OAuth 2.0
- [x] 3-Stage Analysis Pipeline (background + polling)
- [x] Template management (upload/activate/delete/download)
- [x] Professional DOCX with docxtpl (template or base)
- [x] Enhanced form (name, unit, evaluator, date, version, classification, systems, logo)
- [x] Session management (create/rename/delete)
- [x] Navy-blue cybersecurity theme, mobile responsive

## Pending
- P1: Data retention scheduler
- P2: Security hardening (HSTS)
- P3: Backend/frontend refactoring
