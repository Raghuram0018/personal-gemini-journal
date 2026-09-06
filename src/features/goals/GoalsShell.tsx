import React, { useState, useEffect } from 'react';
import './goals.css';
import { Target, Flag, CheckCircle2, Plus, Sparkles, Trophy, Calendar } from 'lucide-react';
import { getGoalsForUser, createGoalForUser } from '../../services/canonicalService';
import { GoalTrack } from '../../types';

interface GoalsShellProps {
  uid?: string;
}

export const GoalsShell: React.FC<GoalsShellProps> = ({ uid }) => {
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Career & Growth');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const data = await getGoalsForUser(uid);
        setGoals(data);
      } catch (err) {
        console.warn('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, [uid]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !newTitle.trim() || isAdding) return;

    try {
      setIsAdding(true);
      const created = await createGoalForUser(uid, newTitle, newCategory);
      setGoals((prev) => [created, ...prev]);
      setNewTitle('');
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 pb-24">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-950/60 via-slate-900 to-purple-950/60 border border-pink-500/30 shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-inner">
            <Target className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
              <span>Goal Journey Map</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Canonical Track
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Sequential milestones connected directly to your personal journal entries
            </p>
          </div>
        </div>
      </div>

      {/* Create New Goal Form */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4 backdrop-blur-2xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>Add New Life Goal</span>
        </h3>
        <form onSubmit={handleCreateGoal} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Goal Title (e.g., 'Master Machine Learning')..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            required
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          >
            <option value="Career & Growth">Career & Growth</option>
            <option value="Health & Wellness">Health & Wellness</option>
            <option value="Personal Project">Personal Project</option>
            <option value="Learning">Learning & Skills</option>
          </select>
          <button
            type="submit"
            disabled={!newTitle.trim() || isAdding}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </button>
        </form>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 animate-pulse">
            Loading canonical goal tracks...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">No active goal tracks found. Add a goal or journal about your ambitions.</p>
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-pink-500/30 shadow-xl backdrop-blur-2xl space-y-4 transition-all"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-pink-500/10 text-pink-300 border border-pink-500/20">
                    {goal.category}
                  </span>
                  <h2 className="text-lg font-bold text-white font-display">{goal.title}</h2>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target: {goal.targetDate || 'Ongoing'}</span>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Sequential Milestones
                </span>
                <div className="space-y-2">
                  {goal.milestones?.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            m.completed ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span className={m.completed ? 'line-through text-slate-400' : 'text-slate-200'}>
                          {m.title}
                        </span>
                      </div>
                      {m.completed && (
                        <span className="text-[10px] text-emerald-400/80 font-mono">Completed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
