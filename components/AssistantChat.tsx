
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
      <div className="fixed bottom-6 right-6 z-[100] font-sans">
        {isOpen ? (
          <div className="w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-stone-100 flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-stone-900 p-4 text-white flex justify-between items-center">
              <span className="font-normal text-sm">OpenTrip AI 🤖</span>
              <button onClick={() => setIsOpen(false)} className="hover:text-stone-400">✕</button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed font-normal ${m.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-stone-700 shadow-sm border border-stone-100'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-[10px] text-stone-400 italic font-normal">OpenTrip is thinking...</div>}
            </div>
            <div className="p-3 border-t flex gap-2 bg-white">
              <input 
                className="flex-1 p-2 bg-stone-100 rounded-xl text-xs focus:outline-none font-normal" 
                placeholder="Ask a question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} className="bg-stone-900 text-white w-8 h-8 rounded-xl flex items-center justify-center font-normal">➔</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleOpen}
            className="w-14 h-14 bg-stone-900 rounded-2xl shadow-2xl flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform active:scale-95 group relative"
          >
            💬
            {!isPro && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-stone-900"></span>
              </span>
            )}
          </button>
        )}
      </div>

      {showUpgradeModal && !isPro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-6 animate-fadeIn">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 max-w-sm text-center relative">
             <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 text-stone-300 hover:text-stone-600">✕</button>
             <div className="w-20 h-20 bg-indigo-100 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6">
                🤖
             </div>
             <h4 className="text-2xl font-bold text-stone-900 mb-3 tracking-tight">AI Concierge Locked</h4>
             <p className="text-stone-500 font-normal mb-8 text-sm leading-relaxed">
               Chat with your personal travel assistant, get real-time advice, and modify your trip on the fly with OpenTrip Pro.
             </p>
             <button 
               onClick={() => { setShowUpgradeModal(false); onUpgrade(); }}
               className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-normal text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition"
             >
               Unlock AI Assistant
             </button>
          </div>
        </div>
      )}
    </>
  );
};
