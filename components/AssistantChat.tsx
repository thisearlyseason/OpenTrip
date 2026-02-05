
import React, { useState, useRef, useEffect } from 'react';
import { assistantChat } from '../services/gemini';
import { TripPlan } from '../types';

export const AssistantChat: React.FC<{ plan: TripPlan }> = ({ plan }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: `Hi! I'm your PlanBuddy assistant. Ask me anything about your trip to ${plan.destinationSummary}!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

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
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {isOpen ? (
        <div className="w-80 h-[450px] bg-white rounded-3xl shadow-2xl border border-stone-100 flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-stone-900 p-4 text-white flex justify-between items-center">
            <span className="font-bold text-sm">PlanBuddy AI 🤖</span>
            <button onClick={() => setIsOpen(false)} className="hover:text-stone-400">✕</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-stone-700 shadow-sm border border-stone-100'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-[10px] text-stone-400 italic">PlanBuddy is thinking...</div>}
          </div>
          <div className="p-3 border-t flex gap-2 bg-white">
            <input 
              className="flex-1 p-2 bg-stone-100 rounded-xl text-xs focus:outline-none" 
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="bg-stone-900 text-white w-8 h-8 rounded-xl flex items-center justify-center">➔</button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-stone-900 rounded-2xl shadow-2xl flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform active:scale-95"
        >
          💬
        </button>
      )}
    </div>
  );
};
