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
import { db } from '../../services/firebase';
import { JournalEntry, JournalPrivacyLevel, MediaAttachment } from '../../types';
import { analyzeJournalWithGemini } from '../../services/api.client';
import {
  getGoalsForUser,
  appendEvidenceToGoal,
  autoCreateGoalFromJournal,
  detectGoalsFromJournals,
} from '../goals/goalsService';
import { createCalendarEvent } from '../calendar/calendarService';

const LOCAL_STORAGE_KEY_PREFIX = 'pgj_journals_';

// Initial default starter journals for new users representing a complete 7-day demo week
export const DEFAULT_SAMPLE_JOURNALS = (uid: string): JournalEntry[] => [
  {
    id: 'journal-day-1',
    userId: uid,
    title: 'Sunrise Espresso & Deep Focus Routine',
    content:
      'Started the week with early morning espresso at 6:30 AM. Read the first two chapters of Atomic Habits on the power of compounding 1% gains daily. Established an uninterrupted 2-hour deep work block for AI engineering with Debussy\'s Clair de Lune playing softly in the background.',
    category: 'reflection',
    privacy: 'standard',
    tags: ['DeepWork', 'MorningRoutine', 'AtomicHabits'],
    moodSnapshot: { mood: 'Focused & Energized', score: 5, energy: 5, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
        title: 'Morning workspace with fresh espresso & notes',
      },
    ],
    aiSummary: 'Morning habit alignment, reading Atomic Habits, and deep AI architecture session.',
    aiInsights: ['Strong morning energy correlation with classical music focus periods.'],
    linkedGoalIds: ['goal-1'],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'journal-day-2',
    userId: uid,
    title: 'Cloud Run Architecture Breakthrough',
    content:
      'Major breakthrough today on our server-side proxy architecture and Firestore user isolation. Solved the token lifecycle challenge and verified authenticated UID-based access control. Re-read chapter on distributed state in Designing Data-Intensive Applications. High octane coding session fueled by M83\'s Midnight City.',
    category: 'learning',
    privacy: 'standard',
    tags: ['Architecture', 'CloudRun', 'Security'],
    moodSnapshot: { mood: 'Triumphant', score: 5, energy: 5, stress: 2 },
    mediaAttachments: [
      {
        id: 'img-day-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        title: 'Modern developer terminal and architecture review',
      },
    ],
    aiSummary: 'Successfully achieved UID isolation and completed distributed system chapter.',
    aiInsights: ['Technical milestones boost momentum for creative visualization tasks.'],
    linkedGoalIds: ['goal-1'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'journal-day-3',
    userId: uid,
    title: '5K Sunset Trail Jog & Mindful Reset',
    content:
      'Ran 5.2 kilometers along the waterfront trail just as the sun was setting in amber and violet hues. Cleared away mid-week mental fatigue. Listened to Marconi Union\'s Weightless for ambient relaxation during cool-down stretching and felt completely centered.',
    category: 'memory',
    privacy: 'standard',
    tags: ['Fitness', 'Sunset', 'Mindfulness', 'Health'],
    moodSnapshot: { mood: 'Peaceful', score: 4, energy: 4, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-3',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
        title: 'Golden sunset over the calm waterfront trail',
      },
    ],
    aiSummary: 'Cardio endurance trail run and mindful relaxation recovery.',
    aiInsights: ['Outdoor physical activity effectively resets mid-week cognitive fatigue.'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'journal-day-4',
    userId: uid,
    title: 'Late Night Reading & Financial Wisdom',
    content:
      'Curled up in the armchair with hot chamomile tea and Morgan Housel\'s The Psychology of Money. Key realization: wealth is the freedom of time and options you maintain, not material possessions. Accompanied by Ludovico Einaudi\'s Experience on neoclassical piano.',
    category: 'learning',
    privacy: 'standard',
    tags: ['Reading', 'Wisdom', 'Philosophy'],
    moodSnapshot: { mood: 'Reflective', score: 5, energy: 3, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-4',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
        title: 'Cozy evening library corner with warm lamp and book',
      },
    ],
    aiSummary: 'Deep reading session on financial psychology and time autonomy.',
    aiInsights: ['Consistent evening reading routine improves sleep quality and long-term perspective.'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'journal-day-5',
    userId: uid,
    title: 'WebGL Spatial Geometry & Creative Flow',
    content:
      'Brought the 3D Fibonacci memory sphere and linear carousel to life using Three.js and custom mathematical distribution. Seeing life moments floating in space is magical. Daft Punk\'s Solar Sailer on repeat provided the perfect retro-futuristic rhythm.',
    category: 'idea',
    privacy: 'standard',
    tags: ['CreativeFlow', 'ThreeJS', 'Design'],
    moodSnapshot: { mood: 'Inspired', score: 5, energy: 5, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-5',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
        title: 'Cyberpunk futuristic spatial geometry and digital aesthetics',
      },
    ],
    aiSummary: 'Implemented 3D WebGL mathematical sphere and continuous carousel pipeline.',
    aiInsights: ['Creative technical synthesis produces highest self-reported satisfaction.'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'journal-day-6',
    userId: uid,
    title: 'Pine Ridge Mountain Summit Trek',
    content:
      'Early morning ascent to Pine Ridge peak. Fresh alpine air, pine scents, and a panoramic view of the mountain ranges that took my breath away. Read excerpts from Jon Krakauer\'s Into the Wild at the summit. Bon Iver\'s Holocene matched the quiet majesty.',
    category: 'memory',
    privacy: 'standard',
    tags: ['Outdoors', 'Mountains', 'Adventure', 'Hiking'],
    moodSnapshot: { mood: 'Awe & Wonder', score: 5, energy: 5, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-6',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
        title: 'Majestic alpine mountain peaks bathed in early morning sunlight',
      },
    ],
    aiSummary: 'Summit trek at Pine Ridge, alpine nature reflection, and reading Into the Wild.',
    aiInsights: ['Nature immersions provide significant boost to weekly emotional well-being.'],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'journal-day-7',
    userId: uid,
    title: 'Weekly Life Calibration & Sunday Reflections',
    content:
      'Sunday afternoon reflection session. Reviewed all 7 days of milestones, reading habits, musical memories, and fitness progress. Life feels aligned, intentional, and deeply grounded. Finished the week with Marcus Aurelius\'s Meditations and Incubus\'s Aqueous Transmission.',
    category: 'gratitude',
    privacy: 'standard',
    tags: ['WeeklyReview', 'Gratitude', 'Meditations'],
    moodSnapshot: { mood: 'Grounded & Grateful', score: 5, energy: 4, stress: 1 },
    mediaAttachments: [
      {
        id: 'img-day-7',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
        title: 'Aesthetic journal, fountain pen, and warm coffee cup for Sunday review',
      },
    ],
    aiSummary: 'Weekly synthesis, goal alignment, and stoic philosophy reflections.',
    aiInsights: ['Weekly retrospective habit maintains goal clarity and emotional resilience.'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get all journal entries for an authenticated user.
 * Tries Firestore first (/users/{uid}/journals), falls back to local storage if offline or unavailable.
 */
export async function getJournalsForUser(uid: string): Promise<JournalEntry[]> {
  if (!uid) return [];

  try {
    const journalsRef = collection(db, 'users', uid, 'journals');
    const q = query(journalsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const entries: JournalEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: uid,
          title: data.title || 'Untitled Journal',
          content: data.content || '',
          category: data.category || 'reflection',
          privacy: data.privacy || 'standard',
          isPinLocked: data.isPinLocked || false,
          isBookmarked: data.isBookmarked || false,
          tags: data.tags || [],
          mediaAttachments: data.mediaAttachments || [],
          aiSummary: data.aiSummary || undefined,
          aiInsights: data.aiInsights || undefined,
          linkedGoalIds: data.linkedGoalIds || [],
          detectedSuggestions: data.detectedSuggestions || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
        };
      });

      // Save cache locally
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(entries));
      return entries;
    }
  } catch (err) {
    console.warn('[journalService] Firestore fetch failed, loading local fallback:', err);
  }

  // Fallback to local storage or defaults
  const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore JSON parse error
    }
  }

  const defaults = DEFAULT_SAMPLE_JOURNALS(uid);
  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(defaults));
  return defaults;
}

/**
 * Create a new journal entry under /users/{uid}/journals
 */
export async function createJournalForUser(
  uid: string,
  entry: {
    title: string;
    content: string;
    category?: JournalEntry['category'];
    privacy?: JournalPrivacyLevel;
    tags?: string[];
    mediaAttachments?: MediaAttachment[];
  }
): Promise<JournalEntry> {
  const newId = 'journal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // Retrieve user's canonical goals for no-duplication detection
  let existingGoals: any[] = [];
  try {
    existingGoals = await getGoalsForUser(uid);
  } catch (err) {
    console.warn('Could not fetch goals for analysis:', err);
  }

  // Perform AI analysis on every entry
  let aiAnalysis: any = { summary: '', insights: [], suggestedTags: [], matchedGoalIds: [], detectedSuggestions: [] };
  try {
    aiAnalysis = await analyzeJournalWithGemini({
      title: entry.title,
      content: entry.content,
      existingGoals,
    });
  } catch (err) {
    console.warn('AI analysis skipped or failed:', err);
  }

  // --- AUTOMATIC GOAL IDENTIFICATION & F1 TRACK APPENDING WITH TIMESTAMP & EVIDENCE ---
  const matchedGoalIds: string[] = aiAnalysis.matchedGoalIds || [];
  for (const goalId of matchedGoalIds) {
    try {
      await appendEvidenceToGoal(uid, goalId, {
        journalId: newId,
        journalTitle: entry.title || 'Untitled Journal',
        journalContent: entry.content,
        timestamp: now,
      });
    } catch (err) {
      console.warn(`[journalService] Append evidence to matched goal ${goalId} failed:`, err);
    }
  }

  const autoCreatedGoalIds: string[] = [];
  // 1. Check AI detected suggestions for new goals
  if (aiAnalysis.detectedSuggestions && Array.isArray(aiAnalysis.detectedSuggestions)) {
    for (const sug of aiAnalysis.detectedSuggestions) {
      if (sug.type === 'goal' || sug.title) {
        const isDuplicate = existingGoals.some(
          (g) => g.title.toLowerCase().includes(sug.title.toLowerCase()) || sug.title.toLowerCase().includes(g.title.toLowerCase())
        );
        if (!isDuplicate) {
          try {
            const newGoalTrack = await autoCreateGoalFromJournal(uid, {
              title: sug.title,
              description: sug.description || `Automatically identified from journal entry: "${entry.title}"`,
              category: sug.category,
              milestones: sug.milestones,
              journalId: newId,
              journalTitle: entry.title || 'Untitled Journal',
              journalContent: entry.content,
              timestamp: now,
            });
            autoCreatedGoalIds.push(newGoalTrack.id);
          } catch (err) {
            console.warn('[journalService] Auto create goal from AI suggestion failed:', err);
          }
        }
      }
    }
  }

  // 2. Check local fallback pattern matching if AI didn't create a new goal
  if (autoCreatedGoalIds.length === 0) {
    const tempEntry: JournalEntry = {
      id: newId,
      userId: uid,
      title: entry.title || 'Untitled Journal',
      content: entry.content,
      category: entry.category || 'reflection',
      privacy: entry.privacy || 'standard',
      tags: entry.tags || [],
      mediaAttachments: entry.mediaAttachments || [],
      createdAt: now,
      updatedAt: now,
    };
    const localSuggestions = detectGoalsFromJournals([tempEntry], existingGoals);
    for (const sug of localSuggestions) {
      const isDuplicate = existingGoals.some(
        (g) => g.title.toLowerCase().includes(sug.title.toLowerCase()) || sug.title.toLowerCase().includes(g.title.toLowerCase())
      );
      if (!isDuplicate && !matchedGoalIds.length) {
        try {
          const newGoalTrack = await autoCreateGoalFromJournal(uid, {
            title: sug.title,
            description: sug.description,
            journalId: newId,
            journalTitle: entry.title || 'Untitled Journal',
            journalContent: entry.content,
            timestamp: now,
          });
          autoCreatedGoalIds.push(newGoalTrack.id);
        } catch (err) {
          console.warn('[journalService] Auto create goal from local detection failed:', err);
        }
      }
    }
  }

  // --- HELPER TO FORMAT DATE LOCALLY (YYYY-MM-DD) ---
  const formatDateLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // --- HELPER TO EXTRACT EXPLICIT DATES FROM TEXT (e.g. Sep 15) ---
  const extractDateFromText = (text: string): string | null => {
    const lower = text.toLowerCase();
    const match = lower.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\.\s]+(\d{1,2})(?:st|nd|rd|th)?/);
    if (match) {
      const monthStr = match[1];
      const day = parseInt(match[2], 10);
      const monthMap: Record<string, number> = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12,
      };
      const monthNum = monthMap[monthStr] || 9;
      const year = new Date().getFullYear();
      const m = String(monthNum).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
    return null;
  };

  // --- AUTOMATIC CALENDAR EVENT SCHEDULING (CALENDAR EVENTS ONLY, NO UNRELATED GOALS) ---
  const fullText = (entry.title + ' ' + entry.content);
  const explicitDate = extractDateFromText(fullText);

  if (aiAnalysis.detectedEvents && Array.isArray(aiAnalysis.detectedEvents) && aiAnalysis.detectedEvents.length > 0) {
    for (const evt of aiAnalysis.detectedEvents) {
      try {
        let eventDate = explicitDate || evt.date || formatDateLocal(new Date());
        // Clean up date string if format is YYYY-MM-DD
        if (eventDate && eventDate.includes('T')) {
          eventDate = eventDate.split('T')[0];
        }
        await createCalendarEvent(uid, {
          title: evt.title || 'Scheduled Event',
          date: eventDate,
          startTime: evt.startTime || '10:00',
          endTime: '11:00',
          description: evt.description || `Auto-scheduled from journal entry: "${entry.title || 'Untitled Journal'}"`,
          category: 'Meeting',
          color: '#6366f1',
          reminder: '1_day', // Reminder set one day before
          repeat: 'none',
          relatedGoalIds: [],
          relatedJournalIds: [newId],
        });
      } catch (err) {
        console.warn('[journalService] Auto calendar event creation failed:', err);
      }
    }
  } else {
    // Fallback detection for interview, exam, appointment, test, deadline
    const textLower = fullText.toLowerCase();
    if (textLower.includes('exam') || textLower.includes('interview') || textLower.includes('test') || textLower.includes('appointment') || textLower.includes('deadline')) {
      try {
        let topic = 'Interview & Appointment';
        if (textLower.includes('sql')) topic = 'SQL Exam Session';
        else if (textLower.includes('data')) topic = 'Data Analytics Assessment';
        else if (textLower.includes('interview')) topic = 'Technical & HR Interview';
        else topic = 'Important Scheduled Event';

        const eventDate = explicitDate || (textLower.includes('tomorrow') ? formatDateLocal(new Date(Date.now() + 86400000)) : formatDateLocal(new Date()));

        await createCalendarEvent(uid, {
          title: topic,
          date: eventDate,
          startTime: '10:00',
          endTime: '11:00',
          description: `Auto-scheduled calendar event from journal: "${entry.title || 'Journal Entry'}"`,
          category: 'Meeting',
          color: '#6366f1',
          reminder: '1_day', // Reminder set one day before
          repeat: 'none',
          relatedGoalIds: [],
          relatedJournalIds: [newId],
        });
      } catch (err) {
        console.warn('[journalService] Fallback event creation failed:', err);
      }
    }
  }

  const allLinkedGoalIds = Array.from(new Set([...matchedGoalIds, ...autoCreatedGoalIds]));

  // Determine final tags: if user provided custom tags (other than placeholder 'Daily'/'Journal'), use them; otherwise auto-populate AI tags
  const userProvidedCustomTags = entry.tags && entry.tags.length > 0 && !entry.tags.every(t => t === 'Daily' || t === 'Journal');
  let finalTags: string[] = userProvidedCustomTags
    ? entry.tags!
    : (aiAnalysis.suggestedTags && aiAnalysis.suggestedTags.length > 0
        ? aiAnalysis.suggestedTags
        : (entry.tags && entry.tags.length > 0 ? entry.tags : ['Journal', 'Reflection']));

  const newEntry: JournalEntry = {
    id: newId,
    userId: uid,
    title: entry.title.trim() || 'Untitled Journal',
    content: entry.content.trim(),
    category: entry.category || 'reflection',
    privacy: entry.privacy || 'standard',
    isPinLocked: entry.privacy === 'private' || entry.privacy === 'pin_locked',
    isBookmarked: false,
    tags: finalTags,
    mediaAttachments: entry.mediaAttachments || [],
    aiSummary: aiAnalysis.summary || undefined,
    aiInsights: aiAnalysis.insights || [],
    linkedGoalIds: allLinkedGoalIds,
    detectedSuggestions: aiAnalysis.detectedSuggestions || [],
    createdAt: now,
    updatedAt: now,
  };

  // Try Firestore insertion
  try {
    const journalsRef = collection(db, 'users', uid, 'journals');
    const docRef = await addDoc(journalsRef, {
      title: newEntry.title,
      content: newEntry.content,
      category: newEntry.category,
      privacy: newEntry.privacy,
      isPinLocked: newEntry.isPinLocked,
      isBookmarked: false,
      tags: newEntry.tags,
      mediaAttachments: newEntry.mediaAttachments,
      aiSummary: newEntry.aiSummary || null,
      aiInsights: newEntry.aiInsights || [],
      linkedGoalIds: newEntry.linkedGoalIds || [],
      detectedSuggestions: newEntry.detectedSuggestions || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    newEntry.id = docRef.id;
  } catch (err) {
    console.warn('[journalService] Firestore create failed, saving to local cache:', err);
  }

  // Always update local cache
  const existing = await getJournalsForUser(uid);
  const updated = [newEntry, ...existing.filter((e) => e.id !== newEntry.id)];
  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(updated));

  return newEntry;
}

/**
 * Update an existing journal entry
 */
export async function updateJournalForUser(
  uid: string,
  journalId: string,
  updates: Partial<JournalEntry>
): Promise<JournalEntry> {
  const existing = await getJournalsForUser(uid);
  const current = existing.find((j) => j.id === journalId);
  if (!current) throw new Error('Journal entry not found');

  let extraAnalysisUpdates: Partial<JournalEntry> = {};
  if (updates.content || updates.title) {
    try {
      const newTitle = updates.title !== undefined ? updates.title : current.title;
      const newContent = updates.content !== undefined ? updates.content : current.content;
      const existingGoals = await getGoalsForUser(uid).catch(() => []);
      const analysis = await analyzeJournalWithGemini({
        title: newTitle,
        content: newContent,
        existingGoals,
      });
      extraAnalysisUpdates.aiSummary = analysis.summary;
      extraAnalysisUpdates.aiInsights = analysis.insights;
      extraAnalysisUpdates.linkedGoalIds = analysis.matchedGoalIds;
      if (!updates.tags && analysis.suggestedTags && analysis.suggestedTags.length > 0) {
        extraAnalysisUpdates.tags = analysis.suggestedTags;
      }
    } catch (err) {
      console.warn('[journalService] Re-analysis on update failed:', err);
    }
  }

  const updatedEntry: JournalEntry = {
    ...current,
    ...updates,
    ...extraAnalysisUpdates,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'users', uid, 'journals', journalId);
    await updateDoc(docRef, {
      ...updates,
      ...extraAnalysisUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[journalService] Firestore update failed:', err);
  }

  const updatedList = existing.map((j) => (j.id === journalId ? updatedEntry : j));
  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(updatedList));

  return updatedEntry;
}

/**
 * Toggle bookmark status on a journal entry
 */
export async function toggleBookmarkJournal(uid: string, journalId: string): Promise<boolean> {
  const existing = await getJournalsForUser(uid);
  const target = existing.find((j) => j.id === journalId);
  if (!target) return false;

  const nextState = !target.isBookmarked;
  await updateJournalForUser(uid, journalId, { isBookmarked: nextState });
  return nextState;
}

/**
 * Delete a journal entry
 */
export async function deleteJournalForUser(uid: string, journalId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'journals', journalId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[journalService] Firestore delete failed:', err);
  }

  const existing = await getJournalsForUser(uid);
  const updated = existing.filter((j) => j.id !== journalId);
  localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(updated));
}
