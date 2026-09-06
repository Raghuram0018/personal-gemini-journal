/**
 * Personal Gemini Journal - Notifications & Reminders Service
 * Manages user-isolated notifications (/users/{uid}/notifications) in Firestore with local storage fallback.
 */

import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AppNotification } from '../../types';
import { formatDateLocal } from '../calendar/calendarService';

const LOCAL_STORAGE_KEY_PREFIX = 'pgj_notifications_';

function getLocalNotificationsKey(uid: string): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${uid}`;
}

function getLocalNotifications(uid: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(getLocalNotificationsKey(uid));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalNotifications(uid: string, notifications: AppNotification[]): void {
  try {
    localStorage.setItem(getLocalNotificationsKey(uid), JSON.stringify(notifications));
  } catch (err) {
    console.warn('[notificationService] Failed to save local notifications:', err);
  }
}

/**
 * Default initial notifications for a fresh user profile
 */
function generateDefaultNotifications(uid: string): AppNotification[] {
  const now = new Date();
  const isoNow = now.toISOString();

  const todayStr = formatDateLocal(new Date());

  return [
    {
      id: `notif_welcome_${Date.now()}`,
      userId: uid,
      type: 'system',
      title: 'Welcome to Personal Gemini Journal 👋',
      message: 'Your authenticated workspace is active. Explore your Journal, Goals, Calendar, and Ask My Journal.',
      sourceType: 'system',
      scheduledAt: isoNow,
      createdAt: isoNow,
      status: 'unread',
      priority: 'normal',
    },
    {
      id: `notif_cal_interview_${Date.now() + 1}`,
      userId: uid,
      type: 'calendar',
      title: 'Upcoming Interview',
      message: 'Scheduled today at 10:00 AM — Data Analyst Role Interview',
      sourceType: 'calendar',
      scheduledAt: `${todayStr}T10:00:00.000Z`,
      createdAt: isoNow,
      status: 'unread',
      priority: 'urgent',
    },
    {
      id: `notif_task_sql_${Date.now() + 2}`,
      userId: uid,
      type: 'task',
      title: 'SQL Assignment Due',
      message: 'Complete SQL queries assignment by 2:00 PM today',
      sourceType: 'task',
      scheduledAt: `${todayStr}T14:00:00.000Z`,
      createdAt: isoNow,
      status: 'unread',
      priority: 'important',
    },
    {
      id: `notif_cal_study_${Date.now() + 3}`,
      userId: uid,
      type: 'calendar',
      title: 'Study SQL Session',
      message: 'Scheduled today at 7:00 PM — Goal: Become a Data Analyst',
      sourceType: 'calendar',
      scheduledAt: `${todayStr}T19:00:00.000Z`,
      createdAt: isoNow,
      status: 'unread',
      priority: 'normal',
    },
  ];
}

/**
 * Retrieve all notifications for the authenticated user
 */
export async function getNotificationsForUser(uid: string): Promise<AppNotification[]> {
  if (!uid) return [];

  let items: AppNotification[] = [];

  try {
    const colRef = collection(db, 'users', uid, 'notifications');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
      });
    }
  } catch (err) {
    console.warn('[notificationService] Firestore query error, using local storage fallback:', err);
  }

  if (items.length === 0) {
    items = getLocalNotifications(uid);
    if (items.length === 0) {
      items = generateDefaultNotifications(uid);
      saveLocalNotifications(uid, items);
      // Attempt background seed to Firestore
      for (const item of items) {
        try {
          await setDoc(doc(db, 'users', uid, 'notifications', item.id), item);
        } catch {
          // Ignore offline/permission fallback
        }
      }
    }
  }

  // Sort newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Create a new notification for a specific user
 */
export async function createNotification(
  uid: string,
  notificationData: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'status'>
): Promise<AppNotification> {
  const newId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  const notification: AppNotification = {
    ...notificationData,
    id: newId,
    userId: uid,
    createdAt: now,
    status: 'unread',
  };

  // Save to LocalStorage immediately
  const local = getLocalNotifications(uid);
  const updatedLocal = [notification, ...local];
  saveLocalNotifications(uid, updatedLocal);

  // Save to Firestore asynchronously
  try {
    const docRef = doc(db, 'users', uid, 'notifications', newId);
    await setDoc(docRef, notification);
  } catch (err) {
    console.warn('[notificationService] Firestore create failed, kept in local storage:', err);
  }

  return notification;
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(uid: string, notificationId: string): Promise<void> {
  const now = new Date().toISOString();

  const local = getLocalNotifications(uid);
  const updated = local.map((n) => (n.id === notificationId ? { ...n, status: 'read' as const, readAt: now } : n));
  saveLocalNotifications(uid, updated);

  try {
    const docRef = doc(db, 'users', uid, 'notifications', notificationId);
    await updateDoc(docRef, { status: 'read', readAt: now });
  } catch (err) {
    console.warn('[notificationService] Firestore update read failed:', err);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(uid: string): Promise<void> {
  const now = new Date().toISOString();

  const local = getLocalNotifications(uid);
  const updated = local.map((n) => ({ ...n, status: 'read' as const, readAt: now }));
  saveLocalNotifications(uid, updated);

  try {
    const colRef = collection(db, 'users', uid, 'notifications');
    const snapshot = await getDocs(colRef);
    const promises = snapshot.docs.map((docSnap) =>
      updateDoc(doc(db, 'users', uid, 'notifications', docSnap.id), { status: 'read', readAt: now })
    );
    await Promise.all(promises);
  } catch (err) {
    console.warn('[notificationService] Firestore markAllRead failed:', err);
  }
}

/**
 * Dismiss or Delete a notification
 */
export async function dismissNotification(uid: string, notificationId: string): Promise<void> {
  const local = getLocalNotifications(uid);
  const updated = local.filter((n) => n.id !== notificationId);
  saveLocalNotifications(uid, updated);

  try {
    const docRef = doc(db, 'users', uid, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[notificationService] Firestore delete failed:', err);
  }
}

/**
 * Computes summary of today's events, tasks, and notifications for login preview
 */
export function getTodayNotificationsSummary(notifications: AppNotification[]) {
  const todayStr = formatDateLocal(new Date());

  const todayItems = notifications.filter((n) => {
    if (n.status === 'dismissed') return false;
    if (n.scheduledAt && n.scheduledAt.startsWith(todayStr)) return true;
    if (n.createdAt && n.createdAt.startsWith(todayStr)) return true;
    return n.status === 'unread';
  });

  return todayItems.slice(0, 4);
}
