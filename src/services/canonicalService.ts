import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { GoalTrack, MemoryItem, AISuggestion } from '../types';

import {
  getGoalsForUser as getGoalsForUserFromService,
  createGoalTrack,
  updateGoalTrack,
  deleteGoalTrack,
} from '../features/goals/goalsService';

export const getGoalsForUser = getGoalsForUserFromService;

export async function createGoalForUser(uid: string, title: string, category: string = 'General'): Promise<GoalTrack> {
  return createGoalTrack(uid, {
    title,
    category,
    description: `Canonical goal for ${title}`,
  });
}

const BOOKS_CACHE_PREFIX = 'pgj_books_';
const MUSIC_CACHE_PREFIX = 'pgj_music_';

export interface BookItem {
  id: string;
  userId: string;
  title: string;
  author: string;
  status: 'reading' | 'completed' | 'want_to_read';
  rating?: number;
  review?: string;
  favoriteQuotes?: string[];
  keyLearnings?: string[];
}

export interface MusicItem {
  id: string;
  userId: string;
  title: string;
  artist: string;
  album?: string;
  moodAssociation?: string;
  memoryNote?: string;
}

const DEFAULT_BOOKS = (uid: string): BookItem[] => [
  {
    id: 'book-1',
    userId: uid,
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    status: 'reading',
    rating: 5,
    review: 'Essential reading for building reliable, scalable systems.',
    keyLearnings: ['Partitioning and replication trade-offs', 'Consensus protocols and fault tolerance'],
  },
  {
    id: 'book-2',
    userId: uid,
    title: 'Atomic Habits',
    author: 'James Clear',
    status: 'completed',
    rating: 5,
    review: 'Small habits compound into massive long-term results.',
    keyLearnings: ['1% daily improvement', 'System over goals mindset'],
  },
];

const DEFAULT_MUSIC = (uid: string): MusicItem[] => [
  {
    id: 'music-1',
    userId: uid,
    title: 'Weightless',
    artist: 'Marconi Union',
    album: 'Ambient 1',
    moodAssociation: 'Calm / Focus',
    memoryNote: 'Helps maintain deep focus during late-night study and coding sessions.',
  },
  {
    id: 'music-2',
    userId: uid,
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    moodAssociation: 'Nostalgic / Energetic',
    memoryNote: 'Associated with late afternoon reflections and goal planning.',
  },
];

export async function getBooksForUser(uid: string): Promise<BookItem[]> {
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'books');
    const snapshot = await getDocs(ref);
    if (!snapshot.empty) {
      const books = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: uid,
          title: data.title || '',
          author: Array.isArray(data.authors) ? data.authors.join(', ') : (data.author || 'Unknown Author'),
          status: data.readingStatus || data.status || 'want_to_read',
          rating: data.rating,
          review: data.review,
          favoriteQuotes: Array.isArray(data.highlights) ? data.highlights.map((h: any) => h.text) : (data.favoriteQuotes || []),
          keyLearnings: Array.isArray(data.highlights) && data.highlights.some((h: any) => h.aiLearningNote)
            ? data.highlights.filter((h: any) => h.aiLearningNote).map((h: any) => h.aiLearningNote.learningTakeaway)
            : (data.keyLearnings || [])
        } as BookItem;
      });
      localStorage.setItem(`${BOOKS_CACHE_PREFIX}${uid}`, JSON.stringify(books));
      return books;
    } else {
      localStorage.setItem(`${BOOKS_CACHE_PREFIX}${uid}`, JSON.stringify([]));
      return [];
    }
  } catch (err) {
    console.warn('[canonicalService] Firestore books fetch error:', err);
  }
  const cached = localStorage.getItem(`${BOOKS_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return [];
}

export async function getMusicForUser(uid: string): Promise<MusicItem[]> {
  if (!uid) return [];
  try {
    const ref = collection(db, 'users', uid, 'music');
    const snapshot = await getDocs(ref);
    if (!snapshot.empty) {
      const music = snapshot.docs.map((d) => ({ id: d.id, userId: uid, ...d.data() } as MusicItem));
      localStorage.setItem(`${MUSIC_CACHE_PREFIX}${uid}`, JSON.stringify(music));
      return music;
    }
  } catch (err) {
    console.warn('[canonicalService] Firestore music fetch error:', err);
  }
  const cached = localStorage.getItem(`${MUSIC_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  const defaults = DEFAULT_MUSIC(uid);
  localStorage.setItem(`${MUSIC_CACHE_PREFIX}${uid}`, JSON.stringify(defaults));
  return defaults;
}

export async function addMusicItem(uid: string, item: Omit<MusicItem, 'id' | 'userId'>): Promise<MusicItem> {
  const colRef = collection(db, 'users', uid, 'music');
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, userId: uid, ...item };
}

