import React, { useState, useRef, useEffect } from 'react';
import { TripPlan, Receipt, DayActivity, FlightLeg, AccommodationDetails } from '../types';

interface BudgetDashboardProps {
  plan: TripPlan;
  onUpdatePlan: (newPlan: TripPlan) => void;
  isPro: boolean;
  onUpgrade?: () => void;
}

const getCurrencySymbol = (c: string) => (c || "").match(/\((.*?)\)/)?.[1] || (c || "").split(' ')[0] || "$";

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ plan, onUpdatePlan, isPro, onUpgrade }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'breakdown' | 'receipts'>('overview');
  const [categoryTab, setCategoryTab] = useState<'flight' | 'hotel' | 'food' | 'activity' | 'transport'>('activity');
  const [isEditing, setIsEditing] = useState(false);
  const [localPlan, setLocalPlan] = useState<TripPlan>(plan);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  
  const [uploadForm, setUploadForm] = useState<{
    id: string;
    title: string;
    vendor: string;
    amount: number;
    activityId: string;
    fileData: string;
    fileName: string;
    fileType: string;
    category: Receipt['category'];
  }>({
    id: '', title: '', vendor: '', amount: 0, activityId: '', fileData: '', fileName: '', fileType: '', category: 'activity'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPlan(plan);
  }, [plan]);

  const curSym = getCurrencySymbol(plan.currency);
  const allActivities = localPlan.days.flatMap(d => d.activities.map(a => ({...a, dayNumber: d.dayNumber})));

  const categories = [
    { name: 'Flights', icon: '✈️', key: 'flight' },
    { name: 'Accommodation', icon: '🏨', key: 'hotel' },
    { name: 'Dining', icon: '🥘', key: 'food' },
    { name: 'Activities', icon: '🎡', key: 'activity' },
    { name: 'Transport', icon: '🚕', key: 'transport' },
  ];

  const getStats = () => {
    let stats = {
      flight: { budgeted: 0, spent: 0 },
      hotel: { budgeted: 0, spent: 0 },
      food: { budgeted: 0, spent: 0 },
      activity: { budgeted: 0, spent: 0 },
      transport: { budgeted: 0, spent: 0 },
    };

    localPlan.metadata.flights.legs.forEach(leg => {
      stats.flight.budgeted += leg.cost || 0;
      stats.flight.spent += leg.actualSpent || 0;
    });

    localPlan.metadata.accommodations.forEach(acc => {
      stats.hotel.budgeted += acc.cost || 0;
      stats.hotel.spent += acc.actualSpent || 0;
    });

    allActivities.forEach(act => {
      const type = act.type;
      if (type === 'food' || type === 'meal') {
        stats.food.budgeted += act.cost || 0;
        stats.food.spent += act.actualSpent || 0;
      } else if (type === 'transport') {
        stats.transport.budgeted += act.cost || 0;
        stats.transport.spent += act.actualSpent || 0;
      } else if (type !== 'flight' && type !== 'hotel-checkin' && type !== 'hotel-checkout') {
        stats.activity.budgeted += act.cost || 0;
        stats.activity.spent += act.actualSpent || 0;
      }
    });

    localPlan.receipts?.forEach(r => {
        if (!r.activityId && stats[r.category]) {
            stats[r.category].spent += r.amount;
        }
    });

    return stats;
  };

  const stats = getStats();
  const totalBudgeted = Object.values(stats).reduce((sum, s) => sum + s.budgeted, 0) || localPlan.metadata.budget || 0;
  const totalSpent = Object.values(stats).reduce((sum, s) => sum + s.spent, 0);

  const handleUpdateActivityValue = (activityId: string, field: 'cost' | 'actualSpent', val: number) => {
    const updatedDays = localPlan.days.map(d => ({
        ...d,
        activities: d.activities.map(a => a.id === activityId ? { ...a, [field]: val } : a)
    }));
    setLocalPlan({ ...localPlan, days: updatedDays });
  };

  const handleUpdateFlightValue = (legId: string, field: 'cost' | 'actualSpent', val: number) => {
    const updatedLegs = localPlan.metadata.flights.legs.map(l => l.id === legId ? { ...l, [field]: val } : l);
    setLocalPlan({ ...localPlan, metadata: { ...localPlan.metadata, flights: { ...localPlan.metadata.flights, legs: updatedLegs } } });
  };

  const handleUpdateHotelValue = (accId: string, field: 'cost' | 'actualSpent', val: number) => {
    const updatedAccs = localPlan.metadata.accommodations.map(a => a.id === accId ? { ...a, [field]: val } : a);
    setLocalPlan({ ...localPlan, metadata: { ...localPlan.metadata, accommodations: updatedAccs } });
  };

  const saveAll = () => {
    onUpdatePlan(localPlan);
    setIsEditing(false);
  };

  const submitReceipt = () => {
    if (uploadForm.amount <= 0 || !uploadForm.vendor) {
      alert("Vendor and Amount required.");
      return;
    }
    const receipt: Receipt = {
        id: uploadForm.id || Math.random().toString(36).substr(2, 9),
        category: uploadForm.category, 
        title: uploadForm.title || uploadForm.vendor,
        vendor: uploadForm.vendor,
        date: new Date().toLocaleDateString(),
        amount: uploadForm.amount,
        fileData: uploadForm.fileData,
        fileName: uploadForm.fileName,
        fileType: uploadForm.fileType,
        activityId: uploadForm.activityId
    };

    let updatedReceipts = [...(localPlan.receipts || [])];
    if (uploadForm.id) {
        updatedReceipts = updatedReceipts.map(r => r.id === uploadForm.id ? receipt : r);
    } else {
        updatedReceipts.push(receipt);
    }

    let updatedPlan = { ...localPlan, receipts: updatedReceipts };
    onUpdatePlan(updatedPlan);
    setShowUploadModal(false);
    setUploadForm({ id: '', title: '', vendor: '', amount: 0, activityId: '', fileData: '', fileName: '', fileType: '', category: 'activity' });
  };

  const handleEditReceipt = (r: Receipt) => {
    setUploadForm({
      id: r.id,
      title: r.title,
      vendor: r.vendor,
      amount: r.amount,
      activityId: r.activityId || '',
      fileData: r.fileData,
      fileName: r.fileName,
      fileType: r.fileType,
      category: r.category
    });
    setShowUploadModal(true);
  };

  const renderBreakdownItems = () => {
    if (categoryTab === 'flight') {
      return localPlan.metadata.flights.legs.map(leg => (
        <BudgetRow key={leg.id} title={`${leg.airline || 'Flight'} ${leg.flightNumber}`} budgeted={leg.cost || 0} actual={leg.actualSpent || 0} isEditing={isEditing} curSym={curSym} onUpdate={(field, val) => handleUpdateFlightValue(leg.id, field, val)} />
      ));
    }
    if (categoryTab === 'hotel') {
      return localPlan.metadata.accommodations.map(acc => (
        <BudgetRow key={acc.id} title={acc.hotelName || 'Accommodation'} budgeted={acc.cost || 0} actual={acc.actualSpent || 0} isEditing={isEditing} curSym={curSym} onUpdate={(field, val) => handleUpdateHotelValue(acc.id, field, val)} />
      ));
    }
    return allActivities.filter(a => {
        if (categoryTab === 'food') return a.type === 'food' || a.type === 'meal';
        if (categoryTab === 'transport') return a.type === 'transport';
        return a.type !== 'flight' && a.type !== 'hotel-checkin' && a.type !== 'hotel-checkout' && a.type !== 'food' && a.type !== 'meal' && a.type !== 'transport';
    }).map(act => (
        <BudgetRow key={act.id} title={`Day ${act.dayNumber}: ${act.title}`} budgeted={act.cost || 0} actual={act.actualSpent || 0} isEditing={isEditing} curSym={curSym} onUpdate={(field, val) => handleUpdateActivityValue(act.id, field, val)} />
    ));
  };

  return (
    <div className="p-4 space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-3 bg-stone-100 dark:bg-stone-800 p-2 rounded-2xl shadow-inner border border-stone-200 dark:border-stone-700">
            <button onClick={() => setActiveSubTab('overview')} className={`px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeSubTab === 'overview' ? 'bg-white dark:bg-stone-900 shadow-md text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}>Overview</button>
            <button onClick={() => setActiveSubTab('breakdown')} className={`px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeSubTab === 'breakdown' ? 'bg-white dark:bg-stone-900 shadow-md text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}>Tracking</button>
            <button onClick={() => setActiveSubTab('receipts')} className={`px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${activeSubTab === 'receipts' ? 'bg-white dark:bg-stone-900 shadow-md text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}>Receipt Vault {!isPro && '💎'}</button>
        </div>
        {activeSubTab === 'breakdown' && (
            <button onClick={() => isEditing ? saveAll() : setIsEditing(true)} className={`${isEditing ? 'bg-emerald-600' : 'bg-indigo-600'} text-white px-10 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95`}>
              {isEditing ? '✓ Save Changes' : 'Edit Budgets'}
            </button>
        )}
      </div>

      {activeSubTab === 'overview' && (
        <div className="space-y-8">
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md p-12 rounded-[3.5rem] border dark:border-stone-800 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-12">
             <div className="space-y-3">
                <p className="text-xs text-stone-400 uppercase font-black tracking-[0.2em]">Total Budgeted</p>
                <p className="text-6xl font-black text-stone-900 dark:text-white leading-none">{curSym}{totalBudgeted.toLocaleString()}</p>
             </div>
             <div className="space-y-3">
                <p className="text-xs text-indigo-400 uppercase font-black tracking-[0.2em]">Actual Spent</p>
                <p className="text-6xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{curSym}{totalSpent.toLocaleString()}</p>
             </div>
             <div className="space-y-3">
                <p className="text-xs text-emerald-400 uppercase font-black tracking-[0.2em]">Balance</p>
                <p className={`text-6xl font-black leading-none ${totalBudgeted - totalSpent < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {curSym}{(totalBudgeted - totalSpent).toLocaleString()}
                </p>
             </div>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md p-12 rounded-[3.5rem] border dark:border-stone-800 shadow-xl">
             <h3 className="text-2xl font-black mb-10 tracking-tight">Category Spending Progress</h3>
             <div className="space-y-10">
               {categories.map(cat => {
                 const s = stats[cat.key];
                 const pct = s.budgeted > 0 ? Math.min(100, (s.spent / s.budgeted) * 100) : 0;
                 return (
                   <div key={cat.key} className="space-y-4">
                     <div className="flex justify-between items-end">
                       <div className="flex items-center gap-4">
                         <span className="text-3xl">{cat.icon}</span>
                         <span className="text-xl font-bold text-stone-800 dark:text-stone-100">{cat.name}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-sm font-black text-stone-400 tracking-widest">{curSym}{s.spent.toLocaleString()} / {curSym}{s.budgeted.toLocaleString()}</span>
                       </div>
                     </div>
                     <div className="h-5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border dark:border-stone-700 p-1">
                       <div className={`h-full rounded-full transition-all duration-1000 ${s.spent > s.budgeted && s.budgeted > 0 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct || (s.spent > 0 ? 100 : 0)}%` }} />
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}

      {activeSubTab === 'breakdown' && (
        <div className="space-y-8">
           <div className="flex flex-wrap gap-3 justify-center">
              {categories.map(cat => (
                  <button key={cat.key} onClick={() => setCategoryTab(cat.key as any)} className={`px-7 py-3 rounded-2xl text-sm font-black transition-all border ${categoryTab === cat.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-110' : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-400'}`}>
                    {cat.icon} {cat.name}
                  </button>
              ))}
           </div>
           <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[3rem] border dark:border-stone-800 shadow-2xl overflow-hidden">
              <div className="p-8 bg-stone-50 dark:bg-stone-800/50 border-b dark:border-stone-700 grid grid-cols-12 gap-6 text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                 <div className="col-span-6">Item Description</div>
                 <div className="col-span-3 text-right">Budgeted</div>
                 <div className="col-span-3 text-right">Actual Spent</div>
              </div>
              <div className="divide-y dark:divide-stone-800">
                 {renderBreakdownItems()}
              </div>
           </div>
        </div>
      )}

      {activeSubTab === 'receipts' && (
        <div className="relative min-h-[500px]">
           <div className={`space-y-8 ${!isPro ? 'blur-md pointer-events-none' : ''}`}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white dark:bg-stone-900 p-10 rounded-[3rem] border dark:border-stone-800 shadow-xl">
                 <div>
                   <h4 className="text-3xl font-black text-stone-900 dark:text-white leading-tight mb-2">Receipt Vault 📑</h4>
                   <p className="text-lg text-stone-500 font-normal">Securely manage your trip documents and spending.</p>
                 </div>
                 <div className="flex gap-3">
                   <button className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-stone-200 transition">Export CSV</button>
                   <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition">Upload New</button>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {/* Empty state for receipts */}
                 <div className="col-span-full py-20 text-center text-stone-400 uppercase tracking-widest text-sm font-bold border-4 border-dashed border-stone-200 rounded-[3rem]">No receipts uploaded yet</div>
              </div>
           </div>
           
           {!isPro && (
             <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="bg-white/95 dark:bg-stone-900/95 p-12 rounded-[4rem] shadow-2xl border-4 border-indigo-600 max-w-lg text-center animate-slideUp">
                   <span className="text-7xl mb-8 block">📸</span>
                   <h4 className="text-3xl font-black mb-4">Receipt Vault Locked</h4>
                   <p className="text-stone-500 mb-10 leading-relaxed">
                     Keep all your travel expenses organized. Upload receipts, link them to activities, and export everything to CSV with OpenTrip Pro.
                   </p>
                   <button onClick={onUpgrade} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Go Pro to Unlock</button>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const BudgetRow: React.FC<{ title: string; budgeted: number; actual: number; isEditing: boolean; curSym: string; onUpdate: (field: 'cost' | 'actualSpent', val: number) => void; }> = ({ title, budgeted, actual, isEditing, curSym, onUpdate }) => (
    <div className="p-8 grid grid-cols-12 gap-6 items-center hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
        <div className="col-span-6 font-black text-stone-800 dark:text-stone-100 text-lg leading-tight">{title}</div>
        <div className="col-span-3 text-right">
            {isEditing ? (
                <input type="number" value={budgeted} onChange={e => onUpdate('cost', Number(e.target.value))} className="w-full py-3 text-right text-lg bg-white dark:bg-stone-900 border dark:border-stone-700 rounded-xl px-4 outline-none dark:text-white font-black" />
            ) : (
                <span className="text-lg font-bold text-stone-400">{curSym}{budgeted.toLocaleString()}</span>
            )}
        </div>
        <div className="col-span-3 text-right">
            {isEditing ? (
                <input type="number" value={actual} onChange={e => onUpdate('actualSpent', Number(e.target.value))} className="w-full py-3 text-right text-lg bg-white dark:bg-stone-900 border dark:border-stone-700 rounded-xl px-4 outline-none dark:text-white font-black" />
            ) : (
                <span className={`text-2xl font-black ${actual > budgeted && budgeted > 0 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{curSym}{actual.toLocaleString()}</span>
            )}
        </div>
    </div>
);