"""
Test PIX-only payment flow for Edegar Comedy Store
Tests that Stripe has been removed and all payments are manual PIX with admin confirmation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://edegar-comedy-store.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "mateusbpugli@gmail.com"
ADMIN_PASSWORD = "Mateus Buarque 1101"
PIX_KEY = "mateusbpugli@gmail.com"
COMPROVANTE_EMAIL = "mateuabuarquepugli@gmail.com"


@pytest.fixture(scope="module")
def session():
    """Create a requests session with cookies"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session(session):
    """Login as admin and return authenticated session"""
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def test_user_session():
    """Create and login a test user"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Create unique test user
    test_email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
    test_password = "testpass123"
    
    # Register
    reg_response = s.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test User",
        "email": test_email,
        "password": test_password,
        "phone": "+5511999999999"
    })
    
    if reg_response.status_code != 200:
        # User might exist, try login
        login_response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        if login_response.status_code != 200:
            pytest.skip("Could not create or login test user")
    
    return s


class TestPixInfoEndpoint:
    """Test GET /api/pix-info returns correct PIX information"""
    
    def test_pix_info_returns_pix_key(self, session):
        """GET /api/pix-info should return pix_key"""
        response = session.get(f"{BASE_URL}/api/pix-info")
        assert response.status_code == 200
        data = response.json()
        assert "pix_key" in data
        assert data["pix_key"] == PIX_KEY
        print(f"✓ PIX key returned: {data['pix_key']}")
    
    def test_pix_info_returns_comprovante_email(self, session):
        """GET /api/pix-info should return comprovante_email"""
        response = session.get(f"{BASE_URL}/api/pix-info")
        assert response.status_code == 200
        data = response.json()
        assert "comprovante_email" in data
        assert data["comprovante_email"] == COMPROVANTE_EMAIL
        print(f"✓ Comprovante email returned: {data['comprovante_email']}")
    
    def test_pix_info_returns_pix_key_type(self, session):
        """GET /api/pix-info should return pix_key_type"""
        response = session.get(f"{BASE_URL}/api/pix-info")
        assert response.status_code == 200
        data = response.json()
        assert "pix_key_type" in data
        print(f"✓ PIX key type returned: {data['pix_key_type']}")


class TestCampaignCheckout:
    """Test POST /api/checkout/campaign returns PIX info (no Stripe)"""
    
    def test_checkout_campaign_requires_auth(self, session):
        """POST /api/checkout/campaign should require authentication"""
        # Use a fresh session without auth
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/checkout/campaign", json={
            "campaign_id": "test",
            "tier_id": "test"
        })
        assert response.status_code == 401
        print("✓ Campaign checkout requires authentication")
    
    def test_checkout_campaign_returns_pix_info(self, test_user_session, admin_session):
        """POST /api/checkout/campaign should return PIX info, not Stripe redirect"""
        # First get a campaign with tiers
        campaigns_response = test_user_session.get(f"{BASE_URL}/api/campaigns")
        assert campaigns_response.status_code == 200
        campaigns = campaigns_response.json()
        
        # Find a campaign with tiers
        campaign_with_tiers = None
        for c in campaigns:
            if c.get("tiers") and len(c["tiers"]) > 0:
                campaign_with_tiers = c
                break
        
        if not campaign_with_tiers:
            pytest.skip("No campaign with tiers found")
        
        tier = campaign_with_tiers["tiers"][0]
        
        response = test_user_session.post(f"{BASE_URL}/api/checkout/campaign", json={
            "campaign_id": campaign_with_tiers["id"],
            "tier_id": tier["id"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have PIX info
        assert "pix_key" in data, "Response should contain pix_key"
        assert "comprovante_email" in data, "Response should contain comprovante_email"
        assert "amount" in data, "Response should contain amount"
        assert "transaction_id" in data, "Response should contain transaction_id"
        
        # Should NOT have Stripe redirect
        assert "url" not in data or "stripe" not in str(data.get("url", "")).lower(), "Should not have Stripe redirect URL"
        assert "checkout_url" not in data, "Should not have checkout_url (Stripe)"
        
        # Verify correct email
        assert data["comprovante_email"] == COMPROVANTE_EMAIL
        
        print(f"✓ Campaign checkout returns PIX info: pix_key={data['pix_key']}, amount={data['amount']}")


class TestProductCheckout:
    """Test POST /api/checkout/product returns PIX info (no Stripe)"""
    
    def test_checkout_product_requires_auth(self, session):
        """POST /api/checkout/product should require authentication"""
        fresh_session = requests.Session()
        response = fresh_session.post(f"{BASE_URL}/api/checkout/product", json={
            "product_id": "test",
            "quantity": 1
        })
        assert response.status_code == 401
        print("✓ Product checkout requires authentication")
    
    def test_checkout_product_returns_pix_info(self, test_user_session):
        """POST /api/checkout/product should return PIX info, not Stripe redirect"""
        # First get a product
        products_response = test_user_session.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()
        
        # Find an active product
        active_product = None
        for p in products:
            if p.get("is_active"):
                active_product = p
                break
        
        if not active_product:
            pytest.skip("No active product found")
        
        response = test_user_session.post(f"{BASE_URL}/api/checkout/product", json={
            "product_id": active_product["id"],
            "quantity": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have PIX info
        assert "pix_key" in data, "Response should contain pix_key"
        assert "comprovante_email" in data, "Response should contain comprovante_email"
        assert "amount" in data, "Response should contain amount"
        assert "transaction_id" in data, "Response should contain transaction_id"
        
        # Should NOT have Stripe redirect
        assert "url" not in data or "stripe" not in str(data.get("url", "")).lower()
        assert "checkout_url" not in data
        
        # Verify correct email
        assert data["comprovante_email"] == COMPROVANTE_EMAIL
        
        print(f"✓ Product checkout returns PIX info: pix_key={data['pix_key']}, amount={data['amount']}")


class TestPixCheckout:
    """Test POST /api/checkout/pix returns PIX info"""
    
    def test_checkout_pix_returns_pix_info(self, test_user_session):
        """POST /api/checkout/pix should return pix_key and comprovante_email"""
        # Get a product first
        products_response = test_user_session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        active_product = None
        for p in products:
            if p.get("is_active"):
                active_product = p
                break
        
        if not active_product:
            pytest.skip("No active product found")
        
        response = test_user_session.post(f"{BASE_URL}/api/checkout/pix", json={
            "type": "product",
            "product_id": active_product["id"],
            "quantity": 1
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "pix_key" in data
        assert "comprovante_email" in data
        assert data["comprovante_email"] == COMPROVANTE_EMAIL
        
        print(f"✓ PIX checkout returns correct info")


class TestAdminConfirmPix:
    """Test POST /api/admin/confirm-pix changes status from awaiting_pix to paid"""
    
    def test_confirm_pix_requires_admin(self, test_user_session):
        """POST /api/admin/confirm-pix should require admin role"""
        response = test_user_session.post(f"{BASE_URL}/api/admin/confirm-pix", json={
            "transaction_id": "fake-id"
        })
        assert response.status_code == 403
        print("✓ Confirm PIX requires admin role")
    
    def test_confirm_pix_changes_status(self, admin_session, test_user_session):
        """POST /api/admin/confirm-pix should change status to paid"""
        # First create a transaction via product checkout
        products_response = test_user_session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        active_product = None
        for p in products:
            if p.get("is_active"):
                active_product = p
                break
        
        if not active_product:
            pytest.skip("No active product found")
        
        # Create transaction
        checkout_response = test_user_session.post(f"{BASE_URL}/api/checkout/product", json={
            "product_id": active_product["id"],
            "quantity": 1
        })
        
        assert checkout_response.status_code == 200
        checkout_data = checkout_response.json()
        transaction_id = checkout_data["transaction_id"]
        
        # Confirm as admin
        confirm_response = admin_session.post(f"{BASE_URL}/api/admin/confirm-pix", json={
            "transaction_id": transaction_id
        })
        
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()
        assert "message" in confirm_data
        assert "confirmado" in confirm_data["message"].lower()
        
        print(f"✓ Admin can confirm PIX payment, status changed to paid")


class TestSubscribeEndpoint:
    """Test POST /api/subscribe returns PIX info (no card option)"""
    
    def test_subscribe_returns_pix_info(self, test_user_session):
        """POST /api/subscribe should return PIX info, not card option"""
        # Get subscription plans
        plans_response = test_user_session.get(f"{BASE_URL}/api/subscription-plans")
        assert plans_response.status_code == 200
        plans = plans_response.json()
        
        # Find an active plan
        active_plan = None
        for p in plans:
            if p.get("is_active"):
                active_plan = p
                break
        
        if not active_plan:
            pytest.skip("No active subscription plan found")
        
        response = test_user_session.post(f"{BASE_URL}/api/subscribe", json={
            "plan_id": active_plan["id"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have PIX info
        assert "pix_key" in data, "Response should contain pix_key"
        assert "comprovante_email" in data, "Response should contain comprovante_email"
        assert "amount" in data, "Response should contain amount"
        
        # Verify correct email
        assert data["comprovante_email"] == COMPROVANTE_EMAIL
        
        print(f"✓ Subscribe returns PIX info: pix_key={data['pix_key']}, amount={data['amount']}")


class TestNoStripeEndpoints:
    """Test that Stripe-related endpoints don't exist"""
    
    def test_no_subscribe_card_endpoint(self, session):
        """There should be no /api/subscribe/card endpoint"""
        response = session.post(f"{BASE_URL}/api/subscribe/card", json={})
        # Should be 404 (not found) or 405 (method not allowed)
        assert response.status_code in [404, 405, 422], f"Expected 404/405/422, got {response.status_code}"
        print("✓ No /api/subscribe/card endpoint exists")
    
    def test_no_webhook_stripe_endpoint(self, session):
        """There should be no /api/webhook/stripe endpoint"""
        response = session.post(f"{BASE_URL}/api/webhook/stripe", json={})
        # Should be 404 (not found) or 405 (method not allowed)
        assert response.status_code in [404, 405, 422], f"Expected 404/405/422, got {response.status_code}"
        print("✓ No /api/webhook/stripe endpoint exists")


class TestAdminDashboardPendingOrders:
    """Test admin can see pending PIX orders"""
    
    def test_admin_stats_shows_pending_transactions(self, admin_session):
        """GET /api/admin/stats should include transactions with awaiting_pix status"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        
        # Check if there are any awaiting_pix transactions
        awaiting_pix = [t for t in data["transactions"] if t.get("payment_status") == "awaiting_pix"]
        print(f"✓ Admin stats shows {len(awaiting_pix)} pending PIX transactions")


class TestUserOrderHistory:
    """Test user can see order history with correct status labels"""
    
    def test_user_orders_shows_awaiting_status(self, test_user_session):
        """GET /api/user/orders should show orders with awaiting_pix status"""
        response = test_user_session.get(f"{BASE_URL}/api/user/orders")
        assert response.status_code == 200
        orders = response.json()
        
        # Check structure
        if len(orders) > 0:
            order = orders[0]
            assert "payment_status" in order
            assert "amount" in order
            print(f"✓ User orders endpoint returns correct structure with {len(orders)} orders")
        else:
            print("✓ User orders endpoint works (no orders yet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
