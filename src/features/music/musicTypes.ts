/**
 * Personal Gemini Journal - Music Types & Interfaces
 * Normalized data model for music tracks, user library, history, mood anchors, and journal links.
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumImage: string;
  duration: number; // in seconds
  genre: string;
  audioUrl: string;
  previewUrl?: string;
  provider: 'jamendo' | 'cc-archive' | 'local';
  providerUrl?: string;
  license?: string;
  tags?: string[];
  bpm?: number;
  releaseYear?: number;
}

export interface MusicFavorite {
  trackId: string;
  userId: string;
  track: MusicTrack;
  addedAt: string; // ISO date
  personalNote?: string;
}

export interface MusicHistoryEntry {
  id: string;
  userId: string;
  trackId: string;
  track: MusicTrack;
  playedAt: string; // ISO date
  durationListenedSeconds?: number;
  associatedMood?: MusicMoodType;
  associatedJournalId?: string;
}

export type MusicMoodType =
  | 'Happy'
  | 'Calm'
  | 'Sad'
  | 'Motivated'
  | 'Nostalgic'
  | 'Energetic'
  | 'Peaceful'
  | 'Focused';

export const MUSIC_MOOD_CONFIG: Record<
  MusicMoodType,
  { label: string; emoji: string; color: string; bgClass: string; textClass: string; borderClass: string }
> = {
  Happy: { label: 'Happy', emoji: '☀️', color: '#fbbf24', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  Calm: { label: 'Calm', emoji: '🌊', color: '#38bdf8', bgClass: 'bg-sky-500/10', textClass: 'text-sky-400', borderClass: 'border-sky-500/30' },
  Sad: { label: 'Sad', emoji: '🌧️', color: '#818cf8', bgClass: 'bg-indigo-500/10', textClass: 'text-indigo-400', borderClass: 'border-indigo-500/30' },
  Motivated: { label: 'Motivated', emoji: '🔥', color: '#f97316', bgClass: 'bg-orange-500/10', textClass: 'text-orange-400', borderClass: 'border-orange-500/30' },
  Nostalgic: { label: 'Nostalgic', emoji: '📻', color: '#c084fc', bgClass: 'bg-purple-500/10', textClass: 'text-purple-400', borderClass: 'border-purple-500/30' },
  Energetic: { label: 'Energetic', emoji: '⚡', color: '#ec4899', bgClass: 'bg-pink-500/10', textClass: 'text-pink-400', borderClass: 'border-pink-500/30' },
  Peaceful: { label: 'Peaceful', emoji: '🍃', color: '#34d399', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  Focused: { label: 'Focused', emoji: '🎯', color: '#6366f1', bgClass: 'bg-indigo-500/10', textClass: 'text-indigo-400', borderClass: 'border-indigo-500/30' },
};

export interface MusicMoodAssociation {
  id: string;
  userId: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  mood: MusicMoodType;
  timestamp: string;
  notes?: string;
}

export interface MusicJournalConnection {
  id: string;
  userId: string;
  trackId: string;
  journalId: string;
  journalTitle: string;
  trackTitle: string;
  artist: string;
  note?: string;
  timestamp: string;
}

export interface MusicPersonalNote {
  id: string;
  userId: string;
  trackId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type MusicTimelineEventType =
  | 'played'
  | 'favorited'
  | 'journal_linked'
  | 'mood_associated'
  | 'note_added';

export interface MusicTimelineItem {
  id: string;
  userId: string;
  type: MusicTimelineEventType;
  timestamp: string;
  trackId: string;
  trackTitle: string;
  artist: string;
  albumImage?: string;
  details?: string;
  mood?: MusicMoodType;
  journalId?: string;
  journalTitle?: string;
}

export interface GeminiMusicInsightResponse {
  answer: string;
  summary: string;
  emotionalThemes: string[];
  topGenres: string[];
  recommendedMood?: MusicMoodType;
  highlights: {
    title: string;
    description: string;
  }[];
}

export const MUSIC_GENRES = [
  'All',
  'Ambient',
  'Classical',
  'Acoustic',
  'Cinematic',
  'Electronic',
  'Lo-Fi',
  'Pop',
  'Rock',
  'Soundtrack',
] as const;

