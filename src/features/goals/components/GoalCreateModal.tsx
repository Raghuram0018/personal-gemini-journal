import React, { useState } from 'react';
import { X, Sparkles, Plus, Target, Trash2, Calendar, Loader2 } from 'lucide-react';
import { generateGoalCheckpointsWithGemini } from '../../../services/api.client';

interface GoalCreateModalProps {
  onClose: () => void;
  onCreateGoal: (data: {
    title: string;
    description: string;
    category: string;
    targetDate?: string;
    initialMilestones: Array<{ title: string; description: string; targetDate?: string }>;
  }) => void;
}

export const GoalCreateModal: React.FC<GoalCreateModalProps> = ({
  onClose,
  onCreateGoal,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Career & Growth');
  const [targetDate, setTargetDate] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; targetDate?: string }>>([
    { title: 'Define Scope & Setup Tools', description: 'Establish clear benchmarks and resources.' },
    { title: 'Core Execution Phase', description: 'Complete key deliverable and log progress.' },
    { title: 'Final Review & Mastery', description: 'Celebrate achievement and integrate learnings.' },
  ]);

  const handleGenerateAiCheckpoints = async () => {
    if (!title.trim()) {
      alert('Please enter a goal title first before generating AI roadmap checkpoints.');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const res = await generateGoalCheckpointsWithGemini({ title, description, category });
      if (res.checkpoints && res.checkpoints.length > 0) {
        setMilestones(res.checkpoints);
      }
    } catch (err) {
      console.warn('Failed to generate AI checkpoints:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddMilestoneField = () => {
    setMilestones((prev) => [
      ...prev,
      { title: '', description: '' },
    ]);
  };

  const handleRemoveMilestoneField = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: 'title' | 'description' | 'targetDate', value: string) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validMilestones = milestones.filter((m) => m.title.trim().length > 0);
    onCreateGoal({
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate: targetDate || undefined,
      initialMilestones: validMilestones.length > 0 ? validMilestones : [
        { title: 'Kickoff and Initial Roadmap', description: 'Initial setup' }
      ],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-fadeIn overflow-y-auto">
      <div className="max-w-2xl w-full my-auto rounded-3xl bg-slate-900/95 border border-pink-500/30 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">Create F1 Goal Circuit</h2>
              <p className="text-xs text-slate-400">Design sequential milestones along your life roadmap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Goal Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Machine Learning & Neural Networks"
              required
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Category & Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                <option value="Career & Growth">Career & Growth</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Learning & Skills">Learning & Skills</option>
                <option value="Personal Ambition">Personal Ambition</option>
                <option value="Creative Project">Creative Project</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Target Finish Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Description / Ambition</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this goal matters and what success looks like..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Milestones list */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Circuit Milestones (Checkpoints)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAiCheckpoints}
                  disabled={isGeneratingAi || !title.trim()}
                  className="px-2.5 py-1 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 hover:text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-pink-400" />
                      <span>Generating AI Checkpoints...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>AI Generate Checkpoints</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAddMilestoneField}
                  className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer px-2 py-1 bg-slate-800 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-pink-400">
                      Checkpoint #{idx + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestoneField(idx)}
                        className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                    placeholder={`Milestone ${idx + 1} title...`}
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-pink-500"
                  />
                  <input
                    type="text"
                    value={m.description}
                    onChange={(e) => handleMilestoneChange(idx, 'description', e.target.value)}
                    placeholder="Brief description or evidence target..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-pink-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 cursor-pointer"
            >
              Launch Goal Circuit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
