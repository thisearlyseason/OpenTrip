import React, { useState, useEffect } from 'react';
import { TripPlan, DayActivity, TripDay } from '../types';
import { TripDayCard } from './TripDayCard';
import { LiveInsights } from './LiveInsights';
import { BudgetTracker, CollaborativeLayer } from './PlanBuddyTools';
import { UpgradeNudge } from './UpgradeNudge';

interface ItineraryDisplayProps {
  plan: TripPlan;
  groundingUrls: any[];
  onReset: () => void;
  isPro: boolean;
  onUpgrade: () => void;
  onUpdatePlan: (newPlan: TripPlan) => void;
  canUndo: boolean;
  onUndo: () => void;
}

export const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ 
  plan: initialPlan, 
  groundingUrls, 
  onReset, 
  isPro, 
  onUpgrade,
  onUpdatePlan,
  canUndo,
  onUndo
}) => {
  const [plan, setPlan] = useState<TripPlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map'>('itinerary');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showNudge, setShowNudge] = useState<string | null>(null);

  useEffect(() => {
    setPlan(initialPlan);
    setCoverImageUrl(`https://source.unsplash.com/1600x900/?${encodeURIComponent(initialPlan.coverImagePrompt || initialPlan.tripTitle)}`);
  }, [initialPlan]);

  const recalculateTimes = (activities: DayActivity[]): DayActivity[] => {
    // Basic automatic time recalculation: 
    // Start at 9:00 AM, assume 2 hours per activity including transport.
    let currentHour = 9;
    let currentMinute = 0;

    return activities.map((activity, index) => {
      const isPM = currentHour >= 12;
      const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
      const timeStr = `${displayHour}:${currentMinute === 0 ? '00' : currentMinute} ${isPM ? 'PM' : 'AM'}`;
      
      // Increment for next
      currentHour += 2; 
      if (currentHour >= 24) currentHour = 0;

      return { ...activity, time: timeStr };
    });
  };

  const handleUpdateDayActivities = (dayNumber: number, newActivities: DayActivity[]) => {
    const newPlan = {
      ...plan,
      days: plan.days.map(d => d.dayNumber === dayNumber ? { ...d, activities: newActivities } : d)
    };
    onUpdatePlan(newPlan);
  };

  const handleUpdateDay = (dayNumber: number, newDay: TripDay) => {
    const newPlan = {
      ...plan,
      days: plan.days.map(d => d.dayNumber === dayNumber ? newDay : d)
    };
    onUpdatePlan(newPlan);
  };

  const handleActivityDrop = (targetDayNumber: number, activityId: string, fromDayNumber: number, targetIndex: number) => {
    const newDays = [...plan.days];
    const sourceDayIndex = newDays.findIndex(d => d.dayNumber === fromDayNumber);
    const targetDayIndex = newDays.findIndex(d => d.dayNumber === targetDayNumber);

    if (sourceDayIndex === -1 || targetDayIndex === -1) return;

    const sourceDay = newDays[sourceDayIndex];
    const targetDay = newDays[targetDayIndex];
    
    const sourceActivities = [...sourceDay.activities];
    const activityIndex = sourceActivities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) return;

    const [movedActivity] = sourceActivities.splice(activityIndex, 1);

    if (sourceDayIndex === targetDayIndex) {
      sourceActivities.splice(targetIndex, 0, movedActivity);
      const updatedActivities = recalculateTimes(sourceActivities);
      newDays[sourceDayIndex] = { ...sourceDay, activities: updatedActivities };
    } else {
      const targetActivities = [...targetDay.activities];
      targetActivities.splice(targetIndex, 0, movedActivity);
      
      newDays[sourceDayIndex] = { ...sourceDay, activities: recalculateTimes(sourceActivities) };
      newDays[targetDayIndex] = { ...targetDay, activities: recalculateTimes(targetActivities) };
    }

    onUpdatePlan({ ...plan, days: newDays });
  };

  const allStops = plan.days.flatMap(d => d.activities);
  const firstAddress = allStops.find(stop => stop.address)?.address || plan.destinationSummary;

  return (
    <div className="max-w-6xl mx-auto animate-slideUp relative pb-20 px-4">
      {/* Undo Button (Trip Rewind) */}
      {canUndo && isPro && (
        <button 
          onClick={onUndo}
          className="fixed bottom-24 right-6 z-50 bg-white text-stone-900 border border-stone-200 px-4 py-2 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 hover:bg-stone-50 transition"
        >
          Undo this change 🌀
        </button>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden mb-8 border border-white group relative">
        <div className="relative h-96 bg-stone-200">
           {coverImageUrl ? <img src={coverImageUrl} alt="Trip Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-300 animate-pulse" />}
           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 right-0 p-10 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight drop-shadow-lg">{plan.tripTitle}</h1>
                  <div className="flex flex-wrap gap-4 items-center">
                      <span className="bg-white/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 font-bold text-sm shadow-md">Based on your vibe…</span>
                      <span className="bg-white/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 font-bold text-sm shadow-md">{plan.travelVibe} vibes activated 🌿</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTools(!showTools)}
                  className={`px-8 py-3 rounded-2xl font-bold transition-all ${showTools ? 'bg-white text-stone-900 shadow-2xl scale-105' : 'bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20'}`}
                >
                  {showTools ? '✨ Close Power Tools' : '🛠️ Open Power Tools'}
                </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className={`transition-all duration-500 ${showTools ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          <div className="mb-10">
            <LiveInsights destination={plan.destinationSummary} />
          </div>

          <div className="flex justify-center mb-10">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border flex gap-1">
                <button onClick={() => setActiveTab('itinerary')} className={`px-8 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'itinerary' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-700'}`}>Timeline</button>
                <button onClick={() => setActiveTab('map')} className={`px-8 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'map' ? 'bg-stone-900 text-white shadow-lg' : 'text-stone-400 hover:text-stone-700'}`}>Map View</button>
            </div>
          </div>

          {activeTab === 'itinerary' ? (
            <div className="space-y-12">
                <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm mb-12">
                    <p className="text-stone-600 leading-relaxed italic text-lg">"{plan.intro}"</p>
                    {plan.metadata.accommodation?.booked && (
                      <div className="mt-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Primary Accommodation</h4>
                        <p className="font-bold text-stone-800">{plan.metadata.accommodation.hotelName}</p>
                        <p className="text-xs text-stone-500">{plan.metadata.accommodation.address}</p>
                        {plan.metadata.accommodation.confirmationNumber && (
                          <p className="text-[10px] font-mono text-sky-600 mt-1">CONF: {plan.metadata.accommodation.confirmationNumber}</p>
                        )}
                      </div>
                    )}
                </div>

                {/* FIX: MUST ALWAYS list the website URLs from groundingChunks when Google Search tool is used. */}
                {groundingUrls && groundingUrls.length > 0 && (
                  <div className="bg-sky-50 p-6 rounded-[2rem] border border-sky-100 mb-12 animate-fadeIn">
                    <h4 className="text-[10px] font-bold text-sky-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                       Research & Real-time Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {groundingUrls.map((chunk: any, i: number) => {
                        if (chunk.web) {
                          return (
                            <a 
                              key={i} 
                              href={chunk.web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-white px-4 py-2 rounded-xl border border-sky-200 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition shadow-sm flex items-center gap-2"
                            >
                              <span>🌐</span>
                              {chunk.web.title || 'Source'}
                            </a>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {plan.days.map((day) => (
                    <div key={day.dayNumber}>
                      <TripDayCard 
                          day={day} 
                          destination={plan.destinationSummary} 
                          onUpdateActivities={handleUpdateDayActivities}
                          onUpdateDay={handleUpdateDay}
                          onActivityDrop={handleActivityDrop}
                          dietary={plan.metadata.dietary}
                          vibe={plan.travelVibe}
                          isPro={isPro}
                          transportModes={plan.metadata.transportModes}
                          onGatedActionTrigger={(feature) => {
                            if (!isPro) setShowNudge(feature);
                          }}
                      />
                      {showNudge === `day-${day.dayNumber}` && (
                        <div className="mt-4">
                          <UpgradeNudge 
                            featureName={`Edit Day ${day.dayNumber}`}
                            onUpgrade={onUpgrade}
                            onClose={() => setShowNudge(null)}
                          />
                        </div>
                      )}
                    </div>
                ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-xl min-h-[600px] overflow-hidden">
                <iframe 
                    width="100%" 
                    height="600px" 
                    style={{ border: 0 }} 
                    src={`https://www.google.com/maps/embed/v1/search?key=${process.env.API_KEY}&q=${encodeURIComponent(firstAddress)}`}
                    allowFullScreen
                ></iframe>
            </div>
          )}
        </div>

        {showTools && (
          <div className="lg:col-span-4 space-y-8 animate-fadeIn">
            <BudgetTracker plan={plan} onGatedActionTrigger={(f) => { if(!isPro) setShowNudge(f); }} isPro={isPro} />
            <CollaborativeLayer plan={plan} onGatedActionTrigger={(f) => { if(!isPro) setShowNudge(f); }} isPro={isPro} />
            
            {showNudge && showNudge.startsWith('tool-') && (
              <UpgradeNudge 
                featureName={showNudge === 'tool-budget' ? 'Pro Budget Sense' : 'OpenCollab Pro'}
                onUpgrade={onUpgrade}
                onClose={() => setShowNudge(null)}
              />
            )}

            <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-xl">
               <h4 className="font-bold text-lg mb-2 text-white">Pro Sharing 📤</h4>
               <p className="text-xs opacity-60 mb-4">Export a teaser preview of this trip to social media.</p>
               <button className="w-full bg-white text-stone-900 py-3 rounded-xl font-bold text-xs hover:bg-stone-100 transition">Generate Preview Link</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <button onClick={onReset} className="bg-stone-900 text-white px-10 py-4 rounded-2xl hover:bg-black transition shadow-xl font-bold">Start New Trip 🚀</button>
      </div>
    </div>
  );
};