import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MOTIVATIONAL_MESSAGES, MotivationalMessage } from './motivationalMessages';

interface MotivationHistory {
  lastMessageId: number;
  recentMessageIds: number[];
  updatedAt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'pgj_motivation_history_';

/**
 * Retrieves the user's motivation history for a given event type (login | logout).
 * First checks Firestore; falls back to localStorage if Firestore read fails.
 */
async function getHistory(uid: string, eventType: 'login' | 'logout'): Promise<MotivationHistory | null> {
  if (!uid) return getLocalHistory(eventType);

  try {
    const docRef = doc(db, 'users', uid, 'motivation', eventType);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MotivationHistory;
      return {
        lastMessageId: data.lastMessageId ?? 0,
        recentMessageIds: Array.isArray(data.recentMessageIds) ? data.recentMessageIds : [],
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(`[MotivationService] Failed to read Firestore history for ${eventType}:`, err);
  }

  // Fallback to localStorage
  return getLocalHistory(eventType);
}

/**
 * Saves updated motivation history for a user and event type.
 * Tries Firestore first; also syncs to localStorage for resilient offline support.
 */
async function saveHistory(uid: string, eventType: 'login' | 'logout', history: MotivationHistory): Promise<void> {
  saveLocalHistory(eventType, history);

  if (!uid) return;

  try {
    const docRef = doc(db, 'users', uid, 'motivation', eventType);
    await setDoc(docRef, {
      lastMessageId: history.lastMessageId,
      recentMessageIds: history.recentMessageIds,
      updatedAt: history.updatedAt,
    }, { merge: true });
  } catch (err) {
    console.warn(`[MotivationService] Failed to save Firestore history for ${eventType}:`, err);
  }
}

function getLocalHistory(eventType: 'login' | 'logout'): MotivationHistory | null {
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${eventType}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as MotivationHistory;
    }
  } catch (err) {
    console.warn('[MotivationService] LocalStorage read error:', err);
  }
  return null;
}

function saveLocalHistory(eventType: 'login' | 'logout', history: MotivationHistory): void {
  try {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${eventType}`;
    localStorage.setItem(key, JSON.stringify(history));
  } catch (err) {
    console.warn('[MotivationService] LocalStorage write error:', err);
  }
}

/**
 * Selects a motivational message for the user based on event type (login or logout).
 * Prevents consecutive repetitions and avoids recently shown messages.
 * Guaranteed to never throw errors; falls back gracefully.
 */
export async function selectMotivationalMessage(
  uid: string,
  eventType: 'login' | 'logout'
): Promise<MotivationalMessage> {
  const allMessages = MOTIVATIONAL_MESSAGES;

  try {
    const history = await getHistory(uid, eventType);
    const lastMessageId = history?.lastMessageId ?? 0;
    const recentMessageIds = history?.recentMessageIds ?? [];

    // Filter candidate pool
    let candidatePool = allMessages.filter((msg) => msg.id !== lastMessageId);

    // If candidate pool is large enough, also exclude recent messages (up to 30)
    if (candidatePool.length > 30) {
      const recentSet = new Set(recentMessageIds);
      const poolWithoutRecent = candidatePool.filter((msg) => !recentSet.has(msg.id));
      if (poolWithoutRecent.length > 5) {
        candidatePool = poolWithoutRecent;
      }
    }

    // Pick random quote from candidate pool
    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    const selected = candidatePool[randomIndex] || allMessages[0];

    // Build updated history
    const updatedRecent = [selected.id, ...recentMessageIds.filter((id) => id !== selected.id)].slice(0, 30);
    const newHistory: MotivationHistory = {
      lastMessageId: selected.id,
      recentMessageIds: updatedRecent,
      updatedAt: new Date().toISOString(),
    };

    // Save history asynchronously (do not block message return)
    saveHistory(uid, eventType, newHistory).catch((err) => {
      console.warn('[MotivationService] Background save error:', err);
    });

    return selected;
  } catch (err) {
    console.warn('[MotivationService] Error during selection, using fallback:', err);
    // Absolute fallback: pick random message from whole list
    const fallbackIdx = Math.floor(Math.random() * allMessages.length);
    return allMessages[fallbackIdx];
  }
}
