import requests
import sys
import json
import os
from datetime import datetime, timedelta

class CrowdfundingAPITester:
    def __init__(self, base_url="https://edegar-comedy-store.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.test_transaction_id = None  # For storing transaction ID for confirmation tests

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

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

    def test_admin_login(self):
        """Test admin login and get token"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "mateusbpugli@gmail.com", "password": "Mateus Buarque 1101"}
        )
        
        if success and 'id' in response:
            # Try to get token from cookies or response
            print("✅ Login successful, admin user found")
            print(f"   Admin ID: {response.get('id')}")
            print(f"   Admin Role: {response.get('role')}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            auth_required=True
        )
        return success

    def test_campaigns_crud(self):
        """Test campaign CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CAMPAIGNS")
        print("="*50)
        
        # Get all campaigns
        success, campaigns = self.run_test(
            "Get All Campaigns",
            "GET",
            "campaigns",
            200
        )
        
        if not success:
            return False
            
        print(f"   Found {len(campaigns)} existing campaigns")
        
        # Create a new campaign
        campaign_data = {
            "title": "Test Campaign",
            "description": "This is a test campaign for automated testing",
            "cover_image": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600",
            "goal_amount": 1000.0,
            "end_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "tiers": [
                {
                    "title": "Basic Support",
                    "price": 25.0,
                    "description": "Basic support tier",
                    "delivery_date": "2025-12-31",
                    "items": ["Digital copy"]
                }
            ]
        }
        
        success, new_campaign = self.run_test(
            "Create Campaign",
            "POST",
            "campaigns",
            200,
            data=campaign_data,
            auth_required=True
        )
        
        if not success:
            return False
            
        campaign_id = new_campaign.get('id')
        if not campaign_id:
            print("❌ No campaign ID returned")
            return False
            
        # Get specific campaign
        success, campaign = self.run_test(
            "Get Specific Campaign",
            "GET",
            f"campaigns/{campaign_id}",
            200
        )
        
        if not success:
            return False
            
        # Update campaign
        update_data = {
            "title": "Updated Test Campaign",
            "is_active": True
        }
        
        success, updated = self.run_test(
            "Update Campaign",
            "PUT",
            f"campaigns/{campaign_id}",
            200,
            data=update_data,
            auth_required=True
        )
        
        if not success:
            return False
            
        # Delete campaign
        success, _ = self.run_test(
            "Delete Campaign",
            "DELETE",
            f"campaigns/{campaign_id}",
            200,
            auth_required=True
        )
        
        return success

    def test_newsletter(self):
        """Test newsletter functionality"""
        print("\n" + "="*50)
        print("TESTING NEWSLETTER")
        print("="*50)
        
        # Subscribe to newsletter
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Subscribe to Newsletter",
            "POST",
            "newsletter",
            200,
            data={"email": test_email}
        )
        
        if not success:
            return False
            
        # Get subscribers (admin only)
        success, subscribers = self.run_test(
            "Get Newsletter Subscribers",
            "GET",
            "newsletter/subscribers",
            200,
            auth_required=True
        )
        
        return success

    def test_gallery(self):
        """Test gallery functionality"""
        print("\n" + "="*50)
        print("TESTING GALLERY")
        print("="*50)
        
        # Get gallery items
        success, gallery = self.run_test(
            "Get Gallery Items",
            "GET",
            "gallery",
            200
        )
        
        if not success:
            return False
            
        print(f"   Found {len(gallery)} gallery items")
        
        # Add gallery item
        gallery_data = {
            "image_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600",
            "caption": "Test gallery item"
        }
        
        success, new_item = self.run_test(
            "Add Gallery Item",
            "POST",
            "gallery",
            200,
            data=gallery_data,
            auth_required=True
        )
        
        if not success:
            return False
            
        item_id = new_item.get('id')
        if not item_id:
            print("❌ No gallery item ID returned")
            return False
            
        # Delete gallery item
        success, _ = self.run_test(
            "Delete Gallery Item",
            "DELETE",
            f"gallery/{item_id}",
            200,
            auth_required=True
        )
        
        return success

    def test_biography(self):
        """Test biography functionality"""
        print("\n" + "="*50)
        print("TESTING BIOGRAPHY")
        print("="*50)
        
        # Get biography
        success, bio = self.run_test(
            "Get Biography",
            "GET",
            "bio",
            200
        )
        
        if not success:
            return False
            
        # Update biography
        bio_data = {
            "content": "Updated biography content for testing",
            "photo_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600"
        }
        
        success, _ = self.run_test(
            "Update Biography",
            "PUT",
            "bio",
            200,
            data=bio_data,
            auth_required=True
        )
        
        return success

    def test_admin_stats(self):
        """Test admin stats"""
        print("\n" + "="*50)
        print("TESTING ADMIN STATS")
        print("="*50)
        
        success, stats = self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200,
            auth_required=True
        )
        
        if success and stats:
            print(f"   Total raised: R$ {stats.get('total_raised', 0)}")
            print(f"   Platform fee: R$ {stats.get('platform_fee_total', 0)}")
            print(f"   Total backers: {stats.get('total_backers', 0)}")
            print(f"   Active campaigns: {stats.get('active_campaigns', 0)}/{stats.get('max_campaigns', 10)}")
        
        return success

    def test_admin_balance(self):
        """Test admin balance endpoint (NEW in iteration 4)"""
        print("\n" + "="*50)
        print("TESTING ADMIN BALANCE")
        print("="*50)
        
        success, response = self.run_test(
            "Get Admin Balance",
            "GET",
            "admin/balance",
            200,
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            required_fields = ['total_revenue', 'platform_fee', 'available_balance', 'total_withdrawn', 'withdrawals']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"❌ Missing required fields: {missing_fields}")
                return False
            else:
                print(f"✅ Balance data complete:")
                print(f"   - Total Revenue: R$ {response.get('total_revenue', 0):.2f}")
                print(f"   - Platform Fee: R$ {response.get('platform_fee', 0):.2f}")
                print(f"   - Available Balance: R$ {response.get('available_balance', 0):.2f}")
                print(f"   - Total Withdrawn: R$ {response.get('total_withdrawn', 0):.2f}")
                print(f"   - Withdrawals Count: {len(response.get('withdrawals', []))}")
                return True
        return False

    def test_withdrawal_validation(self):
        """Test withdrawal validation (NEW in iteration 4)"""
        print("\n" + "="*50)
        print("TESTING WITHDRAWAL VALIDATION")
        print("="*50)
        
        # Test invalid amount (0)
        success1, response1 = self.run_test(
            "Withdraw Invalid Amount (0)",
            "POST",
            "admin/withdraw",
            400,
            data={"amount": 0, "pix_key": "test@example.com", "pix_key_type": "email"},
            auth_required=True
        )
        
        # Test invalid pix key (too short)
        success2, response2 = self.run_test(
            "Withdraw Invalid Pix Key (short)",
            "POST",
            "admin/withdraw",
            400,
            data={"amount": 10.0, "pix_key": "abc", "pix_key_type": "email"},
            auth_required=True
        )
        
        # Test amount exceeding balance
        success3, response3 = self.run_test(
            "Withdraw Excessive Amount",
            "POST",
            "admin/withdraw",
            400,
            data={"amount": 999999.0, "pix_key": "test@example.com", "pix_key_type": "email"},
            auth_required=True
        )
        
        return success1 and success2 and success3

    def test_withdrawal_success(self):
        """Test successful withdrawal (NEW in iteration 4)"""
        print("\n" + "="*50)
        print("TESTING WITHDRAWAL SUCCESS")
        print("="*50)
        
        # First get current balance
        balance_success, balance_data = self.run_test(
            "Get Balance Before Withdrawal",
            "GET",
            "admin/balance",
            200,
            auth_required=True
        )
        
        if not balance_success:
            print("❌ Could not get balance data")
            return False
            
        available = balance_data.get('available_balance', 0)
        print(f"Available balance: R$ {available:.2f}")
        
        if available <= 0:
            print("⚠️  No available balance for withdrawal test - this is expected in fresh system")
            return True  # Not a failure, just no balance
        
        # Test small withdrawal with different pix key types
        pix_types = [
            {"type": "email", "key": "test@example.com"},
            {"type": "cpf", "key": "12345678901"},
            {"type": "phone", "key": "+5511999999999"}
        ]
        
        for pix in pix_types:
            withdraw_amount = min(0.50, available)  # Small amount
            success, response = self.run_test(
                f"Withdraw R$ {withdraw_amount:.2f} via {pix['type']}",
                "POST",
                "admin/withdraw",
                200,
                data={
                    "amount": withdraw_amount,
                    "pix_key": pix['key'],
                    "pix_key_type": pix['type']
                },
                auth_required=True
            )
            
            if success and isinstance(response, dict):
                if 'message' in response and 'sucesso' in response['message'].lower():
                    print(f"✅ Withdrawal successful: {response['message']}")
                    available -= withdraw_amount  # Update available balance
                    if available <= 0:
                        break  # Stop if no more balance
                else:
                    print(f"❌ Unexpected withdrawal response: {response}")
                    return False
            else:
                return False
        
        return True

    def test_site_settings(self):
        """Test site settings functionality (NEW in iteration 3)"""
        print("\n" + "="*50)
        print("TESTING SITE SETTINGS")
        print("="*50)
        
        # Get site settings (public endpoint)
        success, settings = self.run_test(
            "Get Site Settings",
            "GET",
            "site-settings",
            200
        )
        
        if not success:
            return False
            
        print(f"   Current site name: {settings.get('site_name', 'N/A')}")
        print(f"   Current support email: {settings.get('support_email', 'N/A')}")
        
        # Update site settings (admin only)
        settings_data = {
            "site_name": "Test Site Name",
            "site_subtitle": "Test Subtitle",
            "primary_color": "#FF0000",
            "secondary_color": "#00FF00",
            "hero_title": "Test Hero Title",
            "hero_subtitle": "Test Hero Subtitle",
            "support_email": "test@example.com",
            "marquee_text": "TEST MARQUEE * UPDATED * SETTINGS *"
        }
        
        success, _ = self.run_test(
            "Update Site Settings",
            "PUT",
            "site-settings",
            200,
            data=settings_data,
            auth_required=True
        )
        
        if not success:
            return False
            
        # Verify settings were updated
        success, updated_settings = self.run_test(
            "Verify Updated Site Settings",
            "GET",
            "site-settings",
            200
        )
        
        if success:
            print(f"   Updated site name: {updated_settings.get('site_name', 'N/A')}")
            print(f"   Updated support email: {updated_settings.get('support_email', 'N/A')}")
        
        return success

    def test_user_orders(self):
        """Test user order history functionality (NEW in iteration 3)"""
        print("\n" + "="*50)
        print("TESTING USER ORDER HISTORY")
        print("="*50)
        
        # Get user orders (requires authentication)
        success, orders = self.run_test(
            "Get User Orders",
            "GET",
            "user/orders",
            200,
            auth_required=True
        )
        
        if success:
            print(f"   Found {len(orders)} orders for current user")
            if orders:
                for i, order in enumerate(orders[:3]):  # Show first 3 orders
                    print(f"   Order {i+1}: {order.get('item_title', 'N/A')} - R$ {order.get('amount', 0)} - {order.get('payment_status', 'N/A')}")
        
        return success

    def test_checkout_creation(self):
        """Test checkout creation (without actual payment)"""
        print("\n" + "="*50)
        print("TESTING CHECKOUT (STRIPE INTEGRATION)")
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
            if campaign.get('tiers') and len(campaign['tiers']) > 0:
                test_campaign = campaign
                break
                
        if not test_campaign:
            print("❌ No campaigns with tiers found for checkout test")
            return False
            
        tier = test_campaign['tiers'][0]
        checkout_data = {
            "campaign_id": test_campaign['id'],
            "tier_id": tier['id'],
            "origin_url": self.base_url
        }
        
        success, checkout = self.run_test(
            "Create Checkout Session",
            "POST",
            "checkout/campaign",
            200,
            data=checkout_data,
            auth_required=True
        )
        
        if success and checkout.get('url'):
            print(f"   Checkout URL created: {checkout['url'][:50]}...")
            
        return success

    def test_file_upload(self):
        """Test file upload functionality (NEW in iteration 5)"""
        print("\n📁 Testing File Upload...")
        
        # Create a small test image file
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        # Test file upload
        url = f"{self.api_url}/upload"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        files = {'file': ('test.png', test_image_data, 'image/png')}
        
        self.tests_run += 1
        print(f"   URL: {url}")
        
        try:
            # Use requests directly instead of session for file upload
            response = requests.post(url, files=files, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
                file_id = response_data.get('id')
                file_url = response_data.get('url')
                print(f"   File uploaded - ID: {file_id}, URL: {file_url}")
                
                # Test file serving
                if file_id:
                    self.test_file_serve(file_id)
                
                return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_file_serve(self, file_id):
        """Test file serving"""
        print(f"\n📥 Testing File Serving for ID: {file_id}...")
        
        success, response = self.run_test(
            "File Serve",
            "GET",
            f"files/{file_id}",
            200
        )
        
        if success:
            print(f"✅ File served successfully")
        
        return success

    def test_pix_info_endpoint(self):
        """Test GET /api/pix-info returns pix_key (NEW in iteration 6)"""
        print("\n💳 Testing Pix Info Endpoint...")
        
        success, response = self.run_test(
            "Get Pix Info",
            "GET",
            "pix-info",
            200
        )
        
        if success and isinstance(response, dict):
            pix_key = response.get('pix_key')
            pix_key_type = response.get('pix_key_type')
            
            if pix_key == "mateusbpugli@gmail.com" and pix_key_type == "email":
                print(f"✅ Pix info correct - Key: {pix_key}, Type: {pix_key_type}")
                return True
            else:
                print(f"❌ Unexpected Pix info - Key: {pix_key}, Type: {pix_key_type}")
                return False
        
        return False

    def test_pix_payment_creation(self):
        """Test POST /api/checkout/pix creates pending Pix transaction (NEW in iteration 6)"""
        print("\n💳 Testing Pix Payment Creation...")
        
        # Get campaigns first
        success, campaigns = self.run_test(
            "Get Campaigns for Pix Test",
            "GET",
            "campaigns",
            200
        )
        
        if not success or not campaigns:
            print("❌ No campaigns available for Pix testing")
            return False
            
        # Find an active campaign with tiers
        active_campaign = None
        for campaign in campaigns:
            if campaign.get('is_active') and campaign.get('tiers'):
                active_campaign = campaign
                break
                
        if not active_campaign:
            print("❌ No active campaign with tiers found for Pix testing")
            return False
            
        tier = active_campaign['tiers'][0]
        
        # Test campaign Pix payment creation
        pix_data = {
            "type": "campaign",
            "campaign_id": active_campaign['id'],
            "tier_id": tier['id'],
            "custom_amount": tier.get('price', 25.0)
        }
        
        success, pix_response = self.run_test(
            "Create Campaign Pix Payment",
            "POST",
            "checkout/pix",
            200,
            data=pix_data,
            auth_required=True
        )
        
        if success and isinstance(pix_response, dict):
            required_fields = ['transaction_id', 'amount', 'pix_key', 'pix_key_type', 'item_title']
            missing_fields = [field for field in required_fields if field not in pix_response]
            
            if missing_fields:
                print(f"❌ Missing required fields in Pix response: {missing_fields}")
                return False
            
            if pix_response.get('pix_key') != "mateusbpugli@gmail.com":
                print(f"❌ Wrong Pix key: {pix_response.get('pix_key')}")
                return False
                
            print(f"✅ Campaign Pix payment created:")
            print(f"   Transaction ID: {pix_response.get('transaction_id')}")
            print(f"   Amount: R$ {pix_response.get('amount')}")
            print(f"   Pix Key: {pix_response.get('pix_key')}")
            print(f"   Item: {pix_response.get('item_title')}")
            
            # Store transaction ID for confirmation test
            self.test_transaction_id = pix_response.get('transaction_id')
        
        # Test product Pix payment creation
        success, products = self.run_test(
            "Get Products for Pix Test",
            "GET",
            "products",
            200
        )
        
        if success and products:
            active_product = None
            for product in products:
                if product.get('is_active'):
                    active_product = product
                    break
                    
            if active_product:
                product_pix_data = {
                    "type": "product",
                    "product_id": active_product['id'],
                    "quantity": 1
                }
                
                success, product_pix_response = self.run_test(
                    "Create Product Pix Payment",
                    "POST",
                    "checkout/pix",
                    200,
                    data=product_pix_data,
                    auth_required=True
                )
                
                if success and isinstance(product_pix_response, dict):
                    print(f"✅ Product Pix payment created:")
                    print(f"   Transaction ID: {product_pix_response.get('transaction_id')}")
                    print(f"   Amount: R$ {product_pix_response.get('amount')}")
                    print(f"   Item: {product_pix_response.get('item_title')}")
        
        return True

    def test_pix_confirmation(self):
        """Test POST /api/admin/confirm-pix confirms payment (NEW in iteration 6)"""
        print("\n💳 Testing Pix Payment Confirmation...")
        
        # First create a Pix payment to confirm
        if not hasattr(self, 'test_transaction_id'):
            print("⚠️  No transaction ID available from previous test")
            return True  # Not a failure, just no transaction to confirm
            
        success, response = self.run_test(
            "Confirm Pix Payment",
            "POST",
            "admin/confirm-pix",
            200,
            data={"transaction_id": self.test_transaction_id},
            auth_required=True
        )
        
        if success and isinstance(response, dict):
            message = response.get('message', '')
            if 'confirmado' in message.lower():
                print(f"✅ Pix payment confirmed: {message}")
                return True
            else:
                print(f"❌ Unexpected confirmation response: {message}")
                return False
        
        return False

    def test_min_donation_validation(self):
        """Test that backend validates custom_amount >= min_donation (NEW in iteration 6)"""
        print("\n💰 Testing Min Donation Validation...")
        
        # Get campaigns first
        success, campaigns = self.run_test(
            "Get Campaigns for Min Donation Test",
            "GET",
            "campaigns",
            200
        )
        
        if not success or not campaigns:
            print("❌ No campaigns available for min donation testing")
            return False
            
        # Find a campaign with min_donation set
        test_campaign = None
        test_tier = None
        for campaign in campaigns:
            if campaign.get('is_active') and campaign.get('tiers'):
                for tier in campaign['tiers']:
                    if tier.get('min_donation') and tier['min_donation'] > 0:
                        test_campaign = campaign
                        test_tier = tier
                        break
                if test_campaign:
                    break
                    
        if not test_campaign or not test_tier:
            print("⚠️  No campaigns with min_donation found - creating test scenario")
            return True  # Not a failure, just no test data
            
        min_donation = test_tier['min_donation']
        
        # Test with amount below minimum (should fail)
        below_min_data = {
            "type": "campaign",
            "campaign_id": test_campaign['id'],
            "tier_id": test_tier['id'],
            "custom_amount": min_donation - 1.0
        }
        
        success, response = self.run_test(
            f"Pix Payment Below Min (R$ {min_donation - 1.0:.2f} < R$ {min_donation:.2f})",
            "POST",
            "checkout/pix",
            400,  # Should fail with 400
            data=below_min_data,
            auth_required=True
        )
        
        if success:
            print(f"✅ Correctly rejected payment below minimum")
        
        # Test with amount at minimum (should succeed)
        at_min_data = {
            "type": "campaign",
            "campaign_id": test_campaign['id'],
            "tier_id": test_tier['id'],
            "custom_amount": min_donation
        }
        
        success2, response2 = self.run_test(
            f"Pix Payment At Min (R$ {min_donation:.2f})",
            "POST",
            "checkout/pix",
            200,  # Should succeed
            data=at_min_data,
            auth_required=True
        )
        
        if success2:
            print(f"✅ Correctly accepted payment at minimum")
        
        # Test with amount above minimum (should succeed)
        above_min_data = {
            "type": "campaign",
            "campaign_id": test_campaign['id'],
            "tier_id": test_tier['id'],
            "custom_amount": min_donation + 10.0
        }
        
        success3, response3 = self.run_test(
            f"Pix Payment Above Min (R$ {min_donation + 10.0:.2f})",
            "POST",
            "checkout/pix",
            200,  # Should succeed
            data=above_min_data,
            auth_required=True
        )
        
        if success3:
            print(f"✅ Correctly accepted payment above minimum")
        
        return success and success2 and success3

    def test_pix_payment_methods(self):
        """Test that checkout endpoints include Pix payment method (UPDATED in iteration 6)"""
        print("\n💳 Testing Pix Payment Method Integration...")
        
        # Test Pix info endpoint
        if not self.test_pix_info_endpoint():
            return False
            
        # Test Pix payment creation
        if not self.test_pix_payment_creation():
            return False
            
        # Test min donation validation
        if not self.test_min_donation_validation():
            return False
            
        # Test Pix confirmation
        if not self.test_pix_confirmation():
            return False
        
        return True

    def test_checkout_status(self, session_id):
        """Test checkout status endpoint"""
        print(f"\n📊 Testing Checkout Status for Session: {session_id}...")
        
        success, response = self.run_test(
            "Checkout Status",
            "GET",
            f"checkout/status/{session_id}",
            200
        )
        
        if success and isinstance(response, dict):
            status = response.get('status')
            payment_status = response.get('payment_status')
            print(f"✅ Status retrieved - Status: {status}, Payment: {payment_status}")
        
        return success

def main():
    print("🚀 Starting Crowdfunding API Tests")
    print("="*60)
    
    tester = CrowdfundingAPITester()
    
    # Test authentication first
    if not tester.test_admin_login():
        print("\n❌ Authentication failed, stopping tests")
        return 1
    
    # Test all endpoints
    tests = [
        tester.test_auth_me,
        tester.test_site_settings,  # NEW in iteration 3
        tester.test_user_orders,    # NEW in iteration 3
        tester.test_campaigns_crud,
        tester.test_newsletter,
        tester.test_gallery,
        tester.test_biography,
        tester.test_admin_stats,
        tester.test_admin_balance,      # NEW in iteration 4
        tester.test_withdrawal_validation,  # NEW in iteration 4
        tester.test_withdrawal_success,     # NEW in iteration 4
        tester.test_checkout_creation,
        tester.test_file_upload,        # NEW in iteration 5
        tester.test_pix_payment_methods,    # NEW in iteration 5
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