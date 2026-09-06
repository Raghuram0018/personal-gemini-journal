import React from 'react';
import './music.css';
import { Music, Disc, Headphones } from 'lucide-react';

export const MusicShell: React.FC = () => {
  return (
    <div id="music-shell" className="music-equalizer-glow p-5 rounded-2xl border border-slate-800 bg-slate-900/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
          <Music className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Music Memories Module</h3>
          <p className="text-xs text-slate-400">Songs, albums, mood associations, and emotional timeline anchors</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <Disc className="w-3.5 h-3.5 text-pink-400" /> Soundtrack of Life
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <Headphones className="w-3.5 h-3.5 text-purple-400" /> Mood Anchoring
        </span>
      </div>
    </div>
  );
};
