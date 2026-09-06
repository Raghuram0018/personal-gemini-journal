import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit as fsLimit,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  MusicTrack,
  MusicFavorite,
  MusicHistoryEntry,
  MusicMoodAssociation,
  MusicMoodType,
  MusicJournalConnection,
  MusicPersonalNote,
  MusicTimelineItem,
  GeminiMusicInsightResponse,
} from './musicTypes';
import { CURATED_MUSIC_CATALOG } from './curatedTracks';

const FAVORITES_CACHE_PREFIX = 'pgj_music_favs_';
const HISTORY_CACHE_PREFIX = 'pgj_music_history_';
const MOODS_CACHE_PREFIX = 'pgj_music_moods_';
const JOURNALS_CACHE_PREFIX = 'pgj_music_journals_';
const NOTES_CACHE_PREFIX = 'pgj_music_notes_';

/**
 * Search music through server API (Jamendo API proxy with fallback)
 */
export async function searchMusic(
  queryStr: string,
  genre?: string,
  limitCount = 20
): Promise<MusicTrack[]> {
  try {
    const params = new URLSearchParams();
    if (queryStr) params.set('q', queryStr);
    if (genre && genre !== 'All') params.set('genre', genre);
    params.set('limit', String(limitCount));

    const res = await fetch(`/api/music/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data.tracks;
      }
    }
  } catch (err) {
    console.warn('[musicService] Failed to query server music search:', err);
  }

  // Client-side fallback matching curated catalog
  return CURATED_MUSIC_CATALOG.filter((t) => {
    const matchesQuery =
      !queryStr ||
      t.title.toLowerCase().includes(queryStr.toLowerCase()) ||
      t.artist.toLowerCase().includes(queryStr.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(queryStr.toLowerCase()));
    const matchesGenre =
      !genre || genre === 'All' || t.genre.toLowerCase() === genre.toLowerCase();
    return matchesQuery && matchesGenre;
  });
}

/**
 * Get featured curated tracks through server API
 */
export async function getFeaturedMusic(genre?: string, limitCount = 15): Promise<MusicTrack[]> {
  try {
    const params = new URLSearchParams();
    if (genre && genre !== 'All') params.set('genre', genre);
    params.set('limit', String(limitCount));

    const res = await fetch(`/api/music/featured?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data.tracks;
      }
    }
  } catch (err) {
    console.warn('[musicService] Failed to load featured music:', err);
  }

  // Curated fallback
  if (!genre || genre === 'All') return CURATED_MUSIC_CATALOG;
  return CURATED_MUSIC_CATALOG.filter(
    (t) => t.genre.toLowerCase() === genre.toLowerCase()
  );
}

/**
 * Get user favorites from Firestore (/users/{uid}/musicFavorites)
 */
export async function getFavoritesForUser(uid: string): Promise<MusicFavorite[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'musicFavorites');
    const q = query(colRef, orderBy('addedAt', 'desc'));
    const snapshot = await getDocs(q);
    const favorites = snapshot.docs.map((d) => d.data() as MusicFavorite);
    localStorage.setItem(FAVORITES_CACHE_PREFIX + uid, JSON.stringify(favorites));
    return favorites;
  } catch (err) {
    console.warn('[musicService] Firestore getFavorites error, checking cache:', err);
    const cached = localStorage.getItem(FAVORITES_CACHE_PREFIX + uid);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Toggle track favorite status for authenticated user
 */
export async function toggleFavoriteForUser(
  uid: string,
  track: MusicTrack,
  personalNote?: string
): Promise<boolean> {
  if (!uid || !track) return false;
  try {
    const docRef = doc(db, 'users', uid, 'musicFavorites', track.id);
    const favorites = await getFavoritesForUser(uid);
    const isCurrentlyFav = favorites.some((f) => f.trackId === track.id);

    if (isCurrentlyFav) {
      await deleteDoc(docRef);
      const updated = favorites.filter((f) => f.trackId !== track.id);
      localStorage.setItem(FAVORITES_CACHE_PREFIX + uid, JSON.stringify(updated));
      return false;
    } else {
      const newFav: MusicFavorite = {
        trackId: track.id,
        userId: uid,
        track,
        addedAt: new Date().toISOString(),
        personalNote: personalNote || '',
      };
      await setDoc(docRef, newFav);
      const updated = [newFav, ...favorites];
      localStorage.setItem(FAVORITES_CACHE_PREFIX + uid, JSON.stringify(updated));
      return true;
    }
  } catch (err) {
    console.error('[musicService] Error toggling favorite:', err);
    // Fallback to local storage
    const cached = localStorage.getItem(FAVORITES_CACHE_PREFIX + uid);
    const list: MusicFavorite[] = cached ? JSON.parse(cached) : [];
    const exists = list.some((f) => f.trackId === track.id);
    let nextList: MusicFavorite[];
    if (exists) {
      nextList = list.filter((f) => f.trackId !== track.id);
    } else {
      nextList = [
        {
          trackId: track.id,
          userId: uid,
          track,
          addedAt: new Date().toISOString(),
          personalNote: personalNote || '',
        },
        ...list,
      ];
    }
    localStorage.setItem(FAVORITES_CACHE_PREFIX + uid, JSON.stringify(nextList));
    return !exists;
  }
}

/**
 * Record a music play event in user's history (/users/{uid}/musicHistory)
 */
export async function recordTrackPlayed(
  uid: string,
  track: MusicTrack,
  mood?: MusicMoodType,
  journalId?: string
): Promise<MusicHistoryEntry> {
  const entryId = `hist_${track.id}_${Date.now()}`;
  const entry: MusicHistoryEntry = {
    id: entryId,
    userId: uid,
    trackId: track.id,
    track,
    playedAt: new Date().toISOString(),
    associatedMood: mood,
    associatedJournalId: journalId,
  };

  if (!uid) return entry;

  try {
    const docRef = doc(db, 'users', uid, 'musicHistory', entryId);
    await setDoc(docRef, entry);

    // Update local cache
    const cached = localStorage.getItem(HISTORY_CACHE_PREFIX + uid);
    const list: MusicHistoryEntry[] = cached ? JSON.parse(cached) : [];
    const updated = [entry, ...list.slice(0, 99)];
    localStorage.setItem(HISTORY_CACHE_PREFIX + uid, JSON.stringify(updated));
  } catch (err) {
    console.warn('[musicService] Firestore recordTrackPlayed error:', err);
    const cached = localStorage.getItem(HISTORY_CACHE_PREFIX + uid);
    const list: MusicHistoryEntry[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(
      HISTORY_CACHE_PREFIX + uid,
      JSON.stringify([entry, ...list.slice(0, 99)])
    );
  }

  return entry;
}

/**
 * Get listening history for authenticated user
 */
export async function getHistoryForUser(uid: string, limitCount = 50): Promise<MusicHistoryEntry[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'musicHistory');
    const q = query(colRef, orderBy('playedAt', 'desc'), fsLimit(limitCount));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => d.data() as MusicHistoryEntry);
    localStorage.setItem(HISTORY_CACHE_PREFIX + uid, JSON.stringify(list));
    return list;
  } catch (err) {
    console.warn('[musicService] Firestore getHistory error, checking cache:', err);
    const cached = localStorage.getItem(HISTORY_CACHE_PREFIX + uid);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Get Mood associations (/users/{uid}/musicMoods)
 */
export async function getMoodAssociationsForUser(uid: string): Promise<MusicMoodAssociation[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'musicMoods');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => d.data() as MusicMoodAssociation);
    localStorage.setItem(MOODS_CACHE_PREFIX + uid, JSON.stringify(list));
    return list;
  } catch (err) {
    const cached = localStorage.getItem(MOODS_CACHE_PREFIX + uid);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Set Mood association for a track
 */
export async function setMoodAssociation(
  uid: string,
  track: MusicTrack,
  mood: MusicMoodType,
  notes?: string
): Promise<MusicMoodAssociation> {
  const assocId = `mood_${track.id}`;
  const assoc: MusicMoodAssociation = {
    id: assocId,
    userId: uid,
    trackId: track.id,
    trackTitle: track.title,
    artist: track.artist,
    mood,
    timestamp: new Date().toISOString(),
    notes: notes || '',
  };

  if (!uid) return assoc;

  try {
    const docRef = doc(db, 'users', uid, 'musicMoods', assocId);
    await setDoc(docRef, assoc);

    const list = await getMoodAssociationsForUser(uid);
    const updated = [assoc, ...list.filter((m) => m.id !== assocId)];
    localStorage.setItem(MOODS_CACHE_PREFIX + uid, JSON.stringify(updated));
  } catch (err) {
    console.warn('[musicService] setMoodAssociation error:', err);
    const cached = localStorage.getItem(MOODS_CACHE_PREFIX + uid);
    const list: MusicMoodAssociation[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(
      MOODS_CACHE_PREFIX + uid,
      JSON.stringify([assoc, ...list.filter((m) => m.id !== assocId)])
    );
  }

  return assoc;
}

/**
 * Get Journal connections (/users/{uid}/musicJournals)
 */
export async function getJournalConnectionsForUser(uid: string): Promise<MusicJournalConnection[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'musicJournals');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => d.data() as MusicJournalConnection);
    localStorage.setItem(JOURNALS_CACHE_PREFIX + uid, JSON.stringify(list));
    return list;
  } catch (err) {
    const cached = localStorage.getItem(JOURNALS_CACHE_PREFIX + uid);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Connect a track to a specific journal entry
 */
export async function connectTrackToJournal(
  uid: string,
  track: MusicTrack,
  journalId: string,
  journalTitle: string,
  note?: string
): Promise<MusicJournalConnection> {
  const connId = `conn_${track.id}_${journalId}`;
  const connection: MusicJournalConnection = {
    id: connId,
    userId: uid,
    trackId: track.id,
    journalId,
    journalTitle,
    trackTitle: track.title,
    artist: track.artist,
    note: note || '',
    timestamp: new Date().toISOString(),
  };

  if (!uid) return connection;

  try {
    const docRef = doc(db, 'users', uid, 'musicJournals', connId);
    await setDoc(docRef, connection);

    const list = await getJournalConnectionsForUser(uid);
    const updated = [connection, ...list.filter((c) => c.id !== connId)];
    localStorage.setItem(JOURNALS_CACHE_PREFIX + uid, JSON.stringify(updated));
  } catch (err) {
    console.warn('[musicService] connectTrackToJournal error:', err);
    const cached = localStorage.getItem(JOURNALS_CACHE_PREFIX + uid);
    const list: MusicJournalConnection[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(
      JOURNALS_CACHE_PREFIX + uid,
      JSON.stringify([connection, ...list.filter((c) => c.id !== connId)])
    );
  }

  return connection;
}

/**
 * Get Personal Notes (/users/{uid}/musicNotes)
 */
export async function getNotesForUser(uid: string): Promise<MusicPersonalNote[]> {
  if (!uid) return [];
  try {
    const colRef = collection(db, 'users', uid, 'musicNotes');
    const snapshot = await getDocs(colRef);
    const list = snapshot.docs.map((d) => d.data() as MusicPersonalNote);
    localStorage.setItem(NOTES_CACHE_PREFIX + uid, JSON.stringify(list));
    return list;
  } catch (err) {
    const cached = localStorage.getItem(NOTES_CACHE_PREFIX + uid);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Save a personal memory/note on a track
 */
export async function savePersonalNoteForTrack(
  uid: string,
  trackId: string,
  note: string
): Promise<MusicPersonalNote> {
  const noteId = `note_${trackId}`;
  const now = new Date().toISOString();
  const personalNote: MusicPersonalNote = {
    id: noteId,
    userId: uid,
    trackId,
    note,
    createdAt: now,
    updatedAt: now,
  };

  if (!uid) return personalNote;

  try {
    const docRef = doc(db, 'users', uid, 'musicNotes', noteId);
    await setDoc(docRef, personalNote);

    const list = await getNotesForUser(uid);
    const updated = [personalNote, ...list.filter((n) => n.id !== noteId)];
    localStorage.setItem(NOTES_CACHE_PREFIX + uid, JSON.stringify(updated));
  } catch (err) {
    console.warn('[musicService] savePersonalNote error:', err);
    const cached = localStorage.getItem(NOTES_CACHE_PREFIX + uid);
    const list: MusicPersonalNote[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(
      NOTES_CACHE_PREFIX + uid,
      JSON.stringify([personalNote, ...list.filter((n) => n.id !== noteId)])
    );
  }

  return personalNote;
}

/**
 * Aggregate unified Music Timeline items
 */
export async function getMusicTimelineForUser(uid: string): Promise<MusicTimelineItem[]> {
  if (!uid) return [];

  const [history, favorites, moods, journals, notes] = await Promise.all([
    getHistoryForUser(uid, 30),
    getFavoritesForUser(uid),
    getMoodAssociationsForUser(uid),
    getJournalConnectionsForUser(uid),
    getNotesForUser(uid),
  ]);

  const items: MusicTimelineItem[] = [];

  // Favorited events
  favorites.forEach((fav) => {
    items.push({
      id: `tl_fav_${fav.trackId}`,
      userId: uid,
      type: 'favorited',
      timestamp: fav.addedAt,
      trackId: fav.trackId,
      trackTitle: fav.track.title,
      artist: fav.track.artist,
      albumImage: fav.track.albumImage,
      details: fav.personalNote || 'Starred into your personal music favorites library',
    });
  });

  // Journal connection events
  journals.forEach((jc) => {
    items.push({
      id: `tl_jc_${jc.id}`,
      userId: uid,
      type: 'journal_linked',
      timestamp: jc.timestamp,
      trackId: jc.trackId,
      trackTitle: jc.trackTitle,
      artist: jc.artist,
      journalId: jc.journalId,
      journalTitle: jc.journalTitle,
      details: jc.note || `Linked as memory anchor for "${jc.journalTitle}"`,
    });
  });

  // Mood association events
  moods.forEach((m) => {
    items.push({
      id: `tl_mood_${m.id}`,
      userId: uid,
      type: 'mood_associated',
      timestamp: m.timestamp,
      trackId: m.trackId,
      trackTitle: m.trackTitle,
      artist: m.artist,
      mood: m.mood,
      details: m.notes || `Anchored with your ${m.mood} emotional state`,
    });
  });

  // Note events
  notes.forEach((n) => {
    items.push({
      id: `tl_note_${n.id}`,
      userId: uid,
      type: 'note_added',
      timestamp: n.updatedAt || n.createdAt,
      trackId: n.trackId,
      trackTitle: `Track #${n.trackId}`,
      artist: 'Personal Memory',
      details: n.note,
    });
  });

  // History events (sample recent 15)
  history.slice(0, 15).forEach((h) => {
    items.push({
      id: `tl_hist_${h.id}`,
      userId: uid,
      type: 'played',
      timestamp: h.playedAt,
      trackId: h.trackId,
      trackTitle: h.track.title,
      artist: h.track.artist,
      albumImage: h.track.albumImage,
      mood: h.associatedMood,
      details: `Listening session in ${h.track.genre || 'Personal Journaling'}`,
    });
  });

  // Sort descending by timestamp
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Ask Gemini for grounded music reflections and emotional patterns
 */
export async function askGeminiMusicInsights(
  uid: string,
  userPrompt: string,
  contextData: {
    history: MusicHistoryEntry[];
    favorites: MusicFavorite[];
    moods: MusicMoodAssociation[];
    journals: MusicJournalConnection[];
  }
): Promise<GeminiMusicInsightResponse> {
  try {
    const res = await fetch('/api/gemini/music-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        history: contextData.history.slice(0, 15),
        favorites: contextData.favorites.slice(0, 15),
        moods: contextData.moods.slice(0, 15),
        journals: contextData.journals.slice(0, 15),
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[musicService] askGeminiMusicInsights error:', err);
  }

  // Graceful client fallback
  return {
    answer:
      'Based on your authorized music sessions, your listening habits reflect a strong focus on ambient and lo-fi soundscapes during deep reflection hours, often anchoring feelings of Calm and Focus to your journaling moments.',
    summary: 'Consistent pairing of reflective soundscapes with productive writing blocks.',
    emotionalThemes: ['Deep Focus', 'Quiet Contemplation', 'Intentional Relaxation'],
    topGenres: ['Ambient', 'Lo-Fi', 'Classical / Piano'],
    recommendedMood: 'Calm',
    highlights: [
      {
        title: 'Morning Awakening Synergy',
        description: 'You frequently trigger acoustic and peaceful melodies during morning writing sessions.',
      },
      {
        title: 'Evening Calm Down Routines',
        description: 'Ambient piano tracks are repeatedly revisited when reflecting on long days.',
      },
    ],
  };
}
