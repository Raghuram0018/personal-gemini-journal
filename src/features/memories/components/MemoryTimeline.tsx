import React from 'react';
import { MemoryItem, JournalEntry, GoalTrack } from '../../../types';
import {
  Search,
  Calendar,
  Sparkles,
  BookOpen,
  Target,
  Plus,
  ArrowUpDown,
  Filter,
  Flame,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface MemoryTimelineProps {
  memories: MemoryItem[];
  selectedIndex: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  sortOrder: 'newest' | 'oldest';
  onToggleSort: () => void;
  onSelectIndex: (idx: number) => void;
  onOpenDetail: (memory: MemoryItem) => void;
  onCreateNewMemory: () => void;
}

const CATEGORIES = [
  'All',
  'Achievements',
  'Milestones',
  'Emotional Moments',
  'Goals',
  'Learning',
  'Relationships',
  'Experiences',
];

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  memories,
  selectedIndex,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortOrder,
  onToggleSort,
  onSelectIndex,
  onOpenDetail,
  onCreateNewMemory,
}) => {
  return (
    <div className="w-full space-y-6">
      {/* Top Controls: Search, Categories, Sort, Add Memory */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search memories, milestones, people, places, tags..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-xl shadow-lg"
          />
        </div>

        {/* Sort & Add Memory Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSort}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 backdrop-blur-xl transition-colors cursor-pointer"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>

          <button
            onClick={onCreateNewMemory}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>New Memory</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 border border-indigo-400/40'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Memory Grid */}
      {memories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((m, idx) => {
            const isSelected = idx === selectedIndex;
            const cat = (m.category || '').toLowerCase();
            let catColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            if (cat.includes('achievement')) {
              catColor = 'text-sky-400 bg-sky-500/10 border-sky-500/20';
            } else if (cat.includes('learning')) {
              catColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            } else if (cat.includes('emotional')) {
              catColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            }

            return (
              <div
                key={m.id}
                onClick={() => {
                  onSelectIndex(idx);
                  onOpenDetail(m);
                }}
                className={`group p-5 rounded-3xl bg-slate-900/80 border transition-all cursor-pointer backdrop-blur-xl flex flex-col justify-between gap-4 hover:shadow-2xl hover:scale-101 ${
                  isSelected
                    ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${catColor}`}
                    >
                      {m.category || 'Milestone'}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3" />
                      <span>{m.date || '2026'}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {m.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {m.summary || m.snippet}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    {(m.mood || m.emotionalTag) && (
                      <span className="flex items-center gap-1 text-purple-300">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>{m.mood || m.emotionalTag}</span>
                      </span>
                    )}

                    {(m.sourceJournalIds || []).length > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        <span>{m.sourceJournalIds?.length} Journal</span>
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl">
          <p className="text-sm text-slate-400">No memories found matching your search or filters.</p>
        </div>
      )}
    </div>
  );
};
