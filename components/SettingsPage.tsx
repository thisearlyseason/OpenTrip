import React, { useState } from 'react';

interface SettingsPageProps {
  isPro: boolean;
  onUpgrade: () => void;
  onResetData: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isPro, onUpgrade, onResetData, darkMode, onToggleDarkMode }) => {
  const [email, setEmail] = useState('traveler@opentrip.ai');
  const [showPassModal, setShowPassModal] = useState(false);

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-20 px-4">
      <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-12">Settings ⚙️</h2>
      
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-stone-900 dark:bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl">
                T
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">Signed in as</p>
                <p className="text-xl font-black text-stone-800 dark:text-stone-100">{email}</p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Verified Member</p>
              </div>
            </div>
            <button className="px-6 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition shadow-sm">
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-4">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-stone-700 dark:text-white focus:border-stone-900 outline-none transition-all shadow-inner" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-4">Account Security</label>
              <button 
                onClick={() => setShowPassModal(true)}
                className="w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-2xl text-sm font-bold text-stone-600 dark:text-stone-300 text-left hover:bg-stone-100 dark:hover:bg-stone-700 transition shadow-sm flex justify-between items-center"
              >
                Change Password
                <span>🔑</span>
              </button>
            </div>
          </div>
        </div>

        {/* Theme Preferences */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-black text-stone-800 dark:text-white mb-6">Interface Preferences</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div>
                   <p className="text-sm font-bold text-stone-700 dark:text-stone-200">Dark Mode</p>
                   <p className="text-[10px] text-stone-400 font-medium">Toggle between light and dark UI themes</p>
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

        {/* Subscription Card */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-black text-stone-800 dark:text-white mb-6 flex items-center gap-3">
            Subscription Plan 💎
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 gap-6">
             <div className="text-center md:text-left">
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Member Tier</p>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <p className="text-2xl font-black text-stone-900 dark:text-white">{isPro ? 'OpenTrip Pro' : 'Free Explorer'}</p>
                  {isPro && <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase animate-pulse">Active</span>}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 font-medium">
                  {isPro ? 'Enjoy unlimited trip saves and pro AI tools.' : 'Standard itinerary generation and limited features.'}
                </p>
             </div>
             {!isPro && (
               <button onClick={onUpgrade} className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-transform">
                 Unlock Pro Lifetime 🚀
               </button>
             )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm p-10">
          <h3 className="text-xl font-black text-stone-800 dark:text-white mb-6">Security & Data</h3>
          <div className="space-y-4">
             <div className="pt-2">
                <button 
                  onClick={() => { if(confirm('Permanently delete all data? This cannot be undone.')) onResetData(); }}
                  className="w-full py-5 border-2 border-dashed border-rose-100 dark:border-rose-900/30 text-rose-400 font-black text-xs uppercase tracking-widest rounded-[2rem] hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  Purge Local Trip Vault 🗑️
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal Mockup */}
      {showPassModal && (
        <div className="fixed inset-0 z-[200] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-slideUp border dark:border-stone-800">
             <div className="flex justify-between items-center mb-8">
                <h4 className="text-2xl font-black text-stone-900 dark:text-white">Update Security</h4>
                <button onClick={() => setShowPassModal(false)} className="text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">✕</button>
             </div>
             <div className="space-y-4">
                <input type="password" placeholder="Current Password" className="w-full p-4 bg-stone-50 dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-2xl text-sm" />
                <input type="password" placeholder="New Password" className="w-full p-4 bg-stone-50 dark:bg-stone-800 dark:text-white border dark:border-stone-700 rounded-2xl text-sm" />
                <button 
                  onClick={() => setShowPassModal(false)}
                  className="w-full py-4 bg-stone-900 dark:bg-stone-100 dark:text-stone-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black dark:hover:bg-white transition"
                >
                  Save Security Changes
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};