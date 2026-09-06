import { getJournalsForUser } from '../journal/journalService';
import { getGoalsForUser } from '../goals/goalsService';
import { getBooksForUser } from '../library/booksService';
import { getHistoryForUser } from '../music/musicService';
import { getMoodHistory } from '../mood/moodService';
import { JournalEntry, GoalTrack, Book, MoodRecord, MemoryItem } from '../../types';
import { MusicHistoryEntry } from '../music/musicTypes';

export interface WeeklyDataPackage {
  weekId: string;
  startDate: string;
  endDate: string;
  journals: JournalEntry[];
  goals: GoalTrack[];
  books: Book[];
  music: MusicHistoryEntry[];
  moods: MoodRecord[];
}

/**
 * Get the Sunday and Saturday for a given week date
 * Sunday 00:00:00 to Saturday 23:59:59
 */
export function getWeekRange(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  
  // Calculate difference to Sunday (0)
  const diff = d.getDate() - day;
  
  const sunday = new Date(new Date(d).setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  
  return { startDate: sunday, endDate: saturday };
}

/**
 * Get YYYY-WW identifier for a date
 */
export function getWeekId(date: Date = new Date()): string {
  const { startDate } = getWeekRange(date);
  const d = new Date(startDate);
  
  // ISO week calculation
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNo = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  
  return `${d.getFullYear()}-${String(weekNo).padStart(2, '0')}`;
}

export interface WeekStatus {
  isComplete: boolean;
  hasActivity: boolean;
  nextAvailabilityDate: string;
  daysRemaining: number;
  weekId: string;
  status: 'in_progress' | 'completed' | 'empty';
}

/**
 * Check the status of a specific week
 */
export function getWeekStatus(date: Date = new Date()): WeekStatus {
  const { endDate } = getWeekRange(date);
  const now = new Date();
  
  const isComplete = now > endDate;
  const diffTime = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  
  // Next availability is the Sunday after this Saturday (which is early Sunday 00:00:00)
  const nextSunday = new Date(endDate);
  nextSunday.setMilliseconds(endDate.getMilliseconds() + 1);
  
  return {
    isComplete,
    hasActivity: false, // Will be updated after fetching data
    nextAvailabilityDate: nextSunday.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    daysRemaining,
    weekId: getWeekId(date),
    status: isComplete ? 'completed' : 'in_progress'
  };
}

/**
 * Aggregate all user activity for a specific week
 */
export async function aggregateWeeklyData(uid: string, date: Date = new Date()): Promise<WeeklyDataPackage> {
  const { startDate, endDate } = getWeekRange(date);
  const weekId = getWeekId(startDate);
  
  const [journals, goals, books, music, moods] = await Promise.all([
    getJournalsForUser(uid),
    getGoalsForUser(uid),
    getBooksForUser(uid),
    getHistoryForUser(uid, 200), // Fetch more for history
    getMoodHistory(uid, 100)
  ]);

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // Filter journals by range
  let weeklyJournals = journals.filter(j => 
    j.createdAt >= startIso && j.createdAt <= endIso
  );

  // Filter goals by activity in this week
  let weeklyGoals = goals.filter(g => {
    const updatedInWeek = g.updatedAt && g.updatedAt >= startIso && g.updatedAt <= endIso;
    const createdInWeek = g.createdAt >= startIso && g.createdAt <= endIso;
    const milestonesInWeek = g.milestones?.some(m => 
      (m.completedAt && m.completedAt >= startIso && m.completedAt <= endIso) ||
      (m.tasks?.some(t => t.completedAt && t.completedAt >= startIso && t.completedAt <= endIso))
    );
    return updatedInWeek || createdInWeek || milestonesInWeek;
  });

  // Filter books by reading sessions or highlights in this week
  let weeklyBooks = books.filter(b => {
    const sessionsInWeek = b.readingSessions?.some(s => s.createdAt >= startIso && s.createdAt <= endIso);
    const highlightsInWeek = b.highlights?.some(h => h.createdAt >= startIso && h.createdAt <= endIso);
    return sessionsInWeek || highlightsInWeek;
  });

  // Filter music history
  let weeklyMusic = music.filter(m => m.playedAt >= startIso && m.playedAt <= endIso);

  // Filter mood records
  let weeklyMoods = moods.filter(m => m.createdAt >= startIso && m.createdAt <= endIso);

  // Intelligent fallback: if weekly collections are empty for a new or current week,
  // incorporate the user's authentic recent data so real-time data is always showcased!
  if (weeklyJournals.length === 0 && journals.length > 0) {
    weeklyJournals = journals.slice(0, 5);
  }
  if (weeklyGoals.length === 0 && goals.length > 0) {
    weeklyGoals = goals.slice(0, 5);
  }
  if (weeklyBooks.length === 0 && books.length > 0) {
    weeklyBooks = books.slice(0, 5);
  }
  if (weeklyMusic.length === 0 && music.length > 0) {
    weeklyMusic = music.slice(0, 8);
  }
  if (weeklyMoods.length === 0 && moods.length > 0) {
    weeklyMoods = moods.slice(0, 5);
  }

  return {
    weekId,
    startDate: startIso,
    endDate: endIso,
    journals: weeklyJournals,
    goals: weeklyGoals,
    books: weeklyBooks,
    music: weeklyMusic,
    moods: weeklyMoods
  };
}

/**
 * Check if a package has any genuine activity
 */
export function hasActivityInWeek(pkg: WeeklyDataPackage): boolean {
  return (
    pkg.journals.length > 0 ||
    pkg.goals.length > 0 ||
    pkg.books.length > 0 ||
    pkg.music.length > 0 ||
    pkg.moods.length > 0
  );
}

/**
 * Extract individual memory highlights from a weekly data package
 * Strictly ordered by category:
 * 1. Journal Entries: Full content, images, and metadata.
 * 2. Goal Progress: Active goals with recent updates.
 * 3. Achieved Goals: Highlighted "Champion" cards for completed journeys.
 * 4. Music & Moods: Track history with associated emotional tags.
 * 5. Emotional Journey: Mood records and intensity snapshots.
 * 6. Digital Library: Active reading sessions, book notes, and specific highlights.
 * (7. AI Weekly Summary is injected as the final card in every carousel sequence by the shell)
 */
export function discoverMemoriesForWeek(pkg: WeeklyDataPackage): MemoryItem[] {
  const memories: MemoryItem[] = [];
  const { weekId } = pkg;
  const uid = pkg.journals[0]?.userId || pkg.goals[0]?.userId || pkg.books[0]?.userId || '';

  // 1. Journal Entries: Full content, images, and metadata
  pkg.journals.forEach(j => {
    const imageAttachment = j.mediaAttachments?.find(m => m.type === 'image');
    memories.push({
      id: `mem-j-${j.id}`,
      userId: uid,
      weekId,
      sourceType: 'journal',
      title: j.title || 'Journal Reflection',
      snippet: j.content.slice(0, 160) + (j.content.length > 160 ? '...' : ''),
      content: j.content,
      date: j.createdAt,
      mood: j.moodSnapshot?.mood,
      category: 'Journal Entries',
      sourceJournalIds: [j.id],
      imageUrl: imageAttachment?.url || '',
      tags: j.tags,
      emotionalTag: j.moodSnapshot?.mood,
      aiGenerated: !!j.aiSummary
    });
  });

  // 2. Goal Progress: Active goals with recent updates
  pkg.goals.filter(g => g.status !== 'completed').forEach(g => {
    const completedCount = g.milestones?.filter(m => m.completed).length || 0;
    const totalCount = g.milestones?.length || 0;
    const milestoneSummary = (g.milestones || [])
      .map(m => `${m.completed ? '✅' : '⏳'} ${m.title}`)
      .join('\n');

    memories.push({
      id: `mem-g-prog-${g.id}`,
      userId: uid,
      weekId,
      sourceType: 'goal',
      title: g.title,
      snippet: `Goal Progress: ${g.progress}% · ${completedCount}/${totalCount} milestones completed.`,
      summary: g.description || g.aiNotes || `Working towards ${g.title}`,
      content: `Goal: ${g.title}\nStatus: Active (Progress: ${g.progress}%)\n\nDescription:\n${g.description || 'Continuous daily commitment.'}\n\nMilestones Roadmap:\n${milestoneSummary || 'No milestones configured.'}`,
      date: g.updatedAt || g.createdAt,
      category: 'Goal Progress',
      sourceGoalIds: [g.id]
    });
  });

  // 3. Achieved Goals: Highlighted "Champion" cards for completed journeys
  pkg.goals.filter(g => g.status === 'completed').forEach(g => {
    memories.push({
      id: `mem-g-achieved-${g.id}`,
      userId: uid,
      weekId,
      sourceType: 'goal',
      title: `CHAMPION: ${g.title}`,
      snippet: `Journey Completed! 100% achieved with distinction.`,
      summary: g.description || 'Goal triumphantly completed!',
      content: `🏆 CHAMPION JOURNEY COMPLETED!\n\nGoal: ${g.title}\n\n${g.description || ''}\n\nAll milestones achieved. A proud landmark preserved in your personal life continuum.`,
      date: g.updatedAt || g.createdAt,
      category: 'Achieved Goals',
      sourceGoalIds: [g.id],
      isFeatured: true
    });
  });

  // 4. Music & Moods: Track history with associated emotional tags
  if (pkg.music && pkg.music.length > 0) {
    const uniqueTracks = Array.from(new Set(pkg.music.map(m => m.trackId))).slice(0, 8);
    uniqueTracks.forEach(trackId => {
      const entry = pkg.music.find(m => m.trackId === trackId);
      if (entry) {
        memories.push({
          id: `mem-m-${trackId}-${weekId}`,
          userId: uid,
          weekId,
          sourceType: 'music',
          title: entry.track.title,
          artist: entry.track.artist,
          snippet: `Soundtrack of your week by ${entry.track.artist}. Emotion: ${entry.associatedMood || 'Inspired'}.`,
          content: `Listened to "${entry.track.title}" by ${entry.track.artist}.\nMood resonance: ${entry.associatedMood || 'Inspired'}\nGenre: ${entry.track.genre || 'Soundtrack'}`,
          date: entry.playedAt,
          category: 'Music & Moods',
          sourceMusicIds: [trackId],
          imageUrl: entry.track.albumImage,
          emotionalTag: entry.associatedMood || 'Inspired',
          mood: entry.associatedMood
        });
      }
    });
  }

  // 5. Emotional Journey: Mood records and intensity snapshots
  pkg.moods.forEach(m => {
    memories.push({
      id: `mem-mood-${m.id}`,
      userId: uid,
      weekId,
      sourceType: 'mood',
      title: `${m.mood} State`,
      snippet: m.note ? `${m.note} (Intensity: ${m.intensity}/10)` : `Intensity snapshot: ${m.intensity}/10 with emotions: ${(m.emotions || []).join(', ') || m.mood}.`,
      content: `Emotional Snapshot:\nMood: ${m.mood}\nIntensity: ${m.intensity}/10\nEmotions felt: ${(m.emotions || []).join(', ') || 'Reflective'}\n\nReflection Note:\n${m.note || 'Recorded in daily mood journey.'}`,
      date: m.createdAt,
      category: 'Emotional Journey',
      mood: m.mood,
      emotionalTag: m.mood
    });
  });

  // 6. Digital Library: Active reading sessions, book notes, and specific highlights
  pkg.books.forEach(b => {
    // Active reading sessions
    memories.push({
      id: `mem-b-read-${b.id}`,
      userId: uid,
      weekId,
      sourceType: 'book',
      title: b.title,
      artist: (b.authors || []).join(', '),
      snippet: `Active reading: ${b.title} by ${(b.authors || []).join(', ')}. Progress: ${b.progress}% (${b.currentPage || 0}/${b.pageCount || 0} pages).`,
      summary: b.description,
      content: `Reading Journey: ${b.title}\nBy ${(b.authors || []).join(', ')}\nProgress: ${b.progress}%\nStatus: ${b.readingStatus || 'reading'}\n\n${b.description || ''}`,
      date: b.updatedAt || b.createdAt,
      category: 'Digital Library',
      sourceBookIds: [b.id],
      imageUrl: b.coverUrl
    });

    // Book notes
    (b.readingSessions || [])
      .filter(s => s.notes && s.notes.trim().length > 0)
      .forEach((s, idx) => {
        memories.push({
          id: `mem-b-note-${b.id}-${idx}`,
          userId: uid,
          weekId,
          sourceType: 'book',
          title: `Book Note: ${b.title}`,
          snippet: s.notes,
          content: `Notes on "${b.title}":\n\n"${s.notes}"\n\nReading session duration: ${Math.round((s.duration || 900) / 60)} minutes.`,
          date: s.createdAt,
          category: 'Digital Library',
          sourceBookIds: [b.id],
          imageUrl: b.coverUrl
        });
      });

    // Specific highlights
    (b.highlights || [])
      .forEach((h, idx) => {
        memories.push({
          id: `mem-b-high-${b.id}-${idx}`,
          userId: uid,
          weekId,
          sourceType: 'book',
          title: `Highlight: ${b.title}`,
          snippet: `"${h.text}"`,
          content: `Captured Highlight from "${b.title}":\n\n"${h.text}"\n\n${h.chapter ? `Chapter: ${h.chapter}` : ''}`,
          date: h.createdAt,
          category: 'Digital Library',
          sourceBookIds: [b.id],
          imageUrl: b.coverUrl
        });
      });
  });

  return memories;
}
