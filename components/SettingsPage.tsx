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
    <div className="max-w-full sm:max-w-3xl mx-auto animate-fadeIn pb-20 px-4">
      <div className="flex justify-between items-center mb-8 sm:mb-12 bg-white/40 dark:bg-stone-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-xl">
        <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 dark:text-white tracking-tight">Settings ⚙️</h2>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        {/* User Information Card */}
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl p-6 sm:p-10">
          <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-white mb-6">User Account</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-stone-900 dark:bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl text-white text-3xl font-bold">
               G
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">Authenticated Guest</p>
              <p className="text-xl font-bold text-stone-800 dark:text-stone-100">explorer@opentrip.io</p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                {isPro && (
                  <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                    Pro Member 💎
                  </span>
                )}
                <button 
                  onClick={() => alert("Password reset link sent to your guest email!")}
                  className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border dark:border-stone-700 hover:bg-stone-200 transition"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t dark:border-stone-800">
            <p className="text-xs text-stone-400 leading-relaxed font-normal italic">
              All data is currently stored locally. Connect an account to sync across devices.
            </p>
          </div>
        </div>

        {/* Interface Preferences */}
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl p-6 sm:p-10">
          <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-white mb-6">Interface Preferences</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-6 bg-stone-50/50 dark:bg-stone-800/50 rounded-[2rem] border border-stone-100 dark:border-stone-800 transition-colors">
                <div>
                   <p className="text-base font-bold text-stone-800 dark:text-stone-200">{darkMode ? 'Dark Appearance' : 'Light Appearance'}</p>
                   <p className="text-xs text-stone-400 font-normal">Switch the primary visual theme of the application</p>
                </div>
                <div 
                  onClick={onToggleDarkMode}
                  className={`w-16 h-8 sm:w-20 sm:h-10 rounded-full relative cursor-pointer transition-all duration-500 shadow-inner ${darkMode ? 'bg-indigo-600 ring-4 ring-indigo-500/20' : 'bg-stone-200 dark:bg-stone-700'}`}
                >
                   <div className={`absolute top-1 sm:top-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-white rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center ${darkMode ? 'left-9 sm:left-11 rotate-0' : 'left-1 rotate-180'}`}>
                      {darkMode ? '🌙' : '☀️'}
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Subscription Tier */}
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl p-6 sm:p-10">
          <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-white mb-6 flex items-center gap-3">
            Subscription Plan 💎
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-gradient-to-br from-indigo-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 rounded-3xl border border-indigo-100 dark:border-stone-700 gap-6 shadow-sm">
             <div className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Member Tier</p>
                <p className="text-2xl font-black text-stone-900 dark:text-white">{isPro ? 'OpenTrip Pro' : 'Free Explorer'}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-2 font-normal leading-relaxed italic">
                  {isPro ? 'Enjoy unlimited trip saves and pro AI concierge tools.' : 'Upgrade to Pro to unlock advanced AI tools and unlimited saves.'}
                </p>
             </div>
             {!isPro && (
               <button onClick={onUpgrade} className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform active:scale-95">
                 Go Pro 🚀
               </button>
             )}
          </div>
        </div>

        {/* Storage Management */}
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-[2rem] sm:rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-xl p-6 sm:p-10">
          <h3 className="text-lg sm:text-xl font-bold text-stone-800 dark:text-white mb-6">Security & Data</h3>
          <div className="space-y-4">
             <button 
                onClick={onResetData}
                className="w-full py-5 border-2 border-dashed border-rose-100 dark:border-rose-900/30 text-rose-400 font-black text-xs uppercase tracking-[0.3em] rounded-[2.5rem] hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95"
              >
                Purge Entire Trip Vault 🗑️
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};