import React, { useState, useEffect, useRef } from 'react';
import { TripRequest, FlightLeg, AccommodationDetails, Traveler } from '../types';
import { getTailoredInterests } from '../services/gemini';

declare var google: any;

interface TripFormProps {
  onSubmit: (request: TripRequest) => void;
  isLoading: boolean;
}

const CURRENCIES = ["USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "AUD (A$)", "CAD (C$)", "CHF (Fr)", "CNY (¥)", "INR (₹)"];
const VIBE_OPTIONS = ["Luxury 💎", "Budget-Friendly 💰", "Adventure 🧗", "Relaxation 🧖‍♀️", "Cultural 🏛️", "Nightlife 💃", "Family Fun 🎡", "Romantic ❤️"];
const FOOD_OPTIONS = ["Local Favorites 🥘", "Fine Dining 🥂", "Street Food 🌭", "Vegetarian 🥗", "Vegan 🌱", "Gluten-Free 🌾", "Seafood 🦐"];
const TRANSIT_OPTIONS = ["Public Transport 🚌", "Uber/Taxi 🚕", "Walking 🚶", "Rental Car 🚗", "Bike 🚲"];

const getCurrencySymbol = (c: string) => (c || "").match(/\((.*?)\)/)?.[1] || (c || "").split(' ')[0] || "$";

const STEP_IMAGES = [
  "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80"
];

const MonthView = ({ year, month, startDate, endDate, onDateClick }: any) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
        <div className="flex-1 min-w-[280px]">
            <h4 className="text-center font-bold text-stone-700 dark:text-stone-300 mb-4 text-base">{monthNames[month]} {year}</h4>
            <div className="grid grid-cols-7 mb-2 text-center text-sm font-normal text-stone-400 uppercase tracking-widest">
                {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1 sm:gap-y-2">
                {days.map((date, idx) => {
                    if (!date) return <div key={idx} className="w-8 h-8 sm:w-12 sm:h-12" />;
                    const t = date.getTime();
                    const s = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
                    const e = endDate ? new Date(endDate + 'T00:00:00').getTime() : 0;
                    const selected = t === s || t === e;
                    const inRange = startDate && endDate && t > s && t < e;
                    return (
                        <div key={idx} className="relative p-0.5 cursor-pointer" onClick={() => onDateClick(date)}>
                            <div className={`absolute inset-y-0 w-full ${inRange ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}></div>
                            <div className={`relative w-8 h-8 sm:w-12 sm:h-12 mx-auto flex items-center justify-center text-sm sm:text-lg font-normal rounded-full z-10 transition-all ${selected ? 'bg-indigo-600 text-white shadow-lg scale-110' : inRange ? 'text-indigo-900 dark:text-indigo-200' : 'text-stone-700 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}`}>
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
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  
  const destInputRef = useRef<HTMLInputElement>(null);
  const hotelInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const flightInputRefs = useRef<Record<string, { dep: HTMLInputElement | null; arr: HTMLInputElement | null }>>({});

  const [formData, setFormData] = useState<TripRequest>({
    destination: '', vibe: [], budget: 2000, budgetType: 'total', currency: 'USD ($)',
    flightBudget: 500, includeFlightBudget: false,
    hotelBudget: 800, includeHotelBudget: false,
    transportBudget: 200, includeTransportBudget: false,
    dates: { start: '', end: '', duration: 3 },
    timePreference: { start: '09:00', end: '21:00' },
    activityPreference: '',
    flight: { booked: false, legs: [] },
    travelers: { type: 'Solo', adults: 1, children: 0, details: [{ id: '1', name: 'Me', isChild: false }] },
    transport: [], interests: [], mustIncludes: [], accommodations: [], dietary: [], foodPreferences: []
  });

  const updateField = (f: keyof TripRequest, v: any) => setFormData(p => ({ ...p, [f]: v }));

  useEffect(() => {
    if (step === 1 && destInputRef.current && (window as any).google) {
      const autocomplete = new google.maps.places.Autocomplete(destInputRef.current, { types: ['(cities)'] });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          updateField('destination', place.formatted_address);
        }
      });
    }
  }, [step]);

  // Handle autocompletes for hotels and flights
  useEffect(() => {
    if (step === 7 && (window as any).google) {
      formData.accommodations.forEach((acc) => {
        const input = hotelInputRefs.current[acc.id];
        if (input && !input.dataset.autocompleteBound) {
          const autocomplete = new google.maps.places.Autocomplete(input, { types: ['establishment'] });
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place) {
                const newAcc = formData.accommodations.map(a => a.id === acc.id ? { 
                  ...a, 
                  hotelName: place.name || a.hotelName, 
                  address: place.formatted_address || a.address,
                  lat: place.geometry?.location?.lat(),
                  lng: place.geometry?.location?.lng()
                } : a);
                updateField('accommodations', newAcc);
            }
          });
          input.dataset.autocompleteBound = 'true';
        }
      });
    }
    
    if (step === 5 && (window as any).google) {
      formData.flight.legs.forEach((leg, i) => {
        const refs = flightInputRefs.current[leg.id];
        if (refs) {
          if (refs.dep && !refs.dep.dataset.autocompleteBound) {
            const autocomp = new google.maps.places.Autocomplete(refs.dep, { types: ['airport'] });
            autocomp.addListener('place_changed', () => {
              const place = autocomp.getPlace();
              const nl = [...formData.flight.legs];
              nl[i].departureAirport = place.name || place.formatted_address || nl[i].departureAirport;
              updateField('flight', { ...formData.flight, legs: nl });
            });
            refs.dep.dataset.autocompleteBound = 'true';
          }
          if (refs.arr && !refs.arr.dataset.autocompleteBound) {
            const autocomp = new google.maps.places.Autocomplete(refs.arr, { types: ['airport'] });
            autocomp.addListener('place_changed', () => {
              const place = autocomp.getPlace();
              const nl = [...formData.flight.legs];
              nl[i].arrivalAirport = place.name || place.formatted_address || nl[i].arrivalAirport;
              updateField('flight', { ...formData.flight, legs: nl });
            });
            refs.arr.dataset.autocompleteBound = 'true';
          }
        }
      });
    }
  }, [step, formData.accommodations, formData.flight.legs]);

  const handleNext = () => {
    if (step === 1 && formData.destination.trim()) {
      getTailoredInterests(formData.destination).then(setInterestOptions);
    }
    if (step < 11) setStep(s => s + 1);
    else onSubmit(formData);
  };

  const setTravelerPreset = (type: string) => {
    let adults = 1, children = 0;
    if (type === 'Solo') { adults = 1; children = 0; }
    else if (type === 'Couple') { adults = 2; children = 0; }
    else if (type === 'Family') { adults = 2; children = 1; }
    else if (type === 'Friends') { adults = 4; children = 0; }
    syncTravelerCount(adults, children, type);
  };

  const syncTravelerCount = (adults: number, children: number, type = 'Custom') => {
    let details: Traveler[] = [];
    for (let i = 0; i < adults; i++) details.push({ id: `a-${i}`, name: i === 0 ? 'Me' : `Adult ${i + 1}`, isChild: false });
    for (let i = 0; i < children; i++) details.push({ id: `c-${i}`, name: `Child ${i + 1}`, isChild: true });
    updateField('travelers', { type, adults, children, details });
  };

  const handleCalendarNav = (dir: number) => {
    let m = calendarMonth + dir;
    let y = calendarYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalendarMonth(m);
    setCalendarYear(y);
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-6 sm:space-y-10 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100 leading-tight">Where are we going? 🌍</h2>
          <input 
            ref={destInputRef}
            type="text" 
            value={formData.destination} 
            onChange={e => updateField('destination', e.target.value)} 
            placeholder="e.g. Paris, Tokyo, Bali" 
            className="w-full px-5 py-4 sm:px-8 sm:py-6 rounded-2xl border-2 border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 dark:text-white focus:border-indigo-400 outline-none font-normal text-xl sm:text-2xl shadow-inner" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
               <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block mb-3 sm:mb-4">Primary Currency</label>
               <select value={formData.currency} onChange={e => updateField('currency', e.target.value)} className="w-full p-4 sm:p-5 bg-white dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-xl font-normal text-base sm:text-xl outline-none">
                 {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
               <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block mb-3 sm:mb-4">Trip Budget Goal</label>
               <div className="flex items-center gap-4">
                 <input 
                    type="number" 
                    value={formData.budget || ''} 
                    onChange={e => updateField('budget', e.target.value === '' ? 0 : Number(e.target.value))} 
                    className="w-full p-4 sm:p-5 border dark:border-stone-700 rounded-xl font-normal text-base sm:text-xl bg-white dark:bg-stone-800 dark:text-white outline-none" 
                  />
                 <select value={formData.budgetType} onChange={e => updateField('budgetType', e.target.value)} className="p-4 sm:p-5 bg-white dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-xl font-normal text-base sm:text-xl outline-none">
                    <option value="total">Total</option>
                    <option value="perPerson">Per Person</option>
                 </select>
               </div>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-6 sm:space-y-10 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Daily Schedule ⏰</h2>
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-10 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-6 sm:space-y-10 shadow-sm">
            <div className="grid grid-cols-2 gap-6 sm:gap-10">
              <div className="space-y-3">
                <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block">Day Starts At</label>
                <input 
                  type="time" 
                  value={formData.timePreference.start} 
                  onChange={e => updateField('timePreference', {...formData.timePreference, start: e.target.value})} 
                  className="w-full p-4 sm:p-6 rounded-xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-lg sm:text-xl" 
                  step="60"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block">Day Ends At</label>
                <input 
                  type="time" 
                  value={formData.timePreference.end} 
                  onChange={e => updateField('timePreference', {...formData.timePreference, end: e.target.value})} 
                  className="w-full p-4 sm:p-6 rounded-xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-lg sm:text-xl" 
                  step="60"
                />
              </div>
            </div>
            <div className="space-y-4">
                <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block">Activity Preferences</label>
                <textarea 
                    value={formData.activityPreference} 
                    onChange={e => updateField('activityPreference', e.target.value)} 
                    placeholder="e.g. Prefer walking tours, want to sleep in on weekends, avoid crowded mornings..." 
                    className="w-full p-6 sm:p-10 rounded-2xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-base sm:text-xl h-40 sm:h-48 outline-none focus:border-indigo-400"
                />
            </div>
          </div>
        </div>
      );
      case 3: 
        const nextM = calendarMonth === 11 ? 0 : calendarMonth + 1;
        const nextY = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
        return (
        <div className="space-y-6 sm:space-y-10 animate-fadeIn">
          <div className="flex justify-between items-center">
             <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Trip Dates 📅</h2>
             <div className="flex gap-2 sm:gap-4">
                <button onClick={() => handleCalendarNav(-1)} className="p-3 sm:p-4 bg-stone-100 dark:bg-stone-800 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition text-lg sm:text-xl font-bold">◀</button>
                <button onClick={() => handleCalendarNav(1)} className="p-3 sm:p-4 bg-stone-100 dark:bg-stone-800 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition text-lg sm:text-xl font-bold">▶</button>
             </div>
          </div>
          <div className="flex flex-col md:flex-row gap-6 sm:gap-12 bg-white dark:bg-stone-900 p-6 sm:p-12 rounded-3xl border border-stone-100 dark:border-stone-800 overflow-x-auto shadow-sm">
            <MonthView year={calendarYear} month={calendarMonth} startDate={formData.dates.start} endDate={formData.dates.end} onDateClick={(d: Date) => {
               const ds = d.toISOString().split('T')[0];
               if (!formData.dates.start || (formData.dates.start && formData.dates.end)) updateField('dates', { ...formData.dates, start: ds, end: '' });
               else updateField('dates', { ...formData.dates, end: ds, duration: Math.ceil(Math.abs(new Date(ds).getTime() - new Date(formData.dates.start).getTime()) / (1000*60*60*24)) + 1 });
            }} />
            <MonthView year={nextY} month={nextM} startDate={formData.dates.start} endDate={formData.dates.end} onDateClick={(d: Date) => {
               const ds = d.toISOString().split('T')[0];
               if (!formData.dates.start || (formData.dates.start && formData.dates.end)) updateField('dates', { ...formData.dates, start: ds, end: '' });
               else updateField('dates', { ...formData.dates, end: ds, duration: Math.ceil(Math.abs(new Date(ds).getTime() - new Date(formData.dates.start).getTime()) / (1000*60*60*24)) + 1 });
            }} />
          </div>
          {formData.dates.start && (
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 sm:p-10 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center animate-slideUp shadow-sm">
                  <div>
                    <p className="text-xs font-normal text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em] mb-2">Selected Range</p>
                    <p className="text-xl sm:text-3xl font-normal text-indigo-900 dark:text-indigo-100">{formData.dates.start} {formData.dates.end ? `➔ ${formData.dates.end}` : ''}</p>
                  </div>
                  {formData.dates.end && (
                    <div className="text-right">
                        <p className="text-xs font-normal text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em] mb-2">Total Stay</p>
                        <p className="text-2xl sm:text-4xl font-normal text-indigo-900 dark:text-indigo-100">{formData.dates.duration} Days</p>
                    </div>
                  )}
              </div>
          )}
        </div>
      );
      case 4: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Who's Going? 👥</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {['Solo', 'Couple', 'Family', 'Friends'].map(t => (
              <button key={t} onClick={() => setTravelerPreset(t)} className={`py-6 sm:py-10 rounded-2xl border-2 font-normal text-lg sm:text-2xl transition-all ${formData.travelers.type === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
             <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-sm">
                <div>
                   <p className="text-sm font-normal text-stone-400 uppercase tracking-widest mb-2">Adults</p>
                   <p className="text-2xl sm:text-4xl font-normal text-stone-900 dark:text-white">{formData.travelers.adults}</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => syncTravelerCount(Math.max(1, formData.travelers.adults - 1), formData.travelers.children)} className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center shadow-sm text-2xl sm:text-3xl transition-transform active:scale-90">-</button>
                   <button onClick={() => syncTravelerCount(formData.travelers.adults + 1, formData.travelers.children)} className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg text-2xl sm:text-3xl transition-transform active:scale-90">+</button>
                </div>
             </div>
             <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-10 rounded-3xl border border-stone-200 dark:border-stone-800 flex items-center justify-between shadow-sm">
                <div>
                   <p className="text-sm font-normal text-stone-400 uppercase tracking-widest mb-2">Children</p>
                   <p className="text-2xl font-normal text-stone-900 dark:text-white">{formData.travelers.children}</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => syncTravelerCount(formData.travelers.adults, Math.max(0, formData.travelers.children - 1))} className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center shadow-sm text-2xl sm:text-3xl transition-transform active:scale-90">-</button>
                   <button onClick={() => syncTravelerCount(formData.travelers.adults, formData.travelers.children + 1)} className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg text-2xl sm:text-3xl transition-transform active:scale-90">+</button>
                </div>
             </div>
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-6 sm:space-y-10 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Flight Details ✈️</h2>
          <div className="flex items-center gap-4 sm:gap-6 bg-white dark:bg-stone-900 p-6 sm:p-10 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm transition-all hover:border-indigo-200">
             <input type="checkbox" id="bookedFlights" checked={formData.flight.booked} onChange={e => updateField('flight', { ...formData.flight, booked: e.target.checked })} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg accent-indigo-600 cursor-pointer" />
             <label htmlFor="bookedFlights" className="font-normal text-lg sm:text-2xl text-stone-700 dark:text-stone-300 cursor-pointer">I have already booked flights</label>
          </div>
          {formData.flight.booked ? (
              <div className="space-y-8">
                <button onClick={() => updateField('flight', { ...formData.flight, legs: [...formData.flight.legs, { id: Math.random().toString(), airline: '', flightNumber: '', departureAirport: '', departureDate: '', departureTime: '', arrivalAirport: '', arrivalDate: '', arrivalTime: '', cost: 0, confirmationNumber: '' }] })} className="w-full py-6 sm:py-8 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl font-normal text-base uppercase tracking-widest text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">Add Flight Leg +</button>
                <div className="max-h-[500px] overflow-y-auto space-y-6 sm:space-y-8 pr-4 custom-scrollbar">
                  {formData.flight.legs.map((leg, i) => (
                    <div key={leg.id} className="bg-white dark:bg-stone-800 p-8 sm:p-12 rounded-3xl border dark:border-stone-700 shadow-xl relative space-y-6 animate-slideUp">
                      <button onClick={() => updateField('flight', { ...formData.flight, legs: formData.flight.legs.filter(l => l.id !== leg.id) })} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 text-3xl transition-colors">✕</button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Airline" value={leg.airline} onChange={e => { const nl = [...formData.flight.legs]; nl[i].airline = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" />
                          <input type="text" placeholder="Flight #" value={leg.flightNumber} onChange={e => { const nl = [...formData.flight.legs]; nl[i].flightNumber = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-stone-700">
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase text-stone-400">Departure Location</label>
                            <input 
                              ref={el => { if(!flightInputRefs.current[leg.id]) flightInputRefs.current[leg.id] = { dep: null, arr: null }; flightInputRefs.current[leg.id].dep = el; }}
                              type="text" 
                              placeholder="Airport or City" 
                              value={leg.departureAirport} 
                              onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureAirport = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} 
                              className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" 
                            />
                            <div className="flex gap-2">
                              <input type="date" value={leg.departureDate} onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureDate = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                              <input type="time" value={leg.departureTime} onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureTime = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-28 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase text-stone-400">Arrival Location</label>
                            <input 
                              ref={el => { if(!flightInputRefs.current[leg.id]) flightInputRefs.current[leg.id] = { dep: null, arr: null }; flightInputRefs.current[leg.id].arr = el; }}
                              type="text" 
                              placeholder="Airport or City" 
                              value={leg.arrivalAirport} 
                              onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalAirport = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} 
                              className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" 
                            />
                            <div className="flex gap-2">
                              <input type="date" value={leg.arrivalDate} onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalDate = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                              <input type="time" value={leg.arrivalTime} onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalTime = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-28 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                            </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-stone-700">
                          <input type="text" placeholder="Confirmation #" value={leg.confirmationNumber} onChange={e => { const nl = [...formData.flight.legs]; nl[i].confirmationNumber = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" />
                          <div className="flex items-center bg-stone-50 dark:bg-stone-900 rounded-xl px-4 border-2 dark:border-stone-700 focus-within:border-indigo-400">
                             <span className="text-xl font-normal text-stone-400 mr-2">{getCurrencySymbol(formData.currency)}</span>
                             <input 
                                type="number" 
                                placeholder="Cost" 
                                value={leg.cost || ''} 
                                onChange={e => { const nl = [...formData.flight.legs]; nl[i].cost = e.target.value === '' ? 0 : Number(e.target.value); updateField('flight', { ...formData.flight, legs: nl }); }} 
                                className="p-4 w-full text-base font-normal bg-transparent outline-none dark:text-white" 
                              />
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          ) : (
              <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-12 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm animate-fadeIn">
                  <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-4 uppercase tracking-widest">Flight Budget Estimator</h4>
                  <p className="text-base sm:text-xl text-stone-500 font-normal mb-8 italic leading-relaxed">
                    Not sure where to start? Check <a href="https://www.skyscanner.ca/" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-500 transition-colors font-bold">Skyscanner</a> for the best rates!
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-white dark:bg-stone-800 p-6 sm:p-8 rounded-xl border-2 dark:border-stone-700">
                      <input type="checkbox" id="estimateFlight" checked={formData.includeFlightBudget} onChange={e => updateField('includeFlightBudget', e.target.checked)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg accent-indigo-600 cursor-pointer" />
                      <label htmlFor="estimateFlight" className="font-normal text-lg sm:text-2xl text-stone-700 dark:text-stone-300 flex-1 cursor-pointer">Include Flight Budget:</label>
                      <input 
                        type="number" 
                        value={formData.flightBudget || ''} 
                        onChange={e => updateField('flightBudget', e.target.value === '' ? 0 : Number(e.target.value))} 
                        className="w-full sm:w-40 p-3 sm:p-4 border-2 dark:border-stone-700 rounded-lg font-normal text-lg sm:text-2xl text-center dark:bg-stone-900 dark:text-white outline-none" 
                      />
                  </div>
              </div>
          )}
        </div>
      );
      case 6: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Transportation 🚌</h2>
          <div className="bg-stone-50 dark:bg-stone-900/50 p-6 sm:p-12 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-10 shadow-sm">
             <div className="flex flex-wrap gap-3 sm:gap-6">
               {TRANSIT_OPTIONS.map(o => (
                 <button key={o} onClick={() => updateField('transport', formData.transport.includes(o) ? formData.transport.filter(t => t !== o) : [...formData.transport, o])} className={`px-6 py-4 sm:px-12 sm:py-6 rounded-xl border-2 text-base sm:text-xl font-normal transition-all ${formData.transport.includes(o) ? 'bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900 shadow-xl scale-105' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{o}</button>
               ))}
             </div>
             <div className="pt-12 border-t dark:border-stone-800">
                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-8">Transit Budget Estimator</h4>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-white dark:bg-stone-800 p-6 sm:p-8 rounded-xl border-2 dark:border-stone-700">
                    <input type="checkbox" id="estimateTransit" checked={formData.includeTransportBudget} onChange={e => updateField('includeTransportBudget', e.target.checked)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg accent-indigo-600 cursor-pointer" />
                    <label htmlFor="estimateTransit" className="font-normal text-lg sm:text-2xl text-stone-700 dark:text-stone-300 flex-1 cursor-pointer">Include Estimated Transit Budget:</label>
                    <input 
                      type="number" 
                      value={formData.transportBudget || ''} 
                      onChange={e => updateField('transportBudget', e.target.value === '' ? 0 : Number(e.target.value))} 
                      className="w-full sm:w-40 p-3 sm:p-4 border-2 dark:border-stone-700 rounded-lg font-normal text-lg sm:text-2xl text-center dark:bg-stone-900 dark:text-white outline-none" 
                    />
                </div>
             </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Accommodation 🏨</h2>
            <button onClick={() => updateField('accommodations', [...formData.accommodations, { id: Math.random().toString(), booked: false, checkInTime: '15:00', checkOutTime: '11:00', cost: 0, hotelName: '', address: '', confirmationNumber: '' }])} className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-4 rounded-2xl font-normal text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">Add Stay +</button>
          </div>
          <div className="max-h-[600px] overflow-y-auto space-y-6 sm:space-y-10 pr-4 custom-scrollbar">
             {formData.accommodations.length === 0 ? (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 sm:p-16 rounded-[2.5rem] border-2 border-dashed border-indigo-200 dark:border-indigo-800 text-center">
                    <p className="text-xl sm:text-3xl text-indigo-900 dark:text-indigo-200 font-normal mb-8">No Hotels Added Yet</p>
                    <h3 className="text-2xl sm:text-4xl text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">
                        Check <a href="https://openstay.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-500 transition-colors">OpenStay.io</a> for the best rates!
                    </h3>
                </div>
             ) : (
                formData.accommodations.map((acc, i) => (
                    <div key={acc.id} className="bg-white dark:bg-stone-800 p-8 sm:p-14 rounded-[2.5rem] border-2 dark:border-stone-700 shadow-xl relative space-y-8 animate-slideUp">
                        <button onClick={() => updateField('accommodations', formData.accommodations.filter(a => a.id !== acc.id))} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 text-4xl transition-colors">✕</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-stone-400">Hotel Name</label>
                                <input 
                                  ref={(el) => { if (el) hotelInputRefs.current[acc.id] = el; }}
                                  type="text" 
                                  placeholder="Search or Enter Hotel Name" 
                                  value={acc.hotelName} 
                                  onChange={e => { const na = [...formData.accommodations]; na[i].hotelName = e.target.value; updateField('accommodations', na); }} 
                                  className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-stone-400">Verified Address</label>
                                <input 
                                  type="text" 
                                  placeholder="Address (Auto-filled or Manual)" 
                                  value={acc.address} 
                                  onChange={e => { const na = [...formData.accommodations]; na[i].address = e.target.value; updateField('accommodations', na); }} 
                                  className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t dark:border-stone-700">
                           <div className="space-y-4">
                              <label className="text-xs font-bold uppercase text-stone-400">Check-in</label>
                              <div className="flex gap-2">
                                <input type="date" value={acc.checkInDate} onChange={e => { const na = [...formData.accommodations]; na[i].checkInDate = e.target.value; updateField('accommodations', na); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={acc.checkInTime} onChange={e => { const na = [...formData.accommodations]; na[i].checkInTime = e.target.value; updateField('accommodations', na); }} className="w-28 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                              </div>
                           </div>
                           <div className="space-y-4">
                              <label className="text-xs font-bold uppercase text-stone-400">Check-out</label>
                              <div className="flex gap-2">
                                <input type="date" value={acc.checkOutDate} onChange={e => { const na = [...formData.accommodations]; na[i].checkOutDate = e.target.value; updateField('accommodations', na); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={acc.checkOutTime} onChange={e => { const na = [...formData.accommodations]; na[i].checkOutTime = e.target.value; updateField('accommodations', na); }} className="w-28 p-3 border-2 dark:border-stone-700 rounded-xl text-xs dark:bg-stone-900 dark:text-white" />
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t dark:border-stone-700">
                           <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-stone-400">Confirmation #</label>
                              <input type="text" value={acc.confirmationNumber} onChange={e => { const na = [...formData.accommodations]; na[i].confirmationNumber = e.target.value; updateField('accommodations', na); }} className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-bold uppercase text-stone-400">Stay Cost ({getCurrencySymbol(formData.currency)})</label>
                              <input 
                                type="number" 
                                value={acc.cost || ''} 
                                onChange={e => { const na = [...formData.accommodations]; na[i].cost = e.target.value === '' ? 0 : Number(e.target.value); updateField('accommodations', na); }} 
                                className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-base dark:bg-stone-900 dark:text-white outline-none focus:border-indigo-400" 
                              />
                           </div>
                        </div>
                        <div className="flex items-center gap-4 pt-4">
                           <input type="checkbox" id={`booked-${acc.id}`} checked={acc.booked} onChange={e => { const na = [...formData.accommodations]; na[i].booked = e.target.checked; updateField('accommodations', na); }} className="w-10 h-10 rounded-lg accent-emerald-500 cursor-pointer" />
                           <label htmlFor={`booked-${acc.id}`} className="font-normal text-lg sm:text-xl text-stone-500 dark:text-stone-400 cursor-pointer">Hotel Booked</label>
                        </div>
                    </div>
                ))
             )}
          </div>
        </div>
      );
      case 8: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Food & Dining 🥘</h2>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {FOOD_OPTIONS.map(o => (
              <button 
                key={o} 
                onClick={() => updateField('foodPreferences', formData.foodPreferences.includes(o) ? formData.foodPreferences.filter(i => i !== o) : [...formData.foodPreferences, o])} 
                className={`px-6 py-2.5 sm:px-8 sm:py-3 rounded-full border transition-all text-sm sm:text-lg font-medium ${formData.foodPreferences.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 hover:border-stone-400'}`}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="space-y-4 pt-8">
              <label className="text-sm font-normal text-stone-400 uppercase tracking-widest ml-2">Dietary Restrictions</label>
              <textarea placeholder="e.g. Peanut allergy, gluten-free required..." className="w-full p-6 sm:p-12 bg-stone-50 dark:bg-stone-900 dark:text-white rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 text-base sm:text-2xl font-normal h-48 outline-none focus:border-indigo-400 shadow-inner" onChange={e => updateField('dietary', [e.target.value])}></textarea>
          </div>
        </div>
      );
      case 9: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Trip Vibe 🧖‍♀️</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {VIBE_OPTIONS.map(v => (
              <button key={v} onClick={() => updateField('vibe', formData.vibe.includes(v) ? formData.vibe.filter(i => i !== v) : [...formData.vibe, v])} className={`py-4 sm:py-6 rounded-2xl border transition-all text-sm sm:text-base font-medium flex flex-col items-center gap-2 ${formData.vibe.includes(v) ? 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white shadow-lg scale-105 border-stone-900 dark:border-stone-100' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 hover:border-stone-400'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      );
      case 10: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Tailored Interests ✨</h2>
          <div className="flex flex-wrap gap-2 sm:gap-4 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
            {interestOptions.map(o => (
              <button key={o} onClick={() => updateField('interests', formData.interests.includes(o) ? formData.interests.filter(i => i !== o) : [...formData.interests, o])} className={`px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl border transition-all text-sm sm:text-lg font-medium ${formData.interests.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-stone-800 dark:border-stone-700 border-stone-100 text-stone-600 hover:border-stone-400 shadow-sm'}`}>{o}</button>
            ))}
          </div>
        </div>
      );
      case 11: return (
        <div className="space-y-8 sm:space-y-12 animate-fadeIn">
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-stone-100">Final Requests 🗽</h2>
          <div className="space-y-10">
              <div className="space-y-6">
                  <label className="text-sm font-normal text-stone-400 uppercase tracking-widest ml-2">Must-Visit Spots</label>
                  <textarea placeholder="e.g. Statue of Liberty, specific restaurants..." className="w-full p-6 sm:p-12 rounded-[2.5rem] border-2 border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 dark:text-white text-base sm:text-2xl font-normal min-h-[250px] outline-none focus:border-indigo-400 shadow-inner" onChange={e => updateField('mustIncludes', e.target.value.split(',').map(s => s.trim()))}></textarea>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 sm:p-16 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-8 shadow-sm">
                <span className="text-6xl sm:text-8xl animate-pulse">✨</span>
                <p className="text-lg sm:text-2xl font-normal text-indigo-700 dark:text-indigo-200 leading-relaxed">Our AI will weave all these details into a seamless journey optimized for logistics and fun.</p>
              </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-[1000] bg-stone-900 text-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
       <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" className="w-full h-full object-cover" alt="mountains" />
       </div>
       <div className="relative z-10 flex flex-col items-center max-w-xl animate-fadeIn">
          <div className="w-24 h-24 sm:w-32 sm:h-32 border-8 border-indigo-500 border-t-transparent rounded-full animate-spin mb-16 shadow-2xl"></div>
          <h2 className="text-5xl sm:text-7xl font-bold mb-10 drop-shadow-xl tracking-tight leading-tight">Designing your escape...</h2>
          <p className="text-xl sm:text-3xl text-stone-300 font-normal leading-relaxed mb-14">
            Please give us a minute as we craft the perfect itinerary tailored to your preferences!
          </p>
       </div>
    </div>
  );

  return (
    <div className="max-w-full sm:max-w-5xl mx-auto p-4">
      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] sm:rounded-[5rem] shadow-[0_70px_140px_-30px_rgba(0,0,0,0.4)] dark:shadow-[0_70px_140px_-30px_rgba(0,0,0,0.7)] border border-stone-100 dark:border-stone-800 overflow-hidden min-h-[900px] flex flex-col transition-all duration-500 relative">
        <div className="h-64 sm:h-80 md:h-[450px] relative overflow-hidden bg-stone-100 dark:bg-stone-800">
           <img src={STEP_IMAGES[step - 1]} alt="Step Visual" className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-110" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
           <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-16 bg-black/60 backdrop-blur-2xl text-white px-6 py-2.5 sm:px-10 sm:py-4 rounded-full font-normal text-xs sm:text-sm uppercase tracking-widest border border-white/30 shadow-2xl">
              Step {step} / 11
           </div>
        </div>
        <div className="p-8 sm:p-16 md:p-24 flex-1 flex flex-col justify-between">
           <div className="flex-1">{renderStep()}</div>
           <div className="mt-10 sm:mt-20">
             <div className="flex justify-between items-center mb-14 pt-16 border-t dark:border-stone-800">
                <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className={`px-8 py-4 sm:px-14 sm:py-5 font-normal text-sm uppercase tracking-[0.3em] transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-bold'}`}>Back</button>
                <button onClick={handleNext} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-12 py-6 sm:px-20 sm:py-8 rounded-[2.5rem] font-normal text-base uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                  {step === 11 ? 'Finalize Journey 🚀' : 'Next Step'}
                </button>
             </div>
             <div className="flex flex-wrap justify-center gap-x-14 gap-y-8 text-xs sm:text-base font-normal uppercase tracking-[0.3em] text-stone-300 dark:text-stone-600 text-center">
                <span>OpenTrip.io</span>
                <span className="text-stone-200 dark:text-stone-800">|</span>
                <a href="https://openstay.io" target="_blank" className="hover:text-indigo-500 transition-colors font-bold">Partners with OpenStay.io</a>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};