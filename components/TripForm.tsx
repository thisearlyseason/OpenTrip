
import React, { useState, useEffect } from 'react';
import { TripRequest, FlightLeg, AccommodationDetails, Traveler } from '../types';
import { getTailoredInterests } from '../services/gemini';

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
  "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&w=1200&q=80", // 1. Destination
  "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80", // 2. Schedule
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1200&q=80", // 3. Dates
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80", // 4. Who
  "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1200&q=80", // 5. Flights (FIXED URL)
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80", // 6. Transportation
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80", // 7. Accommodation
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80", // 8. Food
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80", // 9. Vibe
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80", // 10. Interests
  "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=1200&q=80"  // 11. Must Include
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
            <h4 className="text-center font-normal text-stone-700 dark:text-stone-300 mb-4 text-base">{monthNames[month]} {year}</h4>
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-normal text-stone-400 uppercase tracking-widest">
                {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-2">
                {days.map((date, idx) => {
                    if (!date) return <div key={idx} />;
                    const t = date.getTime();
                    const s = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
                    const e = endDate ? new Date(endDate + 'T00:00:00').getTime() : 0;
                    const selected = t === s || t === e;
                    const inRange = startDate && endDate && t > s && t < e;
                    return (
                        <div key={idx} className="relative p-0.5 cursor-pointer" onClick={() => onDateClick(date)}>
                            <div className={`absolute inset-y-0 w-full ${inRange ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}></div>
                            <div className={`relative w-9 h-9 mx-auto flex items-center justify-center text-sm font-normal rounded-full z-10 ${selected ? 'bg-indigo-600 text-white shadow-md' : inRange ? 'text-indigo-900 dark:text-indigo-200' : 'text-stone-700 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}`}>
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

  const handleNext = () => {
    if (step === 1 && formData.destination.trim()) {
      getTailoredInterests(formData.destination).then(setInterestOptions);
    }
    if (step < 11) setStep(s => s + 1);
    else onSubmit(formData);
  };

  const setTravelerPreset = (type: string) => {
    let adults = 1, children = 0, details: Traveler[] = [];
    if (type === 'Solo') { adults = 1; children = 0; }
    else if (type === 'Couple') { adults = 2; children = 0; }
    else if (type === 'Family') { adults = 2; children = 1; }
    else if (type === 'Friends') { adults = 4; children = 0; }

    for (let i = 0; i < adults; i++) details.push({ id: Math.random().toString(), name: i === 0 && adults === 1 ? 'Me' : `Traveler ${i + 1}`, isChild: false });
    for (let i = 0; i < children; i++) details.push({ id: Math.random().toString(), name: `Child ${i + 1}`, isChild: true });
    
    updateField('travelers', { type, adults, children, details });
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100 leading-tight">Where are we going? 🌍</h2>
          <input type="text" value={formData.destination} onChange={e => updateField('destination', e.target.value)} placeholder="e.g. Paris, Tokyo, Bali" className="w-full px-8 py-5 rounded-2xl border-2 border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 dark:text-white focus:border-indigo-400 outline-none font-normal text-xl" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-3xl border border-stone-200 dark:border-stone-800">
               <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block mb-3">Primary Currency</label>
               <select value={formData.currency} onChange={e => updateField('currency', e.target.value)} className="w-full p-4 bg-white dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-xl font-normal text-lg">
                 {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
            <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-3xl border border-stone-200 dark:border-stone-800">
               <label className="text-sm font-normal text-stone-400 uppercase tracking-widest block mb-3">Trip Budget Goal</label>
               <div className="flex items-center gap-3">
                 <input type="number" value={formData.budget} onChange={e => updateField('budget', Number(e.target.value))} className="w-full p-4 border dark:border-stone-700 rounded-xl font-normal text-lg bg-white dark:bg-stone-800 dark:text-white" />
                 <select value={formData.budgetType} onChange={e => updateField('budgetType', e.target.value)} className="p-4 bg-white dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-xl font-normal text-lg">
                    <option value="total">Total</option>
                    <option value="perPerson">Per Person</option>
                 </select>
               </div>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Daily Schedule ⏰</h2>
          <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-100 dark:border-stone-800 space-y-8 shadow-sm">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-normal text-stone-400 uppercase tracking-widest block">Day Starts At</label>
                <input type="time" value={formData.timePreference.start} onChange={e => updateField('timePreference', {...formData.timePreference, start: e.target.value})} className="w-full p-4 rounded-xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-normal text-stone-400 uppercase tracking-widest block">Day Ends At</label>
                <input type="time" value={formData.timePreference.end} onChange={e => updateField('timePreference', {...formData.timePreference, end: e.target.value})} className="w-full p-4 rounded-xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-lg" />
              </div>
            </div>
            <div className="space-y-3">
                <label className="text-xs font-normal text-stone-400 uppercase tracking-widest block">Activity Preferences</label>
                <textarea 
                    value={formData.activityPreference} 
                    onChange={e => updateField('activityPreference', e.target.value)} 
                    placeholder="e.g. Prefer walking tours, want to sleep in on weekends, avoid crowded mornings..." 
                    className="w-full p-6 rounded-2xl border-2 dark:border-stone-700 dark:bg-stone-800 dark:text-white font-normal text-base h-32"
                />
            </div>
          </div>
        </div>
      );
      case 3: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Trip Dates 📅</h2>
          <div className="flex flex-col md:flex-row gap-10 bg-white dark:bg-stone-900 p-10 rounded-3xl border border-stone-100 dark:border-stone-800 overflow-x-auto shadow-sm">
            <MonthView year={new Date().getFullYear()} month={new Date().getMonth()} startDate={formData.dates.start} endDate={formData.dates.end} onDateClick={(d: Date) => {
               const ds = d.toISOString().split('T')[0];
               if (!formData.dates.start || (formData.dates.start && formData.dates.end)) updateField('dates', { ...formData.dates, start: ds, end: '' });
               else updateField('dates', { ...formData.dates, end: ds, duration: Math.ceil(Math.abs(new Date(ds).getTime() - new Date(formData.dates.start).getTime()) / (1000*60*60*24)) + 1 });
            }} />
            <MonthView year={new Date().getFullYear()} month={new Date().getMonth() + 1} startDate={formData.dates.start} endDate={formData.dates.end} onDateClick={(d: Date) => {
               const ds = d.toISOString().split('T')[0];
               if (!formData.dates.start || (formData.dates.start && formData.dates.end)) updateField('dates', { ...formData.dates, start: ds, end: '' });
               else updateField('dates', { ...formData.dates, end: ds, duration: Math.ceil(Math.abs(new Date(ds).getTime() - new Date(formData.dates.start).getTime()) / (1000*60*60*24)) + 1 });
            }} />
          </div>
          
          {formData.dates.start && (
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex justify-between items-center animate-slideUp">
                  <div>
                    <p className="text-xs font-normal text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em] mb-1">Selected Range</p>
                    <p className="text-xl font-normal text-indigo-900 dark:text-indigo-100">
                        {formData.dates.start} {formData.dates.end ? `➔ ${formData.dates.end}` : ''}
                    </p>
                  </div>
                  {formData.dates.end && (
                    <div className="text-right">
                        <p className="text-xs font-normal text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em] mb-1">Total Stay</p>
                        <p className="text-2xl font-normal text-indigo-900 dark:text-indigo-100">{formData.dates.duration} Days</p>
                    </div>
                  )}
              </div>
          )}
        </div>
      );
      case 4: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Who's Going? 👥</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Solo', 'Couple', 'Family', 'Friends'].map(t => (
              <button key={t} onClick={() => setTravelerPreset(t)} className={`py-5 rounded-2xl border-2 font-normal text-lg transition ${formData.travelers.type === t ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{t}</button>
            ))}
          </div>
          <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 max-h-60 overflow-y-auto space-y-3">
            {formData.travelers.details.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 bg-white dark:bg-stone-800 p-3 rounded-2xl border dark:border-stone-700 shadow-sm">
                    <span className="text-xl">{t.isChild ? '👶' : '👤'}</span>
                    <input type="text" value={t.name} onChange={e => {
                        const newDetails = [...formData.travelers.details];
                        newDetails[i].name = e.target.value;
                        updateField('travelers', { ...formData.travelers, details: newDetails });
                    }} className="flex-1 bg-transparent border-none outline-none font-normal text-sm dark:text-white" />
                </div>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Flight Details ✈️</h2>
          <div className="flex items-center gap-4 bg-white dark:bg-stone-900 p-8 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm">
             <input type="checkbox" id="bookedFlights" checked={formData.flight.booked} onChange={e => updateField('flight', { ...formData.flight, booked: e.target.checked })} className="w-7 h-7 rounded-lg accent-indigo-600" />
             <label htmlFor="bookedFlights" className="font-normal text-stone-700 dark:text-stone-300 text-lg">I have already booked flights</label>
          </div>

          {formData.flight.booked ? (
              <div className="space-y-6">
                <button onClick={() => updateField('flight', { ...formData.flight, legs: [...formData.flight.legs, { id: Math.random().toString(), airline: '', flightNumber: '', departureAirport: '', departureDate: '', departureTime: '', arrivalAirport: '', arrivalDate: '', arrivalTime: '', cost: 0 }] })} className="w-full py-5 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl font-normal text-xs uppercase tracking-widest text-stone-400 hover:bg-stone-50 transition">Add Flight Leg +</button>
                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                  {formData.flight.legs.map((leg, i) => (
                    <div key={leg.id} className="bg-white dark:bg-stone-800 p-8 rounded-3xl border dark:border-stone-700 shadow-sm relative space-y-6">
                      <button onClick={() => updateField('flight', { ...formData.flight, legs: formData.flight.legs.filter(l => l.id !== leg.id) })} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 text-xl">✕</button>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="text" placeholder="Airline" value={leg.airline} onChange={e => { const nl = [...formData.flight.legs]; nl[i].airline = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="p-4 border-2 dark:border-stone-700 rounded-xl text-sm font-normal dark:bg-stone-900 dark:text-white" />
                          <input type="text" placeholder="Flight #" value={leg.flightNumber} onChange={e => { const nl = [...formData.flight.legs]; nl[i].flightNumber = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="p-4 border-2 dark:border-stone-700 rounded-xl text-sm font-normal dark:bg-stone-900 dark:text-white" />
                          <div className="flex items-center bg-stone-50 dark:bg-stone-900 rounded-xl px-4 border-2 dark:border-stone-700">
                             <span className="text-sm font-normal text-stone-400 mr-2">{getCurrencySymbol(formData.currency)}</span>
                             <input type="number" placeholder="Cost" value={leg.cost} onChange={e => { const nl = [...formData.flight.legs]; nl[i].cost = Number(e.target.value); updateField('flight', { ...formData.flight, legs: nl }); }} className="p-2 w-full text-sm font-normal bg-transparent outline-none dark:text-white" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-normal uppercase text-stone-400 ml-1">Departure</label>
                            <input type="text" placeholder="SFO" value={leg.departureAirport} onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureAirport = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-sm font-normal dark:bg-stone-900 dark:text-white mb-2" />
                            <div className="flex gap-2">
                                <input type="date" value={leg.departureDate} onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureDate = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={leg.departureTime} onChange={e => { const nl = [...formData.flight.legs]; nl[i].departureTime = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-24 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-normal uppercase text-stone-400 ml-1">Arrival</label>
                            <input type="text" placeholder="LHR" value={leg.arrivalAirport} onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalAirport = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-full p-4 border-2 dark:border-stone-700 rounded-xl text-sm font-normal dark:bg-stone-900 dark:text-white mb-2" />
                            <div className="flex gap-2">
                                <input type="date" value={leg.arrivalDate} onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalDate = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={leg.arrivalTime} onChange={e => { const nl = [...formData.flight.legs]; nl[i].arrivalTime = e.target.value; updateField('flight', { ...formData.flight, legs: nl }); }} className="w-24 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          ) : (
              <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-3xl border border-stone-200 dark:border-stone-800">
                  <h4 className="text-xs font-normal text-stone-800 dark:text-stone-200 mb-2 uppercase tracking-widest">Flight Budget Estimator</h4>
                  <p className="text-xs text-stone-500 font-normal mb-5">Include potential flight costs in your total budget plan.</p>
                  <div className="flex items-center gap-4 bg-white dark:bg-stone-800 p-4 rounded-xl border-2 dark:border-stone-700">
                      <input type="checkbox" id="estimateFlight" checked={formData.includeFlightBudget} onChange={e => updateField('includeFlightBudget', e.target.checked)} className="w-6 h-6 rounded-lg accent-indigo-600" />
                      <label htmlFor="estimateFlight" className="font-normal text-stone-700 dark:text-stone-300 text-sm flex-1">Include Flight Budget:</label>
                      <input type="number" value={formData.flightBudget} onChange={e => updateField('flightBudget', Number(e.target.value))} className="w-24 p-2 border-2 dark:border-stone-700 rounded-lg font-normal text-sm text-center dark:bg-stone-900 dark:text-white" />
                  </div>
              </div>
          )}
        </div>
      );
      case 6: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Transportation 🚌</h2>
          <div className="bg-stone-50 dark:bg-stone-900/50 p-8 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-6">
             <h4 className="text-xs font-normal text-stone-400 uppercase tracking-widest">Local Transit Preferences</h4>
             <div className="flex flex-wrap gap-3">
               {TRANSIT_OPTIONS.map(o => (
                 <button key={o} onClick={() => updateField('transport', formData.transport.includes(o) ? formData.transport.filter(t => t !== o) : [...formData.transport, o])} className={`px-6 py-3 rounded-xl border-2 text-xs font-normal transition-all ${formData.transport.includes(o) ? 'bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900 shadow-lg' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{o}</button>
               ))}
             </div>
             
             <div className="pt-6 border-t dark:border-stone-800">
                <h4 className="text-xs font-normal text-stone-400 uppercase tracking-widest mb-4">Transit Budget Estimator</h4>
                <div className="flex items-center gap-4 bg-white dark:bg-stone-800 p-4 rounded-xl border-2 dark:border-stone-700">
                    <input type="checkbox" id="estimateTransit" checked={formData.includeTransportBudget} onChange={e => updateField('includeTransportBudget', e.target.checked)} className="w-6 h-6 rounded-lg accent-indigo-600" />
                    <label htmlFor="estimateTransit" className="font-normal text-stone-700 dark:text-stone-300 text-sm flex-1">Include Estimated Transit Budget:</label>
                    <input type="number" value={formData.transportBudget} onChange={e => updateField('transportBudget', Number(e.target.value))} className="w-24 p-2 border-2 dark:border-stone-700 rounded-lg font-normal text-sm text-center dark:bg-stone-900 dark:text-white" />
                </div>
             </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Accommodation 🏨</h2>
            <button onClick={() => updateField('accommodations', [...formData.accommodations, { id: Math.random().toString(), booked: false, checkInTime: '15:00', checkOutTime: '11:00', cost: 0 }])} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-6 py-3 rounded-2xl font-normal text-xs uppercase tracking-widest shadow-lg">Add Stay +</button>
          </div>
          <div className="max-h-[450px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
             {formData.accommodations.length === 0 ? (
                <div className="space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-10 rounded-[3rem] border-2 border-dashed border-indigo-200 dark:border-indigo-800 text-center">
                        <p className="text-indigo-900 dark:text-indigo-200 font-normal mb-3 text-lg">No Hotels Added Yet</p>
                        <p className="text-sm text-indigo-700/70 dark:text-indigo-400/70 mb-6 max-w-sm mx-auto font-normal">You can manually add your bookings or get suggestions after generating your trip.</p>
                    </div>
                    
                    <a href="https://www.openstay.io" target="_blank" rel="noopener noreferrer" className="block group">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden transition-transform group-hover:scale-[1.02]">
                            <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-4 -translate-y-4 group-hover:rotate-12 transition-transform">
                                <span className="text-8xl">🏨</span>
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-normal uppercase tracking-[0.3em] mb-3 opacity-80">Partner Spotlight</p>
                                <h4 className="text-2xl font-normal mb-2">Save on OpenStay.io</h4>
                                <p className="text-sm opacity-90 mb-8 leading-relaxed max-w-xs font-normal">
                                    Secure the best rates at top-rated hotels. OpenStay members save up to 25% on last-minute bookings.
                                </p>
                                <div className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-xl font-normal text-sm shadow-xl">
                                    Book Today ➔
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
             ) : (
                formData.accommodations.map((acc, i) => (
                    <div key={acc.id} className="bg-white dark:bg-stone-800 p-8 rounded-[3rem] border-2 dark:border-stone-700 shadow-sm relative space-y-6">
                        <button onClick={() => updateField('accommodations', formData.accommodations.filter(a => a.id !== acc.id))} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 text-xl">✕</button>
                        <input type="text" placeholder="Hotel Name" value={acc.hotelName} onChange={e => { const na = [...formData.accommodations]; na[i].hotelName = e.target.value; updateField('accommodations', na); }} className="w-full p-4 border-2 dark:border-stone-700 rounded-2xl font-normal text-lg outline-none dark:bg-stone-900 dark:text-white" />
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-3">
                              <label className="text-[10px] font-normal uppercase text-stone-400 ml-1 tracking-widest">Check-in</label>
                              <div className="flex gap-2">
                                <input type="date" value={acc.checkInDate} onChange={e => { const na = [...formData.accommodations]; na[i].checkInDate = e.target.value; updateField('accommodations', na); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={acc.checkInTime} onChange={e => { const na = [...formData.accommodations]; na[i].checkInTime = e.target.value; updateField('accommodations', na); }} className="w-24 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                              </div>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-normal uppercase text-stone-400 ml-1 tracking-widest">Check-out</label>
                              <div className="flex gap-2">
                                <input type="date" value={acc.checkOutDate} onChange={e => { const na = [...formData.accommodations]; na[i].checkOutDate = e.target.value; updateField('accommodations', na); }} className="flex-1 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                                <input type="time" value={acc.checkOutTime} onChange={e => { const na = [...formData.accommodations]; na[i].checkOutTime = e.target.value; updateField('accommodations', na); }} className="w-24 p-3 border-2 dark:border-stone-700 rounded-xl text-xs font-normal dark:bg-stone-900 dark:text-white" />
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center justify-between gap-8 pt-4 border-t dark:border-stone-700">
                           <div className="flex-1">
                              <label className="text-[10px] font-normal uppercase text-stone-400 ml-1 tracking-widest">Total Estimated Cost</label>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xl font-normal text-stone-400">{getCurrencySymbol(formData.currency)}</span>
                                <input type="number" value={acc.cost} onChange={e => { const na = [...formData.accommodations]; na[i].cost = Number(e.target.value); updateField('accommodations', na); }} className="w-full p-3 border-2 dark:border-stone-700 rounded-xl font-normal text-xl dark:bg-stone-900 dark:text-white" />
                              </div>
                           </div>
                           <div className="flex items-center gap-3 pt-6">
                              <input type="checkbox" id={`booked-${acc.id}`} checked={acc.booked} onChange={e => { const na = [...formData.accommodations]; na[i].booked = e.target.checked; updateField('accommodations', na); }} className="w-6 h-6 rounded-lg accent-emerald-500" />
                              <label htmlFor={`booked-${acc.id}`} className="font-normal text-sm text-stone-500 dark:text-stone-400">Booked</label>
                           </div>
                        </div>
                    </div>
                ))
             )}
          </div>
        </div>
      );
      case 8: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Food & Dining 🥘</h2>
          <div className="flex flex-wrap gap-4">
            {FOOD_OPTIONS.map(o => (
              <button key={o} onClick={() => updateField('foodPreferences', formData.foodPreferences.includes(o) ? formData.foodPreferences.filter(i => i !== o) : [...formData.foodPreferences, o])} className={`px-8 py-4 rounded-full border-2 text-lg font-normal transition-all ${formData.foodPreferences.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{o}</button>
            ))}
          </div>
          <div className="space-y-3 pt-4">
              <label className="text-xs font-normal text-stone-400 uppercase tracking-widest ml-2">Dietary Restrictions</label>
              <textarea placeholder="e.g. Peanut allergy, gluten-free required, preference for low-carb..." className="w-full p-6 bg-stone-50 dark:bg-stone-900 dark:text-white rounded-[2rem] border-2 border-stone-100 dark:border-stone-800 text-base font-normal h-32 outline-none focus:border-indigo-400" onChange={e => updateField('dietary', [e.target.value])}></textarea>
          </div>
        </div>
      );
      case 9: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Trip Vibe 🧖‍♀️</h2>
          <div className="grid grid-cols-2 gap-4">
            {VIBE_OPTIONS.map(v => (
              <button key={v} onClick={() => updateField('vibe', formData.vibe.includes(v) ? formData.vibe.filter(i => i !== v) : [...formData.vibe, v])} className={`py-5 rounded-2xl border-2 font-normal text-lg transition-all ${formData.vibe.includes(v) ? 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white shadow-xl' : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-500 hover:border-stone-300'}`}>{v}</button>
            ))}
          </div>
        </div>
      );
      case 10: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Tailored Interests ✨</h2>
          <p className="text-stone-500 font-normal">Select activities you're curious about in {formData.destination}.</p>
          <div className="flex flex-wrap gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {interestOptions.map(o => (
              <button key={o} onClick={() => updateField('interests', formData.interests.includes(o) ? formData.interests.filter(i => i !== o) : [...formData.interests, o])} className={`px-8 py-4 rounded-2xl border-2 text-lg font-normal transition-all ${formData.interests.includes(o) ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-stone-800 dark:border-stone-700 border-stone-100 text-stone-600 hover:border-stone-400 shadow-sm'}`}>{o}</button>
            ))}
          </div>
        </div>
      );
      case 11: return (
        <div className="space-y-8 animate-fadeIn">
          <h2 className="text-4xl font-normal text-stone-800 dark:text-stone-100">Final Requests 🗽</h2>
          <div className="space-y-6">
              <div className="space-y-3">
                  <label className="text-xs font-normal text-stone-400 uppercase tracking-widest ml-2">Must-Visit Spots</label>
                  <textarea placeholder="e.g. Statue of Liberty, Eiffel Tower, specific restaurants..." className="w-full p-8 rounded-[3rem] border-2 border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 dark:text-white text-base font-normal min-h-[180px] outline-none focus:border-indigo-400" onChange={e => updateField('mustIncludes', e.target.value.split(',').map(s => s.trim()))}></textarea>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-6">
                <span className="text-4xl animate-pulse">✨</span>
                <p className="text-sm font-normal text-indigo-700 dark:text-indigo-200 leading-relaxed">Our AI will weave all these details into a seamless journey optimized for logistics and fun.</p>
              </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  if (isLoading) return (
    <div className="fixed inset-0 z-[1000] bg-stone-900 text-white flex flex-col items-center justify-center p-8 text-center">
       <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" className="w-full h-full object-cover" alt="mountains" />
       </div>
       <div className="relative z-10 flex flex-col items-center max-w-lg animate-fadeIn">
          <div className="w-24 h-24 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-10 shadow-2xl"></div>
          <h2 className="text-5xl font-normal mb-6 drop-shadow-xl tracking-tight leading-tight">Designing your escape...</h2>
          <p className="text-stone-300 text-xl font-normal leading-relaxed mb-6">
            Please give us a minute or two as we design the best possible retreat for you!
          </p>
          <p className="text-stone-400 text-xs font-normal uppercase tracking-[0.3em] opacity-80 max-w-xs mx-auto">
            Cross-referencing live event schedules and transit hubs...
          </p>
       </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white dark:bg-stone-900 rounded-[3.5rem] shadow-2xl border border-stone-100 dark:border-stone-800 overflow-hidden min-h-[750px] flex flex-col transition-colors">
        <div className="h-48 md:h-72 relative overflow-hidden bg-stone-100 dark:bg-stone-800">
           <img src={STEP_IMAGES[step - 1]} alt="Step Visual" className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-110" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
           <div className="absolute bottom-6 right-8 bg-black/50 backdrop-blur-xl text-white px-6 py-2 rounded-full font-normal text-xs uppercase tracking-widest border border-white/20 shadow-2xl">
              Step {step} / 11
           </div>
        </div>
        <div className="p-10 md:p-14 flex-1 flex flex-col justify-between">
           <div className="flex-1">{renderStep()}</div>
           <div className="flex justify-between mt-12 pt-10 border-t dark:border-stone-800 items-center">
              <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className={`px-8 py-3 font-normal text-xs uppercase tracking-[0.2em] transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'}`}>Back</button>
              <button onClick={handleNext} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-12 py-5 rounded-[2rem] font-normal text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                {step === 11 ? 'Finalize Journey 🚀' : 'Next Step'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
