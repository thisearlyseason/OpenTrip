import React, { useState } from 'react';
import { TripPlan } from '../types';

interface ToolProps {
  plan: TripPlan;
  isPro: boolean;
  onGatedActionTrigger: (featureId: string) => void;
  onUpgrade: () => void;
  onShare: () => void;
}

const QUICK_EMOJIS = ['✈️', '🏨', '🥘', '📸', '🌟', '🥂'];

export const CollaborativeLayer: React.FC<ToolProps> = ({ plan, isPro, onGatedActionTrigger, onUpgrade, onShare }) => {
  const [comments, setComments] = useState(plan.collaboration?.comments || [
    { id: '1', author: 'Alex', text: 'Should we add more nature activities?', timestamp: Date.now() - 100000 },
    { id: '2', author: 'TravelAI', text: 'I recommend the local park for Day 2!', timestamp: Date.now() - 50000 }
  ]);
  const [input, setInput] = useState('');

  const addComment = () => {
    if (!isPro) { onGatedActionTrigger('collab'); return; }
    if (!input.trim()) return;
    setComments(prev => [...prev, { id: Date.now().toString(), author: 'You', text: input, timestamp: Date.now() }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h3 className="font-bold text-2xl sm:text-3xl tracking-tight mb-2">Collaboration Hub 👯‍♀️</h3>
        <p className="text-stone-500 text-sm">Real-time workspace for your group trip planning.</p>
      </div>
      
      <div className="flex-1 space-y-4 mb-8 overflow-y-auto custom-scrollbar pr-4">
        {comments.map(c => (
          <div key={c.id} className={`flex ${c.author === 'You' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl border shadow-sm ${c.author === 'You' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-stone-50 dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-800 dark:text-stone-100'}`}>
              <p className={`text-[8px] font-bold uppercase mb-1 ${c.author === 'You' ? 'text-indigo-200' : 'text-stone-400'}`}>{c.author}</p>
              <p className="text-sm font-normal leading-relaxed">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-6 border-t dark:border-stone-800">
        <div className="relative">
          <textarea 
            className="w-full p-5 bg-stone-50 dark:bg-stone-800 rounded-3xl text-sm outline-none focus:ring-4 ring-indigo-500/10 transition-all resize-none border dark:border-stone-700 min-h-[100px]" 
            placeholder="Share an idea, a message, or an image link..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <div className="absolute right-4 bottom-4 flex gap-2">
             {QUICK_EMOJIS.slice(0, 3).map(e => (
               <button key={e} onClick={() => setInput(prev => prev + e)} className="p-2 hover:scale-125 transition-transform text-lg">{e}</button>
             ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button onClick={addComment} className="bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">Send Message</button>
          <button onClick={onShare} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-colors hover:bg-indigo-100">Invite Group 🔗</button>
        </div>
      </div>
    </div>
  );
};