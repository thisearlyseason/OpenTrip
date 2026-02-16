import React, { useState, useEffect } from 'react';
import { TripForm } from './components/TripForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { AssistantChat } from './components/AssistantChat';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { TripRequest, TripPlan } from './types';
import { generateTripPlan } from './services/gemini';

const Logo = () => (
  <div className="flex items-center gap-3 cursor-pointer group">
    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-300">
      <span className="text-white text-xl font-bold font-sans">O</span>
    </div>
    <span className="text-2xl font-bold tracking-tight text-white drop-shadow-md font-sans">OpenTrip</span>
  </div>
);

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
    // If not pro and already has a trip, force history view or upgrade
    if (!isPro && savedTrips.length >= 1) {
      alert("Free tier is limited to 1 saved trip. Please upgrade to Pro for unlimited vault storage!");
      setCurrentView('history');
      return;
    }

    setTripLoading(true);
    try {
      const { plan } = await generateTripPlan(request);
      plan.id = plan.id || Math.random().toString(36).substr(2, 9);
      plan.metadata = { 
        ...plan.metadata, 
        travelers: request.travelers, 
        dates: request.dates,
        budget: request.budget,
        budgetType: request.budgetType,
        timePreference: request.timePreference,
        activityPreference: request.activityPreference,
      };
      plan.budgetOverrides = {
        includeFlight: request.includeFlightBudget,
        flightCost: request.flightBudget,
        includeAccommodation: request.includeHotelBudget,
        accommodationCost: request.hotelBudget,
        includeTransport: request.includeTransportBudget,
        transportCost: request.transportBudget,
        actualFlightSpent: 0,
        actualAccommodationSpent: 0,
        actualTransportSpent: 0,
      };

      if (!Array.isArray(plan.importantContacts)) plan.importantContacts = [];
      if (!Array.isArray(plan.transportResources)) plan.transportResources = [];

      setTripPlan(plan);
      setSavedTrips(prev => [...prev, plan]);
      setCurrentView('itinerary');
    } catch (error) {
      console.error('Error generating trip plan:', error);
      alert('Failed to generate trip plan. Please try again.');
    } finally {
      setTripLoading(false);
    }
  };

  const handleUpdatePlan = (updatedPlan: TripPlan) => {
    setTripPlan(updatedPlan);
    setSavedTrips(prev => prev.map(t => t.id === updatedPlan.id ? updatedPlan : t));
  };

  const handleResetData = () => {
    if (window.confirm("Purge all data?")) {
      localStorage.clear();
      setSavedTrips([]);
      setTripPlan(null);
      setIsPro(false);
      setCurrentView('form');
    }
  };

  const handleUpgrade = () => {
    setIsPro(true);
    alert("You are now an OpenTrip Pro member! 💎");
  };

  const handleShare = () => {
    if (!isPro) {
      alert("Sharing is a Pro feature! 💎");
      return;
    }
    alert("Trip sharing link copied to clipboard!");
  };

  const navItemClass = (view: string) => `
    px-5 py-2.5 rounded-full transition-all duration-300 font-bold tracking-wider
    ${currentView === view 
      ? 'bg-white text-stone-900 shadow-xl scale-105' 
      : 'text-white bg-black/40 hover:bg-white hover:text-stone-900 hover:font-black backdrop-blur-md opacity-80 hover:opacity-100'}
  `;

  const backgroundMap = {
    form: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2560&q=80",
    itinerary: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2560&q=80",
    history: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2560&q=80",
    settings: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2560&q=80"
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000 overflow-hidden">
        {Object.entries(backgroundMap).map(([view, src]) => (
          <img 
            key={view}
            src={src} 
            alt="" 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${currentView === view ? 'opacity-30 blur-[2px] scale-100' : 'opacity-0 scale-110'}`} 
          />
        ))}
        <div className="absolute inset-0 bg-stone-900/10 dark:bg-stone-950/30 backdrop-blur-[1px]"></div>
      </div>

      <header className="px-6 py-6 md:px-12 md:py-8 flex justify-between items-center relative z-[100]">
        <div onClick={() => setCurrentView('form')}><Logo /></div>
        <nav className="flex items-center gap-3 sm:gap-6 text-xs uppercase">
          <button onClick={() => setCurrentView('form')} className={navItemClass('form')}>Plan</button>
          <button onClick={() => setCurrentView('history')} className={navItemClass('history')}>History</button>
          <button onClick={() => setCurrentView('settings')} className={navItemClass('settings')}>Settings</button>
          {!isPro && (
            <button onClick={handleUpgrade} className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-black hover:bg-indigo-500 shadow-lg active:scale-95 transition-all">Go Pro 💎</button>
          )}
        </nav>
      </header>

      <main className="relative z-20 pt-4">
        {currentView === 'form' && <TripForm onSubmit={handleTripSubmit} isLoading={tripLoading} />}
        {currentView === 'itinerary' && tripPlan && (
          <>
            <ItineraryDisplay 
              plan={tripPlan} 
              groundingUrls={[]} 
              onReset={() => { setTripPlan(null); setCurrentView('form'); }} 
              isPro={isPro} 
              onUpgrade={handleUpgrade}
              onUpdatePlan={handleUpdatePlan}
              canUndo={false}
              onUndo={() => {}}
              onShare={handleShare}
            />
            <AssistantChat plan={tripPlan} isPro={isPro} onUpgrade={handleUpgrade} />
          </>
        )}
        {currentView === 'history' && (
          <HistoryPage 
            trips={savedTrips} 
            isPro={isPro} 
            onView={(trip) => { setTripPlan(trip); setCurrentView('itinerary'); }} 
            onDuplicate={(trip) => {
              if (!isPro) {
                alert("Duplication is a Pro feature! 💎");
                return;
              }
              const duplicatedTrip = JSON.parse(JSON.stringify(trip));
              duplicatedTrip.id = Math.random().toString(36).substr(2, 9);
              duplicatedTrip.createdAt = Date.now();
              duplicatedTrip.tripTitle = `${trip.tripTitle} (Copy)`;
              setSavedTrips(prev => [...prev, duplicatedTrip]);
              alert('Trip duplicated successfully!');
            }} 
            onDelete={(id) => {
              if (window.confirm("Permanently remove this trip from your vault?")) {
                setSavedTrips(prev => prev.filter(t => t.id !== id));
                if (tripPlan?.id === id) setTripPlan(null);
              }
            }} 
            onUpgrade={handleUpgrade} 
          />
        )}
        {currentView === 'settings' && (
          <SettingsPage 
            isPro={isPro} 
            onUpgrade={handleUpgrade} 
            onResetData={handleResetData} 
            darkMode={darkMode} 
            onToggleDarkMode={() => setDarkMode(prev => !prev)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;