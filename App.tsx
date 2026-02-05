import React, { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { AssistantChat } from './components/AssistantChat';
import { TripRequest, TripPlan } from './types';
import { generateTripPlan } from './services/gemini';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'form' | 'itinerary'>('form');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gating & Rewind States
  const [isPro, setIsPro] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#plan=')) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(hash.replace('#plan=', '')))));
        setTripPlan(decoded);
        setCurrentView('itinerary');
      } catch (e) {}
    }
  }, []);

  const saveToHistory = (plan: TripPlan) => {
    setHistory(prev => {
      const newStack = [...prev, JSON.stringify(plan)];
      // Keep only last 10 for performance if needed, but for now just append
      return newStack;
    });
  };

  const undoLastChange = () => {
    if (!isPro || history.length < 1) return;
    const previousState = history[history.length - 1];
    setTripPlan(JSON.parse(previousState));
    setHistory(prev => prev.slice(0, -1));
  };

  const handleTripSubmit = async (request: TripRequest) => {
    setLoading(true);
    setError(null);
    try {
      const { plan, groundingUrls: urls } = await generateTripPlan(request);

      // Defensively ensure plan and days exist before processing
      if (!plan || !Array.isArray(plan.days)) {
        throw new Error("Invalid trip plan structure received from AI.");
      }
      
      // Add client-side IDs if missing to ensure key stability
      plan.days.forEach(day => {
        if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach(activity => {
              if (!activity.id) {
                activity.id = Math.random().toString(36).substr(2, 9);
              }
            });
        }
      });

      // Initialize tier
      const finalPlan = { ...plan, tier: isPro ? 'pro' : 'free' };
      setTripPlan(finalPlan);
      setGroundingUrls(urls);
      setHistory([]); // Clear history on new trip
      setCurrentView('itinerary');
    } catch (err: any) {
      setError("We encountered an error crafting your trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanUpdate = (newPlan: TripPlan) => {
    if (tripPlan) saveToHistory(tripPlan);
    setTripPlan(newPlan);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 font-sans antialiased">
      <nav className="max-w-5xl mx-auto mb-16 flex items-center justify-between">
         <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setCurrentView('form')}>
            <div className="w-14 h-14 bg-stone-900 rounded-3xl flex items-center justify-center text-white text-3xl shadow-2xl transition-transform group-hover:scale-110">
               🤝
            </div>
            <div>
               <h1 className="text-3xl font-black text-stone-900 tracking-tighter">PlanBuddy</h1>
               <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Collaborative AI Travel</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            {!isPro && (
              <button 
                onClick={() => setIsPro(true)}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-orange-100 hover:scale-105 transition"
              >
                Go Pro 🚀
              </button>
            )}
            {isPro && (
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200">
                PRO Member
              </span>
            )}
         </div>
      </nav>

      <main className="max-w-5xl mx-auto">
        {error && <div className="mb-10 bg-rose-50 border border-rose-200 text-rose-600 p-6 rounded-3xl text-center font-bold">{error}</div>}
        {currentView === 'form' ? (
          <TripForm onSubmit={handleTripSubmit} isLoading={loading} />
        ) : (
          tripPlan && (
            <ItineraryDisplay 
              plan={tripPlan} 
              groundingUrls={groundingUrls} 
              onReset={() => setCurrentView('form')}
              isPro={isPro}
              onUpgrade={() => setIsPro(true)}
              onUpdatePlan={handlePlanUpdate}
              canUndo={history.length > 0}
              onUndo={undoLastChange}
            />
          )
        )}
      </main>

      {tripPlan && <AssistantChat plan={tripPlan} />}

      <footer className="mt-20 text-center pb-20">
         <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">© 2025 PlanBuddy.com • AI-Driven Real-Time Itineraries</p>
      </footer>
    </div>
  );
};

export default App;