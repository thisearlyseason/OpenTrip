import React from 'react';

interface UpgradeNudgeProps {
  featureName: string;
  onUpgrade: () => void;
  onClose?: () => void;
}

export const UpgradeNudge: React.FC<UpgradeNudgeProps> = ({ featureName, onUpgrade, onClose }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-2xl animate-fadeIn relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Locked Capability</span>
          <h4 className="font-bold text-xl">{featureName}</h4>
        </div>
        <p className="text-sm opacity-90 mb-6 leading-relaxed">
          Upgrade to OpenTrip Pro to unlock this feature and many more, including multi-day editing, full trip rewinds, and pro exports.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={onUpgrade}
            className="flex-1 bg-white text-indigo-700 py-3 rounded-2xl font-bold text-sm shadow-xl transition-transform active:scale-95"
          >
            Upgrade to Pro
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="px-6 bg-white/10 text-white py-3 rounded-2xl font-bold text-sm hover:bg-white/20 transition"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};