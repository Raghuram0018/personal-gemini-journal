import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { MusicTrack, MusicFavorite, MusicMoodType } from './musicTypes';
import {
  getFavoritesForUser,
  toggleFavoriteForUser,
  recordTrackPlayed,
} from './musicService';
import { CURATED_MUSIC_CATALOG } from './curatedTracks';
import { useAuth } from '../../context/AuthContext';

export interface MusicPlayerContextType {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number; // 0 to 100
  volume: number;
  isMuted: boolean;
  queue: MusicTrack[];
  currentIndex: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffle: boolean;
  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  favorites: string[]; // list of favorited track IDs
  playTrack: (track: MusicTrack, newQueue?: MusicTrack[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  togglePlayPause: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: MusicTrack) => void;
  playNextInQueue: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
  toggleQueue: () => void;
  toggleFavorite: (track: MusicTrack, note?: string) => Promise<boolean>;
  isFavorited: (trackId: string) => boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

const VOLUME_STORAGE_KEY = 'pgj_player_volume';
const REPEAT_STORAGE_KEY = 'pgj_player_repeat';
const SHUFFLE_STORAGE_KEY = 'pgj_player_shuffle';

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  // Audio DOM element (single singleton)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Playback state
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<MusicTrack[]>(() => CURATED_MUSIC_CATALOG.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>(() => {
    const saved = localStorage.getItem(REPEAT_STORAGE_KEY);
    return (saved as any) || 'all';
  });
  const [shuffle, setShuffle] = useState<boolean>(() => {
    return localStorage.getItem(SHUFFLE_STORAGE_KEY) === 'true';
  });

  // UI state
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  // Favorites cache
  const [favorites, setFavorites] = useState<string[]>([]);

  // Track last logged track ID to avoid duplicate history logs
  const lastLoggedHistoryRef = useRef<{ id: string; time: number } | null>(null);

  // Initialize audio singleton
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      // Auto advance
      nextTrackRef.current();
    };

    const handleError = (e: any) => {
      console.warn('[MusicPlayer] Audio playback error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, []);

  // Fetch favorites on user change
  useEffect(() => {
    if (uid) {
      getFavoritesForUser(uid)
        .then((favs) => setFavorites(favs.map((f) => f.trackId)))
        .catch((err) => console.warn('[MusicPlayer] fav error:', err));
    } else {
      setFavorites([]);
    }
  }, [uid]);

  // Next Track logic
  const handleNextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    let nextIdx = currentIndex + 1;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    setCurrentIndex(nextIdx);
    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      playTrackDirect(nextTrack);
    }
  }, [queue, currentIndex, repeatMode, shuffle]);

  // Maintain reference to nextTrack for audio.ended handler
  const nextTrackRef = useRef(handleNextTrack);
  useEffect(() => {
    nextTrackRef.current = handleNextTrack;
  }, [handleNextTrack]);

  // Previous Track logic
  const handlePreviousTrack = useCallback(() => {
    if (queue.length === 0) return;

    // If current song is > 3 seconds in, restart the track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }

    setCurrentIndex(prevIdx);
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      playTrackDirect(prevTrack);
    }
  }, [queue, currentIndex]);

  // Direct play implementation
  const playTrackDirect = useCallback(
    (track: MusicTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      setCurrentTrack(track);
      audio.src = track.audioUrl || track.previewUrl || '';
      audio.currentTime = 0;
      setCurrentTime(0);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);

            // Record in history if user authenticated and not logged recently
            if (uid) {
              const now = Date.now();
              const last = lastLoggedHistoryRef.current;
              if (!last || last.id !== track.id || now - last.time > 10000) {
                lastLoggedHistoryRef.current = { id: track.id, time: now };
                recordTrackPlayed(uid, track);
              }
            }
          })
          .catch((err) => {
            console.warn('[MusicPlayer] Autoplay prevented or stream error:', err);
            setIsPlaying(false);
          });
      }
    },
    [uid]
  );

  // User triggers play track
  const playTrack = useCallback(
    (track: MusicTrack, newQueue?: MusicTrack[]) => {
      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((t) => t.id === track.id);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        // If track is not in current queue, add it
        const existsIndex = queue.findIndex((t) => t.id === track.id);
        if (existsIndex >= 0) {
          setCurrentIndex(existsIndex);
        } else {
          setQueue((prev) => [track, ...prev]);
          setCurrentIndex(0);
        }
      }

      playTrackDirect(track);
    },
    [queue, playTrackDirect]
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      if (!currentTrack && queue.length > 0) {
        playTrack(queue[0]);
      } else {
        audioRef.current.play().catch((err) => console.warn('[MusicPlayer] Resume error:', err));
        setIsPlaying(true);
      }
    }
  }, [currentTrack, queue, playTrack]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current && !isNaN(seconds)) {
      audioRef.current.currentTime = Math.max(0, Math.min(seconds, audioRef.current.duration || seconds));
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const addToQueue = useCallback((track: MusicTrack) => {
    setQueue((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  const playNextInQueue = useCallback(
    (track: MusicTrack) => {
      setQueue((prev) => {
        const without = prev.filter((t) => t.id !== track.id);
        const insertionIndex = currentIndex + 1;
        return [
          ...without.slice(0, insertionIndex),
          track,
          ...without.slice(insertionIndex),
        ];
      });
    },
    [currentIndex]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((_, i) => i !== index);
        if (index === currentIndex && index >= next.length) {
          setCurrentIndex(Math.max(0, next.length - 1));
        }
        return next;
      });
    },
    [currentIndex]
  );

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([currentTrack]);
      setCurrentIndex(0);
    } else {
      setQueue([]);
      setCurrentIndex(0);
    }
  }, [currentTrack]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.8;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      localStorage.setItem(REPEAT_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => {
      const next = !prev;
      localStorage.setItem(SHUFFLE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const openNowPlaying = useCallback(() => setIsNowPlayingOpen(true), []);
  const closeNowPlaying = useCallback(() => setIsNowPlayingOpen(false), []);
  const toggleQueueDrawer = useCallback(() => setIsQueueOpen((prev) => !prev), []);

  const toggleFavorite = useCallback(
    async (track: MusicTrack, note?: string) => {
      if (!uid) return false;
      const isNowFav = await toggleFavoriteForUser(uid, track, note);
      setFavorites((prev) =>
        isNowFav ? [...prev, track.id] : prev.filter((id) => id !== track.id)
      );
      return isNowFav;
    },
    [uid]
  );

  const isFavorited = useCallback(
    (trackId: string) => favorites.includes(trackId),
    [favorites]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        progress,
        volume,
        isMuted,
        queue,
        currentIndex,
        repeatMode,
        shuffle,
        isNowPlayingOpen,
        isQueueOpen,
        favorites,
        playTrack,
        pause,
        resume,
        stop,
        togglePlayPause,
        seek,
        nextTrack: handleNextTrack,
        previousTrack: handlePreviousTrack,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        clearQueue,
        setVolume,
        toggleMute,
        toggleRepeat,
        toggleShuffle,
        openNowPlaying,
        closeNowPlaying,
        toggleQueue: toggleQueueDrawer,
        toggleFavorite,
        isFavorited,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = (): MusicPlayerContextType => {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return ctx;
};
