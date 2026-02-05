import React, { useState } from 'react';
import { TripPlan, DayActivity } from '../types';

interface ToolProps {
  plan: TripPlan;
  isPro: boolean;
  onGatedActionTrigger: (featureId: string) => void;
}

export const BudgetTracker: React.FC<ToolProps> = ({ plan, isPro, onGatedActionTrigger }) => {
  const [budget, setBudget] = useState(plan.budget?.total || 1000);
  const estimatedTotal = plan.days.flatMap(d => d.activities).reduce((acc, a) => {
    const cost = parseInt(a.costEstimate?.replace(/[^0-9]/g, '') || '0');
    return acc + (isNaN(cost) ? 0 : cost);
  }, 0);

  const handleBudgetChange = (val: number) => {
    if (!isPro) {
      onGatedActionTrigger('tool-budget');
      return;
    }
    setBudget(val);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-stone-800">Budget Sense 💰</h3>
        <div className="flex items-center gap-2">
          {!isPro && <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-md font-bold text-stone-400">Locked</span>}
          <input 
            type="number" 
            className="w-24 text-right border-b border-stone-300 font-bold outline-none" 
            value={budget}
            onChange={e => handleBudgetChange(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-700 ${estimatedTotal > budget ? 'bg-rose-400' : 'bg-emerald-400'}`}
          style={{ width: `${Math.min(100, (estimatedTotal / budget) * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400">
        <span>Est. Spent: ${estimatedTotal}</span>
        <span className={estimatedTotal > budget ? 'text-rose-500' : 'text-stone-400'}>
          {estimatedTotal > budget ? 'Budget adjusted 👀' : `Left: $${budget - estimatedTotal}`}
        </span>
      </div>
    </div>
  );
};

export const CollaborativeLayer: React.FC<ToolProps> = ({ plan, isPro, onGatedActionTrigger }) => {
  const [comments, setComments] = useState(plan.collaboration?.comments || [
    { id: '1', author: 'Alex', text: 'Alex updated the plan', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');

  const addComment = () => {
    if (!isPro) {
      onGatedActionTrigger('tool-collab');
      return;
    }
    if (!input.trim()) return;
    setComments(prev => [...prev, { id: Date.now().toString(), author: 'You', text: input, timestamp: Date.now() }]);
    setInput('');
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
      <h3 className="font-bold text-lg text-stone-800 mb-4">Invite collaborators</h3>
      <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2 custom-scrollbar">
        {comments.map(c => (
          <div key={c.id} className="text-xs bg-stone-50 p-3 rounded-2xl border border-stone-100">
            <span className="font-bold block text-sky-600 mb-1">{c.author}</span>
            <p className="text-stone-600">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input 
          className="flex-1 p-2 bg-stone-100 rounded-xl text-xs outline-none" 
          placeholder="Share a thought..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addComment()}
        />
        <button onClick={addComment} className="bg-stone-900 text-white px-3 py-1 rounded-xl text-xs font-bold">Post</button>
      </div>
      {!isPro && (
        <div className="mt-4 pt-4 border-t text-[9px] font-bold text-stone-400 uppercase tracking-widest text-center">
          Upgrade to edit with friends
        </div>
      )}
    </div>
  );
};