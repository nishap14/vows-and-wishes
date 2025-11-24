import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, DollarSign, Star, Phone, Mail, Heart, Menu, X, Filter, User } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { toast, Toaster } from 'sonner';
import SingleService from "./pages/SingleService";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const PROVIDER_PHONE = "919167597375";
  const [bookedDates, setBookedDates] = useState([]);

  const bookedDateObjects = bookedDates.map(date => new Date(date));

  // For service details modal
  const [selectedService, setSelectedService] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' });

  const [selectedDate, setSelectedDate] = useState(null);

  const categories = [
    { value: 'venues', label: 'Venues & Halls' },
    { value: 'catering', label: 'Catering' },
    { value: 'decoration', label: 'Decoration' },
    { value: 'photography', label: 'Photography' },
    { value: 'makeup', label: 'Makeup & Styling' },
    { value: 'dj', label: 'DJ & Music' },
    { value: 'transport', label: 'Transportation' },
    { value: 'gifts', label: 'Return Gifts' }
  ];

  const locations = [
  'All Locations',
  'Bandra',
  'Juhu',
  'Colaba',
  'Andheri',
  'South Mumbai',
  'Worli',
  'Marine Drive',
  'Central Mumbai',
  'Goregaon'
];

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
    initializeData();
    fetchServices();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const initializeData = async () => {
    try {
      await axios.post(`${API}/init-data`);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All Locations') params.append('category', selectedCategory);
      if (selectedLocation && selectedLocation !== 'All Locations') params.append('location', selectedLocation);
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`${API}/services?${params}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchServices();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedCategory, selectedLocation]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/login`, loginForm);
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      // immediately fetch profile

      const profileRes = await axios.get(`${API}/profile`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setUser(profileRes.data);

      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
      toast.success('Welcome back!');
   } catch (error) {
     toast.error(error.response?.data?.detail || 'Login failed');
   }
 };

  const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post(`${API}/register`, registerForm);
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);

    // fetch profile again to ensure user is loaded
    const profileRes = await axios.get(`${API}/profile`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    setUser(profileRes.data);

    setShowRegisterModal(false);
    setRegisterForm({ name: '', email: '', password: '' });
    toast.success('Welcome to Vows & Wishes!');
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Registration failed');
  }
};

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const toggleWishlist = (serviceId) => {
    setWishlist(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };


const fetchBookedDates = async (serviceId) => {
  try {
    const res = await axios.get(`${API}/booked-dates/${serviceId}`);
    setBookedDates(res.data.booked_dates || []);
  } catch (error) {
    console.error("Error fetching booked dates:", error);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-rose-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Vows & Wishes Logo and Text */}
            <div className="flex-1 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-8 h-8 text-pink-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
              <h1 className="ml-2 text-2xl font-bold text-pink-500">
                Vows & Wishes
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">Hello, {user.name}!</span>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Login</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Welcome Back</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Login</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                    <DialogTrigger asChild>
                      <Button>Sign Up</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Join Vows & Wishes</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={registerForm.phone}
                            onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Create Account</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X /> : <Menu />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pb-4 border-t border-rose-100">
              {user ? (
                <div className="flex flex-col space-y-2 mt-4">
                  <span className="text-gray-700">Hello, {user.name}!</span>
                  <Button variant="outline" onClick={handleLogout} className="w-full">
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2 mt-4">
                  <Button variant="outline" onClick={() => setShowLoginModal(true)} className="w-full">
                    Login
                  </Button>
                  <Button onClick={() => setShowRegisterModal(true)} className="w-full">
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-400/10 to-pink-400/10 rounded-3xl mx-4"></div>
        <div className="relative container mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Find Perfect Services for Your 
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent block">
              Special Events
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            From dreamy weddings to memorable birthdays, discover local vendors who'll make your celebrations unforgettable
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="px-4 mb-8">
        <div className="container mx-auto">
          <Card className="p-6 bg-white/70 backdrop-blur-md border-rose-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={fetchServices} className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
                <Filter className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Services Grid */}
      <section className="px-4 pb-16">
        <div className="container mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Services</h3>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-rose-100">
                  <div className="relative">
                    <img 
                      src={service.image_url} 
                      alt={service.name}
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                      onClick={() => toggleWishlist(service.id)}
                    >
                      <Heart 
                        className={`w-4 h-4 ${wishlist.includes(service.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} 
                      />
                    </Button>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                        {categories.find(c => c.value === service.category)?.label}
                      </Badge>
                      <div className="flex items-center text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="ml-1 text-sm font-medium">{service.rating}</span>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-lg text-gray-900 mb-2">{service.name}</h4>
                    <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>{service.price_range}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{service.location}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Button>
                      </div>
                      <div className="flex space-x-2">
  {/* View Details */}
  <Button
    size="sm"
    className="bg-gradient-to-r from-rose-500 to-pink-500"
    onClick={() => {
      setSelectedService(service);
      fetchBookedDates(service.id); // ✅ optional if using booked date feature
      setShowDetailsModal(true);
    }}
  >
    View Details
  </Button>

  {/* Chat on WhatsApp */}
  {/* Chat on WhatsApp */}
{user?.phone ? (
  <a
  href={`https://wa.me/919167597375?text=${encodeURIComponent(
    `Hi! I'm ${user.name}, interested in your ${service.name} service on Vows & Wishes. My number is ${user.phone}.`
  )}`}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    // ✅ Prevent navigation if the number format is wrong
    const phone = "919167597375"; // replace with your number
    if (!/^\d{10,15}$/.test(phone)) {
      e.preventDefault();
      toast.error("Invalid WhatsApp number format. Use full international number without '+'.");
    }
  }}
>
  <Button
    size="sm"
    className="bg-green-500 hover:bg-green-600 text-white"
  >
    WhatsApp
  </Button>
</a>

) : (
  <Button
    size="sm"
    className="bg-gray-400 text-white cursor-not-allowed"
    disabled
  >
    Login to Chat
  </Button>
)}

</div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {services.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎪</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No services found</h3>
              <p className="text-gray-500">Try adjusting your search filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-rose-100 px-4 py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-pink-500">
            Vows & Wishes
          </h1>
          <p className="text-gray-600">Making your special moments unforgettable</p>
          <p className="text-sm text-gray-500 mt-2">© 2025. All rights reserved.</p>
        </div>
      </footer>

      {/* 🔹 Service Details Modal */}
      {selectedService && (
  <Dialog
    open={showDetailsModal}
    onOpenChange={(open) => {
      setShowDetailsModal(open);
      if (!open) {
        // 🔹 Reset modal-related states when closed
        setSelectedService(null);
        setShowDatePicker(false);
        setAppointmentDate("");
        setSelectedDate(null);
      }
    }}
  >
          {/* 🔹 Service Details Modal Content */}
<DialogContent
  className="max-h-[90vh] overflow-y-auto sm:max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-lg"
>
  <DialogHeader>
    <DialogTitle>{selectedService.name}</DialogTitle>
  </DialogHeader>

  {/* Define your phone overrides */}
  {(() => {
    // ✅ You can edit these numbers yourself
    const phoneOverrides = {
      "Foodlink Catering": "9999999999",
      "Artistic Touch Decoration": "8888888888",
      "The Wedding Story": "7777777777",
      // Add more service-name-to-phone mappings as needed
    };

    // Attach this to global scope for below JSX
    selectedService.overridePhone =
      phoneOverrides[selectedService.name] || selectedService.contact_phone;
  })()}

  <div className="space-y-3 mt-2">
    <img
      src={selectedService.image_url}
      alt={selectedService.name}
      className="w-full h-48 object-cover rounded-lg"
    />

    <p><strong>Category:</strong> {selectedService.category}</p>
    <p><strong>Location:</strong> {selectedService.location}</p>
    <p><strong>Price Range:</strong> {selectedService.price_range}</p>
    <p><strong>Rating:</strong> ⭐ {selectedService.rating}</p>
    <p><strong>Description:</strong> {selectedService.description}</p>

    {/* ✅ Using overridden phone if available */}
    <p>
      <strong>Contact:</strong> {selectedService.contact_email} /{" "}
      {selectedService.overridePhone}
    </p>
  </div>

  {/* Appointment booking section */}
  <div className="mt-6 space-y-4">
    {/* Book Appointment button */}
    {!showDatePicker && (
      <Button
        size="sm"
        className="bg-blue-500 hover:bg-blue-600 text-white w-full"
        onClick={() => setShowDatePicker(true)}
      >
        Book Appointment
      </Button>
    )}

    {/* Date Picker section */}
    {showDatePicker && (
      <div className="flex flex-col items-center space-y-4 w-full">
        <div className="w-full max-w-xs md:max-w-sm bg-white rounded-lg shadow p-2">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => {
              if (!date) return;
              const formatted = date.toISOString().split("T")[0];
              if (bookedDates.includes(formatted)) {
                toast.error("This date is already booked!");
                return;
              }
              setSelectedDate(date);
              setAppointmentDate(formatted);
            }}
            inline
            minDate={new Date()}
            highlightDates={[
              {
                "react-datepicker__day--highlighted-booked": bookedDates.map(
                  (d) => new Date(d)
                ),
              },
            ]}
            dayClassName={(date) =>
              bookedDates.includes(date.toISOString().split("T")[0])
                ? "bg-red-200 text-red-700 rounded-full"
                : undefined
            }
          />
        </div>

        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white w-full"
          onClick={async () => {
            if (!appointmentDate) return toast.error("Please select a date");

            try {
              const bookingRes = await axios.post(`${API}/book-appointment`, {
                email: user?.email || "guest@example.com",
                service_id: selectedService.id,
                appointment_date: appointmentDate,
              });

              toast.success(`🎉 Booking Confirmed on ${appointmentDate}!`);

              // Close modal and reset
              setShowDatePicker(false);
              setShowDetailsModal(false);
              setAppointmentDate("");
              setSelectedDate(null);

              // Refresh booked dates after closing
              setTimeout(async () => {
                try {
                  await fetchBookedDates(selectedService.id);
                } catch (refreshErr) {
                  console.warn("Booked-dates refresh failed:", refreshErr);
                  toast.warning(
                    "Booking saved, but availability failed to refresh. Reload to update."
                  );
                }
              }, 400);
            } catch (err) {
              console.error("Booking failed:", err);
              const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                "Booking failed!";
              toast.error(msg);
            }
          }}
        >
          Confirm Booking
        </Button>
      </div>
    )}
  </div>
</DialogContent>

    </Dialog>
)}
    </div>
  );
}

export default App;

