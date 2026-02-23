# SmartSecAssess - Product Requirements Document

## Overview
AI-powered security assessment platform for compliance auditing against ISO 27001, NIST CSF, OWASP, and other frameworks.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, jsPDF, Shadcn/UI
- **Backend:** FastAPI, Motor (MongoDB async), emergentintegrations (Gemini LLM)
- **Database:** MongoDB
- **Auth:** Google OAuth 2.0 via Emergent Auth

## Core Features
1. Google OAuth authentication with user data isolation
2. Chat-based AI security analysis against multiple frameworks
3. File upload (PDF, Excel, Word, CSV) for document analysis
4. Dashboard with compliance charts (bar + radar)
5. PDF report generation (audit-style professional reports)
6. Word export
7. Session management (create, rename, delete)
8. Template library for common assessments
9. Onboarding tour for new users
10. Data retention policy (72h default)

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
- [x] **FIX: Duplicate session creation bug** (useRef pattern)
- [x] **FIX: CORS blocking DELETE/PATCH methods**
- [x] **FIX: PATCH endpoint JSON body parsing**
- [x] **IMPROVED: Professional audit-style PDF report** (9 sections, cover page, TOC, findings, risk matrix, recommendations)

## P0 Issues (Resolved)
- ~~Duplicate session creation~~ FIXED

## P1 Tasks (In Progress)
- Data retention scheduler (apscheduler) - needs implementation
- PDF report user verification pending

## P2 Tasks
- Radar chart may show limited data if AI returns single framework scores
- Security hardening (HSTS, forced HTTPS)
- README documentation review

## P3 Tasks (Backlog)
- Backend refactoring (server.py -> modules)
- Frontend refactoring (ChatInterface.jsx -> smaller components)

## Key API Endpoints
- POST /api/sessions - Create session
- GET /api/sessions - List sessions
- PATCH /api/sessions/{id} - Rename session (JSON body: {title})
- DELETE /api/sessions/{id} - Delete session
- POST /api/analyze - Run AI analysis
- GET /api/sessions/{id}/messages - Get messages
- GET /api/sessions/{id}/analysis - Get analysis
- POST /api/export/word - Export to Word

## Key Files
- backend/server.py - Main API
- frontend/src/pages/ChatInterface.jsx - Chat UI
- frontend/src/pages/Dashboard.jsx - Dashboard + PDF export
- frontend/src/pages/Login.jsx - Login page
