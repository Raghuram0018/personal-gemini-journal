import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GoalTrack, GoalMilestone, JournalEntry, MemoryItem, AISuggestion } from '../../types';
import {
  getGoalsForUser,
  createGoalTrack,
  updateGoalTrack,
  toggleMilestoneCompletion,
  toggleMilestoneTask,
  toggleAllMilestoneTasks,
  addMilestoneTask,
  addMilestoneToGoal,
  detectGoalsFromJournals,
  deleteMilestoneTask,
  calculateGoalProgress,
  deleteGoalTrack,
  autoCreateGoalFromJournal,
} from './goalsService';
import { getJournalsForUser } from '../journal/journalService';
import { getMemoriesForUser } from '../memories/memoryService';
import { F1RoadmapTrack } from './components/F1RoadmapTrack';
import { GoalCheckpointModal } from './components/GoalCheckpointModal';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';
import { GoalCreateModal } from './components/GoalCreateModal';
import {
  ArrowLeft,
  Target,
  Plus,
  Sparkles,
  ChevronDown,
  Trophy,
  Gauge,
  Flag,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Loader2,
  X,
  Flame,
  Zap,
  Check,
  Trash2,
} from 'lucide-react';

interface GoalsPageProps {
  onBackToHome: () => void;
  onNavigateToJournal?: (journalId: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
  onModalStateChange?: (isOpen: boolean) => void;
  initialGoalId?: string;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  onBackToHome,
  onNavigateToJournal,
  onNavigateToMemory,
  onModalStateChange,
  initialGoalId,
}) => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  // Data State
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || 'all');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [activeMilestone, setActiveMilestone] = useState<GoalMilestone | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [detectedGoalSuggestions, setDetectedGoalSuggestions] = useState<AISuggestion[]>([]);

  // Notify parent of modal open/close to hide bottom dock
  useEffect(() => {
    const isModalActive = Boolean(activeMilestone || showCreateModal);
    onModalStateChange?.(isModalActive);
  }, [activeMilestone, showCreateModal, onModalStateChange]);

  // Load Data
  const loadGoalsData = useCallback(async (preferredGoalId?: string) => {
    if (!uid) return;
    setLoading(true);
    try {
      const [fetchedGoals, fetchedJournals, fetchedMemories] = await Promise.all([
        getGoalsForUser(uid),
        getJournalsForUser(uid),
        getMemoriesForUser(uid),
      ]);
      setGoals(fetchedGoals);
      setJournals(fetchedJournals);
      setMemories(fetchedMemories);

      const cachedActive = localStorage.getItem(`pgj_active_goal_${uid}`);
      const targetId = preferredGoalId || initialGoalId || cachedActive || selectedGoalId;

      if (fetchedGoals.length > 0) {
        if (targetId === 'all' || (targetId && fetchedGoals.some((g) => g.id === targetId))) {
          setSelectedGoalId(targetId);
        } else {
          setSelectedGoalId('all');
        }
      }

      // Check for AI Goal Detections from journals & automatically generate circuits with unique checkpoints
      const detected = detectGoalsFromJournals(fetchedJournals, fetchedGoals);
      if (detected.length > 0) {
        for (const sug of detected) {
          const correspondingJournal = fetchedJournals.find(
            (j) => (sug.sourceJournalId && j.id === sug.sourceJournalId) || j.title === sug.sourceJournalTitle
          ) || fetchedJournals[0];
          try {
            const autoGoal = await autoCreateGoalFromJournal(uid, {
              title: sug.title,
              description: sug.description,
              journalId: correspondingJournal?.id || `j_extracted_${Date.now()}`,
              journalTitle: correspondingJournal?.title || 'Journal Entry',
              journalContent: correspondingJournal?.content || sug.description,
              timestamp: correspondingJournal?.createdAt || new Date().toISOString(),
            });
            if (autoGoal && !fetchedGoals.some((g) => g.id === autoGoal.id)) {
              fetchedGoals.unshift(autoGoal);
            }
          } catch (autoErr) {
            console.warn('[GoalsPage] Auto-generating goal circuit from journal error:', autoErr);
          }
        }
        setGoals([...fetchedGoals]);
        setDetectedGoalSuggestions([]);
      } else {
        setDetectedGoalSuggestions([]);
      }
    } catch (err) {
      console.warn('[GoalsPage] Error fetching canonical goal data:', err);
    } finally {
      setLoading(false);
    }
  }, [uid, initialGoalId, selectedGoalId]);

  useEffect(() => {
    loadGoalsData();
  }, [loadGoalsData]);

  // Listen to background updates from AI journal goal identification
  useEffect(() => {
    const handleGoalUpdateEvent = (e: any) => {
      const goalId = e?.detail?.goalId;
      if (goalId) {
        loadGoalsData(goalId);
      } else {
        loadGoalsData();
      }
    };

    window.addEventListener('pgj_goals_updated', handleGoalUpdateEvent);
    return () => {
      window.removeEventListener('pgj_goals_updated', handleGoalUpdateEvent);
    };
  }, [loadGoalsData]);

  // Compute Grand Prix Unified All-Circuits Roadmap Track
  const allGoalsUnifiedTrack = useMemo<GoalTrack | null>(() => {
    if (goals.length === 0) return null;
    const allMilestones: GoalMilestone[] = [];
    let allJournalIds: string[] = [];
    let allMemoryIds: string[] = [];

    goals.forEach((goal) => {
      if (goal.relatedJournalIds) {
        allJournalIds = Array.from(new Set([...allJournalIds, ...goal.relatedJournalIds]));
      }
      if (goal.relatedMemoryIds) {
        allMemoryIds = Array.from(new Set([...allMemoryIds, ...goal.relatedMemoryIds]));
      }

      (goal.milestones || []).forEach((m) => {
        allMilestones.push({
          ...m,
          order: allMilestones.length + 1,
          goalId: goal.id,
          goalTitle: goal.title,
          goalCategory: goal.category,
        });
      });
    });

    const overallProgress = calculateGoalProgress({ milestones: allMilestones });

    return {
      id: 'all',
      userId: uid,
      title: 'Master Grand Prix Championship (All Circuits Unified)',
      description: `Complete continuous racing roadmap connecting all ${goals.length} goal circuits into one unified track.`,
      category: 'Grand Prix Championship',
      progress: overallProgress,
      milestones: allMilestones,
      relatedJournalIds: allJournalIds,
      relatedMemoryIds: allMemoryIds,
      createdAt: new Date().toISOString(),
    };
  }, [goals, uid]);

  // Active Goal (Either single circuit or Master Grand Prix)
  const activeGoal = useMemo(() => {
    if (selectedGoalId === 'all') {
      return allGoalsUnifiedTrack || goals[0] || null;
    }
    return goals.find((g) => g.id === selectedGoalId) || allGoalsUnifiedTrack || goals[0] || null;
  }, [goals, selectedGoalId, allGoalsUnifiedTrack]);

  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setActiveMilestone(null);
    if (uid) {
      localStorage.setItem(`pgj_active_goal_${uid}`, goalId);
    }
  };

  // Find target parent goal id for a milestone
  const findGoalIdForMilestone = (milestoneId: string): string => {
    // 1. If currently viewing a specific active goal (not 'all'), check if active goal has this milestone
    if (activeGoal && activeGoal.id !== 'all' && activeGoal.milestones?.some((m) => m.id === milestoneId)) {
      return activeGoal.id;
    }
    // 2. Search directly in all goals for the exact milestone ID
    for (const g of goals) {
      if (g.milestones && g.milestones.some((m) => m.id === milestoneId)) {
        return g.id;
      }
    }
    // 3. Fallback to active milestone's goalId if available
    if (activeMilestone?.goalId && activeMilestone.goalId !== 'all') {
      return activeMilestone.goalId;
    }
    if (activeGoal && activeGoal.id !== 'all') return activeGoal.id;
    return goals[0]?.id || '';
  };

  const handleSelectMilestone = (m: GoalMilestone) => {
    setActiveMilestone(m);
  };

  const handleCloseCheckpointModal = () => {
    setActiveMilestone(null);
  };

  // Handlers for Milestone Operations
  const handleToggleMilestone = async (milestoneId: string, explicitState?: boolean) => {
    if (!uid) return;
    const targetGoalId = findGoalIdForMilestone(milestoneId);
    if (!targetGoalId) return;

    try {
      const updated = await toggleMilestoneCompletion(uid, targetGoalId, milestoneId, explicitState);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      
      const refreshed = updated.milestones.find((m) => m.id === milestoneId);
      if (activeMilestone?.id === milestoneId && refreshed) {
        setActiveMilestone({
          ...refreshed,
          goalId: updated.id,
          goalTitle: updated.title,
          goalCategory: updated.category,
        });
      }
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
    }
  };

  const handleToggleAllTasks = async (milestoneId: string, markAllComplete: boolean) => {
    if (!uid) return;
    const targetGoalId = findGoalIdForMilestone(milestoneId);
    if (!targetGoalId) return;

    try {
      const updated = await toggleAllMilestoneTasks(uid, targetGoalId, milestoneId, markAllComplete);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (activeMilestone?.id === milestoneId) {
        const refreshed = updated.milestones.find((m) => m.id === milestoneId);
        if (refreshed) {
          setActiveMilestone({
            ...refreshed,
            goalId: updated.id,
            goalTitle: updated.title,
            goalCategory: updated.category,
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle all tasks:', err);
    }
  };

  const handleToggleTask = async (milestoneId: string, taskId: string) => {
    if (!uid) return;
    const targetGoalId = findGoalIdForMilestone(milestoneId);
    if (!targetGoalId) return;

    try {
      const updated = await toggleMilestoneTask(uid, targetGoalId, milestoneId, taskId);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (activeMilestone?.id === milestoneId) {
        const refreshed = updated.milestones.find((m) => m.id === milestoneId);
        if (refreshed) {
          setActiveMilestone({
            ...refreshed,
            goalId: updated.id,
            goalTitle: updated.title,
            goalCategory: updated.category,
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleAddTask = async (milestoneId: string, taskTitle: string) => {
    if (!uid) return;
    const targetGoalId = findGoalIdForMilestone(milestoneId);
    if (!targetGoalId) return;

    try {
      const updated = await addMilestoneTask(uid, targetGoalId, milestoneId, taskTitle);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (activeMilestone?.id === milestoneId) {
        const refreshed = updated.milestones.find((m) => m.id === milestoneId);
        if (refreshed) {
          setActiveMilestone({
            ...refreshed,
            goalId: updated.id,
            goalTitle: updated.title,
            goalCategory: updated.category,
          });
        }
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleDeleteTask = async (milestoneId: string, taskId: string) => {
    if (!uid) return;
    const targetGoalId = findGoalIdForMilestone(milestoneId);
    if (!targetGoalId) return;

    try {
      const updated = await deleteMilestoneTask(uid, targetGoalId, milestoneId, taskId);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      if (activeMilestone?.id === milestoneId) {
        const refreshed = updated.milestones.find((m) => m.id === milestoneId);
        if (refreshed) {
          setActiveMilestone({
            ...refreshed,
            goalId: updated.id,
            goalTitle: updated.title,
            goalCategory: updated.category,
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAddMilestone = async (data: {
    title: string;
    description: string;
    targetDate?: string;
  }) => {
    if (!uid) return;
    const targetGoalId = activeGoal && activeGoal.id !== 'all' ? activeGoal.id : goals[0]?.id;
    if (!targetGoalId) return;

    try {
      const updated = await addMilestoneToGoal(uid, targetGoalId, data);
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (err) {
      console.error('Failed to add milestone to goal track:', err);
    }
  };

  const handleCreateGoal = async (data: {
    title: string;
    description: string;
    category: string;
    targetDate?: string;
    initialMilestones: Array<{ title: string; description: string; targetDate?: string }>;
  }) => {
    if (!uid) return;
    try {
      const created = await createGoalTrack(uid, data);
      setGoals((prev) => [created, ...prev]);
      handleSelectGoal(created.id);
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string, goalTitle?: string) => {
    if (!uid) return;
    try {
      // Optimistic update: immediately remove circuit and reassign selection
      setGoals((prev) => {
        const remaining = prev.filter((g) => g.id !== goalId);
        if (selectedGoalId === goalId) {
          setSelectedGoalId(remaining.length > 0 ? remaining[0].id : 'all');
        }
        return remaining;
      });
      setActiveMilestone(null);
      await deleteGoalTrack(uid, goalId);
    } catch (err) {
      console.error('Failed to delete goal track:', err);
    }
  };

  const handleApproveDetectedGoal = async (suggestion: AISuggestion) => {
    if (!uid) return;
    await handleCreateGoal({
      title: suggestion.title,
      description: suggestion.description,
      category: 'Career & Growth',
      initialMilestones: [
        { title: `Foundation & Setup for ${suggestion.title}`, description: 'Initial planning phase' },
        { title: `Core Practice & Project Deliverables`, description: 'Implementation phase' },
        { title: `Mastery & F1 Track Championship`, description: 'Review progress & mark complete' },
      ],
    });
    setDetectedGoalSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  };

  // Total summary stats
  const totalAllMilestones = useMemo(() => {
    return goals.reduce((acc, g) => acc + (g.milestones?.length || 0), 0);
  }, [goals]);

  const totalCompletedMilestones = useMemo(() => {
    return goals.reduce((acc, g) => acc + (g.milestones?.filter((m) => m.completed).length || 0), 0);
  }, [goals]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060811] text-slate-100 flex flex-col">
      <FeatureNavigation
        title="Goal Roadmap Circuit & F1 Checkpoints"
        onBack={onBackToHome}
        onClose={onBackToHome}
      />

      {/* Action Toolbar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between pb-2">
        <div className="text-xs text-slate-400 hidden sm:block">
          AI Analyzed & Automatically Linked Sequential Checkpoints with Verified Journal Evidence
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedGoalId !== 'all' && (
            <button
              onClick={() => {
                const target = goals.find((g) => g.id === selectedGoalId);
                if (target) handleDeleteGoal(target.id, target.title);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md"
              title="Delete this goal circuit"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Circuit</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Goal Circuit</span>
          </button>
        </div>
      </div>

      {/* Prominent Goal Circuits Ribbon (Master Track + All Individual Goal Circuits) */}
      {goals.length > 0 && (
        <section className="relative z-20 px-4 sm:px-6 py-2.5 bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-xl flex items-center gap-3 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider shrink-0 pr-1">
            <Flag className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">Circuits ({goals.length}):</span>
          </div>

          <div className="flex items-center gap-2.5 min-w-max">
            {/* 1. MASTER GRAND PRIX BUTTON (ALL CIRCUITS & CHECKPOINTS UNIFIED) */}
            <button
              onClick={() => handleSelectGoal('all')}
              className={`relative px-4 py-2 rounded-2xl transition-all duration-200 cursor-pointer flex items-center gap-3 border text-left ${
                selectedGoalId === 'all'
                  ? 'bg-gradient-to-r from-pink-950/95 via-purple-950/95 to-indigo-950 border-pink-500 shadow-xl shadow-pink-950/70 ring-2 ring-pink-500/40 scale-102'
                  : 'bg-slate-900/80 border-slate-800 hover:border-pink-500/50 hover:bg-slate-800/90'
              }`}
            >
              <div className="relative flex items-center justify-center text-lg">
                🏆
              </div>

              <div className="flex flex-col min-w-[140px] max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider">
                    MASTER GRAND PRIX
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${selectedGoalId === 'all' ? 'text-pink-300' : 'text-slate-400'}`}>
                    {allGoalsUnifiedTrack?.progress || 0}%
                  </span>
                </div>

                <span className="text-xs font-bold text-white font-display truncate">
                  All Goal Circuits Unified
                </span>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono mt-0.5">
                  <span className="text-emerald-400 font-bold">{totalCompletedMilestones}/{totalAllMilestones} CPs</span>
                  <span className="text-slate-500">•</span>
                  <span>{goals.length} Circuits</span>
                  {selectedGoalId === 'all' && (
                    <span className="px-1.5 py-0.2 rounded bg-pink-500/30 text-pink-300 text-[9px] font-bold border border-pink-500/40">
                      ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* 2. INDIVIDUAL GOAL CIRCUITS */}
            {goals.map((goal) => {
              const isSelected = selectedGoalId === goal.id;
              const completedMilestones = (goal.milestones || []).filter((m) => m.completed).length;
              const totalMilestones = (goal.milestones || []).length;
              const progress = goal.progress || 0;

              return (
                <div key={goal.id} className="relative group/circuit shrink-0">
                  <button
                    onClick={() => handleSelectGoal(goal.id)}
                    className={`relative px-4 py-2 pr-8 rounded-2xl transition-all duration-200 cursor-pointer flex items-center gap-3 border text-left ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-950/90 via-purple-950/90 to-slate-900 border-pink-500 shadow-lg shadow-pink-950/60 ring-2 ring-pink-500/30 scale-102'
                        : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="text-base">
                        {isSelected ? '🏎️' : '🏁'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-[120px] max-w-[200px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider truncate">
                          {goal.category || 'Goal'}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-pink-300' : 'text-slate-400'}`}>
                          {progress}%
                        </span>
                      </div>

                      <span className="text-xs font-bold text-white font-display truncate">
                        {goal.title}
                      </span>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{completedMilestones}/{totalMilestones} Checkpoints</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Delete Circuit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGoal(goal.id, goal.title);
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg text-rose-400 hover:text-rose-200 bg-slate-950/90 hover:bg-rose-950/90 border border-slate-800 hover:border-rose-800/80 transition-all opacity-80 group-hover/circuit:opacity-100 cursor-pointer z-10"
                    title={`Delete "${goal.title}" circuit`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 rounded-2xl border border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-900/40 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-pink-400" />
              <span>Add Circuit</span>
            </button>
          </div>
        </section>
      )}

      {/* AI Goal Detection Recommendation Banner (if journals mention new ambitions) */}
      {detectedGoalSuggestions.length > 0 && (
        <div className="relative z-20 mx-4 sm:mx-6 mt-2 p-3 rounded-2xl bg-gradient-to-r from-pink-950/80 via-slate-900/90 to-purple-950/80 border border-pink-500/40 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                AI Detected Potential Goal in Your Journal: &quot;{detectedGoalSuggestions[0].title}&quot;
              </p>
              <p className="text-[11px] text-slate-400">{detectedGoalSuggestions[0].description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleApproveDetectedGoal(detectedGoalSuggestions[0])}
              className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              Add Goal Track
            </button>
            <button
              onClick={() =>
                setDetectedGoalSuggestions((prev) => prev.filter((_, i) => i !== 0))
              }
              className="p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Roadmap Surface */}
      <main className="flex-1 relative overflow-hidden p-2 sm:p-4">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
            <p className="text-xs font-mono text-slate-400">Rendering F1 Goal Track Spline...</p>
          </div>
        ) : !activeGoal ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center">
            <Trophy className="w-12 h-12 text-slate-600" />
            <h3 className="text-lg font-bold text-white">No active goal circuit found</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-pink-600 text-white text-xs font-bold cursor-pointer"
            >
              Create Your First Goal Circuit
            </button>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* Overlay Telemetry Pill */}
            <div className="absolute top-3 left-3 z-30 pointer-events-none">
              <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-pink-500/30 shadow-xl flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-pink-400 font-bold">
                  <Flame className="w-4 h-4 text-pink-400 animate-pulse" />
                  <span>{activeGoal.title}</span>
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 font-bold">
                  {activeGoal.progress || 0}% Complete
                </span>
              </div>
            </div>

            <F1RoadmapTrack
              goal={activeGoal}
              allGoals={goals}
              onSelectMilestone={handleSelectMilestone}
              activeMilestoneId={activeMilestone?.id}
              onQuickAddMilestone={handleAddMilestone}
              isAllCircuitsView={selectedGoalId === 'all'}
              onToggleMilestoneComplete={handleToggleMilestone}
              onDeleteGoal={handleDeleteGoal}
            />
          </div>
        )}
      </main>

      {/* Checkpoint Detail Modal */}
      {activeMilestone && activeGoal && (
        <GoalCheckpointModal
          goal={
            activeMilestone.goalId && activeMilestone.goalId !== 'all'
              ? goals.find((g) => g.id === activeMilestone.goalId) || activeGoal
              : activeGoal
          }
          milestone={activeMilestone}
          allJournals={journals}
          allMemories={memories}
          onClose={handleCloseCheckpointModal}
          onToggleMilestoneComplete={handleToggleMilestone}
          onToggleTask={handleToggleTask}
          onToggleAllTasks={handleToggleAllTasks}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onNavigateToJournal={(jId) => {
            setActiveMilestone(null);
            if (onNavigateToJournal) onNavigateToJournal(jId);
            else onBackToHome();
          }}
          onNavigateToMemory={(mId) => {
            setActiveMilestone(null);
            if (onNavigateToMemory) onNavigateToMemory(mId);
          }}
        />
      )}

      {/* Goal Creator Modal */}
      {showCreateModal && (
        <GoalCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreateGoal={handleCreateGoal}
        />
      )}
    </div>
  );
};
