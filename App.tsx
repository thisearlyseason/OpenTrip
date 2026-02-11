
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
    const saved = localStorage.getItem('opentrip_saved_trips');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(localStorage.getItem('opentrip_is_pro') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('opentrip_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('opentrip_theme', 'light');
    }
  }, [darkMode]);

  const handleTripSubmit = async (request: TripRequest) => {
    setLoading(true);
    try {
      const { plan } = await generateTripPlan(request);
      plan.id = Math.random().toString(36).substr(2, 9);
      plan.metadata = { ...plan.metadata, travelers: request.travelers, dates: request.dates };
      plan.budgetOverrides = {
        flightCost: request.flightBudget,
        accommodationCost: request.hotelBudget,
        includeFlight: request.includeFlightBudget,
        includeAccommodation: request.includeHotelBudget
      };
      setTripPlan(plan);
      const newSaved = [plan, ...savedTrips];
      setSavedTrips(newSaved);
      localStorage.setItem('opentrip_saved_trips', JSON.stringify(newSaved));
      setCurrentView('itinerary');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = () => {
    localStorage.removeItem('opentrip_saved_trips');
    setSavedTrips([]);
    setTripPlan(null);
    setCurrentView('form');
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-10 px-4 transition-colors duration-300">
      <nav className="max-w-6xl mx-auto mb-16 flex justify-between items-center">
         <img 
           src={darkMode ? DARK_LOGO_DATA_URI : LOGO_DATA_URI} 
           alt="Logo" 
           className="h-10 cursor-pointer" 
           onClick={() => setCurrentView('form')} 
         />
         <div className="flex gap-6 items-center">
            <button onClick={() => setCurrentView('history')} className={`text-xs font-medium uppercase tracking-widest ${currentView === 'history' ? 'text-indigo-500 font-medium' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}>History</button>
            <button onClick={() => setCurrentView('settings')} className={`text-xs font-medium uppercase tracking-widest ${currentView === 'settings' ? 'text-indigo-500 font-medium' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'}`}>Settings</button>
            {!isPro && (
              <button 
                onClick={() => { setIsPro(true); localStorage.setItem('opentrip_is_pro', 'true'); }} 
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg"
              >
                Go Pro
              </button>
            )}
         </div>
      </nav>

      <main className="max-w-6xl mx-auto">
        {currentView === 'form' && <TripForm onSubmit={handleTripSubmit} isLoading={loading} />}
        {currentView === 'itinerary' && tripPlan && (
          <ItineraryDisplay 
            plan={tripPlan} 
            isPro={isPro} 
            onUpdatePlan={setTripPlan} 
            groundingUrls={[]} 
            onReset={() => setCurrentView('form')} 
            onUpgrade={() => { setIsPro(true); localStorage.setItem('opentrip_is_pro', 'true'); }} 
            canUndo={false} onUndo={() => {}} onShare={() => {}} 
          />
        )}
        {currentView === 'history' && (
          <HistoryPage 
            trips={savedTrips} 
            isPro={isPro} 
            onView={t => {setTripPlan(t); setCurrentView('itinerary');}} 
            onDuplicate={() => {}} 
            onDelete={(id) => {
              const updated = savedTrips.filter(t => t.id !== id);
              setSavedTrips(updated);
              localStorage.setItem('opentrip_saved_trips', JSON.stringify(updated));
            }} 
            onUpgrade={() => { setIsPro(true); localStorage.setItem('opentrip_is_pro', 'true'); }} 
          />
        )}
        {currentView === 'settings' && (
          <SettingsPage 
            isPro={isPro} 
            onUpgrade={() => { setIsPro(true); localStorage.setItem('opentrip_is_pro', 'true'); }} 
            onResetData={handleResetData}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />
        )}
      </main>
      {tripPlan && <AssistantChat plan={tripPlan} isPro={isPro} onUpgrade={() => { setIsPro(true); localStorage.setItem('opentrip_is_pro', 'true'); }} />}
    </div>
  );
};

export default App;
