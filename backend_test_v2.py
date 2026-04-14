import requests
import sys
import json
from datetime import datetime, timedelta

class CrowdfundingAPITesterV2:
    def __init__(self, base_url="https://edegar-comedy-store.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        # Create separate sessions for admin and user
        self.session = requests.Session()
        self.admin_session = requests.Session()
        self.user_session = requests.Session()
        for session in [self.session, self.admin_session, self.user_session]:
            session.headers.update({'Content-Type': 'application/json'})

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False, use_admin=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use the appropriate session based on auth requirement
        session = self.admin_session if (auth_required and use_admin) else self.user_session if auth_required else self.session

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = session.get(url, headers=headers)
            elif method == 'POST':
                response = session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 5:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) <= 3:
                        print(f"   Response: {len(response_data)} items")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login_new_credentials(self):
        """Test admin login with NEW credentials"""
        print("\n" + "="*50)
        print("TESTING NEW ADMIN AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login (New Credentials)",
            "POST",
            "auth/login",
            200,
            data={"email": "mateusbpugli@gmail.com", "password": "Mateus Buarque 1101"}
        )
        
        if success and 'id' in response and response.get('role') == 'admin':
            print("✅ New admin login successful")
            # Store the admin session cookies
            self.admin_session.cookies = self.session.cookies
            return True
        return False

    def test_user_registration(self):
        """Test user registration with name, email, password, phone"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": "Test User",
            "email": f"testuser_{timestamp}@example.com",
            "password": "testpass123",
            "phone": "11999887766"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'id' in response and response.get('role') == 'user':
            print("✅ User registration successful")
            self.test_user_email = test_user['email']
            self.test_user_password = test_user['password']
            # Store the user session cookies
            self.user_session.cookies = self.session.cookies
            return True
        return False

    def test_user_login(self):
        """Test user login with email and password"""
        if not hasattr(self, 'test_user_email'):
            print("❌ No test user available for login test")
            return False
        
        # Use a fresh session for user login
        url = f"{self.api_url}/auth/login"
        headers = {'Content-Type': 'application/json'}
        data = {"email": self.test_user_email, "password": self.test_user_password}
        
        print(f"\n🔍 Testing User Login...")
        print(f"   URL: {url}")
        
        try:
            response = self.user_session.post(url, json=data, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
                if response_data.get('role') == 'user':
                    print("✅ User login successful")
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            
        self.tests_run += 1
        return False

    def test_products_crud(self):
        """Test products CRUD operations (admin only)"""
        print("\n" + "="*50)
        print("TESTING PRODUCTS (LOJA)")
        print("="*50)
        
        # Get all products
        success, products = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if not success:
            return False
            
        print(f"   Found {len(products)} existing products")
        
        # Create a new product (admin only)
        product_data = {
            "title": "Test Product",
            "description": "This is a test product for automated testing",
            "image_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600",
            "price": 29.99,
            "stock": 100
        }
        
        success, new_product = self.run_test(
            "Create Product (Admin)",
            "POST",
            "products",
            200,
            data=product_data,
            auth_required=True,
            use_admin=True
        )
        
        if not success:
            return False
            
        product_id = new_product.get('id')
        if not product_id:
            print("❌ No product ID returned")
            return False
            
        # Get specific product
        success, product = self.run_test(
            "Get Specific Product",
            "GET",
            f"products/{product_id}",
            200
        )
        
        if not success:
            return False
            
        # Update product
        update_data = {
            "title": "Updated Test Product",
            "price": 39.99,
            "is_active": True
        }
        
        success, updated = self.run_test(
            "Update Product (Admin)",
            "PUT",
            f"products/{product_id}",
            200,
            data=update_data,
            auth_required=True,
            use_admin=True
        )
        
        if not success:
            return False
            
        # Delete product
        success, _ = self.run_test(
            "Delete Product (Admin)",
            "DELETE",
            f"products/{product_id}",
            200,
            auth_required=True,
            use_admin=True
        )
        
        return success

    def test_checkout_product(self):
        """Test product checkout (requires user login)"""
        print("\n" + "="*50)
        print("TESTING PRODUCT CHECKOUT")
        print("="*50)
        
        # First get products to find one for checkout
        success, products = self.run_test(
            "Get Products for Checkout Test",
            "GET",
            "products",
            200
        )
        
        if not success or not products:
            print("❌ No products available for checkout test")
            return False
            
        # Find an active product
        test_product = None
        for product in products:
            if product.get('is_active', True) and product.get('stock', 0) > 0:
                test_product = product
                break
                
        if not test_product:
            print("❌ No active products found for checkout test")
            return False
            
        checkout_data = {
            "product_id": test_product['id'],
            "quantity": 1,
            "origin_url": self.base_url
        }
        
        success, checkout = self.run_test(
            "Create Product Checkout Session",
            "POST",
            "checkout/product",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        if success and checkout.get('url'):
            print(f"   Product checkout URL created: {checkout['url'][:50]}...")
            
        return success

    def test_checkout_campaign(self):
        """Test campaign checkout (requires user login)"""
        print("\n" + "="*50)
        print("TESTING CAMPAIGN CHECKOUT")
        print("="*50)
        
        # First get campaigns to find one with tiers
        success, campaigns = self.run_test(
            "Get Campaigns for Checkout Test",
            "GET",
            "campaigns",
            200
        )
        
        if not success or not campaigns:
            print("❌ No campaigns available for checkout test")
            return False
            
        # Find a campaign with tiers
        test_campaign = None
        for campaign in campaigns:
            if campaign.get('tiers') and len(campaign['tiers']) > 0 and campaign.get('is_active', True):
                test_campaign = campaign
                break
                
        if not test_campaign:
            print("❌ No active campaigns with tiers found for checkout test")
            return False
            
        tier = test_campaign['tiers'][0]
        checkout_data = {
            "campaign_id": test_campaign['id'],
            "tier_id": tier['id'],
            "origin_url": self.base_url
        }
        
        success, checkout = self.run_test(
            "Create Campaign Checkout Session",
            "POST",
            "checkout/campaign",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        if success and checkout.get('url'):
            print(f"   Campaign checkout URL created: {checkout['url'][:50]}...")
            
        return success

    def test_auth_endpoints(self):
        """Test all auth endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTH ENDPOINTS")
        print("="*50)
        
        # Test /auth/me endpoint
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200,
            auth_required=True
        )
        
        if not success:
            return False
            
        # Test logout
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        
        return success

def main():
    print("🚀 Starting Crowdfunding API Tests V2 (New Features)")
    print("="*60)
    
    tester = CrowdfundingAPITesterV2()
    
    # Test new admin authentication first
    if not tester.test_admin_login_new_credentials():
        print("\n❌ New admin authentication failed, stopping tests")
        return 1
    
    # Test user registration and login
    if not tester.test_user_registration():
        print("\n❌ User registration failed")
        return 1
        
    if not tester.test_user_login():
        print("\n❌ User login failed")
        return 1
    
    # Test all new endpoints
    tests = [
        tester.test_auth_endpoints,
        tester.test_products_crud,
        tester.test_checkout_product,
        tester.test_checkout_campaign,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL RESULTS")
    print("="*60)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ Backend API tests mostly successful!")
        return 0
    else:
        print("❌ Backend API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())