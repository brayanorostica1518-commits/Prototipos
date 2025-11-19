import requests
import sys
import json
import tempfile
import os
from datetime import datetime
from pathlib import Path

class AssessmentAPITester:
    def __init__(self, base_url="https://compliance-check-21.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = None
        self.uploaded_files = []
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_create_session(self):
        """Test session creation"""
        success, response = self.run_test(
            "Create Session",
            "POST",
            "sessions",
            200
        )
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Session ID: {self.session_id}")
            return True
        return False

    def test_get_sessions(self):
        """Test getting sessions"""
        success, response = self.run_test(
            "Get Sessions",
            "GET",
            "sessions",
            200
        )
        return success

    def test_file_upload(self):
        """Test file upload functionality"""
        # Create a test CSV file
        test_content = """Framework,Control,Status,Comments
ISO 27001,A.5.1.1,Implemented,Policy documented
ISO 27001,A.5.1.2,Partial,Needs review
NIST,AC-1,Implemented,Access control policy
COBIT,APO01.01,Not Implemented,Governance framework missing"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(test_content)
            temp_file_path = f.name

        try:
            with open(temp_file_path, 'rb') as f:
                files = {'files': ('test_assessment.csv', f, 'text/csv')}
                success, response = self.run_test(
                    "File Upload",
                    "POST",
                    "upload",
                    200,
                    files=files
                )
                
                if success and 'files' in response:
                    self.uploaded_files = response['files']
                    print(f"   Uploaded {len(self.uploaded_files)} file(s)")
                    return True
                return False
        finally:
            os.unlink(temp_file_path)

    def test_analyze_assessment(self):
        """Test assessment analysis with AI"""
        if not self.session_id:
            print("❌ No session ID available for analysis")
            return False

        analysis_data = {
            "session_id": self.session_id,
            "message": "Por favor analiza este assessment de seguridad contra los marcos normativos seleccionados. Identifica gaps y proporciona recomendaciones.",
            "frameworks": ["ISO 27001", "NIST"],
            "file_ids": self.uploaded_files
        }

        success, response = self.run_test(
            "Analyze Assessment",
            "POST",
            "analyze",
            200,
            data=analysis_data
        )
        
        if success:
            # Check if response contains expected fields
            expected_fields = ['user_message', 'ai_response', 'compliance_scores', 'gaps']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"⚠️  Missing fields in response: {missing_fields}")
            else:
                print("✅ All expected fields present in analysis response")
        
        return success

    def test_get_session_messages(self):
        """Test getting session messages"""
        if not self.session_id:
            print("❌ No session ID available for messages")
            return False

        success, response = self.run_test(
            "Get Session Messages",
            "GET",
            f"sessions/{self.session_id}/messages",
            200
        )
        return success

    def test_get_session_analysis(self):
        """Test getting session analysis"""
        if not self.session_id:
            print("❌ No session ID available for analysis")
            return False

        success, response = self.run_test(
            "Get Session Analysis",
            "GET",
            f"sessions/{self.session_id}/analysis",
            200
        )
        
        if success and response:
            # Check if analysis contains expected fields
            expected_fields = ['frameworks', 'analysis', 'compliance_scores', 'gaps']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"⚠️  Missing fields in analysis: {missing_fields}")
            else:
                print("✅ All expected fields present in analysis data")
        
        return success

def main():
    print("🚀 Starting Assessment AI Backend API Tests")
    print("=" * 60)
    
    tester = AssessmentAPITester()
    
    # Run tests in sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Create Session", tester.test_create_session),
        ("Get Sessions", tester.test_get_sessions),
        ("File Upload", tester.test_file_upload),
        ("Analyze Assessment", tester.test_analyze_assessment),
        ("Get Session Messages", tester.test_get_session_messages),
        ("Get Session Analysis", tester.test_get_session_analysis),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())