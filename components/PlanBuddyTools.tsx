
import React, { useState } from 'react';
import { TripPlan } from '../types';

interface ToolProps {
  plan: TripPlan;
  isPro: boolean;
  onGatedActionTrigger: (featureId: string) => void;
  onUpgrade: () => void;
  onShare: () => void;
}

const QUICK_EMOJIS = ['✈️', '🏨', '🗺️', '🥘', '📸', '🌟', '🥂', '🗽', '🏔️', '🏖️'];

export const CollaborativeLayer: React.FC<ToolProps> = ({ plan, isPro, onGatedActionTrigger, onUpgrade, onShare }) => {
  const [comments, setComments] = useState(plan.collaboration?.comments || [
    { id: '1', author: 'Alex', text: 'Alex updated the plan', timestamp: Date.now() },
    { id: '2', author: 'TravelAI', text: 'I love this itinerary! Let me know if you want more hidden gems.', timestamp: Date.now() - 100000 }
  ]);
  const [input, setInput] = useState('');
  const [showFunCTA, setShowFunCTA] = useState(false);

  const handleInteractionAttempt = () => {
    if (!isPro) {
      setShowFunCTA(true);
      onGatedActionTrigger('tool-collab');
      return false;
    }
    return true;
  };

  const addComment = () => {
    if (!handleInteractionAttempt()) return;
    if (!input.trim()) return;
    setComments(prev => [...prev, { id: Date.now().toString(), author: 'You', text: input, timestamp: Date.now() }]);
    setInput('');
  };

  const handleDownload = () => {
    if (!handleInteractionAttempt()) return;
    window.print();
  };

  const appendEmoji = (emoji: string) => {
    if (!handleInteractionAttempt()) return;
    setInput(prev => prev + emoji);
  };

  return (
    <div className="relative">
      <div className={`bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-xl transition-all ${!isPro ? 'opacity-90 grayscale-[0.2]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-xl text-stone-900 tracking-tight">Collaboration Hub 👯‍♀️</h3>
          {!isPro && <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest animate-pulse shadow-sm">Pro Feature</span>}
        </div>
        
        <div className="flex flex-col gap-3 mb-8">
           <button 
             onClick={onShare}
             className="w-full py-4 rounded-2xl bg-sky-50 text-sky-600 font-black text-xs uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition shadow-sm flex items-center justify-center gap-2"
           >
             Share Itinerary (Link) {isPro ? '🔗' : '🔒'}
           </button>
           <button 
             onClick={handleDownload}
             className="w-full py-4 rounded-2xl bg-stone-50 text-stone-600 font-black text-xs uppercase tracking-widest border border-stone-100 hover:bg-stone-100 transition shadow-sm flex items-center justify-center gap-2"
           >
             Download PDF {isPro ? '📄' : '🔒'}
           </button>
        </div>

        <div className="space-y-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border-t pt-6">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Live Discussions</p>
          {comments.map(c => (
            <div key={c.id} className="group">
              <div className={`p-4 rounded-[1.5rem] border ${c.author === 'You' ? 'bg-indigo-50 border-indigo-100 ml-4' : 'bg-stone-50 border-stone-100 mr-4'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${c.author === 'You' ? 'text-indigo-600' : 'text-stone-400'}`}>{c.author}</span>
                  <span className="text-[8px] font-bold text-stone-300">Recently</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed font-medium">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-stone-100 shadow-inner bg-stone-50">
            {!isPro && (
              <div className="absolute inset-0 z-10 cursor-pointer bg-transparent" onClick={handleInteractionAttempt}></div>
            )}
            <textarea 
              className="w-full p-5 bg-transparent rounded-[1.5rem] text-xs font-medium focus:bg-white focus:outline-none outline-none transition-all resize-none min-h-[120px]" 
              placeholder={isPro ? "Suggest a change or post a thought..." : "Upgrade to start collaborating..."}
              value={input}
              readOnly={!isPro}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addComment())}
            />
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 px-1">
              {QUICK_EMOJIS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => appendEmoji(emoji)}
                  className="w-8 h-8 flex items-center justify-center bg-stone-50 border border-stone-100 rounded-lg text-sm hover:bg-white hover:border-stone-300 transition-all shadow-sm active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <button 
              onClick={addComment} 
              disabled={!input.trim()}
              className="w-full py-5 bg-stone-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Post Message
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-stone-100">
           <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Invite Your Squad</p>
           <div className="flex items-center justify-between">
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-xs font-black text-stone-500 shadow-sm overflow-hidden">
                     <img src={`https://i.pravatar.cc/100?img=${i+14}`} alt="avatar" />
                  </div>
                ))}
                <button 
                  onClick={handleInteractionAttempt}
                  className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-black shadow-sm hover:scale-110 transition-transform"
                >
                  +
                </button>
             </div>
             <p className="text-[10px] font-bold text-stone-400 italic">"Trip planning is a team sport!"</p>
           </div>
        </div>
      </div>

      {showFunCTA && !isPro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-6 animate-fadeIn">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-stone-100 max-w-sm text-center transform scale-100 transition-transform hover:scale-105">
             <div className="w-24 h-24 bg-indigo-100 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-8 animate-bounce">
                🎉
             </div>
             <h4 className="text-3xl font-black text-stone-900 mb-4 tracking-tight">Better with Friends!</h4>
             <p className="text-stone-500 font-medium mb-8 leading-relaxed">
               Ready to coordinate with your squad? Upgrade to OpenTrip Pro to invite your crew, post live comments, and suggest itinerary changes together. 🚀
             </p>
             <div className="space-y-3">
               <button 
                 onClick={onUpgrade}
                 className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition"
               >
                 Go Pro Today
               </button>
               <button 
                 onClick={() => setShowFunCTA(false)}
                 className="w-full py-4 text-stone-400 font-black text-xs uppercase tracking-widest hover:text-stone-900 transition"
               >
                 Maybe Later
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
