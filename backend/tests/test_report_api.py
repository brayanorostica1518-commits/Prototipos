"""
Test cases for Report Generation API and DOCX generation
Tests:
- POST /api/reports/generate endpoint
- DOCX file generation quality
- report_generator.py module functionality
- GET /api/analyze/status/{task_id} endpoint
"""
import pytest
import requests
import os
import io
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://compliance-audit-ai-1.preview.emergentagent.com"

# Test data created by MongoDB setup
TEST_SESSION_TOKEN = "test_report_1771886002058"
TEST_USER_ID = "test-report-user-1771886002058"
TEST_SESSION_ID = "test-session-report-1771886002085"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_SESSION_TOKEN}"
    })
    return session


@pytest.fixture
def unauthenticated_client():
    """Client without auth token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================== API Health Tests ====================

class TestAPIHealth:
    """Test API availability"""
    
    def test_api_health_returns_operational(self, api_client):
        """Test GET /api/ returns operational status"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        print("PASSED: API health check - status is operational")


# ==================== Report Generation Endpoint Tests ====================

class TestReportGenerateEndpoint:
    """Tests for POST /api/reports/generate"""
    
    def test_report_generate_requires_auth(self, unauthenticated_client):
        """Test that report generation requires authentication"""
        response = unauthenticated_client.post(f"{BASE_URL}/api/reports/generate", json={
            "session_id": TEST_SESSION_ID,
            "client_info": {"client_name": "Test Corp"}
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASSED: Report generation requires authentication")
    
    def test_report_generate_invalid_session(self, api_client):
        """Test report generation with invalid session ID returns 400/403/404"""
        response = api_client.post(f"{BASE_URL}/api/reports/generate", json={
            "session_id": "invalid-session-id-12345",
            "client_info": {"client_name": "Test Corp"}
        })
        assert response.status_code in [400, 403, 404], f"Expected 400/403/404, got {response.status_code}"
        print("PASSED: Invalid session ID handled correctly")
    
    def test_report_generate_missing_session_id(self, api_client):
        """Test report generation without session_id returns 400"""
        response = api_client.post(f"{BASE_URL}/api/reports/generate", json={
            "client_info": {"client_name": "Test Corp"}
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASSED: Missing session_id returns 400")
    
    def test_report_generate_returns_docx(self, api_client):
        """Test report generation returns valid DOCX file"""
        response = api_client.post(f"{BASE_URL}/api/reports/generate", json={
            "session_id": TEST_SESSION_ID,
            "format": "docx",
            "client_info": {
                "client_name": "Test Corporation S.A.",
                "unit": "IT Department",
                "evaluator": "Test Evaluator",
                "classification": "CONFIDENCIAL"
            }
        }, timeout=120)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text[:500] if response.status_code != 200 else ''}"
        
        # Verify content type is DOCX
        content_type = response.headers.get("Content-Type", "")
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type, \
            f"Expected DOCX content type, got: {content_type}"
        
        # Verify Content-Disposition header has filename
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition.lower(), "Expected attachment in Content-Disposition"
        assert ".docx" in content_disposition.lower(), "Expected .docx extension in filename"
        
        # Verify file size is reasonable (> 5KB for a proper DOCX)
        file_size = len(response.content)
        assert file_size > 5000, f"DOCX file too small: {file_size} bytes"
        
        # Verify DOCX magic bytes (PK zip signature)
        assert response.content[:2] == b'PK', "Invalid DOCX file - missing PK signature"
        
        print(f"PASSED: Report generation returns valid DOCX ({file_size} bytes)")
    
    def test_report_generate_with_logo_base64(self, api_client):
        """Test report generation accepts logo_base64 parameter"""
        # Small valid PNG (1x1 pixel)
        logo_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        response = api_client.post(f"{BASE_URL}/api/reports/generate", json={
            "session_id": TEST_SESSION_ID,
            "client_info": {
                "client_name": "Logo Test Corp",
                "classification": "USO INTERNO"
            },
            "logo_base64": logo_base64
        }, timeout=120)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 5000, "DOCX file too small"
        print("PASSED: Report generation accepts logo_base64")


# ==================== Analysis Status Endpoint Tests ====================

class TestAnalyzeStatusEndpoint:
    """Tests for GET /api/analyze/status/{task_id}"""
    
    def test_status_endpoint_requires_auth(self, unauthenticated_client):
        """Test that status endpoint requires authentication"""
        response = unauthenticated_client.get(f"{BASE_URL}/api/analyze/status/fake-task-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASSED: Status endpoint requires authentication")
    
    def test_status_endpoint_invalid_task_returns_404(self, api_client):
        """Test that invalid task ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/analyze/status/non-existent-task-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASSED: Invalid task ID returns 404")


# ==================== Session Analysis Endpoint Tests ====================

class TestSessionAnalysisEndpoint:
    """Tests for GET /api/sessions/{id}/analysis"""
    
    def test_analysis_returns_expanded_findings(self, api_client):
        """Test that session analysis returns expanded_findings field"""
        response = api_client.get(f"{BASE_URL}/api/sessions/{TEST_SESSION_ID}/analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "expanded_findings" in data, "Missing expanded_findings in response"
        assert isinstance(data["expanded_findings"], list), "expanded_findings should be a list"
        
        if len(data["expanded_findings"]) > 0:
            finding = data["expanded_findings"][0]
            # Check expanded finding structure
            expected_fields = ["id", "framework", "control", "severity"]
            for field in expected_fields:
                assert field in finding, f"Missing field '{field}' in expanded finding"
            print(f"PASSED: Analysis returns {len(data['expanded_findings'])} expanded findings with correct structure")
        else:
            print("PASSED: Analysis returns expanded_findings (empty list)")
    
    def test_analysis_returns_compliance_scores(self, api_client):
        """Test that session analysis returns compliance_scores"""
        response = api_client.get(f"{BASE_URL}/api/sessions/{TEST_SESSION_ID}/analysis")
        assert response.status_code == 200
        
        data = response.json()
        assert "compliance_scores" in data, "Missing compliance_scores in response"
        assert isinstance(data["compliance_scores"], dict), "compliance_scores should be a dict"
        print(f"PASSED: Analysis returns compliance_scores: {data['compliance_scores']}")


# ==================== Report Generator Module Tests ====================

class TestReportGeneratorModule:
    """Tests for report_generator.py module"""
    
    def test_generate_report_docx_function_exists(self):
        """Test that generate_report_docx function can be imported"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            from report_generator import generate_report_docx
            assert callable(generate_report_docx), "generate_report_docx should be callable"
            print("PASSED: generate_report_docx function exists and is callable")
        except ImportError as e:
            pytest.fail(f"Could not import report_generator module: {e}")
    
    def test_generate_report_docx_with_test_data(self):
        """Test generate_report_docx with mock analysis data"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            from report_generator import generate_report_docx
            
            # Mock analysis data
            analysis_data = {
                "frameworks": ["ISO 27001"],
                "compliance_scores": {"ISO 27001": 75},
                "analysis": "Test executive report",
                "gaps": [{"framework": "ISO 27001", "description": "Test gap", "severity": "high"}],
                "expanded_findings": [
                    {
                        "id": "HAL-001",
                        "framework": "ISO 27001",
                        "control": "A.8.5",
                        "control_name": "Test Control",
                        "description": "Test description",
                        "severity": "critical",
                        "normative_context": "Test context",
                        "nonconformity_description": "Test nonconformity",
                        "technical_analysis": "Test analysis",
                        "cia_impact": {
                            "confidentiality": {"level": "ALTO", "justification": "Test"},
                            "integrity": {"level": "MEDIO", "justification": "Test"},
                            "availability": {"level": "BAJO", "justification": "Test"}
                        },
                        "risk_evaluation": {
                            "probability": "ALTA",
                            "impact": "CRÍTICO",
                            "risk_level": "CRÍTICO",
                            "risk_calculation": "ALTA x CRÍTICO = CRÍTICO"
                        },
                        "recommendation": "Test recommendation",
                        "suggested_timeline": "0-30 días",
                        "maturity_level": 2,
                        "maturity_description": "Level 2"
                    }
                ]
            }
            
            client_info = {
                "client_name": "Test Client",
                "unit": "IT Dept",
                "evaluator": "Test Evaluator",
                "classification": "CONFIDENCIAL"
            }
            
            result = generate_report_docx(analysis_data, client_info)
            
            # Verify it returns a BytesIO object
            assert hasattr(result, 'read'), "Result should be a file-like object"
            content = result.read()
            assert len(content) > 5000, f"DOCX too small: {len(content)} bytes"
            assert content[:2] == b'PK', "Invalid DOCX - missing PK signature"
            
            print(f"PASSED: generate_report_docx produces valid DOCX ({len(content)} bytes)")
            
        except Exception as e:
            pytest.fail(f"generate_report_docx failed: {e}")


# ==================== CORS Tests ====================

class TestCORSForReportEndpoint:
    """Test CORS configuration for report endpoints"""
    
    def test_cors_preflight_reports_generate(self, api_client):
        """Test CORS preflight for /api/reports/generate"""
        response = requests.options(
            f"{BASE_URL}/api/reports/generate",
            headers={
                "Origin": "https://compliance-audit-ai-1.preview.emergentagent.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        )
        assert response.status_code in [200, 204], f"CORS preflight failed: {response.status_code}"
        
        cors_header = response.headers.get("Access-Control-Allow-Origin", "")
        assert cors_header, "Missing Access-Control-Allow-Origin header"
        print("PASSED: CORS preflight for /api/reports/generate")


# ==================== Sessions Endpoint Tests ====================

class TestSessionsEndpoint:
    """Tests for GET /api/sessions (needed for ReportGenerator dropdown)"""
    
    def test_sessions_returns_list(self, api_client):
        """Test that GET /api/sessions returns a list"""
        response = api_client.get(f"{BASE_URL}/api/sessions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Sessions should return a list"
        
        if len(data) > 0:
            session = data[0]
            assert "id" in session, "Session missing 'id' field"
            assert "title" in session, "Session missing 'title' field"
        
        print(f"PASSED: Sessions endpoint returns {len(data)} sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
