import React from 'react';
import { Layers, User, Target, Lightbulb, Compass, Lock } from 'lucide-react';

export type JournalCategoryTab = 'All' | 'Personal' | 'Goals' | 'Ideas' | 'Memories' | 'Private';

interface JournalCategoriesProps {
  activeCategory: JournalCategoryTab;
  onSelectCategory: (cat: JournalCategoryTab) => void;
  counts?: Record<JournalCategoryTab, number>;
}

export const JournalCategories: React.FC<JournalCategoriesProps> = ({
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  const categories: { id: JournalCategoryTab; label: string; icon: React.ReactNode }[] = [
    { id: 'All', label: 'All Entries', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'Personal', label: 'Personal', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'Goals', label: 'Goals', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'Ideas', label: 'Ideas', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: 'Memories', label: 'Memories', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'Private', label: 'Private', icon: <Lock className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-x-auto custom-scrollbar backdrop-blur-xl">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        const count = counts?.[cat.id];

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
            {typeof count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
