from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from datetime import datetime
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

router = APIRouter(prefix="/api/payment", tags=["payment"])
router = APIRouter(prefix="/api")

# Connect to MongoDB
client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
db = client[os.getenv("DB_NAME")]

# Custom JSON serializer
def json_serialize(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

@router.post("/create-fake-payment")
async def create_fake_payment(request: Request):
    """
    Simulate a Stripe payment and store it in MongoDB.
    """
    try:
        data = await request.json()
        amount = data.get("amount")
        if amount is None or not isinstance(amount, (int, float)):
            raise HTTPException(status_code=400, detail="Invalid amount")

        user_email = data.get("email", "guest@example.com")
        user_id = data.get("user_id", "guest_user")
        service_id = data.get("service_id", "unknown_service")

        fake_payment = {
            "_id": ObjectId(),
            "payment_id": str(uuid.uuid4()),
            "email": user_email,
            "user_id": user_id,
            "service_id": service_id,
            "amount": float(amount),
            "currency": "INR",
            "status": "success",
            "timestamp": datetime.utcnow(),
        }

        # Save to MongoDB
        await db.payments.insert_one(fake_payment)

        # Serialize for response
        response_payment = {k: json_serialize(v) for k, v in fake_payment.items()}

        # ✅ Return "status": "success" at the top level too
        return JSONResponse({
            "status": "success",
            "message": "Payment successful (simulated)",
            "payment": response_payment
        })

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_payment():
    return {"status": "ok", "message": "Payment routes reachable!"}
