import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MemoryItem, WeeklyMemory } from '../../types';
import { 
  getMemoriesForUser, 
  getWeeklyMemories,
  createMemoryForUser
} from './memoryService';
import { 
  WeeklyMemoryScene 
} from './components/WeeklyMemoryScene';
import { MemoryTimeline } from './components/MemoryTimeline';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { ContinuousMemoryCycle } from './components/ContinuousMemoryCycle';
import { CreateMemoryModal } from './components/CreateMemoryModal';
import { getJournalsForUser } from '../journal/journalService';
import { getGoalsForUser } from '../goals/goalsService';
import { JournalEntry, GoalTrack } from '../../types';
import { 
  aggregateWeeklyData, 
  discoverMemoriesForWeek,
  getWeekRange,
  getWeekStatus
} from './weeklyAggregator';
import { 
  Sparkles, 
  LayoutGrid, 
  Box, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  History,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MemoriesShellProps {
  onBackToHome?: () => void;
}

export const MemoriesShell: React.FC<MemoriesShellProps> = ({ onBackToHome }) => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  
  // Seed demo data for first run
  useEffect(() => {
    if (uid) {
      import('./seedDemoData').then(({ seedDemoData }) => seedDemoData(uid));
    }
  }, [uid]);

  // View States
  const [activeTab, setActiveTab] = useState<'weekly' | 'all' | 'timeline'>('weekly');
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  
  // Data States
  const [allMemories, setAllMemories] = useState<MemoryItem[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklyMemory[]>([]);
  const [activeWeeklyMemories, setActiveWeeklyMemories] = useState<MemoryItem[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [aiWeeklySummary, setAiWeeklySummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Weekly Selection
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Status for the selected week
  const weekStatus = useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (currentWeekOffset * 7));
    return getWeekStatus(targetDate);
  }, [currentWeekOffset]);

  const weekRangeData = useMemo(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (currentWeekOffset * 7));
    return getWeekRange(targetDate);
  }, [currentWeekOffset]);

  const weekRangeString = useMemo(() => {
    return `${weekRangeData.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekRangeData.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [weekRangeData]);

  // Timeline Filtering States
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineCategory, setTimelineCategory] = useState('All');
  const [timelineSort, setTimelineSort] = useState<'newest' | 'oldest'>('newest');
  const [timelineSelectedIndex, setTimelineSelectedIndex] = useState(0);

  const loadData = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    setAiWeeklySummary(null);
    try {
      // 1. Load general history and connected life entities
      const [memories, weekly, userJournals, userGoals] = await Promise.all([
        getMemoriesForUser(uid),
        getWeeklyMemories(uid),
        getJournalsForUser(uid),
        getGoalsForUser(uid)
      ]);
      setAllMemories(memories);
      setWeeklySummaries(weekly);
      setJournals(userJournals);
      setGoals(userGoals);

      // 2. Load specific data for the current active week
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - (currentWeekOffset * 7));
      
      const weeklyPkg = await aggregateWeeklyData(uid, targetDate);
      const discovered = discoverMemoriesForWeek(weeklyPkg);
      
      // Combine stored Firestore memories with discovered life items
      // Stored canonical memories already in Firestore get prime priority in the carousel!
      const existingIds = new Set<string>();
      const combinedMemories: MemoryItem[] = [];

      // 1. Add all canonical memories stored in Firestore
      (memories || []).forEach(m => {
        if (!existingIds.has(m.id)) {
          existingIds.add(m.id);
          combinedMemories.push(m);
        }
      });

      // 2. Add journals with images from Firestore that aren't yet in memories
      (userJournals || []).forEach(j => {
        const imageAttachment = j.mediaAttachments?.find(m => m.type === 'image') || j.mediaAttachments?.[0];
        const imgUrl = imageAttachment?.url || (j as any).imageUrl || '';
        if (imgUrl) {
          const journalMemId = `mem-j-${j.id}`;
          if (!existingIds.has(journalMemId) && !combinedMemories.some(m => m.sourceJournalIds?.includes(j.id))) {
            existingIds.add(journalMemId);
            combinedMemories.push({
              id: journalMemId,
              userId: uid,
              sourceType: 'journal',
              title: j.title || 'Journal Reflection',
              snippet: j.content.slice(0, 160) + (j.content.length > 160 ? '...' : ''),
              content: j.content,
              date: j.createdAt,
              mood: j.moodSnapshot?.mood,
              category: 'Journal Entries',
              sourceJournalIds: [j.id],
              imageUrl: imgUrl,
              tags: j.tags,
              emotionalTag: j.moodSnapshot?.mood,
              aiGenerated: !!j.aiSummary
            });
          }
        }
      });

      // 3. Add discovered weekly memories (goals, music, books, moods)
      (discovered || []).forEach(d => {
        const isDuplicate = combinedMemories.some(m => 
          m.id === d.id || 
          (m.title.toLowerCase() === d.title.toLowerCase() && m.date?.slice(0, 10) === d.date?.slice(0, 10))
        );
        if (!isDuplicate && !existingIds.has(d.id)) {
          existingIds.add(d.id);
          combinedMemories.push(d);
        }
      });

      // Render real-time Firestore-backed memories immediately without waiting for AI analysis
      setActiveWeeklyMemories(combinedMemories.length > 0 ? combinedMemories : discovered);
      setIsLoading(false);

      // 3. Generate or fetch AI Weekly Summary via server-side Gemini analysis in background
      // This is injected as the final card in every carousel sequence
      setIsGeneratingAI(true);
      (async () => {
        try {
          const response = await fetch('/api/memories/weekly-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: uid,
              weekId: weeklyPkg.weekId,
              startDate: weeklyPkg.startDate,
              endDate: weeklyPkg.endDate,
              journals: weeklyPkg.journals,
              goals: weeklyPkg.goals,
              books: weeklyPkg.books,
              music: weeklyPkg.music,
              moods: weeklyPkg.moods
            })
          });
          const data = await response.json();
          const summaryText = data.aiSummary || data.analysis || (data.title ? `${data.title}: A synthesis of your reflections and journey.` : 'A comprehensive synthesis of your reflections, achievements, and milestones.');
          setAiWeeklySummary(summaryText);

          const insightsText = (data.aiInsights || []).length > 0 
            ? `\n\n🧠 Key Insights:\n${(data.aiInsights || []).map((ins: string) => '• ' + ins).join('\n')}` 
            : '';
          const achievementsText = (data.keyAchievements || []).length > 0
            ? `\n\n🏆 Achievements:\n${(data.keyAchievements || []).map((ach: string) => '• ' + ach).join('\n')}`
            : '';
          const metadataText = `\n\nDominant Mood: ${data.topMood || 'Reflective'} · Sound Vibe: ${data.musicalVibe || 'Ambient'}`;

          const aiWeeklyCard: MemoryItem = {
            id: `mem-ai-summary-${weeklyPkg.weekId}`,
            userId: uid,
            weekId: weeklyPkg.weekId,
            sourceType: 'activity',
            title: data.title || '✨ AI WEEKLY SUMMARY',
            snippet: summaryText.slice(0, 160) + (summaryText.length > 160 ? '...' : ''),
            summary: summaryText,
            content: `${summaryText}${insightsText}${achievementsText}${metadataText}`,
            date: weeklyPkg.endDate,
            category: 'AI Weekly Summary',
            aiGenerated: true,
            isFeatured: true
          };

          setActiveWeeklyMemories(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('mem-ai-summary-'));
            return [...filtered, aiWeeklyCard];
          });
        } catch (aiErr) {
          console.warn('[MemoriesShell] AI Analysis fallback:', aiErr);
          const fallbackSummary = `Comprehensive synthesis for ${weeklyPkg.weekId}: Demonstrating continuous reflection, active habit cultivation, and milestone commitment across your life journey.`;
          setAiWeeklySummary(fallbackSummary);
          const aiWeeklyCard: MemoryItem = {
            id: `mem-ai-summary-${weeklyPkg.weekId}`,
            userId: uid,
            weekId: weeklyPkg.weekId,
            sourceType: 'activity',
            title: '✨ AI WEEKLY SUMMARY',
            snippet: fallbackSummary,
            summary: fallbackSummary,
            content: `${fallbackSummary}\n\n• Grounded journal reflections and self-discovery.\n• Ongoing goal progress and reading expansion.\n\nDominant Mood: Reflective · Sound Vibe: Ambient`,
            date: weeklyPkg.endDate,
            category: 'AI Weekly Summary',
            aiGenerated: true,
            isFeatured: true
          };
          setActiveWeeklyMemories(prev => {
            const filtered = prev.filter(m => !m.id.startsWith('mem-ai-summary-'));
            return [...filtered, aiWeeklyCard];
          });
        } finally {
          setIsGeneratingAI(false);
        }
      })();
    } catch (err) {
      console.error('[MemoriesShell] Load error:', err);
      setIsLoading(false);
    }
  }, [uid, currentWeekOffset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeWeeklySummary = useMemo(() => {
    const historical = weeklySummaries.find(w => w.weekId === (activeWeeklyMemories[0]?.weekId));
    if (historical) return historical;
    if (aiWeeklySummary) {
      return {
        aiSummary: aiWeeklySummary,
        keyAchievements: [],
        moodSummary: '',
        recommendations: []
      } as any;
    }
    return null;
  }, [weeklySummaries, activeWeeklyMemories, aiWeeklySummary]);

  // Handle archive selection
  const handleSelectArchiveWeek = (offset: number) => {
    setCurrentWeekOffset(offset);
    setIsArchiveOpen(false);
    setActiveTab('weekly');
  };

  return (
    <div className="w-full h-full bg-[#05060a] text-slate-100 flex flex-col overflow-hidden">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md bg-slate-950/50 z-30">
        <div className="flex items-center gap-4">
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Memory Universe
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono uppercase tracking-widest">Beta</span>
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium">Crystallizing Your Life Journey</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-xl gap-1">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'weekly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} />
            Weekly
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box size={14} />
            Universe
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} />
            Timeline
          </button>
        </div>
      </div>

      {/* Main Feature Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'weekly' && (
            <motion.div 
              key="weekly"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              {/* Background: 3D Scene - Centered and Full Screen */}
              <div className="absolute inset-0 z-0 bg-[#05060a]">
                <WeeklyMemoryScene 
                  memories={activeWeeklyMemories} 
                  onCardSelect={setSelectedMemory}
                  isLoading={isLoading}
                  status={activeWeeklyMemories.length === 0 && weekStatus.status === 'completed' ? 'empty' : weekStatus.status}
                  nextDate={weekStatus.nextAvailabilityDate}
                  daysRemaining={weekStatus.daysRemaining}
                  weekRange={weekRangeString}
                  onOpenArchive={() => setIsArchiveOpen(true)}
                />
              </div>

              {/* Floating Overlays - "Placed Very Small" */}
              
              {/* 1. Navigation Overlay (Top Left) */}
              <div className="absolute top-4 left-4 z-10 w-40 pointer-events-none">
                <div className="pointer-events-auto bg-slate-950/40 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl scale-75 origin-top-left">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <h3 className="text-[9px] font-bold text-white/50 uppercase tracking-widest font-display">Nav</h3>
                        <button 
                          onClick={() => setIsArchiveOpen(true)}
                          className="p-0.5 rounded hover:bg-white/5 text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors"
                          title="Open Archive"
                        >
                          <History size={10} />
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button 
                          onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                          className="p-0.5 rounded hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                        >
                          <ChevronLeft size={10} />
                        </button>
                        <button 
                          onClick={() => setCurrentWeekOffset(prev => Math.max(0, prev - 1))}
                          className="p-0.5 rounded hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer transition-colors disabled:opacity-30"
                          disabled={currentWeekOffset === 0}
                        >
                          <ChevronRight size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="text-[8px] text-indigo-400 font-mono font-bold tracking-tighter truncate">{weekRangeString}</div>
                  </div>
                </div>
              </div>

              {/* 2. Universe Overview Overlay (Top Right) */}
              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/40 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full shadow-2xl scale-75 origin-top-right">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-white font-mono">{allMemories.length}</span>
                      <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Mems</span>
                    </div>
                    <div className="w-[0.5px] h-2 bg-white/10" />
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-white font-mono">{weeklySummaries.length}</span>
                      <span className="text-[7px] text-slate-500 uppercase tracking-tighter">Weeks</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. AI Insights Overlay (Bottom Left) */}
              {activeWeeklySummary && (
                <div className="absolute bottom-4 left-4 z-10 w-48 pointer-events-none">
                  <div className="pointer-events-auto bg-slate-950/40 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl scale-75 origin-bottom-left">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles size={10} className="text-indigo-400" />
                      <h4 className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Insight</h4>
                    </div>
                    <p className="text-[9px] text-indigo-200/70 italic leading-snug line-clamp-2">
                      "{activeWeeklySummary.aiSummary}"
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div 
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full h-full p-8 overflow-y-auto custom-scrollbar"
            >
              <MemoryTimeline 
                memories={allMemories} 
                selectedIndex={timelineSelectedIndex}
                searchQuery={timelineSearch}
                onSearchChange={setTimelineSearch}
                selectedCategory={timelineCategory}
                onCategoryChange={setTimelineCategory}
                sortOrder={timelineSort}
                onToggleSort={() => setTimelineSort(prev => prev === 'newest' ? 'oldest' : 'newest')}
                onSelectIndex={setTimelineSelectedIndex}
                onOpenDetail={setSelectedMemory}
                onCreateNewMemory={() => setShowCreateModal(true)}
              />
            </motion.div>
          )}

          {activeTab === 'all' && (
            <motion.div 
              key="all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              <ContinuousMemoryCycle
                memories={allMemories}
                journals={journals}
                goals={goals}
                onBackToHome={() => setActiveTab('weekly')}
                onSelectMemory={setSelectedMemory}
                onRefreshData={loadData}
                userUid={uid}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Memory Modal */}
      {showCreateModal && (
        <CreateMemoryModal
          journals={journals}
          goals={goals}
          onClose={() => setShowCreateModal(false)}
          onCreateMemory={async (newMem) => {
            if (!uid) return;
            await createMemoryForUser(uid, newMem);
            setShowCreateModal(false);
            await loadData();
          }}
        />
      )}

      {/* Archive Modal */}
      <AnimatePresence>
        {isArchiveOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">Past Memories</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Select a week to travel back</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsArchiveOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(12)].map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (i * 7));
                    const { startDate, endDate } = getWeekRange(date);
                    const range = `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                    const isCurrent = currentWeekOffset === i;
                    const status = getWeekStatus(date);

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectArchiveWeek(i)}
                        className={`group relative p-4 rounded-2xl border transition-all text-left overflow-hidden ${
                          isCurrent 
                            ? 'bg-indigo-600/20 border-indigo-500/50' 
                            : 'bg-slate-950/50 border-white/5 hover:border-indigo-500/30 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                            i === 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {i === 0 ? 'Current Week' : `Week -${i}`}
                          </span>
                          {status.status === 'in_progress' && (
                            <span className="text-[9px] text-amber-400 font-bold uppercase animate-pulse">In Progress</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{range}</div>
                        <div className="text-[10px] text-slate-500 font-mono italic">
                          {status.status === 'in_progress' ? 'Evolving...' : 'Preserved Universe'}
                        </div>
                        
                        {isCurrent && (
                          <div className="absolute right-4 bottom-4">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onUpdateMemory={() => loadData()}
          onDeleteMemory={() => loadData()}
        />
      )}
    </div>
  );
};
