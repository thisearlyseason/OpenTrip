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
           <h2 className="text-4xl font-black text-stone-900 mb-2">Trip Vault 📁</h2>
           <p className="text-stone-500 font-medium italic">Revisit your past designs and duplicate successful routes.</p>
        </div>
        {!isPro && (
          <div className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-xl flex items-center gap-6 animate-pulse">
             <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Free Tier Limit</p>
                <p className="text-sm font-bold opacity-90">Only current trip is saved. Upgrade to unlock the vault!</p>
             </div>
             <button onClick={onUpgrade} className="bg-white text-indigo-600 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Upgrade</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {trips.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-[3rem] p-20 text-center">
             <span className="text-6xl block mb-6 grayscale opacity-30">✈️</span>
             <p className="text-stone-400 font-bold uppercase tracking-widest">No trips in your vault yet</p>
          </div>
        ) : (
          trips.map((trip, idx) => (
            <div key={trip.id} className={`group relative bg-white rounded-[2.5rem] border border-stone-100 shadow-sm p-8 flex flex-col md:flex-row items-center gap-8 hover:shadow-xl transition-all duration-300 ${!isPro && idx > 0 ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
               <div className="w-full md:w-32 h-32 bg-stone-100 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{getTripIcon(trip)}</span>
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{new Date(trip.createdAt).toLocaleDateString()}</span>
                     <span className="text-stone-300">•</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{trip.metadata.dates.duration} Days</span>
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 group-hover:text-indigo-600 transition-colors">{trip.tripTitle}</h3>
                  <p className="text-sm text-stone-500 font-medium line-clamp-1 mt-1">{trip.destinationSummary}</p>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => onView(trip)}
                    className="flex-1 md:flex-none px-8 py-3 bg-stone-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition active:scale-95 shadow-lg"
                  >
                    View
                  </button>
                  {isPro && (
                    <>
                      <button 
                        onClick={() => onDuplicate(trip)}
                        className="p-4 bg-stone-50 text-stone-400 hover:text-indigo-600 rounded-2xl border border-stone-100 transition shadow-sm"
                        title="Duplicate Trip"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => onDelete(trip.id)}
                        className="p-4 bg-stone-50 text-stone-400 hover:text-rose-600 rounded-2xl border border-stone-100 transition shadow-sm"
                        title="Delete Trip"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
