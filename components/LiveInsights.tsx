
import React, { useState, useEffect } from 'react';
import { fetchLiveContext } from '../services/gemini';
import { LiveContext } from '../types';

export const LiveInsights: React.FC<{ destination: string }> = ({ destination }) => {
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
    <div className="animate-fadeIn bg-sky-900 text-white p-6 rounded-[2rem] shadow-xl overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Live Destination Insights</h3>
          <div className="flex items-center gap-3">
             <span className="text-4xl font-black">{live?.weather?.temp || '72°F'}</span>
             <div className="text-sm font-medium leading-tight">
               <p>{live?.weather?.condition || 'Partly Cloudy'}</p>
               <p className="opacity-60">Real-time update</p>
             </div>
          </div>
        </div>
        
        {live?.events && live.events.length > 0 && (
          <div className="flex-1 border-l border-white/10 pl-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-3">Trending Today</h4>
            <div className="space-y-2">
               {live.events.slice(0, 2).map((e, i) => (
                 <div key={i} className="text-xs flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                   <span className="font-bold">{e.title}</span>
                   <span className="opacity-60">— {e.location}</span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
