from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api")

# MongoDB connection
client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
db = client[os.getenv("DB_NAME")]

@router.post("/book-appointment")
async def book_appointment(request: Request):
    """
    Book a service appointment if the date is available.
    """
    try:
        data = await request.json()
        user_email = data.get("email", "guest@example.com")
        service_id = data.get("service_id")
        appointment_date_str = data.get("appointment_date")  # "2025-11-05"
        payment_id = data.get("payment_id")

        if not service_id or not appointment_date_str:
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Convert to full datetime at midnight for MongoDB
        appointment_date = datetime.combine(
            datetime.fromisoformat(appointment_date_str).date(), datetime.min.time()
        )

        # ✅ Check if already booked
        existing = await db.appointments.find_one({
            "service_id": service_id,
            "appointment_date": appointment_date
        })
        if existing:
            raise HTTPException(status_code=400, detail="This date is already booked for the selected service")

        # ✅ Save booking
        appointment = {
            "user_email": user_email,
            "service_id": service_id,
            "appointment_date": appointment_date,
            "payment_id": payment_id or "manual_booking_no_payment",
            "status": "booked",
            "created_at": datetime.utcnow()
        }

        await db.appointments.insert_one(appointment)
        return {"message": "Appointment booked successfully!", "appointment": appointment}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/booked-dates/{service_id}")
async def get_booked_dates(service_id: str):
    """
    Return all booked date strings for a given service_id.
    """
    try:
        appointments = await db.appointments.find({"service_id": service_id}).to_list(100)
        booked_dates = [
            a["appointment_date"].strftime("%Y-%m-%d") for a in appointments
        ]
        return {"service_id": service_id, "booked_dates": booked_dates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
