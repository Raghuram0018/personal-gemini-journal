import React from 'react';
import { useMusicPlayer } from '../MusicPlayerContext';
import { X, Play, Trash2, ListMusic, Music } from 'lucide-react';
import '../music.css';

export const MusicQueueDrawer: React.FC = () => {
  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isQueueOpen,
    toggleQueue,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = useMusicPlayer();

  if (!isQueueOpen) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full bg-slate-900/95 border-l border-purple-500/20 shadow-2xl flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Playing Queue</h3>
              <p className="text-xs text-slate-400">
                {queue.length} {queue.length === 1 ? 'track' : 'tracks'} queued
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <button
                onClick={clearQueue}
                className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                title="Clear queue"
              >
                Clear
              </button>
            )}
            <button
              onClick={toggleQueue}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Close Queue"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {queue.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Music className="w-8 h-8 mx-auto opacity-40 text-purple-400" />
              <p className="text-xs">Your queue is empty.</p>
              <p className="text-[11px] text-slate-600">
                Add tracks from the Music Library to keep your session flowing.
              </p>
            </div>
          ) : (
            queue.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id && idx === currentIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-purple-950/40 border-purple-500/40 shadow-lg shadow-purple-950/30'
                      : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    onClick={() => playTrack(track, queue)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700">
                      <img
                        src={track.albumImage}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && isPlaying && (
                        <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-0.5 bg-purple-400 eq-bar-1" />
                            <span className="w-0.5 bg-purple-400 eq-bar-2" />
                            <span className="w-0.5 bg-purple-400 eq-bar-3" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? 'text-purple-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
