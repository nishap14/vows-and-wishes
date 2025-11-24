import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const SingleService = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await axios.get(`${API}/services`);
        const found = res.data.find((s) => s.id === id);
        setService(found || null);
      } catch (error) {
        console.error("Error loading service:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  if (loading) return <p className="mt-28 text-center text-gray-600 text-xl">Loading...</p>;
  if (!service) return <p className="mt-28 text-center text-red-600 text-xl">Service not found.</p>;

  // Ensure number includes country code and has at least 10 digits
let phoneNumber = service.contact_phone?.replace(/[^0-9]/g, "") || "";
if (!phoneNumber.startsWith("91")) {
  phoneNumber = "91" + phoneNumber; // Default to India code, or replace with your default
}

  const message = `Hi, I found your "${service.name}" service on Vows & Wishes and would like to know more about it.`;

  return (
    <div className="mt-28 px-4 lg:px-24">
      <img
        src={service.image_url}
        alt={service.name}
        className="h-96 mb-4 rounded-xl shadow-lg w-full object-cover"
      />

      <h2 className="text-4xl font-bold mb-2">{service.name}</h2>
      <p className="text-gray-700 mb-1"><strong>Category:</strong> {service.category}</p>
      <p className="text-gray-700 mb-1"><strong>Location:</strong> {service.location}</p>
      <p className="text-gray-700 mb-1"><strong>Price Range:</strong> {service.price_range}</p>
      <p className="text-gray-700 mb-3"><strong>Description:</strong> {service.description}</p>
      <p className="text-gray-700 mb-3"><strong>Rating:</strong> ⭐ {service.rating}</p>

      {phoneNumber ? (
        <a
          href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="bg-green-500 text-white py-2 px-4 rounded mt-4 hover:bg-green-600 transition">
            💬 Chat on WhatsApp
          </button>
        </a>
      ) : (
        <button
          className="bg-gray-400 text-white py-2 px-4 rounded mt-4 cursor-not-allowed"
          disabled
        >
          Contact Not Available
        </button>
      )}
    </div>
  );
};

export default SingleService;
