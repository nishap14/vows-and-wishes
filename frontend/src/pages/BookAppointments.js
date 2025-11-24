import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

import API_BASE_URL from "./config";


const API_BASE = API_BASE_URL;

const BookAppointment = () => {
  const { serviceId } = useParams(); // from route /book/:serviceId
  const [bookedSlots, setBookedSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token"); // from login

  // Fetch booked slots
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await axios.get(`${API_BASE}/appointments/availability/${serviceId}`);
        setBookedSlots(res.data.booked_slots);
      } catch (err) {
        console.error("Error fetching availability:", err);
      }
    };
    fetchAvailability();
  }, [serviceId]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setMessage("Please select both date and time.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/appointments/book`,
        {
          service_id: serviceId,
          date: selectedDate,
          time: selectedTime,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(res.data.message);
      // refresh availability
      const newRes = await axios.get(`${API_BASE}/appointments/availability/${serviceId}`);
      setBookedSlots(newRes.data.booked_slots);
      setSelectedDate("");
      setSelectedTime("");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const isSlotBooked = (date, time) => {
    return bookedSlots.some((slot) => slot.date === date && slot.time === time);
  };

  // Example time slots
  const timeSlots = ["10:00", "12:00", "14:00", "16:00", "18:00"];

  return (
    <div className="mt-28 px-4 lg:px-24 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Book Appointment</h2>

      {message && (
        <div className={`mb-4 text-center p-2 rounded ${message.includes("failed") || message.includes("booked") ? "bg-red-200" : "bg-green-200"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleBook} className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-lg mb-1">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-400 p-2 rounded w-full"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <label className="block text-lg mb-1">Select Time</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => (
              <button
                type="button"
                key={time}
                onClick={() => setSelectedTime(time)}
                disabled={isSlotBooked(selectedDate, time)}
                className={`p-2 rounded border ${
                  isSlotBooked(selectedDate, time)
                    ? "bg-red-400 text-white cursor-not-allowed"
                    : selectedTime === time
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 hover:bg-green-200"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Booking..." : "Confirm Booking"}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-2">Booked Slots</h3>
        {bookedSlots.length > 0 ? (
          <ul className="list-disc ml-6">
            {bookedSlots.map((slot, index) => (
              <li key={index} className="text-gray-700">
                {slot.date} - {slot.time}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No bookings yet.</p>
        )}
      </div>
    </div>
  );
};

export default BookAppointment;
