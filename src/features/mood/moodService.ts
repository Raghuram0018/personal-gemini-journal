import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MoodRecord } from '../../types';

/**
 * Deeply sanitizes an object for Firestore by replacing undefined with null
 * and recursively cleaning nested objects/arrays.
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleanObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj;
  }
  return obj;
}

// Fetch all mood records for the authenticated user
export async function getMoodHistory(uid: string, count: number = 50): Promise<MoodRecord[]> {
  if (!uid) return [];
  try {
    const moodRef = collection(db, 'users', uid, 'moods');
    const q = query(moodRef, orderBy('createdAt', 'desc'), limit(count));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as MoodRecord));
  } catch (err) {
    console.error('[moodService] getMoodHistory error:', err);
    return [];
  }
}

// Save or Update a MoodRecord in Firestore
export async function saveMoodRecord(uid: string, record: MoodRecord): Promise<void> {
  if (!uid || !record.id) return;
  try {
    const sanitizedRecord = sanitizeForFirestore({
      ...record,
      userId: uid,
      updatedAt: new Date().toISOString()
    });

    const docRef = doc(db, 'users', uid, 'moods', record.id);
    await setDoc(docRef, sanitizedRecord, { merge: true });
  } catch (err) {
    console.error('[moodService] saveMoodRecord error:', err);
    throw err;
  }
}

// Delete a MoodRecord from Firestore
export async function deleteMoodRecord(uid: string, recordId: string): Promise<void> {
  if (!uid || !recordId) return;
  try {
    const docRef = doc(db, 'users', uid, 'moods', recordId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[moodService] deleteMoodRecord error:', err);
    throw err;
  }
}

// Get Mood Context for Gemini (grounding)
export async function getMoodContext(uid: string, isAllowed: boolean = false): Promise<string> {
  if (!uid || !isAllowed) return 'Mood data access is disabled by the user.';
  
  const history = await getMoodHistory(uid, 20);
  if (history.length === 0) return 'No mood records found.';

  const contextLines = history.map(m => {
    return `- [${m.date} ${m.time}] Mood: ${m.mood} (Intensity: ${m.intensity}/10). Emotions: ${m.emotions.join(', ')}. Note: ${m.note || 'None'}`;
  });

  return `User's Recent Mood History:\n${contextLines.join('\n')}`;
}

// Future integration stubs
export async function linkJournalToMood(uid: string, moodId: string, journalId: string): Promise<void> {
  if (!uid || !moodId || !journalId) return;
  const moodRef = doc(db, 'users', uid, 'moods', moodId);
  // Implementation would involve arrayUnion for journalIds
}
