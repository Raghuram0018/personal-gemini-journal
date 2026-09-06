import React, { useState } from 'react';
import { MemoryItem, JournalEntry, GoalTrack } from '../../../types';
import {
  X,
  Calendar,
  Sparkles,
  BookOpen,
  Target,
  MapPin,
  Users,
  Tag,
  Trash2,
  Edit3,
  ShieldCheck,
  ExternalLink,
  Flame,
  CheckCircle2,
  Music,
  ImageIcon,
  Headphones,
  Maximize2,
} from 'lucide-react';

interface MemoryDetailModalProps {
  memory: MemoryItem | null;
  allJournals?: JournalEntry[];
  allGoals?: GoalTrack[];
  onClose: () => void;
  onUpdateMemory: (memoryId: string, updates: Partial<MemoryItem>) => Promise<void>;
  onDeleteMemory: (memoryId: string) => Promise<void>;
  onNavigateToHomeJournal?: (journalId: string) => void;
  onNavigateToGoal?: (goalId: string) => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  allJournals = [],
  allGoals = [],
  onClose,
  onUpdateMemory,
  onDeleteMemory,
  onNavigateToHomeJournal,
  onNavigateToGoal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMood, setEditMood] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!memory) return null;

  // Initialize edit state when entering edit mode
  const startEditing = () => {
    setEditTitle(memory.title);
    setEditSummary(memory.summary || memory.snippet || '');
    setEditCategory(memory.category || 'Milestones');
    setEditMood(memory.mood || memory.emotionalTag || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateMemory(memory.id, {
        title: editTitle.trim(),
        summary: editSummary.trim(),
        snippet: editSummary.trim(),
        category: editCategory,
        mood: editMood,
        emotionalTag: editMood,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save memory edit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteMemory(memory.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const linkedJournals = allJournals.filter((j) =>
    (memory.sourceJournalIds || []).includes(j.id)
  );

  const linkedGoals = allGoals.filter((g) =>
    (memory.sourceGoalIds || []).includes(g.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100">
        {/* Header with Close */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {memory.category || 'Milestone'}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{memory.date}</span>
            </div>
            {memory.aiGenerated && (
              <span className="flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-800/40">
                <Sparkles className="w-2.5 h-2.5" /> AI Discovered
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Memory Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/40 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Achievements">Achievements</option>
                <option value="Milestones">Milestones</option>
                <option value="Emotional Moments">Emotional Moments</option>
                <option value="Goals">Goals</option>
                <option value="Learning">Learning</option>
                <option value="Relationships">Relationships</option>
                <option value="Experiences">Experiences</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Summary / Story</label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-indigo-500/40 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Emotional Mood</label>
              <input
                type="text"
                value={editMood}
                onChange={(e) => setEditMood(e.target.value)}
                placeholder="e.g. Proud, Inspired, Peaceful"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-snug">
                {memory.title}
              </h2>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                {memory.summary || memory.snippet}
              </p>
            </div>

            {/* Attached Photo / Visual Memory */}
            {(memory.imageUrl || linkedJournals.find((j) => j.mediaAttachments?.length)?.mediaAttachments?.[0]?.url) && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Visual Evidence</span>
                </h3>
                <div className="relative group overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/80 max-h-72">
                  <img
                    src={memory.imageUrl || linkedJournals.find((j) => j.mediaAttachments?.length)?.mediaAttachments?.[0]?.url}
                    alt={memory.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-56 sm:h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-4">
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{linkedJournals[0]?.mediaAttachments?.[0]?.title || 'Attached Life Moment Photography'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Books & Literature Reference */}
            {(memory.sourceBookIds && memory.sourceBookIds.length > 0) && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Connected Book Memory</span>
                </h3>
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-amber-200">
                      {memory.topics?.find((t) => ['Atomic Habits', 'Martin Kleppmann', 'Morgan Housel', 'Psychology of Money', 'Clean Code', 'Into the Wild', 'Meditations', 'Marcus Aurelius'].includes(t)) || 'Literature Insight'}
                    </div>
                    <div className="text-xs text-amber-300/80">
                      Linked reading reflections preserved in canonical library
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold shrink-0 border border-amber-500/30">
                    Book Reference
                  </span>
                </div>
              </div>
            )}

            {/* Connected Soundtrack & Music Memory */}
            {(memory.sourceMusicIds && memory.sourceMusicIds.length > 0) && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-cyan-400" />
                  <span>Associated Soundtrack & Vibe</span>
                </h3>
                <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-cyan-100">
                        {memory.topics?.find((t) => ['Claude Debussy', 'M83', 'Marconi Union', 'Ludovico Einaudi', 'Daft Punk', 'Bon Iver', 'Incubus'].includes(t)) || 'Soundtrack Memory'}
                      </div>
                      <div className="text-xs text-cyan-300/80">
                        Audio anchor recorded during personal reflection
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold shrink-0 border border-cyan-500/30">
                    Music Memory
                  </span>
                </div>
              </div>
            )}

            {/* Tags & Metadata */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(memory.mood || memory.emotionalTag) && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-800/40 text-xs text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Mood: {memory.mood || memory.emotionalTag}</span>
                </div>
              )}

              {(memory.topics || []).map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 text-xs text-slate-300 border border-slate-700/60"
                >
                  <Tag className="w-3 h-3 text-indigo-400" />
                  {t}
                </span>
              ))}

              {(memory.places || []).map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/40 text-xs text-emerald-300 border border-emerald-800/40"
                >
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  {p}
                </span>
              ))}

              {(memory.people || []).map((peep, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/40 text-xs text-purple-300 border border-purple-800/40"
                >
                  <Users className="w-3 h-3 text-purple-400" />
                  {peep}
                </span>
              ))}
            </div>

            {/* Linked Canonical Journals Section */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Connected Journal Sources ({linkedJournals.length})</span>
              </h3>

              {linkedJournals.length > 0 ? (
                <div className="space-y-2">
                  {linkedJournals.map((j) => (
                    <div
                      key={j.id}
                      className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4 hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-white">{j.title || 'Untitled Journal'}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {j.content?.slice(0, 100)}...
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {j.createdAt?.slice(0, 10)}
                        </div>
                      </div>

                      {onNavigateToHomeJournal && (
                        <button
                          onClick={() => onNavigateToHomeJournal(j.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          <span>Open in Home</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  This memory represents a synthesized milestone or life reflection.
                </p>
              )}
            </div>

            {/* Linked Goal Connections */}
            {linkedGoals.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-400" />
                  <span>Connected Goal</span>
                </h3>
                <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-800/40 flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-sky-200">
                    {linkedGoals[0].title}
                  </div>
                  {onNavigateToGoal && (
                    <button
                      onClick={() => onNavigateToGoal(linkedGoals[0].id)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <span>Open Goal Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        {!isEditing && (
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>User-Isolated Firestore Record</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={startEditing}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Memory</span>
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">Delete this memory?</span>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 text-xs transition-colors cursor-pointer"
                  title="Delete Memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
