import React from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface FeatureNavigationProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
  backLabel?: string;
  closeLabel?: string;
  className?: string;
}

export const FeatureNavigation: React.FC<FeatureNavigationProps> = ({
  title,
  onBack,
  onClose,
  backLabel = 'Back',
  closeLabel = 'Close',
  className = '',
}) => {
  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 z-20 ${className}`}>
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>{backLabel}</span>
        </button>

        <div className="text-center min-w-0 flex-1 px-4">
          <h2 className="text-sm sm:text-base font-bold text-white font-display truncate tracking-wide">
            {title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold transition-all cursor-pointer"
        >
          <span>{closeLabel}</span>
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
