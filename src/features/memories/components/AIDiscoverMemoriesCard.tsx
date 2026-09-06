import React, { useState } from 'react';
import { MemoryItem, JournalEntry } from '../../../types';
import { discoverMemoriesWithGemini } from '../../../services/api.client';
import {
  Sparkles,
  CheckCircle2,
  X,
  BookOpen,
  Calendar,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AIDiscoverMemoriesCardProps {
  journals: JournalEntry[];
  existingMemories: MemoryItem[];
  onAddMemory: (memory: Partial<MemoryItem>) => Promise<void>;
}

export const AIDiscoverMemoriesCard: React.FC<AIDiscoverMemoriesCardProps> = ({
  journals,
  existingMemories,
  onAddMemory,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Filter out private journals
  const eligibleJournals = journals.filter(
    (j) => j.privacy !== 'private' && j.privacy !== 'pin_locked' && !j.isPinLocked
  );

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      const res = await discoverMemoriesWithGemini({
        journals: eligibleJournals,
        existingMemories,
      });
      setSuggestions(res.suggestions || []);
      setHasScanned(true);
    } catch (err) {
      console.error('Failed to discover memories:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleApproveSuggestion = async (sug: any) => {
    setAddingId(sug.id);
    try {
      await onAddMemory({
        title: sug.title,
        summary: sug.summary,
        snippet: sug.summary,
        category: sug.category || 'Milestones',
        date: sug.date || new Date().toISOString().slice(0, 10),
        mood: sug.mood || 'Inspired',
        emotionalTag: sug.mood || 'Inspired',
        topics: sug.topics || [],
        sourceJournalIds: sug.sourceJournalIds || [],
        aiGenerated: true,
        confirmedByUser: true,
      });
      // Remove from pending suggestions
      setSuggestions((prev) => prev.filter((s) => s.id !== sug.id));
    } catch (err) {
      console.error('Failed to add suggested memory:', err);
    } finally {
      setAddingId(null);
    }
  };

  const handleDismissSuggestion = (sugId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== sugId));
  };

  return (
    <div className="w-full p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border border-purple-500/30 backdrop-blur-2xl shadow-xl space-y-4 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Gemini Life Connections & Memory Discovery
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Let Gemini analyze your journal reflections to discover meaningful milestones and emotional achievements with full human control.
          </p>
        </div>

        <button
          onClick={handleDiscover}
          disabled={isDiscovering || eligibleJournals.length === 0}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-102 disabled:opacity-50 shrink-0"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing Journals...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Discover Memories</span>
            </>
          )}
        </button>
      </div>

      {/* Suggested Memories List */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-purple-900/40">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Discovered Opportunities ({suggestions.length})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 backdrop-blur-xl flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {sug.category || 'Milestone'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{sug.date}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{sug.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{sug.summary}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleDismissSuggestion(sug.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleApproveSuggestion(sug)}
                    disabled={addingId === sug.id}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{addingId === sug.id ? 'Adding...' : 'Add to Universe'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasScanned && suggestions.length === 0 && !isDiscovering && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          Your memory universe is up to date with your current journals. No new unlinked milestones detected.
        </div>
      )}
    </div>
  );
};
