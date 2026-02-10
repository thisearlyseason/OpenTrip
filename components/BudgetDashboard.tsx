
import React, { useState, useRef } from 'react';
import { TripPlan, Receipt } from '../types';

interface BudgetDashboardProps {
  plan: TripPlan;
  onUpdatePlan: (newPlan: TripPlan) => void;
  isPro: boolean;
}

const parseCost = (costStr?: string): number => {
  if (!costStr) return 0;
  const cleanStr = costStr.toLowerCase().trim();
  if (cleanStr.includes('free')) return 0;
  
  // Extract all numbers. If it's a range like "$25 - $45", take the high end for conservative budgeting.
  const matches = costStr.match(/[\d,]+(\.\d+)?/g);
  if (!matches) return 0;
  
  const values = matches.map(m => parseFloat(m.replace(/,/g, '')));
  return Math.max(...values);
};

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ plan, onUpdatePlan, isPro }) => {
  if (!plan || !plan.metadata) return <div className="p-10 text-center text-stone-400 font-medium">Budget data unavailable.</div>;

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'receipts'>('overview');
  const [viewMode, setViewMode] = useState<'total' | 'pp'>('total');

  const travelerCount = (plan.metadata.travelers?.adults || 1) + (plan.metadata.travelers?.children || 0);
  
  // Base Goal from Form
  const formBudget = plan.metadata.budget || 0;
  const totalBudgetGoal = plan.metadata.budgetType === 'perPerson' ? formBudget * travelerCount : formBudget;

  const flightCost = plan.budgetOverrides?.flightCost || 0;
  const hotelCost = plan.budgetOverrides?.accommodationCost || 0;
  const activityOverrides = plan.budgetOverrides?.activityCosts || {};
  
  const includeFlight = plan.budgetOverrides?.includeFlight ?? true;
  const includeHotel = plan.budgetOverrides?.includeAccommodation ?? true;

  const syncPlan = (updates: Partial<NonNullable<TripPlan['budgetOverrides']>>, newReceipts?: Receipt[]) => {
    const newOverrides = {
      flightCost: updates.flightCost ?? flightCost,
      accommodationCost: updates.accommodationCost ?? hotelCost,
      activityCosts: updates.activityCosts ?? activityOverrides,
      includeFlight: updates.includeFlight ?? includeFlight,
      includeAccommodation: updates.includeAccommodation ?? includeHotel,
    };
    onUpdatePlan({
      ...plan,
      budgetOverrides: newOverrides,
      receipts: newReceipts ?? plan.receipts
    });
  };

  const allActivities = plan.days?.flatMap(d => d.activities || []) || [];
  let activityTotal = 0;
  let foodTotal = 0;

  allActivities.forEach(act => {
    const costPerPerson = activityOverrides[act.id] ?? parseCost(act.priceLevel || act.costEstimate);
    const totalActivityCost = costPerPerson * travelerCount;
    
    if (act.type === 'food') {
        foodTotal += totalActivityCost;
    } else {
        activityTotal += totalActivityCost;
    }
  });

  const flightTotal = includeFlight ? (flightCost || 0) : 0;
  const hotelTotal = includeHotel ? (hotelCost || 0) : 0;
  const totalEstimatedSpent = flightTotal + hotelTotal + activityTotal + foodTotal;

  // Scale function based on viewMode
  const scale = (val: number) => viewMode === 'pp' ? val / travelerCount : val;

  const displayGoal = scale(totalBudgetGoal);
  const displaySpent = scale(totalEstimatedSpent);
  const displayRemaining = displayGoal - displaySpent;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const newReceipt: Receipt = {
        id: Math.random().toString(36).substr(2, 9),
        category: 'other', 
        title: file.name.split('.')[0],
        vendor: 'Manual Upload',
        date: new Date().toLocaleDateString(),
        fileData: base64,
        fileName: file.name,
        fileType: file.type,
      };
      syncPlan({}, [...(plan.receipts || []), newReceipt]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn p-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-center gap-6">
        <div className="bg-stone-100 p-1.5 rounded-2xl border flex gap-1 shadow-inner">
          <button onClick={() => setActiveSubTab('overview')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'overview' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-700'}`}>Overview</button>
          <button onClick={() => setActiveSubTab('receipts')} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'receipts' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-700'}`}>Receipts ({plan.receipts?.length || 0})</button>
        </div>

        {activeSubTab === 'overview' && (
          <div className="bg-stone-200/50 p-1 rounded-xl border flex gap-1">
             <button onClick={() => setViewMode('total')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition ${viewMode === 'total' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-400'}`}>Total Trip</button>
             <button onClick={() => setViewMode('pp')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition ${viewMode === 'pp' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-400'}`}>Per Person</button>
          </div>
        )}
      </div>

      {activeSubTab === 'overview' ? (
        <div className="space-y-8 animate-slideUp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Budget Goal</p>
              <p className="text-4xl font-black text-stone-900">${Math.round(displayGoal).toLocaleString()}</p>
              <p className="text-[9px] text-stone-400 mt-2 font-bold uppercase">{viewMode === 'total' ? 'Full Journey' : 'Estimated Per Person'}</p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">Estimated Spend</p>
              <p className={`text-4xl font-black ${displaySpent > displayGoal ? 'text-rose-500' : 'text-stone-900'}`}>
                ${Math.round(displaySpent).toLocaleString()}
              </p>
              <div className="w-full bg-stone-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${displaySpent > displayGoal ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (displaySpent / displayGoal) * 100)}%` }}></div>
              </div>
            </div>
            <div className={`p-10 rounded-[2.5rem] border shadow-sm transition-colors ${displayRemaining < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${displayRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{displayRemaining < 0 ? 'Balance Alert' : 'Left to Spend'}</p>
              <p className={`text-4xl font-black ${displayRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>${Math.round(Math.abs(displayRemaining)).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
            <h4 className="text-2xl font-black text-stone-900 mb-10 text-center md:text-left">Categorized Travel Spend 💸</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 group hover:border-indigo-200 transition-colors">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 block">Activities & Culture</span>
                  <p className="text-3xl font-black text-stone-900">${Math.round(scale(activityTotal)).toLocaleString()}</p>
                  <p className="text-[9px] text-stone-400 mt-2 font-bold uppercase">Sightseeing, Museums, Tours</p>
               </div>
               <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 group hover:border-indigo-200 transition-colors">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 block">Dining & Essentials</span>
                  <p className="text-3xl font-black text-stone-900">${Math.round(scale(foodTotal)).toLocaleString()}</p>
                  <p className="text-[9px] text-stone-400 mt-2 font-bold uppercase">Meals, Cafes, Local Flavors</p>
               </div>
               <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 group hover:border-indigo-200 transition-colors">
                  <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-2 block">Accommodations</span>
                  <p className="text-3xl font-black text-stone-900">${Math.round(scale(hotelTotal)).toLocaleString()}</p>
                  <p className="text-[9px] text-stone-400 mt-2 font-bold uppercase">{includeHotel ? 'Based on form input' : 'Excluded'}</p>
               </div>
               <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-100 group hover:border-indigo-200 transition-colors">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">Flights</span>
                  <p className="text-3xl font-black text-stone-900">${Math.round(scale(flightTotal)).toLocaleString()}</p>
                  <p className="text-[9px] text-stone-400 mt-2 font-bold uppercase">{includeFlight ? 'Based on form input' : 'Excluded'}</p>
               </div>
            </div>
            
            <div className="mt-12 p-8 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
               <div>
                  <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Trip Capacity</p>
                  <p className="text-lg font-black text-indigo-900">{travelerCount} Travelers Total</p>
               </div>
               <div className="flex -space-x-3">
                  {[...Array(Math.min(travelerCount, 5))].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-600">
                      👤
                    </div>
                  ))}
                  {travelerCount > 5 && <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-600">+{travelerCount - 5}</div>}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
           <div onClick={() => fileInputRef.current?.click()} className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 transition group hover:border-indigo-300">
              <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">📤</span>
              <p className="font-black text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-stone-600">Upload Receipt</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
           </div>
           {plan.receipts?.map(r => (
             <div key={r.id} className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col hover:shadow-md transition">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl">📄</div>
                   <div className="min-w-0">
                      <p className="font-black text-stone-900 truncate text-sm">{r.title}</p>
                      <p className="text-[9px] font-bold text-stone-400 uppercase mt-1">{r.date}</p>
                   </div>
                </div>
                <button onClick={() => { const link = document.createElement('a'); link.href = r.fileData; link.download = r.fileName; link.click(); }} className="w-full py-4 bg-stone-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition mb-3">Download</button>
                <button onClick={() => { onUpdatePlan({...plan, receipts: plan.receipts?.filter(x => x.id !== r.id)}); }} className="w-full py-2 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:text-rose-600">Delete</button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};
