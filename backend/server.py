from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import uuid
import re
import asyncio
import requests as http_requests
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest
)

try:
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "")
    HAS_RESEND = bool(resend.api_key)
except ImportError:
    HAS_RESEND = False

# ─── Object Storage ───
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "edegar-agostinho"
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set, file uploads disabled")
        return None
    try:
        resp = http_requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage nao configurado")
    resp = http_requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage nao configurado")
    resp = http_requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
PLATFORM_FEE_PERCENT = 5.0
MAX_CAMPAIGNS = 10
MAX_PRODUCTS = 10

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Email Helper ───
async def send_notification_email(to_email: str, subject: str, html_content: str):
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    if HAS_RESEND:
        try:
            params = {"from": sender, "to": [to_email], "subject": subject, "html": html_content}
            result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent to {to_email}: {result}")
            return True
        except Exception as e:
            logger.error(f"Email send failed: {e}")
            return False
    else:
        logger.info(f"[EMAIL LOG] To: {to_email} | Subject: {subject}")
        logger.info(f"[EMAIL LOG] Content: {html_content[:200]}...")
        # Save to db for admin to see
        await db.email_logs.insert_one({
            "id": str(uuid.uuid4()), "to": to_email, "subject": subject,
            "html": html_content, "status": "logged_no_key",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return False

def build_purchase_email(user_name: str, item_title: str, amount: float, tx_type: str):
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:3px solid #09090B;">
      <div style="background:#FFDE00;padding:20px 30px;border-bottom:3px solid #09090B;">
        <h1 style="margin:0;font-size:24px;color:#09090B;text-transform:uppercase;">Edegar Agostinho</h1>
      </div>
      <div style="padding:30px;">
        <h2 style="color:#09090B;margin-top:0;">{'Apoio confirmado!' if tx_type == 'campaign' else 'Compra confirmada!'}</h2>
        <p style="color:#333;font-size:16px;">Ola <strong>{user_name}</strong>,</p>
        <p style="color:#333;font-size:16px;">{'Seu apoio a campanha' if tx_type == 'campaign' else 'Sua compra de'} <strong>{item_title}</strong> foi confirmado com sucesso!</p>
        <div style="background:#F4F4F5;border:2px solid #09090B;padding:15px;margin:20px 0;">
          <p style="margin:5px 0;font-size:14px;"><strong>Valor:</strong> R$ {amount:.2f}</p>
          <p style="margin:5px 0;font-size:14px;"><strong>Data:</strong> {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}</p>
        </div>
        <p style="color:#333;font-size:14px;">O produto sera entregue conforme os detalhes da {'recompensa' if tx_type == 'campaign' else 'compra'}.</p>
        <p style="color:#666;font-size:12px;margin-top:30px;">Suporte: mateusbuarquepugli@gmail.com</p>
      </div>
    </div>
    """

# ─── Password Hashing ───
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ─── JWT ───
def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Voce precisa estar logado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token invalido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario nao encontrado")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessao expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalido")

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user

async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except Exception:
        return None

async def is_subscriber(user, allowed_plan_ids=None) -> bool:
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    sub = await db.subscriptions.find_one({"user_id": user["_id"], "status": "active"}, {"_id": 0})
    if not sub:
        return False
    if allowed_plan_ids and len(allowed_plan_ids) > 0:
        return sub.get("plan_id") in allowed_plan_ids
    return True

# ─── Pydantic Models ───
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str

class CampaignTier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    price: float
    min_donation: float = 0
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

class ProductCreate(BaseModel):
    title: str
    description: str
    image_url: str
    price: float
    stock: int = 999

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

class NewsletterSubscribe(BaseModel):
    email: str

class GalleryItemCreate(BaseModel):
    image_url: str
    caption: str

class BioUpdate(BaseModel):
    content: str
    photo_url: str = ""

class CheckoutCampaignRequest(BaseModel):
    campaign_id: str
    tier_id: str
    origin_url: str
    custom_amount: Optional[float] = None
    payment_method: str = "card"

class CheckoutProductRequest(BaseModel):
    product_id: str
    quantity: int = 1
    origin_url: str
    payment_method: str = "card"

class PixPaymentCreate(BaseModel):
    type: str
    campaign_id: Optional[str] = None
    tier_id: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = 1
    custom_amount: Optional[float] = None

class PixConfirmRequest(BaseModel):
    transaction_id: str

class SiteSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    site_subtitle: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    btn_color: Optional[str] = None
    btn_text_color: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    support_email: Optional[str] = None
    marquee_text: Optional[str] = None
    nav_label_home: Optional[str] = None
    nav_label_campaigns: Optional[str] = None
    nav_label_store: Optional[str] = None
    nav_label_bio: Optional[str] = None
    nav_label_gallery: Optional[str] = None
    nav_url_home: Optional[str] = None
    nav_url_campaigns: Optional[str] = None
    nav_url_store: Optional[str] = None
    nav_url_bio: Optional[str] = None
    nav_url_gallery: Optional[str] = None
    btn_label_hero_primary: Optional[str] = None
    btn_label_hero_secondary: Optional[str] = None
    btn_label_support: Optional[str] = None
    btn_label_buy_card: Optional[str] = None
    btn_label_buy_pix: Optional[str] = None
    header_icon_url: Optional[str] = None
    heading_color: Optional[str] = None
    subtitle_color: Optional[str] = None
    link_color: Optional[str] = None
    showcase_images: Optional[list] = None
    custom_domain: Optional[str] = None

class WithdrawRequest(BaseModel):
    amount: float
    pix_key: str
    pix_key_type: str = "cpf"

DEFAULT_SITE_SETTINGS = {
    "site_name": "Edegar Agostinho",
    "site_subtitle": "Comediante, escritor e ilustrador",
    "logo_url": "",
    "primary_color": "#FFDE00",
    "secondary_color": "#09090B",
    "accent_color": "#FF3B30",
    "bg_color": "#FFFFFF",
    "text_color": "#09090B",
    "btn_color": "#FFDE00",
    "btn_text_color": "#09090B",
    "hero_title": "Apoie a Comedia. Leia um livro.",
    "hero_subtitle": "Financiamento coletivo dos livros de Edegar Agostinho. Apoie a comedia brasileira e receba seu livro em casa.",
    "support_email": "mateusbuarquepugli@gmail.com",
    "marquee_text": "FINANCIAMENTO COLETIVO * PRODUTO ENTREGUE MESMO SE FATURAR R$0 * APOIE A COMEDIA * EDEGAR AGOSTINHO *",
    "nav_label_home": "Inicio",
    "nav_label_campaigns": "Campanhas",
    "nav_label_store": "Loja",
    "nav_label_bio": "Biografia",
    "nav_label_gallery": "Galeria",
    "nav_url_home": "/",
    "nav_url_campaigns": "/#campanhas",
    "nav_url_store": "/loja",
    "nav_url_bio": "/#biografia",
    "nav_url_gallery": "/#galeria",
    "btn_label_hero_primary": "Ver Campanhas",
    "btn_label_hero_secondary": "Sobre Edegar",
    "btn_label_support": "Apoiar",
    "btn_label_buy_card": "Pagar com Cartao",
    "btn_label_buy_pix": "Pagar com Pix",
    "header_icon_url": "",
    "heading_color": "#09090B",
    "subtitle_color": "#52525B",
    "link_color": "#3F3F46",
    "showcase_images": [],
    "custom_domain": ""
}

# ─── Auth Routes ───
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = req.email.lower().strip()
    phone = re.sub(r'[^0-9+]', '', req.phone.strip())
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Numero de celular invalido")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    hashed = hash_password(req.password)
    user_doc = {"email": email, "password_hash": hashed, "name": req.name.strip(), "phone": phone, "role": "user", "created_at": datetime.now(timezone.utc).isoformat()}
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    token = create_access_token(user_id, email, "user")
    response = JSONResponse(content={"id": user_id, "email": email, "name": req.name.strip(), "phone": phone, "role": "user"})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return response

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_access_token(str(user["_id"]), email, user.get("role", "user"))
    response = JSONResponse(content={"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""), "phone": user.get("phone", ""), "role": user.get("role", "user")})
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return response

@api_router.post("/auth/logout")
async def logout():
    response = JSONResponse(content={"message": "Desconectado"})
    response.delete_cookie("access_token", path="/")
    return response

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user

# ─── Site Settings (Admin Customization) ───
@api_router.get("/site-settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"key": "site_config"}, {"_id": 0})
    if not settings:
        return DEFAULT_SITE_SETTINGS
    result = {**DEFAULT_SITE_SETTINGS}
    for k, v in settings.items():
        if k != "key" and v:
            result[k] = v
    return result

@api_router.put("/site-settings")
async def update_site_settings(data: SiteSettingsUpdate, user=Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["key"] = "site_config"
    await db.site_settings.update_one(
        {"key": "site_config"}, {"$set": update_data}, upsert=True
    )
    return {"message": "Configuracoes atualizadas"}

# ─── Campaign Routes ───
@api_router.get("/campaigns")
async def get_campaigns():
    return await db.campaigns.find({}, {"_id": 0}).to_list(100)

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    return campaign

@api_router.post("/campaigns")
async def create_campaign(data: CampaignCreate, user=Depends(require_admin)):
    active_count = await db.campaigns.count_documents({"is_active": True})
    if active_count >= MAX_CAMPAIGNS:
        raise HTTPException(status_code=400, detail=f"Maximo de {MAX_CAMPAIGNS} campanhas ativas")
    campaign = {
        "id": str(uuid.uuid4()), "title": data.title, "description": data.description,
        "cover_image": data.cover_image, "goal_amount": data.goal_amount,
        "raised_amount": 0.0, "backers_count": 0, "end_date": data.end_date,
        "tiers": [t.model_dump() for t in data.tiers], "is_active": True,
        "must_deliver": True, "platform_fee_percent": PLATFORM_FEE_PERCENT,
        "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["email"]
    }
    await db.campaigns.insert_one(campaign)
    campaign.pop("_id", None)
    return campaign

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: CampaignUpdate, user=Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "tiers" in update_data:
        update_data["tiers"] = [t if isinstance(t, dict) else t.model_dump() for t in update_data["tiers"]]
    result = await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    return await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user=Depends(require_admin)):
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    return {"message": "Campanha excluida"}

# ─── Products (Loja) Routes ───
@api_router.get("/products")
async def get_products():
    return await db.products.find({}, {"_id": 0}).to_list(100)

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return product

@api_router.post("/products")
async def create_product(data: ProductCreate, user=Depends(require_admin)):
    active_count = await db.products.count_documents({"is_active": True})
    if active_count >= MAX_PRODUCTS:
        raise HTTPException(status_code=400, detail=f"Maximo de {MAX_PRODUCTS} produtos ativos")
    product = {
        "id": str(uuid.uuid4()), "title": data.title, "description": data.description,
        "image_url": data.image_url, "price": data.price, "stock": data.stock,
        "sold_count": 0, "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["email"]
    }
    await db.products.insert_one(product)
    product.pop("_id", None)
    return product

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, user=Depends(require_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return await db.products.find_one({"id": product_id}, {"_id": 0})

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return {"message": "Produto excluido"}

# ─── User Orders (Purchase History) ───
@api_router.get("/user/orders")
async def get_user_orders(user=Depends(get_current_user)):
    transactions = await db.payment_transactions.find(
        {"user_id": user["_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Batch fetch only referenced campaigns and products
    campaign_ids = list(set(tx.get("campaign_id") for tx in transactions if tx.get("campaign_id")))
    product_ids = list(set(tx.get("product_id") for tx in transactions if tx.get("product_id")))
    campaigns_map = {c["id"]: c for c in await db.campaigns.find({"id": {"$in": campaign_ids}}, {"_id": 0, "id": 1, "title": 1, "cover_image": 1}).to_list(100)} if campaign_ids else {}
    products_map = {p["id"]: p for p in await db.products.find({"id": {"$in": product_ids}}, {"_id": 0, "id": 1, "title": 1, "image_url": 1}).to_list(100)} if product_ids else {}
    
    for tx in transactions:
        if tx.get("type") == "campaign" and tx.get("campaign_id"):
            camp = campaigns_map.get(tx["campaign_id"])
            tx["item_title"] = camp["title"] if camp else "Campanha"
            tx["item_image"] = camp.get("cover_image", "") if camp else ""
        elif tx.get("type") == "product" and tx.get("product_id"):
            prod = products_map.get(tx["product_id"])
            tx["item_title"] = prod["title"] if prod else "Produto"
            tx["item_image"] = prod.get("image_url", "") if prod else ""
        else:
            tx["item_title"] = "Item"
            tx["item_image"] = ""
    return transactions

# ─── Payment Routes ───
async def process_successful_payment(tx):
    """Send email notification after successful payment"""
    item_title = "Item"
    if tx.get("type") == "campaign" and tx.get("campaign_id"):
        camp = await db.campaigns.find_one({"id": tx["campaign_id"]}, {"_id": 0})
        item_title = camp["title"] if camp else "Campanha"
    elif tx.get("type") == "product" and tx.get("product_id"):
        prod = await db.products.find_one({"id": tx["product_id"]}, {"_id": 0})
        item_title = prod["title"] if prod else "Produto"
    
    html = build_purchase_email(
        user_name=tx.get("user_name", "Cliente"),
        item_title=item_title,
        amount=tx.get("amount", 0),
        tx_type=tx.get("type", "product")
    )
    subject = f"{'Apoio' if tx['type'] == 'campaign' else 'Compra'} confirmado(a) - {item_title}"
    if tx.get("user_email"):
        await send_notification_email(tx["user_email"], subject, html)

PIX_KEY = "mateusbpugli@gmail.com"
PIX_KEY_TYPE = "email"

@api_router.post("/checkout/campaign")
async def checkout_campaign(data: CheckoutCampaignRequest, request: Request, user=Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": data.campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    tier = next((t for t in campaign.get("tiers", []) if t["id"] == data.tier_id), None)
    if not tier:
        raise HTTPException(status_code=404, detail="Recompensa nao encontrada")
    
    min_amount = tier.get("min_donation", 0) or tier["price"]
    if data.custom_amount and data.custom_amount >= min_amount:
        amount = float(data.custom_amount)
    else:
        amount = float(tier["price"])
    
    if amount < min_amount:
        raise HTTPException(status_code=400, detail=f"Valor minimo: R$ {min_amount:.2f}")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/campaign/{data.campaign_id}"
    metadata = {
        "type": "campaign", "campaign_id": data.campaign_id, "tier_id": data.tier_id,
        "user_id": user["_id"], "user_email": user["email"], "user_name": user.get("name", ""),
        "platform_fee_percent": str(PLATFORM_FEE_PERCENT)
    }
    checkout_request = CheckoutSessionRequest(
        amount=amount, currency="brl", success_url=success_url, cancel_url=cancel_url,
        metadata=metadata, payment_methods=["card"]
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = {
        "id": str(uuid.uuid4()), "session_id": session.session_id, "type": "campaign",
        "campaign_id": data.campaign_id, "tier_id": data.tier_id, "product_id": None,
        "amount": amount, "platform_fee": round(amount * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl", "user_id": user["_id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "payment_status": "pending",
        "payment_method": "card",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    return {"url": session.url, "session_id": session.session_id}

@api_router.post("/checkout/product")
async def checkout_product(data: CheckoutProductRequest, request: Request, user=Depends(get_current_user)):
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    if not product.get("is_active"):
        raise HTTPException(status_code=400, detail="Produto indisponivel")
    
    amount = float(product["price"]) * data.quantity
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/loja"
    metadata = {
        "type": "product", "product_id": data.product_id, "quantity": str(data.quantity),
        "user_id": user["_id"], "user_email": user["email"], "user_name": user.get("name", ""),
        "platform_fee_percent": str(PLATFORM_FEE_PERCENT)
    }
    checkout_request = CheckoutSessionRequest(
        amount=amount, currency="brl", success_url=success_url, cancel_url=cancel_url,
        metadata=metadata, payment_methods=["card"]
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = {
        "id": str(uuid.uuid4()), "session_id": session.session_id, "type": "product",
        "campaign_id": None, "tier_id": None, "product_id": data.product_id,
        "quantity": data.quantity, "amount": amount,
        "platform_fee": round(amount * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl", "user_id": user["_id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "payment_status": "pending",
        "payment_method": "card",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    return {"url": session.url, "session_id": session.session_id}

# ─── Pix Manual Payment ───
@api_router.post("/checkout/pix")
async def create_pix_payment(data: PixPaymentCreate, user=Depends(get_current_user)):
    amount = 0.0
    item_title = ""
    
    if data.type == "campaign":
        if not data.campaign_id or not data.tier_id:
            raise HTTPException(status_code=400, detail="campaign_id e tier_id obrigatorios")
        campaign = await db.campaigns.find_one({"id": data.campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campanha nao encontrada")
        tier = next((t for t in campaign.get("tiers", []) if t["id"] == data.tier_id), None)
        if not tier:
            raise HTTPException(status_code=404, detail="Recompensa nao encontrada")
        min_amount = tier.get("min_donation", 0) or tier["price"]
        if data.custom_amount and data.custom_amount >= min_amount:
            amount = float(data.custom_amount)
        else:
            amount = float(tier["price"])
        if amount < min_amount:
            raise HTTPException(status_code=400, detail=f"Valor minimo: R$ {min_amount:.2f}")
        item_title = campaign["title"]
    elif data.type == "product":
        if not data.product_id:
            raise HTTPException(status_code=400, detail="product_id obrigatorio")
        product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Produto nao encontrado")
        amount = float(product["price"]) * data.quantity
        item_title = product["title"]
    else:
        raise HTTPException(status_code=400, detail="Tipo invalido")
    
    tx_id = str(uuid.uuid4())
    transaction = {
        "id": tx_id, "session_id": f"pix_{tx_id}", "type": data.type,
        "campaign_id": data.campaign_id, "tier_id": data.tier_id,
        "product_id": data.product_id, "quantity": data.quantity,
        "amount": amount, "platform_fee": round(amount * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl", "user_id": user["_id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "payment_status": "awaiting_pix",
        "payment_method": "pix",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {
        "transaction_id": tx_id,
        "amount": amount,
        "pix_key": PIX_KEY,
        "pix_key_type": PIX_KEY_TYPE,
        "item_title": item_title,
        "message": f"Envie R$ {amount:.2f} via Pix para {PIX_KEY}"
    }

@api_router.get("/pix-info")
async def get_pix_info():
    return {"pix_key": PIX_KEY, "pix_key_type": PIX_KEY_TYPE}

@api_router.post("/admin/confirm-pix")
async def confirm_pix_payment(data: PixConfirmRequest, user=Depends(require_admin)):
    tx = await db.payment_transactions.find_one({"id": data.transaction_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")
    if tx["payment_status"] != "awaiting_pix":
        raise HTTPException(status_code=400, detail="Transacao ja processada")
    
    await db.payment_transactions.update_one(
        {"id": data.transaction_id}, {"$set": {"payment_status": "paid"}}
    )
    if tx.get("type") == "campaign" and tx.get("campaign_id"):
        await db.campaigns.update_one(
            {"id": tx["campaign_id"]}, {"$inc": {"raised_amount": tx["amount"], "backers_count": 1}}
        )
    elif tx.get("type") == "product" and tx.get("product_id"):
        qty = tx.get("quantity", 1)
        await db.products.update_one(
            {"id": tx["product_id"]}, {"$inc": {"sold_count": qty, "stock": -qty}}
        )
    
    tx["payment_status"] = "paid"
    await process_successful_payment(tx)
    return {"message": "Pagamento Pix confirmado!"}

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
            {"session_id": session_id}, {"$set": {"payment_status": "paid"}}
        )
        if tx.get("type") == "campaign" and tx.get("campaign_id"):
            await db.campaigns.update_one(
                {"id": tx["campaign_id"]}, {"$inc": {"raised_amount": tx["amount"], "backers_count": 1}}
            )
        elif tx.get("type") == "product" and tx.get("product_id"):
            qty = tx.get("quantity", 1)
            await db.products.update_one(
                {"id": tx["product_id"]}, {"$inc": {"sold_count": qty, "stock": -qty}}
            )
        # Send email notification
        await process_successful_payment(tx)
    elif tx and status.payment_status != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id}, {"$set": {"payment_status": status.payment_status}}
        )
    
    return {"status": status.status, "payment_status": status.payment_status, "amount_total": status.amount_total, "currency": status.currency}

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
                    {"session_id": webhook_response.session_id}, {"$set": {"payment_status": "paid"}}
                )
                if tx.get("type") == "campaign" and tx.get("campaign_id"):
                    await db.campaigns.update_one(
                        {"id": tx["campaign_id"]}, {"$inc": {"raised_amount": tx["amount"], "backers_count": 1}}
                    )
                elif tx.get("type") == "product" and tx.get("product_id"):
                    qty = tx.get("quantity", 1)
                    await db.products.update_one(
                        {"id": tx["product_id"]}, {"$inc": {"sold_count": qty, "stock": -qty}}
                    )
                tx_clean = {k: v for k, v in tx.items() if k != "_id"}
                await process_successful_payment(tx_clean)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ─── Admin Stats ───
@api_router.get("/admin/stats")
async def get_admin_stats(user=Depends(require_admin)):
    campaigns = await db.campaigns.find({}, {"_id": 0, "id": 1, "raised_amount": 1, "backers_count": 1, "is_active": 1}).to_list(100)
    products = await db.products.find({}, {"_id": 0, "is_active": 1}).to_list(100)
    transactions = await db.payment_transactions.find({}, {"_id": 0}).to_list(1000)
    email_logs = await db.email_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    total_raised_campaigns = sum(c.get("raised_amount", 0) for c in campaigns)
    total_product_sales = sum(t["amount"] for t in transactions if t.get("type") == "product" and t.get("payment_status") == "paid")
    total_revenue = total_raised_campaigns + total_product_sales
    total_fee = round(total_revenue * PLATFORM_FEE_PERCENT / 100, 2)
    total_backers = sum(c.get("backers_count", 0) for c in campaigns)
    active_campaigns = sum(1 for c in campaigns if c.get("is_active"))
    active_products = sum(1 for p in products if p.get("is_active"))
    
    return {
        "total_raised": total_revenue, "total_raised_campaigns": total_raised_campaigns,
        "total_product_sales": total_product_sales, "platform_fee_total": total_fee,
        "total_backers": total_backers, "active_campaigns": active_campaigns,
        "active_products": active_products, "max_campaigns": MAX_CAMPAIGNS,
        "max_products": MAX_PRODUCTS, "transactions": transactions,
        "email_logs": email_logs, "has_resend": HAS_RESEND
    }

# ─── Admin Balance & Withdrawals ───
@api_router.get("/admin/balance")
async def get_admin_balance(user=Depends(require_admin)):
    paid_txs = await db.payment_transactions.find(
        {"payment_status": "paid"}, {"_id": 0, "amount": 1, "platform_fee": 1}
    ).to_list(10000)
    total_revenue = sum(t.get("amount", 0) for t in paid_txs)
    total_platform_fees = sum(t.get("platform_fee", 0) for t in paid_txs)
    
    withdrawals = await db.withdrawals.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals if w.get("status") == "completed")
    pending_withdrawn = sum(w.get("amount", 0) for w in withdrawals if w.get("status") == "pending")
    
    # Admin receives ALL revenue (including 5% platform fee)
    available_balance = round(total_revenue - total_withdrawn - pending_withdrawn, 2)
    
    return {
        "total_revenue": total_revenue,
        "platform_fee": total_platform_fees,
        "net_revenue": total_revenue,
        "total_withdrawn": total_withdrawn,
        "pending_withdrawn": pending_withdrawn,
        "available_balance": max(0, available_balance),
        "withdrawals": withdrawals
    }

@api_router.post("/admin/withdraw")
async def request_withdrawal(data: WithdrawRequest, user=Depends(require_admin)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")
    if not data.pix_key or len(data.pix_key.strip()) < 5:
        raise HTTPException(status_code=400, detail="Chave Pix invalida")
    
    # Calculate available balance - admin gets ALL revenue
    paid_txs = await db.payment_transactions.find(
        {"payment_status": "paid"}, {"_id": 0, "amount": 1}
    ).to_list(10000)
    total_revenue = sum(t.get("amount", 0) for t in paid_txs)
    
    withdrawals = await db.withdrawals.find({}, {"_id": 0, "amount": 1, "status": 1}).to_list(500)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals if w.get("status") in ("completed", "pending"))
    available = round(total_revenue - total_withdrawn, 2)
    
    if data.amount > available:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Disponivel: R$ {available:.2f}")
    
    withdrawal = {
        "id": str(uuid.uuid4()),
        "amount": data.amount,
        "pix_key": data.pix_key.strip(),
        "pix_key_type": data.pix_key_type,
        "status": "completed",
        "requested_by": user["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawals.insert_one(withdrawal)
    withdrawal.pop("_id", None)
    
    logger.info(f"Withdrawal completed: R$ {data.amount:.2f} to Pix {data.pix_key_type}: {data.pix_key}")
    return {"message": f"Saque de R$ {data.amount:.2f} realizado com sucesso!", "withdrawal": withdrawal}

# ─── Showcase (Vitrine) ───
@api_router.get("/showcase")
async def get_showcase():
    items = await db.showcase.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return items

@api_router.post("/showcase")
async def add_showcase_item(request: Request, user=Depends(require_admin)):
    body = await request.json()
    item = {
        "id": str(uuid.uuid4()),
        "image_url": body.get("image_url", ""),
        "title": body.get("title", ""),
        "link": body.get("link", ""),
        "order": body.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.showcase.insert_one(item)
    item.pop("_id", None)
    return item

@api_router.delete("/showcase/{item_id}")
async def delete_showcase_item(item_id: str, user=Depends(require_admin)):
    result = await db.showcase.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return {"message": "Excluido"}

# ─── Videos ───
VIDEO_EXTENSIONS = {"mp4", "webm", "mov", "avi"}
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB

@api_router.post("/videos/upload")
async def upload_video(file: UploadFile = File(...), user=Depends(require_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato nao permitido. Use: {', '.join(VIDEO_EXTENSIONS)}")
    data = await file.read()
    if len(data) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (max 500MB)")
    mime_types = {"mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime", "avi": "video/x-msvideo"}
    content_type = mime_types.get(ext, file.content_type or "video/mp4")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/videos/{file_id}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, content_type)
    except Exception as e:
        logger.error(f"Video upload failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao fazer upload do video")
    return {"file_id": file_id, "storage_path": result["path"], "size": result.get("size", len(data)), "content_type": content_type}

@api_router.post("/videos")
async def create_video(request: Request, user=Depends(require_admin)):
    body = await request.json()
    video = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "file_id": body.get("file_id", ""),
        "storage_path": body.get("storage_path", ""),
        "thumbnail_url": body.get("thumbnail_url", ""),
        "content_type": body.get("content_type", "video/mp4"),
        "size": body.get("size", 0),
        "is_public": body.get("is_public", True),
        "subscribers_only": body.get("subscribers_only", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["email"]
    }
    await db.videos.insert_one(video)
    video.pop("_id", None)
    return video

@api_router.get("/videos")
async def get_videos(request: Request):
    user = await get_optional_user(request)
    is_admin = user and user.get("role") == "admin"
    if is_admin:
        return await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    all_vids = await db.videos.find({"is_public": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for vid in all_vids:
        if not vid.get("subscribers_only"):
            result.append(vid)
        else:
            allowed = vid.get("allowed_plan_ids", [])
            if await is_subscriber(user, allowed if allowed else None):
                result.append(vid)
            else:
                vid["locked"] = True
                result.append(vid)
    return result

@api_router.put("/videos/{video_id}")
async def update_video(video_id: str, request: Request, user=Depends(require_admin)):
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ("title", "description", "thumbnail_url", "is_public", "subscribers_only", "allowed_plan_ids")}
    result = await db.videos.update_one({"id": video_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video nao encontrado")
    return await db.videos.find_one({"id": video_id}, {"_id": 0})

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, user=Depends(require_admin)):
    result = await db.videos.delete_one({"id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video nao encontrado")
    return {"message": "Video excluido"}

@api_router.get("/videos/{video_id}/stream")
async def stream_video(video_id: str):
    video = await db.videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video nao encontrado")
    try:
        data, _ = await asyncio.to_thread(get_object, video["storage_path"])
        return Response(content=data, media_type=video.get("content_type", "video/mp4"))
    except Exception as e:
        logger.error(f"Video stream failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar video")

# ─── File Upload ───
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(require_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato nao permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}")
    
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (max 5MB)")
    
    mime_types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}
    content_type = mime_types.get(ext, file.content_type or "application/octet-stream")
    
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    
    try:
        result = await asyncio.to_thread(put_object, path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao fazer upload do arquivo")
    
    file_doc = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    file_doc.pop("_id", None)
    
    return {"id": file_id, "url": f"/api/files/{file_id}", "filename": file.filename}

@api_router.get("/files/{file_id}")
async def serve_file(file_id: str):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    try:
        data, content_type = await asyncio.to_thread(get_object, record["storage_path"])
        return Response(content=data, media_type=record.get("content_type", content_type))
    except Exception as e:
        logger.error(f"File serve failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar arquivo")

# ─── Newsletter ───
@api_router.post("/newsletter")
async def subscribe_newsletter(data: NewsletterSubscribe):
    email = data.email.lower().strip()
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"message": "Ja inscrito"}
    await db.newsletter.insert_one({"id": str(uuid.uuid4()), "email": email, "subscribed_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Inscrito com sucesso!"}

@api_router.get("/newsletter/subscribers")
async def get_subscribers(user=Depends(require_admin)):
    return await db.newsletter.find({}, {"_id": 0}).to_list(1000)

# ─── Gallery ───
@api_router.get("/gallery")
async def get_gallery():
    return await db.gallery.find({}, {"_id": 0}).to_list(100)

@api_router.post("/gallery")
async def add_gallery_item(data: GalleryItemCreate, user=Depends(require_admin)):
    item = {"id": str(uuid.uuid4()), "image_url": data.image_url, "caption": data.caption, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.gallery.insert_one(item)
    item.pop("_id", None)
    return item

@api_router.delete("/gallery/{item_id}")
async def delete_gallery_item(item_id: str, user=Depends(require_admin)):
    result = await db.gallery.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    return {"message": "Excluido"}

# ─── Biography ───
@api_router.get("/bio")
async def get_bio():
    bio = await db.site_settings.find_one({"key": "biography"}, {"_id": 0})
    if not bio:
        return {"content": "", "photo_url": ""}
    return {"content": bio.get("content", ""), "photo_url": bio.get("photo_url", "")}

@api_router.put("/bio")
async def update_bio(data: BioUpdate, user=Depends(require_admin)):
    await db.site_settings.update_one(
        {"key": "biography"}, {"$set": {"key": "biography", "content": data.content, "photo_url": data.photo_url}}, upsert=True
    )
    return {"message": "Biografia atualizada"}

# ─── Subscription Plans ───
@api_router.get("/subscription-plans")
async def get_subscription_plans():
    return await db.subscription_plans.find({}, {"_id": 0}).sort("price", 1).to_list(20)

@api_router.post("/subscription-plans")
async def create_plan(request: Request, user=Depends(require_admin)):
    body = await request.json()
    plan = {
        "id": str(uuid.uuid4()),
        "name": body.get("name", ""),
        "description": body.get("description", ""),
        "price": float(body.get("price", 0)),
        "duration_days": int(body.get("duration_days", 30)),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscription_plans.insert_one(plan)
    plan.pop("_id", None)
    return plan

@api_router.put("/subscription-plans/{plan_id}")
async def update_plan(plan_id: str, request: Request, user=Depends(require_admin)):
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ("name", "description", "price", "duration_days", "is_active")}
    if "price" in update: update["price"] = float(update["price"])
    if "duration_days" in update: update["duration_days"] = int(update["duration_days"])
    await db.subscription_plans.update_one({"id": plan_id}, {"$set": update})
    return await db.subscription_plans.find_one({"id": plan_id}, {"_id": 0})

@api_router.delete("/subscription-plans/{plan_id}")
async def delete_plan(plan_id: str, user=Depends(require_admin)):
    await db.subscription_plans.delete_one({"id": plan_id})
    return {"message": "Plano excluido"}

# ─── User Subscriptions ───
@api_router.get("/user/subscription")
async def get_user_subscription(user=Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"user_id": user["_id"], "status": "active"}, {"_id": 0})
    return {"is_subscribed": sub is not None, "subscription": sub}

@api_router.post("/subscribe")
async def subscribe_to_plan(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    plan_id = body.get("plan_id")
    plan = await db.subscription_plans.find_one({"id": plan_id, "is_active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plano nao encontrado")

    # Check if already subscribed
    existing = await db.subscriptions.find_one({"user_id": user["_id"], "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="Voce ja possui uma assinatura ativa")

    now = datetime.now(timezone.utc)
    sub = {
        "id": str(uuid.uuid4()),
        "user_id": user["_id"],
        "user_email": user["email"],
        "user_name": user.get("name", ""),
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "amount": plan["price"],
        "status": "active",
        "started_at": now.isoformat(),
        "expires_at": (now + timedelta(days=plan["duration_days"])).isoformat(),
        "created_at": now.isoformat()
    }
    await db.subscriptions.insert_one(sub)
    sub.pop("_id", None)

    # Record payment
    tx = {
        "id": str(uuid.uuid4()), "session_id": f"sub_{sub['id']}", "type": "subscription",
        "campaign_id": None, "tier_id": None, "product_id": None,
        "amount": plan["price"], "platform_fee": round(plan["price"] * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl", "user_id": user["_id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "payment_status": "awaiting_pix",
        "payment_method": "pix", "created_at": now.isoformat()
    }
    await db.payment_transactions.insert_one(tx)

    return {"message": "Assinatura criada! Faca o pagamento via Pix.", "subscription": sub, "pix_key": PIX_KEY, "pix_key_type": PIX_KEY_TYPE, "amount": plan["price"]}

@api_router.post("/subscribe/card")
async def subscribe_card(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    plan_id = body.get("plan_id")
    origin_url = body.get("origin_url", "")
    plan = await db.subscription_plans.find_one({"id": plan_id, "is_active": True}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plano nao encontrado")
    existing = await db.subscriptions.find_one({"user_id": user["_id"], "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="Voce ja possui uma assinatura ativa")

    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&type=subscription&plan_id={plan_id}"
    cancel_url = f"{origin_url}/assinatura"
    metadata = {"type": "subscription", "plan_id": plan_id, "user_id": user["_id"], "user_email": user["email"]}
    checkout_request = CheckoutSessionRequest(amount=plan["price"], currency="brl", success_url=success_url, cancel_url=cancel_url, metadata=metadata, payment_methods=["card"])
    session = await stripe_checkout.create_checkout_session(checkout_request)

    now = datetime.now(timezone.utc)
    tx = {
        "id": str(uuid.uuid4()), "session_id": session.session_id, "type": "subscription",
        "campaign_id": None, "tier_id": None, "product_id": None,
        "amount": plan["price"], "platform_fee": round(plan["price"] * PLATFORM_FEE_PERCENT / 100, 2),
        "currency": "brl", "user_id": user["_id"], "user_email": user["email"],
        "user_name": user.get("name", ""), "payment_status": "pending",
        "payment_method": "card", "plan_id": plan_id, "created_at": now.isoformat()
    }
    await db.payment_transactions.insert_one(tx)
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/admin/subscriptions")
async def get_all_subscriptions(user=Depends(require_admin)):
    return await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

# ─── Live Streaming ───
live_state = {
    "is_live": False,
    "title": "",
    "started_at": None,
    "admin_ws": None,
    "subscribers_only": False,
    "allowed_plan_ids": [],
}
live_viewers: list = []
live_chat: list = []

@api_router.get("/live/status")
async def get_live_status():
    return {
        "is_live": live_state["is_live"],
        "title": live_state["title"],
        "started_at": live_state["started_at"],
        "viewer_count": len(live_viewers),
        "subscribers_only": live_state["subscribers_only"],
        "allowed_plan_ids": live_state["allowed_plan_ids"],
    }

@api_router.post("/live/start")
async def start_live(request: Request, user=Depends(require_admin)):
    body = await request.json()
    live_state["is_live"] = True
    live_state["title"] = body.get("title", "Live")
    live_state["started_at"] = datetime.now(timezone.utc).isoformat()
    live_state["subscribers_only"] = body.get("subscribers_only", False)
    live_state["allowed_plan_ids"] = body.get("allowed_plan_ids", [])
    live_chat.clear()
    return {"message": "Live iniciada", "status": live_state}

@api_router.post("/live/visibility")
async def toggle_live_visibility(request: Request, user=Depends(require_admin)):
    body = await request.json()
    if "subscribers_only" in body: live_state["subscribers_only"] = body["subscribers_only"]
    if "allowed_plan_ids" in body: live_state["allowed_plan_ids"] = body["allowed_plan_ids"]
    # Notify viewers of visibility change
    for ws in live_viewers[:]:
        try:
            await ws.send_json({"type": "visibility_changed", "subscribers_only": live_state["subscribers_only"]})
        except Exception:
            pass
    return {"message": "Visibilidade atualizada", "subscribers_only": live_state["subscribers_only"]}

@api_router.post("/live/stop")
async def stop_live(user=Depends(require_admin)):
    live_state["is_live"] = False
    live_state["title"] = ""
    live_state["started_at"] = None
    live_state["admin_ws"] = None
    # Notify viewers
    for ws in live_viewers[:]:
        try:
            await ws.send_json({"type": "live_ended"})
        except Exception:
            pass
    live_viewers.clear()
    live_chat.clear()
    return {"message": "Live encerrada"}

# ─── Recordings ───
@api_router.post("/recordings/upload")
async def upload_recording(file: UploadFile = File(...), user=Depends(require_admin)):
    data = await file.read()
    if len(data) > 500 * 1024 * 1024:  # 500MB max
        raise HTTPException(status_code=400, detail="Arquivo muito grande (max 500MB)")
    file_id = str(uuid.uuid4())
    ext = "webm"
    path = f"{APP_NAME}/recordings/{file_id}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, "video/webm")
    except Exception as e:
        logger.error(f"Recording upload failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao salvar gravacao")
    return {"file_id": file_id, "storage_path": result["path"], "size": result.get("size", len(data))}

@api_router.post("/recordings")
async def create_recording(request: Request, user=Depends(require_admin)):
    body = await request.json()
    rec = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", "Live gravada"),
        "file_id": body.get("file_id", ""),
        "storage_path": body.get("storage_path", ""),
        "duration": body.get("duration", 0),
        "size": body.get("size", 0),
        "is_public": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["email"]
    }
    await db.recordings.insert_one(rec)
    rec.pop("_id", None)
    return rec

@api_router.get("/recordings")
async def get_recordings(request: Request):
    user = await get_optional_user(request)
    is_admin = user and user.get("role") == "admin"
    if is_admin:
        return await db.recordings.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    all_recs = await db.recordings.find({"is_public": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    result = []
    for rec in all_recs:
        if not rec.get("subscribers_only"):
            result.append(rec)
        else:
            allowed = rec.get("allowed_plan_ids", [])
            if await is_subscriber(user, allowed if allowed else None):
                result.append(rec)
            else:
                rec["locked"] = True
                result.append(rec)
    return result

@api_router.put("/recordings/{rec_id}/visibility")
async def toggle_recording_visibility(rec_id: str, request: Request, user=Depends(require_admin)):
    body = await request.json()
    update = {}
    if "is_public" in body: update["is_public"] = body["is_public"]
    if "subscribers_only" in body: update["subscribers_only"] = body["subscribers_only"]
    if "allowed_plan_ids" in body: update["allowed_plan_ids"] = body["allowed_plan_ids"]
    await db.recordings.update_one({"id": rec_id}, {"$set": update})
    return {"message": "Visibilidade atualizada"}

@api_router.delete("/recordings/{rec_id}")
async def delete_recording(rec_id: str, user=Depends(require_admin)):
    result = await db.recordings.delete_one({"id": rec_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gravacao nao encontrada")
    return {"message": "Gravacao excluida"}

@api_router.get("/recordings/{rec_id}/stream")
async def stream_recording(rec_id: str):
    rec = await db.recordings.find_one({"id": rec_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Gravacao nao encontrada")
    try:
        data, content_type = await asyncio.to_thread(get_object, rec["storage_path"])
        return Response(content=data, media_type="video/webm")
    except Exception as e:
        logger.error(f"Recording stream failed: {e}")
        raise HTTPException(status_code=500, detail="Erro ao carregar gravacao")

@api_router.post("/live/chat")
async def send_chat(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    msg = {
        "id": str(uuid.uuid4()),
        "user_name": user.get("name", user.get("email", "Anonimo")),
        "message": body.get("message", "")[:500],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    live_chat.append(msg)
    if len(live_chat) > 200:
        live_chat.pop(0)
    # Broadcast to all viewers
    for ws in live_viewers[:]:
        try:
            await ws.send_json({"type": "chat", "data": msg})
        except Exception:
            pass
    return msg

@api_router.get("/live/chat")
async def get_chat():
    return live_chat[-50:]

# WebSocket for admin streaming
@app.websocket("/ws/live/stream")
async def ws_admin_stream(websocket: WebSocket):
    await websocket.accept()
    live_state["admin_ws"] = websocket
    logger.info("Admin stream connected")
    try:
        while True:
            data = await websocket.receive_bytes()
            # Relay to all viewers
            disconnected = []
            for i, viewer in enumerate(live_viewers):
                try:
                    await viewer.send_bytes(data)
                except Exception:
                    disconnected.append(i)
            for i in reversed(disconnected):
                live_viewers.pop(i)
    except WebSocketDisconnect:
        logger.info("Admin stream disconnected")
        live_state["admin_ws"] = None

# WebSocket for viewers
@app.websocket("/ws/live/watch")
async def ws_viewer(websocket: WebSocket):
    await websocket.accept()
    live_viewers.append(websocket)
    logger.info(f"Viewer connected. Total: {len(live_viewers)}")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in live_viewers:
            live_viewers.remove(websocket)
        logger.info(f"Viewer disconnected. Total: {len(live_viewers)}")

# ─── Seed & Startup ───
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "mateusbpugli@gmail.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Mateus Buarque 1101")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Mateus Buarque", "role": "admin", "phone": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    if not await db.site_settings.find_one({"key": "biography"}):
        await db.site_settings.insert_one({
            "key": "biography",
            "content": "Edegar Agostinho e um comediante, escritor e ilustrador brasileiro. Com um humor unico que mistura o absurdo com o cotidiano, ele conquistou leitores com obras como 'Mae, Eu Quero Um Apocalipse Zumbi!', 'Pohi - O Gato Assassino' e 'As Historias Mais Sem Graca do Mundo'.",
            "photo_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600"
        })
    if await db.gallery.count_documents({}) == 0:
        await db.gallery.insert_many([
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1713552565611-617645f853b4?w=600", "caption": "Show de stand-up", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600", "caption": "Performance ao vivo", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "image_url": "https://images.unsplash.com/photo-1770392735602-e22dff1b8fb8?w=600", "caption": "Bastidores", "created_at": datetime.now(timezone.utc).isoformat()},
        ])

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed_admin()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    logger.info("Server started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api_router)

FRONTEND_ORIGIN = os.environ.get("FRONTEND_URL", "https://edegar-comedy-store.preview.emergentagent.com")
cors_origins = [FRONTEND_ORIGIN, "http://localhost:3000", "https://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
