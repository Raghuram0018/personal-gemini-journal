import React, { useState } from 'react';
import { MemoryItem, JournalEntry, GoalTrack } from '../../../types';
import { X, CheckCircle2, Sparkles, BookOpen, Target, Calendar, Image as ImageIcon } from 'lucide-react';

interface CreateMemoryModalProps {
  journals: JournalEntry[];
  goals: GoalTrack[];
  onClose: () => void;
  onCreateMemory: (memory: Partial<MemoryItem>) => Promise<void>;
}

export const CreateMemoryModal: React.FC<CreateMemoryModalProps> = ({
  journals,
  goals,
  onClose,
  onCreateMemory,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<'Achievements' | 'Milestones' | 'Emotional Moments' | 'Goals' | 'Learning' | 'Relationships' | 'Experiences' | 'Other'>('Milestones');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [topics, setTopics] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const topicList = topics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await onCreateMemory({
        title: title.trim(),
        summary: summary.trim(),
        snippet: summary.trim(),
        category,
        date,
        mood: mood.trim() || 'Reflective',
        emotionalTag: mood.trim() || 'Reflective',
        imageUrl: imageUrl.trim() || undefined,
        mediaUrl: imageUrl.trim() || undefined,
        sourceJournalIds: selectedJournalIds,
        sourceGoalIds: selectedGoalId ? [selectedGoalId] : [],
        topics: topicList,
        tags: topicList,
        aiGenerated: false,
        confirmedByUser: true,
      });
      onClose();
    } catch (err) {
      console.error('Failed to create memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleJournal = (id: string) => {
    setSelectedJournalIds((prev) => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter((jId) => jId !== id) : [...prev, id];
      
      // Auto-populate image from selected journal if user hasn't typed an image URL yet
      if (!isRemoving && !imageUrl) {
        const targetJ = journals.find(j => j.id === id);
        const jImg = targetJ?.mediaAttachments?.find(m => m.type === 'image')?.url || (targetJ as any)?.imageUrl;
        if (jImg) setImageUrl(jImg);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-white">Create Canonical Memory</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Memory Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Completed First Full Marathon"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Milestones">Milestones</option>
                <option value="Achievements">Achievements</option>
                <option value="Emotional Moments">Emotional Moments</option>
                <option value="Goals">Goals</option>
                <option value="Learning">Learning</option>
                <option value="Relationships">Relationships</option>
                <option value="Experiences">Experiences</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Memory Narrative / Story</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the significance and reflection behind this memory..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Image / Photo URL (Optional)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or uploaded photo link"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {imageUrl && (
              <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-black/40">
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Emotional Mood</label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="e.g. Proud, Joyful, Peaceful"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Topics / Tags (comma-separated)</label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Fitness, Growth, Health"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Link Source Journals */}
          {journals.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Link Source Journals (Optional)</span>
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/60">
                {journals.map((j) => {
                  const isChecked = selectedJournalIds.includes(j.id);
                  return (
                    <div
                      key={j.id}
                      onClick={() => toggleJournal(j.id)}
                      className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40' : 'hover:bg-slate-700/40 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{j.title || 'Untitled Journal'}</span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {j.createdAt?.slice(0, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Create Memory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
