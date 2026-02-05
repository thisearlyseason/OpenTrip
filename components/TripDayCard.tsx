import React, { useState, useEffect } from 'react';
import { TripDay, DayActivity, ActivityType } from '../types';
import { getAlternativeActivities, regenerateDayPlan } from '../services/gemini';

interface TripDayCardProps {
  day: TripDay;
  destination: string;
  onUpdateActivities: (dayNumber: number, newActivities: DayActivity[]) => void;
  onUpdateDay: (dayNumber: number, newDay: TripDay) => void;
  onActivityDrop: (dayNumber: number, activityId: string, fromDayNumber: number, newIndex: number) => void;
  dietary?: string[];
  vibe: string;
  isPro: boolean;
  transportModes?: string[];
  onGatedActionTrigger: (featureId: string) => void;
}

const TYPE_COLORS: Record<ActivityType, string> = {
  sightseeing: "bg-sky-50 text-sky-900 border-sky-200",
  food: "bg-orange-50 text-orange-900 border-orange-200",
  nature: "bg-emerald-50 text-emerald-900 border-emerald-200",
  relax: "bg-teal-50 text-teal-900 border-teal-200",
  culture: "bg-rose-50 text-rose-900 border-rose-200",
  shopping: "bg-violet-50 text-violet-900 border-violet-200",
  transport: "bg-stone-100 text-stone-700 border-stone-200",
  other: "bg-stone-50 text-stone-800 border-stone-200",
  arrival: "bg-indigo-50 text-indigo-900 border-indigo-200",
  departure: "bg-amber-50 text-amber-900 border-amber-200",
};

const ActivityImage = ({ activity, destination }: { activity: DayActivity; destination: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    // Prioritize the specific imageUrl prompt from the AI for better images.
    const query = activity.imageUrl || `${destination},${activity.title}`;
    const stockPhotoUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(query)}`;
    setImageUrl(stockPhotoUrl);
  }, [activity.id, destination, activity.title, activity.imageUrl]);

  return (
    <div className="w-full h-full bg-stone-100 overflow-hidden">
        {imageUrl ? <img src={imageUrl} alt={activity.title} className="w-full h-full object-cover" /> : <div className="w-full h-full animate-pulse bg-stone-200" />}
    </div>
  );
};

export const TripDayCard: React.FC<TripDayCardProps> = ({ 
  day, 
  destination, 
  onUpdateActivities, 
  onUpdateDay,
  onActivityDrop, 
  dietary = [],
  vibe,
  isPro,
  transportModes = [],
  onGatedActionTrigger
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<DayActivity[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const canEdit = day.dayNumber === 1 || isPro;

  const handleSwapClick = async (activity: DayActivity) => {
    if (!canEdit) {
      onGatedActionTrigger(`day-${day.dayNumber}`);
      return;
    }
    setSwappingId(activity.id);
    setLoadingAlts(true);
    const alts = await getAlternativeActivities(destination, activity, dietary);
    setAlternatives(alts);
    setLoadingAlts(false);
    setMenuOpenId(null);
  };

  const handleApplySwap = (oldId: string, newActivity: DayActivity) => {
    const updated = day.activities.map(a => a.id === oldId ? { ...newActivity, time: a.time, id: Math.random().toString(36).substr(2, 9) } : a);
    onUpdateActivities(day.dayNumber, updated);
    setSwappingId(null);
  };

  const handleRegenerateDay = async () => {
    if (!canEdit) {
      onGatedActionTrigger(`day-${day.dayNumber}`);
      return;
    }
    setIsRegenerating(true);
    const newDay = await regenerateDayPlan(destination, vibe, day.dayNumber, day);
    onUpdateDay(day.dayNumber, newDay);
    setIsRegenerating(false);
  };

  const handleTimeChange = (activityId: string, newTime: string) => {
    if (!canEdit) {
      onGatedActionTrigger(`day-${day.dayNumber}`);
      return;
    }
    const updated = day.activities.map(a => a.id === activityId ? { ...a, time: newTime } : a);
    onUpdateActivities(day.dayNumber, updated);
  };

  const handleCostChange = (activityId: string, newCost: string) => {
    if (!canEdit) {
      onGatedActionTrigger(`day-${day.dayNumber}`);
      return;
    }
    const updatedActivities = day.activities.map(a =>
      a.id === activityId ? { ...a, costEstimate: newCost } : a
    );
    onUpdateActivities(day.dayNumber, updatedActivities);
  };

  return (
    <div className={`bg-white rounded-[2rem] shadow-xl border overflow-hidden mb-8 transition-opacity ${!canEdit ? 'opacity-80' : 'opacity-100'}`}>
      <div className="h-64 bg-stone-900 flex flex-col justify-end p-8 text-white relative">
          <div className="absolute top-8 right-8">
            <button 
              onClick={handleRegenerateDay}
              disabled={isRegenerating}
              className={`bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${isRegenerating ? 'animate-pulse' : ''}`}
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate this day'}
            </button>
          </div>
          <h3 className="text-4xl font-extrabold text-white mb-1">Day {day.dayNumber}</h3>
          <p className="text-white/80 font-bold uppercase tracking-widest text-sm">{day.theme}</p>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 border-y border-amber-200 p-3 text-center">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Multi-Day Editing is gated. Upgrade to Pro to customize Day {day.dayNumber}.</p>
        </div>
      )}

      <div className="p-8 space-y-8">
        {day.activities.map((activity, idx) => (
          <div key={activity.id} draggable={canEdit} 
               onDragStart={(e) => { 
                  if (canEdit) {
                    e.dataTransfer.setData('activityId', activity.id); 
                    e.dataTransfer.setData('fromDayNumber', day.dayNumber.toString()); 
                  }
               }}
               onDragOver={(e) => e.preventDefault()}
               onDrop={(e) => {
                  e.preventDefault();
                  const fromDay = parseInt(e.dataTransfer.getData('fromDayNumber'));
                  const actId = e.dataTransfer.getData('activityId');
                  onActivityDrop(day.dayNumber, actId, fromDay, idx);
               }}
          >
            <div className={`relative flex flex-col lg:flex-row gap-6 p-6 rounded-3xl border transition shadow-sm ${TYPE_COLORS[activity.type]}`}>
               <div className="lg:w-32 flex-shrink-0 font-black tracking-tighter text-stone-800 text-lg">
                  <input 
                    type="text" 
                    value={activity.time} 
                    onChange={(e) => handleTimeChange(activity.id, e.target.value)}
                    className="bg-transparent border-none outline-none focus:ring-0 w-full disabled:cursor-not-allowed"
                    disabled={!canEdit}
                    onFocus={() => { if (!canEdit) onGatedActionTrigger(`day-${day.dayNumber}`); }}
                  />
               </div>
               <div className="w-full lg:w-40 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-inner">
                   <ActivityImage activity={activity} destination={destination} />
               </div>
               <div className="flex-1 relative">
                  <div className="flex items-center gap-2 mb-1">
                    {activity.type === 'arrival' && <span className="text-xl">🛬</span>}
                    {activity.type === 'departure' && <span className="text-xl">🛫</span>}
                    <h4 className="font-bold text-xl text-stone-900">{activity.title}</h4>
                  </div>
                  <p className="text-sm opacity-80 leading-relaxed mt-2">{activity.description}</p>
                  
                  {activity.externalLink && (
                    <a href={activity.externalLink} target="_blank" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold shadow-lg">Purchase Tickets</a>
                  )}

                  <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-bold text-stone-500 uppercase items-center">
                    <span>📍 {activity.address}</span>
                    {activity.rating && <span>⭐ {activity.rating}</span>}
                    {transportModes.length > 0 && activity.transportToNext && (
                      <>
                        <span className="bg-stone-200/50 px-2 py-1 rounded-md flex items-center gap-1">
                            {activity.transportToNext.mode?.toLowerCase().includes('walk') ? '🚶' : '🚍'} 
                            <span>{activity.transportToNext.mode || transportModes[0]} {activity.transportToNext.duration && `(${activity.transportToNext.duration})`}</span>
                        </span>
                        {activity.transportToNext.distance && (
                            <span className="bg-stone-200/50 px-2 py-1 rounded-md flex items-center gap-1">
                            <span>📏</span>
                            <span>{activity.transportToNext.distance}</span>
                            </span>
                        )}
                        {activity.transportToNext.website && (
                            <a href={activity.transportToNext.website} target="_blank" rel="noopener noreferrer" className="bg-sky-100 text-sky-800 px-2 py-1 rounded-md hover:bg-sky-200 transition-colors">
                            Transit Info
                            </a>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-1 bg-stone-200/50 px-2 py-1 rounded-md">
                      <span>💰</span>
                      <input
                        type="text"
                        value={activity.costEstimate || ''}
                        onChange={(e) => handleCostChange(activity.id, e.target.value)}
                        placeholder="Cost"
                        className="bg-transparent text-stone-500 font-bold w-16 outline-none p-0 m-0 border-none text-left disabled:cursor-not-allowed"
                        disabled={!canEdit}
                        onFocus={() => { if (!canEdit) onGatedActionTrigger(`day-${day.dayNumber}`); }}
                      />
                    </div>
                  </div>

                  <div className="absolute top-0 right-0">
                      <button onClick={() => {
                        if (canEdit) setMenuOpenId(menuOpenId === activity.id ? null : activity.id);
                        else onGatedActionTrigger(`day-${day.dayNumber}`);
                      }} className="p-2 text-stone-400 hover:text-stone-900 transition">
                        {canEdit ? '•••' : '🔒'}
                      </button>
                      {menuOpenId === activity.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden animate-slideDown">
                              <button onClick={() => handleSwapClick(activity)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-stone-50 transition">🔄 Change Activity</button>
                              <button onClick={() => onUpdateActivities(day.dayNumber, day.activities.filter(a => a.id !== activity.id))} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition">🗑️ Delete</button>
                          </div>
                      )}
                  </div>
               </div>
            </div>
            {swappingId === activity.id && (
                <div className="mt-4 p-6 bg-white rounded-3xl border-2 border-dashed border-sky-300 animate-slideDown">
                   {loadingAlts ? <p className="text-center font-bold text-sm animate-pulse">Finding new adventures...</p> : (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           {alternatives.map((alt, ai) => (
                               <div key={ai} className="p-4 bg-stone-50 rounded-2xl border cursor-pointer hover:border-sky-300 transition group" onClick={() => handleApplySwap(activity.id, alt)}>
                                   <h6 className="font-bold text-sm mb-1 group-hover:text-sky-600 transition">{alt.title}</h6>
                                   <p className="text-[10px] text-stone-500 line-clamp-2">{alt.description}</p>
                               </div>
                           ))}
                       </div>
                   )}
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};