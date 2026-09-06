import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MemoryItem, JournalEntry, WeeklyMemory } from '../../types';

const MEMORIES_CACHE_PREFIX = 'pgj_memories_';
const WEEKLY_MEMORIES_CACHE_PREFIX = 'pgj_weekly_memories_';

// Initial sample memories if user creates their first memories or wants sample data
export const SAMPLE_INITIAL_MEMORIES = (uid: string): MemoryItem[] => [
  {
    id: 'mem-day-1',
    userId: uid,
    title: 'Sunrise Espresso & Habit Deep Work',
    summary: 'Kickstarted the week with early morning espresso, reading Atomic Habits on 1% continuous improvement, and deep AI architecture flow with Debussy\'s Clair de Lune.',
    category: 'Learning',
    date: '2026-08-28',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    sourceJournalIds: ['journal-day-1'],
    sourceGoalIds: ['goal-1'],
    sourceBookIds: ['book-atomic-habits'],
    sourceMusicIds: ['music-clair-de-lune'],
    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
    mood: 'Focused',
    emotionalTag: 'Energized',
    topics: ['Atomic Habits', 'Claude Debussy', 'Deep Work', 'AI Engineering'],
    tags: ['MorningRoutine', 'AtomicHabits', 'Focus'],
    people: [],
    places: ['Home Studio'],
    aiGenerated: false,
    confirmedByUser: true,
    isFeatured: true,
  },
  {
    id: 'mem-day-2',
    userId: uid,
    title: 'Cloud Run Isolation & Token Breakthrough',
    summary: 'Solved token authorization boundary in our Cloud Run backend and verified multi-tenant Firestore security isolation. Fueled by M83\'s Midnight City.',
    category: 'Achievements',
    date: '2026-08-29',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    sourceJournalIds: ['journal-day-2'],
    sourceGoalIds: ['goal-1'],
    sourceBookIds: ['book-ddia'],
    sourceMusicIds: ['music-midnight-city'],
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    mood: 'Triumphant',
    emotionalTag: 'Accomplished',
    topics: ['Cloud Run', 'Martin Kleppmann', 'Distributed Systems', 'M83'],
    tags: ['CloudRun', 'Security', 'Architecture'],
    people: ['Dev Team'],
    places: ['Cloud Lab'],
    aiGenerated: true,
    confirmedByUser: true,
    isFeatured: true,
  },
  {
    id: 'mem-day-3',
    userId: uid,
    title: '5K Sunset Trail Run & Mindfulness Reset',
    summary: 'Cleared cognitive fatigue with a 5.2km sunset trail jog along the waterfront, followed by peaceful ambient stretching to Marconi Union\'s Weightless.',
    category: 'Emotional Moments',
    date: '2026-08-30',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    sourceJournalIds: ['journal-day-3'],
    sourceMusicIds: ['music-weightless'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    mood: 'Peaceful',
    emotionalTag: 'Mindful',
    topics: ['Waterfront Trail', 'Marconi Union', 'Endurance', 'Recovery'],
    tags: ['Fitness', 'Sunset', 'Nature', 'MentalClarity'],
    people: [],
    places: ['Waterfront Trail'],
    aiGenerated: false,
    confirmedByUser: true,
    isFeatured: false,
  },
  {
    id: 'mem-day-4',
    userId: uid,
    title: 'Wisdom on Time Freedom & True Wealth',
    summary: 'Late night reading session of Morgan Housel\'s The Psychology of Money. True wealth is freedom over time and choices. Accompanied by Ludovico Einaudi\'s Experience.',
    category: 'Learning',
    date: '2026-08-31',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    sourceJournalIds: ['journal-day-4'],
    sourceBookIds: ['book-psychology-of-money'],
    sourceMusicIds: ['music-experience'],
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    mood: 'Reflective',
    emotionalTag: 'Enlightened',
    topics: ['Morgan Housel', 'Psychology of Money', 'Ludovico Einaudi', 'Autonomy'],
    tags: ['Books', 'Philosophy', 'Wealth'],
    people: [],
    places: ['Reading Corner'],
    aiGenerated: true,
    confirmedByUser: true,
    isFeatured: false,
  },
  {
    id: 'mem-day-5',
    userId: uid,
    title: 'Crafting the 3D Fibonacci Memory Continuum',
    summary: 'Brought the mathematical 3D Fibonacci sphere and continuous carousel pipeline to life with Three.js shaders and Daft Punk\'s Solar Sailer.',
    category: 'Milestones',
    date: '2026-09-01',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    sourceJournalIds: ['journal-day-5'],
    sourceBookIds: ['book-clean-code'],
    sourceMusicIds: ['music-solar-sailer'],
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
    mood: 'Inspired',
    emotionalTag: 'Creative',
    topics: ['Three.js', 'WebGL', 'Daft Punk', 'Fibonacci Geometry'],
    tags: ['Design', 'WebGL', 'ThreeJS', 'Creative'],
    people: [],
    places: ['Creative Studio'],
    aiGenerated: true,
    confirmedByUser: true,
    isFeatured: true,
  },
  {
    id: 'mem-day-6',
    userId: uid,
    title: 'Pine Ridge Mountain Summit Trek',
    summary: 'Ascended Pine Ridge mountain peak at sunrise. Fresh alpine breezes, excerpts from Jon Krakauer\'s Into the Wild, and Bon Iver\'s Holocene acoustic serenade.',
    category: 'Experiences',
    date: '2026-09-02',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    sourceJournalIds: ['journal-day-6'],
    sourceBookIds: ['book-into-the-wild'],
    sourceMusicIds: ['music-holocene'],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    mood: 'Awe',
    emotionalTag: 'Invigorated',
    topics: ['Pine Ridge', 'Jon Krakauer', 'Bon Iver', 'Alpine Hiking'],
    tags: ['Outdoors', 'Adventure', 'Mountains'],
    people: ['Hiking Companions'],
    places: ['Pine Ridge Summit (8,400 ft)'],
    aiGenerated: false,
    confirmedByUser: true,
    isFeatured: true,
  },
  {
    id: 'mem-day-7',
    userId: uid,
    title: 'Sunday Life Calibration & Stoic Reflection',
    summary: 'Synthesized the full 7 days of milestones, fitness, reading logs, and music memories. Grounded in Marcus Aurelius\'s Meditations and Incubus\'s Aqueous Transmission.',
    category: 'Emotional Moments',
    date: '2026-09-03',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceJournalIds: ['journal-day-7'],
    sourceBookIds: ['book-meditations'],
    sourceMusicIds: ['music-aqueous-transmission'],
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
    mood: 'Grateful',
    emotionalTag: 'Grounded',
    topics: ['Marcus Aurelius', 'Meditations', 'Incubus', 'Weekly Retrospective'],
    tags: ['Gratitude', 'Stoicism', 'WeeklySynthesis'],
    people: [],
    places: ['Sunroom Desk'],
    aiGenerated: false,
    confirmedByUser: true,
    isFeatured: true,
  },
];

/**
 * Fetch all canonical memories for the authenticated user from Firestore (/users/{uid}/memories)
 */
export async function getMemoriesForUser(uid: string): Promise<MemoryItem[]> {
  if (!uid) return [];

  try {
    const ref = collection(db, 'users', uid, 'memories');
    const q = query(ref, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const memories: MemoryItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: uid,
          title: data.title || 'Untitled Memory',
          summary: data.summary || data.snippet || '',
          snippet: data.snippet || data.summary || '',
          category: data.category || 'Milestones',
          date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
          sourceJournalIds: data.sourceJournalIds || [],
          sourceGoalIds: data.sourceGoalIds || [],
          sourceBookIds: data.sourceBookIds || [],
          sourceMusicIds: data.sourceMusicIds || [],
          sourceActivityIds: data.sourceActivityIds || [],
          people: data.people || [],
          places: data.places || [],
          topics: data.topics || [],
          tags: data.tags || [],
          mood: data.mood || data.emotionalTag || 'Reflective',
          emotionalTag: data.emotionalTag || data.mood || 'Reflective',
          imageUrl: data.imageUrl || data.mediaUrl || '',
          mediaUrl: data.mediaUrl || data.imageUrl || '',
          aiGenerated: Boolean(data.aiGenerated),
          confirmedByUser: data.confirmedByUser !== false,
          isFeatured: Boolean(data.isFeatured),
        };
      });

      // Update local storage cache
      localStorage.setItem(`${MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(memories));
      return memories;
    }
  } catch (err) {
    console.warn('[memoryService] Firestore getMemories fallback:', err);
  }

  // Check local cache
  const cached = localStorage.getItem(`${MEMORIES_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length >= 7 && parsed.some((p: any) => p.id?.startsWith('mem-day-'))) {
        return parsed;
      }
    } catch {}
  }

  // If no memories exist yet in DB or cache, return initial sample memories
  const defaults = SAMPLE_INITIAL_MEMORIES(uid);
  localStorage.setItem(`${MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(defaults));
  return defaults;
}

/**
 * Create a new canonical memory for user (preventing duplication)
 */
export async function createMemoryForUser(
  uid: string,
  memoryData: Partial<MemoryItem>
): Promise<MemoryItem> {
  const newMemory: MemoryItem = {
    id: memoryData.id || 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId: uid,
    title: (memoryData.title || 'Untitled Memory').trim(),
    summary: (memoryData.summary || memoryData.snippet || '').trim(),
    snippet: (memoryData.summary || memoryData.snippet || '').trim(),
    category: memoryData.category || 'Milestones',
    date: memoryData.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceJournalIds: memoryData.sourceJournalIds || [],
    sourceGoalIds: memoryData.sourceGoalIds || [],
    sourceBookIds: memoryData.sourceBookIds || [],
    sourceMusicIds: memoryData.sourceMusicIds || [],
    sourceActivityIds: memoryData.sourceActivityIds || [],
    people: memoryData.people || [],
    places: memoryData.places || [],
    topics: memoryData.topics || [],
    tags: memoryData.tags || [],
    mood: memoryData.mood || memoryData.emotionalTag || 'Reflective',
    emotionalTag: memoryData.emotionalTag || memoryData.mood || 'Reflective',
    imageUrl: memoryData.imageUrl || memoryData.mediaUrl || '',
    mediaUrl: memoryData.mediaUrl || memoryData.imageUrl || '',
    aiGenerated: Boolean(memoryData.aiGenerated),
    confirmedByUser: memoryData.confirmedByUser !== false,
    isFeatured: Boolean(memoryData.isFeatured),
  };

  try {
    const ref = collection(db, 'users', uid, 'memories');
    const docRef = await addDoc(ref, {
      title: newMemory.title,
      summary: newMemory.summary,
      snippet: newMemory.snippet,
      category: newMemory.category,
      date: newMemory.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      sourceJournalIds: newMemory.sourceJournalIds,
      sourceGoalIds: newMemory.sourceGoalIds,
      sourceBookIds: newMemory.sourceBookIds,
      sourceMusicIds: newMemory.sourceMusicIds,
      sourceActivityIds: newMemory.sourceActivityIds,
      people: newMemory.people,
      places: newMemory.places,
      topics: newMemory.topics,
      tags: newMemory.tags,
      mood: newMemory.mood,
      emotionalTag: newMemory.emotionalTag,
      imageUrl: newMemory.imageUrl,
      mediaUrl: newMemory.mediaUrl,
      aiGenerated: newMemory.aiGenerated,
      confirmedByUser: newMemory.confirmedByUser,
      isFeatured: newMemory.isFeatured,
    });
    newMemory.id = docRef.id;
  } catch (err) {
    console.warn('[memoryService] Firestore createMemory failed, saving locally:', err);
  }

  // Update cache
  const existing = await getMemoriesForUser(uid);
  const updated = [newMemory, ...existing.filter((m) => m.id !== newMemory.id)];
  localStorage.setItem(`${MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(updated));

  return newMemory;
}

/**
 * Update an existing canonical memory
 */
export async function updateMemoryForUser(
  uid: string,
  memoryId: string,
  updates: Partial<MemoryItem>
): Promise<MemoryItem> {
  const existing = await getMemoriesForUser(uid);
  const target = existing.find((m) => m.id === memoryId);
  const updatedItem: MemoryItem = {
    ...(target || ({} as MemoryItem)),
    ...updates,
    id: memoryId,
    userId: uid,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'users', uid, 'memories', memoryId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[memoryService] Firestore updateMemory failed:', err);
  }

  const updatedList = existing.map((m) => (m.id === memoryId ? updatedItem : m));
  localStorage.setItem(`${MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(updatedList));

  return updatedItem;
}

/**
 * Delete a canonical memory (does not delete source journal or goals)
 */
export async function deleteMemoryForUser(uid: string, memoryId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'memories', memoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[memoryService] Firestore deleteMemory failed:', err);
  }

  const existing = await getMemoriesForUser(uid);
  const filtered = existing.filter((m) => m.id !== memoryId);
  localStorage.setItem(`${MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(filtered));
}

/**
 * Fetch all weekly memories for the authenticated user
 */
export async function getWeeklyMemories(uid: string): Promise<WeeklyMemory[]> {
  if (!uid) return [];

  try {
    const ref = collection(db, 'users', uid, 'weekly_memories');
    const q = query(ref, orderBy('weekId', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const weeklyMemories: WeeklyMemory[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: uid,
          weekId: data.weekId,
          startDate: data.startDate,
          endDate: data.endDate,
          title: data.title,
          aiSummary: data.aiSummary,
          aiInsights: data.aiInsights || [],
          topMood: data.topMood,
          dominantSentiment: data.dominantSentiment,
          keyAchievements: data.keyAchievements || [],
          keyLearnings: data.keyLearnings || [],
          musicalVibe: data.musicalVibe,
          bookProgress: data.bookProgress,
          goalMomentum: data.goalMomentum,
          memoryItemIds: data.memoryItemIds || [],
          dataCounts: data.dataCounts || { journals: 0, goals: 0, books: 0, music: 0, moods: 0 },
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
          isDraft: Boolean(data.isDraft),
        };
      });

      localStorage.setItem(`${WEEKLY_MEMORIES_CACHE_PREFIX}${uid}`, JSON.stringify(weeklyMemories));
      return weeklyMemories;
    }
  } catch (err) {
    console.warn('[memoryService] Firestore getWeeklyMemories failed:', err);
  }

  const cached = localStorage.getItem(`${WEEKLY_MEMORIES_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  return [];
}

/**
 * Get a weekly memory by its weekId
 */
export async function getWeeklyMemoryByWeekId(uid: string, weekId: string): Promise<WeeklyMemory | null> {
  const all = await getWeeklyMemories(uid);
  return all.find(w => w.weekId === weekId) || null;
}

/**
 * Save a weekly memory
 */
export async function saveWeeklyMemory(uid: string, weeklyMemory: WeeklyMemory): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'weekly_memories', weeklyMemory.id);
    await setDoc(ref, {
      ...weeklyMemory,
      updatedAt: serverTimestamp(),
      createdAt: weeklyMemory.createdAt ? serverTimestamp() : serverTimestamp() // Fallback
    });
    
    // Clear cache to trigger re-fetch
    localStorage.removeItem(`${WEEKLY_MEMORIES_CACHE_PREFIX}${uid}`);
  } catch (err) {
    console.warn('[memoryService] Firestore saveWeeklyMemory failed:', err);
  }
}

/**
 * Life Connections Engine: Link a Journal to a Canonical Memory without duplication
 */
export async function linkJournalToMemory(
  uid: string,
  memoryId: string,
  journalId: string
): Promise<MemoryItem> {
  const existing = await getMemoriesForUser(uid);
  const target = existing.find((m) => m.id === memoryId);
  if (!target) throw new Error('Memory not found');

  const currentJournals = target.sourceJournalIds || [];
  if (currentJournals.includes(journalId)) {
    return target; // Already linked
  }

  const updatedSourceJournals = [...currentJournals, journalId];
  return await updateMemoryForUser(uid, memoryId, {
    sourceJournalIds: updatedSourceJournals,
  });
}

/**
 * Search and filter memories
 */
export function filterAndSearchMemories(
  memories: MemoryItem[],
  queryText: string,
  selectedCategory: string,
  sortOrder: 'newest' | 'oldest' = 'newest'
): MemoryItem[] {
  return memories
    .filter((m) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const catLower = selectedCategory.toLowerCase();
        const mCatLower = (m.category || '').toLowerCase();
        if (!mCatLower.includes(catLower) && !catLower.includes(mCatLower)) {
          return false;
        }
      }

      // Search query
      if (queryText.trim()) {
        const q = queryText.toLowerCase();
        const matchTitle = m.title?.toLowerCase().includes(q);
        const matchSummary = m.summary?.toLowerCase().includes(q);
        const matchCategory = m.category?.toLowerCase().includes(q);
        const matchMood = m.mood?.toLowerCase().includes(q) || m.emotionalTag?.toLowerCase().includes(q);
        const matchPeople = m.people?.some((p) => p.toLowerCase().includes(q));
        const matchPlaces = m.places?.some((p) => p.toLowerCase().includes(q));
        const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q));
        const matchTopics = m.topics?.some((t) => t.toLowerCase().includes(q));

        if (
          !matchTitle &&
          !matchSummary &&
          !matchCategory &&
          !matchMood &&
          !matchPeople &&
          !matchPlaces &&
          !matchTags &&
          !matchTopics
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
}
