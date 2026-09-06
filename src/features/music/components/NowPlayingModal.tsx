import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '../MusicPlayerContext';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  Smile,
  BookOpen,
  FileText,
  Check,
  Disc,
  Sparkles,
} from 'lucide-react';
import {
  MUSIC_MOOD_CONFIG,
  MusicMoodType,
} from '../musicTypes';
import {
  setMoodAssociation,
  savePersonalNoteForTrack,
  getNotesForUser,
  getMoodAssociationsForUser,
} from '../musicService';
import { ConnectJournalModal } from './ConnectJournalModal';
import { useAuth } from '../../../context/AuthContext';
import '../music.css';

export const NowPlayingModal: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    repeatMode,
    shuffle,
    isNowPlayingOpen,
    closeNowPlaying,
    togglePlayPause,
    seek,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    toggleQueue,
    toggleFavorite,
    isFavorited,
  } = useMusicPlayer();

  const [activeMood, setActiveMood] = useState<MusicMoodType | null>(null);
  const [personalNote, setPersonalNote] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<boolean>(false);
  const [isConnectJournalOpen, setIsConnectJournalOpen] = useState<boolean>(false);

  // Load existing mood & note when current track changes
  useEffect(() => {
    if (!currentTrack || !uid) return;

    // Load mood
    getMoodAssociationsForUser(uid).then((moods) => {
      const match = moods.find((m) => m.trackId === currentTrack.id);
      if (match) setActiveMood(match.mood);
      else setActiveMood(null);
    });

    // Load note
    getNotesForUser(uid).then((notes) => {
      const match = notes.find((n) => n.trackId === currentTrack.id);
      if (match) setPersonalNote(match.note);
      else setPersonalNote('');
    });
  }, [currentTrack?.id, uid]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isFav = isFavorited(currentTrack.id);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMoodSelect = async (mood: MusicMoodType) => {
    setActiveMood(mood);
    if (uid && currentTrack) {
      await setMoodAssociation(uid, currentTrack, mood);
    }
  };

  const handleSaveNote = async () => {
    if (!uid || !currentTrack) return;
    setIsSavingNote(true);
    try {
      await savePersonalNoteForTrack(uid, currentTrack.id, personalNote);
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 2000);
    } finally {
      setIsSavingNote(false);
    }
  };

  const skipSeconds = (delta: number) => {
    seek(currentTime + delta);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-fadeIn overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl w-full my-auto rounded-3xl bg-slate-900/95 border border-purple-500/30 shadow-2xl shadow-purple-950/50 p-6 sm:p-8 space-y-6 relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[11px] font-extrabold text-purple-400 font-mono tracking-wider uppercase">
                Now Playing &bull; Memory Soundtrack
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleQueue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                title="View queue"
              >
                <ListMusic className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">Queue</span>
              </button>
              <button
                onClick={closeNowPlaying}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Layout: Vinyl & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Spinning Vinyl Record with Center Album Cover */}
            <div className="md:col-span-5 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full vinyl-disc flex items-center justify-center bg-slate-950 border-4 border-slate-800">
                <img
                  src={currentTrack.albumImage}
                  alt={currentTrack.title}
                  referrerPolicy="no-referrer"
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-2 border-purple-500/40 shadow-xl ${
                    isPlaying ? 'vinyl-spin' : 'vinyl-spin-paused'
                  }`}
                />
                {/* Center hole of vinyl */}
                <div className="absolute w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-700 shadow-inner flex items-center justify-center" />

                {/* Grooves decoration */}
                <div className="absolute inset-4 rounded-full border border-slate-800/50 pointer-events-none" />
                <div className="absolute inset-10 rounded-full border border-slate-800/30 pointer-events-none" />
              </div>

              {/* Genre & Tag Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] font-semibold font-mono">
                  {currentTrack.genre}
                </span>
                {currentTrack.bpm && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                    {currentTrack.bpm} BPM
                  </span>
                )}
                {currentTrack.releaseYear && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                    {currentTrack.releaseYear}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Track Details, Timeline, Controls & Memory Anchors */}
            <div className="md:col-span-7 space-y-6">
              {/* Title & Artist & Favorite */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <h2 className="text-2xl font-black text-white font-display tracking-tight truncate glow-purple">
                    {currentTrack.title}
                  </h2>
                  <p className="text-base font-medium text-slate-300 truncate">
                    {currentTrack.artist}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    Album: {currentTrack.album}
                  </p>
                </div>

                <button
                  onClick={() => toggleFavorite(currentTrack)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isFav
                      ? 'bg-pink-500/15 border-pink-500/40 text-pink-400 shadow-lg shadow-pink-900/30'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isFav ? 'Favorited' : 'Favorite this track'}
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Progress Slider & Time stamps */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="music-slider w-full"
                />
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls (Shuffle, Previous, Play/Pause, Next, Repeat) */}
              <div className="flex items-center justify-between pt-1">
                {/* Shuffle */}
                <button
                  onClick={toggleShuffle}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    shuffle ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Shuffle: ${shuffle ? 'On' : 'Off'}`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Skip Back 10s */}
                <button
                  onClick={() => skipSeconds(-10)}
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Rewind 10s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Previous */}
                <button
                  onClick={previousTrack}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
                  title="Previous track"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Big Center Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-4 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white shadow-xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={nextTrack}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
                  title="Next track"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Skip Ahead 10s */}
                <button
                  onClick={() => skipSeconds(10)}
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Forward 10s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Repeat Mode */}
                <button
                  onClick={toggleRepeat}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    repeatMode !== 'off' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Volume Slider Bar */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={toggleMute}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="music-slider flex-1"
                />
                <span className="text-[10px] font-mono text-slate-400 w-8">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Life Connections Engine: Mood Anchors, Journal Link & Memory Note */}
          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                  Life Connections & Emotional Anchors
                </h4>
              </div>

              <button
                onClick={() => setIsConnectJournalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Link to Journal Entry</span>
              </button>
            </div>

            {/* Mood Anchors Grid */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-400 font-medium">
                How does this song make you feel? Tag an emotional anchor:
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {(Object.keys(MUSIC_MOOD_CONFIG) as MusicMoodType[]).map((mood) => {
                  const cfg = MUSIC_MOOD_CONFIG[mood];
                  const isSelected = activeMood === mood;
                  return (
                    <button
                      key={mood}
                      onClick={() => handleMoodSelect(mood)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass} shadow-md`
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-base">{cfg.emoji}</span>
                      <span className="text-[10px] font-semibold mt-1 truncate">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Memory Note */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Personal Reflection & Memory Note</span>
                </label>
                {noteSavedFeedback && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" /> Saved to your memory library
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  placeholder="Record what was happening in your life when you discovered or replayed this song..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSavingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Journal Entry Modal */}
      {isConnectJournalOpen && (
        <ConnectJournalModal
          track={currentTrack}
          onClose={() => setIsConnectJournalOpen(false)}
        />
      )}
    </>
  );
};
