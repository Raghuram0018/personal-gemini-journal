import React from 'react';
import { useMusicPlayer } from '../MusicPlayerContext';
import { Play, Pause, Disc, Heart, Maximize2 } from 'lucide-react';
import '../music.css';

export const FloatingMiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    openNowPlaying,
    toggleFavorite,
    isFavorited,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const isFav = isFavorited(currentTrack.id);

  return (
    <div className="fixed bottom-24 right-5 z-40 animate-fadeIn select-none pointer-events-auto hidden md:block">
      <div className="flex items-center gap-3 p-2 pr-3.5 rounded-full bg-slate-950/90 backdrop-blur-xl border border-purple-500/30 shadow-2xl shadow-purple-950/40 hover:border-purple-500/50 transition-all group">
        {/* Spinning Vinyl Avatar */}
        <div
          onClick={openNowPlaying}
          className="relative w-11 h-11 rounded-full cursor-pointer overflow-hidden flex-shrink-0 border-2 border-slate-800"
          title="Expand Now Playing"
        >
          <img
            src={currentTrack.albumImage}
            alt={currentTrack.title}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover rounded-full ${
              isPlaying ? 'vinyl-spin' : 'vinyl-spin-paused'
            }`}
          />
          <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-slate-950 border border-slate-600 shadow-inner" />
        </div>

        {/* Track Info */}
        <div
          onClick={openNowPlaying}
          className="cursor-pointer max-w-[130px] overflow-hidden leading-tight"
        >
          <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
            {currentTrack.title}
          </p>
          <p className="text-[10px] text-slate-400 truncate">
            {currentTrack.artist}
          </p>
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Favorite Button */}
        <button
          onClick={() => toggleFavorite(currentTrack)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isFav ? 'text-pink-500 hover:text-pink-400' : 'text-slate-400 hover:text-white'
          }`}
          title={isFav ? 'Remove Favorite' : 'Save Favorite'}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {/* Maximize */}
        <button
          onClick={openNowPlaying}
          className="p-1.5 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
          title="Open Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
