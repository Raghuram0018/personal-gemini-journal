import React from 'react';
import { Search, X } from 'lucide-react';

interface JournalSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const JournalSearch: React.FC<JournalSearchProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search your journals by title, content, or tag..."
        className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all backdrop-blur-xl shadow-inner"
      />

      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
