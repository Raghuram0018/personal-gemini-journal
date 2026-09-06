import React, { useState } from 'react';
import { useMusicPlayer } from '../MusicPlayerContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  Maximize2,
  Disc,
  X,
} from 'lucide-react';
import '../music.css';

export const PersistentTopPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    togglePlayPause,
    stop,
    seek,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
    openNowPlaying,
    toggleQueue,
    toggleFavorite,
    isFavorited,
  } = useMusicPlayer();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isFav = isFavorited(currentTrack.id);

  return (
    <div
      className="fixed top-4 right-4 sm:right-6 z-[9999] transition-all duration-300 ease-out flex justify-end"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {!isExpanded ? (
        /* Collapsed Dynamic Island Pill */
        <div
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-purple-500/40 shadow-2xl backdrop-blur-2xl cursor-pointer hover:border-purple-400 group transition-all"
        >
          {/* Mini Album Art with Equalizer Bars */}
          <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-purple-500/30">
            <img
              src={currentTrack.albumImage}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-2">
                  <span className="w-0.5 bg-purple-400 eq-bar-1" />
                  <span className="w-0.5 bg-purple-400 eq-bar-2" />
                  <span className="w-0.5 bg-purple-400 eq-bar-3" />
                </div>
              </div>
            )}
          </div>

          {/* Track Title */}
          <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
            {currentTrack.title}
          </span>

          {/* Quick Play/Pause Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            className="p-1 rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
          </button>

          {/* Close Player Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              stop();
            }}
            className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Stop & Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Expanded Dynamic Island Card */
        <div className="w-[360px] sm:w-[420px] p-4 rounded-3xl bg-slate-950/95 border border-purple-500/50 shadow-2xl backdrop-blur-3xl text-white space-y-3 animate-fadeIn">
          {/* Top Edge Audio Progress Bar */}
          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Track Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                onClick={openNowPlaying}
                className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 cursor-pointer group border border-purple-500/30"
              >
                <img
                  src={currentTrack.albumImage}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={openNowPlaying}>
                <p className="text-xs font-bold text-white truncate hover:text-purple-300">
                  {currentTrack.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentTrack.artist} &bull; <span className="text-purple-400">{currentTrack.genre}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleFavorite(currentTrack)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isFav ? 'text-pink-500 bg-pink-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stop();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Stop & Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls & Timeline */}
          <div className="space-y-1.5 pt-1 border-t border-slate-900">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={previousTrack}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 hover:scale-105 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={nextTrack}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="music-slider flex-1"
              />
              <span className="w-8">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="music-slider w-20"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleQueue}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Queue"
              >
                <ListMusic className="w-4 h-4" />
              </button>
              <button
                onClick={openNowPlaying}
                className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Fullscreen Now Playing"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
