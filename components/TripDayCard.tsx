
import React, { useState, useEffect } from 'react';
import { TripDay, DayActivity, ActivityType, FlightLeg } from '../types';
import { regenerateDayPlan, regenerateSingleActivity, generateImage, generateActivityFromPrompt } from '../services/gemini';

const imageCache = new Map<string, string>();

interface TripDayCardProps {
  day: TripDay;
  destination: string;
  currency: string;
  onUpdateActivities: (dayNumber: number, newActivities: DayActivity[]) => void;
  onUpdateDay: (dayNumber: number, newDay: TripDay) => void;
  onActivityDrop: (dayNumber: number, activityId: string, fromDayNumber: number, newIndex: number) => void;
  vibe: string;
  isPro: boolean;
  onGatedActionTrigger: (featureId: string) => void;
  onViewOnMap?: () => void;
  flightsOnDay?: any[];
  hotelsOnDay?: any[];
}

const getCurrencySymbol = (c: string) => (c || "").match(/\((.*?)\)/)?.[1] || (c || "").split(' ')[0] || "$";

const FlightVisual: React.FC<{ legs: FlightLeg[] }> = ({ legs }) => {
  if (!legs || legs.length === 0) return null;
  return (
    <div className="my-8 space-y-6">
      {legs.map((leg, i) => (
        <div key={i} className="flex items-center gap-5 relative">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-sky-500 ring-8 ring-sky-100 dark:ring-sky-900/30"></div>
            {i < legs.length - 1 && <div className="w-0.5 h-16 bg-sky-200 border-l-2 border-dashed border-sky-300"></div>}
          </div>
          <div className="flex-1 bg-stone-50 dark:bg-stone-800 p-6 rounded-3xl border border-stone-100 dark:border-stone-700 flex justify-between items-center group hover:bg-white dark:hover:bg-stone-750 hover:shadow-xl transition-all">
            <div>
               <p className="text-[10px] font-normal text-sky-600 dark:text-sky-400 uppercase tracking-[0.2em] mb-1">{leg.departureTime} • {leg.departureAirport}</p>
               <h5 className="text-lg font-bold text-stone-900 dark:text-white leading-tight">{leg.airline || 'Flight'} {leg.flightNumber}</h5>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-normal text-stone-400 uppercase tracking-[0.2em] mb-1">{leg.arrivalTime} • {leg.arrivalAirport}</p>
               <span className="text-xs font-normal text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded-full">Scheduled</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const TransitVisual: React.FC<{ transit?: DayActivity['transportToNext'] }> = ({ transit }) => {
  if (!transit || !transit.mode) return null;
  return (
    <div className="py-10 flex flex-col items-center gap-3 relative">
       <div className="w-0.5 h-12 border-l-2 border-dashed border-stone-200 dark:border-stone-800"></div>
       <div className="flex items-center gap-4 px-8 py-3 bg-stone-50 dark:bg-stone-800 rounded-full border border-stone-100 dark:border-stone-700 shadow-xl">
          <span className="text-xl">
            {transit.mode.toLowerCase().includes('walk') ? '🚶' : transit.mode.toLowerCase().includes('taxi') || transit.mode.toLowerCase().includes('uber') ? '🚕' : '🚌'}
          </span>
          <span className="text-[11px] font-normal uppercase tracking-[0.3em] text-stone-400 dark:text-stone-500">
            {transit.mode} • {transit.duration || '20m'} {transit.cost && `• ${transit.cost}`}
          </span>
       </div>
       <div className="w-0.5 h-12 border-l-2 border-dashed border-stone-200 dark:border-stone-800"></div>
    </div>
  );
};

const ItineraryItem: React.FC<{ 
    act: DayActivity; 
    canEdit: boolean; 
    destination: string;
    currency: string;
    onUpdateField: (id: string, field: keyof DayActivity, val: any) => void;
    onSwap: (act: DayActivity) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, direction: 'up' | 'down') => void;
    swappingId: string | null;
}> = ({ act, canEdit, destination, currency, onUpdateField, onSwap, onDelete, onMove, swappingId }) => {
    const [mainImage, setMainImage] = useState<string>(imageCache.get(act.id) || '');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ ...act, actualSpent: act.actualSpent || 0 });

    useEffect(() => {
      if (act.imageUrl) {
        setMainImage(act.imageUrl);
        return;
      }
      const cached = imageCache.get(act.id);
      if (cached) {
        setMainImage(cached);
      } else {
        generateImage(act.imagePrompt || `${act.title} at ${destination}`, '4:3').then(url => {
          imageCache.set(act.id, url);
          setMainImage(url);
        });
      }
    }, [act.id, act.imageUrl, destination, act.imagePrompt]);

    const handleSave = () => {
        onUpdateField(act.id, 'title', editForm.title);
        onUpdateField(act.id, 'description', editForm.description);
        onUpdateField(act.id, 'cost', editForm.cost);
        onUpdateField(act.id, 'time', editForm.time);
        onUpdateField(act.id, 'actualSpent', editForm.actualSpent);
        setIsEditing(false);
    };

    const curSym = getCurrencySymbol(currency);
    const isFlight = act.type === 'flight';
    const isHotel = act.type.startsWith('hotel-');
    const isMeal = act.type === 'meal' || act.type === 'food';

    const renderHeader = () => {
        if (isFlight) {
            return (
                <div className="flex items-center gap-4 mb-6 bg-sky-50 dark:bg-sky-900/20 p-6 rounded-3xl border border-sky-100 dark:border-sky-800 shadow-sm">
                    <span className="text-3xl">✈️</span>
                    <div>
                        <p className="text-[10px] font-normal uppercase text-sky-600 dark:text-sky-400 tracking-[0.3em] mb-1">{act.meta?.airline || 'Airline'}</p>
                        <h4 className="text-xl font-bold text-stone-900 dark:text-white leading-tight">{act.meta?.departureAirport} ➔ {act.meta?.arrivalAirport}</h4>
                    </div>
                </div>
            );
        }
        if (isHotel) {
            const hColor = act.type === 'hotel-checkin' ? 'emerald' : 'rose';
            return (
                <div className={`flex items-center gap-4 mb-6 bg-${hColor}-50 dark:bg-${hColor}-900/20 p-6 rounded-3xl border border-${hColor}-100 dark:border-${hColor}-800 shadow-sm`}>
                    <span className="text-3xl">{act.type === 'hotel-checkin' ? '🏨' : '🗝️'}</span>
                    <div>
                        <p className={`text-[10px] font-normal uppercase text-${hColor}-600 dark:text-${hColor}-400 tracking-[0.3em] mb-1`}>{act.type.split('-')[1]}</p>
                        <h4 className="text-xl font-bold text-stone-900 dark:text-white leading-tight">{act.title}</h4>
                    </div>
                </div>
            );
        }
        return null;
    };

    const getCTA = () => {
        if (isMeal) return { text: "Book a Table", icon: "🍴" };
        if (isFlight) return null;
        if (isHotel) return null;
        return { text: act.meta?.ctaType || "Buy Tickets", icon: "🎟️" };
    };

    const cta = getCTA();

    return (
        <div className="group/item relative">
            <div className={`bg-white dark:bg-stone-900 rounded-[3.5rem] border border-stone-100 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] ${isEditing ? 'ring-4 ring-indigo-500/20 scale-[1.01]' : ''}`}>
                <div className="w-full md:w-5/12 relative overflow-hidden bg-stone-100 dark:bg-stone-800 min-h-[400px]">
                    {mainImage ? (
                      <img src={mainImage} alt={act.title} className="w-full h-full object-cover transition-transform duration-[3s] group-hover/item:scale-110" />
                    ) : (
                      <div className="w-full h-full shimmer" />
                    )}
                    <div className="absolute top-8 left-8 z-10">
                        <span className="px-6 py-2.5 rounded-full text-[10px] font-normal uppercase tracking-[0.3em] bg-white/95 dark:bg-stone-900/95 text-stone-900 dark:text-white border border-white/20 shadow-2xl backdrop-blur-md">
                            {act.type.replace('-', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex-1 p-12 flex flex-col justify-between relative">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex flex-wrap gap-4">
                                {isEditing ? (
                                    <input className="text-xs font-normal bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-100 px-5 py-2 rounded-xl outline-none w-28 shadow-inner" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} />
                                ) : (
                                    <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-5 py-2 rounded-xl uppercase tracking-[0.2em] shadow-sm">{act.time}</span>
                                )}
                                <span className="text-[11px] font-normal text-stone-300 dark:text-stone-600 uppercase tracking-[0.2em] mt-2">• {act.durationMinutes} minutes</span>
                            </div>
                            {canEdit && (
                                <div className="flex gap-2">
                                    <div className="flex flex-col gap-1">
                                      <button onClick={() => onMove(act.id, 'up')} className="w-8 h-8 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-lg hover:bg-stone-200 transition text-[10px]">▲</button>
                                      <button onClick={() => onMove(act.id, 'down')} className="w-8 h-8 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-lg hover:bg-stone-200 transition text-[10px]">▼</button>
                                    </div>
                                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-500 rounded-2xl hover:bg-stone-900 dark:hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90">
                                    {isEditing ? '✓' : '✎'}
                                    </button>
                                    <button onClick={() => onSwap(act)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90">
                                    {swappingId === act.id ? <div className="w-4 h-4 border-3 border-current border-t-transparent rounded-full animate-spin"></div> : '🔄'}
                                    </button>
                                    <button onClick={() => onDelete(act.id)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 dark:text-stone-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90">✕</button>
                                </div>
                            )}
                        </div>

                        {renderHeader()}

                        {isEditing ? (
                            <input className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white mb-6 w-full bg-transparent border-b-4 border-indigo-100 dark:border-indigo-900 outline-none pb-2 transition-all focus:border-indigo-500" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                        ) : (
                            !isFlight && !isHotel && <h3 className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white leading-tight mb-6 tracking-tight group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{act.title}</h3>
                        )}

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="px-5 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-colors">
                                {isEditing ? (
                                <div className="flex items-center">
                                    <span className="text-sm font-normal mr-2 text-stone-400">{curSym}</span>
                                    <input type="number" className="text-sm font-normal w-24 bg-transparent outline-none dark:text-white" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})} />
                                </div>
                                ) : (
                                <span className="text-sm font-normal text-stone-900 dark:text-white">{curSym}{act.cost?.toLocaleString() || '0'}</span>
                                )}
                                <span className="text-[10px] font-normal text-stone-400 uppercase tracking-widest">Est. Cost</span>
                            </div>
                            <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3 shadow-sm">
                                {isEditing ? (
                                <div className="flex items-center">
                                    <span className="text-sm font-normal mr-2 text-emerald-400">{curSym}</span>
                                    <input type="number" className="text-sm font-normal w-24 bg-transparent outline-none text-emerald-700 dark:text-emerald-400" value={editForm.actualSpent} onChange={e => setEditForm({...editForm, actualSpent: Number(e.target.value)})} />
                                </div>
                                ) : (
                                <span className="text-sm font-normal text-emerald-700 dark:text-emerald-400">{curSym}{act.actualSpent?.toLocaleString() || '0'}</span>
                                )}
                                <span className="text-[10px] font-normal text-emerald-400 uppercase tracking-widest">Spent</span>
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea className="text-stone-500 dark:text-stone-400 text-lg w-full h-32 bg-stone-50 dark:bg-stone-800 border-2 border-stone-100 dark:border-stone-700 rounded-3xl p-6 outline-none focus:border-indigo-400 transition-all font-normal" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                        ) : (
                            <p className="text-stone-500 dark:text-stone-400 text-lg leading-relaxed mb-10 font-normal">{act.description}</p>
                        )}

                        {isFlight && act.meta?.legs && <FlightVisual legs={act.meta.legs} />}
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="pt-8 border-t dark:border-stone-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-normal uppercase text-stone-300 dark:text-stone-600 tracking-[0.2em]">
                        <span className="truncate max-w-[200px] md:max-w-[300px] flex items-center gap-2">📍 {act.location || act.meta?.address}</span>
                        {act.phone && <a href={`tel:${act.phone}`} className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 transition font-normal">📞 {act.phone}</a>}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((act.title || '') + ' ' + destination)}`} target="_blank" className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white py-5 rounded-3xl font-normal text-[10px] uppercase text-center hover:bg-black dark:hover:bg-white transition shadow-2xl tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95">📍 Navigate</a>
                            {cta && (
                                <a href={act.website || '#'} target="_blank" className="bg-indigo-600 text-white py-5 rounded-3xl font-normal text-[10px] uppercase text-center hover:bg-indigo-700 transition shadow-2xl tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95">
                                    {cta.icon} {cta.text}
                                </a>
                            )}
                            {!cta && !isFlight && (
                                <button onClick={() => window.open(act.website || '#', '_blank')} className="bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 py-5 rounded-3xl font-normal text-[10px] uppercase text-center hover:bg-stone-100 dark:hover:bg-stone-700 transition tracking-[0.3em] shadow-sm border dark:border-stone-700 active:scale-95">🌐 Website</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <TransitVisual transit={act.transportToNext} />
        </div>
    );
};

export const TripDayCard: React.FC<TripDayCardProps> = ({ 
  day, destination, currency, onUpdateActivities, onUpdateDay, onActivityDrop, vibe, isPro, onGatedActionTrigger, onViewOnMap
}) => {
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivityPrompt, setNewActivityPrompt] = useState('');
  const [isAddingLoading, setIsAddingLoading] = useState(false);

  const canEdit = isPro || day.dayNumber === 1;

  const handleUpdate = (id: string, field: keyof DayActivity, value: any) => {
    onUpdateActivities(day.dayNumber, day.activities.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const deleteAct = (id: string) => {
    onUpdateActivities(day.dayNumber, day.activities.filter(a => a.id !== id));
  };

  const moveAct = (id: string, direction: 'up' | 'down') => {
    const idx = day.activities.findIndex(a => a.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= day.activities.length) return;
    
    const newActs = [...day.activities];
    const [removed] = newActs.splice(idx, 1);
    newActs.splice(newIdx, 0, removed);
    onUpdateActivities(day.dayNumber, newActs);
  };

  const swapAct = async (act: DayActivity) => {
    setSwappingId(act.id);
    try {
      const newAct = await regenerateSingleActivity(destination, vibe, act, currency);
      if (newAct && newAct.title) {
          // Replace entire activity object including coordinates for map sync
          onUpdateActivities(day.dayNumber, day.activities.map(a => a.id === act.id ? { ...newAct, id: act.id, time: act.time, actualSpent: 0 } : a));
      }
    } finally {
      setSwappingId(null);
    }
  };

  const handleAddStop = async () => {
    if (!newActivityPrompt.trim()) return;
    setIsAddingLoading(true);
    try {
      const newAct = await generateActivityFromPrompt(destination, newActivityPrompt, currency);
      if (newAct && newAct.title) {
        onUpdateActivities(day.dayNumber, [...day.activities, { ...newAct, id: Math.random().toString(36).substr(2, 9) }]);
        setNewActivityPrompt('');
        setIsAddingActivity(false);
      }
    } finally {
      setIsAddingLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn" onDragOver={e => e.preventDefault()} onDrop={e => {
        const id = e.dataTransfer.getData('activityId');
        const from = parseInt(e.dataTransfer.getData('fromDayNumber'));
        onActivityDrop(day.dayNumber, id, from, day.activities.length);
    }}>
      <div className="bg-white dark:bg-stone-900 rounded-[4rem] p-12 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-10 relative overflow-hidden group/header">
          <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 dark:bg-stone-800/20 rounded-full -mr-32 -mt-32 transition-transform duration-1000 group-hover/header:scale-150"></div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-8 mb-6">
                <span className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 w-20 h-20 rounded-3xl flex items-center justify-center font-normal text-4xl shadow-2xl rotate-3 group-hover/header:rotate-0 transition-transform duration-500">{day.dayNumber}</span>
                <div>
                   <h3 className="text-4xl font-bold text-stone-900 dark:text-white tracking-tight leading-none mb-2">{day.theme}</h3>
                   <div className="h-1.5 w-24 bg-indigo-500 rounded-full"></div>
                </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-800/40 p-8 rounded-[2.5rem] border border-stone-100 dark:border-stone-700 shadow-inner">
               <p className="text-stone-600 dark:text-stone-300 font-normal text-xl leading-relaxed italic">"{day.summary}"</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            {onViewOnMap && <button onClick={onViewOnMap} className="px-10 py-5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-100 dark:hover:bg-sky-900/50 transition shadow-xl active:scale-95">Route 🗺️</button>}
            <button onClick={async () => { const newDay = await regenerateDayPlan(destination, vibe, day.dayNumber, currency); onUpdateDay(day.dayNumber, newDay); }} className="px-10 py-5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-8 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-white transition shadow-xl active:scale-95">Refresh 🔄</button>
          </div>
      </div>

      <div className="space-y-0 relative pl-10 md:pl-0">
        <div className="absolute left-4 top-0 bottom-0 w-1.5 bg-stone-100 dark:bg-stone-800 rounded-full md:hidden"></div>
        {day.activities.map((act, idx) => (
          <div key={act.id} draggable={canEdit} onDragStart={e => { e.dataTransfer.setData('activityId', act.id); e.dataTransfer.setData('fromDayNumber', day.dayNumber.toString()); }}>
            <ItineraryItem act={act} canEdit={canEdit} destination={destination} currency={currency} onUpdateField={handleUpdate} onSwap={swapAct} onDelete={deleteAct} onMove={moveAct} swappingId={swappingId} />
          </div>
        ))}

        {/* Add Stop Feature */}
        {canEdit && (
          <div className="mt-8 mb-20 px-4">
            {isAddingActivity ? (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 animate-slideUp">
                <h4 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 mb-4">Add a Custom Stop</h4>
                <textarea 
                  value={newActivityPrompt}
                  onChange={(e) => setNewActivityPrompt(e.target.value)}
                  placeholder="e.g. Visit the local aquarium, dine at a specific Italian restaurant, or just 'Sunset walk at the beach'..."
                  className="w-full p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-white mb-4 h-24 outline-none focus:border-indigo-400"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsAddingActivity(false)} className="px-6 py-2 text-indigo-400 font-bold hover:text-indigo-600 transition">Cancel</button>
                  <button 
                    onClick={handleAddStop}
                    disabled={isAddingLoading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg flex items-center gap-2"
                  >
                    {isAddingLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '✨ Add to Itinerary'}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingActivity(true)}
                className="w-full py-8 border-4 border-dashed border-stone-100 dark:border-stone-800 rounded-[2.5rem] text-stone-300 dark:text-stone-700 font-bold uppercase tracking-[0.3em] hover:border-indigo-200 hover:text-indigo-400 transition-all flex items-center justify-center gap-4"
              >
                <span className="text-3xl">+</span> Add Activity or Restaurant Stop
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
