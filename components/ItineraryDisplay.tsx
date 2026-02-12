
import React, { useState, useEffect, useRef } from 'react';
import { TripPlan, DayActivity, TripDay, FlightLeg, AccommodationDetails } from '../types';
import { TripDayCard } from './TripDayCard';
import { LiveInsights } from './LiveInsights';
import { CollaborativeLayer } from './PlanBuddyTools';
import { BudgetDashboard } from './BudgetDashboard';
import { UpgradeNudge } from './UpgradeNudge';
import { TripMap } from './TripMap';
import { generateImage } from '../services/gemini';

// Cache for the main trip cover image
const coverImageCache = new Map<string, string>();

interface ItineraryDisplayProps {
  plan: TripPlan;
  groundingUrls: any[];
  onReset: () => void;
  isPro: boolean;
  onUpgrade: () => void;
  onUpdatePlan: (newPlan: TripPlan) => void;
  canUndo: boolean;
  onUndo: () => void;
  onShare: () => void;
}

export const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ 
  plan: initialPlan, 
  groundingUrls, 
  onReset, 
  isPro, 
  onUpgrade,
  onUpdatePlan,
  canUndo,
  onUndo,
  onShare
}) => {
  const [plan, setPlan] = useState<TripPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'transport' | 'budget'>('itinerary');
  const [mapActiveDayIndex, setMapActiveDayIndex] = useState<number>(0); 
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showNudge, setShowNudge] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isIntroExpanded, setIsIntroExpanded] = useState(false);

  useEffect(() => {
    const sortedDays = [...(initialPlan.days || [])].map((day, index) => ({
      ...day,
      dayNumber: index + 1
    })).sort((a, b) => a.dayNumber - b.dayNumber);

    const sortedPlan = { ...initialPlan, days: sortedDays };
    setPlan(sortedPlan);
    
    const cacheKey = sortedPlan.id || sortedPlan.tripTitle;
    if (coverImageCache.has(cacheKey)) {
      setCoverImageUrl(coverImageCache.get(cacheKey)!);
    } else {
      const destinationName = initialPlan.destinationSummary || initialPlan.tripTitle || 'Destination';
      generateImage(`A cinematic travel photograph of ${destinationName}. High resolution, NO text, NO watermarks.`, '16:9').then(url => {
        coverImageCache.set(cacheKey, url);
        setCoverImageUrl(url);
      });
    }
  }, [initialPlan]);

  const formatDateRange = (start: string, end: string) => {
    if (!start) return '';
    const s = new Date(start);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (!end) return s.toLocaleDateString(undefined, options);
    const e = new Date(end);
    return `${s.toLocaleDateString(undefined, options)} - ${e.toLocaleDateString(undefined, options)}`;
  };

  const parseDuration = (dur: string | number): number => {
    if (typeof dur === 'number') return dur;
    const match = dur.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30;
  };

  const recalculateTimes = (activities: DayActivity[], startTimeStr: string = '09:00'): DayActivity[] => {
    const [startH, startM] = (startTimeStr || '09:00').split(':').map(Number);
    let currentMinutes = startH * 60 + (startM || 0);
    return activities.map((activity) => {
      const h = Math.floor(currentMinutes / 60) % 24;
      const m = currentMinutes % 60;
      const isPM = h >= 12;
      const dispH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const timeStr = `${dispH}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      const updatedActivity = { ...activity, time: timeStr };
      currentMinutes += activity.durationMinutes || 60;
      currentMinutes += activity.transportToNext?.duration ? parseDuration(activity.transportToNext.duration) : 30;
      return updatedActivity;
    });
  };

  const handleUpdateDayActivities = (dayNumber: number, newActivities: DayActivity[]) => {
    if (!isPro && dayNumber > 1) { setShowNudge(`locked-day-${dayNumber}`); return; }
    const startTime = plan.metadata.timePreference?.start || '09:00';
    const updatedActivities = recalculateTimes(newActivities, startTime);
    onUpdatePlan({ ...plan, days: plan.days.map(d => d.dayNumber === dayNumber ? { ...d, activities: updatedActivities } : d) });
  };

  const handleUpdateDay = (dayNumber: number, newDay: TripDay) => {
    if (!isPro && dayNumber > 1) { setShowNudge(`locked-day-${dayNumber}`); return; }
    const startTime = plan.metadata.timePreference?.start || '09:00';
    const updatedDay = { ...newDay, activities: recalculateTimes(newDay.activities, startTime) };
    onUpdatePlan({ ...plan, days: plan.days.map(d => d.dayNumber === dayNumber ? updatedDay : d) });
  };

  const handleUpdateTitle = (newTitle: string) => {
    const newPlan = { ...plan, tripTitle: newTitle };
    setPlan(newPlan);
    onUpdatePlan(newPlan);
  };

  const jumpToDayOnMap = (dayIndex: number) => {
    setMapActiveDayIndex(dayIndex);
    setActiveTab('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleActivityDrop = (targetDayNumber: number, activityId: string, fromDayNumber: number, targetIndex: number) => {
    if (!isPro && (targetDayNumber > 1 || fromDayNumber > 1)) { setShowNudge(`drop-lock`); return; }
    const newDays = [...plan.days];
    const sourceDayIdx = newDays.findIndex(d => d.dayNumber === fromDayNumber);
    const targetDayIdx = newDays.findIndex(d => d.dayNumber === targetDayNumber);
    if (sourceDayIdx === -1 || targetDayIdx === -1) return;
    const sourceActivities = [...newDays[sourceDayIdx].activities];
    const activityIdx = sourceActivities.findIndex(a => a.id === activityId);
    if (activityIdx === -1) return;
    const [moved] = sourceActivities.splice(activityIdx, 1);
    const startTime = plan.metadata.timePreference?.start || '09:00';
    if (sourceDayIdx === targetDayIdx) {
      sourceActivities.splice(targetIndex, 0, moved);
      newDays[sourceDayIdx] = { ...newDays[sourceDayIdx], activities: recalculateTimes(sourceActivities, startTime) };
    } else {
      const targetActivities = [...newDays[targetDayIdx].activities];
      targetActivities.splice(targetIndex, 0, moved);
      newDays[sourceDayIdx] = { ...newDays[sourceDayIdx], activities: recalculateTimes(sourceActivities, startTime) };
      newDays[targetDayIdx] = { ...newDays[targetDayIdx], activities: recalculateTimes(targetActivities, startTime) };
    }
    onUpdatePlan({ ...plan, days: newDays });
  };

  const hasHotelBooked = plan.metadata.accommodations && plan.metadata.accommodations.length > 0 && plan.metadata.accommodations.some(a => a.booked);

  const getDayDateString = (dayNumber: number) => {
    if (!plan.metadata.dates.start) return null;
    const date = new Date(plan.metadata.dates.start);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-6xl mx-auto animate-slideUp relative pb-20 px-4">
      {canUndo && isPro && (
        <button onClick={onUndo} className="fixed bottom-24 right-6 z-50 bg-white text-stone-900 border border-stone-200 px-4 py-2 rounded-full shadow-2xl font-normal text-xs flex items-center gap-2 hover:bg-stone-50 transition">Undo Edit 🌀</button>
      )}

      {/* Hero */}
      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] shadow-xl overflow-hidden mb-8 border border-white dark:border-stone-800 relative group">
        <div className="relative min-h-[500px] md:h-[600px] bg-stone-200 dark:bg-stone-800">
           {coverImageUrl && <img src={coverImageUrl} alt={plan.tripTitle} className="w-full h-full object-cover" />}
           <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent"></div>
           <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white flex flex-col gap-6 z-10">
              <div className="w-full">
                {isEditingTitle ? (
                  <input autoFocus value={plan.tripTitle} onChange={(e) => handleUpdateTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} className="text-4xl md:text-6xl font-bold bg-transparent border-b-2 border-white/50 outline-none w-full text-white" />
                ) : (
                  <h1 onClick={() => setIsEditingTitle(true)} className="text-4xl md:text-6xl font-bold drop-shadow-xl hover:text-stone-200 transition-colors cursor-pointer decoration-dotted underline-offset-8 hover:underline decoration-white/30">{plan.tripTitle}</h1>
                )}
                <div className="flex flex-wrap gap-3 items-center mt-6">
                  <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 font-normal text-xs shadow-md">{plan.travelVibe || 'Journey'} 🌿</span>
                  <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 font-normal text-xs shadow-md">{plan.metadata?.dates?.duration || 'Multi'} Days</span>
                  <span className="bg-indigo-500/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 font-normal text-xs shadow-md flex items-center gap-2">
                    📅 {formatDateRange(plan.metadata.dates.start, plan.metadata.dates.end)}
                  </span>
                </div>
                <div className="bg-black/20 backdrop-blur-md p-6 rounded-3xl border border-white/10 max-w-4xl mt-6">
                  <p onClick={() => setIsIntroExpanded(!isIntroExpanded)} className={`text-sm md:text-base text-stone-100 font-normal leading-relaxed cursor-pointer transition-all ${isIntroExpanded ? '' : 'line-clamp-3 md:line-clamp-none'}`}>{plan.intro}</p>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className={`transition-all duration-500 ${showTools ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <LiveInsights destination={plan.destinationSummary || 'Location'} hasHotelBooked={hasHotelBooked} />

          <div className="flex justify-center my-10 overflow-x-auto px-2">
            <div className="bg-white dark:bg-stone-900 p-1.5 rounded-2xl shadow-sm border dark:border-stone-800 flex gap-1 whitespace-nowrap">
                {['itinerary', 'map', 'budget', 'transport'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl font-normal text-sm uppercase tracking-widest transition ${activeTab === tab ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-lg' : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'}`}>{tab}</button>
                ))}
            </div>
          </div>

          {activeTab === 'itinerary' && (
            <div className="space-y-12">
              {plan.days.map((day, idx) => {
                const dayDate = getDayDateString(day.dayNumber);
                const flights = plan.metadata.flights.legs.filter(l => l.departureDate === dayDate);
                const hotels = plan.metadata.accommodations.filter(a => a.checkInDate === dayDate);
                
                return (
                  <div key={idx} className="relative">
                    <TripDayCard 
                      day={day} 
                      destination={plan.destinationSummary} 
                      currency={plan.currency}
                      onUpdateActivities={handleUpdateDayActivities} 
                      onUpdateDay={handleUpdateDay} 
                      onActivityDrop={handleActivityDrop} 
                      vibe={plan.travelVibe} 
                      isPro={isPro} 
                      onGatedActionTrigger={setShowNudge} 
                      onViewOnMap={() => jumpToDayOnMap(idx)}
                      flightsOnDay={flights}
                      hotelsOnDay={hotels}
                    />
                    {!isPro && day.dayNumber > 1 && (
                      <div className="absolute inset-0 bg-stone-50/60 dark:bg-stone-950/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-[2.5rem] p-10 text-center border-2 border-dashed border-stone-200 dark:border-stone-800">
                         <button onClick={onUpgrade} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-normal text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition">Unlock Day {day.dayNumber} 💎</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-8 shadow-xl animate-fadeIn space-y-8 border dark:border-stone-800">
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">Route Explorer 🗺️</h3>
                  <p className="text-stone-400 text-xs font-normal uppercase tracking-widest">Select a day to isolate stops and optimize travel flow</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 w-full max-w-3xl">
                   <button 
                     onClick={() => setMapActiveDayIndex(-1)}
                     className={`px-5 py-2.5 rounded-xl text-[10px] font-normal uppercase tracking-widest transition-all border-2 ${mapActiveDayIndex === -1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105' : 'bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-400 hover:border-stone-200 hover:text-stone-700 dark:hover:text-stone-200'}`}
                   >
                     🌍 All Stops
                   </button>
                   {plan.days.map((day, idx) => (
                     <button 
                        key={idx}
                        onClick={() => setMapActiveDayIndex(idx)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-normal uppercase tracking-widest transition-all border-2 ${mapActiveDayIndex === idx ? 'bg-stone-900 dark:bg-stone-100 border-stone-900 dark:border-stone-100 text-white dark:text-stone-900 shadow-lg scale-105' : 'bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-400 hover:border-stone-200 hover:text-stone-700 dark:hover:text-stone-200'}`}
                     >
                        Day {day.dayNumber}
                     </button>
                   ))}
                </div>
              </div>
              
              <div className="relative">
                <TripMap plan={plan} activeDayIndex={mapActiveDayIndex} />
                <div className="absolute top-6 left-6 z-[500] pointer-events-none">
                  <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl px-5 py-3 rounded-[1.5rem] border border-white/40 dark:border-stone-800 shadow-2xl flex items-center gap-4 animate-fadeIn">
                    <div className="w-10 h-10 bg-stone-900 dark:bg-stone-100 rounded-xl flex items-center justify-center text-xl shadow-lg">
                      {mapActiveDayIndex === -1 ? '🌍' : '📍'}
                    </div>
                    <div>
                       <p className="text-[9px] font-normal text-stone-500 uppercase tracking-[0.2em]">Map Focus</p>
                       <p className="text-xs font-normal text-stone-900 dark:text-white">
                         {mapActiveDayIndex === -1 ? 'Full Journey Overview' : `Day ${plan.days[mapActiveDayIndex].dayNumber}: ${plan.days[mapActiveDayIndex].theme}`}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'budget' && <BudgetDashboard plan={plan} onUpdatePlan={onUpdatePlan} isPro={isPro} />}

          {activeTab === 'transport' && (
            <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 shadow-xl animate-fadeIn min-h-[500px] border dark:border-stone-800">
               <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">Local Transit Directory 🚕</h3>
                  <p className="text-stone-500 max-w-lg mx-auto">Verified local transport services for {plan.destinationSummary.split(',')[0]}.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.transportResources?.map((res, i) => {
                    const isUrl = res.contact?.startsWith('http') || res.contact?.includes('.com') || res.contact?.includes('.org') || res.contact?.includes('.app');
                    return (
                      <div key={i} className="p-10 bg-stone-50 dark:bg-stone-800/50 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 flex flex-col group hover:border-indigo-200 transition-all shadow-sm">
                         <div className="flex justify-between items-start mb-6">
                            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">{res.name}</span>
                            <span className="bg-white dark:bg-stone-800 p-4 rounded-2xl shadow-sm text-3xl">🚕</span>
                         </div>
                         <p className="text-sm text-stone-500 font-normal italic mb-10 flex-1 leading-relaxed">{res.notes}</p>
                         {isUrl ? (
                           <a href={res.contact.startsWith('http') ? res.contact : `https://${res.contact}`} target="_blank" rel="noreferrer" className="w-full bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white py-5 rounded-2xl text-center font-normal text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-white transition shadow-xl">Explore Official Service ↗</a>
                         ) : (
                           <a href={`tel:${res.contact}`} className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 py-5 rounded-2xl text-center font-normal text-[10px] uppercase tracking-widest hover:bg-stone-50 dark:hover:bg-stone-700 transition shadow-md">Call: {res.contact} 📞</a>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
          )}
        </div>

        {showTools && <div className="lg:col-span-4"><CollaborativeLayer plan={plan} onGatedActionTrigger={setShowNudge} isPro={isPro} onUpgrade={onUpgrade} onShare={onShare} /></div>}
      </div>

      {showNudge && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4">
          <UpgradeNudge featureName="Pro Travel Management" onUpgrade={onUpgrade} onClose={() => setShowNudge(null)} />
        </div>
      )}
      
      <div className="mt-12 text-center"><button onClick={onReset} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-10 py-4 rounded-2xl font-normal text-sm uppercase tracking-widest shadow-2xl hover:bg-black dark:hover:bg-white transition">Design New Trip 🚀</button></div>
    </div>
  );
};
