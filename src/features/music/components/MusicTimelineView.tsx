import React, { useState, useEffect } from 'react';
import { MusicTimelineItem } from '../musicTypes';
import { getMusicTimelineForUser } from '../musicService';
import { useMusicPlayer } from '../MusicPlayerContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Clock,
  Heart,
  Link,
  Smile,
  Play,
  FileText,
  Calendar,
  Sparkles,
  Music,
} from 'lucide-react';
import { MUSIC_MOOD_CONFIG } from '../musicTypes';

export const MusicTimelineView: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const { playTrack, queue } = useMusicPlayer();

  const [items, setItems] = useState<MusicTimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    getMusicTimelineForUser(uid)
      .then(setItems)
      .catch((err) => console.warn('Error loading music timeline:', err))
      .finally(() => setLoading(false));
  }, [uid]);

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getEventBadge = (type: MusicTimelineItem['type'], item: MusicTimelineItem) => {
    switch (type) {
      case 'favorited':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-bold">
            <Heart className="w-3 h-3 fill-current" /> Favorited
          </span>
        );
      case 'journal_linked':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
            <Link className="w-3 h-3" /> Journal Anchor
          </span>
        );
      case 'mood_associated':
        const moodCfg = item.mood ? MUSIC_MOOD_CONFIG[item.mood] : null;
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
            <Smile className="w-3 h-3" /> {moodCfg ? `${moodCfg.emoji} ${moodCfg.label}` : 'Mood'}
          </span>
        );
      case 'note_added':
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
            <FileText className="w-3 h-3" /> Personal Reflection
          </span>
        );
      case 'played':
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
            <Clock className="w-3 h-3" /> Played
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Assembling your chronological musical journey...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-3">
        <Clock className="w-10 h-10 mx-auto opacity-30 text-purple-400" />
        <h4 className="text-sm font-bold text-slate-300">Your Musical Timeline is Just Beginning</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Every time you listen to a track, star a favorite, or anchor music to your journal entries,
          it will appear chronologically here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white font-display">Music Memory Timeline</h3>
          <p className="text-xs text-slate-400">
            A chronological tapestry of the songs that sound-tracked your life
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono">
          {items.length} moments recorded
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-slate-800 before:to-transparent">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {/* Dot on the timeline spine */}
            <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-slate-900 border-2 border-purple-500 group-hover:scale-125 transition-transform flex items-center justify-center shadow-md shadow-purple-950">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-800/40 transition-all space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getEventBadge(item.type, item)}
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatDate(item.timestamp)}
                  </span>
                </div>

                {item.journalTitle && (
                  <span className="text-[11px] text-indigo-300 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3" /> Anchored to: {item.journalTitle}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3 min-w-0">
                  {item.albumImage ? (
                    <img
                      src={item.albumImage}
                      alt={item.trackTitle}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                      <Music className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.trackTitle}</p>
                    <p className="text-xs text-slate-400 truncate">{item.artist}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300/80 max-w-sm text-right italic truncate">
                  "{item.details}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
