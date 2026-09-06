/**
 * Personal Gemini Journal - Daily Routine Tasks & Notification Sync Service
 * Manages user-isolated daily routine tasks (/users/{uid}/daily_routines)
 * and automatically triggers daily notifications every single day.
 */

import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DailyRoutineTask } from '../../types';
import { createNotification, getNotificationsForUser } from '../notifications/notificationService';
import { formatDateLocal } from './calendarService';

const ROUTINE_STORAGE_KEY_PREFIX = 'pgj_daily_routines_';

function getLocalRoutinesKey(uid: string): string {
  return `${ROUTINE_STORAGE_KEY_PREFIX}${uid}`;
}

function getLocalRoutines(uid: string): DailyRoutineTask[] {
  try {
    const raw = localStorage.getItem(getLocalRoutinesKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRoutines(uid: string, routines: DailyRoutineTask[]): void {
  try {
    localStorage.setItem(getLocalRoutinesKey(uid), JSON.stringify(routines));
  } catch (err) {
    console.warn('[dailyRoutineService] Failed to save local routines:', err);
  }
}

function generateDefaultRoutines(uid: string): DailyRoutineTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: `routine_meditation_${Date.now()}`,
      userId: uid,
      title: 'Morning Mindfulness & Diaphragmatic Breathing',
      category: 'Morning',
      scheduledTime: '07:00',
      isActive: true,
      completedDates: [],
      priority: 'important',
      reminderAdvance: '15_min',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `routine_water_${Date.now() + 1}`,
      userId: uid,
      title: 'Daily Hydration & Ergonomic Stretch',
      category: 'Morning',
      scheduledTime: '10:30',
      isActive: true,
      completedDates: [],
      priority: 'normal',
      reminderAdvance: 'at_time',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `routine_study_${Date.now() + 2}`,
      userId: uid,
      title: 'Study SQL & Data Analytics Practice',
      category: 'Afternoon',
      scheduledTime: '15:00',
      isActive: true,
      completedDates: [],
      priority: 'urgent',
      reminderAdvance: '30_min',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `routine_journal_${Date.now() + 3}`,
      userId: uid,
      title: 'Write Evening Journal & Mood Reflection',
      category: 'Evening',
      scheduledTime: '21:30',
      isActive: true,
      completedDates: [],
      priority: 'important',
      reminderAdvance: '15_min',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `routine_reading_${Date.now() + 4}`,
      userId: uid,
      title: 'Night Reading Session (20 Pages)',
      category: 'Evening',
      scheduledTime: '22:15',
      isActive: true,
      completedDates: [],
      priority: 'normal',
      reminderAdvance: '15_min',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Fetch daily routine tasks for user
 */
export async function getDailyRoutinesForUser(uid: string): Promise<DailyRoutineTask[]> {
  if (!uid) return [];

  let routines: DailyRoutineTask[] = [];

  try {
    const colRef = collection(db, 'users', uid, 'daily_routines');
    const q = query(colRef, orderBy('scheduledTime', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        routines.push({ id: docSnap.id, ...docSnap.data() } as DailyRoutineTask);
      });
    }
  } catch (err) {
    console.warn('[dailyRoutineService] Firestore fetch error, fallback to local storage:', err);
  }

  if (routines.length === 0) {
    routines = getLocalRoutines(uid);
    if (routines.length === 0) {
      routines = generateDefaultRoutines(uid);
      saveLocalRoutines(uid, routines);
      for (const r of routines) {
        try {
          await setDoc(doc(db, 'users', uid, 'daily_routines', r.id), r);
        } catch {
          // Ignore fallback errors
        }
      }
    }
  }

  return routines;
}

/**
 * Create new daily routine task
 */
export async function createDailyRoutineTask(
  uid: string,
  taskData: Omit<DailyRoutineTask, 'id' | 'userId' | 'completedDates' | 'createdAt' | 'updatedAt'>
): Promise<DailyRoutineTask> {
  const newId = `routine_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  const newRoutine: DailyRoutineTask = {
    ...taskData,
    id: newId,
    userId: uid,
    completedDates: [],
    createdAt: now,
    updatedAt: now,
  };

  const local = getLocalRoutines(uid);
  saveLocalRoutines(uid, [...local, newRoutine]);

  try {
    await setDoc(doc(db, 'users', uid, 'daily_routines', newId), newRoutine);
  } catch (err) {
    console.warn('[dailyRoutineService] Firestore routine create failed, saved locally:', err);
  }

  // Instantly trigger sync for today if active
  await syncDailyRoutineNotifications(uid);

  return newRoutine;
}

/**
 * Update daily routine task
 */
export async function updateDailyRoutineTask(
  uid: string,
  routineId: string,
  updates: Partial<DailyRoutineTask>
): Promise<DailyRoutineTask> {
  const local = getLocalRoutines(uid);
  let updatedRoutine: DailyRoutineTask | null = null;

  const updatedList = local.map((r) => {
    if (r.id === routineId) {
      updatedRoutine = { ...r, ...updates, updatedAt: new Date().toISOString() };
      return updatedRoutine;
    }
    return r;
  });

  if (!updatedRoutine) {
    throw new Error(`Routine task with ID ${routineId} not found`);
  }

  saveLocalRoutines(uid, updatedList);

  try {
    await updateDoc(doc(db, 'users', uid, 'daily_routines', routineId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[dailyRoutineService] Firestore routine update error:', err);
  }

  // Trigger notification sync if status changed
  await syncDailyRoutineNotifications(uid);

  return updatedRoutine;
}

/**
 * Delete daily routine task
 */
export async function deleteDailyRoutineTask(uid: string, routineId: string): Promise<void> {
  const local = getLocalRoutines(uid);
  saveLocalRoutines(
    uid,
    local.filter((r) => r.id !== routineId)
  );

  try {
    await deleteDoc(doc(db, 'users', uid, 'daily_routines', routineId));
  } catch (err) {
    console.warn('[dailyRoutineService] Firestore routine delete error:', err);
  }
}

/**
 * Toggle routine task completion for today
 */
export async function toggleDailyRoutineCompletionToday(
  uid: string,
  routineId: string
): Promise<DailyRoutineTask> {
  const todayStr = formatDateLocal(new Date());
  const routines = await getDailyRoutinesForUser(uid);
  const target = routines.find((r) => r.id === routineId);

  if (!target) {
    throw new Error(`Routine with ID ${routineId} not found`);
  }

  const isCompletedToday = target.completedDates.includes(todayStr);
  const newCompletedDates = isCompletedToday
    ? target.completedDates.filter((d) => d !== todayStr)
    : [...target.completedDates, todayStr];

  return updateDailyRoutineTask(uid, routineId, { completedDates: newCompletedDates });
}

/**
 * Automatically sync and schedule daily routine notifications for today.
 * Guarantees every active daily routine task gets a daily notification generated!
 */
export async function syncDailyRoutineNotifications(uid: string): Promise<number> {
  if (!uid) return 0;

  try {
    const todayStr = formatDateLocal(new Date());
    const routines = await getDailyRoutinesForUser(uid);
    const existingNotifs = await getNotificationsForUser(uid);

    let generatedCount = 0;

    for (const routine of routines) {
      if (!routine.isActive) continue;

      // Check if a notification already exists for this routine task today
      const alreadyNotifiedToday = existingNotifs.some(
        (n) => n.sourceType === 'routine' && n.sourceId === routine.id && n.scheduledAt.startsWith(todayStr)
      );

      if (!alreadyNotifiedToday) {
        await createNotification(uid, {
          type: 'routine',
          title: `⏰ Daily Routine: ${routine.title}`,
          message: `Scheduled daily at ${routine.scheduledTime}. Time to complete your ${routine.category.toLowerCase()} habit!`,
          sourceType: 'routine',
          sourceId: routine.id,
          scheduledAt: `${todayStr}T${routine.scheduledTime}:00.000Z`,
          priority: routine.priority || 'normal',
        });
        generatedCount++;
      }
    }

    return generatedCount;
  } catch (err) {
    console.warn('[dailyRoutineService] Sync daily routine notifications error:', err);
    return 0;
  }
}
