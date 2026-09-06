import React, { useState, useEffect } from 'react';
import { GoalTrack, GoalMilestone, JournalEntry, MemoryItem, GoalTaskItem } from '../../../types';
import {
  X,
  CheckCircle2,
  Sparkles,
  Calendar,
  FileText,
  Plus,
  Compass,
  Trophy,
  Flame,
  Check,
  ChevronRight,
  ListChecks,
  CheckCheck,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface GoalCheckpointModalProps {
  goal: GoalTrack;
  milestone: GoalMilestone;
  allJournals?: JournalEntry[];
  allMemories?: MemoryItem[];
  onClose: () => void;
  onToggleMilestoneComplete: (milestoneId: string, explicitState?: boolean) => void;
  onToggleTask: (milestoneId: string, taskId: string) => void;
  onToggleAllTasks?: (milestoneId: string, markAllComplete: boolean) => void;
  onAddTask: (milestoneId: string, taskTitle: string) => void;
  onDeleteTask?: (milestoneId: string, taskId: string) => void;
  onNavigateToJournal?: (journalId: string) => void;
  onNavigateToMemory?: (memoryId: string) => void;
}

export const GoalCheckpointModal: React.FC<GoalCheckpointModalProps> = ({
  goal,
  milestone,
  allJournals = [],
  allMemories = [],
  onClose,
  onToggleMilestoneComplete,
  onToggleTask,
  onToggleAllTasks,
  onAddTask,
  onDeleteTask,
  onNavigateToJournal,
  onNavigateToMemory,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  
  // Local optimistic state for tasks for ultra-responsive individual & batch checking
  const [localTasks, setLocalTasks] = useState<GoalTaskItem[]>(milestone.tasks || []);

  useEffect(() => {
    setLocalTasks(milestone.tasks || []);
  }, [milestone.tasks]);

  // Compute related journals for this milestone or goal
  const relatedJournals = allJournals.filter(
    (j) =>
      (goal.relatedJournalIds && goal.relatedJournalIds.includes(j.id)) ||
      (j.title && j.title.toLowerCase().includes(goal.title.toLowerCase().slice(0, 10))) ||
      (j.content && j.content.toLowerCase().includes(milestone.title.toLowerCase().slice(0, 15)))
  );

  // Compute related memories
  const relatedMemories = allMemories.filter(
    (m) =>
      (goal.relatedMemoryIds && goal.relatedMemoryIds.includes(m.id)) ||
      (m.sourceGoalIds && m.sourceGoalIds.includes(goal.id)) ||
      (m.title && m.title.toLowerCase().includes(goal.title.toLowerCase().slice(0, 10)))
  );

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || isSubmittingTask) return;
    setIsSubmittingTask(true);
    const title = newTaskTitle.trim();
    try {
      const tempTask: GoalTaskItem = {
        id: `t_temp_${Date.now()}`,
        title,
        completed: false,
      };
      setLocalTasks((prev) => [...prev, tempTask]);
      onAddTask(milestone.id, title);
      setNewTaskTitle('');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleIndividualTaskToggle = (taskId: string) => {
    // 1. Optimistic update
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    // 2. Invoke parent handler
    onToggleTask(milestone.id, taskId);
  };

  const handleDeleteTaskItem = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (onDeleteTask) {
      onDeleteTask(milestone.id, taskId);
    }
  };

  const completedTasksCount = localTasks.filter((t) => t.completed).length;
  const allTasksCompleted = localTasks.length > 0 && completedTasksCount === localTasks.length;
  const isCompleted = milestone.completed;

  const handleBackToCircuit = () => {
    // If all tasks are completed and milestone was not yet marked complete, auto-confirm completion
    if (!isCompleted && allTasksCompleted && localTasks.length > 0) {
      onToggleMilestoneComplete(milestone.id, true);
    }
    onClose();
  };

  const handleToggleAll = (markAll: boolean) => {
    // 1. Optimistic batch update
    setLocalTasks((prev) =>
      prev.map((t) => ({
        ...t,
        completed: markAll,
        completedAt: markAll ? new Date().toISOString() : undefined,
      }))
    );

    // 2. Fire batch handler
    if (onToggleAllTasks) {
      onToggleAllTasks(milestone.id, markAll);
    } else {
      localTasks.forEach((t) => {
        if (t.completed !== markAll) {
          onToggleTask(milestone.id, t.id);
        }
      });
      if (markAll && !isCompleted) {
        onToggleMilestoneComplete(milestone.id, true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-fadeIn overflow-y-auto">
      <div className="max-w-3xl w-full my-auto rounded-3xl bg-slate-900/95 border border-pink-500/30 shadow-2xl shadow-pink-950/40 p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Top Header with Close Button */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl border transition-all ${
                isCompleted
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-2 ring-emerald-500/20'
                  : 'bg-pink-500/15 text-pink-400 border-pink-500/30'
              }`}
            >
              {isCompleted ? <Trophy className="w-6 h-6" /> : <Flame className="w-6 h-6 animate-bounce" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {goal.title}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>✓ Completed Lap (Passed)</span>
                    </>
                  ) : (
                    <>
                      <Flame className="w-3 h-3 text-pink-400" />
                      <span>⚡ In Progress Checkpoint</span>
                    </>
                  )}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-1">
                Milestone #{milestone.order}: {milestone.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleMilestoneComplete(milestone.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-pink-600 border-slate-700'
              }`}
              title={isCompleted ? 'Click to Reopen Lap' : 'Click to Mark Milestone Complete'}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isCompleted ? 'Lap Passed' : 'Mark Lap Complete'}</span>
            </button>

            <button
              onClick={handleBackToCircuit}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Milestone Description & Target Timeline */}
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">{milestone.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-pink-400" />
              <span>Target: {milestone.targetDate || goal.targetDate || 'Continuous Pace'}</span>
            </span>
            {milestone.completedAt && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Passed: {new Date(milestone.completedAt).toLocaleDateString()}</span>
              </span>
            )}
          </div>
        </div>

        {/* AI Grounded Explanation & Milestone Evidence */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>AI Evidence & Progress Grounding</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {milestone.aiExplanation ||
              (isCompleted
                ? `Your progress reached 100% on this milestone through verified journal reflections and completed tactical items.`
                : `Currently tracking active execution. Action items completed: ${completedTasksCount}/${localTasks.length}. Progress synchronizes with verified journal reflections.`)}
          </p>
          {milestone.evidence && (
            <div className="text-[11px] font-mono text-emerald-400/90 bg-slate-900/80 p-2.5 rounded-xl border border-emerald-500/20 whitespace-pre-line">
              📌 Evidence: {milestone.evidence}
            </div>
          )}
        </div>

        {/* Checkpoint Tasks & Action Items (Individual Checking + Batch Action Items) */}
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white font-display">
                Checkpoint Action Items
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                allTasksCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {completedTasksCount}/{localTasks.length} Checked
              </span>
            </div>

            {/* Check All / Uncheck All Batch Buttons */}
            {localTasks.length > 0 && (
              <div className="flex items-center gap-2">
                {allTasksCompleted ? (
                  <button
                    onClick={() => handleToggleAll(false)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Uncheck All Items</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleAll(true)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-500/40 shadow-sm"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Check All ({localTasks.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* List of Interactive Action Items with Individual Checking */}
          <div className="space-y-2">
            {localTasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 text-center">
                No subtasks registered yet. Add your first execution step below.
              </div>
            ) : (
              localTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleIndividualTaskToggle(task.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                    task.completed
                      ? 'bg-slate-950/90 border-emerald-500/40 text-slate-300 hover:border-emerald-500/70 shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-pink-500/60 text-slate-200 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIndividualTaskToggle(task.id);
                      }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        task.completed
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                          : 'border-2 border-slate-600 group-hover:border-pink-400 text-transparent bg-slate-900'
                      }`}
                      title={task.completed ? 'Click to uncheck item' : 'Click to check item'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs sm:text-sm font-medium transition-colors truncate ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-white'
                      }`}>
                        {task.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.completed ? (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Passed ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-pink-300 transition-colors">
                        Click to check
                      </span>
                    )}

                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTaskItem(task.id, e)}
                        className="p-1 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Delete action item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Success Banner if All Tasks Selected */}
          {allTasksCompleted && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 font-mono animate-fadeIn">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All {localTasks.length} checkpoint action items verified and completed!</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                100% DONE
              </span>
            </div>
          )}

          {/* Add New Task Inline Form */}
          <form onSubmit={handleAddNewTask} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add next tactical action item..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || isSubmittingTask}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </form>
        </div>

        {/* Connected Canonical Life Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          {/* Related Journals */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <FileText className="w-4 h-4" />
                <span>Connected Journals</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{relatedJournals.length} linked</span>
            </div>
            {relatedJournals.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No direct journals linked yet. Write a reflection on this goal to attach evidence.
              </p>
            ) : (
              <div className="space-y-1.5">
                {relatedJournals.slice(0, 2).map((j) => (
                  <div
                    key={j.id}
                    onClick={() => onNavigateToJournal?.(j.id)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">{j.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(j.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Memories */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Compass className="w-4 h-4" />
                <span>Connected Memories</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{relatedMemories.length} linked</span>
            </div>
            {relatedMemories.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Milestones will automatically register in your 3D Memory Universe once completed.
              </p>
            ) : (
              <div className="space-y-1.5">
                {relatedMemories.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigateToMemory?.(m.id)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-200 truncate">{m.title}</p>
                      <p className="text-[10px] text-purple-300 font-mono">{m.category || 'Memory'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer (Always Clickmark Milestone Complete Available) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleMilestoneComplete(milestone.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 sm:flex-initial ${
                isCompleted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-pink-500/40'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-600/30'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? '✓ Milestone Completed (Click to Reopen)' : '🏁 Mark Milestone Complete (100%)'}</span>
            </button>

            {!isCompleted && allTasksCompleted && (
              <button
                onClick={() => onToggleMilestoneComplete(milestone.id, true)}
                className="px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Confirm Passed Lap</span>
              </button>
            )}
          </div>

          <button
            onClick={handleBackToCircuit}
            className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Back to Circuit Map
          </button>
        </div>
      </div>
    </div>
  );
};

