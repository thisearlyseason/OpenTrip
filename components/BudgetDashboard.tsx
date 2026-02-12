
import React, { useState, useRef } from 'react';
import { TripPlan, Receipt, DayActivity, FlightLeg, AccommodationDetails } from '../types';

interface BudgetDashboardProps {
  plan: TripPlan;
  onUpdatePlan: (newPlan: TripPlan) => void;
  isPro: boolean;
}

const getCurrencySymbol = (c: string) => (c || "").match(/\((.*?)\)/)?.[1] || (c || "").split(' ')[0] || "$";

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ plan, onUpdatePlan, isPro }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'receipts'>('overview');
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const curSym = getCurrencySymbol(plan.currency);
  const travelers = (plan.metadata.travelers?.adults || 1) + (plan.metadata.travelers?.children || 0);

  const budgetGoal = plan.metadata.budgetType === 'perPerson' 
    ? (plan.metadata.budget || 0) * travelers 
    : (plan.metadata.budget || 0);

  const allActivities = plan.days.flatMap(d => d.activities.map(a => ({...a, dayNumber: d.dayNumber})));
  
  const getCategoryStats = (types: string[]) => {
    let items = allActivities.filter(a => types.includes(a.type));
    
    // For hotels, flights, and specific transit, we might want to prioritize metadata if available
    if (types.includes('hotel-checkin')) {
      const hotelItems = plan.metadata.accommodations.map(acc => ({
        id: acc.id,
        title: acc.hotelName || 'Unnamed Hotel',
        cost: acc.cost || 0,
        actualSpent: acc.actualSpent || 0,
        type: 'hotel-checkin',
        dayNumber: 0,
        time: ''
      }));
      if (hotelItems.length > 0) items = hotelItems as any;
    }

    if (types.includes('flight')) {
      const flightItems = plan.metadata.flights.legs.map(leg => ({
        id: leg.id,
        title: `${leg.airline || 'Flight'} ${leg.flightNumber}: ${leg.departureAirport} → ${leg.arrivalAirport}`,
        cost: leg.cost || 0,
        actualSpent: leg.actualSpent || 0,
        type: 'flight',
        dayNumber: 0,
        time: leg.departureTime
      }));
      if (flightItems.length > 0) items = flightItems as any;
    }

    const budgeted = items.reduce((acc, a) => acc + (a.cost || 0), 0);
    const actual = items.reduce((acc, a) => acc + (a.actualSpent || 0), 0);
    return { budgeted, actual, items };
  };

  const activityStats = getCategoryStats(['sightseeing', 'nature', 'relax', 'culture', 'shopping', 'other', 'arrival', 'departure']);
  const diningStats = getCategoryStats(['food', 'meal']);
  const flightStats = getCategoryStats(['flight', 'transport']);
  const hotelStats = getCategoryStats(['hotel-checkin', 'hotel-checkout']);

  const totalAct = activityStats.actual + diningStats.actual + flightStats.actual + hotelStats.actual;
  const totalBud = activityStats.budgeted + diningStats.budgeted + flightStats.budgeted + hotelStats.budgeted;

  const handleUpdateItem = (id: string, field: 'cost' | 'actualSpent', value: number) => {
    // Determine which pool to update
    if (drillDownCategory === 'hotels') {
      const newAcc = plan.metadata.accommodations.map(a => a.id === id ? { ...a, [field]: value } : a);
      onUpdatePlan({ ...plan, metadata: { ...plan.metadata, accommodations: newAcc } });
    } else if (drillDownCategory === 'flights') {
      const newFlights = plan.metadata.flights.legs.map(l => l.id === id ? { ...l, [field]: value } : l);
      onUpdatePlan({ ...plan, metadata: { ...plan.metadata, flights: { ...plan.metadata.flights, legs: newFlights } } });
    } else {
      const newDays = plan.days.map(d => ({
          ...d,
          activities: d.activities.map(a => a.id === id ? { ...a, [field]: value } : a)
      }));
      onUpdatePlan({ ...plan, days: newDays });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const newReceipt: Receipt = {
            id: Math.random().toString(),
            category: 'other',
            title: file.name,
            vendor: 'Manual Entry',
            date: new Date().toLocaleDateString(),
            amount: 0,
            fileData: base64,
            fileName: file.name,
            fileType: file.type
        };
        onUpdatePlan({ ...plan, receipts: [...(plan.receipts || []), newReceipt] });
    };
    reader.readAsDataURL(file);
  };

  const downloadReceipt = (r: Receipt) => {
    const link = document.createElement('a');
    link.href = r.fileData;
    link.download = r.fileName;
    link.click();
  };

  const CategorySummaryCard = ({ title, stats, id, color }: any) => (
    <div 
        onClick={() => setDrillDownCategory(drillDownCategory === id ? null : id)}
        className={`bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 p-10 shadow-sm cursor-pointer hover:shadow-xl transition-all group ${drillDownCategory === id ? 'ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
    >
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.3em]">{title}</h4>
        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${color}`}>
            {id === 'dining' ? '🥘' : id === 'flights' ? '✈️' : id === 'hotels' ? '🏨' : '🗺️'}
        </span>
      </div>
      <div className="flex items-end gap-3 mb-4 font-normal">
        <span className="text-3xl text-stone-900 dark:text-white">{curSym}{stats.actual.toLocaleString()}</span>
        <span className="text-stone-300 dark:text-stone-600 text-sm mb-2">/ {curSym}{stats.budgeted.toLocaleString()}</span>
      </div>
      <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-1000 ${stats.actual > stats.budgeted ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} style={{ width: `${Math.min(100, (stats.actual / (stats.budgeted || 1)) * 100)}%` }}></div>
      </div>
      <p className="mt-6 text-[10px] font-normal text-indigo-500 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Manage Detailed Items ➔</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-10 animate-fadeIn font-normal">
      <div className="flex justify-center gap-2 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl w-fit mx-auto shadow-inner border border-stone-200 dark:border-stone-700">
          <button onClick={() => {setActiveSubTab('overview'); setDrillDownCategory(null);}} className={`px-10 py-3 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${activeSubTab === 'overview' ? 'bg-white dark:bg-stone-900 shadow-md text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}>Overview</button>
          <button onClick={() => {setActiveSubTab('receipts'); setDrillDownCategory(null);}} className={`px-10 py-3 rounded-xl text-xs font-normal uppercase tracking-widest transition-all ${activeSubTab === 'receipts' ? 'bg-white dark:bg-stone-900 shadow-md text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}>Receipts ({plan.receipts?.length || 0})</button>
      </div>

      {activeSubTab === 'overview' ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-stone-900 dark:bg-indigo-600 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-12 -bottom-12 opacity-10 group-hover:rotate-12 group-hover:scale-125 transition-all duration-700 text-8xl">💰</div>
               <p className="text-[10px] font-normal text-stone-400 dark:text-indigo-200 uppercase tracking-[0.3em] mb-3">Total Trip Goal</p>
               <p className="text-3xl font-normal">{curSym}{budgetGoal.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 p-10 rounded-[3rem] border border-stone-100 dark:border-stone-800 shadow-sm">
               <p className="text-[10px] font-normal text-stone-400 uppercase tracking-[0.3em] mb-3">Est. Itinerary Total</p>
               <p className="text-3xl font-normal text-stone-900 dark:text-white">{curSym}{totalBud.toLocaleString()}</p>
            </div>
            <div className={`p-10 rounded-[3rem] border shadow-2xl transition-all ${totalAct > budgetGoal ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
               <p className={`text-[10px] font-normal uppercase tracking-[0.3em] mb-3 ${totalAct > budgetGoal ? 'text-rose-400' : 'text-emerald-500'}`}>Actual Spent</p>
               <p className={`text-3xl font-normal ${totalAct > budgetGoal ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{curSym}{totalAct.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <CategorySummaryCard title="Activities & Culture" stats={activityStats} id="activities" color="bg-rose-50 dark:bg-rose-900/30 text-rose-500" />
             <CategorySummaryCard title="Food & Dining" stats={diningStats} id="dining" color="bg-orange-50 dark:bg-orange-900/30 text-orange-500" />
             <CategorySummaryCard title="Flights & Transportation" stats={flightStats} id="flights" color="bg-sky-50 dark:bg-sky-900/30 text-sky-500" />
             <CategorySummaryCard title="Hotels & Stays" stats={hotelStats} id="hotels" color="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500" />
          </div>

          {drillDownCategory && (
            <div className="bg-white dark:bg-stone-900 rounded-[3.5rem] border border-stone-200 dark:border-stone-800 p-12 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] animate-slideUp">
               <div className="flex justify-between items-center mb-12">
                  <h4 className="text-3xl font-bold text-stone-900 dark:text-white">Manage {drillDownCategory.charAt(0).toUpperCase() + drillDownCategory.slice(1)} Items</h4>
                  <button onClick={() => setDrillDownCategory(null)} className="text-stone-300 dark:text-stone-700 hover:text-stone-900 dark:hover:text-stone-100 font-normal transition-colors">✕ Close Manager</button>
               </div>
               <div className="space-y-6 max-h-[550px] overflow-y-auto pr-6 custom-scrollbar font-normal">
                  {(drillDownCategory === 'activities' ? activityStats : drillDownCategory === 'dining' ? diningStats : drillDownCategory === 'flights' ? flightStats : hotelStats).items.map(item => (
                    <div key={item.id} className="bg-stone-50 dark:bg-stone-800/50 p-8 rounded-3xl border border-stone-100 dark:border-stone-700 flex flex-col md:flex-row md:items-center justify-between gap-8 group">
                       <div className="flex-1">
                          {item.dayNumber > 0 && (
                             <div className="flex items-center gap-3 mb-2">
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-[9px] font-normal uppercase tracking-widest">Day {item.dayNumber}</span>
                                <p className="text-[10px] font-normal text-stone-400 uppercase tracking-widest">{item.time}</p>
                             </div>
                          )}
                          <p className="text-lg font-normal text-stone-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {item.title}
                          </p>
                       </div>
                       <div className="flex items-center gap-8 font-normal">
                          <div className="text-right">
                             <label className="text-[10px] font-normal text-stone-400 uppercase block mb-2 tracking-widest">Planned Budget</label>
                             <div className="flex items-center gap-2 bg-white dark:bg-stone-900 px-4 py-2.5 rounded-2xl border dark:border-stone-700 shadow-inner">
                                <span className="text-xs font-normal text-stone-400">{curSym}</span>
                                <input type="number" className="text-sm font-normal bg-transparent w-24 outline-none dark:text-white" value={item.cost} onChange={e => handleUpdateItem(item.id, 'cost', Number(e.target.value))} />
                             </div>
                          </div>
                          <div className="text-right">
                             <label className="text-[10px] font-normal text-stone-400 uppercase block mb-2 tracking-widest">Actual Expense</label>
                             <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-inner">
                                <span className="text-xs font-normal text-indigo-400">{curSym}</span>
                                <input type="number" className="text-sm font-normal bg-transparent w-24 outline-none text-indigo-600 dark:text-indigo-300" value={item.actualSpent} onChange={e => handleUpdateItem(item.id, 'actualSpent', Number(e.target.value))} />
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 animate-slideUp">
           <div className="flex flex-col md:flex-row justify-between items-center gap-8 px-6">
              <h4 className="text-4xl font-bold text-stone-900 dark:text-white">Receipt Vault 📑</h4>
              <div className="flex gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-10 py-5 rounded-2xl text-xs font-normal uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition active:scale-95">Upload New Receipt</button>
                {plan.receipts && plan.receipts.length > 0 && (
                  <button onClick={() => plan.receipts?.forEach(downloadReceipt)} className="px-10 py-5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-2xl text-xs font-normal uppercase tracking-widest shadow-xl hover:bg-black dark:hover:bg-white transition active:scale-95">Archive All</button>
                )}
              </div>
              <input type="file" hide="true" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2 font-normal">
              {plan.receipts?.length === 0 ? (
                <div className="col-span-full py-32 bg-stone-50 dark:bg-stone-900/50 border-4 border-dashed border-stone-100 dark:border-stone-800 rounded-[4rem] text-center flex flex-col items-center justify-center">
                   <span className="text-7xl mb-6 opacity-20">📑</span>
                   <p className="text-stone-400 dark:text-stone-600 font-normal uppercase tracking-[0.3em]">No digitized receipts found.</p>
                   <p className="text-xs text-stone-400 mt-2 font-normal">Upload photos to automatically track spending per category.</p>
                </div>
              ) : (
                plan.receipts?.map(r => (
                  <div key={r.id} className="bg-white dark:bg-stone-900 border dark:border-stone-800 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between group hover:shadow-2xl hover:scale-[1.03] transition-all">
                     <div className="mb-8 font-normal">
                       <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:rotate-12 group-hover:scale-110 transition-transform shadow-sm">📄</div>
                       <p className="text-xl font-normal text-stone-900 dark:text-white line-clamp-1">{r.title}</p>
                       <p className="text-[10px] text-stone-400 dark:text-stone-600 font-normal uppercase tracking-[0.2em] mt-2">{r.date} • {r.vendor}</p>
                     </div>
                     <button onClick={() => downloadReceipt(r)} className="w-full py-5 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-2xl text-[10px] font-normal uppercase tracking-widest shadow-lg group-hover:bg-black dark:group-hover:bg-white transition active:scale-95">Download PDF/Image</button>
                  </div>
                ))
              )}
           </div>
        </div>
      )}
    </div>
  );
};
