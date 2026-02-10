
import React, { useState, useEffect } from 'react';
import { TripDay, DayActivity, ActivityType } from '../types';
import { regenerateDayPlan, regenerateSingleActivity, generateImage } from '../services/gemini';

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

const TYPE_BADGE_COLORS: Record<ActivityType, string> = {
  sightseeing: "bg-sky-100 text-sky-700",
  food: "bg-orange-100 text-orange-700",
  nature: "bg-emerald-100 text-emerald-700",
  relax: "bg-teal-100 text-teal-700",
  culture: "bg-rose-100 text-rose-700",
  shopping: "bg-violet-100 text-violet-700",
  transport: "bg-stone-100 text-stone-700",
  other: "bg-stone-100 text-stone-700",
  arrival: "bg-indigo-100 text-indigo-700",
  departure: "bg-amber-100 text-amber-700",
};

// Category-based high-quality fallbacks
const TYPE_FALLBACKS: Record<string, string> = {
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
  sightseeing: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
  nature: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  culture: "https://images.unsplash.com/photo-1518998053574-53f1f61f9b86?auto=format&fit=crop&w=800&q=80",
  default: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
};

const TransportCard: React.FC<{ transport: any }> = ({ transport }) => {
  if (!transport || (!transport.mode && !transport.duration)) return null;
  return (
    <div className="flex justify-center my-4 animate-fadeIn">
      <div className="bg-stone-100/50 border border-stone-200 px-6 py-2.5 rounded-full flex items-center gap-6 shadow-sm">
         <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{transport.mode || 'Travel'}</span>
         </div>
         {transport.duration && (
            <div className="flex items-center gap-2 border-l border-stone-300 pl-6">
              <span className="text-lg">🕒</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{transport.duration}</span>
            </div>
         )}
         {transport.cost && transport.cost !== 'Free' && (
            <div className="flex items-center gap-2 border-l border-stone-300 pl-6">
              <span className="text-lg">💰</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{transport.cost}</span>
            </div>
         )}
      </div>
    </div>
  );
};

const ActivityRichCard: React.FC<{ 
    act: DayActivity; 
    canEdit: boolean; 
    idx: number; 
    destination: string;
    dayNumber: number;
    onUpdateField: (id: string, field: keyof DayActivity, val: any) => void;
    onSwap: (act: DayActivity) => void;
    onDelete: (id: string) => void;
    swappingId: string | null;
}> = ({ act, canEdit, idx, destination, dayNumber, onUpdateField, onSwap, onDelete, swappingId }) => {
    const [mainImage, setMainImage] = useState<string>('');
    const [loadingImage, setLoadingImage] = useState(false);
    const [isEditingDuration, setIsEditingDuration] = useState(false);
    const [imageErrorCount, setImageErrorCount] = useState(0);

    useEffect(() => {
      setImageErrorCount(0);
      // If AI provided a blank URL (as instructed in gemini.ts) or an obviously invalid one, generate a high-quality one.
      if (!act.imageUrl || act.imageUrl.length < 5 || act.imageUrl.includes('null') || act.imageUrl.includes('example.com')) {
          triggerImageGeneration();
      } else {
          setMainImage(act.imageUrl);
      }
    }, [act.id, act.imageUrl]);

    const triggerImageGeneration = () => {
        setLoadingImage(true);
        const prompt = act.imagePrompt || `Professional travel photograph of ${act.title} at ${act.location || destination}. Realistic, cinematic style.`;
        generateImage(prompt, '4:3')
            .then(url => {
                setMainImage(url);
                setLoadingImage(false);
            })
            .catch(() => {
                // Typed Fallback System
                const fallback = TYPE_FALLBACKS[act.type] || TYPE_FALLBACKS.default;
                setMainImage(fallback);
                setLoadingImage(false);
            });
    };

    const handleImageError = () => {
        console.warn(`Image failed for ${act.title}, attempting regeneration...`);
        if (imageErrorCount >= 1) {
             setMainImage(TYPE_FALLBACKS[act.type] || TYPE_FALLBACKS.default);
             return; 
        }
        setImageErrorCount(prev => prev + 1);
        triggerImageGeneration();
    };

    const isTicketed = (
      act.statusLabel?.toLowerCase().includes('ticket') || 
      act.statusLabel?.toLowerCase().includes('book') || 
      act.statusLabel?.toLowerCase().includes('reserv')
    );
    const isFood = act.type === 'food';
    const showBookButton = isTicketed || (isFood && act.priceLevel && act.priceLevel.length > 1);

    const handleDragStart = (e: React.DragEvent) => {
      if (!canEdit) return;
      e.dataTransfer.setData('activityId', act.id);
      e.dataTransfer.setData('fromDayNumber', dayNumber.toString());
      e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div 
          draggable={canEdit}
          onDragStart={handleDragStart}
          className={`bg-white rounded-[2.5rem] border border-stone-100 shadow-xl overflow-hidden animate-fadeIn group/card flex flex-col md:flex-row min-h-[400px] transition-transform ${canEdit ? 'cursor-grab active:cursor-grabbing hover:border-indigo-200' : ''}`}
        >
            <div className="w-full md:w-2/5 relative overflow-hidden bg-stone-100 group/visual min-h-[250px] md:min-h-full">
                {loadingImage ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-50 shimmer">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-[8px] font-black uppercase text-stone-400 tracking-widest">Generating Photo...</span>
                  </div>
                ) : (
                  <img 
                    src={mainImage} 
                    alt={act.title} 
                    onError={handleImageError}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover/visual:scale-110 transition-transform duration-700" 
                  />
                )}
                
                <div className="absolute top-6 left-6 z-10">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md border border-white/20 ${TYPE_BADGE_COLORS[act.type] || 'bg-white text-stone-900'}`}>
                      {act.type}
                   </span>
                </div>

                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl flex items-center justify-between border border-white/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                           <span className="text-sm font-black">{act.rating || '4.5'}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none mb-1">TripAdvisor Rating</p>
                          <div className="flex gap-0.5">
                             {[1,2,3,4,5].map(star => (
                               <span key={star} className={`text-[10px] ${star <= (act.rating || 4) ? 'text-emerald-500' : 'text-stone-300'}`}>●</span>
                             ))}
                          </div>
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase">{act.reviewCount || '800+ reviews'}</span>
                </div>
            </div>

            <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">{act.time}</span>
                           <div className="flex items-center gap-1 group/dur">
                             <span 
                               onClick={() => canEdit && setIsEditingDuration(true)}
                               className={`text-[10px] font-bold text-stone-400 uppercase tracking-widest cursor-pointer hover:text-stone-900 transition ${isEditingDuration ? 'hidden' : 'block'}`}
                             >
                               • {act.durationMinutes} mins
                             </span>
                             {isEditingDuration && (
                               <div className="flex items-center gap-2">
                                 <input 
                                   autoFocus
                                   type="number"
                                   value={act.durationMinutes}
                                   onChange={(e) => onUpdateField(act.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                                   onBlur={() => setIsEditingDuration(false)}
                                   onKeyDown={(e) => e.key === 'Enter' && setIsEditingDuration(false)}
                                   className="w-16 p-1 border rounded text-[10px] font-bold text-stone-600 outline-none focus:border-indigo-400"
                                 />
                                 <span className="text-[9px] text-stone-400 font-bold uppercase">mins</span>
                               </div>
                             )}
                           </div>
                        </div>
                        {canEdit && (
                            <div className="flex gap-2">
                                <button 
                                  onClick={() => onSwap(act)} 
                                  title="Find Alternative"
                                  className="p-2.5 bg-stone-50 hover:bg-stone-900 hover:text-white rounded-xl text-stone-400 transition-all shadow-sm"
                                >
                                  {swappingId === act.id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : '🔄'}
                                </button>
                                <button 
                                  onClick={() => onDelete(act.id)} 
                                  title="Remove"
                                  className="p-2.5 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl text-rose-400 transition-all shadow-sm"
                                >
                                  ✕
                                </button>
                            </div>
                        )}
                    </div>

                    <h3 className="text-3xl font-black text-stone-900 tracking-tight mb-4 group-hover/card:text-indigo-600 transition-colors">
                      {act.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        {act.priceLevel && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg border border-stone-200 shadow-sm">
                             <span className="text-xs font-black text-stone-900 tracking-widest">{act.priceLevel}</span>
                             <span className="text-[9px] font-bold text-stone-400 uppercase">Est. Budget</span>
                          </div>
                        )}
                        {act.statusLabel && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 rounded-lg">
                             <span className="text-xs font-black text-sky-600 uppercase tracking-widest">{act.statusLabel}</span>
                          </div>
                        )}
                    </div>

                    <p className="text-stone-600 text-sm leading-relaxed font-medium mb-8">
                        {act.description}
                    </p>
                </div>

                <div className="space-y-4 pt-6 border-t border-stone-100">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-stone-400">
                       <span className="truncate max-w-[200px]">{act.location || 'Explore Location'}</span>
                       {act.contact && <span className="text-stone-900">{act.contact}</span>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {act.website ? (
                          <a 
                            href={act.website} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-stone-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition shadow-xl"
                          >
                            {showBookButton ? (isFood ? '🍽️ Reserve Table' : '🎟️ Book Tickets') : '🌐 Visit Website'} ↗
                          </a>
                        ) : showBookButton ? (
                           <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(act.title + ' ' + destination + (isFood ? ' reservation' : ' tickets'))}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-stone-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition shadow-xl"
                          >
                            {isFood ? '🍽️ Reserve Table' : '🎟️ Book Tickets'} ↗
                          </a>
                        ) : null}
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.title + ' ' + destination)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-stone-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-stone-200 hover:bg-stone-500 transition shadow-sm"
                        >
                            📍 View on Map
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TripDayCard: React.FC<TripDayCardProps> = ({ 
  day, 
  destination, 
  onUpdateActivities, 
  onUpdateDay, 
  onActivityDrop, 
  vibe, 
  isPro, 
  onGatedActionTrigger 
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const canEdit = isPro || day.dayNumber === 1;

  const handleUpdateActivityField = (id: string, field: keyof DayActivity, value: any) => {
    if (!canEdit) {
      onGatedActionTrigger(`locked-day-${day.dayNumber}`);
      return;
    }
    const newActivities = day.activities.map(a => a.id === id ? { ...a, [field]: value } : a);
    onUpdateActivities(day.dayNumber, newActivities);
  };

  const deleteActivity = (id: string) => {
    if (!canEdit) {
      onGatedActionTrigger(`locked-day-${day.dayNumber}`);
      return;
    }
    const newActivities = day.activities.filter(a => a.id !== id);
    onUpdateActivities(day.dayNumber, newActivities);
  };

  const swapActivity = async (act: DayActivity) => {
    if (!canEdit) {
      onGatedActionTrigger(`locked-day-${day.dayNumber}`);
      return;
    }
    setSwappingId(act.id);
    try {
      const newAct = await regenerateSingleActivity(destination, vibe, act);
      const newActivities = day.activities.map(a => 
        a.id === act.id ? { ...newAct, time: act.time, durationMinutes: act.durationMinutes } : a
      );
      onUpdateActivities(day.dayNumber, newActivities);
    } catch (e) {
      console.error("Failed to swap activity:", e);
    }
    setSwappingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
  };

  const handleDropOnDay = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    const activityId = e.dataTransfer.getData('activityId');
    const fromDayNumber = parseInt(e.dataTransfer.getData('fromDayNumber'));
    onActivityDrop(day.dayNumber, activityId, fromDayNumber, day.activities.length);
  };

  const handleDropOnActivity = (e: React.DragEvent, index: number) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const activityId = e.dataTransfer.getData('activityId');
    const fromDayNumber = parseInt(e.dataTransfer.getData('fromDayNumber'));
    onActivityDrop(day.dayNumber, activityId, fromDayNumber, index);
  };

  return (
    <div 
      className={`space-y-8 transition-opacity ${!canEdit ? 'opacity-50' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDropOnDay}
    >
      <div className="bg-white rounded-[2.5rem] p-10 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
                <span className="bg-stone-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                  {day.dayNumber}
                </span>
                <h3 className="text-3xl font-black text-stone-900 tracking-tight">{day.theme}</h3>
            </div>
            <p className="text-stone-500 text-sm font-medium leading-relaxed max-w-2xl">{day.summary}</p>
          </div>
          <button 
            disabled={!canEdit || isRegenerating}
            onClick={async () => { 
              if (!canEdit) {
                onGatedActionTrigger(`locked-day-${day.dayNumber}`);
                return;
              }
              setIsRegenerating(true); 
              try {
                const newDay = await regenerateDayPlan(destination, vibe, day.dayNumber, day); 
                onUpdateDay(day.dayNumber, newDay); 
              } catch (e) {
                console.error("Failed to regenerate day:", e);
              }
              setIsRegenerating(false); 
            }} 
            className={`group flex items-center gap-3 transition-all px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-stone-200 ${!canEdit ? 'bg-stone-50 text-stone-300 cursor-not-allowed' : 'bg-stone-50 hover:bg-stone-900 hover:text-white shadow-md'}`}
          >
            {isRegenerating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className={`transition-transform duration-500 ${canEdit ? 'group-hover:rotate-180' : ''}`}>🔄</span>
            )}
            {isRegenerating ? 'Refreshing Day...' : canEdit ? 'Regenerate Entire Day' : `Upgrade to unlock Day ${day.dayNumber}`}
          </button>
      </div>

      <div className="space-y-0">
        {day.activities.map((act, idx) => (
          <React.Fragment key={act.id}>
            <div 
              onDrop={(e) => handleDropOnActivity(e, idx)}
              className="relative py-6"
            >
              <ActivityRichCard 
                act={act} 
                idx={idx}
                canEdit={canEdit}
                destination={destination}
                dayNumber={day.dayNumber}
                onUpdateField={handleUpdateActivityField}
                onSwap={swapActivity}
                onDelete={deleteActivity}
                swappingId={swappingId}
              />
            </div>
            {idx < day.activities.length - 1 && (
              <TransportCard transport={act.transportToNext} />
            )}
          </React.Fragment>
        ))}
        {day.activities.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed border-stone-200 rounded-[2.5rem] bg-stone-50/50">
             <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Drop activities here to add them to Day {day.dayNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
};
