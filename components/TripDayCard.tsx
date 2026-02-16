import React, { useState, useEffect, useRef } from 'react';
import { TripDay, DayActivity, ActivityType, FlightLeg } from '../types';
import { regenerateDayPlan, regenerateSingleActivity, generateImage, generateActivityFromPrompt } from '../services/gemini';

declare var google: any;
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

const TransitVisual: React.FC<{ transit?: DayActivity['transportToNext'] }> = ({ transit }) => {
  if (!transit || !transit.mode) return null;
  return (
    <div className="py-8 flex flex-col items-center gap-2 relative">
       <div className="w-0.5 h-10 border-l-2 border-dashed border-stone-200 dark:border-stone-800"></div>
       <div className="flex items-center gap-3 px-6 py-2 bg-stone-50 dark:bg-stone-800 rounded-full border border-stone-100 dark:border-stone-700 shadow-xl">
          <span className="text-xl">
            {transit.mode.toLowerCase().includes('walk') ? '🚶' : transit.mode.toLowerCase().includes('taxi') || transit.mode.toLowerCase().includes('uber') ? '🚕' : '🚌'}
          </span>
          <span className="text-[10px] font-normal uppercase tracking-[0.3em] text-stone-400 dark:text-stone-500">
            {transit.mode} • {transit.duration || '20m'} {transit.cost && `• ${transit.cost}`}
          </span>
       </div>
       <div className="w-0.5 h-10 border-l-2 border-dashed border-stone-200 dark:border-stone-800"></div>
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
      if (act.imageUrl) { setMainImage(act.imageUrl); return; }
      const cached = imageCache.get(act.id);
      if (cached) { setMainImage(cached); } else {
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
    return (
        <div className="group/item relative">
            <div className={`bg-white dark:bg-stone-900 rounded-[2.5rem] sm:rounded-[3.5rem] border border-stone-100 dark:border-stone-800 shadow-xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 hover:shadow-2xl ${isEditing ? 'ring-4 ring-indigo-500/20 scale-[1.01]' : ''}`}>
                <div className="w-full md:w-5/12 relative overflow-hidden bg-stone-100 dark:bg-stone-800 min-h-[250px] sm:min-h-[400px]">
                    {mainImage ? <img src={mainImage} alt={act.title} className="w-full h-full object-cover transition-transform duration-[3s] group-hover/item:scale-110" /> : <div className="w-full h-full shimmer" />}
                    <div className="absolute bottom-3 left-3 right-3 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 z-20">
                      <p className="text-[9px] sm:text-[10px] text-white font-normal leading-tight">Photos may not accurately represent location. Please view official website.</p>
                    </div>
                    <div className="absolute top-6 left-6 z-10">
                        <span className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-white/95 dark:bg-stone-900/95 text-stone-900 dark:text-white border border-white/20 shadow-2xl backdrop-blur-md">{act.type.replace('-', ' ')}</span>
                    </div>
                </div>
                <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between relative">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-wrap gap-3">
                                {isEditing ? <input className="text-xs font-black bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg outline-none w-24 shadow-inner" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} /> : <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl uppercase tracking-widest shadow-sm">{act.time}</span>}
                            </div>
                            {canEdit && (
                                <div className="flex gap-2">
                                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-2xl hover:bg-stone-900 dark:hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 text-xl">{isEditing ? '✓' : '✎'}</button>
                                    <button onClick={() => onSwap(act)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90 text-xl">🔄</button>
                                    <button onClick={() => onDelete(act.id)} className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90 text-xl">✕</button>
                                </div>
                            )}
                        </div>
                        {isEditing ? <input className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white mb-6 w-full bg-transparent border-b-4 border-indigo-100 outline-none pb-2" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /> : <h3 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white leading-tight mb-6 tracking-tight group-hover/item:text-indigo-600 transition-colors">{act.title}</h3>}
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="px-6 py-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border dark:border-stone-700 flex items-center gap-3">
                                <span className="text-xl font-black text-stone-900 dark:text-white">{curSym}{act.cost?.toLocaleString() || '0'}</span>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Est. Cost</span>
                            </div>
                            {act.actualSpent && act.actualSpent > 0 ? (
                                <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-300">{curSym}{act.actualSpent.toLocaleString()}</span>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Actual Spent</span>
                                </div>
                            ) : null}
                        </div>
                        {isEditing ? <textarea className="text-stone-500 text-lg w-full h-32 bg-stone-50 dark:bg-stone-800 border-2 dark:border-stone-700 rounded-3xl p-6 outline-none focus:border-indigo-400 font-normal" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} /> : <p className="text-stone-500 text-lg leading-relaxed mb-10 font-normal italic">"{act.description}"</p>}
                    </div>
                    <div className="space-y-6 relative z-10 pt-8 border-t dark:border-stone-800">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-stone-400 tracking-widest">
                          <span className="truncate max-w-[300px]">📍 {act.meta?.address || act.location || 'Location Not Set'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((act.title || '') + ' ' + (act.meta?.address || destination))}`} target="_blank" className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white py-5 rounded-3xl font-black text-xs uppercase text-center hover:scale-105 active:scale-95 transition-all shadow-xl tracking-widest">Navigate</a>
                            <button onClick={() => window.open(act.website || '#', '_blank')} className="bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 py-5 rounded-3xl font-black text-xs uppercase text-center border dark:border-stone-700 hover:bg-stone-100 active:scale-95 transition-all tracking-widest">Website</button>
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
  const [addMode, setAddMode] = useState<'none' | 'ai' | 'manual'>('none');
  const [newActivityPrompt, setNewActivityPrompt] = useState('');
  const [isAddingLoading, setIsAddingLoading] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [manualForm, setManualForm] = useState<any>({ title: '', description: '', time: '12:00', durationMinutes: 60, type: 'sightseeing', cost: 0, address: '', transitMode: 'Walking', transitDuration: 15, transitCost: '0' });

  useEffect(() => {
    if (addMode === 'manual' && addressInputRef.current && (window as any).google) {
      const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        setManualForm(prev => ({ ...prev, address: place.formatted_address || '', title: prev.title || place.name || '' }));
      });
    }
  }, [addMode]);

  const handleUpdate = (id: string, field: keyof DayActivity, value: any) => {
    onUpdateActivities(day.dayNumber, day.activities.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleAddStopAI = async () => {
    if (!newActivityPrompt.trim()) return;
    setIsAddingLoading(true);
    try {
      const newActs = await generateActivityFromPrompt(newActivityPrompt, destination, vibe, currency);
      if (newActs && newActs.length > 0) {
        onUpdateActivities(day.dayNumber, [...day.activities, ...newActs.map(a => ({ ...a, id: Math.random().toString(36).substr(2, 9), actualSpent: 0 }))]);
        setNewActivityPrompt('');
        setAddMode('none');
      }
    } finally { setIsAddingLoading(false); }
  };

  const handleAddStopManual = () => {
    if (!manualForm.title) return;
    const newAct: DayActivity = { id: Math.random().toString(36).substr(2, 9), title: manualForm.title, description: manualForm.description || '', time: manualForm.time || '12:00', durationMinutes: manualForm.durationMinutes || 60, type: manualForm.type || 'sightseeing', cost: manualForm.cost || 0, actualSpent: 0, location: destination, meta: { address: manualForm.address }, transportToNext: { mode: manualForm.transitMode, duration: `${manualForm.transitDuration}m`, cost: manualForm.transitCost ? `${getCurrencySymbol(currency)}${manualForm.transitCost}` : undefined } };
    onUpdateActivities(day.dayNumber, [...day.activities, newAct]);
    setManualForm({ title: '', description: '', time: '12:00', durationMinutes: 60, type: 'sightseeing', cost: 0, address: '', transitMode: 'Walking', transitDuration: 15, transitCost: '0' });
    setAddMode('none');
  };

  return (
    <div className="space-y-12 animate-fadeIn" onDragOver={e => e.preventDefault()} onDrop={e => {
        const id = e.dataTransfer.getData('activityId');
        const from = parseInt(e.dataTransfer.getData('fromDayNumber'));
        onActivityDrop(day.dayNumber, id, from, day.activities.length);
    }}>
      <div className="bg-white dark:bg-stone-900 rounded-[4rem] p-12 border dark:border-stone-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-10 relative overflow-hidden group/header">
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-8 mb-6">
                <span className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 w-20 h-20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl rotate-3 group-hover/header:rotate-0 transition-transform duration-500">{day.dayNumber}</span>
                <div>
                   <h3 className="text-3xl sm:text-5xl font-black text-stone-900 dark:text-white tracking-tighter leading-none mb-3">{day.theme}</h3>
                   <div className="h-2 w-32 bg-indigo-500 rounded-full"></div>
                </div>
            </div>
            <div className="bg-stone-50 dark:bg-stone-800/40 p-10 rounded-[3rem] border dark:border-stone-700 shadow-inner">
               <p className="text-xl sm:text-3xl text-stone-600 dark:text-stone-300 font-bold italic leading-relaxed">"{day.summary}"</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 z-10">
            <button onClick={onViewOnMap} className="px-10 py-5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-sky-100 transition shadow-xl">Route 🗺️</button>
            <button onClick={() => regenerateDayPlan(destination, vibe, day.dayNumber, currency).then(newDay => onUpdateDay(day.dayNumber, newDay))} className="px-10 py-5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black dark:hover:bg-white transition shadow-xl">Refresh 🔄</button>
          </div>
      </div>

      <div className="space-y-0 relative pl-4 md:pl-0">
        <div className="absolute left-3 top-0 bottom-0 w-2 bg-stone-100 dark:bg-stone-800 rounded-full md:hidden"></div>
        {day.activities.map((act) => (
          <div key={act.id} draggable onDragStart={e => { e.dataTransfer.setData('activityId', act.id); e.dataTransfer.setData('fromDayNumber', day.dayNumber.toString()); }}>
            <ItineraryItem act={act} canEdit destination={destination} currency={currency} onUpdateField={handleUpdate} onSwap={async (a) => {
              if (!isPro && day.dayNumber !== 1) { onGatedActionTrigger('locked-swap'); return; }
              const newAct = await regenerateSingleActivity(a, destination, vibe);
              if (newAct) handleUpdate(a.id, 'title', newAct.title);
            }} onDelete={(id) => onUpdateActivities(day.dayNumber, day.activities.filter(a => a.id !== id))} onMove={() => {}} swappingId={null} />
          </div>
        ))}

        <div className="mt-12 mb-20 px-4">
          {addMode === 'none' && (
            <div className="flex flex-col md:flex-row gap-6">
              <button onClick={() => setAddMode('ai')} className="flex-1 py-12 border-4 border-dashed border-indigo-100 dark:border-indigo-900/50 rounded-[3rem] text-indigo-400 font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-4 group">
                <span className="text-5xl group-hover:scale-125 transition-transform">✨</span>
                <span className="text-lg">AI Magic Stop</span>
              </button>
              <button onClick={() => setAddMode('manual')} className="flex-1 py-12 border-4 border-dashed border-stone-100 dark:border-stone-800 rounded-[3rem] text-stone-300 font-black uppercase tracking-widest hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-4 group">
                <span className="text-5xl group-hover:scale-125 transition-transform">✍️</span>
                <span className="text-lg">Manual Entry</span>
              </button>
            </div>
          )}
          {addMode === 'manual' && (
            <div className="bg-white dark:bg-stone-900 p-12 rounded-[3rem] border dark:border-stone-800 shadow-2xl animate-slideUp">
              <div className="flex justify-between items-center mb-10"><h4 className="text-3xl font-black">New Stop ✍️</h4><button onClick={() => setAddMode('none')} className="text-stone-400 font-black text-sm uppercase tracking-widest">Cancel</button></div>
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div><label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Stop Title</label><input value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} className="w-full p-5 bg-stone-50 dark:bg-stone-800 rounded-2xl outline-none border focus:ring-4 ring-indigo-500/10" placeholder="e.g. Secret Lookout Point" /></div>
                    <div><label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block">Full Address</label><input ref={addressInputRef} value={manualForm.address} onChange={e => setManualForm({...manualForm, address: e.target.value})} className="w-full p-5 bg-stone-50 dark:bg-stone-800 rounded-2xl outline-none border focus:ring-4 ring-indigo-500/10" placeholder="Search address..." /></div>
                 </div>
                 <button onClick={handleAddStopManual} className="w-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Add to Trip Itinerary</button>
              </div>
            </div>
          )}
          {addMode === 'ai' && (
            <div className="bg-white dark:bg-stone-900 p-12 rounded-[3rem] border dark:border-stone-800 shadow-2xl animate-slideUp">
              <div className="flex justify-between items-center mb-10"><h4 className="text-3xl font-black">AI Stop Finder ✨</h4><button onClick={() => setAddMode('none')} className="text-stone-400 font-black text-sm uppercase tracking-widest">Cancel</button></div>
              <div className="space-y-8">
                 <textarea value={newActivityPrompt} onChange={e => setNewActivityPrompt(e.target.value)} className="w-full p-6 bg-stone-50 dark:bg-stone-800 rounded-[2rem] outline-none border focus:ring-4 ring-indigo-500/10 h-40 text-lg" placeholder="Describe the vibe (e.g. A hidden rooftop bar with jazz music)..." />
                 <button onClick={handleAddStopAI} disabled={isAddingLoading} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">{isAddingLoading ? 'Generating...' : 'Generate Magic Stop ✨'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};