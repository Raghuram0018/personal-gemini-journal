import React from 'react';
import { MemoryItem, JournalEntry, GoalTrack } from '../../../types';
import {
  Sparkles,
  BookOpen,
  Target,
  Calendar,
  Tag,
  MapPin,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface MemoryFocusPanelProps {
  memory: MemoryItem;
  allJournals?: JournalEntry[];
  allGoals?: GoalTrack[];
  onOpenDetail: (memory: MemoryItem) => void;
  onOpenSourceJournal?: (journalId: string) => void;
}

export const MemoryFocusPanel: React.FC<MemoryFocusPanelProps> = ({
  memory,
  allJournals = [],
  allGoals = [],
  onOpenDetail,
  onOpenSourceJournal,
}) => {
  if (!memory) return null;

  // Find linked journals
  const linkedJournals = allJournals.filter((j) =>
    (memory.sourceJournalIds || []).includes(j.id)
  );

  // Find linked goals
  const linkedGoals = allGoals.filter((g) =>
    (memory.sourceGoalIds || []).includes(g.id)
  );

  // Color theme by category
  let categoryBadgeColor = 'from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/30';
  let accentBorder = 'border-indigo-500/30';
  const cat = (memory.category || '').toLowerCase();
  if (cat.includes('achievement')) {
    categoryBadgeColor = 'from-sky-500/20 to-blue-500/20 text-sky-300 border-sky-500/30';
    accentBorder = 'border-sky-500/30';
  } else if (cat.includes('learning')) {
    categoryBadgeColor = 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30';
    accentBorder = 'border-emerald-500/30';
  } else if (cat.includes('emotional') || cat.includes('peace')) {
    categoryBadgeColor = 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30';
    accentBorder = 'border-purple-500/30';
  }

  return (
    <div className={`w-full p-6 sm:p-7 rounded-3xl bg-slate-900/70 border ${accentBorder} backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all`}>
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left Column: Category, Date, Title, Summary */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${categoryBadgeColor} border backdrop-blur-md`}
            >
              {memory.category || 'Milestone'}
            </span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{memory.date || '2026'}</span>
            </div>

            {(memory.mood || memory.emotionalTag) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-800/40 text-xs text-purple-300">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>{memory.mood || memory.emotionalTag}</span>
              </div>
            )}

            {memory.isFeatured && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-600/40 text-xs text-amber-300">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Featured Memory</span>
              </div>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {memory.title}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            {memory.summary || memory.snippet}
          </p>

          {/* Connected Entities Tags: Topics, People, Places */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(memory.topics || []).map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800/60 text-xs text-slate-300 border border-slate-700/50"
              >
                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                {t}
              </span>
            ))}

            {(memory.places || []).map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800/60 text-xs text-emerald-300 border border-emerald-800/40"
              >
                <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                {p}
              </span>
            ))}

            {(memory.people || []).map((peep, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-800/60 text-xs text-purple-300 border border-purple-800/40"
              >
                <Users className="w-2.5 h-2.5 text-purple-400" />
                {peep}
              </span>
            ))}
          </div>

          {/* Connected Source Journals and Goals */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {linkedJournals.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Connected to {linkedJournals.length} Journal{linkedJournals.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {linkedGoals.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-sky-300">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Connected to Goal: {linkedGoals[0].title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Isolated Canonical User Record</span>
            </div>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="w-full md:w-auto flex md:flex-col items-center gap-3 shrink-0">
          <button
            onClick={() => onOpenDetail(memory)}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102"
          >
            <span>Explore Full Story</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
