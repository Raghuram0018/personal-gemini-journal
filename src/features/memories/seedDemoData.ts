import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

export async function seedDemoData(uid: string) {
  const weekId = '2026-W34'; // Aug 23 - Aug 29
  const memoryData = [
    {
      id: 'mem-aug-23-journal',
      title: 'First Journal Entry',
      summary: 'Started the journal today.',
      category: 'Journal',
      date: '2026-08-23',
      sourceType: 'journal',
    },
    {
      id: 'mem-aug-24-goal',
      title: 'Finish Cloud Run Challenge',
      summary: 'Working hard on the deployment.',
      category: 'Goal',
      date: '2026-08-24',
      sourceType: 'goal',
    },
    {
      id: 'mem-aug-25-book',
      title: 'Read Atomic Habits',
      summary: 'Reading about habit stacking.',
      category: 'Book',
      date: '2026-08-25',
      sourceType: 'book',
    },
    {
      id: 'mem-aug-26-music',
      title: 'Listening to Lo-Fi',
      summary: 'Calm music for coding.',
      category: 'Music',
      date: '2026-08-26',
      sourceType: 'music',
    },
    {
      id: 'mem-aug-27-mood',
      title: 'Mood: Productive',
      summary: 'Feeling good about progress.',
      category: 'Mood',
      date: '2026-08-27',
      sourceType: 'mood',
    },
    {
      id: 'mem-aug-28-media',
      title: 'Sunset Photo',
      summary: 'Beautiful sunset.',
      category: 'Media',
      date: '2026-08-28',
      sourceType: 'media',
    },
    {
      id: 'mem-aug-29-activity',
      title: 'Evening Jog',
      summary: '5km jog.',
      category: 'Activity',
      date: '2026-08-29',
      sourceType: 'activity',
    }
  ];

  for (const memory of memoryData) {
    const memoryRef = doc(db, 'users', uid, 'memories', memory.id);
    await setDoc(memoryRef, {
      ...memory,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
