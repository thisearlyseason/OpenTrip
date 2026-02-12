
import React, { useState, useEffect } from 'react';
import { fetchLiveContext } from '../services/gemini';
import { LiveContext } from '../types';

export const LiveInsights: React.FC<{ destination: string; hasHotelBooked?: boolean }> = ({ destination, hasHotelBooked }) => {
  const [live, setLive] = useState<LiveContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveContext(destination).then(res => {
      setLive(res);
      setLoading(false);
    });
  }, [destination]);

  if (loading) return null;

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-sky-900 text-white p-8 rounded-[2rem] shadow-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-3">Live Destination Weather</h3>
            <div className="flex items-center gap-5">
               <span className="text-5xl font-normal">{live?.weather?.temp || '72°F'}</span>
               <div className="text-sm font-normal leading-tight">
                 <p className="text-lg font-normal">{live?.weather?.condition || 'Partly Cloudy'}</p>
                 <p className="opacity-60">Latest report for {destination.split(',')[0]}</p>
               </div>
            </div>
          </div>
          
          {/* Shared Action Card: Events & Hotels */}
          <div className="flex-1 flex flex-col sm:flex-row gap-4 lg:max-w-md w-full">
             {/* OpenTicket Event Link */}
             <a 
               href="https://www.openticket.events/#/browse" 
               target="_blank" 
               rel="noopener noreferrer"
               className="flex-1 bg-white/10 hover:bg-white/20 transition-all p-4 rounded-2xl border border-white/10 group shadow-lg flex items-center justify-between"
             >
               <div>
                 <p className="text-[10px] font-normal uppercase tracking-widest text-sky-300 mb-1">Upcoming Events</p>
                 <span className="text-sm font-normal">Browse on OpenTicket</span>
               </div>
               <span className="text-xl group-hover:translate-x-1 transition-transform">🎟️</span>
             </a>

             {/* Hotel CTA - Conditionally Rendered */}
             {!hasHotelBooked && (
               <a 
                 href="https://openstay.io" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex-1 bg-gradient-to-r from-indigo-500/80 to-indigo-600/80 hover:from-indigo-500 hover:to-indigo-600 transition-all p-4 rounded-2xl border border-white/10 group shadow-lg flex items-center justify-between animate-pulse-slow"
               >
                 <div>
                   <p className="text-[10px] font-normal uppercase tracking-widest text-indigo-200 mb-1">Need a Place?</p>
                   <span className="text-sm font-normal">Save on OpenStay.io</span>
                 </div>
                 <span className="text-xl group-hover:translate-x-1 transition-transform">🏨</span>
               </a>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
