import React, { useState, useEffect, useRef } from 'react';
import { TripPlan, DayActivity, TripDay, FlightLeg, AccommodationDetails } from '../types';
import { TripDayCard } from './TripDayCard';
import { LiveInsights } from './LiveInsights';
import { CollaborativeLayer } from './PlanBuddyTools';
import { BudgetDashboard } from './BudgetDashboard';
import { UpgradeNudge } from './UpgradeNudge';
import { TripMap } from './TripMap';
import { generateImage } from '../services/gemini';

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
  plan: initialPlan, groundingUrls, onReset, isPro, onUpgrade, onUpdatePlan, canUndo, onUndo, onShare
}) => {
  const [plan, setPlan] = useState<TripPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map' | 'transport' | 'budget'>('itinerary');
  const [mapActiveDayIndex, setMapActiveDayIndex] = useState<number>(-1); 
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [showNudge, setShowNudge] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);

  useEffect(() => {
    const sortedDays = [...(initialPlan.days || [])].map((day, index) => ({
      ...day,
      dayNumber: index + 1
    })).sort((a, b) => a.dayNumber - b.dayNumber);
    setPlan({ ...initialPlan, days: sortedDays });
    
    const destinationName = initialPlan.destinationSummary || initialPlan.tripTitle || 'Destination';
    if (coverImageCache.has(destinationName)) {
      setCoverImageUrl(coverImageCache.get(destinationName)!);
    } else {
      generateImage(`Cinematic photography of ${destinationName}`, '16:9').then(url => {
        coverImageCache.set(destinationName, url);
        setCoverImageUrl(url);
      });
    }
  }, [initialPlan]);

  const handleUpdatePlanInternal = (newPlan: TripPlan) => {
    setPlan(newPlan);
    onUpdatePlan(newPlan);
  };

  const timeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(' ');
    const [h, m] = parts[0].split(':').map(Number);
    let total = h * 60 + m;
    if (parts[1] === 'PM' && h < 12) total += 720;
    if (parts[1] === 'AM' && h === 12) total = m;
    return total;
  };

  const minutesToTimeStr = (total: number) => {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
  };

  const recalculateTimes = (acts: DayActivity[]) => {
    if (acts.length === 0) return [];
    let current = timeToMinutes(acts[0].time);
    return acts.map((a, i) => {
      const time = i === 0 ? a.time : minutesToTimeStr(current);
      current = timeToMinutes(time) + (a.durationMinutes || 60) + 15;
      return { ...a, time };
    });
  };

  const navBtnClass = (tab: string) => `
    px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300
    ${activeTab === tab 
      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xl scale-105 font-black' 
      : 'text-stone-500 hover:text-indigo-600 hover:font-black'}
  `;

  const handleDownloadAttempt = () => {
    if (!isPro) setShowNudge('Full Itinerary PDF');
    else alert('Generating PDF...');
  };

  const handleShareAttempt = () => {
    if (!isPro) setShowNudge('Trip Sharing');
    else onShare();
  };

  return (
    <div className="max-w-full sm:max-w-6xl mx-auto animate-slideUp relative pb-24 px-6">
      {/* Hero Section */}
      <div className="bg-white dark:bg-stone-900 rounded-[3rem] shadow-2xl overflow-hidden mb-12 border dark:border-stone-800">
        <div className="relative h-[450px] sm:h-[600px] bg-stone-800">
           {coverImageUrl && <img src={coverImageUrl} alt="cover" className="w-full h-full object-cover opacity-80" />}
           <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent"></div>
           <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
              <div className="flex flex-col gap-6">
                {isEditingTitle ? (
                  <input autoFocus value={plan.tripTitle} onChange={(e) => handleUpdatePlanInternal({...plan, tripTitle: e.target.value})} onBlur={() => setIsEditingTitle(false)} className="text-4xl sm:text-7xl font-black bg-transparent border-b-4 border-white outline-none w-full" />
                ) : (
                  <h1 onClick={() => setIsEditingTitle(true)} className="text-4xl sm:text-7xl font-black drop-shadow-2xl hover:text-stone-300 cursor-pointer">{plan.tripTitle}</h1>
                )}
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="bg-white/10 backdrop-blur-xl px-8 py-3 rounded-full border border-white/20 font-black text-xs uppercase tracking-widest">{plan.travelVibe} 🌿</span>
                  <button onClick={() => setIsEditingDates(true)} className="bg-indigo-600/80 backdrop-blur-xl px-8 py-3 rounded-full border border-white/20 font-black text-xs uppercase tracking-widest">📅 {plan.metadata.dates.start} - {plan.metadata.dates.end}</button>
                  <button onClick={handleDownloadAttempt} className="bg-emerald-600 px-8 py-3 rounded-full border border-white/20 font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">Download PDF {isPro ? '📥' : '💎'}</button>
                  <button onClick={handleShareAttempt} className="bg-blue-600 px-8 py-3 rounded-full border border-white/20 font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2">Share Trip {isPro ? '🔗' : '💎'}</button>
                </div>
                <div className="max-w-4xl p-8 bg-black/30 backdrop-blur-md rounded-3xl border border-white/10">
                  <p className="text-xl sm:text-2xl text-stone-100 font-normal leading-relaxed italic">"{plan.intro}"</p>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <LiveInsights destination={plan.destinationSummary} />

      {/* Tab Navigation */}
      <div className="flex justify-center my-12 overflow-x-auto px-4">
        <div className="bg-white dark:bg-stone-900 p-2.5 rounded-[2.5rem] shadow-2xl border dark:border-stone-800 flex gap-1.5">
            {['itinerary', 'map', 'budget', 'transport'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={navBtnClass(tab)}>{tab}</button>
            ))}
            <div className="w-px bg-stone-100 dark:bg-stone-800 mx-3 self-stretch" />
            <button onClick={() => isPro ? setShowCollabModal(true) : setShowNudge('Collaboration Hub')} className="px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 hover:scale-105 transition-all">Collab 👯‍♀️</button>
        </div>
      </div>

      {activeTab === 'itinerary' && (
        <div className="space-y-16">
          {plan.days.map((day, idx) => {
            const isLocked = !isPro && idx > 0;
            return (
              <div key={idx} className="relative">
                <TripDayCard 
                  day={day} destination={plan.destinationSummary} currency={plan.currency} vibe={plan.travelVibe} isPro={isPro}
                  onUpdateActivities={(d, a) => handleUpdatePlanInternal({ ...plan, days: plan.days.map(x => x.dayNumber === d ? { ...x, activities: recalculateTimes(a) } : x) })}
                  onUpdateDay={(d, nd) => handleUpdatePlanInternal({ ...plan, days: plan.days.map(x => x.dayNumber === d ? { ...nd, activities: recalculateTimes(nd.activities) } : x) })}
                  onActivityDrop={(t, id, f, idx) => {
                    if (isLocked) return;
                    const newDays = [...plan.days];
                    const fromIdx = newDays.findIndex(d => d.dayNumber === f);
                    const toIdx = newDays.findIndex(d => d.dayNumber === t);
                    const [moved] = newDays[fromIdx].activities.splice(newDays[fromIdx].activities.findIndex(a => a.id === id), 1);
                    newDays[toIdx].activities.splice(idx, 0, moved);
                    newDays[fromIdx].activities = recalculateTimes(newDays[fromIdx].activities);
                    newDays[toIdx].activities = recalculateTimes(newDays[toIdx].activities);
                    handleUpdatePlanInternal({ ...plan, days: newDays });
                  }}
                  onGatedActionTrigger={setShowNudge}
                  onViewOnMap={() => { setMapActiveDayIndex(idx); setActiveTab('map'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
                {isLocked && (
                  <div className="absolute inset-0 z-50 bg-white/20 dark:bg-stone-900/20 backdrop-blur-[12px] flex items-center justify-center rounded-[4rem] border-4 border-dashed border-stone-200/50 dark:border-stone-700/50 group cursor-pointer" onClick={() => setShowNudge('Full Multi-Day Access')}>
                    <div className="bg-white dark:bg-stone-800 p-10 rounded-[3rem] shadow-2xl text-center max-w-sm border border-stone-100 dark:border-stone-700 animate-slideUp group-hover:scale-105 transition-transform">
                      <span className="text-6xl mb-6 block">🔒</span>
                      <h4 className="text-2xl font-black mb-4">Day {idx + 1} is Locked</h4>
                      <p className="text-stone-500 text-sm mb-8">Free accounts can only view the first day of their itinerary. Upgrade to see your full trip!</p>
                      <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Unlock All Days</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'map' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex flex-wrap gap-3 justify-center bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] border dark:border-stone-800 shadow-xl">
            <button onClick={() => setMapActiveDayIndex(-1)} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${mapActiveDayIndex === -1 ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'text-stone-400 hover:text-stone-600 uppercase tracking-widest'}`}>All Routes 🗺️</button>
            {plan.days.map((_, i) => (
              <button key={i} onClick={() => setMapActiveDayIndex(i)} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${mapActiveDayIndex === i ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xl scale-110' : 'text-stone-400 hover:text-stone-600 uppercase tracking-widest'}`}>Day {i + 1}</button>
            ))}
          </div>
          <TripMap plan={plan} activeDayIndex={mapActiveDayIndex} />
        </div>
      )}

      {activeTab === 'budget' && <BudgetDashboard plan={plan} onUpdatePlan={handleUpdatePlanInternal} isPro={isPro} onUpgrade={() => setShowNudge('Receipt Management')} />}

      {activeTab === 'transport' && (
        <div className="bg-white dark:bg-stone-900 rounded-[3rem] p-12 border dark:border-stone-800 shadow-2xl animate-fadeIn">
          <h3 className="text-4xl font-black mb-12 tracking-tighter">Global Transit Network 🚕</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {plan.transportResources?.map((res, i) => (
              <div key={i} className="p-10 bg-stone-50 dark:bg-stone-800/50 rounded-[2.5rem] border dark:border-stone-700 hover:shadow-2xl transition-all group">
                <p className="font-black text-2xl mb-4 text-indigo-600 group-hover:text-indigo-500">{res.name}</p>
                <p className="text-xl text-stone-500 mb-8 font-normal leading-relaxed italic">"{res.notes}"</p>
                <div className="flex items-center gap-4 text-stone-900 dark:text-white font-black text-lg">📞 {res.contact}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration Modal - Moved to the top with pt-10 sm:pt-20 */}
      {showCollabModal && (
        <div className="fixed inset-0 z-[1000] bg-stone-900/70 backdrop-blur-xl flex items-start justify-center p-6 pt-10 sm:pt-20">
           <div className="bg-white dark:bg-stone-900 w-full max-w-3xl rounded-[3.5rem] shadow-2xl relative animate-slideUp flex flex-col max-h-[85vh] border border-white/20 overflow-hidden">
              <button onClick={() => setShowCollabModal(false)} className="absolute top-8 right-8 w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 text-3xl z-50 hover:bg-stone-200 transition-colors">✕</button>
              <div className="p-14 flex-1 overflow-hidden flex flex-col">
                 <CollaborativeLayer plan={plan} onGatedActionTrigger={setShowNudge} isPro={isPro} onUpgrade={onUpgrade} onShare={onShare} />
              </div>
           </div>
        </div>
      )}

      {showNudge && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-6">
          <UpgradeNudge featureName={showNudge} onUpgrade={onUpgrade} onClose={() => setShowNudge(null)} />
        </div>
      )}
      
      <div className="mt-24 text-center">
        <button onClick={onReset} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white px-16 py-7 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">Create New Trip 🚀</button>
      </div>
    </div>
  );
};