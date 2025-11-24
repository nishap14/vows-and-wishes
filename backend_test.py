import requests
import sys
import json
from datetime import datetime

class VowsAndWishesAPITester:
    def __init__(self, base_url="https://fc3529f6-4c30-4657-a447-e0d4571cbc22.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

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
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "", 404)  # No root endpoint defined

    def test_init_data(self):
        """Initialize sample data"""
        success, response = self.run_test(
            "Initialize Sample Data",
            "POST",
            "init-data",
            200
        )
        return success

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!",
            "phone": "555-0123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login_user(self):
        """Test user login with existing user"""
        # First register a user
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "name": f"Login Test User {timestamp}",
            "email": f"logintest{timestamp}@example.com",
            "password": "TestPass123!",
            "phone": "555-0124"
        }
        
        # Register user first
        reg_success, reg_response = self.run_test(
            "Register User for Login Test",
            "POST",
            "register",
            200,
            data=register_data
        )
        
        if not reg_success:
            return False
            
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            # Update token for subsequent tests
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Login token: {self.token[:20]}...")
            return True
        return False

    def test_get_profile(self):
        """Test getting user profile (protected route)"""
        if not self.token:
            print("❌ No token available for profile test")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "profile",
            200
        )
        return success

    def test_get_services(self):
        """Test getting all services"""
        success, response = self.run_test(
            "Get All Services",
            "GET",
            "services",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} services")
            return True
        return False

    def test_get_services_with_filters(self):
        """Test services with various filters"""
        # Test category filter
        success1, _ = self.run_test(
            "Get Services - Category Filter (venues)",
            "GET",
            "services?category=venues",
            200
        )
        
        # Test location filter
        success2, _ = self.run_test(
            "Get Services - Location Filter (Downtown)",
            "GET",
            "services?location=Downtown",
            200
        )
        
        # Test search filter
        success3, _ = self.run_test(
            "Get Services - Search Filter (wedding)",
            "GET",
            "services?search=wedding",
            200
        )
        
        # Test combined filters
        success4, _ = self.run_test(
            "Get Services - Combined Filters",
            "GET",
            "services?category=catering&location=City",
            200
        )
        
        return success1 and success2 and success3 and success4

    def test_get_service_categories(self):
        """Test getting service categories"""
        success, response = self.run_test(
            "Get Service Categories",
            "GET",
            "service-categories",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            expected_categories = ['venues', 'catering', 'decoration', 'photography', 'makeup', 'dj', 'transport', 'gifts']
            response_values = [cat.get('value') for cat in response]
            missing_categories = set(expected_categories) - set(response_values)
            if missing_categories:
                print(f"   Missing categories: {missing_categories}")
            return len(missing_categories) == 0
        return False

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        success1, _ = self.run_test(
            "Invalid Endpoint Test",
            "GET",
            "nonexistent",
            404
        )
        
        # Test invalid login
        success2, _ = self.run_test(
            "Invalid Login Test",
            "POST",
            "login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )
        
        return success1 and success2

def main():
    print("🚀 Starting Vows and Wishes API Testing...")
    print("=" * 60)
    
    # Setup
    tester = VowsAndWishesAPITester()
    
    # Run tests in order
    test_results = []
    
    # 1. Initialize sample data first
    print("\n📊 INITIALIZING SAMPLE DATA")
    test_results.append(("Initialize Data", tester.test_init_data()))
    
    # 2. Test user registration and authentication
    print("\n🔐 AUTHENTICATION TESTS")
    test_results.append(("User Registration", tester.test_register_user()))
    test_results.append(("User Login", tester.test_login_user()))
    test_results.append(("Get Profile", tester.test_get_profile()))
    
    # 3. Test service endpoints
    print("\n🎪 SERVICE TESTS")
    test_results.append(("Get All Services", tester.test_get_services()))
    test_results.append(("Service Filters", tester.test_get_services_with_filters()))
    test_results.append(("Service Categories", tester.test_get_service_categories()))
    
    # 4. Test error handling
    print("\n❌ ERROR HANDLING TESTS")
    test_results.append(("Invalid Endpoints", tester.test_invalid_endpoints()))
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    passed_tests = sum(1 for _, result in test_results if result)
    total_tests = len(test_results)
    
    print(f"\n🎯 Overall Results: {passed_tests}/{total_tests} tests passed")
    print(f"📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the backend implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())