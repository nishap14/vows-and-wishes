from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from enum import Enum
from appointment_routes import router as appointment_router
from pydantic import BaseModel, EmailStr, Field

# --- Create app first ---
app = FastAPI()

# --- Create router for /api ---
api_router = APIRouter(prefix="/api")

# --- Load environment ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- MongoDB connection ---

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("MONGO_URL and DB_NAME must be set in Vercel")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# --- JWT Config ---
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set in Vercel")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


# --- Security ---
security = HTTPBearer()

# --- Service Categories ---
class ServiceCategory(str, Enum):
    VENUE = "venues"
    CATERING = "catering"
    DECORATION = "decoration"
    PHOTOGRAPHY = "photography"
    MAKEUP = "makeup"
    DJ = "dj"
    TRANSPORT = "transport"
    GIFTS = "gifts"

# --- Models ---
class User(BaseModel): 
    id: str = Field(default_factory=lambda: str(uuid.uuid4())) 
    name: str 
    email: str 
    phone: str | None = None 
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: ServiceCategory
    description: str
    price_range: str
    location: str
    rating: float = 4.0
    image_url: str
    contact_phone: str
    contact_email: str
    availability: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Helper Functions ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_jwt_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Serialize MongoDB document ---
def serialize_mongo_document(doc):
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    if "created_at" in doc and isinstance(doc["created_at"], datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc

# --- Auth Routes ---
@api_router.post("/register")
async def register_user(user_data: UserRegister):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_data.password)
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    await db.users.insert_one({**user_obj.dict(), "password": user_dict["password"]})
    token = create_jwt_token(user_obj.id)
    return {"user": user_obj, "token": token}

@api_router.post("/login")
async def login_user(login_data: UserLogin):
    user_record = await db.users.find_one({"email": login_data.email})
    if not user_record or not verify_password(login_data.password, user_record["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_obj = User(**{k: v for k, v in user_record.items() if k != "password"})
    token = create_jwt_token(user_obj.id)
    return {"user": user_obj, "token": token}

@api_router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

from fastapi import Body

@api_router.put("/update-profile")
async def update_profile(
    data: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    update_data = {}
    if "phone" in data:
        update_data["phone"] = data["phone"]
    if "name" in data:
        update_data["name"] = data["name"]

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    updated_user = await db.users.find_one({"id": current_user.id})
    return {"message": "Profile updated", "user": serialize_mongo_document(updated_user)}

@api_router.get("/chat/{service_id}")
async def get_whatsapp_chat_link(service_id: str, current_user: User = Depends(get_current_user)):
    """
    Returns a WhatsApp link so the logged-in user can message the service provider directly.
    """
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    provider_phone = service.get("contact_phone")
    if not provider_phone:
        raise HTTPException(status_code=400, detail="Provider phone number not available")

    # Compose message
    message = (
        f"Hi, I'm {current_user.name} ({current_user.phone or 'no phone provided'}). "
        f"I'm interested in your service '{service['name']}' listed on Vows & Wishes."
    )

    whatsapp_url = f"https://wa.me/{provider_phone}?text={message}"
    return {"whatsapp_link": whatsapp_url}

# --- Service Routes ---
@api_router.get("/services", response_model=List[Service])
async def get_services(
    category: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"availability": True}

    # ✅ Category filter (skip if 'all')
    if category and category.lower() != "all" and category in [c.value for c in ServiceCategory]:
        query["category"] = category

    # ✅ Location filter (skip if 'All Locations' or 'all')
    if location and location.lower() not in ["all locations", "all"]:
        query["location"] = {"$regex": location, "$options": "i"}

    # ✅ Search filter
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    services = await db.services.find(query).to_list(100)
    return [Service(**s) for s in services]

@api_router.post("/init-data")
async def initialize_sample_data():
    existing_services = await db.services.count_documents({})
    if existing_services > 0:
        return {"message": "Sample data already exists"}
    sample_services = [
        {"name": "Royal Palace Banquet Hall", "category": "venues", "description": "Elegant hall...", "price_range": "$5000 - $15000", "location": "Downtown", "rating": 4.8, "image_url": "https://images.unsplash.com/photo-1532712938310-34cb3982ef74", "contact_phone": "555-0101", "contact_email": "royal@palace.com", "availability": True},
        {"name": "Gourmet Delights Catering", "category": "catering", "description": "Premium catering service", "price_range": "$50 - $150 per person", "location": "City Center", "rating": 4.6, "image_url": "https://images.unsplash.com/photo-1520854221256-17451cc331bf", "contact_phone": "555-0202", "contact_email": "info@gourmetdelights.com", "availability": True},
    ]
    for s in sample_services:
        s["id"] = str(uuid.uuid4())
        s["created_at"] = datetime.utcnow()
    await db.services.insert_many(sample_services)
    return {"message": "Sample data initialized successfully", "count": len(sample_services)}

# --- Include Routers ---
app.include_router(api_router)
app.include_router(appointment_router)  # ✅ include payment route

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend is running!"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/api/ping")
async def ping():
    return {"ok": True}
