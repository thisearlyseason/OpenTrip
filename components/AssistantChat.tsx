

import React, { useState, useRef, useEffect } from 'react';
import { assistantChat } from '../services/gemini';
import { TripPlan } from '../types';

export const AssistantChat: React.FC<{ plan: TripPlan; isPro: boolean; onUpgrade: () => void }> = ({ plan, isPro, onUpgrade }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: `Hi! I'm your OpenTrip concierge. Ask me anything about your trip to ${plan.destinationSummary}!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const handleOpen = () => {
    if (!isPro) {
      setShowUpgradeModal(true);
    } else {
      setIsOpen(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const reply = await assistantChat(userMsg, plan);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] font-sans">
        {isOpen ? (
          <div className="w-80 sm:w-96 h-[400px] sm:h-[500px] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-100 flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-stone-900 p-4 sm:p-5 text-white flex justify-between items-center">
              <span className="font-normal text-sm sm:text-base">OpenTrip AI 🤖</span>
              <button onClick={() => setIsOpen(false)} className="hover:text-stone-400 text-xl">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 bg-stone-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed font-normal ${m.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-stone-700 shadow-sm border border-stone-100'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-stone-400 italic font-normal">OpenTrip is thinking...</div>}
            </div>
            <div className="p-3 sm:p-4 border-t flex gap-2 bg-white">
              <input 
                className="flex-1 p-2 sm:p-3 bg-stone-100 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none font-normal" 
                placeholder="Ask a question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} className="bg-stone-900 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-normal text-lg sm:text-xl">➔</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleOpen}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-stone-900 rounded-xl sm:rounded-2xl shadow-2xl flex items-center justify-center text-white text-2xl sm:text-3xl hover:scale-110 transition-transform active:scale-95 group relative"
          >
            💬
            {!isPro && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5 bg-indigo-500 border-2 border-stone-900"></span>
              </span>
            )}
          </button>
        )}
      </div>

      {showUpgradeModal && !isPro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-stone-100 max-w-xs sm:max-w-md text-center relative">
             <button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-stone-300 hover:text-stone-600 text-xl sm:text-2xl">✕</button>
             <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-100 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-6 sm:mb-8">
                🤖
             </div>
             <h4 className="text-xl sm:text-3xl font-bold text-stone-900 mb-4 tracking-tight">AI Concierge Locked</h4>
             <p className="text-sm sm:text-base text-stone-500 font-normal mb-6 sm:mb-8 leading-relaxed">
               Chat with your personal travel assistant, get real-time advice, and modify your trip on the fly with OpenTrip Pro.
             </p>
             <button 
               onClick={() => { setShowUpgradeModal(false); onUpgrade(); }}
               className="w-full bg-indigo-600 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-normal text-sm sm:text-base uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition"
             >
               Unlock AI Assistant
             </button>
          </div>
        </div>
      )}
    </>
  );
};