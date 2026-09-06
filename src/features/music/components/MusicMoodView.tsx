import React, { useState, useEffect } from 'react';
import { MusicMoodAssociation, MusicMoodType, MUSIC_MOOD_CONFIG } from '../musicTypes';
import { getMoodAssociationsForUser } from '../musicService';
import { useMusicPlayer } from '../MusicPlayerContext';
import { useAuth } from '../../../context/AuthContext';
import { CURATED_MUSIC_CATALOG } from '../curatedTracks';
import { Smile, Play, Music, Sparkles } from 'lucide-react';

export const MusicMoodView: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { playTrack } = useMusicPlayer();

  const [selectedMood, setSelectedMood] = useState<MusicMoodType>('Calm');
  const [associations, setAssociations] = useState<MusicMoodAssociation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getMoodAssociationsForUser(uid)
      .then(setAssociations)
      .catch((err) => console.warn('Error fetching mood associations:', err))
      .finally(() => setLoading(false));
  }, [uid]);

  const moodsList = Object.keys(MUSIC_MOOD_CONFIG) as MusicMoodType[];

  // Filter associated tracks
  const currentMoodAssocs = associations.filter((a) => a.mood === selectedMood);

  // Match with catalog tracks or fallback
  const matchingTracks = currentMoodAssocs.map((assoc) => {
    const catalogMatch = CURATED_MUSIC_CATALOG.find((t) => t.id === assoc.trackId);
    return {
      assoc,
      track:
        catalogMatch || {
          id: assoc.trackId,
          title: assoc.trackTitle,
          artist: assoc.artist,
          album: 'Personal Collection',
          albumImage:
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
          duration: 180,
          genre: 'Soundtrack',
          audioUrl: CURATED_MUSIC_CATALOG[0].audioUrl,
          provider: 'cc-archive' as const,
        },
    };
  });

  const moodCfg = MUSIC_MOOD_CONFIG[selectedMood];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Mood Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {moodsList.map((mood) => {
          const cfg = MUSIC_MOOD_CONFIG[mood];
          const isSelected = selectedMood === mood;
          const count = associations.filter((a) => a.mood === mood).length;
          return (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                isSelected
                  ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass} shadow-lg shadow-purple-950/40 scale-102`
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <span className="text-xl">{cfg.emoji}</span>
              <span className="text-xs font-bold">{cfg.label}</span>
              <span className="text-[10px] font-mono opacity-70">
                {count} {count === 1 ? 'song' : 'songs'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Mood Showcase Banner */}
      <div className={`p-6 rounded-3xl border ${moodCfg.borderClass} ${moodCfg.bgClass} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{moodCfg.emoji}</span>
          <div>
            <h3 className={`text-xl font-bold font-display ${moodCfg.textClass}`}>
              {moodCfg.label} Soundtracks
            </h3>
            <p className="text-xs text-slate-300">
              Music you emotionally linked with your {moodCfg.label.toLowerCase()} state of mind.
            </p>
          </div>
        </div>

        {matchingTracks.length > 0 && (
          <button
            onClick={() => playTrack(matchingTracks[0].track, matchingTracks.map((m) => m.track))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play All {moodCfg.label}</span>
          </button>
        )}
      </div>

      {/* Track List for Selected Mood */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading mood anchors...</div>
      ) : matchingTracks.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900/30 rounded-3xl border border-slate-800/60 p-8">
          <Smile className="w-8 h-8 mx-auto opacity-30 text-purple-400" />
          <h4 className="text-sm font-bold text-slate-300">No {moodCfg.label} Songs Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            While listening to any track in your library, open the Now Playing card and tag it with{' '}
            <strong className="text-slate-300">{moodCfg.emoji} {moodCfg.label}</strong> to organize your emotional soundscape.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matchingTracks.map(({ assoc, track }) => (
            <div
              key={assoc.id}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={track.albumImage}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{track.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                  <span className="text-[10px] text-purple-400/80 font-mono">{track.genre}</span>
                </div>
              </div>

              <button
                onClick={() => playTrack(track, matchingTracks.map((m) => m.track))}
                className="p-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all cursor-pointer"
                title="Play track"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
