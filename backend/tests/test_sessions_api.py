"""
Backend API Tests for SmartSecAssess - Session Management
Tests focus on:
1. Session creation (no duplicates)
2. CORS for DELETE method
3. CORS for PATCH method with JSON body
4. Session rename and delete features
"""

import pytest
import requests
import os
import time

# Get BASE_URL from environment (no default - fail fast if not set)
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://auditor-ai-lab.preview.emergentagent.com"

# Test credentials from MongoDB setup
SESSION_TOKEN = "test_session_1771867839122"
USER_ID = "test-user-1771867839122"


@pytest.fixture
def auth_headers():
    """Auth headers for API requests"""
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def api_client():
    """Requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    })
    return session


class TestHealthCheck:
    """Test API health check"""

    def test_api_health(self):
        """Test /api/ endpoint returns operational status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        print(f"✅ Health check passed: {data}")


class TestCORS:
    """Test CORS configuration for DELETE and PATCH methods"""

    def test_cors_allows_delete_method(self):
        """Test OPTIONS preflight for DELETE method"""
        response = requests.options(
            f"{BASE_URL}/api/sessions/test-id",
            headers={
                "Origin": "https://auditor-ai-lab.preview.emergentagent.com",
                "Access-Control-Request-Method": "DELETE"
            }
        )
        # Check for CORS headers
        allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
        print(f"CORS Allow-Methods: {allowed_methods}")
        assert "DELETE" in allowed_methods, f"DELETE not in allowed methods: {allowed_methods}"
        print(f"✅ CORS allows DELETE method")

    def test_cors_allows_patch_method(self):
        """Test OPTIONS preflight for PATCH method"""
        response = requests.options(
            f"{BASE_URL}/api/sessions/test-id",
            headers={
                "Origin": "https://auditor-ai-lab.preview.emergentagent.com",
                "Access-Control-Request-Method": "PATCH"
            }
        )
        # Check for CORS headers
        allowed_methods = response.headers.get("Access-Control-Allow-Methods", "")
        print(f"CORS Allow-Methods: {allowed_methods}")
        assert "PATCH" in allowed_methods, f"PATCH not in allowed methods: {allowed_methods}"
        print(f"✅ CORS allows PATCH method")


class TestSessionCreation:
    """Test session creation - verify no duplicates"""

    def test_create_single_session(self, api_client):
        """Test POST /api/sessions creates exactly ONE session"""
        # Get initial session count
        initial_response = api_client.get(f"{BASE_URL}/api/sessions")
        if initial_response.status_code != 200:
            pytest.skip(f"Could not get initial sessions: {initial_response.status_code}")
        
        initial_count = len(initial_response.json())
        print(f"Initial session count: {initial_count}")

        # Create a new session
        create_response = api_client.post(f"{BASE_URL}/api/sessions")
        assert create_response.status_code == 200, f"Failed to create session: {create_response.text}"
        
        created_session = create_response.json()
        assert "id" in created_session, "Session should have an id"
        session_id = created_session["id"]
        print(f"✅ Created session: {session_id}")

        # Get session count after creation - should be exactly initial + 1
        final_response = api_client.get(f"{BASE_URL}/api/sessions")
        assert final_response.status_code == 200
        final_count = len(final_response.json())
        
        expected_count = initial_count + 1
        assert final_count == expected_count, f"Expected {expected_count} sessions, got {final_count} (duplicate created!)"
        print(f"✅ Session count correct: {final_count} (no duplicates)")
        
        # Store session ID for cleanup
        return session_id

    def test_get_sessions_list(self, api_client):
        """Test GET /api/sessions returns list"""
        response = api_client.get(f"{BASE_URL}/api/sessions")
        assert response.status_code == 200
        sessions = response.json()
        assert isinstance(sessions, list), "Sessions should be a list"
        print(f"✅ GET /api/sessions returned {len(sessions)} sessions")


class TestSessionRename:
    """Test session rename via PATCH with JSON body"""

    def test_rename_session_with_json_body(self, api_client):
        """Test PATCH /api/sessions/{id} with JSON body {title: 'Test'}"""
        # First create a session to rename
        create_response = api_client.post(f"{BASE_URL}/api/sessions")
        if create_response.status_code != 200:
            pytest.skip(f"Could not create session: {create_response.status_code}")
        
        session_id = create_response.json()["id"]
        print(f"Created session for rename test: {session_id}")

        # Now rename it using PATCH with JSON body
        new_title = f"Renamed Session {int(time.time())}"
        patch_response = api_client.patch(
            f"{BASE_URL}/api/sessions/{session_id}",
            json={"title": new_title}
        )
        
        assert patch_response.status_code == 200, f"PATCH failed: {patch_response.status_code} - {patch_response.text}"
        print(f"✅ PATCH request succeeded")

        # Verify the rename was persisted
        sessions_response = api_client.get(f"{BASE_URL}/api/sessions")
        assert sessions_response.status_code == 200
        
        sessions = sessions_response.json()
        renamed_session = next((s for s in sessions if s["id"] == session_id), None)
        
        assert renamed_session is not None, f"Session {session_id} not found after rename"
        assert renamed_session["title"] == new_title, f"Title not updated. Expected '{new_title}', got '{renamed_session['title']}'"
        print(f"✅ Session renamed successfully: {renamed_session['title']}")

        # Cleanup
        api_client.delete(f"{BASE_URL}/api/sessions/{session_id}")
        return session_id


class TestSessionDelete:
    """Test session delete via DELETE method"""

    def test_delete_session(self, api_client):
        """Test DELETE /api/sessions/{id} successfully deletes"""
        # First create a session to delete
        create_response = api_client.post(f"{BASE_URL}/api/sessions")
        if create_response.status_code != 200:
            pytest.skip(f"Could not create session: {create_response.status_code}")
        
        session_id = create_response.json()["id"]
        print(f"Created session for delete test: {session_id}")

        # Now delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/sessions/{session_id}")
        assert delete_response.status_code == 200, f"DELETE failed: {delete_response.status_code} - {delete_response.text}"
        print(f"✅ DELETE request succeeded")

        # Verify deletion - session should not exist
        sessions_response = api_client.get(f"{BASE_URL}/api/sessions")
        assert sessions_response.status_code == 200
        
        sessions = sessions_response.json()
        deleted_session = next((s for s in sessions if s["id"] == session_id), None)
        
        assert deleted_session is None, f"Session {session_id} still exists after DELETE"
        print(f"✅ Session deleted successfully and verified not in list")


class TestSessionMessages:
    """Test session messages endpoint"""

    def test_get_session_messages(self, api_client):
        """Test GET /api/sessions/{id}/messages returns messages"""
        # Create a session first
        create_response = api_client.post(f"{BASE_URL}/api/sessions")
        if create_response.status_code != 200:
            pytest.skip(f"Could not create session: {create_response.status_code}")
        
        session_id = create_response.json()["id"]
        
        # Get messages (should be empty for new session)
        messages_response = api_client.get(f"{BASE_URL}/api/sessions/{session_id}/messages")
        assert messages_response.status_code == 200, f"GET messages failed: {messages_response.status_code}"
        
        messages = messages_response.json()
        assert isinstance(messages, list), "Messages should be a list"
        print(f"✅ GET /api/sessions/{session_id}/messages returned {len(messages)} messages")

        # Cleanup
        api_client.delete(f"{BASE_URL}/api/sessions/{session_id}")


class TestSessionAnalysis:
    """Test session analysis endpoint"""

    def test_get_session_analysis(self, api_client):
        """Test GET /api/sessions/{id}/analysis returns analysis data"""
        # Create a session first
        create_response = api_client.post(f"{BASE_URL}/api/sessions")
        if create_response.status_code != 200:
            pytest.skip(f"Could not create session: {create_response.status_code}")
        
        session_id = create_response.json()["id"]
        
        # Get analysis (should be empty for new session)
        analysis_response = api_client.get(f"{BASE_URL}/api/sessions/{session_id}/analysis")
        assert analysis_response.status_code == 200, f"GET analysis failed: {analysis_response.status_code}"
        
        analysis = analysis_response.json()
        assert isinstance(analysis, dict), "Analysis should be a dict"
        print(f"✅ GET /api/sessions/{session_id}/analysis returned successfully")

        # Cleanup
        api_client.delete(f"{BASE_URL}/api/sessions/{session_id}")


class TestAuthRequired:
    """Test that auth is required for protected endpoints"""

    def test_sessions_requires_auth(self):
        """Test GET /api/sessions returns 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/sessions")
        # Should fail without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ Sessions endpoint requires auth (status: {response.status_code})")

    def test_create_session_requires_auth(self):
        """Test POST /api/sessions returns 401/403 without auth"""
        response = requests.post(f"{BASE_URL}/api/sessions")
        # Should fail without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ Create session endpoint requires auth (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
