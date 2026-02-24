"""
Test Report Templates API - CRUD endpoints + report generation with templates
Tests: upload, list, activate, delete, download templates and report generation
"""
import pytest
import requests
import os
import io
from pathlib import Path

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_TOKEN = os.environ.get('TEST_SESSION_TOKEN', '')
TEST_SESSION_ID = os.environ.get('TEST_SESSION_ID', '06396466-b614-4938-bfa8-b7fe45769191')

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def auth_headers():
    """Auth headers for API requests"""
    if not TEST_TOKEN:
        pytest.skip("No TEST_SESSION_TOKEN provided")
    return {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def auth_headers_multipart():
    """Auth headers for multipart/form-data uploads"""
    if not TEST_TOKEN:
        pytest.skip("No TEST_SESSION_TOKEN provided")
    return {
        "Authorization": f"Bearer {TEST_TOKEN}"
    }


@pytest.fixture
def sample_docx_file():
    """Create a minimal valid DOCX file for testing"""
    from docx import Document
    doc = Document()
    doc.add_heading("Test Template", level=1)
    doc.add_paragraph("{{ client_name }} - Test placeholder")
    doc.add_paragraph("{{ executive_summary }}")
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    return session


# ==================== API HEALTH ====================

class TestAPIHealth:
    """API Health Check"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "operational"


# ==================== NO ROUTE CONFLICT ====================

class TestNoRouteConflict:
    """Test that /api/templates (prompt templates) and /api/report-templates are separate"""
    
    def test_prompt_templates_endpoint_exists(self):
        """GET /api/templates returns prompt templates (no auth required)"""
        r = requests.get(f"{BASE_URL}/api/templates")
        assert r.status_code == 200
        data = r.json()
        assert "templates" in data
        # These are prompt templates with id, name, category fields
        if data["templates"]:
            assert "id" in data["templates"][0]
            assert "name" in data["templates"][0]
    
    def test_report_templates_endpoint_exists(self, auth_headers):
        """GET /api/report-templates returns user's report templates (auth required)"""
        r = requests.get(f"{BASE_URL}/api/report-templates", headers=auth_headers)
        assert r.status_code == 200
        # Returns a list (possibly empty)
        assert isinstance(r.json(), list)
    
    def test_report_templates_requires_auth(self):
        """GET /api/report-templates without auth returns 401"""
        r = requests.get(f"{BASE_URL}/api/report-templates")
        assert r.status_code == 401


# ==================== REPORT TEMPLATES CRUD ====================

class TestReportTemplatesUpload:
    """POST /api/report-templates/upload"""
    
    def test_upload_requires_auth(self, sample_docx_file):
        """Upload without auth returns 401"""
        files = {"file": ("test_template.docx", sample_docx_file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        r = requests.post(f"{BASE_URL}/api/report-templates/upload", files=files)
        assert r.status_code == 401
    
    def test_upload_valid_docx(self, auth_headers_multipart, sample_docx_file):
        """Upload valid DOCX template"""
        files = {"file": ("test_valid_template.docx", sample_docx_file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        r = requests.post(f"{BASE_URL}/api/report-templates/upload", files=files, headers=auth_headers_multipart)
        
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["name"] == "test_valid_template.docx"
        assert "checksum" in data
        
        # Store template_id for later tests
        os.environ['TEST_TEMPLATE_ID'] = data["id"]
        print(f"Uploaded template ID: {data['id']}")
    
    def test_upload_rejects_invalid_extension(self, auth_headers_multipart):
        """Upload file with wrong extension is rejected"""
        fake_file = io.BytesIO(b"not a docx content")
        files = {"file": ("test.pdf", fake_file, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/report-templates/upload", files=files, headers=auth_headers_multipart)
        
        assert r.status_code == 400
        assert "docx" in r.json().get("detail", "").lower() or "dotx" in r.json().get("detail", "").lower()


class TestReportTemplatesList:
    """GET /api/report-templates"""
    
    def test_list_templates(self, auth_headers):
        """List user's templates"""
        r = requests.get(f"{BASE_URL}/api/report-templates", headers=auth_headers)
        
        assert r.status_code == 200
        templates = r.json()
        assert isinstance(templates, list)
        
        # If we uploaded a template, it should be in the list
        if os.environ.get('TEST_TEMPLATE_ID'):
            ids = [t["id"] for t in templates]
            assert os.environ['TEST_TEMPLATE_ID'] in ids


class TestReportTemplatesActivate:
    """POST /api/report-templates/{id}/activate"""
    
    def test_activate_template(self, auth_headers):
        """Activate a template"""
        template_id = os.environ.get('TEST_TEMPLATE_ID')
        if not template_id:
            pytest.skip("No template ID from upload test")
        
        r = requests.post(f"{BASE_URL}/api/report-templates/{template_id}/activate", headers=auth_headers)
        
        assert r.status_code == 200
        assert "template_id" in r.json()
        
        # Verify template is now active
        r2 = requests.get(f"{BASE_URL}/api/report-templates", headers=auth_headers)
        templates = r2.json()
        
        active_template = next((t for t in templates if t["id"] == template_id), None)
        assert active_template is not None
        assert active_template["active"] is True
    
    def test_activate_nonexistent_template_returns_404(self, auth_headers):
        """Activating non-existent template returns 404"""
        r = requests.post(f"{BASE_URL}/api/report-templates/nonexistent-id/activate", headers=auth_headers)
        assert r.status_code == 404


class TestReportTemplatesDownload:
    """GET /api/report-templates/{id}/download"""
    
    def test_download_template(self, auth_headers):
        """Download an uploaded template"""
        template_id = os.environ.get('TEST_TEMPLATE_ID')
        if not template_id:
            pytest.skip("No template ID from upload test")
        
        r = requests.get(f"{BASE_URL}/api/report-templates/{template_id}/download", headers=auth_headers)
        
        assert r.status_code == 200
        assert "application/vnd.openxmlformats" in r.headers.get("Content-Type", "")
        assert len(r.content) > 0
        # DOCX files start with PK (ZIP signature)
        assert r.content[:2] == b'PK'
    
    def test_download_nonexistent_returns_404(self, auth_headers):
        """Download non-existent template returns 404"""
        r = requests.get(f"{BASE_URL}/api/report-templates/nonexistent-id/download", headers=auth_headers)
        assert r.status_code == 404


class TestReportGeneration:
    """POST /api/reports/generate - Report generation with template logic"""
    
    def test_generate_report_with_active_template(self, auth_headers):
        """Generate report uses active template if available"""
        r = requests.post(f"{BASE_URL}/api/reports/generate", 
            json={
                "session_id": TEST_SESSION_ID,
                "client_info": {
                    "client_name": "Test Template Client",
                    "unit": "IT Security",
                    "evaluator": "Automated Test",
                    "classification": "CONFIDENCIAL"
                }
            },
            headers=auth_headers,
            timeout=60
        )
        
        assert r.status_code == 200
        assert "application/vnd.openxmlformats" in r.headers.get("Content-Type", "")
        assert len(r.content) > 1000  # Should be a valid DOCX
        assert r.content[:2] == b'PK'
    
    def test_generate_report_requires_auth(self):
        """Report generation requires authentication"""
        r = requests.post(f"{BASE_URL}/api/reports/generate", 
            json={"session_id": TEST_SESSION_ID}
        )
        assert r.status_code == 401
    
    def test_generate_report_missing_session_id(self, auth_headers):
        """Report generation requires session_id"""
        r = requests.post(f"{BASE_URL}/api/reports/generate", 
            json={"client_info": {"client_name": "Test"}},
            headers=auth_headers
        )
        assert r.status_code == 400


class TestReportTemplatesDelete:
    """DELETE /api/report-templates/{id} - Run last"""
    
    def test_delete_template(self, auth_headers):
        """Delete a template"""
        template_id = os.environ.get('TEST_TEMPLATE_ID')
        if not template_id:
            pytest.skip("No template ID from upload test")
        
        r = requests.delete(f"{BASE_URL}/api/report-templates/{template_id}", headers=auth_headers)
        
        assert r.status_code == 200
        assert "eliminada" in r.json().get("message", "").lower()
        
        # Verify template no longer in list
        r2 = requests.get(f"{BASE_URL}/api/report-templates", headers=auth_headers)
        templates = r2.json()
        ids = [t["id"] for t in templates]
        assert template_id not in ids
    
    def test_delete_nonexistent_returns_404(self, auth_headers):
        """Delete non-existent template returns 404"""
        r = requests.delete(f"{BASE_URL}/api/report-templates/nonexistent-id", headers=auth_headers)
        assert r.status_code == 404


class TestBaseTemplateFile:
    """Verify base template exists and is valid"""
    
    def test_base_template_exists(self):
        """Base template file exists"""
        base_template_path = Path("/app/backend/uploads/templates/_base_template.docx")
        assert base_template_path.exists(), f"Base template not found at {base_template_path}"
        assert base_template_path.stat().st_size > 10000, "Base template too small"
    
    def test_base_template_is_valid_docx(self):
        """Base template is a valid DOCX file"""
        from docxtpl import DocxTemplate
        base_template_path = Path("/app/backend/uploads/templates/_base_template.docx")
        
        # Should not raise exception
        tpl = DocxTemplate(str(base_template_path))
        assert tpl is not None


class TestTemplateManagerFunctions:
    """Test template_manager.py functions"""
    
    def test_validate_template_file_function_exists(self):
        """validate_template_file function exists"""
        from template_manager import validate_template_file
        assert callable(validate_template_file)
    
    def test_compute_checksum_function_exists(self):
        """compute_checksum function exists"""
        from template_manager import compute_checksum
        assert callable(compute_checksum)
    
    def test_render_base_report_function_exists(self):
        """render_base_report function exists"""
        from template_manager import render_base_report
        assert callable(render_base_report)
    
    def test_prepare_template_context_function_exists(self):
        """prepare_template_context function exists"""
        from template_manager import prepare_template_context
        assert callable(prepare_template_context)
    
    def test_prepare_template_context_returns_expected_keys(self):
        """prepare_template_context returns dict with expected keys"""
        from template_manager import prepare_template_context
        
        analysis_data = {
            "compliance_scores": {"ISO 27001": 72},
            "frameworks": ["ISO 27001"],
            "expanded_findings": [],
            "gaps": [],
            "analysis": ""
        }
        client_info = {
            "client_name": "Test Client",
            "unit": "IT",
            "evaluator": "Tester"
        }
        
        context = prepare_template_context(analysis_data, client_info)
        
        expected_keys = [
            "client_name", "unit", "evaluator", "classification",
            "executive_summary", "methodology", "findings_text",
            "recommendations_text", "conclusion", "legal_note",
            "compliance_scores_text", "avg_score"
        ]
        
        for key in expected_keys:
            assert key in context, f"Missing key: {key}"


class TestReportGenerationWithBaseTemplate:
    """Test report generation when no custom template is active"""
    
    def test_generate_with_base_template(self, auth_headers):
        """Generate report with base template when no custom template is active"""
        # First ensure no template is active by checking the list
        r = requests.get(f"{BASE_URL}/api/report-templates", headers=auth_headers)
        templates = r.json()
        
        # If there's an active template, we can still generate (uses active)
        # If no active template, should use base template
        
        r2 = requests.post(f"{BASE_URL}/api/reports/generate", 
            json={
                "session_id": TEST_SESSION_ID,
                "client_info": {
                    "client_name": "Base Template Test",
                    "unit": "QA Dept",
                    "evaluator": "Test System",
                    "classification": "RESTRINGIDO",
                    "report_version": "v2.0",
                    "systems": ["ERP", "CRM"]
                }
            },
            headers=auth_headers,
            timeout=60
        )
        
        assert r2.status_code == 200
        # Should be valid DOCX
        assert r2.content[:2] == b'PK'
        # Should have reasonable size
        assert len(r2.content) > 5000


# ==================== CLEANUP ====================

@pytest.fixture(scope="module", autouse=True)
def cleanup():
    """Cleanup test data after all tests"""
    yield
    # Cleanup is handled by test_delete_template test
