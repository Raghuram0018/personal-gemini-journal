import React from 'react';
import './journal.css';
import { PenSquare, Mic, Lock, Image as ImageIcon, Bookmark } from 'lucide-react';

export const JournalShell: React.FC = () => {
  return (
    <div id="journal-shell" className="journal-editor-boundary p-5 rounded-2xl border border-slate-800 bg-slate-900/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <PenSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Journal & Rich Editor Module</h3>
          <p className="text-xs text-slate-400">Voice-to-text, rich media, timeline, categories, PIN privacy</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs text-slate-400">
        <span className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-indigo-400" /> Voice-to-Text
        </span>
        <span className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Media Attachments
        </span>
        <span className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" /> Bookmarks
        </span>
        <span className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-rose-400" /> PIN Encryption
        </span>
      </div>
    </div>
  );
};
