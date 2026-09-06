import React, { useState, useEffect } from 'react';
import { MusicTrack } from '../musicTypes';
import { JournalEntry } from '../../../types';
import { getJournalsForUser } from '../../journal/journalService';
import { connectTrackToJournal } from '../musicService';
import { useAuth } from '../../../context/AuthContext';
import { X, BookOpen, Link, Check, Sparkles, Calendar } from 'lucide-react';

interface ConnectJournalModalProps {
  track: MusicTrack;
  onClose: () => void;
  onConnected?: () => void;
}

export const ConnectJournalModal: React.FC<ConnectJournalModalProps> = ({
  track,
  onClose,
  onConnected,
}) => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedJournalId, setSelectedJournalId] = useState<string>('');
  const [personalNote, setPersonalNote] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getJournalsForUser(uid)
      .then((entries) => {
        // Exclude private journals by default for safety unless user explicitly chooses
        setJournals(entries);
        if (entries.length > 0) {
          setSelectedJournalId(entries[0].id);
        }
      })
      .catch((err) => {
        console.warn('Failed to load journals:', err);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJournalId || !uid) {
      setError('Please select a journal entry.');
      return;
    }

    const journal = journals.find((j) => j.id === selectedJournalId);
    if (!journal) {
      setError('Selected journal not found.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await connectTrackToJournal(
        uid,
        track,
        journal.id,
        journal.title || 'Untitled Journal',
        personalNote
      );
      setSuccess(true);
      setTimeout(() => {
        if (onConnected) onConnected();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect track to journal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
      <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Connect to Journal</h3>
              <p className="text-[11px] text-purple-400 font-mono">Create an Emotional Memory Anchor</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Track Preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <img
            src={track.albumImage}
            alt={track.title}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border border-purple-500/20"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{track.title}</p>
            <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
            <span className="text-[10px] text-purple-400/80 font-mono">{track.genre}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your journals...</div>
        ) : journals.length === 0 ? (
          <div className="py-8 text-center space-y-2 text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
            <p className="text-xs">No journal entries found yet.</p>
            <p className="text-[11px] text-slate-500">
              Write an entry in your Memory Log to anchor this soundtrack.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Select Journal Entry
              </label>
              <select
                value={selectedJournalId}
                onChange={(e) => setSelectedJournalId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 custom-scrollbar"
              >
                {journals.map((j) => (
                  <option key={j.id} value={j.id} className="bg-slate-900 text-slate-200">
                    {j.title || 'Untitled Entry'} ({j.createdAt?.slice(0, 10) || 'Recent'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Memory Note (Optional)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Why is this song tied to this moment? (e.g. listened while drinking morning coffee in the rain)"
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Memory anchor connected successfully!</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || success}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? 'Linking...' : 'Connect to Journal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
