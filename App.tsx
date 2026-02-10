
import React, { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { AssistantChat } from './components/AssistantChat';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { TripRequest, TripPlan } from './types';
import { generateTripPlan } from './services/gemini';

// Correct colored OpenTrip logo recreated via SVG Data URI
const LOGO_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTYwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ0cmlwR3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzA2YjZkNDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNGFkZTgwO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHRleHQgeD0iMCIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI2MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiMxYzE5MTciIGxldHRlci1zcGFjaW5nPSItMiI+b3BlbjwvdGV4dD4KICA8dGV4dCB4PSI4NSIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI2MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9InVybCgjdHJpcEdyYWRpZW50KSIgbGV0dGVyLXNwYWNpbmc9Ii0yIj50cmlwPC90ZXh0Pgo8L3N2Zz4=";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'form' | 'itinerary' | 'history' | 'settings'>('form');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>(() => {
    const saved = localStorage.getItem('opentrip_saved_trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [groundingUrls, setGroundingUrls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPro, setIsPro] = useState(() => localStorage.getItem('opentrip_is_pro') === 'true');
  const [historyStack, setHistoryStack] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('opentrip_saved_trips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  useEffect(() => {
    localStorage.setItem('opentrip_is_pro', isPro.toString());
  }, [isPro]);

  const saveToHistoryStack = (plan: TripPlan) => {
    setHistoryStack(prev => [...prev, JSON.stringify(plan)]);
  };

  const undoLastChange = () => {
    if (!isPro || historyStack.length < 1) return;
    const previousState = historyStack[historyStack.length - 1];
    const restored = JSON.parse(previousState);
    setTripPlan(restored);
    setSavedTrips(prev => prev.map(t => t.id === restored.id ? restored : t));
    setHistoryStack(prev => prev.slice(0, -1));
  };

  const handleTripSubmit = async (request: TripRequest) => {
    setLoading(true);
    setError(null);
    try {
      const { plan, groundingUrls: urls } = await generateTripPlan(request);

      if (!plan || !Array.isArray(plan.days)) {
        throw new Error("Failed to generate a structured itinerary.");
      }
      
      const newId = Math.random().toString(36).substr(2, 9);
      plan.id = newId;
      plan.createdAt = Date.now();
      
      plan.days.forEach(day => {
        if (day.activities) {
          day.activities.forEach(a => { if (!a.id) a.id = Math.random().toString(36).substr(2, 9); });
        }
      });

      // Pass the initial budget overrides from the form request to ensure consistency in Budget section
      plan.budgetOverrides = {
        flightCost: request.flightBudget,
        accommodationCost: request.hotelBudget,
        includeFlight: request.includeFlightBudget,
        includeAccommodation: request.includeHotelBudget,
        activityCosts: {}
      };

      const finalPlan: TripPlan = { ...plan, tier: isPro ? 'pro' : 'free' };
      setTripPlan(finalPlan);
      
      if (isPro) {
        setSavedTrips(prev => [finalPlan, ...prev]);
      } else {
        setSavedTrips([finalPlan]);
      }

      setGroundingUrls(urls);
      setHistoryStack([]); 
      setCurrentView('itinerary');
    } catch (err: any) {
      setError(err.message || "Error crafting your trip.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanUpdate = (newPlan: TripPlan) => {
    if (tripPlan) saveToHistoryStack(tripPlan);
    setTripPlan(newPlan);
    setSavedTrips(prev => prev.map(t => t.id === newPlan.id ? newPlan : t));
  };

  const handleDuplicateTrip = (trip: TripPlan) => {
    if (!isPro) return;
    const duplicated = { 
      ...trip, 
      id: Math.random().toString(36).substr(2, 9), 
      tripTitle: `${trip.tripTitle} (Copy)`,
      createdAt: Date.now() 
    };
    setSavedTrips(prev => [duplicated, ...prev]);
  };

  const handleDeleteTrip = (id: string) => {
    setSavedTrips(prev => prev.filter(t => t.id !== id));
    if (tripPlan?.id === id) setTripPlan(null);
  };

  const handleKeySwap = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      window.location.reload();
    }
  };

  const handleShare = () => {
    if (!isPro) return;
    const url = `${window.location.origin}/share/${tripPlan?.id}`;
    navigator.clipboard.writeText(url);
    alert('Share link (view-only) copied to clipboard! 🔗');
  };

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 font-sans antialiased">
      <nav className="max-w-6xl mx-auto mb-16 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setCurrentView('form')}>
            <div className="h-10 md:h-12 transition-transform group-hover:scale-105">
               <img src={LOGO_DATA_URI} alt="OpenTrip Logo" className="h-full w-auto object-contain" />
            </div>
         </div>
         <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('history')} className="text-xs font-bold text-stone-400 hover:text-stone-900 transition px-3">History</button>
            <button onClick={() => setCurrentView('settings')} className="text-xs font-bold text-stone-400 hover:text-stone-900 transition px-3">Settings</button>
            
            {currentView === 'itinerary' && isPro && (
              <button 
                onClick={handleShare}
                className="bg-sky-50 text-sky-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-sky-100 hover:bg-sky-100 transition"
              >
                Share 🔗
              </button>
            )}

            <button 
              onClick={handleKeySwap}
              title="Update API Key"
              className="p-3 bg-white border border-stone-200 rounded-xl text-stone-400 hover:text-stone-900 transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
            
            {!isPro && (
              <button 
                onClick={() => setIsPro(true)}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition"
              >
                Go Pro 🚀
              </button>
            )}
            {isPro && (
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-200">
                PRO Member
              </span>
            )}
         </div>
      </nav>

      <main className="max-w-6xl mx-auto">
        {error && (
          <div className="mb-10 bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-3xl text-center font-bold animate-pulse">
            <div className="text-2xl mb-2">⚠️</div>
            {error}
          </div>
        )}
        
        {currentView === 'form' && <TripForm onSubmit={handleTripSubmit} isLoading={loading} />}
        
        {currentView === 'itinerary' && tripPlan && (
          <ItineraryDisplay 
            plan={tripPlan} 
            groundingUrls={groundingUrls} 
            onReset={() => setCurrentView('form')}
            isPro={isPro}
            onUpgrade={() => setIsPro(true)}
            onUpdatePlan={handlePlanUpdate}
            canUndo={historyStack.length > 0}
            onUndo={undoLastChange}
            onShare={handleShare}
          />
        )}

        {currentView === 'history' && (
          <HistoryPage 
            trips={savedTrips} 
            isPro={isPro} 
            onView={(t) => { setTripPlan(t); setCurrentView('itinerary'); }}
            onDuplicate={handleDuplicateTrip}
            onDelete={handleDeleteTrip}
            onUpgrade={() => setIsPro(true)}
          />
        )}

        {currentView === 'settings' && (
          <SettingsPage 
            isPro={isPro} 
            onUpgrade={() => setIsPro(true)} 
            onResetData={() => { setSavedTrips([]); setTripPlan(null); }}
          />
        )}
      </main>

      {tripPlan && <AssistantChat plan={tripPlan} isPro={isPro} onUpgrade={() => setIsPro(true)} />}

      <footer className="mt-20 text-center pb-20">
         <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">© 2025 OpenTrip.ai • Built with Gemini 3 Pro</p>
      </footer>
    </div>
  );
};

export default App;
