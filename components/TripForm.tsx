import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TripRequest, Traveler, FlightLeg } from '../types';
import { suggestVibes } from '../services/gemini';

// FIX: Declare global window properties with strict matching for the AI Studio environment.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    google: any;
    aistudio?: AIStudio;
    gm_authFailure?: () => void;
    initGoogleAutocomplete?: () => void;
  }
}

interface TripFormProps {
  onSubmit: (request: TripRequest) => void;
  isLoading: boolean;
}

const INTEREST_OPTIONS = [
  "🏛️ Historical sites", "🖼️ Art & Museums", "🍷 Wine & Gastronomy", "🍽️ Culinary Experiences",
  "🌿 Nature & Parks", "⛰️ Hiking & Outdoors", "🏗️ Modern Architecture", "🎭 Theatre & Shows",
  "🛍️ Shopping", "🧸 Kid-friendly", "🚴 Biking Tours", "🏖️ Beach Relaxation",
  "🎉 Nightlife & Bars", "📸 Photography", "🎶 Live Music", "👨‍🍳 Cooking Classes",
  "🛍️ Local Markets", "💆 Wellness & Spa"
];

const TRANSPORT_OPTIONS = ["🚶 Walking", "🚇 Public transport", "🚕 Taxi / Uber", "🚗 Rental car"];
const DIETARY_OPTIONS = ["🥕 Vegetarian", "🌿 Vegan", "🌾 Gluten-Free", "🥜 Nut Allergy", "🐟 Pescatarian", "🍽️ No dietary needs"];

const DEFAULT_VIBES = [
  "✨ Modern & Sleek", "🎸 Bohemian Rhapsody", "🔥 High-Octane Adventure", 
  "🌿 Chill & Slow", "🍜 Local Immersion", "💎 Luxury & Pampering"
];

const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface CalendarPickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ startDate, endDate, onChange }) => {
  const [currentDate, setCurrentDate] = useState(() => startDate ? new Date(startDate + 'T00:00:00') : new Date());
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const getDaysArray = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const days = getDaysArray(currentDate.getFullYear(), currentDate.getMonth());

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateLocal(date);
    if (!startDate || (startDate && endDate)) {
       onChange(dateStr, '');
    } else {
       if (new Date(dateStr) < new Date(startDate)) {
          onChange(dateStr, '');
       } else {
          onChange(startDate, dateStr);
       }
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const isSelected = (d: Date) => {
      const t = d.getTime();
      const s = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
      const e = endDate ? new Date(endDate + 'T00:00:00').getTime() : 0;
      return t === s || t === e;
  };
  
  const isInRange = (d: Date) => {
      if (!startDate || !endDate) return false;
      const t = d.getTime();
      const s = new Date(startDate + 'T00:00:00').getTime();
      const e = new Date(endDate + 'T00:00:00').getTime();
      return t > s && t < e;
  };

  const isStart = (d: Date) => startDate && d.getTime() === new Date(startDate + 'T00:00:00').getTime();
  const isEnd = (d: Date) => endDate && d.getTime() === new Date(endDate + 'T00:00:00').getTime();

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm select-none animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
            <button onClick={(e) => { e.preventDefault(); prevMonth(); }} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-lg font-bold text-stone-800">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={(e) => { e.preventDefault(); nextMonth(); }} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
            {['S','M','T','W','T','F','S'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-stone-400 mb-2">{day}</div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
            {days.map((date, idx) => {
                if (!date) return <div key={idx} />;
                const d = new Date(date);
                d.setHours(0,0,0,0);
                const selected = isSelected(d);
                const inRange = isInRange(d);
                const start = isStart(d);
                const end = isEnd(d);
                return (
                    <div key={idx} className="relative p-0.5 cursor-pointer" onClick={() => handleDateClick(d)}>
                         <div className={`absolute inset-y-0 w-full transition-all ${inRange ? 'bg-indigo-50' : ''} ${start && endDate ? 'left-1/2 bg-indigo-50 rounded-l-md' : 'rounded-full'} ${end && startDate ? 'right-1/2 bg-indigo-50 rounded-r-md' : 'rounded-full'}`}></div>
                         <div className={`relative w-9 h-9 mx-auto flex items-center justify-center text-sm font-medium rounded-full transition-all z-10 ${selected ? 'bg-indigo-600 text-white shadow-md transform scale-105' : inRange ? 'text-indigo-900' : 'text-stone-700 hover:bg-stone-100'}`}>
                             {date.getDate()}
                         </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const [aiVibes, setAiVibes] = useState<string[]>([]);
  const [isSuggestingVibes, setIsSuggestingVibes] = useState(false);
  const [isMapsEnabled, setIsMapsEnabled] = useState(true);
  const [mapsRecoveryKey, setMapsRecoveryKey] = useState(0); 
  
  const [formData, setFormData] = useState<TripRequest>({
    destination: '',
    vibe: '',
    budget: 2000,
    dates: { start: '', end: '', duration: 3 },
    timePreference: { start: '09:00', end: '22:00' },
    flight: { booked: false, legs: [] },
    travelers: { type: 'Solo', adults: 1, children: 0, details: [{ id: '1', name: 'Traveler 1', isChild: false }] },
    transport: [],
    interests: [],
    mustIncludes: [],
    accommodation: { booked: false, hotelName: '', address: '', checkIn: '', checkOut: '', confirmationNumber: '' },
    dietary: []
  });
  
  const [mustIncludeInput, setMustIncludeInput] = useState('');
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const handleAuthFailure = useCallback(() => {
    console.error("Google Maps API: Authentication Failure. Entering Manual Entry Mode.");
    setIsMapsEnabled(false);
    // VITAL: Trigger a fresh input DOM element to stop the library from freezing the field
    setMapsRecoveryKey(prev => prev + 1); 
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (e) {}
      autocompleteRef.current = null;
    }
  }, []);

  const initializeAutocomplete = useCallback(() => {
    if (!window.google || !window.google.maps || !destinationInputRef.current || !isMapsEnabled) {
      return;
    }

    try {
      if (autocompleteRef.current) return;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        destinationInputRef.current,
        { types: ['(cities)'] }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.formatted_address) {
          setFormData(prev => ({ ...prev, destination: place.formatted_address }));
        }
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          if (!autocompleteRef.current) return;
          const geolocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          const circle = new window.google.maps.Circle({ center: geolocation, radius: position.coords.accuracy });
          autocompleteRef.current.setBounds(circle.getBounds());
        }, undefined, { timeout: 3000 });
      }
    } catch (e) {
      console.warn("Google Autocomplete Initialization guarded:", e);
      setIsMapsEnabled(false);
    }
  }, [isMapsEnabled]);

  useEffect(() => {
    // Setup global callbacks for the Maps JSONP-style initialization
    window.gm_authFailure = handleAuthFailure;
    window.initGoogleAutocomplete = initializeAutocomplete;

    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      // loading=async with a callback is the most robust way to initialize Maps
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places&callback=initGoogleAutocomplete&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => handleAuthFailure();
      document.head.appendChild(script);
    } else {
      initializeAutocomplete();
    }
    
    return () => {
      delete window.gm_authFailure;
      delete window.initGoogleAutocomplete;
      if (autocompleteRef.current && window.google) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {}
      }
      const pacContainers = document.getElementsByClassName('pac-container');
      for (let i = 0; i < pacContainers.length; i++) {
        pacContainers[i].remove();
      }
    };
  }, [handleAuthFailure, initializeAutocomplete]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        window.location.reload(); 
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleRangeChange = (start: string, end: string) => {
    const newDates = { ...formData.dates, start, end };
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      newDates.duration = diffDays > 0 ? diffDays : 1;
    } else {
        newDates.duration = 1;
    }
    setFormData({ ...formData, dates: newDates });
  };

  const fetchVibes = async () => {
    const destinationValue = destinationInputRef.current?.value || formData.destination;
    if (!destinationValue) return;
    setIsSuggestingVibes(true);
    const suggestions = await suggestVibes(destinationValue, formData.interests);
    setAiVibes(suggestions);
    setIsSuggestingVibes(false);
  };

  const addFlightLeg = () => {
    const newLeg: FlightLeg = {
      id: Math.random().toString(36).substr(2, 9),
      flightNumber: '',
      departureAirport: '',
      departureTime: '',
      arrivalAirport: '',
      arrivalTime: '',
      confirmationNumber: ''
    };
    setFormData(prev => ({
      ...prev,
      flight: { ...prev.flight, legs: [...prev.flight.legs, newLeg] }
    }));
  };

  const updateFlightLeg = (id: string, field: keyof FlightLeg, value: string) => {
    setFormData(prev => ({
      ...prev,
      flight: {
        ...prev.flight,
        legs: prev.flight.legs.map(leg => leg.id === id ? { ...leg, [field]: value } : leg)
      }
    }));
  };

  const updateField = (field: keyof TripRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'transport' | 'interests' | 'dietary', item: string) => {
    setFormData(prev => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item]
      };
    });
  };

  const addMustInclude = () => {
    if (mustIncludeInput.trim()) {
      setFormData(prev => ({ ...prev, mustIncludes: [...prev.mustIncludes, mustIncludeInput.trim()] }));
      setMustIncludeInput('');
    }
  };

  const updateTravelerCounts = (adults: number, children: number) => {
    const total = adults + children;
    const newDetails: Traveler[] = [];
    for (let i = 0; i < total; i++) {
      if (formData.travelers.details[i]) {
        newDetails.push(formData.travelers.details[i]);
      } else {
        newDetails.push({ 
          id: Math.random().toString(36).substr(2, 9), 
          name: `Traveler ${i + 1}`, 
          isChild: i >= adults 
        });
      }
    }
    setFormData({
      ...formData,
      travelers: { ...formData.travelers, adults, children, details: newDetails }
    });
  };

  const updateTravelerDetail = (index: number, field: keyof Traveler, value: any) => {
      const newDetails = [...formData.travelers.details];
      newDetails[index] = { ...newDetails[index], [field]: value };
      setFormData({ ...formData, travelers: { ...formData.travelers, details: newDetails } });
  };

  useEffect(() => {
    const destinationValue = destinationInputRef.current?.value || formData.destination;
    if (step === 99 && destinationValue && !reviewImage) {
      setReviewImage(`https://source.unsplash.com/800x600/?${encodeURIComponent(destinationValue)}`);
    }
  }, [step, formData.destination, reviewImage]);

  const handleFinalSubmit = () => {
    const finalRequest = { ...formData };
    if (destinationInputRef.current) {
      finalRequest.destination = destinationInputRef.current.value;
    }
    onSubmit(finalRequest);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
               <h2 className="text-3xl font-bold text-stone-800">Where to? 🌍</h2>
               {!isMapsEnabled && (
                 <button 
                  onClick={handleSelectKey}
                  className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1.5 rounded-full hover:bg-amber-600 transition shadow-lg flex items-center gap-2"
                 >
                   <span>🔑</span>
                   Fix Maps Key
                 </button>
               )}
            </div>
            
            <div className="relative">
              {/* ATOMIC RECOVERY: The key prop forces a clean DOM re-mount if Maps crashes.
                  This purges corrupted library state and stops the freezing. */}
              <input 
                key={`dest-input-${isMapsEnabled ? 'google' : 'manual'}-${mapsRecoveryKey}`}
                ref={destinationInputRef}
                type="text" 
                defaultValue={formData.destination}
                placeholder="e.g. Banff, Canada" 
                className={`w-full px-4 py-3 rounded-2xl border bg-white focus:border-sky-400 outline-none transition-all ${!isMapsEnabled ? 'border-amber-300 ring-2 ring-amber-50' : 'border-stone-200'}`} 
              />
              {!isMapsEnabled && (
                <div className="mt-2 flex items-center gap-2 text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <p className="text-[10px] font-bold uppercase tracking-tight">Manual entry mode (Maps Key Restricted)</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Estimated Budget ($)</label>
              <input type="number" className="w-full p-3 border rounded-2xl outline-none focus:border-sky-400" value={formData.budget} onChange={e => updateField('budget', Number(e.target.value))} />
            </div>
            <CalendarPicker startDate={formData.dates.start} endDate={formData.dates.end} onChange={handleRangeChange} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-fadeIn">
             <h2 className="text-3xl font-bold text-stone-800">Flights booked? ✈️</h2>
             <div className="flex gap-4">
                <button onClick={() => { setFormData({...formData, flight: { ...formData.flight, booked: true }}); if (formData.flight.legs.length === 0) addFlightLeg(); }} className={`flex-1 px-6 py-4 rounded-2xl border-2 font-semibold transition-all duration-200 ${formData.flight.booked ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-300 hover:bg-stone-50'}`}>Yes, booked!</button>
                <button onClick={() => setFormData({...formData, flight: { ...formData.flight, booked: false }})} className={`flex-1 px-6 py-4 rounded-2xl border-2 font-semibold transition-all duration-200 ${!formData.flight.booked ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-sm' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-300 hover:bg-stone-50'}`}>Not yet</button>
             </div>
             {formData.flight.booked && (
               <div className="space-y-4">
                  {formData.flight.legs.map((leg, index) => (
                    <div key={leg.id} className="bg-stone-50 p-6 rounded-3xl border border-stone-100 relative animate-slideDown shadow-sm space-y-3">
                       <input type="text" placeholder="Flight Number" className="w-full p-3 rounded-xl border" value={leg.flightNumber} onChange={e => updateFlightLeg(leg.id, 'flightNumber', e.target.value)} />
                       <input type="text" placeholder="Confirmation Number" className="w-full p-3 rounded-xl border bg-white" value={leg.confirmationNumber || ''} onChange={e => updateFlightLeg(leg.id, 'confirmationNumber', e.target.value)} />
                       <div className="grid grid-cols-2 gap-4">
                          <input type="text" placeholder="From" className="p-3 rounded-xl border bg-white" value={leg.departureAirport} onChange={e => updateFlightLeg(leg.id, 'departureAirport', e.target.value)} />
                          <input type="text" placeholder="To" className="p-3 rounded-xl border bg-white" value={leg.arrivalAirport} onChange={e => updateFlightLeg(leg.id, 'arrivalAirport', e.target.value)} />
                       </div>
                    </div>
                  ))}
                  <button onClick={addFlightLeg} className="w-full py-4 rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 font-bold">+ Add Connecting Flight</button>
               </div>
             )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-3xl font-bold text-stone-800">Who's going? 👥</h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Adults</label>
                <input type="number" className="w-full p-3 border rounded-xl" value={formData.travelers.adults} onChange={e => updateTravelerCounts(Number(e.target.value), formData.travelers.children)} />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-stone-400 uppercase mb-1 block">Children</label>
                <input type="number" className="w-full p-3 border rounded-xl" value={formData.travelers.children} onChange={e => updateTravelerCounts(formData.travelers.adults, Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {formData.travelers.details.map((traveler, idx) => (
                <div key={traveler.id} className="p-4 bg-stone-50 rounded-2xl border space-y-2">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{traveler.isChild ? 'Child' : 'Adult'} Traveler {idx + 1}</p>
                  <input type="text" placeholder="Full Name" className="w-full p-2 rounded-lg border bg-white text-sm" value={traveler.name} onChange={e => updateTravelerDetail(idx, 'name', e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
           <div className="space-y-6 animate-fadeIn">
             <h2 className="text-3xl font-bold text-stone-800">Transport Style 🚌</h2>
             <div className="grid grid-cols-2 gap-4">
                {TRANSPORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('transport', opt)} className={`p-5 rounded-2xl border-2 transition-all ${formData.transport.includes(opt) ? 'bg-sky-50 border-sky-400' : 'bg-white border-stone-100'}`}>{opt}</button>
                ))}
             </div>
           </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-3xl font-bold text-stone-800">Interests ❤️</h2>
            <div className="flex flex-wrap gap-3">
               {INTEREST_OPTIONS.map(opt => (
                 <button key={opt} onClick={() => toggleArrayItem('interests', opt)} className={`px-4 py-2 rounded-full border transition-all ${formData.interests.includes(opt) ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-stone-200'}`}>{opt}</button>
               ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-3xl font-bold text-stone-800">Must-Sees 📍</h2>
            <div className="flex gap-2">
               <input type="text" value={mustIncludeInput} onChange={e => setMustIncludeInput(e.target.value)} placeholder="e.g. Eiffel Tower" className="flex-1 p-3 border border-stone-200 rounded-2xl outline-none" />
               <button onClick={addMustInclude} className="bg-sky-500 text-white px-6 rounded-2xl font-bold">Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
               {formData.mustIncludes.map((item, idx) => (
                  <span key={idx} className="bg-sky-100 text-sky-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">{item}
                     <button onClick={() => setFormData(prev => ({...prev, mustIncludes: prev.mustIncludes.filter(i => i !== item)}))} className="font-bold">×</button>
                  </span>
               ))}
            </div>
          </div>
        );
       case 7:
        return (
          <div className="space-y-6 animate-fadeIn">
             <h2 className="text-3xl font-bold text-stone-800">Accommodation 🏨</h2>
             <div className="flex gap-4">
                <button onClick={() => setFormData({...formData, accommodation: { ...formData.accommodation, booked: true }})} className={`flex-1 px-6 py-4 rounded-2xl border-2 font-bold ${formData.accommodation.booked ? 'bg-sky-50 border-sky-500' : 'bg-white'}`}>Booked</button>
                <button onClick={() => setFormData({...formData, accommodation: { ...formData.accommodation, booked: false }})} className={`flex-1 px-6 py-4 rounded-2xl border-2 font-bold ${!formData.accommodation.booked ? 'bg-sky-50 border-sky-500' : 'bg-white'}`}>Need Booking</button>
             </div>
             {formData.accommodation.booked && (
               <div className="space-y-3 bg-stone-50 p-6 rounded-3xl border animate-slideDown shadow-sm">
                  <input type="text" placeholder="Hotel Name" className="w-full p-3 border rounded-xl" value={formData.accommodation.hotelName} onChange={e => updateField('accommodation', {...formData.accommodation, hotelName: e.target.value})} />
                  <input type="text" placeholder="Hotel Address" className="w-full p-3 border rounded-xl" value={formData.accommodation.address} onChange={e => updateField('accommodation', {...formData.accommodation, address: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="p-3 border rounded-xl" value={formData.accommodation.checkIn} onChange={e => updateField('accommodation', {...formData.accommodation, checkIn: e.target.value})} />
                    <input type="date" className="p-3 border rounded-xl" value={formData.accommodation.checkOut} onChange={e => updateField('accommodation', {...formData.accommodation, checkOut: e.target.value})} />
                  </div>
                  <input type="text" placeholder="Confirmation #" className="w-full p-3 border rounded-xl" value={formData.accommodation.confirmationNumber} onChange={e => updateField('accommodation', {...formData.accommodation, confirmationNumber: e.target.value})} />
               </div>
             )}
             {!formData.accommodation.booked && (
               <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 flex items-center gap-3">
                 <span className="text-xl">💡</span>
                 <p className="text-xs font-bold text-sky-800">Book with <span className="underline">OpenStay.io</span> to save money on your {formData.destination || 'trip'} stay!</p>
               </div>
             )}
          </div>
        );
      case 8:
         return (
            <div className="space-y-6 animate-fadeIn">
               <h2 className="text-3xl font-bold text-stone-800">Dietary Needs 🥗</h2>
               <div className="flex flex-wrap gap-3">
                  {DIETARY_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleArrayItem('dietary', opt)} className={`px-5 py-3 rounded-full border transition-all ${formData.dietary.includes(opt) ? 'bg-lime-50 border-lime-400 text-lime-800' : 'bg-white'}`}>{opt}</button>
                  ))}
               </div>
            </div>
         );
      case 9:
         return (
            <div className="space-y-6 animate-fadeIn">
               <div className="flex justify-between items-end mb-2">
                  <h2 className="text-3xl font-bold text-stone-800">Trip Vibe ✨</h2>
                  <button onClick={fetchVibes} disabled={isSuggestingVibes} className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-50">
                    {isSuggestingVibes ? 'Suggesting...' : 'Magic Suggest 🪄'}
                  </button>
               </div>
               <div className="flex flex-wrap gap-2 mb-4">
                  {(aiVibes.length > 0 ? aiVibes : DEFAULT_VIBES).map(v => (
                     <button key={v} onClick={() => updateField('vibe', v)} className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${formData.vibe === v ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}>{v}</button>
                  ))}
               </div>
               <textarea placeholder="Atmosphere..." className="w-full p-4 border rounded-2xl outline-none focus:border-sky-400" value={formData.vibe} onChange={e => updateField('vibe', e.target.value)} rows={3} />
            </div>
         );
      case 99:
        return (
           <div className="space-y-6 animate-fadeIn text-center">
              <h2 className="text-4xl font-extrabold text-stone-800">Ready! 🎉</h2>
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
                 <div className="h-56 bg-stone-200">
                    {reviewImage && <img src={reviewImage} alt="Preview" className="w-full h-full object-cover" />}
                 </div>
                 <div className="p-8">
                    <h3 className="text-3xl font-bold">{formData.destination}</h3>
                    <p className="opacity-70">{formData.dates.duration} Days • {formData.travelers.adults + formData.travelers.children} Travelers</p>
                    <p className="text-xs font-bold text-stone-400 mt-2">Budget: ${formData.budget}</p>
                 </div>
              </div>
              <button onClick={handleFinalSubmit} disabled={isLoading} className="w-full mt-6 py-5 bg-sky-500 text-white rounded-2xl font-bold text-xl shadow-xl transition transform active:scale-[0.98]">Generate Itinerary</button>
           </div>
        );
      default: return null;
    }
  };

  const nextStep = () => {
    if (step === 1) {
        const destinationValue = destinationInputRef.current?.value || '';
        if (!destinationValue.trim()) {
            alert('Please enter a destination to continue.');
            return;
        }
        updateField('destination', destinationValue);
    }
    setStep(prev => prev === 9 ? 99 : prev + 1);
  };
  const prevStep = () => setStep(prev => prev === 99 ? 9 : prev - 1);

  if (isLoading) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/90 backdrop-blur-md">
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border animate-slideUp">
                  <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-2xl font-bold text-stone-800 mb-2">Planning your trip...</h3>
                  <p className="text-sm text-stone-500">Checking flights, weather, and hidden gems.</p>
              </div>
          </div>
      )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex gap-2 mb-10 px-2">
         {[1,2,3,4,5,6,7,8,9].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= (step === 99 ? 9 : step) ? 'bg-sky-400' : 'bg-stone-200'}`} />
         ))}
      </div>
      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-stone-100 min-h-[450px] flex flex-col justify-between">
         <div className="flex-1">{renderStep()}</div>
         {step !== 99 && (
            <div className="flex justify-between mt-10 pt-6 border-t">
               <button onClick={prevStep} disabled={step === 1} className="px-6 py-3 text-stone-400 font-bold hover:text-stone-600 transition">Back</button>
               <button onClick={nextStep} className="bg-stone-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-black transition shadow-lg">Next</button>
            </div>
         )}
      </div>
    </div>
  );
};
