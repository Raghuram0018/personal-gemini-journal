/**
 * Personal Gemini Journal - Core Type Definitions
 * Designed for user isolation (/users/{uid}/...), server-side Gemini boundaries, and strict ABAC security.
 */

// --- Authentication & User Isolation Types ---
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  emailVerified: boolean;
}

export type AuthState = 'unauthenticated' | 'authenticating' | 'authenticated' | 'error';

// --- Journal & Privacy Types ---
export type JournalPrivacyLevel = 'standard' | 'private' | 'pin_locked';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'bookmark';
  url: string;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface AISuggestion {
  id: string;
  type: 'goal' | 'memory' | 'event' | 'book' | 'music';
  title: string;
  description: string;
  existingMatchId?: string;
  status: 'pending' | 'approved' | 'dismissed';
  sourceJournalId?: string;
  sourceJournalTitle?: string;
  journalExcerpt?: string;
  milestones?: Array<{ title: string; description: string; targetDate?: string }>;
}

export interface JournalEntry {
  id: string;
  userId: string; // Must match authenticated Firebase UID strictly
  title: string;
  content: string;
  category: 'reflection' | 'memory' | 'gratitude' | 'idea' | 'event' | 'learning';
  privacy: JournalPrivacyLevel;
  isPinLocked?: boolean;
  isBookmarked?: boolean;
  tags: string[];
  mediaAttachments: MediaAttachment[];
  moodSnapshot?: {
    mood: string;
    score: number; // 1 to 5
    energy: number;
    stress: number;
  };
  moodRecordId?: string; // Link to a full MoodRecord
  aiSummary?: string;
  aiInsights?: string[];
  linkedGoalIds?: string[];
  linkedBookIds?: string[];
  linkedMemoryIds?: string[];
  detectedSuggestions?: AISuggestion[];
  createdAt: string;
  updatedAt: string;
}

// --- Ask My Journal & Grounding Types ---
export interface AskMyJournalSource {
  id: string;
  title: string;
  category?: string;
  date?: string;
  type?: 'journal' | 'goal' | 'calendar' | 'book' | 'music' | string;
}

export interface AskMyJournalMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: AskMyJournalSource[];
  summary?: string;
  insights?: string[];
  tips?: string[];
  actionSuggestion?: AISuggestion;
  timestamp: string;
}

export interface GeminiInteraction {
  id: string;
  query: string;
  response: string;
  groundedEntryIds: string[];
  timestamp: string;
  model: string;
}

export interface JournalGroundingContext {
  authorizedUid: string;
  relevantEntriesCount: number;
  timeRange?: {
    start: string;
    end: string;
  };
}

// --- Goal Journey Types ---
export interface GoalTaskItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  completedAt?: string;
  targetDate?: string;
  tasks?: GoalTaskItem[];
  evidence?: string;
  aiExplanation?: string;
  checkpointLocation?: { x: number; y: number };
  goalId?: string;
  goalTitle?: string;
  goalCategory?: string;
}

export interface GoalTrack {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: string;
  status?: 'active' | 'completed' | 'paused';
  progress?: number; // 0 to 100
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt?: string;
  targetDate?: string;
  relatedJournalIds?: string[];
  relatedCalendarIds?: string[];
  relatedBookIds?: string[];
  relatedMoodIds?: string[];
  relatedMemoryIds?: string[];
  aiNotes?: string;
}

// --- Memories Carousel & Sphere Types ---
export interface MemoryItem {
  id: string;
  userId: string;
  weekId?: string; // e.g. "2026-W34" - links to a WeeklyMemory
  sourceType?: 'journal' | 'goal' | 'book' | 'music' | 'media' | 'mood' | 'activity' | 'default';
  title: string;
  snippet?: string;
  summary?: string;
  content?: string;
  category?: 'Achievements' | 'Milestones' | 'Emotional Moments' | 'Goals' | 'Learning' | 'Relationships' | 'Experiences' | 'Other' | string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  mediaUrl?: string;
  imageUrl?: string;
  emotionalTag?: string;
  mood?: string;
  sourceJournalIds?: string[];
  sourceGoalIds?: string[];
  sourceBookIds?: string[];
  sourceMusicIds?: string[];
  sourceActivityIds?: string[];
  people?: string[];
  places?: string[];
  topics?: string[];
  tags?: string[];
  aiGenerated?: boolean;
  confirmedByUser?: boolean;
  isFeatured?: boolean;
  artist?: string;
}

export interface WeeklyMemory {
  id: string;
  userId: string;
  weekId: string; // YYYY-WW, e.g. "2026-34"
  startDate: string;
  endDate: string;
  title: string;
  aiSummary: string;
  aiInsights: string[];
  topMood?: string;
  dominantSentiment?: string;
  keyAchievements: string[];
  keyLearnings: string[];
  musicalVibe?: string;
  bookProgress?: string;
  goalMomentum?: string;
  memoryItemIds: string[]; // Links to individual MemoryItems created for this week
  dataCounts: {
    journals: number;
    goals: number;
    books: number;
    music: number;
    moods: number;
  };
  createdAt: string;
  updatedAt: string;
  isDraft?: boolean;
}

export type MoodMetric = 'Radiant' | 'Happy' | 'Stable' | 'Tired' | 'Low' | 'Stressed' | 'Anxious';

// --- Mood Journey Types ---
export interface MoodRecord {
  id: string;
  userId: string;
  mood: MoodMetric; // The primary mood (e.g., "Happy")
  emotions: string[]; // List of emotional labels (e.g., ["Calm", "Motivated"])
  intensity: number; // 1-10
  stress: number; // 1-10
  energy: number; // 1-10
  confidence: number; // 1-10
  note?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: string;
  updatedAt: string;
  journalIds: string[];
  calendarEventIds: string[];
  musicActivityIds: string[];
  bookIds: string[];
  memoryIds: string[];
}

// --- Digital Library Types ---
export interface BookChapter {
  id: string;
  number: number;
  title: string;
  content: string;
}

export interface BookNote {
  id: string;
  chapterIndex?: number;
  chapterTitle?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookLearning {
  id: string;
  chapterIndex?: number;
  chapterTitle?: string;
  text: string;
  createdAt: string;
}

export interface BookReadingSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  duration?: number; // duration in seconds
  progressBefore: number; // percentage or page number
  progressAfter: number;
  notes?: string;
  createdAt: string;
}

export interface BookHighlight {
  id: string;
  text: string;
  chapter?: string;
  page?: string;
  createdAt: string;
  userNote?: string;
  aiLearningNote?: {
    mainIdea: string;
    learningTakeaway: string;
    explanation: string;
    tags: string[];
  };
  aiTags?: string[];
}

export interface BookJournalLink {
  id: string;
  journalEntryId: string;
  journalTitle?: string;
  relationshipType: 'explicit' | 'ai_suggested' | 'user_confirmed';
  createdAt: string;
}

export interface BookGoalLink {
  id: string;
  goalId: string;
  goalTitle?: string;
  relationshipType: 'user_added' | 'ai_suggested' | 'user_confirmed';
  createdAt: string;
}

export interface Book {
  id: string; // generated ID or volume ID
  userId: string; // isolated by UID
  externalId?: string;
  isbn?: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  categories: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  publicDomain?: boolean;
  formats?: Record<string, string>;

  // Built-in Reader & Chapter tracking
  chapters?: BookChapter[];
  currentChapterIndex?: number;
  readingPosition?: number;

  notes?: BookNote[];
  learnings?: BookLearning[];

  readingStatus: 'reading' | 'completed' | 'want_to_read';
  progress: number; // 0 to 100 percentage
  currentPage?: number;
  
  rating?: number; // 1-5 stars
  review?: string;
  keyLearnings?: string[]; // synthesized from highlights or manually added
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  readingSessions: BookReadingSession[];
  highlights: BookHighlight[];
  journalLinks: BookJournalLink[];
  goalLinks: BookGoalLink[];

  futureMoodLinks?: Array<{ id: string; moodId: string; relationshipType: string; createdAt: string }>;
  futureMemoryLinks?: Array<{ id: string; memoryId: string; relationshipType: string; createdAt: string }>;
}

export interface BookMemory {
  id: string;
  userId: string;
  title: string;
  author: string;
  status: 'reading' | 'completed' | 'want_to_read';
  rating?: number;
  review?: string;
  favoriteQuotes: string[];
  keyLearnings: string[];
}

// --- Music Memories Types ---
export interface MusicMemory {
  id: string;
  userId: string;
  trackTitle: string;
  artist: string;
  album?: string;
  associatedMemory?: string;
  associatedMood?: string;
  memoryDate: string;
}

// --- Calendar & Reminders Types ---
export type EventCategory = 'Work' | 'Personal' | 'Health' | 'Study' | 'Meeting' | 'Goal' | 'Routine' | string;
export type ReminderOption = 'none' | 'at_time' | '5_min' | '15_min' | '30_min' | '1_hour' | '1_day';
export type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';
export type TaskPriority = 'normal' | 'important' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
  category?: EventCategory;
  color?: string;
  reminder?: ReminderOption;
  repeat?: RecurrenceOption;
  relatedGoalIds?: string[];
  relatedJournalIds?: string[];
  relatedBookIds?: string[];
  relatedMemoryIds?: string[];
  isTask?: boolean;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  reminder?: ReminderOption;
  relatedGoalIds?: string[];
  relatedJournalIds?: string[];
  relatedBookIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyRoutineTask {
  id: string;
  userId: string;
  title: string;
  category: 'Morning' | 'Afternoon' | 'Evening' | 'Health' | 'Mindfulness' | 'Study' | 'General';
  scheduledTime: string; // HH:MM e.g. "07:30"
  isActive: boolean; // whether daily notification is enabled
  completedDates: string[]; // array of YYYY-MM-DD when completed
  priority: TaskPriority;
  reminderAdvance?: ReminderOption;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'calendar' | 'task' | 'goal' | 'book' | 'memory' | 'routine' | 'system' | 'ai_suggestion';
  title: string;
  message: string;
  sourceType?: 'calendar' | 'task' | 'goal' | 'book' | 'memory' | 'routine' | 'journal' | 'system';
  sourceId?: string;
  scheduledAt: string;
  createdAt: string;
  readAt?: string;
  status: 'unread' | 'read' | 'dismissed';
  priority: TaskPriority;
}

export interface ReminderNotification {
  id: string;
  userId: string;
  title: string;
  scheduledTime: string;
  status: 'pending' | 'delivered' | 'dismissed';
}

// --- Motivation Quotes Types ---
export interface MotivationQuote {
  id: string;
  quote: string;
  author: string;
  category: 'focus' | 'resilience' | 'growth' | 'peace' | 'creativity';
}

// --- System & Architectural Status Types ---
export interface ArchitectureHealth {
  status: string;
  application: string;
  version: string;
  timestamp: string;
  capabilities: {
    serverSideGemini: boolean;
    isolatedFirestore: boolean;
  };
}

export interface FeatureModuleMeta {
  id: string;
  name: string;
  description: string;
  status: 'foundation_ready' | 'stage_ready' | 'pending';
  cssFile: string;
  securityScope: string;
}
