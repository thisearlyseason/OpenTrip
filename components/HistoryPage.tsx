
import React from 'react';
import { TripPlan } from '../types';

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
  return (
    <div className="max-w-4xl mx-auto animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
           <h2 className="text-4xl font-normal text-stone-900 mb-2">Trip Vault 📁</h2>
           <p className="text-stone-500 font-normal italic">Stored locally on your device.</p>
        </div>
        {!isPro && trips.length >= 3 && (
          <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl flex items-center gap-6 animate-pulse">
             <div>
                <p className="text-xs font-normal uppercase tracking-widest mb-1">Vault Capacity Reached</p>
                <p className="text-sm font-normal opacity-90">Free tier saves up to 3 trips. Upgrade for unlimited vault space!</p>
             </div>
             <button onClick={onUpgrade} className="bg-white text-indigo-600 px-6 py-2 rounded-xl text-xs font-normal uppercase tracking-widest">Upgrade</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {trips.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-[3rem] p-20 text-center">
             <span className="text-6xl block mb-6 grayscale opacity-30">✈️</span>
             <p className="text-stone-400 font-normal uppercase tracking-widest">No trips in your vault yet</p>
          </div>
        ) : (
          trips.map((trip, idx) => (
            <div key={trip.id} className="group relative bg-white rounded-[2.5rem] border border-stone-100 shadow-sm p-8 flex flex-col md:flex-row items-center gap-8 hover:shadow-xl transition-all duration-300">
               <div className="w-full md:w-32 h-32 bg-stone-100 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{getTripIcon(trip)}</span>
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <span className="text-[10px] font-normal uppercase tracking-widest text-indigo-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                     <span className="text-stone-300">•</span>
                     <span className="text-[10px] font-normal uppercase tracking-widest text-stone-400">{trip.metadata.dates.duration} Days</span>
                  </div>
                  <h3 className="text-2xl font-normal text-stone-900 group-hover:text-indigo-600 transition-colors">{trip.tripTitle}</h3>
                  <p className="text-sm text-stone-500 font-medium line-clamp-1 mt-1">{trip.destinationSummary}</p>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => onView(trip)}
                    className="flex-1 md:flex-none px-8 py-3 bg-stone-900 text-white rounded-2xl font-normal text-xs uppercase tracking-widest hover:bg-black transition active:scale-95 shadow-lg"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => onDelete(trip.id)}
                    className="p-4 bg-stone-50 text-rose-400 hover:text-rose-600 rounded-2xl border border-stone-100 transition shadow-sm"
                  >
                    🗑️
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
