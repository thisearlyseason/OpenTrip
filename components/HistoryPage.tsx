import React, { useState } from 'react';
import { TripPlan } from '../types';
import { UpgradeNudge } from './UpgradeNudge';

interface HistoryPageProps {
  trips: TripPlan[];
  isPro: boolean;
  onView: (trip: TripPlan) => void;
  onDuplicate: (trip: TripPlan) => void;
  onDelete: (id: string) => void;
  onUpgrade: () => void;
}

const getTripIcon = (plan: TripPlan) => {
  const vibe = (plan.travelVibe || '').toLowerCase();
  const summary = (plan.destinationSummary || '').toLowerCase();
  
  if (vibe.includes('beach') || summary.includes('beach') || summary.includes('bali') || summary.includes('coast')) return '🏖️';
  if (vibe.includes('mountain') || summary.includes('mountain') || summary.includes('hike') || summary.includes('alps')) return '⛰️';
  if (vibe.includes('city') || vibe.includes('urban') || summary.includes('tokyo') || summary.includes('new york') || summary.includes('london')) return '🏙️';
  if (vibe.includes('nature') || summary.includes('forest') || summary.includes('safari')) return '🌳';
  if (vibe.includes('food') || vibe.includes('culinary')) return '🥘';
  if (vibe.includes('relax') || vibe.includes('wellness')) return '💆';
  if (vibe.includes('culture') || vibe.includes('historic')) return '🏛️';
  
  return '✈️';
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ trips, isPro, onView, onDuplicate, onDelete, onUpgrade }) => {
  const [showNudge, setShowNudge] = useState<string | null>(null);

  const handleViewAttempt = (trip: TripPlan, index: number) => {
    if (!isPro && index >= 1) {
      setShowNudge('Unlimited History Access');
      return;
    }
    onView(trip);
  };

  return (
    <div className="max-w-full sm:max-w-4xl mx-auto animate-fadeIn pb-20 px-4">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 sm:mb-12">
        <div className="bg-white/40 dark:bg-stone-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
           <h2 className="text-3xl sm:text-4xl font-semibold text-stone-900 dark:text-white mb-2 tracking-tight">Trip Vault 📁</h2>
           <p className="text-sm font-normal text-stone-500 dark:text-stone-400">Stored locally on your device.</p>
        </div>
        {!isPro && trips.length >= 1 && (
          <div className="bg-indigo-600 text-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl flex items-center gap-4 sm:gap-6 animate-pulse border border-indigo-500">
             <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-indigo-200">Vault Capacity Reached</p>
                <p className="text-xs sm:text-sm font-normal opacity-90">Free accounts save 1 trip. Upgrade for unlimited storage!</p>
             </div>
             <button onClick={onUpgrade} className="bg-white text-indigo-600 px-4 py-1.5 sm:px-6 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-sm">Upgrade</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 relative">
        {trips.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md dark:bg-stone-900/60 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[2.5rem] sm:rounded-[3rem] p-16 sm:p-24 text-center shadow-xl">
             <span className="text-6xl sm:text-7xl block mb-6 sm:mb-8 grayscale opacity-30">✈️</span>
             <p className="text-sm font-normal uppercase tracking-[0.3em] text-stone-400">No trips in your vault yet</p>
          </div>
        ) : (
          trips.map((trip, idx) => {
            const isLocked = !isPro && idx >= 1;
            return (
              <div 
                key={trip.id} 
                onClick={() => handleViewAttempt(trip, idx)}
                className={`group relative bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] border border-stone-100 dark:border-stone-800 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row items-center gap-4 sm:gap-6 transition-all duration-300 cursor-pointer ${isLocked ? 'opacity-60' : 'hover:shadow-xl hover:scale-[1.01]'}`}
              >
                 <div className="w-full md:w-24 h-24 sm:w-28 sm:h-28 bg-stone-100 dark:bg-stone-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-inner flex items-center justify-center relative">
                    <span className={`text-4xl sm:text-5xl group-hover:scale-110 transition-transform duration-500 ${isLocked ? 'blur-[4px]' : ''}`}>{getTripIcon(trip)}</span>
                    {isLocked && <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] text-xl sm:text-2xl">🔒</div>}
                 </div>
                 <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 mb-1">
                       <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                       <span className="text-stone-300">•</span>
                       <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-stone-400">{trip.metadata.dates.duration} Days</span>
                    </div>
                    <h3 className={`text-lg sm:text-xl font-bold text-stone-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isLocked ? 'blur-[3px] select-none' : ''}`}>{trip.tripTitle}</h3>
                    <p className={`text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium line-clamp-1 mt-0.5 ${isLocked ? 'blur-[2px] select-none' : ''}`}>{trip.destinationSummary}</p>
                 </div>
                 <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleViewAttempt(trip, idx); }}
                      className={`flex-1 md:flex-none px-6 py-2 sm:px-8 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition active:scale-95 shadow-md ${isLocked ? 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-600' : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-black dark:hover:bg-white'}`}
                    >
                      {isLocked ? 'Unlock Trip' : 'Open'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDuplicate(trip); }}
                      className="p-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 rounded-xl transition shadow-sm active:scale-90"
                      title="Duplicate Trip"
                    >
                      👯‍♀️
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }}
                      className="p-3 bg-stone-50 dark:bg-stone-800 text-rose-400 hover:text-rose-600 rounded-xl border border-stone-100 dark:border-stone-700 transition shadow-sm active:scale-90"
                      title="Delete Trip"
                    >
                      🗑️
                    </button>
                 </div>
              </div>
            );
          })
        )}
      </div>

      {showNudge && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4 sm:p-6">
           <div className="max-w-xs sm:max-w-md w-full animate-slideUp">
              <UpgradeNudge 
                featureName={showNudge}
                onUpgrade={() => { setShowNudge(null); onUpgrade(); }} 
                onClose={() => setShowNudge(null)} 
              />
           </div>
        </div>
      )}
    </div>
  );
};