/**
 * Personal Gemini Journal - Calendar & Scheduling Service
 * Manages user-isolated events and tasks (/users/{uid}/calendar_events and /users/{uid}/tasks)
 * with Firestore persistence, local storage fallback, and notification scheduling.
 */

import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CalendarEvent, CalendarTask } from '../../types';
import { createNotification } from '../notifications/notificationService';

const EVENTS_STORAGE_KEY_PREFIX = 'pgj_events_';
const TASKS_STORAGE_KEY_PREFIX = 'pgj_tasks_';

function getLocalEventsKey(uid: string): string {
  return `${EVENTS_STORAGE_KEY_PREFIX}${uid}`;
}

function getLocalTasksKey(uid: string): string {
  return `${TASKS_STORAGE_KEY_PREFIX}${uid}`;
}

function getLocalEvents(uid: string): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(getLocalEventsKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(uid: string, events: CalendarEvent[]): void {
  try {
    localStorage.setItem(getLocalEventsKey(uid), JSON.stringify(events));
  } catch (err) {
    console.warn('[calendarService] Failed to save local events:', err);
  }
}

function getLocalTasks(uid: string): CalendarTask[] {
  try {
    const raw = localStorage.getItem(getLocalTasksKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(uid: string, tasks: CalendarTask[]): void {
  try {
    localStorage.setItem(getLocalTasksKey(uid), JSON.stringify(tasks));
  } catch (err) {
    console.warn('[calendarService] Failed to save local tasks:', err);
  }
}

export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generate default events for new users
 */
function generateDefaultEvents(uid: string): CalendarEvent[] {
  const todayStr = formatDateLocal(new Date());
  const nowIso = new Date().toISOString();

  // Tomorrow date string
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);

  return [
    {
      id: `evt_interview_${Date.now()}`,
      userId: uid,
      title: 'Data Analyst Role Interview',
      description: 'Technical and behavioral interview for Data Analyst position.',
      date: todayStr,
      startTime: '10:00',
      endTime: '11:00',
      location: 'Google Meet / Online',
      category: 'Meeting',
      color: '#6366f1', // Indigo
      reminder: '30_min',
      repeat: 'none',
      relatedGoalIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `evt_study_${Date.now() + 1}`,
      userId: uid,
      title: 'Study SQL & Data Pipeline Practice',
      description: 'Focus session: Advanced window functions and indexing.',
      date: todayStr,
      startTime: '19:00',
      endTime: '20:00',
      location: 'Personal Desk / Home Study',
      category: 'Study',
      color: '#10b981', // Emerald
      reminder: '15_min',
      repeat: 'weekdays',
      relatedGoalIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `evt_habits_${Date.now() + 2}`,
      userId: uid,
      title: 'Read Atomic Habits - Chapter 4',
      description: 'Scheduled reading for daily self-growth routine.',
      date: tomorrowStr,
      startTime: '20:00',
      endTime: '20:30',
      location: 'Living Room',
      category: 'Personal',
      color: '#ec4899', // Pink
      reminder: '15_min',
      repeat: 'daily',
      relatedGoalIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

/**
 * Generate default tasks for new users
 */
function generateDefaultTasks(uid: string): CalendarTask[] {
  const todayStr = formatDateLocal(new Date());
  const nowIso = new Date().toISOString();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);

  return [
    {
      id: `task_sql_${Date.now()}`,
      userId: uid,
      title: 'Complete SQL Assignment Queries',
      description: 'Write solutions for subqueries, joins, and aggregates.',
      dueDate: todayStr,
      dueTime: '14:00',
      priority: 'urgent',
      status: 'pending',
      reminder: '30_min',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `task_journal_${Date.now() + 1}`,
      userId: uid,
      title: 'Write Daily Reflection Journal',
      description: 'Log key learnings and emotional insights from today.',
      dueDate: todayStr,
      dueTime: '21:30',
      priority: 'normal',
      status: 'pending',
      reminder: '15_min',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: `task_resume_${Date.now() + 2}`,
      userId: uid,
      title: 'Update Portfolio Projects Section',
      description: 'Add new Personal Gemini Journal project to GitHub & Resume.',
      dueDate: tomorrowStr,
      dueTime: '17:00',
      priority: 'important',
      status: 'pending',
      reminder: '1_hour',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

/**
 * Fetch calendar events for user
 */
export async function getCalendarEventsForUser(uid: string): Promise<CalendarEvent[]> {
  if (!uid) return [];

  let events: CalendarEvent[] = [];

  try {
    const colRef = collection(db, 'users', uid, 'calendar_events');
    const q = query(colRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() } as CalendarEvent);
      });
    }
  } catch (err) {
    console.warn('[calendarService] Firestore events fetch error, fallback to local storage:', err);
  }

  if (events.length === 0) {
    events = getLocalEvents(uid);
    if (events.length === 0) {
      events = generateDefaultEvents(uid);
      saveLocalEvents(uid, events);
      // Seed to Firestore in background
      for (const evt of events) {
        try {
          await setDoc(doc(db, 'users', uid, 'calendar_events', evt.id), evt);
        } catch {
          // Ignore fallback
        }
      }
    }
  }

  // Auto-heal any legacy events with date '2026-09-16' that were shifted from 'sep 15'
  let needsSave = false;
  events = events.map((evt) => {
    if (
      evt.date === '2026-09-16' &&
      (evt.title.toLowerCase().includes('interview') ||
        evt.description?.toLowerCase().includes('interview') ||
        evt.description?.toLowerCase().includes('journal') ||
        evt.category === 'Meeting')
    ) {
      needsSave = true;
      const updated = { ...evt, date: '2026-09-15' };
      try {
        updateDoc(doc(db, 'users', uid, 'calendar_events', evt.id), { date: '2026-09-15' }).catch(() => {});
      } catch {
        // ignore
      }
      return updated;
    }
    return evt;
  });

  if (needsSave) {
    saveLocalEvents(uid, events);
  }

  return events;
}

/**
 * Create new calendar event
 */
export async function createCalendarEvent(
  uid: string,
  eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<CalendarEvent> {
  const newId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  const newEvent: CalendarEvent = {
    ...eventData,
    id: newId,
    userId: uid,
    createdAt: now,
    updatedAt: now,
  };

  // Local update
  const local = getLocalEvents(uid);
  saveLocalEvents(uid, [newEvent, ...local]);

  // Firestore update
  try {
    await setDoc(doc(db, 'users', uid, 'calendar_events', newId), newEvent);
  } catch (err) {
    console.warn('[calendarService] Firestore event create failed, saved locally:', err);
  }

  // Create scheduled notification if reminder option enabled
  if (eventData.reminder && eventData.reminder !== 'none') {
    const timeStr = eventData.startTime ? ` at ${eventData.startTime}` : '';
    await createNotification(uid, {
      type: 'calendar',
      title: `Event Reminder: ${eventData.title}`,
      message: `Scheduled for ${eventData.date}${timeStr}${eventData.location ? ` (${eventData.location})` : ''}`,
      sourceType: 'calendar',
      sourceId: newId,
      scheduledAt: `${eventData.date}T${eventData.startTime || '09:00'}:00.000Z`,
      priority: 'normal',
    });
  }

  return newEvent;
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(
  uid: string,
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const local = getLocalEvents(uid);
  let updatedEvent: CalendarEvent | null = null;

  const updatedList = local.map((evt) => {
    if (evt.id === eventId) {
      updatedEvent = { ...evt, ...updates, updatedAt: new Date().toISOString() };
      return updatedEvent;
    }
    return evt;
  });

  if (!updatedEvent) {
    throw new Error(`Event with ID ${eventId} not found`);
  }

  saveLocalEvents(uid, updatedList);

  try {
    await updateDoc(doc(db, 'users', uid, 'calendar_events', eventId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[calendarService] Firestore event update error:', err);
  }

  return updatedEvent;
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(uid: string, eventId: string): Promise<void> {
  const local = getLocalEvents(uid);
  saveLocalEvents(
    uid,
    local.filter((evt) => evt.id !== eventId)
  );

  try {
    await deleteDoc(doc(db, 'users', uid, 'calendar_events', eventId));
  } catch (err) {
    console.warn('[calendarService] Firestore event delete error:', err);
  }
}

/**
 * Fetch calendar tasks for user
 */
export async function getCalendarTasksForUser(uid: string): Promise<CalendarTask[]> {
  if (!uid) return [];

  let tasks: CalendarTask[] = [];

  try {
    const colRef = collection(db, 'users', uid, 'tasks');
    const q = query(colRef, orderBy('dueDate', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() } as CalendarTask);
      });
    }
  } catch (err) {
    console.warn('[calendarService] Firestore tasks fetch error, fallback to local storage:', err);
  }

  if (tasks.length === 0) {
    tasks = getLocalTasks(uid);
    if (tasks.length === 0) {
      tasks = generateDefaultTasks(uid);
      saveLocalTasks(uid, tasks);
      for (const t of tasks) {
        try {
          await setDoc(doc(db, 'users', uid, 'tasks', t.id), t);
        } catch {
          // Ignore
        }
      }
    }
  }

  return tasks;
}

/**
 * Create new task
 */
export async function createCalendarTask(
  uid: string,
  taskData: Omit<CalendarTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<CalendarTask> {
  const newId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  const newTask: CalendarTask = {
    ...taskData,
    id: newId,
    userId: uid,
    createdAt: now,
    updatedAt: now,
  };

  const local = getLocalTasks(uid);
  saveLocalTasks(uid, [newTask, ...local]);

  try {
    await setDoc(doc(db, 'users', uid, 'tasks', newId), newTask);
  } catch (err) {
    console.warn('[calendarService] Firestore task create failed, saved locally:', err);
  }

  if (taskData.reminder && taskData.reminder !== 'none') {
    await createNotification(uid, {
      type: 'task',
      title: `Task Reminder: ${taskData.title}`,
      message: `Due ${taskData.dueDate}${taskData.dueTime ? ` at ${taskData.dueTime}` : ''}`,
      sourceType: 'task',
      sourceId: newId,
      scheduledAt: `${taskData.dueDate}T${taskData.dueTime || '12:00'}:00.000Z`,
      priority: taskData.priority || 'normal',
    });
  }

  return newTask;
}

/**
 * Update task
 */
export async function updateCalendarTask(
  uid: string,
  taskId: string,
  updates: Partial<CalendarTask>
): Promise<CalendarTask> {
  const local = getLocalTasks(uid);
  let updatedTask: CalendarTask | null = null;

  const updatedList = local.map((t) => {
    if (t.id === taskId) {
      updatedTask = { ...t, ...updates, updatedAt: new Date().toISOString() };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  saveLocalTasks(uid, updatedList);

  try {
    await updateDoc(doc(db, 'users', uid, 'tasks', taskId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[calendarService] Firestore task update error:', err);
  }

  return updatedTask;
}

/**
 * Delete task
 */
export async function deleteCalendarTask(uid: string, taskId: string): Promise<void> {
  const local = getLocalTasks(uid);
  saveLocalTasks(
    uid,
    local.filter((t) => t.id !== taskId)
  );

  try {
    await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
  } catch (err) {
    console.warn('[calendarService] Firestore task delete error:', err);
  }
}

export interface ConflictPair {
  event1: CalendarEvent;
  event2: CalendarEvent;
}

/**
 * Detect overlapping event pairs on the same date
 */
export function detectCalendarConflicts(events: CalendarEvent[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];

  // Group by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((evt) => {
    if (!evt.date || !evt.startTime || !evt.endTime) return;
    if (!eventsByDate[evt.date]) eventsByDate[evt.date] = [];
    eventsByDate[evt.date].push(evt);
  });

  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  Object.values(eventsByDate).forEach((dayEvents) => {
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const e1 = dayEvents[i];
        const e2 = dayEvents[j];

        const start1 = parseMinutes(e1.startTime!);
        const end1 = parseMinutes(e1.endTime!);
        const start2 = parseMinutes(e2.startTime!);
        const end2 = parseMinutes(e2.endTime!);

        // Check time window overlap: max(start1, start2) < min(end1, end2)
        if (Math.max(start1, start2) < Math.min(end1, end2)) {
          conflicts.push({ event1: e1, event2: e2 });
        }
      }
    }
  });

  return conflicts;
}
