from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from bson import ObjectId

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
PLATFORM_FEE_PERCENT = 5.0
MAX_CAMPAIGNS = 10

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Password Hashing ───
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ─── JWT ───
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Pydantic Models ───
class LoginRequest(BaseModel):
    email: str
    password: str

class CampaignTier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    price: float
    description: str
    delivery_date: str
    items: List[str] = []

class CampaignCreate(BaseModel):
    title: str
    description: str
    cover_image: str
    goal_amount: float
    end_date: str
    tiers: List[CampaignTier] = []

class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    goal_amount: Optional[float] = None
    end_date: Optional[str] = None
    tiers: Optional[List[CampaignTier]] = None
    is_active: Optional[bool] = None

class NewsletterSubscribe(BaseModel):
    email: str

class GalleryItemCreate(BaseModel):
    image_url: str
    caption: str

class BioUpdate(BaseModel):
    content: str
    photo_url: str = ""

class CheckoutRequest(BaseModel):
    campaign_id: str
    tier_id: str
    origin_url: str
    backer_name: str = ""
    backer_email: str = ""

# ─── Auth Routes ───
@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    from starlette.responses import JSONResponse
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user["_id"]), email)
    response = JSONResponse(content={
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "admin")
    })
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return response

@api_router.post("/auth/logout")
async def logout():
    from starlette.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token", path="/")
    return response

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

# ─── Campaign Routes ───
@api_router.get("/campaigns")
async def get_campaigns():
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(100)
    return campaigns

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.post("/campaigns")
async def create_campaign(data: CampaignCreate, user=Depends(get_current_user)):
    active_count = await db.campaigns.count_documents({"is_active": True})
    if active_count >= MAX_CAMPAIGNS:
        raise HTTPException(status_code=400, detail=f"Maximum of {MAX_CAMPAIGNS} active campaigns reached")
    
    campaign = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "cover_image": data.cover_image,
        "goal_amount": data.goal_amount,
        "raised_amount": 0.0,
        "backers_count": 0,
        "end_date": data.end_date,
        "tiers": [t.model_dump() for t in data.tiers],
        "is_active": True,
        "must_deliver": True,
        "platform_fee_percent": PLATFORM_FEE_PERCENT,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["email"]
    }
    await db.campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return campaign

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: CampaignUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "tiers" in update_data:
        update_data["tiers"] = [t if isinstance(t, dict) else t.model_dump() for t in update_data["tiers"]]
    result = await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    updated = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user=Depends(get_current_user)):
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}

# ─── Payment Routes ───
@api_router.post("/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    campaign = await db.campaigns.find_one({"id": data.campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    tier = None
    for t in campaign.get("tiers", []):
        if t["id"] == data.tier_id:
            tier = t
            break
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    
    amount = float(tier["price"])
    
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/campaign/{data.campaign_id}"
    
    metadata = {
        "campaign_id": data.campaign_id,
        "tier_id": data.tier_id,
        "backer_name": data.backer_name,
        "backer_email": data.backer_email,
        "platform_fee_percent": str(PLATFORM_FEE_PERCENT)
    }
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="brl",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        payment_methods=["card"]
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "campaign_id": data.campaign_id,
        "tier_id": data.tier_id,
        "amount": amount,
        "platform_fee": round(amount * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl",
        "backer_name": data.backer_name,
        "backer_email": data.backer_email,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if tx and tx["payment_status"] != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid"}}
        )
        await db.campaigns.update_one(
            {"id": tx["campaign_id"]},
            {"$inc": {"raised_amount": tx["amount"], "backers_count": 1}}
        )
    elif tx and status.payment_status != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status}}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        if webhook_response.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if tx and tx["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                await db.campaigns.update_one(
                    {"id": tx["campaign_id"]},
                    {"$inc": {"raised_amount": tx["amount"], "backers_count": 1}}
                )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ─── Admin Stats ───
@api_router.get("/admin/stats")
async def get_admin_stats(user=Depends(get_current_user)):
    campaigns = await db.campaigns.find({}, {"_id": 0}).to_list(100)
    total_raised = sum(c.get("raised_amount", 0) for c in campaigns)
    total_fee = round(total_raised * PLATFORM_FEE_PERCENT / 100, 2)
    total_backers = sum(c.get("backers_count", 0) for c in campaigns)
    active_campaigns = sum(1 for c in campaigns if c.get("is_active"))
    
    transactions = await db.payment_transactions.find({}, {"_id": 0}).to_list(1000)
    
    return {
        "total_raised": total_raised,
        "platform_fee_total": total_fee,
        "total_backers": total_backers,
        "active_campaigns": active_campaigns,
        "max_campaigns": MAX_CAMPAIGNS,
        "transactions": transactions
    }

# ─── Newsletter ───
@api_router.post("/newsletter")
async def subscribe_newsletter(data: NewsletterSubscribe):
    email = data.email.lower().strip()
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"message": "Already subscribed"}
    await db.newsletter.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Subscribed successfully"}

@api_router.get("/newsletter/subscribers")
async def get_subscribers(user=Depends(get_current_user)):
    subs = await db.newsletter.find({}, {"_id": 0}).to_list(1000)
    return subs

# ─── Gallery ───
@api_router.get("/gallery")
async def get_gallery():
    items = await db.gallery.find({}, {"_id": 0}).to_list(100)
    return items

@api_router.post("/gallery")
async def add_gallery_item(data: GalleryItemCreate, user=Depends(get_current_user)):
    item = {
        "id": str(uuid.uuid4()),
        "image_url": data.image_url,
        "caption": data.caption,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gallery.insert_one(item)
    item.pop("_id", None)
    return item

@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, user=Depends(get_current_user)):
    result = await db.gallery.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return {"message": "Deleted"}

# ─── Biography ───
@api_router.get("/bio")
async def get_bio():
    bio = await db.site_settings.find_one({"key": "biography"}, {"_id": 0})
    if not bio:
        return {"content": "", "photo_url": ""}
    return {"content": bio.get("content", ""), "photo_url": bio.get("photo_url", "")}

@api_router.put("/bio")
async def update_bio(data: BioUpdate, user=Depends(get_current_user)):
    await db.site_settings.update_one(
        {"key": "biography"},
        {"$set": {"key": "biography", "content": data.content, "photo_url": data.photo_url}},
        upsert=True
    )
    return {"message": "Biography updated"}

# ─── Seed Admin & Startup ───
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@edegar.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Edegar2026!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Edegar Agostinho",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")

    # Seed default bio
    bio = await db.site_settings.find_one({"key": "biography"})
    if not bio:
        await db.site_settings.insert_one({
            "key": "biography",
            "content": "Edegar Agostinho e um comediante, escritor e ilustrador brasileiro. Com um humor unico que mistura o absurdo com o cotidiano, ele conquistou leitores com obras como 'Mae, Eu Quero Um Apocalipse Zumbi!', 'Pohi - O Gato Assassino' e 'As Historias Mais Sem Graca do Mundo'. Suas historias sao recheadas de personagens memoraveis e situacoes hilariantes que fazem o leitor rir do inicio ao fim.",
            "photo_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600"
        })

    # Seed default gallery
    gallery_count = await db.gallery.count_documents({})
    if gallery_count == 0:
        gallery_items = [
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1713552565611-617645f853b4?w=600", "caption": "Show de stand-up", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600", "caption": "Performance ao vivo", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1770392735602-e22dff1b8fb8?w=600", "caption": "Bastidores", "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.gallery.insert_many(gallery_items)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    logger.info("Server started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
