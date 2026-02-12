
import React from 'react';

interface SettingsPageProps {
  isPro: boolean;
  onUpgrade: () => void;
  onResetData: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isPro, onUpgrade, onResetData, darkMode, onToggleDarkMode }) => {
  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-20 px-4">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-4xl font-normal text-stone-900 dark:text-white">Settings ⚙️</h2>
      </div>
      
      <div className="space-y-6">
        {/* Profile Card (Local Only) */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-stone-900 dark:bg-indigo-600 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-xl text-white text-3xl font-normal">
               G
            </div>
            <div>
              <p className="text-xs font-normal uppercase tracking-widest text-stone-400 mb-1">Local Explorer</p>
              <p className="text-xl font-normal text-stone-800 dark:text-stone-100">Guest User</p>
              {isPro && (
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border border-indigo-100 dark:border-indigo-800 inline-block mt-2">
                  Pro Member 💎
                </span>
              )}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t dark:border-stone-800">
            <p className="text-xs text-stone-400 leading-relaxed font-normal">
              You are currently in guest mode. All trips are stored strictly in your browser's local storage.
            </p>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-normal text-stone-800 dark:text-white mb-6">Interface Preferences</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div>
                   <p className="text-sm font-normal text-stone-700 dark:text-stone-200">Dark Mode</p>
                   <p className="text-[10px] text-stone-400 font-normal">Toggle between light and dark UI themes</p>
                </div>
                <div 
                  onClick={onToggleDarkMode}
                  className={`w-14 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${darkMode ? 'bg-indigo-600' : 'bg-stone-200 dark:bg-stone-700'}`}
                >
                   <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${darkMode ? 'left-8' : 'left-1'}`}></div>
                </div>
             </div>
          </div>
        </div>

        {/* Subscription Tier */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-normal text-stone-800 dark:text-white mb-6 flex items-center gap-3">
            Subscription Plan 💎
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 gap-6">
             <div className="text-center md:text-left">
                <p className="text-xs font-normal uppercase tracking-widest text-stone-400 mb-2">Member Tier</p>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <p className="text-2xl font-normal text-stone-900 dark:text-white">{isPro ? 'OpenTrip Pro' : 'Free Explorer'}</p>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 font-normal leading-relaxed">
                  {isPro ? 'Enjoy unlimited trip saves and pro AI concierge tools.' : 'Upgrade to Pro to unlock advanced AI tools and unlimited saves.'}
                </p>
             </div>
             {!isPro && (
               <button onClick={onUpgrade} className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-normal text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-transform">
                 Go Pro 🚀
               </button>
             )}
          </div>
        </div>

        {/* Storage Management */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-normal text-stone-800 dark:text-white mb-6">Storage & Data</h3>
          <div className="space-y-4">
             <div className="pt-2">
                <button 
                  onClick={onResetData}
                  className="w-full py-5 border-2 border-dashed border-rose-100 dark:border-rose-900/30 text-rose-400 font-normal text-xs uppercase tracking-widest rounded-[2rem] hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  Purge Entire Trip Vault 🗑️
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
