
import React, { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { AssistantChat } from './components/AssistantChat';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { TripRequest, TripPlan } from './types';
import { generateTripPlan } from './services/gemini';

const LOGO_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTYwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ0cmlwR3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzA2YjZkNDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNGFkZTgwO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHRleHQgeD0iMCIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiMxYzE5MTciIGxldHRlci1zcGFjaW5nPSItMiI+b3BlbjwvdGV4dD4KICA8dGV4dCB4PSI4NSIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9InVybCgjdHJpcEdyYWRpZW50KSIgbGV0dGVyLXNwYWNpbmc9Ii0yIj50cmlwPC90ZXh0Pgo8L3N2Zz4=";
const DARK_LOGO_DATA_URI = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTYwIDUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ0cmlwR3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzA2YjZkNDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNGFkZTgwO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHRleHQgeD0iMCIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9IiNmZmZmZmYiIGxldHRlci1zcGFjaW5nPSItMiI+b3BlbjwvdGV4dD4KICA8dGV4dCB4PSI4NSIgeT0iNDAiIGZvbnQtZmFtaWx5PSInRnJlZG9rYScsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI0MDAiIGZvbnQtc2l6ZT0iNDAiIGZpbGw9InVybCgjdHJpcEdyYWRpZW50KSIgbGV0dGVyLXNwYWNpbmc9Ii0yIj50cmlwPC90ZXh0Pgo8L3N2Zz4=";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'form' | 'itinerary' | 'history' | 'settings'>('form');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('opentrip_theme') === 'dark');
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>(() => {
    const local = localStorage.getItem('opentrip_saved_trips');
    return local ? JSON.parse(local) : [];
  });
  const [tripLoading, setTripLoading] = useState(false);
  const [isPro, setIsPro] = useState(() => localStorage.getItem('opentrip_is_pro') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('opentrip_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('opentrip_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('opentrip_saved_trips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  useEffect(() => {
    localStorage.setItem('opentrip_is_pro', String(isPro));
  }, [isPro]);

  const handleTripSubmit = async (request: TripRequest) => {
    setTripLoading(true);
    try {
      const { plan } = await generateTripPlan(request);
      plan.metadata = { 
        ...plan.metadata, 
        travelers: request.travelers, 
        dates: request.dates 
      };
      plan.budgetOverrides = {
        flightCost: request.flightBudget,
        accommodationCost: request.hotelBudget,
        includeFlight: request.includeFlightBudget,
        includeAccommodation: request.includeHotelBudget
      };
      
      const newPlan = { ...plan, id: Math.random().toString(36).substr(2, 9) };
      setSavedTrips(prev => [newPlan, ...prev]);
      setTripPlan(newPlan);
      setCurrentView('itinerary');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTripLoading(false);
    }
  };

  const handleUpdatePlan = (newPlan: TripPlan) => {
    setTripPlan(newPlan);
    setSavedTrips(prev => prev.map(t => t.id === newPlan.id ? newPlan : t));
  };

  const handleDeleteTrip = (id: string) => {
    setSavedTrips(prev => prev.filter(t => t.id !== id));
    if (tripPlan?.id === id) setTripPlan(null);
  };

  const handleResetData = () => {
    if (confirm('Permanently delete all trips? This cannot be undone.')) {
      setSavedTrips([]);
      setTripPlan(null);
      setCurrentView('form');
    }
  };

  const handleUpgrade = () => {
    setIsPro(true);
    alert("OpenTrip Pro activated for this local session! (Demo Mode)");
  };

  // Helper to determine text colors based on the current view/background
  const isFormView = currentView === 'form';
  const navTextColor = isFormView ? 'text-white' : 'text-stone-900 dark:text-stone-100';
  const navInactiveColor = isFormView ? 'text-white/80' : 'text-stone-400 dark:text-stone-500';
  const navShadow = isFormView ? 'drop-shadow-md' : '';

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-10 px-4 transition-colors duration-300 relative">
      {/* Maui Oceanfront Background for Form View */}
      {isFormView && !tripLoading && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden animate-fadeIn">
          <img 
            src="https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?auto=format&fit=crop&w=2400&q=80" 
            className="w-full h-full object-cover" 
            alt="Maui Oceanfront"
          />
          <div className="absolute inset-0 bg-stone-100/30 dark:bg-stone-950/40 backdrop-blur-[1px]"></div>
          {/* Subtle gradient to ease into the content */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-stone-50 dark:to-stone-950"></div>
        </div>
      )}

      <nav className="max-w-6xl mx-auto mb-16 flex justify-between items-center relative z-10">
         <img 
           src={darkMode ? DARK_LOGO_DATA_URI : LOGO_DATA_URI} 
           alt="Logo" 
           className={`h-10 cursor-pointer transition-all ${navShadow}`} 
           onClick={() => setCurrentView('form')} 
         />
         <div className="flex gap-8 items-center">
            <button 
              onClick={() => setCurrentView('history')} 
              className={`text-xs font-normal uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${navShadow} ${currentView === 'history' ? `${navTextColor} border-b-2 border-indigo-400 pb-1` : `${navInactiveColor} hover:${navTextColor}`}`}
            >
              History
            </button>
            <button 
              onClick={() => setCurrentView('settings')} 
              className={`text-xs font-normal uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${navShadow} ${currentView === 'settings' ? `${navTextColor} border-b-2 border-indigo-400 pb-1` : `${navInactiveColor} hover:${navTextColor}`}`}
            >
              Settings
            </button>
            {!isPro && (
              <button 
                onClick={handleUpgrade}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-normal uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl hover:scale-105 active:scale-95"
              >
                Go Pro
              </button>
            )}
         </div>
      </nav>

      <main className="max-w-6xl mx-auto relative z-10">
        {currentView === 'form' && <TripForm onSubmit={handleTripSubmit} isLoading={tripLoading} />}
        
        {currentView === 'itinerary' && tripPlan && (
          <ItineraryDisplay 
            plan={tripPlan} 
            isPro={isPro} 
            onUpdatePlan={handleUpdatePlan} 
            groundingUrls={[]} 
            onReset={() => setCurrentView('form')} 
            onUpgrade={handleUpgrade} 
            canUndo={false} 
            onUndo={() => {}} 
            onShare={() => {}} 
          />
        )}
        
        {currentView === 'history' && (
          <HistoryPage 
            trips={savedTrips} 
            isPro={isPro} 
            onView={t => {setTripPlan(t); setCurrentView('itinerary');}} 
            onDuplicate={() => {}} 
            onDelete={handleDeleteTrip} 
            onUpgrade={handleUpgrade} 
          />
        )}
        
        {currentView === 'settings' && (
          <SettingsPage 
            isPro={isPro} 
            onUpgrade={handleUpgrade} 
            onResetData={handleResetData}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />
        )}
      </main>
      
      {tripPlan && (
        <AssistantChat 
          plan={tripPlan} 
          isPro={isPro} 
          onUpgrade={handleUpgrade} 
        />
      )}
    </div>
  );
};

export default App;
