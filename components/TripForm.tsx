
import React, { useState, useEffect } from 'react';
import { TripRequest, FlightLeg, AccommodationDetails, Traveler } from '../types';
import { getTailoredInterests } from '../services/gemini';

interface TripFormProps {
  onSubmit: (request: TripRequest) => void;
  isLoading: boolean;
}

const TRANSPORT_OPTIONS = ["🚶 Walking", "🚇 Public transport", "🚕 Taxi / Uber", "🚗 Rental car", "🚲 Bike Rental", "⛵ Ferry / Boat"];
const DIETARY_OPTIONS = ["🥕 Vegetarian", "🌿 Vegan", "🌾 Gluten-Free", "🥜 Nut Allergy", "🐟 Pescatarian", "🥛 Lactose Intolerant", "🍽️ No dietary needs"];
const FOOD_OPTIONS = ["🍱 Asian", "🍔 Fast Food", "🍝 Fine Dining", "☕ Cafés", "🍢 Street Food", "🌮 Local Specialties", "🥂 Bars & Pubs", "🥐 Bakeries", "🍕 Italian", "🍛 Indian", "🥙 Middle Eastern"];
const LOADING_TIPS = [
  "💡 Tip: Tuesday is often the cheapest day to fly.",
  "💡 Tip: Roll your clothes to save space and prevent wrinkles.",
  "💡 Tip: Download offline maps before you leave Wi-Fi.",
  "💡 Tip: Scan your passport and email it to yourself just in case.",
  "💡 Tip: Pack a portable charger – maps drain battery fast!",
  "💡 Tip: Learn 'Hello' and 'Thank You' in the local language.",
  "💡 Tip: Notify your bank about your travel dates."
];

const STEP_IMAGES = [
  "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80"
];

const FALLBACK_STEP_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";

const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MonthView: React.FC<{ 
    year: number; month: number; startDate: string; endDate: string; onDateClick: (d: Date) => void; 
}> = ({ year, month, startDate, endDate, onDateClick }) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
        <div className="flex-1 min-w-[280px]">
            <h4 className="text-center font-bold text-stone-700 mb-3">{monthNames[month]} {year}</h4>
            <div className="grid grid-cols-7 mb-1 text-center text-[10px] font-bold text-stone-400 uppercase">
                {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {days.map((date, idx) => {
                    if (!date) return <div key={idx} />;
                    const t = date.getTime();
                    const s = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
                    const e = endDate ? new Date(endDate + 'T00:00:00').getTime() : 0;
                    const selected = t === s || t === e;
                    const inRange = startDate && endDate && t > s && t < e;
                    return (
                        <div key={idx} className="relative p-0.5 cursor-pointer" onClick={() => onDateClick(date)}>
                            <div className={`absolute inset-y-0 w-full ${inRange ? 'bg-indigo-50' : ''} ${t === s && endDate ? 'left-1/2 bg-indigo-50 rounded-l-md' : ''} ${t === e && startDate ? 'right-1/2 bg-indigo-50 rounded-r-md' : ''}`}></div>
                            <div className={`relative w-8 h-8 mx-auto flex items-center justify-center text-xs font-medium rounded-full transition-all z-10 ${selected ? 'bg-indigo-600 text-white shadow-md' : inRange ? 'text-indigo-900' : 'text-stone-700 hover:bg-stone-100'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CalendarPicker: React.FC<{ startDate: string; endDate: string; onChange: (s: string, e: string) => void; }> = ({ startDate, endDate, onChange }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const nextMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);

  const handleDateClick = (date: Date) => {
    const ds = formatDateLocal(date);
    if (!startDate || (startDate && endDate)) onChange(ds, '');
    else {
      if (new Date(ds) < new Date(startDate)) onChange(ds, '');
      else onChange(startDate, ds);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm select-none animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <button onClick={(e) => { e.preventDefault(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }} className="p-2 hover:bg-stone-100 rounded-full">←</button>
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Select Trip Window</span>
        <button onClick={(e) => { e.preventDefault(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }} className="p-2 hover:bg-stone-100 rounded-full">→</button>
      </div>
      <div className="flex flex-col md:flex-row gap-8 overflow-x-auto">
        <MonthView year={viewDate.getFullYear()} month={viewDate.getMonth()} startDate={startDate} endDate={endDate} onDateClick={handleDateClick} />
        <MonthView year={nextMonth.getFullYear()} month={nextMonth.getMonth()} startDate={startDate} endDate={endDate} onDateClick={handleDateClick} />
      </div>
    </div>
  );
};

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [isTailoringInterests, setIsTailoringInterests] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Initial Form State
  const [formData, setFormData] = useState<TripRequest>({
    destination: '', vibe: [], budget: 2000, budgetType: 'total',
    flightBudget: 500, includeFlightBudget: false,
    hotelBudget: 800, includeHotelBudget: false,
    dates: { start: '', end: '', duration: 3 },
    timePreference: { start: '09:00', end: '21:00' },
    flight: { booked: false, legs: [] },
    travelers: { type: 'Solo', adults: 1, children: 0, details: [{ id: '1', name: 'Traveler 1', isChild: false }] },
    transport: [], interests: [], mustIncludes: [],
    accommodations: [],
    dietary: [], foodPreferences: []
  });

  // Cycle tips
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const updateField = (f: keyof TripRequest, v: any) => setFormData(p => ({ ...p, [f]: v }));
  
  const toggleArray = (f: 'transport'|'interests'|'dietary'|'foodPreferences'|'vibe', v: string) => {
    setFormData(p => {
      const list = p[f] as string[];
      return { ...p, [f]: list.includes(v) ? list.filter(i => i !== v) : [...list, v] };
    });
  };

  const handleNext = () => {
    if (step === 1 && formData.destination.trim()) {
      setIsTailoringInterests(true);
      getTailoredInterests(formData.destination).then((tailored) => {
        setInterestOptions(tailored);
        setIsTailoringInterests(false);
      });
    }
    setStep(s => s + 1);
  };

  const setTravelerType = (type: string) => {
    let adults = 1;
    let children = 0;
    if (type === 'Couple') { adults = 2; children = 0; }
    else if (type === 'Family') { adults = 2; children = 1; }
    else if (type === 'Friends') { adults = 4; children = 0; }
    
    updateField('travelers', { 
        type, 
        adults, 
        children, 
        details: generateTravelerList(adults, children) 
    });
  };

  const generateTravelerList = (adults: number, children: number) => {
    const newDetails: Traveler[] = [];
    for (let i = 0; i < adults; i++) {
        newDetails.push({ id: `a-${i}`, name: `Adult ${i+1}`, isChild: false });
    }
    for (let i = 0; i < children; i++) {
        newDetails.push({ id: `c-${i}`, name: `Child ${i+1}`, isChild: true });
    }
    return newDetails;
  };

  const updateTravelerCounts = (deltaAdult: number, deltaChild: number) => {
      const newAdults = Math.max(1, formData.travelers.adults + deltaAdult);
      const newChildren = Math.max(0, formData.travelers.children + deltaChild);
      const currentAdults = formData.travelers.details.filter(t => !t.isChild);
      const currentChildren = formData.travelers.details.filter(t => t.isChild);
      
      let nextAdults = [...currentAdults];
      if (newAdults > currentAdults.length) {
          for(let i = currentAdults.length; i < newAdults; i++) nextAdults.push({ id: `a-${Date.now()}-${i}`, name: `Adult ${i+1}`, isChild: false });
      } else {
          nextAdults = nextAdults.slice(0, newAdults);
      }

      let nextChildren = [...currentChildren];
      if (newChildren > currentChildren.length) {
          for(let i = currentChildren.length; i < newChildren; i++) nextChildren.push({ id: `c-${Date.now()}-${i}`, name: `Child ${i+1}`, isChild: true });
      } else {
          nextChildren = nextChildren.slice(0, newChildren);
      }

      updateField('travelers', {
          ...formData.travelers,
          type: 'Custom',
          adults: newAdults,
          children: newChildren,
          details: [...nextAdults, ...nextChildren]
      });
  };

  const updateTravelerName = (id: string, name: string) => {
      const newDetails = formData.travelers.details.map(t => t.id === id ? { ...t, name } : t);
      updateField('travelers', { ...formData.travelers, details: newDetails });
  };

  const addFlight = () => setFormData(p => ({ 
      ...p, 
      flight: { 
          ...p.flight, 
          legs: [...p.flight.legs, { id: Math.random().toString(36).substr(2,9), flightNumber: '', departureAirport: '', departureDate: '', departureTime: '', arrivalAirport: '', arrivalDate: '', arrivalTime: '', confirmationNumber: '' }] 
      } 
  }));
  
  const updateFlight = (id: string, up: Partial<FlightLeg>) => setFormData(p => ({ ...p, flight: { ...p.flight, legs: p.flight.legs.map(l => l.id === id ? {...l, ...up} : l) } }));
  const removeFlight = (id: string) => setFormData(p => ({ ...p, flight: { ...p.flight, legs: p.flight.legs.filter(l => l.id !== id) } }));

  const addAcc = () => setFormData(p => ({ 
      ...p, 
      accommodations: [...p.accommodations, { id: Math.random().toString(36).substr(2,9), booked: false, hotelName: '', address: '', checkInDate: '', checkInTime: '', checkOutDate: '', checkOutTime: '', confirmationNumber: '', cost: '' }] 
  }));
  
  const updateAcc = (id: string, up: any) => {
    setFormData(p => {
        const newAccs = p.accommodations.map(a => a.id === id ? {...a, ...up} : a);
        return { ...p, accommodations: newAccs };
    });
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Where to? 🌍</h2>
          <input type="text" value={formData.destination} onChange={e => updateField('destination', e.target.value)} placeholder="e.g. Paris, Tokyo, Bali" className="w-full px-6 py-4 rounded-2xl border-2 border-stone-100 focus:border-indigo-400 outline-none transition-all shadow-sm font-medium" />
          
          <div className="bg-stone-50 p-6 rounded-3xl border border-stone-200">
             <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total trip budget</label>
                <div className="flex bg-white rounded-lg p-1 border">
                   <button onClick={() => updateField('budgetType', 'total')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${formData.budgetType === 'total' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-500'}`}>Total</button>
                   <button onClick={() => updateField('budgetType', 'perPerson')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${formData.budgetType === 'perPerson' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-500'}`}>Per Person</button>
                </div>
             </div>
             <div className="relative mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                <input type="number" className="w-full pl-8 p-3 border border-stone-200 rounded-2xl outline-none focus:border-indigo-400 font-black text-2xl bg-white" value={formData.budget} onChange={e => updateField('budget', Number(e.target.value))} />
             </div>

             <div className="border-t border-stone-200 pt-6 space-y-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Daily Rhythm 🕒</p>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-bold text-stone-400 ml-2 mb-1 block uppercase">Prefered Start Time</label>
                      <input 
                        type="time" 
                        value={formData.timePreference.start} 
                        onChange={e => updateField('timePreference', { ...formData.timePreference, start: e.target.value })}
                        className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 focus:border-indigo-400 outline-none" 
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-stone-400 ml-2 mb-1 block uppercase">Prefered End Time</label>
                      <input 
                        type="time" 
                        value={formData.timePreference.end} 
                        onChange={e => updateField('timePreference', { ...formData.timePreference, end: e.target.value })}
                        className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 focus:border-indigo-400 outline-none" 
                      />
                   </div>
                </div>
             </div>
          </div>

          <CalendarPicker startDate={formData.dates.start} endDate={formData.dates.end} onChange={(s, e) => {
            const dur = s && e ? Math.ceil(Math.abs(new Date(e).getTime() - new Date(s).getTime()) / (1000*60*60*24)) + 1 : 1;
            updateField('dates', { start: s, end: e, duration: dur });
          }} />
        </div>
      );
      case 2: return (
        <div className="space-y-6 animate-fadeIn">
          <h2 className="text-3xl font-bold text-stone-800">Flights ✈️</h2>
          <div className="flex gap-4 p-2 bg-stone-100 rounded-2xl">
            <button onClick={() => updateField('flight', {...formData.flight, booked: true})} className={`flex-1 py-3 rounded-xl font-bold ${formData.flight.booked ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}>Booked</button>
            <button onClick={() => updateField('flight', {...formData.flight, booked: false})} className={`flex-1 py-3 rounded-xl font-bold ${!formData.flight.booked ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'}`}>Not Yet</button>
          </div>
          
          {formData.flight.booked ? (
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.flight.legs.map((leg, i) => (
                    <div key={leg.id} className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-200 relative">
                        <button onClick={() => removeFlight(leg.id)} className="absolute top-4 right-4 text-stone-300 hover:text-rose-500">✕</button>
                        <h4 className="font-bold text-sm text-stone-400 uppercase tracking-widest mb-4">Flight {i + 1}</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input placeholder="Flight No." value={leg.flightNumber} onChange={e => updateFlight(leg.id, {flightNumber: e.target.value})} className="p-3 rounded-xl border text-sm" />
                            <input placeholder="Conf. #" value={leg.confirmationNumber} onChange={e => updateFlight(leg.id, {confirmationNumber: e.target.value})} className="p-3 rounded-xl border text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input placeholder="Dep Airport" value={leg.departureAirport} onChange={e => updateFlight(leg.id, {departureAirport: e.target.value})} className="p-3 rounded-xl border text-sm" />
                            <input placeholder="Arr Airport" value={leg.arrivalAirport} onChange={e => updateFlight(leg.id, {arrivalAirport: e.target.value})} className="p-3 rounded-xl border text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-[10px] font-bold text-stone-400 ml-2">Departure</label>
                                <input type="datetime-local" value={`${leg.departureDate}T${leg.departureTime}`} onChange={e => {
                                    const [d, t] = e.target.value.split('T');
                                    updateFlight(leg.id, {departureDate: d, departureTime: t});
                                }} className="w-full p-3 rounded-xl border text-xs" />
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-stone-400 ml-2">Arrival</label>
                                <input type="datetime-local" value={`${leg.arrivalDate}T${leg.arrivalTime}`} onChange={e => {
                                    const [d, t] = e.target.value.split('T');
                                    updateFlight(leg.id, {arrivalDate: d, arrivalTime: t});
                                }} className="w-full p-3 rounded-xl border text-xs" />
                             </div>
                        </div>
                    </div>
                ))}
                <button onClick={addFlight} className="w-full py-4 border-2 border-dashed border-stone-300 rounded-[2rem] text-stone-400 font-bold hover:bg-stone-100">+ Add Flight Leg</button>
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm mt-4">
                   <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Flight Cost</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                        <input type="number" className="w-full pl-6 p-2 border border-stone-200 rounded-xl outline-none focus:border-indigo-400 font-bold text-lg bg-stone-50 text-right" value={formData.flightBudget} onChange={e => updateField('flightBudget', Number(e.target.value))} />
                      </div>
                   </div>
                </div>
             </div>
          ) : (
             <div className="animate-fadeIn space-y-4">
                <div className="p-8 bg-sky-50 rounded-[2.5rem] border-2 border-dashed border-sky-200 text-center">
                   <span className="text-4xl block mb-4">✈️</span>
                   <p className="font-bold text-sky-800 text-lg">We'll help you plan for flights.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">Est. Flight Budget</label>
                      <button onClick={() => updateField('includeFlightBudget', !formData.includeFlightBudget)} className={`w-10 h-6 rounded-full relative transition-colors ${formData.includeFlightBudget ? 'bg-indigo-600' : 'bg-stone-200'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.includeFlightBudget ? 'left-5' : 'left-1'}`}></div>
                      </button>
                   </div>
                   <div className={`relative ${formData.includeFlightBudget ? 'opacity-100' : 'opacity-40'}`}>
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                      <input type="number" disabled={!formData.includeFlightBudget} className="w-full pl-8 p-3 border border-stone-200 rounded-2xl outline-none focus:border-indigo-400 font-bold text-xl bg-stone-50" value={formData.flightBudget} onChange={e => updateField('flightBudget', Number(e.target.value))} />
                   </div>
                </div>
             </div>
          )}
        </div>
      );
      case 3: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Travelers 👥</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {['Solo', 'Couple', 'Family', 'Friends'].map(t => (
              <button key={t} onClick={() => setTravelerType(t)} className={`py-4 rounded-2xl border-2 font-bold transition ${formData.travelers.type === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'}`}>{t}</button>
            ))}
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm">
             <div className="flex gap-4 mb-6">
                 <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Adults</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateTravelerCounts(-1, 0)} className="w-8 h-8 rounded-full bg-white border shadow-sm hover:bg-stone-100 font-bold">-</button>
                        <span className="text-xl font-black">{formData.travelers.adults}</span>
                        <button onClick={() => updateTravelerCounts(1, 0)} className="w-8 h-8 rounded-full bg-white border shadow-sm hover:bg-stone-100 font-bold">+</button>
                    </div>
                 </div>
                 <div className="flex-1 p-4 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Children</span>
                    <div className="flex items-center gap-4">
                        <button onClick={() => updateTravelerCounts(0, -1)} className="w-8 h-8 rounded-full bg-white border shadow-sm hover:bg-stone-100 font-bold">-</button>
                        <span className="text-xl font-black">{formData.travelers.children}</span>
                        <button onClick={() => updateTravelerCounts(0, 1)} className="w-8 h-8 rounded-full bg-white border shadow-sm hover:bg-stone-100 font-bold">+</button>
                    </div>
                 </div>
             </div>
             <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.travelers.details.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                        <span className="w-6 text-xl">{t.isChild ? '👶' : '👤'}</span>
                        <input value={t.name} onChange={(e) => updateTravelerName(t.id, e.target.value)} className="flex-1 p-3 bg-stone-50 border border-stone-100 rounded-xl text-sm font-bold focus:border-indigo-300 outline-none" placeholder={t.isChild ? "Child Name" : "Adult Name"} />
                    </div>
                ))}
             </div>
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Transport 🚇</h2>
          <div className="grid grid-cols-2 gap-4">
            {TRANSPORT_OPTIONS.map(o => (
              <button key={o} onClick={() => toggleArray('transport', o)} className={`p-5 rounded-3xl border-2 text-sm font-bold transition-all text-left ${formData.transport.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]' : 'bg-stone-50 border-stone-50 text-stone-500 hover:border-stone-200'}`}>{o}</button>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Tailored Interests ❤️</h2>
          {isTailoringInterests ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
               <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Fetching local gems for {formData.destination}...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
              {interestOptions.map(o => (
                <button key={o} onClick={() => toggleArray('interests', o)} className={`px-5 py-3 rounded-full border-2 text-xs font-bold transition-all ${formData.interests.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'}`}>{o}</button>
              ))}
            </div>
          )}
        </div>
      );
      case 6: return (
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-stone-800">Food & Diet 🍱</h2>
          <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Cuisine Preferences</h4>
            <div className="flex flex-wrap gap-2">
              {FOOD_OPTIONS.map(o => (
                <button key={o} onClick={() => toggleArray('foodPreferences', o)} className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition ${formData.foodPreferences.includes(o) ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'}`}>{o}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Dietary Restrictions</h4>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(o => (
                <button key={o} onClick={() => toggleArray('dietary', o)} className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition ${formData.dietary.includes(o) ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white border-stone-100 text-stone-500 hover:border-stone-200'}`}>{o}</button>
              ))}
            </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Accommodations 🏨</h2>
          
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm mb-4">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    Total Accommodations Budget
                </label>
                <button onClick={() => updateField('includeHotelBudget', !formData.includeHotelBudget)} className={`w-10 h-6 rounded-full relative transition-colors ${formData.includeHotelBudget ? 'bg-indigo-600' : 'bg-stone-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.includeHotelBudget ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>
              <div className={`relative ${formData.includeHotelBudget ? 'opacity-100' : 'opacity-40'}`}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                <input type="number" className="w-full pl-8 p-3 border border-stone-200 rounded-2xl outline-none focus:border-indigo-400 font-bold text-xl bg-stone-50" value={formData.hotelBudget} onChange={e => updateField('hotelBudget', Number(e.target.value))} />
              </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {formData.accommodations.map((a) => (
              <div key={a.id} className="p-6 bg-stone-50 rounded-[2.5rem] border border-stone-200 relative shadow-sm">
                <button onClick={() => setFormData(p=>({...p, accommodations: p.accommodations.filter(x=>x.id!==a.id)}))} className="absolute top-6 right-6 text-stone-300 hover:text-rose-500 transition">✕</button>
                <div className="space-y-3">
                    <input type="text" placeholder="Hotel Name" className="w-full p-4 border rounded-2xl bg-white text-sm focus:border-indigo-400 outline-none font-bold" value={a.hotelName} onChange={e=>updateAcc(a.id, {hotelName: e.target.value})} />
                    <input type="text" placeholder="Full Address" className="w-full p-4 border rounded-2xl bg-white text-sm focus:border-indigo-400 outline-none" value={a.address} onChange={e=>updateAcc(a.id, {address: e.target.value})} />
                    <input type="text" placeholder="Confirmation #" className="w-full p-3 border rounded-xl bg-white text-xs" value={a.confirmationNumber} onChange={e=>updateAcc(a.id, {confirmationNumber: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[10px] font-bold text-stone-400 ml-2">Check In</label>
                           <input type="datetime-local" value={`${a.checkInDate}T${a.checkInTime}`} onChange={e => {
                                const [d, t] = e.target.value.split('T');
                                updateAcc(a.id, {checkInDate: d, checkInTime: t});
                           }} className="w-full p-3 rounded-xl border text-xs bg-white" />
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-stone-400 ml-2">Check Out</label>
                           <input type="datetime-local" value={`${a.checkOutDate}T${a.checkOutTime}`} onChange={e => {
                                const [d, t] = e.target.value.split('T');
                                updateAcc(a.id, {checkOutDate: d, checkOutTime: t});
                           }} className="w-full p-3 rounded-xl border text-xs bg-white" />
                        </div>
                    </div>
                </div>
              </div>
            ))}
            <button onClick={addAcc} className="w-full py-5 border-2 border-dashed border-stone-300 rounded-[2.5rem] text-stone-400 font-bold hover:bg-stone-100 hover:border-indigo-300 transition shadow-sm">+ Add Booked Hotel</button>
          </div>
        </div>
      );
      case 8: return (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-stone-800">Must Includes ✨</h2>
          <textarea className="w-full h-48 p-6 bg-stone-50 border-2 border-stone-100 rounded-3xl focus:bg-white focus:border-indigo-400 outline-none transition shadow-sm font-medium text-sm" placeholder="e.g. Dinner at the Eiffel Tower, Visit the Louvre..." value={formData.mustIncludes.join('\n')} onChange={e => updateField('mustIncludes', e.target.value.split('\n'))} />
        </div>
      );
      case 9: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-3xl font-bold text-stone-800">Final Review 🔍</h2>
          <div className="bg-stone-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
             <h3 className="text-3xl font-black mb-2 tracking-tight">{formData.destination || 'Your Journey'}</h3>
             <p className="text-sm opacity-80 font-medium">📅 {formData.dates.duration} Days • 👥 {formData.travelers.adults + formData.travelers.children} Travelers</p>
             {formData.flight.booked && <div className="mt-4 bg-white/10 p-2 rounded-xl text-xs font-bold inline-block">✈️ Flights Booked</div>}
             {formData.accommodations.length > 0 && <div className="mt-4 ml-2 bg-white/10 p-2 rounded-xl text-xs font-bold inline-block">🏨 Hotels Booked</div>}
          </div>
        </div>
      );
      default: return null;
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/95 backdrop-blur-md">
      <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-md w-full animate-slideUp relative overflow-hidden">
        <div className="w-20 h-20 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-8"></div>
        <h3 className="text-2xl font-black text-stone-900 mb-2 tracking-tight">Designing Your Trip...</h3>
        <p className="text-stone-500 font-medium mb-8">This will take a minute or two to design the best trip!</p>
        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 h-24 flex items-center justify-center">
           <p className="text-sm font-bold text-indigo-600 animate-pulse transition-all duration-500">{LOADING_TIPS[currentTipIndex]}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fadeIn">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5,6,7,8,9].map(s => <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${s <= step ? 'bg-indigo-500 shadow-sm shadow-indigo-200' : 'bg-stone-200'}`} />)}
      </div>
      <div className="bg-white rounded-[3rem] shadow-2xl border border-stone-100 overflow-hidden min-h-[600px] flex flex-col relative">
        <div className="h-48 md:h-64 relative overflow-hidden bg-stone-100">
           <img src={STEP_IMAGES[step - 1]} alt="Step Visual" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_STEP_IMAGE; }} />
        </div>
        <div className="p-10 md:p-14 flex-1 flex flex-col justify-between">
           <div className="flex-1 w-full max-w-2xl mx-auto">{renderStep()}</div>
           <div className="flex justify-between mt-12 pt-8 border-t border-stone-50 items-center">
              <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className={`px-8 py-3 font-black text-sm uppercase tracking-widest transition ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-stone-400 hover:text-stone-900'}`}>Back</button>
              <button onClick={() => step === 9 ? onSubmit(formData) : handleNext()} className="bg-stone-900 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                {step === 9 ? 'Generate Itinerary' : 'Next'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
