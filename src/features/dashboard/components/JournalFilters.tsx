import React from 'react';
import { ArrowUpDown, Star, Lock } from 'lucide-react';

interface JournalFiltersProps {
  sortOrder: 'newest' | 'oldest';
  onSortChange: (order: 'newest' | 'oldest') => void;
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  privateOnly: boolean;
  onTogglePrivate: () => void;
}

export const JournalFilters: React.FC<JournalFiltersProps> = ({
  sortOrder,
  onSortChange,
  favoritesOnly,
  onToggleFavorites,
  privateOnly,
  onTogglePrivate,
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Sort Order Selector */}
      <button
        onClick={() => onSortChange(sortOrder === 'newest' ? 'oldest' : 'newest')}
        className="px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
        title="Toggle Sort Order"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
        <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
      </button>

      {/* Favorites Only Toggle */}
      <button
        onClick={onToggleFavorites}
        className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
          favoritesOnly
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
        <span>Favorites</span>
      </button>

      {/* Private Only Toggle */}
      <button
        onClick={onTogglePrivate}
        className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
          privateOnly
            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
            : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        <Lock className={`w-3.5 h-3.5 ${privateOnly ? 'text-indigo-400' : 'text-slate-400'}`} />
        <span>Private</span>
      </button>
    </div>
  );
};
