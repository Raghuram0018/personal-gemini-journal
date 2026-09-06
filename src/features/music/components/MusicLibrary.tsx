import React, { useState, useEffect } from 'react';
import { MusicTrack, MUSIC_GENRES } from '../musicTypes';
import { getFeaturedMusic, searchMusic, getFavoritesForUser, toggleFavoriteForUser } from '../musicService';
import { useMusicPlayer } from '../MusicPlayerContext';
import { useAuth } from '../../../context/AuthContext';
import { Search, Play, Heart, Sparkles, Filter, Music, Disc, Loader2 } from 'lucide-react';

interface MusicLibraryProps {
  onConnectJournal?: (track: MusicTrack) => void;
}

export const MusicLibrary: React.FC<MusicLibraryProps> = ({ onConnectJournal }) => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  useEffect(() => {
    loadTracks();
  }, [selectedGenre]);

  useEffect(() => {
    if (uid) {
      getFavoritesForUser(uid).then((favs) => {
        setFavorites(favs.map((f) => f.trackId));
      });
    }
  }, [uid]);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const data = await getFeaturedMusic(selectedGenre);
      setTracks(data);
    } catch (err) {
      console.warn('Error loading featured music:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadTracks();
      return;
    }
    setLoading(true);
    try {
      const results = await searchMusic(searchQuery, selectedGenre);
      setTracks(results);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFav = async (track: MusicTrack) => {
    if (!uid) return;
    const isFav = await toggleFavoriteForUser(uid, track);
    if (isFav) {
      setFavorites((prev) => [...prev, track.id]);
    } else {
      setFavorites((prev) => prev.filter((id) => id !== track.id));
    }
  };

  const displayedTracks =
    activeTab === 'favorites'
      ? tracks.filter((t) => favorites.includes(t.id))
      : tracks;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search songs, artists, or emotional soundscapes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Tracks
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Favorites ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {MUSIC_GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              selectedGenre === genre
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-slate-900/50 border border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Track Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-xs">Loading soundscape catalog...</p>
        </div>
      ) : displayedTracks.length === 0 ? (
        <div className="py-24 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
          <Music className="w-10 h-10 mx-auto text-slate-600" />
          <h4 className="text-sm font-bold text-slate-300">No tracks found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'favorites'
              ? 'You have not favorited any songs yet. Click the heart icon on any track to save it to your personal collection.'
              : 'No tracks match your current search criteria. Try a different query or genre.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedTracks.map((track) => {
            const isFav = favorites.includes(track.id);
            const isCurrent = currentTrack?.id === track.id;

            return (
              <div
                key={track.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 group ${
                  isCurrent
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-xl shadow-purple-950/30'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-purple-500/30 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative group/img flex-shrink-0">
                    <img
                      src={track.albumImage}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow-md"
                    />
                    <button
                      onClick={() => playTrack(track, displayedTracks)}
                      className="absolute inset-0 bg-slate-950/60 rounded-xl opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-mono text-[10px]">
                        {track.genre}
                      </span>
                      <button
                        onClick={() => handleToggleFav(track)}
                        className={`text-slate-500 hover:text-pink-400 transition-colors cursor-pointer ${
                          isFav ? 'text-pink-500' : ''
                        }`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-pink-500' : ''}`} />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                    <p className="text-[11px] text-slate-500 truncate">{track.album}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <button
                    onClick={() => playTrack(track, displayedTracks)}
                    className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isCurrent && isPlaying ? 'Playing' : 'Play Track'}</span>
                  </button>

                  {onConnectJournal && (
                    <button
                      onClick={() => onConnectJournal(track)}
                      className="text-slate-400 hover:text-indigo-400 font-medium transition-colors cursor-pointer"
                    >
                      Anchor to Journal
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
